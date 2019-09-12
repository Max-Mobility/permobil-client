import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import debounce from 'lodash/debounce';
import { Subscription } from 'rxjs';
import * as appSettings from 'tns-core-modules/application-settings';
import { fromResource as imageFromResource } from 'tns-core-modules/image-source';
import { ItemEventData } from 'tns-core-modules/ui/list-view';
import { Page } from 'tns-core-modules/ui/page';
import { APP_THEMES, DISTANCE_UNITS, STORAGE_KEYS } from '../../enums';
import { DeviceBase } from '../../models';
import { LoggingService } from '../../services';
import { areDatesSame, formatAMPM, getDayOfWeek, getFirstDayOfWeek, getTimeOfDayFromStartTime, getTimeOfDayString, milesToKilometers } from '../../utils';
import { PushTrackerKinveyKeys } from '@maxmobility/private-keys';
import * as TNSHTTP from 'tns-core-modules/http';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';

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
  selector: 'journey',
  moduleId: module.id,
  templateUrl: './journey-tab.component.html'
})
export class JourneyTabComponent {
  journeyItems = undefined;
  savedTheme: string;
  user: PushTrackerUser;
  todayActivity;
  todayUsage;
  journeyItemsLoaded: boolean = false;
  showLoadingIndicator: boolean = false;
  debouncedRefresh: any = null;
  private _today: Date;
  private _weekStart: Date;
  private _rollingWeekStart: Date;
  private _userSubscription$: Subscription;
  private _journeyMap = {};
  private _noMorePushTrackerActivityDataAvailable = false;
  private _noMoreSmartDriveUsageDataAvailable = false;
  private _noMoreDataAvailable = false;
  private _currentTheme = '';

