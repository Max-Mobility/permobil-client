import { Component, ViewContainerRef } from '@angular/core';
import { PushTrackerKinveyKeys } from '@maxmobility/private-keys';
import { ModalDialogService } from '@nativescript/angular';
import { Color, ImageSource, ItemEventData, Page } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { TranslateService } from '@ngx-translate/core';
import { User as KinveyUser, Query as KinveyQuery } from 'kinvey-nativescript-sdk';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import { Toasty } from 'nativescript-toasty';
import { ActivityComponent } from '..';
import { APP_THEMES, DISTANCE_UNITS, STORAGE_KEYS, TIME_FORMAT } from '../../enums';
import { PushTrackerUser, DeviceBase } from '../../models';
import { ActivityService, SmartDriveUsageService, LoggingService } from '../../services';
import { areDatesSame, convertToMilesIfUnitPreferenceIsMiles, format24Hour, formatAMPM, getDayOfWeek, getFirstDayOfWeek, getTimeOfDayFromStartTime, getTimeOfDayString, YYYY_MM_DD } from '../../utils';

enum JourneyType {
  'ROLL',
  'DRIVE'
}

class JourneyItem {
  journeyType: JourneyType;
  coastTime: number;
  pushCount: number;
  coastDistance: number;
  driveDistance: number;
}

@Component({
  selector: 'journey-tab',
  moduleId: module.id,
  templateUrl: './journey-tab.component.html'
})
export class JourneyTabComponent {
  public APP_THEMES = APP_THEMES;
  public DISTANCE_UNITS = DISTANCE_UNITS;
  journeyItems = undefined;
  CURRENT_THEME: string;
  savedTimeFormat: string;
  user: PushTrackerUser;
  todayActivity;
  todayUsage;
  journeyItemsLoaded: boolean = false;
  showLoadingIndicator: boolean = false;
  debouncedRefresh: any = null;
  throttledOpenActivityModal: any = null;
  private _today: Date;
  private _weekStart: Date;
  private _rollingWeekStart: Date;
  private _journeyMap = {};
  public noMorePushTrackerActivityDataAvailable = false;
  public noMoreSmartDriveUsageDataAvailable = false;
  public noMoreDataAvailable = false;

  public static api_base = PushTrackerKinveyKeys.HOST_URL;
  public static api_app_key = PushTrackerKinveyKeys.DEV_KEY;
  public static api_app_secret = PushTrackerKinveyKeys.DEV_SECRET;
  private _weeklyActivityFromKinvey: any;
  private _weeklyUsageFromKinvey: any;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 3000; // 3 seconds

  constructor(
    private _activityService: ActivityService,
    private _usageService: SmartDriveUsageService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page
  ) { }

  onJourneyTabLoaded() {
    this._logService.logBreadCrumb(JourneyTabComponent.name, 'Loaded');

    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this._page.actionBarHidden = true;

    this.refreshUserFromKinvey()
      .then(() => {
        this.savedTimeFormat =
          this.user.data.time_format_preference || TIME_FORMAT.AM_PM;
        this._refresh(false)
          .catch(err => {
            this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to init journey items');
            // this._logService.logException(err);
          });
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to refresh user from kinvey');
        // this._logService.logException(err);
      });
    this._today = new Date();
    this._weekStart = getFirstDayOfWeek(this._today);
    this._rollingWeekStart = new Date(this._weekStart);
    this.debouncedRefresh = debounce(
      this._refresh.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true, trailing: true }
    );

