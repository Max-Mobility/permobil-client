import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { Subscription } from 'rxjs';
import * as appSettings from 'tns-core-modules/application-settings';
import { ItemEventData } from 'tns-core-modules/ui/list-view';
import { Page } from 'tns-core-modules/ui/page';
import { APP_THEMES, DISTANCE_UNITS, STORAGE_KEYS } from '../../enums';
import { ActivityService, LoggingService, PushTrackerUserService, SmartDriveUsageService } from '../../services';

enum TimeOfDay {
  'MORNING' = 0, // Before 12:00 PM
  'AFTERNOON' = 1, // 12:01 PM to 5:00 PM
  'EVENING' = 2, // 5:01 PM to 8:00 PM
  'NIGHT' = 3 // After 8:00 PM
}

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
export class JourneyTabComponent implements OnInit {
  journeyItems;
  savedTheme: string;
  user: PushTrackerUser;

  private _today: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _userSubscription$: Subscription;
  private _journeyMap = {};
  public todayActivity;
  public todayUsage;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private userService: PushTrackerUserService,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _pushtrackerActivityService: ActivityService
  ) { }

  ngOnInit() {
    this._logService.logBreadCrumb('JourneyTabComponent loaded');

    this._page.actionBarHidden = true;
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._today = new Date();
    const sunday = this._getFirstDayOfWeek(this._today);
    this._weekStart = sunday;
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    this._userSubscription$ = this.userService.user.subscribe(user => {
      this.user = user;
      this._loadWeeklyPushtrackerActivity().then(() => {
        this._loadWeeklySmartDriveUsage().then(() => {
          this._processJourneyMap();
        });
      });
    });
  }

  onJourneyItemTap(args: ItemEventData) {
    Log.D('journey item tap', args.index);
  }

  onRefreshTap() {
    Log.D('refresh tap');
  }

  closeJourneyDetailsLayout() {
    Log.D('close journey details');
  }

  private _getFirstDayOfWeek(date) {
    date = new Date(date);
    const day = date.getDay();
    if (day === 0) return date; // Sunday is the first day of the week
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  // If the start fo the week is 0th element in an array of size 7, what is the index of date?
  private _getIndex(date1, date2) {
    // date1 = Week start, date2 = current date
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  private _getDayOfWeek(date: Date) {
    // Sunday = 0, Saturday = 6;
    return date.getDay();
  }

  private async _loadWeeklyPushtrackerActivity() {
    const didLoad = await this._pushtrackerActivityService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      for (const i in this._pushtrackerActivityService.weeklyActivity.days) {

        const index = this._getDayOfWeek(new Date());
        this.todayActivity = this._pushtrackerActivityService.weeklyActivity.days[index];

        const dailyActivity = this._pushtrackerActivityService.weeklyActivity.days[i];
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
              ].timeOfDay = this._getTimeOfDayFromStartTime(record.start_time);
            }
            this._journeyMap[record.start_time].coastTime = record.coast_time_avg || 0;
            this._journeyMap[record.start_time].coastTimeTotal = record.coast_time_total || 0;
            this._journeyMap[record.start_time].pushCount = record.push_count || 0;
          }
        }
      }
    }
  }

  private async _loadWeeklySmartDriveUsage() {
    const didLoad = await this._smartDriveUsageService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      for (const i in this._smartDriveUsageService.weeklyActivity.days) {

        const index = this._getDayOfWeek(new Date());
        this.todayUsage = this._smartDriveUsageService.weeklyActivity.days[index];

        const dailyUsage = this._smartDriveUsageService.weeklyActivity.days[i];
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
              coastDistanceStart = dailyUsage.records[parseInt(i) - 1].distance_smartdrive_coast;
              driveDistanceStart = dailyUsage.records[parseInt(i) - 1].distance_smartdrive_drive;
            }

            if (!this._journeyMap[record.start_time]) {
              this._journeyMap[record.start_time] = new JourneyItem();
              this._journeyMap[
                record.start_time
              ].timeOfDay = this._getTimeOfDayFromStartTime(record.start_time);
            }
            this._journeyMap[
              record.start_time
            ].coastDistance = this._updateDistanceUnit(
              this._caseTicksToMiles(
                record.distance_smartdrive_coast - coastDistanceStart
              )
            );
            this._journeyMap[
              record.start_time
            ].driveDistance = this._updateDistanceUnit(
              this._motorTicksToMiles(
                record.distance_smartdrive_drive - driveDistanceStart
              )
            );

            if (this._journeyMap[record.start_time].coastDistance < 0)
              this._journeyMap[record.start_time].coastDistance = 0;
            if (this._journeyMap[record.start_time].driveDistance < 0)
              this._journeyMap[record.start_time].driveDistance = 0;
          }
        }
      }
    }
  }

  private _getTimeOfDayFromStartTime(startTime: number) {
    const date = new Date(startTime);
    const hour = date.getHours();
    const minutes = date.getMinutes();
    // Morning
    if (hour < 12) return TimeOfDay.MORNING;
    else if (hour === 12 && minutes === 0) return TimeOfDay.MORNING;
    // Afternoon
    else if (hour === 12 && minutes > 0) return TimeOfDay.AFTERNOON;
    else if (hour >= 12 && hour < 17) return TimeOfDay.AFTERNOON;
    else if (hour === 17 && minutes === 0) return TimeOfDay.AFTERNOON;
    // Evening
    else if (hour >= 17 && hour < 20) return TimeOfDay.EVENING;
    else if (hour === 20 && minutes === 0) return TimeOfDay.EVENING;
    // Night
    else return TimeOfDay.NIGHT;
  }

  private _motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  private _caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  private _milesToKilometers(miles: number) {
    return miles * 1.60934;
  }

  getTodayCoastDistance() {
    if (this.todayUsage) {
      return this._updateDistanceUnit(
        this._caseTicksToMiles(
          this.todayUsage.distance_smartdrive_coast - this.todayUsage.distance_smartdrive_coast_start
        )
      ).toFixed(2);
    } else {
      return '0.00';
    }
  }

  private _updateDistanceUnit(distance: number) {
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS) {
      return this._milesToKilometers(distance);
    }
    return distance;
  }

  private _processJourneyMap() {
    // Sort _journeyMap by key
    let orderedJourneyMap = {};
    const self = this;
    Object.keys(this._journeyMap).sort().reverse().forEach(function(key) {
      orderedJourneyMap[key] = self._journeyMap[key];
    });

    this.journeyItems = [];

    const getTimeOfDayString = function(timeOfDay: TimeOfDay) {
      if (timeOfDay === 0) return 'Morning';
      else if (timeOfDay === 1) return 'Afternoon';
      else if (timeOfDay === 2) return 'Evening';
      else if (timeOfDay === 3) return 'Night';
    };

    const getJourneyTypeString = function(journeyType: JourneyType) {
      if (journeyType === JourneyType.ROLL) return 'roll';
      else if (journeyType === JourneyType.DRIVE) return 'drive';
    };

    for (const key in orderedJourneyMap) {
      const journey = orderedJourneyMap[key];

      // roll - default; used when there is no drive / distance data,
      // or when the coast data is significantly more than drive
      if (journey.driveDistance === 0 ||
          journey.coastDistance > journey.driveDistance * 1.3) {
        journey.journeyType = JourneyType.ROLL;
      }

      // drive - used when there is distance data and drive is a significant portion of coast (e.g. > 30%)
      // https://github.com/Max-Mobility/permobil-client/issues/23
      if (journey.driveDistance > 0 &&
        journey.driveDistance > journey.coastDistance * 1.3) {
        journey.journeyType = JourneyType.DRIVE;
      }

      if (!journey.journeyType)
        journey.journeyType = JourneyType.ROLL;

    }

    // Identify and group journey items
    // before creating ListView items
    orderedJourneyMap = this._mergeJourneyItems(orderedJourneyMap);

    for (const key in orderedJourneyMap) {
      const journey = orderedJourneyMap[key];
      let journeyDateLabel = '';
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const journeyDate = new Date(parseInt(key));
      if (this._areDaysSame(journeyDate, today)) {
        journeyDateLabel = 'Today';
      } else if (this._areDaysSame(journeyDate, yesterday)) {
        journeyDateLabel = 'Yesterday';
      } else {
        const dateStringList = (journeyDate + '').split(' ');
        journeyDateLabel = dateStringList[0] + ', ' + dateStringList[1] + ' ' + dateStringList[2];
      }

      if (!journeyDateLabel) {
        journeyDateLabel = journeyDate + '';
      }

      const formatAMPM = function(date: Date) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const strTime = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
        return strTime;
      };

      let journeyTimeLabel = '';
      if (journey.mergedTimes && journey.mergedTimes.length) {
        const lastTimeMerged = new Date(parseInt(journey.mergedTimes.sort()[journey.mergedTimes.length - 1]));
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

      this.journeyItems.push({
        date: journeyDateLabel,
        time: journeyTimeLabel,
        push_count: (journey.pushCount ? journey.pushCount.toFixed() : '0') || '0',
        coast_time: (journey.coastTime ? journey.coastTime.toFixed(1) : '0.0') || '0.0',
        coast_distance: (journey.coastDistance ? journey.coastDistance.toFixed(2) : '0.00') || '0.00',
        drive_distance: (journey.driveDistance ? journey.driveDistance.toFixed(2) : '0.00') || '0.00',
        description: getTimeOfDayString(journey.timeOfDay) + ' ' + getJourneyTypeString(journey.journeyType),
        duration: 0
      });
    }

  }

  private _mergeJourneyItems(orderedJourneyMap: Object) {
    let journeyList = [];
    for (const key in orderedJourneyMap) {
      journeyList.push({startTime: key, stats: orderedJourneyMap[key]});
    }

    const arrayRemove = function(arr, value) {
      return arr.filter(function(ele) {
          return ele !== value;
      });
    };

    const ONE_HOUR = 60 * 60 * 1000; /* ms */

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
          if (first.stats.journeyType === second.stats.journeyType &&
              first.stats.timeOfDay === second.stats.timeOfDay &&
              timeDiff < ONE_HOUR) {
            journeyList[firstIndex].stats.coastTime =
              ((journeyList[firstIndex].stats.coastTimeTotal || 0) + second.stats.coastTimeTotal || 0) /
              (((journeyList[firstIndex].stats.pushCount || 0) + second.stats.pushCount || 0) || 1);
            journeyList[firstIndex].stats.coastDistance = (journeyList[firstIndex].stats.coastDistance || 0) + second.stats.coastDistance || 0;
            journeyList[firstIndex].stats.driveDistance = (journeyList[firstIndex].stats.driveDistance || 0) + second.stats.driveDistance || 0;
            journeyList[firstIndex].stats.pushCount = (journeyList[firstIndex].stats.pushCount || 0) + second.stats.pushCount || 0;
            if (!journeyList[firstIndex].stats.mergedTimes) journeyList[firstIndex].stats.mergedTimes = [];
            journeyList[firstIndex].stats.mergedTimes.push(second.startTime);
            journeyList = arrayRemove(journeyList, second);
            if (secondIndex < journeyList.length) {
              second = journeyList[secondIndex];
            }
            else {
              break;
            }
          } else {
            break;
          }
        }
        if (secondIndex >= journeyList.length)
          break;
      }
    }
    const result = {};
    for (const i in journeyList) {
      const journeyItem = journeyList[i];
      result[journeyItem.startTime] = journeyItem.stats;
    }
    return result;
  }

  private _areDaysSame(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

}
