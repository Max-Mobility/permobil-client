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
  private _userSubscription$: Subscription;
  private _journeyMap = {};

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private userService: PushTrackerUserService,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _pushtrackerActivityService: ActivityService
  ) { }

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
      this._loadWeeklyPushtrackerActivity().then(() => {
        this._loadWeeklySmartDriveUsage().then(() => {
          this._processJourneyMap();
        });
      });
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
      for (const i in this._pushtrackerActivityService.weeklyActivity.days) {
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
            this._journeyMap[record.start_time].coastTime = record.coast_time_avg;
            this._journeyMap[record.start_time].pushCount = record.push_count;
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
      console.log('Loaded weekly usage');
      for (const i in this._smartDriveUsageService.weeklyActivity.days) {
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
    // Sort _journeyMap by key
    const orderedJourneyMap = {};
    const self = this;
    Object.keys(this._journeyMap).sort().forEach(function(key) {
      orderedJourneyMap[key] = self._journeyMap[key];
    });

    this.journeyItems = [];

    const getTimeOfDayString = function(timeOfDay: TimeOfDay) {
      if (timeOfDay === 0) return 'Morning';
      else if (timeOfDay === 1) return 'Afternoon';
      else if (timeOfDay === 2) return 'Evening';
      else if (timeOfDay === 3) return 'Night';
    };

    // TODO: Identify and group journey items
    // before creating ListView items

    for (const key in orderedJourneyMap) {
      const journey = orderedJourneyMap[key];

      this.journeyItems.push({
        date: new Date(key),
        coast_time: journey.coastTime,
        coast_distance: journey.coastDistance,
        drive_distance: journey.driveDistance,
        description: getTimeOfDayString(journey.timeOfDay) + ' Roll',
        duration: 0
      });
    }
  }
}