    this.throttledOpenActivityModal = throttle(
      this._openActivityModal.bind(this),
      2000, // 2 seconds
      { leading: true, trailing: true }
    );
  }

  onJourneyTabUnloaded() {
    this._logService.logBreadCrumb(JourneyTabComponent.name, 'Unloaded');
  }

  onRefreshTap() {
    this._logService.logBreadCrumb(JourneyTabComponent.name, 'Refresh tapped');
    this.debouncedRefresh();
  }

  async onLoadMoreItems(_?: ItemEventData) {
    if (this.noMoreDataAvailable) return;
    this.showLoadingIndicator = true;
    this._rollingWeekStart.setDate(this._rollingWeekStart.getDate() - 7); // go to previous week
    return this._loadDataForDate(this._rollingWeekStart, false)
      .then(result => {
        this.journeyItems = result;
        if (result.length === 0) {
          // force loading of more data if we have none on iOS
          return this.onLoadMoreItems();
        }
        this.showLoadingIndicator = false;
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to load data for date in onLoadMoreItems' + err);
        // this._logService.logException(err);
      });
  }

  getTodayCoastDistance() {
    if (this.todayUsage) {
      let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
        DeviceBase.caseTicksToKilometers(
          this.todayUsage.distance_smartdrive_coast -
          this.todayUsage.distance_smartdrive_coast_start
        ),
        this.user.data.distance_unit_preference
      );
      if (coastDistance < 0.0) coastDistance = 0.0;
      return coastDistance.toFixed(2);
    } else {
      return '0.00';
    }
  }

  parseUser(user: KinveyUser) {
    this.user = user as PushTrackerUser;
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
  }

  async refreshUserFromKinvey() {
    try {
      const kinveyUser = KinveyUser.getActiveUser();
      this.parseUser(kinveyUser);
      return true;
    } catch (err) {
      this._logService.logBreadCrumb(
        JourneyTabComponent.name,
        'Failed to refresh user from kinvey: ' + err
      );
      return false;
    }
  }

  private async _refresh(syncWithServer: boolean = true) {
    this._logService.logBreadCrumb(JourneyTabComponent.name, 'Refreshing data');
    return this.refreshUserFromKinvey()
      .then(async () => {

        // actually synchronize with the server
        if (syncWithServer) {
          try {
            await this._activityService.refreshWeekly();
          } catch (err) {
          }
          try {
            await this._usageService.refreshWeekly();
          } catch (err) {
          }
        }

        // now load the cached or refreshed data and display it
        this.noMorePushTrackerActivityDataAvailable = false;
        this.noMoreSmartDriveUsageDataAvailable = false;
        this.noMoreDataAvailable = false;
        this.journeyItemsLoaded = false;
        this._today = new Date();
        this._weekStart = getFirstDayOfWeek(this._today);
        this._rollingWeekStart = new Date(this._weekStart);
        this._journeyMap = {};
        this.journeyItems = undefined;
        return this._loadDataForDate(this._weekStart, true)
          .then(result => {
            this.journeyItems = result;
            if (result.length === 0) {
              // force loading of more data if we have none on iOS
              return this.onLoadMoreItems();
            }
          })
          .then(result => {
            this.journeyItemsLoaded = true;
          })
          .catch(err => {
            this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to load data for date when refreshing user' + err);
            // this._logService.logException(err);
            this.journeyItemsLoaded = true;
          });
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to refresh user from kinvey in _refresh');
        // this._logService.logException(err);
      });
  }

  private async _loadDataForDate(date: Date, reset: boolean = false) {
    // Check if there's any more PushTracker WeeklyActivity available to load
    if (!this.noMorePushTrackerActivityDataAvailable) {
      return this._loadWeeklyPushtrackerActivity(date).then(ptResult => {
        // Check if there's any more SmartDrive WeeklyInfo usage data available to load
        if (!this.noMoreSmartDriveUsageDataAvailable) {
          return this._loadWeeklySmartDriveUsage(date)
            .then(sdResult => {
              return this._processJourneyMap(date, reset)
                .then(result => {
                  return result;
                })
                .catch(err => {
                  this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to process journey map');
                  // this._logService.logException(err);
                });
            })
            .catch(err => {
              this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to load weekly smartdrive usage' + err);
              // this._logService.logException(err);
            });
        } else {
          return this.journeyItems;
        }
      });
    } else if (!this.noMoreSmartDriveUsageDataAvailable) {
      // No PushTracker activity data available
      // Just check SmartDrive WeeklyInfo usage data
      return this._loadWeeklySmartDriveUsage(date)
        .then(result => {
          return this._processJourneyMap(date, reset)
            .then(result => {
              return result;
            })
            .catch(err => {
              this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to process journey map');
              // this._logService.logException(err);
            });
        })
        .catch(err => {
          this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to load weekly smartdrive usage');
          // this._logService.logException(err);
        });
    } else {
      // No data available
      this.noMoreDataAvailable = true;
      this._logService.logBreadCrumb(
        JourneyTabComponent.name,
        'No more data available in the database ' + this._rollingWeekStart
      );
      return this.journeyItems;
    }
  }

  private async _processJourneyMap(date: Date, reset: boolean) {
    // Sort _journeyMap by key
    let orderedJourneyMap = {};
    const self = this;

    const start = date;
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const startTime = start.getTime();
    const endTime = end.getTime();

    Object.keys(this._journeyMap)
      .filter(key => {
        return parseInt(key) >= startTime && parseInt(key) < endTime;
      })
      .sort()
      .reverse()
      .forEach(function(key) {
        orderedJourneyMap[key] = self._journeyMap[key];
      });

    if (reset) this.journeyItems = [];

    const getJourneyTypeString = (journeyType: JourneyType) => {
      if (journeyType === JourneyType.ROLL)
        return this._translateService.instant('journey-tab.roll');
      else if (journeyType === JourneyType.DRIVE)
        return this._translateService.instant('journey-tab.drive');
    };

    for (const key in orderedJourneyMap) {
      const journey = orderedJourneyMap[key];

      // roll - default; used when there is no drive / distance data,
      // or when the coast data is significantly more than drive
      if (
        journey.driveDistance === 0 ||
        journey.coastDistance > journey.driveDistance * 2.0
      ) {
        journey.journeyType = JourneyType.ROLL;
      }

      // drive - used when there is distance data and drive is a significant portion of coast (e.g. > 30%)
      // https://github.com/Max-Mobility/permobil-client/issues/23
      if (
        journey.driveDistance > 0 &&
        journey.coastDistance < journey.driveDistance * 2.0
      ) {
        journey.journeyType = JourneyType.DRIVE;
      }

      if (!journey.journeyType) journey.journeyType = JourneyType.ROLL;
    }

    // Identify and group journey items
    // before creating ListView items
    return this._mergeJourneyItems(orderedJourneyMap)
      .then(result => {
        orderedJourneyMap = result;
        const newJourneyItems = this.journeyItems;
        for (const key in orderedJourneyMap) {
          const journey = orderedJourneyMap[key];
          let journeyDateLabel = '';
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const journeyDate = new Date(parseInt(key));
          if (areDatesSame(journeyDate, today)) {
            journeyDateLabel = this._translateService.instant(
              'journey-tab.today'
            );
          } else if (areDatesSame(journeyDate, yesterday)) {
            journeyDateLabel = this._translateService.instant(
              'journey-tab.yesterday'
            );
          } else {
            const dayNames: string[] = [
              this._translateService.instant('days-abbreviated.sunday'),
              this._translateService.instant('days-abbreviated.monday'),
              this._translateService.instant('days-abbreviated.tuesday'),
              this._translateService.instant('days-abbreviated.wednesday'),
              this._translateService.instant('days-abbreviated.thursday'),
              this._translateService.instant('days-abbreviated.friday'),
              this._translateService.instant('days-abbreviated.saturday')
            ];
            const monthNamesAbbreviated = [
              this._translateService.instant('months-abbreviated.january'),
              this._translateService.instant('months-abbreviated.february'),
              this._translateService.instant('months-abbreviated.march'),
              this._translateService.instant('months-abbreviated.april'),
              this._translateService.instant('months-abbreviated.may'),
              this._translateService.instant('months-abbreviated.june'),
              this._translateService.instant('months-abbreviated.july'),
              this._translateService.instant('months-abbreviated.august'),
              this._translateService.instant('months-abbreviated.september'),
              this._translateService.instant('months-abbreviated.october'),
              this._translateService.instant('months-abbreviated.november'),
              this._translateService.instant('months-abbreviated.december')
            ];
            journeyDateLabel =
              dayNames[journeyDate.getDay()] +
              ', ' +
              monthNamesAbbreviated[journeyDate.getMonth()] +
              ' ' +
              journeyDate.getDate();
          }

          if (!journeyDateLabel) {
            journeyDateLabel = journeyDate + '';
          }

          // Setup time format function based on user preference
          // default is AM/PM
          // https://github.com/Max-Mobility/permobil-client/issues/327
          let formatTime = formatAMPM;
          if (this.user) {
            // If the preference is available and saved in the DB:
            if (this.savedTimeFormat) {
              if (this.savedTimeFormat === TIME_FORMAT.MILITARY) {
                formatTime = format24Hour;
              }
            }
          }

          let journeyTimeLabel = '';
          if (journey.mergedTimes && journey.mergedTimes.length) {
            const lastTimeMerged = new Date(
              parseInt(
                journey.mergedTimes.sort()[journey.mergedTimes.length - 1]
              )
            );
            // lastTimeMerged.setMinutes(lastTimeMerged.getMinutes() + 30);
            journeyTimeLabel += formatTime(lastTimeMerged);
            journeyDate.setMinutes(journeyDate.getMinutes() + 30);
            journeyTimeLabel += ' - ' + formatTime(journeyDate);
          } else {
            journeyTimeLabel = formatTime(journeyDate);
            const thirtyMinsLater = new Date(journeyDate);
            thirtyMinsLater.setMinutes(thirtyMinsLater.getMinutes() + 30);
            journeyTimeLabel += ' - ' + formatTime(thirtyMinsLater);
          }

          // Selectively hide list items in Journey tab #249
          // https://github.com/Max-Mobility/permobil-client/issues/249
          // If coastTime is zero, if coastDistance is less then 0.1
          // then hide the list item
          if (!journey.coastTime || journey.coastTime === 0 ||
            !journey.coastCount || journey.coastCount <= 10 ||
            !journey.pushCount || journey.pushCount <= 10) {
            if (!journey.coastDistance || journey.coastDistance < 0.1) continue;
          }

          newJourneyItems.push({
            journey_type: journey.journeyType,
            date: journeyDateLabel,
            journeyDate: journeyDate,
            time: journeyTimeLabel,
            push_count:
              (journey.pushCount ? journey.pushCount.toFixed() : '0') || '0',
            push_count_unit:
              ' ' + this._translateService.instant('units.pushes'),
            coast_time:
              (journey.coastTime ? journey.coastTime.toFixed(1) : '0.0') ||
              '0.0',
            coast_distance:
              (journey.coastDistance
                ? journey.coastDistance.toFixed(2)
                : '0.00') || '0.00',
            drive_distance:
              (journey.driveDistance
                ? journey.driveDistance.toFixed(2)
                : '0.00') || '0.00',
            description:
              this._translateService.instant(
                'journey-tab.' + getTimeOfDayString(journey.timeOfDay)
              ) +
              ' ' +
              getJourneyTypeString(journey.journeyType),
            duration: 0,
            icon_small:
              this.CURRENT_THEME === APP_THEMES.DEFAULT
                ? ImageSource.fromResourceSync(
                  journey.journeyType === JourneyType.ROLL
                    ? 'roll_black'
                    : 'smartdrive_material_black_45'
                )
                : ImageSource.fromResourceSync(
                  journey.journeyType === JourneyType.ROLL
                    ? 'roll_white'
                    : 'smartdrive_material_white_45'
                ),
            icon_large:
              ImageSource.fromResourceSync(
                journey.journeyType === JourneyType.ROLL
                  ? 'roll_white'
                  : 'smartdrive_material_white_45'
              )
          });
        }
        return newJourneyItems;
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to merge journey items');
        // this._logService.logException(err);
      });
  }

  private async _mergeJourneyItems(orderedJourneyMap: Object) {
    let journeyList = [];
    for (const key in orderedJourneyMap) {
      journeyList.push({ startTime: key, stats: orderedJourneyMap[key] });
    }

    const arrayRemove = function(arr, value) {
      return arr.filter(function(ele) {
        return ele !== value;
      });
    };

    const FORTY_FIVE_MINUTES = 45 * 60 * 1000; /* ms */

    if (journeyList.length > 1) {
      for (const i in journeyList) {
        const firstIndex = parseInt(i);
        const first = journeyList[firstIndex];
        const secondIndex = parseInt(i) + 1;
        let second = journeyList[secondIndex];

        while (secondIndex < journeyList.length) {
          // If type of journey is the same
          // If time of day is the same
          // If first.time + 45 mins < second.time

          // Selectively hide list items in Journey tab #249
          // https://github.com/Max-Mobility/permobil-client/issues/249
          // If coastTime is zero, if coastDistance is less then 0.1
          // then hide the list item
          if (!second.stats.coastTime || second.stats.coastTime === 0 ||
            !second.stats.coastCount || second.stats.coastCount <= 10 ||
            !second.stats.pushCount || second.stats.pushCount <= 10) {
            if (!second.stats.coastDistance || second.stats.coastDistance < 0.1) break;
          }

          // Then, merge entries
          const firstDate = new Date(parseInt(first.startTime));
          const secondDate = new Date(parseInt(second.startTime));
          const timeDiff = secondDate.getTime() - firstDate.getTime();
          if (
            first.stats.journeyType === second.stats.journeyType &&
            first.stats.timeOfDay === second.stats.timeOfDay &&
            timeDiff < FORTY_FIVE_MINUTES
          ) {
            // accumulate the second into the first for each data
            journeyList[firstIndex].stats.coastDistance =
              (journeyList[firstIndex].stats.coastDistance || 0) +
              (second.stats.coastDistance || 0);
            journeyList[firstIndex].stats.driveDistance =
              (journeyList[firstIndex].stats.driveDistance || 0) +
              (second.stats.driveDistance || 0);
            journeyList[firstIndex].stats.pushCount =
              (journeyList[firstIndex].stats.pushCount || 0) +
              (second.stats.pushCount || 0);
            journeyList[firstIndex].stats.coastCount =
              (journeyList[firstIndex].stats.coastCount || 0) +
              (second.stats.coastCount || 0);
            journeyList[firstIndex].stats.coastTimeTotal =
              (journeyList[firstIndex].stats.coastTimeTotal || 0) +
              (second.stats.coastTimeTotal || 0);
            // now calculate the coast time for the overall journey
            journeyList[firstIndex].stats.coastTime =
              (journeyList[firstIndex].stats.coastTimeTotal || 0) /
              (journeyList[firstIndex].stats.coastCount || 1);
            // now update the journey list
            if (!journeyList[firstIndex].stats.mergedTimes)
              journeyList[firstIndex].stats.mergedTimes = [];
            journeyList[firstIndex].stats.mergedTimes.push(second.startTime);
            journeyList = arrayRemove(journeyList, second);
            if (secondIndex < journeyList.length) {
              second = journeyList[secondIndex];
            } else {
              break;
            }
          } else {
            break;
          }
        }
        if (secondIndex >= journeyList.length) break;
      }
    }
    const result = {};
    for (const i in journeyList) {
      const journeyItem = journeyList[i];
      result[journeyItem.startTime] = journeyItem.stats;
    }
    return result;
  }

  async loadWeeklyPushtrackerActivityFromKinvey(weekStartDate: Date) {
    this._logService.logBreadCrumb(
      JourneyTabComponent.name,
      'Loading weekly activity from Kinvey'
    );
    let result = [];
    if (!this.user) return result;

    const date = YYYY_MM_DD(weekStartDate);
    const query = new KinveyQuery();
    query.lessThanOrEqualTo('date', date);
    query.descending('date');
    query.limit = 1;
    return this._activityService.getWeeklyActivityWithQuery(query)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._weeklyActivityFromKinvey = result; // cache
          this._logService.logBreadCrumb(
            JourneyTabComponent.name,
            'loadWeeklyPushtrackerActivityFromKinvey | Loaded weekly activity'
          );
          return Promise.resolve(result);
        }
        this.noMorePushTrackerActivityDataAvailable = true;
        this._logService.logBreadCrumb(
          JourneyTabComponent.name,
          'loadWeeklyPushtrackerActivityFromKinvey | No data for this week yet'
        );
        return Promise.resolve(this._weeklyActivityFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to get activity from kinvey');
        // this._logService.logException(err);
        return Promise.reject([]);
      });
  }

  private async _loadWeeklyPushtrackerActivity(date: Date) {
    return this.loadWeeklyPushtrackerActivityFromKinvey(date)
      .then(didLoad => {
        if (didLoad) {
          // make sure to actually check against the loaded weekly
          // activity since we are using
          // query.lessThanOrEqualTo('date', date), it could load a
          // week prior to the week we actually requested -
          // https://github.com/Max-Mobility/permobil-client/issues/566
          if (YYYY_MM_DD(this._weekStart) === this._weeklyActivityFromKinvey.date) {
            const index = getDayOfWeek(new Date());
            this.todayActivity = this._weeklyActivityFromKinvey.days[index];
          }
          for (const i in this._weeklyActivityFromKinvey.days) {
            const dailyActivity = this._weeklyActivityFromKinvey.days[i];
            if (dailyActivity) {
              // There's activity for today. Update journey list with coast_time/push_count info
              // Assume that activity.records is an ordered list
              // For each record, get time of day. Build a list of objects, each object looking like:
              // start_time : { timeOfDay: 'MORNING', journeyType: <roll | drive>, coastTime: <value>,
              //                pushCount: <value>, coastDistance: <value>, driveDistance: <value>
              //               }
              for (const i in dailyActivity.records) {
                const record = dailyActivity.records[i];
                if (!this._journeyMap[record.start_time]) {
                  this._journeyMap[record.start_time] = new JourneyItem();
                  this._journeyMap[
                    record.start_time
                  ].timeOfDay = getTimeOfDayFromStartTime(record.start_time);
                }
                this._journeyMap[record.start_time].coastTime =
                  record.coast_time_avg || 0;
                this._journeyMap[record.start_time].coastTimeTotal =
                  record.coast_time_total || 0;
                this._journeyMap[record.start_time].pushCount =
                  record.push_count || 0;
                this._journeyMap[record.start_time].coastCount =
                  record.coast_time_count || 0;
              }
            }
          }
        }
        return didLoad;
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Faield to load weekly pushtracker activity from kinvey');
        // this._logService.logException(err);
        return false;
      });
  }

  async loadWeeklySmartDriveUsageFromKinvey(weekStartDate: Date) {
    this._logService.logBreadCrumb(
      JourneyTabComponent.name,
      'Loading weekly usage from Kinvey'
    );
    let result = [];
    if (!this.user) return result;

    const date = YYYY_MM_DD(weekStartDate);

    const query = new KinveyQuery();
    query.lessThanOrEqualTo('date', date);
    query.descending('date');
    query.limit = 1;
    return this._usageService.getWeeklyActivityWithQuery(query)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._weeklyUsageFromKinvey = result; // cache
          this._logService.logBreadCrumb(
            JourneyTabComponent.name,
            'loadWeeklySmartDriveUsageFromKinvey | Loaded weekly usage'
          );
          return Promise.resolve(result);
        }
        this.noMoreSmartDriveUsageDataAvailable = true;
        this._logService.logBreadCrumb(
          JourneyTabComponent.name,
          'loadWeeklySmartDriveUsageFromKinvey | No data for this week yet'
        );
        return Promise.resolve(this._weeklyUsageFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to get usage from kinvey');
        // this._logService.logException(err);
        return Promise.reject([]);
      });
  }

  private async _loadWeeklySmartDriveUsage(date: Date) {
    return this.loadWeeklySmartDriveUsageFromKinvey(date)
      .then(didLoad => {
        if (didLoad) {
          // make sure to actually check against the loaded weekly
          // activity since we are using
          // query.lessThanOrEqualTo('date', date), it could load a
          // week prior to the week we actually requested -
          // https://github.com/Max-Mobility/permobil-client/issues/566
          if (YYYY_MM_DD(this._weekStart) === this._weeklyUsageFromKinvey.date) {
            const index = getDayOfWeek(new Date());
            this.todayUsage = this._weeklyUsageFromKinvey.days[index];
          }
          for (const i in this._weeklyUsageFromKinvey.days) {
            const dailyUsage = this._weeklyUsageFromKinvey.days[i];
            if (dailyUsage) {
              // There's usage information for today. Update journey list with distance info

              // Assume that usage.records is an ordered list
              // For each record, get time of day. Build a list of objects, each object looking like:
              // start_time : { timeOfDay: 'MORNING', journeyType: <roll | drive>, coastTime: <value>,
              //                pushCount: <value>, coastDistance: <value>, driveDistance: <value>
              //               }
              let coastDistanceStart = 0;
              let driveDistanceStart = 0;
              for (const i in dailyUsage.records) {
                const record = dailyUsage.records[i];

                if (parseInt(i) === 0) {
                  coastDistanceStart =
                    dailyUsage.distance_smartdrive_coast_start;
                  driveDistanceStart =
                    dailyUsage.distance_smartdrive_drive_start;
                } else {
                  coastDistanceStart =
                    dailyUsage.records[parseInt(i) - 1]
                      .distance_smartdrive_coast;
                  driveDistanceStart =
                    dailyUsage.records[parseInt(i) - 1]
                      .distance_smartdrive_drive;
                }

                if (!this._journeyMap[record.start_time]) {
                  this._journeyMap[record.start_time] = new JourneyItem();
                  this._journeyMap[
                    record.start_time
                  ].timeOfDay = getTimeOfDayFromStartTime(record.start_time);
                }
                this._journeyMap[
                  record.start_time
                ].coastDistance = convertToMilesIfUnitPreferenceIsMiles(
                  DeviceBase.caseTicksToKilometers(
                    record.distance_smartdrive_coast - coastDistanceStart
                  ),
                  this.user.data.distance_unit_preference
                );
                // https://github.com/Max-Mobility/permobil-client/issues/266
                if (this._journeyMap[record.start_time].coastDistance < 0.0)
                  this._journeyMap[record.start_time].coastDistance = 0.0;

                this._journeyMap[
                  record.start_time
                ].driveDistance = convertToMilesIfUnitPreferenceIsMiles(
                  DeviceBase.motorTicksToMiles(
                    record.distance_smartdrive_drive - driveDistanceStart
                  ),
                  this.user.data.distance_unit_preference
                );
                // https://github.com/Max-Mobility/permobil-client/issues/266
                if (this._journeyMap[record.start_time].driveDistance < 0.0)
                  this._journeyMap[record.start_time].driveDistance = 0.0;

                if (this._journeyMap[record.start_time].coastDistance < 0)
                  this._journeyMap[record.start_time].coastDistance = 0;
                if (this._journeyMap[record.start_time].driveDistance < 0)
                  this._journeyMap[record.start_time].driveDistance = 0;
              }
            }
          }
        }
        return didLoad;
      })
      .catch(err => {
        this._logService.logBreadCrumb(JourneyTabComponent.name, 'Failed to load weekly smartdrive usage from kinvey' + err);
        // this._logService.logException(err);
        return Promise.reject(false);
      });
  }

  onListItemTap(args, item) {
    this.throttledOpenActivityModal(args, item);
  }

  _openActivityModal(args, item) {
    const context = {
      currentTab: 0, // DAY
      currentDayInView: new Date(item.journeyDate),
      chartYAxis: 0, // COAST_TIME
      user: this.user
    };
    this._logService.logBreadCrumb(
      JourneyTabComponent.name,
      `Journey item tapped. Opening activity modal for date: ${YYYY_MM_DD(
        context.currentDayInView
      )}`
    );
    this._modalService
      .showModal(ActivityComponent, {
        context: context,
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .catch(err => {
        this._logService.logException(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }
}