  public static api_base = PushTrackerKinveyKeys.HOST_URL;
  public static api_app_key = PushTrackerKinveyKeys.DEV_KEY;
  public static api_app_secret = PushTrackerKinveyKeys.DEV_SECRET;
  private _weeklyActivityFromKinvey: any;
  private _weeklyUsageFromKinvey: any;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 3000; // 3 seconds

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;
    this.refreshUserFromKinvey().then(() => {
      this.savedTheme = this.user.data.theme_preference;
      this.initJourneyItems();
    });
    this._today = new Date();
    this._weekStart = getFirstDayOfWeek(this._today);
    this._rollingWeekStart = new Date(this._weekStart);
    this.debouncedRefresh = debounce(this._refresh.bind(this),
      this.MAX_COMMIT_INTERVAL_MS, { trailing: true }
    );
  }

  onJourneyTabLoaded() {
    this._logService.logBreadCrumb('JourneyTabComponent loaded');
  }

  onJourneyTabUnloaded() {
    this._logService.logBreadCrumb('JourneyTabComponent unloaded');
  }

  async initJourneyItems() {
    this._loadDataForDate(this._weekStart, true).then((result) => {
      this.journeyItems = result;
      this.journeyItemsLoaded = true;
    });
  }

  onRefreshTap() {
    Log.D('refresh tap');
    this.debouncedRefresh();
  }

  async onLoadMoreItems(args: ItemEventData) {
    if (this._noMoreDataAvailable) return;
    this.showLoadingIndicator = true;
    this._rollingWeekStart.setDate(this._rollingWeekStart.getDate() - 7); // go to previous week
    return this._loadDataForDate(this._rollingWeekStart, false).then((result) => {
      this.journeyItems = result;
      this.showLoadingIndicator = false;
    });
  }

  getTodayCoastDistance() {
    if (this.todayUsage) {
      let coastDistance = this._updateDistanceUnit(
        DeviceBase.caseTicksToMiles(
          this.todayUsage.distance_smartdrive_coast -
            this.todayUsage.distance_smartdrive_coast_start
        )
      );
      if (coastDistance < 0.0) coastDistance = 0.0;
      return coastDistance.toFixed(2);
    } else {
      return '0.00';
    }
  }

  getPushTrackerUserFromKinveyUser(user: any): PushTrackerUser {
    const kinveyActiveUser = KinveyUser.getActiveUser();
    const result: any = {};
    result._id = user._id;
    result._acl = user._acl;
    result._kmd = kinveyActiveUser._kmd;
    result.authtoken = kinveyActiveUser._kmd.authtoken;
    result.username = user.username;
    result.email = user.username;
    result.data = {};
    const keys = Object.keys(user);
    for (const i in keys) {
      const key = keys[i];
      if (!['_id', '_acl', '_kmd', 'authtoken', 'username', 'email'].includes(key)) {
        result.data[key] = user[key];
      }
    }
    return result;
  }

  async refreshUserFromKinvey() {
    const kinveyActiveUser = KinveyUser.getActiveUser();
    try {
      return TNSHTTP.request({
        url: 'https://baas.kinvey.com/user/kid_rkoCpw8VG/' + kinveyActiveUser['_id'],
        method: 'GET',
        headers: {
          Authorization: 'Kinvey ' + kinveyActiveUser['_kmd']['authtoken'],
          'Content-Type': 'application/json'
        }
      })
      .then(resp => {
        const data = resp.content.toJSON();
        this.user = this.getPushTrackerUserFromKinveyUser(data);
        return Promise.resolve(true);
      })
      .catch(err => {
        Log.E(err);
        return Promise.reject(false);
      });
    } catch (err) {
      Log.E(err);
      return Promise.reject(false);
    }
  }

  private async _refresh() {
    return this.refreshUserFromKinvey().then(() => {
      this._currentTheme = this.savedTheme;
      this._noMorePushTrackerActivityDataAvailable = false;
      this._noMoreSmartDriveUsageDataAvailable = false;
      this._noMoreDataAvailable = false;
      this.journeyItemsLoaded = false;
      this._today = new Date();
      this._weekStart = getFirstDayOfWeek(this._today);
      this._rollingWeekStart = new Date(this._weekStart);
      this._journeyMap = {};
      this.journeyItems = undefined;
      return this._loadDataForDate(this._weekStart, true).then((result) => {
        this.journeyItems = result;
        this.journeyItemsLoaded = true;
      });
    });
  }

  private async _loadDataForDate(date: Date, reset: boolean = false) {
    // Check if there's any more PushTracker WeeklyActivity available to load
    if (!this._noMorePushTrackerActivityDataAvailable) {
      return this._loadWeeklyPushtrackerActivity(date).then(ptResult => {
        this._noMorePushTrackerActivityDataAvailable = !ptResult;

        // Check if there's any more SmartDrive WeeklyInfo usage data available to load
        if (!this._noMoreSmartDriveUsageDataAvailable) {
          return this._loadWeeklySmartDriveUsage(date).then(sdResult => {
            this._noMoreSmartDriveUsageDataAvailable = !sdResult;
            return this._processJourneyMap(date, reset).then(result => {
              return result;
            });
          });
        } else {
          return this.journeyItems;
        }
      });
    } else if (!this._noMoreSmartDriveUsageDataAvailable) {
      // No PushTracker activity data available
      // Just check SmartDrive WeeklyInfo usage data
      return this._loadWeeklySmartDriveUsage(date).then(result => {
        this._noMoreSmartDriveUsageDataAvailable = !result;
        return this._processJourneyMap(date, reset).then(result => {
          return result;
        });
      });
    } else {
      // No data available
      this._noMoreDataAvailable = true;
      Log.D('No more data available in the database', this._rollingWeekStart);
      return this.journeyItems;
    }
  }

  private _updateDistanceUnit(distance: number) {
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS) {
      return milesToKilometers(distance);
    }
    return distance;
  }

  private async _processJourneyMap(date: Date, reset: boolean) {
    // Sort _journeyMap by key
    let orderedJourneyMap = {};
    const self = this;

    const start = date;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startTime = start.getTime();
    const endTime = end.getTime();

    Object.keys(this._journeyMap)
      .filter(key => {
        return parseInt(key) >= startTime && parseInt(key) <= endTime;
      })
      .sort()
      .reverse()
      .forEach(function(key) {
        orderedJourneyMap[key] = self._journeyMap[key];
      });

    if (reset) this.journeyItems = [];

    const getJourneyTypeString = function(journeyType: JourneyType) {
      if (journeyType === JourneyType.ROLL) return 'roll';
      else if (journeyType === JourneyType.DRIVE) return 'drive';
    };

    for (const key in orderedJourneyMap) {
      const journey = orderedJourneyMap[key];

      // roll - default; used when there is no drive / distance data,
      // or when the coast data is significantly more than drive
      if (
        journey.driveDistance === 0 ||
        journey.coastDistance > journey.driveDistance * 1.3
      ) {
        journey.journeyType = JourneyType.ROLL;
      }

      // drive - used when there is distance data and drive is a significant portion of coast (e.g. > 30%)
      // https://github.com/Max-Mobility/permobil-client/issues/23
      if (
        journey.driveDistance > 0 &&
        journey.coastDistance < journey.driveDistance * 1.3
      ) {
        journey.journeyType = JourneyType.DRIVE;
      }

      if (!journey.journeyType) journey.journeyType = JourneyType.ROLL;
    }

    // Identify and group journey items
    // before creating ListView items
    return this._mergeJourneyItems(orderedJourneyMap).then(result => {
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
          journeyDateLabel = 'Today';
        } else if (areDatesSame(journeyDate, yesterday)) {
          journeyDateLabel = 'Yesterday';
        } else {
          const dateStringList = (journeyDate + '').split(' ');
          journeyDateLabel =
            dateStringList[0] +
            ', ' +
            dateStringList[1] +
            ' ' +
            dateStringList[2];
        }

        if (!journeyDateLabel) {
          journeyDateLabel = journeyDate + '';
        }

        let journeyTimeLabel = '';
        if (journey.mergedTimes && journey.mergedTimes.length) {
          const lastTimeMerged = new Date(
            parseInt(journey.mergedTimes.sort()[journey.mergedTimes.length - 1])
          );
          // lastTimeMerged.setMinutes(lastTimeMerged.getMinutes() + 30);
          journeyTimeLabel += formatAMPM(lastTimeMerged);
          journeyDate.setMinutes(journeyDate.getMinutes() + 30);
          journeyTimeLabel += ' - ' + formatAMPM(journeyDate);
        } else {
          journeyTimeLabel = formatAMPM(journeyDate);
          const thirtyMinsLater = new Date(journeyDate);
          thirtyMinsLater.setMinutes(thirtyMinsLater.getMinutes() + 30);
          journeyTimeLabel += ' - ' + formatAMPM(thirtyMinsLater);
        }

        // Selectively hide list items in Journey tab #249
        // https://github.com/Max-Mobility/permobil-client/issues/249
        // If coastTime is zero, if coastDistance is less then 0.1 then hide the list item
        if (!journey.coastTime || journey.coastTime === 0) {
          if (journey.coastDistance < 0.1) continue;
        }
        // If coastTime is non-zero but less than say 5 seconds, then too hide the list item
        else if (journey.coastTime) {
          if (journey.coastTime < 0.05) {
            continue;
          }
        }

        newJourneyItems.push({
          journey_type: journey.journeyType,
          date: journeyDateLabel,
          time: journeyTimeLabel,
          push_count:
            (journey.pushCount ? journey.pushCount.toFixed() : '0') || '0',
          coast_time:
            (journey.coastTime ? journey.coastTime.toFixed(1) : '0.0') || '0.0',
          coast_distance:
            (journey.coastDistance ? journey.coastDistance.toFixed(2) : '0.00') ||
            '0.00',
          drive_distance:
            (journey.driveDistance ? journey.driveDistance.toFixed(2) : '0.00') ||
            '0.00',
          description:
            getTimeOfDayString(journey.timeOfDay) +
            ' ' +
            getJourneyTypeString(journey.journeyType),
          duration: 0,
          icon_small:
            this.savedTheme === 'DEFAULT'
              ? imageFromResource(
                  journey.journeyType === JourneyType.ROLL
                    ? 'roll_black'
                    : 'smartdrive_material_black_45'
                )
              : imageFromResource(
                  journey.journeyType === JourneyType.ROLL
                    ? 'roll_white'
                    : 'smartdrive_material_white_45'
                ),
          icon_large:
            this.savedTheme === 'DEFAULT'
              ? imageFromResource(
                  journey.journeyType === JourneyType.ROLL
                    ? 'roll_white'
                    : 'smartdrive_material_white_45'
                )
              : imageFromResource(
                  journey.journeyType === JourneyType.ROLL
                    ? 'roll_white'
                    : 'smartdrive_material_white_45'
                )
        });
      }
      return newJourneyItems;
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
        const first = journeyList[parseInt(i)];
        const firstIndex = parseInt(i);
        let second = journeyList[parseInt(i) + 1];
        const secondIndex = parseInt(i) + 1;

        while (secondIndex < journeyList.length) {
          // If type of journey is the same
          // If time of day is the same
          // If first.time + 30 mins == second.time
          // Then, merge entries
          const firstDate = new Date(parseInt(first.startTime));
          const secondDate = new Date(parseInt(second.startTime));
          const timeDiff = secondDate.getTime() - firstDate.getTime();
          if (
            first.stats.journeyType === second.stats.journeyType &&
            first.stats.timeOfDay === second.stats.timeOfDay &&
            timeDiff < FORTY_FIVE_MINUTES
          ) {
            journeyList[firstIndex].stats.coastTime =
              ((journeyList[firstIndex].stats.coastTimeTotal || 0) +
                second.stats.coastTimeTotal || 0) /
              ((journeyList[firstIndex].stats.pushCount || 0) +
                second.stats.pushCount ||
                0 ||
                1);
            journeyList[firstIndex].stats.coastDistance =
              (journeyList[firstIndex].stats.coastDistance || 0) +
                second.stats.coastDistance || 0;
            journeyList[firstIndex].stats.driveDistance =
              (journeyList[firstIndex].stats.driveDistance || 0) +
                second.stats.driveDistance || 0;
            journeyList[firstIndex].stats.pushCount =
              (journeyList[firstIndex].stats.pushCount || 0) +
                second.stats.pushCount || 0;
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
    Log.D('Loading weekly activity from Kinvey');
    let result = [];
    if (!this.user) return result;

    const month = weekStartDate.getMonth() + 1;
    const day = weekStartDate.getDate();
    const date = weekStartDate.getFullYear() + '/' +
      (month < 10 ? '0' + month : month) + '/' +
      (day < 10 ? '0' + day : day);
    try {
      const queryString = '?query={"_acl.creator":"' + this.user._id +
        '","data_type":"WeeklyActivity","date":{"$lte":"' + date + '"}}&limit=1&sort={"date": -1}';
      return TNSHTTP.request({
        url:
          'https://baas.kinvey.com/appdata/kid_rkoCpw8VG/PushTrackerActivity' + queryString,
        method: 'GET',
        headers: {
          Accept: 'application/json; charset=utf-8',
          'Accept-Encoding': 'gzip',
          Authorization: 'Kinvey ' + this.user._kmd.authtoken,
          'Content-Type': 'application/json'
        }
      })
      .then(resp => {
        const data = resp.content.toJSON();
        if (data && data.length) {
          result = data[0];
          this._weeklyActivityFromKinvey = result; // cache result
          Log.D('JourneyTab | loadWeeklyPushtrackerActivityFromKinvey | Loaded weekly activity');
          return Promise.resolve(result);
        }
        return Promise.resolve(this._weeklyActivityFromKinvey);
      })
      .catch(err => {
        Log.E('JourneyTab | loadWeeklyPushtrackerActivityFromKinvey |', err);
        return Promise.reject([]);
      });
    } catch (err) {
      Log.E('JourneyTab | loadWeeklyPushtrackerActivityFromKinvey |', err);
      return Promise.reject([]);
    }
  }

  private async _loadWeeklyPushtrackerActivity(date: Date) {
    return this.loadWeeklyPushtrackerActivityFromKinvey(date).then(didLoad => {
      if (didLoad) {
        for (const i in this._weeklyActivityFromKinvey.days) {
          if (areDatesSame(this._weekStart, date)) {
            const index = getDayOfWeek(new Date());
            this.todayActivity = this._weeklyActivityFromKinvey.days[
              index
            ];
          }

          const dailyActivity = this._weeklyActivityFromKinvey
            .days[i];
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
            }
          }
        }
      }
      return didLoad;
    });
  }

  async loadWeeklySmartDriveUsageFromKinvey(weekStartDate: Date) {
    Log.D('Loading weekly usage from Kinvey');
    let result = [];
    if (!this.user) return result;

    const month = weekStartDate.getMonth() + 1;
    const day = weekStartDate.getDate();
    const date = weekStartDate.getFullYear() + '/' +
      (month < 10 ? '0' + month : month) + '/' +
      (day < 10 ? '0' + day : day);
    try {
      const queryString = '?query={"_acl.creator":"' + this.user._id +
        '","data_type":"SmartDriveWeeklyInfo","date":{"$lte":"' + date + '"}}&limit=1&sort={"date": -1}';
      return TNSHTTP.request({
        url:
          'https://baas.kinvey.com/appdata/kid_rkoCpw8VG/SmartDriveUsage' + queryString,
        method: 'GET',
        headers: {
          Accept: 'application/json; charset=utf-8',
          'Accept-Encoding': 'gzip',
          Authorization: 'Kinvey ' + this.user._kmd.authtoken,
          'Content-Type': 'application/json'
        }
      })
      .then(resp => {
        const data = resp.content.toJSON();
        if (data && data.length) {
          result = data[0];
          this._weeklyUsageFromKinvey = result; // cache
          Log.D('JourneyTab | loadWeeklySmartDriveUsageFromKinvey | Loaded weekly usage');
          return Promise.resolve(result);
        }
        return Promise.resolve(this._weeklyUsageFromKinvey);
      })
      .catch(err => {
        Log.E('JourneyTab | loadWeeklySmartDriveUsageFromKinvey |', err);
        return Promise.reject([]);
      });
    } catch (err) {
      Log.E('JourneyTab | loadWeeklySmartDriveUsageFromKinvey |', err);
      return Promise.reject([]);
    }
  }

  private async _loadWeeklySmartDriveUsage(date: Date) {
    return this.loadWeeklySmartDriveUsageFromKinvey(date).then(didLoad => {
      if (didLoad) {
        for (const i in this._weeklyUsageFromKinvey.days) {
          if (areDatesSame(this._weekStart, date)) {
            const index = getDayOfWeek(new Date());
            this.todayUsage = this._weeklyUsageFromKinvey.days[
              index
            ];
          }

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
                coastDistanceStart = dailyUsage.distance_smartdrive_coast_start;
                driveDistanceStart = dailyUsage.distance_smartdrive_drive_start;
              } else {
                coastDistanceStart =
                  dailyUsage.records[parseInt(i) - 1].distance_smartdrive_coast;
                driveDistanceStart =
                  dailyUsage.records[parseInt(i) - 1].distance_smartdrive_drive;
              }

              if (!this._journeyMap[record.start_time]) {
                this._journeyMap[record.start_time] = new JourneyItem();
                this._journeyMap[
                  record.start_time
                ].timeOfDay = getTimeOfDayFromStartTime(record.start_time);
              }
              this._journeyMap[
                record.start_time
              ].coastDistance = this._updateDistanceUnit(
                DeviceBase.caseTicksToMiles(
                  record.distance_smartdrive_coast - coastDistanceStart
                )
              );
              // https://github.com/Max-Mobility/permobil-client/issues/266
              if (this._journeyMap[record.start_time].coastDistance < 0.0)
                this._journeyMap[record.start_time].coastDistance = 0.0;

              this._journeyMap[
                record.start_time
              ].driveDistance = this._updateDistanceUnit(
                DeviceBase.motorTicksToMiles(
                  record.distance_smartdrive_drive - driveDistanceStart
                )
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
    });
  }
}
