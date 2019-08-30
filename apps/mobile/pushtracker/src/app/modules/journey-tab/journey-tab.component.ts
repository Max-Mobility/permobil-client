import { Component } from '@angular/core';
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
export class JourneyTabComponent {
  journeyItems;
  savedTheme: string;
  user: PushTrackerUser;

  private _today: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _pushtrackerActivity: any;
  private _smartDriveUsage: any;
  private _userSubscription$: Subscription;
  private _journeyMap: Map<number, JourneyItem> = new Map();

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private userService: PushTrackerUserService,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _pushtrackerActivityService: ActivityService
  ) {}

  onJourneyTabLoaded() {
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
      this._loadWeeklyPushtrackerActivity();
      this._loadWeeklySmartDriveUsage();
      this._processJourneyMap();

      this.journeyItems = [
        {
          date: new Date(),
          coast_time: 40,
          distance: 1.3,
          description: 'Morning roll',
          duration: 48
        },
        {
          date: '2019-07-09T17:48:55.391Z',
          coast_time: 20,
          distance: 0.3,
          description: 'Afternoon roll',
          duration: 10
        },
        {
          date: '2019-07-05T17:48:55.391Z',
          coast_time: 80,
          distance: 2.5,
          description: 'Evening roll',
          duration: 80
        },
        {
          date: '2019-07-04T17:48:55.391Z',
          coast_time: 40,
          distance: 4.5,
          description: 'Morning roll',
          duration: 120
        }
      ];
    });
  }

  onJourneyTabUnloaded() {
    Log.D('JourneyTabComponent unloaded');
    this._userSubscription$.unsubscribe();
  }

  refreshPage(args) {
    const pullRefresh = args.object;
    // Do something here
    pullRefresh.refreshing = false;
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

  private async _loadWeeklyPushtrackerActivity() {
    const didLoad = await this._pushtrackerActivityService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      const index = this._getIndex(this._weekStart, this._today);
      this._pushtrackerActivity = this._pushtrackerActivityService.weeklyActivity.days[
        index
      ];
      if (!this._pushtrackerActivity) {
        // No activity for today
      } else {
        // There's activity for today. Update journey list with coast_time/push_count info

        // Assume that activity.records is an ordered list
        // For each record, get time of day. Build a list of objects, each object looking like:
        // start_time : { timeOfDay: 'MORNING', journeyType: <roll | drive>, coastTime: <value>,
        //                pushCount: <value>, coastDistance: <value>, driveDistance: <value>
        //               }
        for (const i in this._pushtrackerActivity.records) {
          const record = this._pushtrackerActivity.records[i];
          if (!this._journeyMap[record.start_time]) {
            this._journeyMap[record.start_time] = new JourneyItem();
            this._journeyMap[
              record.start_time
            ].timeOfDay = this._getTimeOfDayFromStartTime(record.start_time);
          }
          this._journeyMap[record.start_time].coastTime = record.coast_time_avg;
          this._journeyMap[record.start_time].pushCount = record.push_count;
        }
      }
    }
  }

  private async _loadWeeklySmartDriveUsage() {
    const didLoad = await this._smartDriveUsageService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      const index = this._getIndex(this._weekStart, this._today);
      this._smartDriveUsage = this._smartDriveUsageService.weeklyActivity.days[
        index
      ];
      if (!this._smartDriveUsage) {
        // No usage information for today
      } else {
        // There's usage information for today. Update journey list with distance info

        // Assume that usage.records is an ordered list
        // For each record, get time of day. Build a list of objects, each object looking like:
        // start_time : { timeOfDay: 'MORNING', journeyType: <roll | drive>, coastTime: <value>,
        //                pushCount: <value>, coastDistance: <value>, driveDistance: <value>
        //               }
        let coastDistanceStart = 0;
        let driveDistanceStart = 0;
        for (const i in this._smartDriveUsage.records) {
          const record = this._smartDriveUsage.records[i];

          if (parseInt(i) === 0) {
            coastDistanceStart = this._smartDriveUsage
              .distance_smartdrive_coast_start;
            driveDistanceStart = this._smartDriveUsage
              .distance_smartdrive_drive_start;
          } else {
            coastDistanceStart = this._smartDriveUsage[parseInt(i) - 1]
              .distance_smartdrive_coast;
            driveDistanceStart = this._smartDriveUsage[parseInt(i) - 1]
              .distance_smartdrive_drive;
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
        }
      }
    }
  }

  private _getTimeOfDayFromStartTime(startTime: number) {
    const date = new Date(startTime);
    const hour = date.getUTCHours();
    const minutes = date.getUTCMinutes();
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

  _motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  _caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  _milesToKilometers(miles: number) {
    return miles * 1.60934;
  }

  _updateDistanceUnit(distance: number) {
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS) {
      return this._milesToKilometers(distance);
    }
    return distance;
  }

  _processJourneyMap() {
    // Iterate over _journeyMap
    // Order by start time and group periods of activity by JourneyType and TimeOfDay
    // Process result, ready for UI
  }
}
