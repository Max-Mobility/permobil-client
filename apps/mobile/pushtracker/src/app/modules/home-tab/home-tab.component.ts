import { Component, OnInit, ViewContainerRef, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { ObservableArray } from 'tns-core-modules/data/observable-array/observable-array';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';
import { ActivityService } from '../../services/activity.service';
import { PushTrackerUserService } from '../../services/pushtracker.user.service';
import { SmartDriveUsageService } from '../../services/smartdrive-usage.service';
import { ActivityTabComponent } from '../activity-tab/activity-tab.component';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  distanceCirclePercentage: number = 0;
  distanceCirclePercentageMaxValue;
  coastTimeCirclePercentage: number;
  coastTimeCirclePercentageMaxValue;
  distanceRemainingText: string = '<Insert value>';
  pushCountData: string;
  coastTimeData: string;
  distanceData: string = '<0>';
  distanceChartData;
  user: PushTrackerUser;
  weeklyActivity: ObservableArray<any[]>;
  todayCoastTime: string = '0.0';
  todayPushCount: string = '0.0';
  yAxisMax: number = 10;
  yAxisStep: number = 2.5;
  savedTheme: string;
  weeklyActivityAnnotationValue: number = 1;
  coastTimeGoalMessage: string;
  usageActivity: ObservableArray<any[]>;
  distanceGoalMessage: string;
  weeklyActivityLoaded: boolean = false;
  weeklySmartDriveUsage: ObservableArray<any[]>;

  private _currentDayInView: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _todaysActivity: any;

  public goalLabelChartData: ObservableArray<any[]> = new ObservableArray(([{ xAxis: ' ', coastTime: 5, impact: 7 }] as any[]));

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private userService: PushTrackerUserService,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _activityService: ActivityService
  ) {
    this.getUser();
    this._currentDayInView = new Date();
    const sunday = this._getFirstDayOfWeek(this._currentDayInView);
    this._weekStart = sunday;
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    this.savedTheme = this.user.data.theme_preference;
    this._loadWeeklyActivity();
    this._loadSmartDriveUsage();
  }

  ngOnInit() {
    this._logService.logBreadCrumb(`HomeTabComponent OnInit`);
  }

  getUser() {
    this.userService.user.subscribe(user => {
      this.user = user;
      this.savedTheme = this.user.data.theme_preference;
      this.coastTimeGoalMessage =
        'Reach an average coast time of ' +
        this.user.data.activity_goal_coast_time +
        's per day';
      this.distanceCirclePercentageMaxValue =
        '/' + this.user.data.activity_goal_distance;
      this.coastTimeCirclePercentageMaxValue =
        '/' + this.user.data.activity_goal_coast_time;
      this.weeklyActivityLoaded = true;
      this.goalLabelChartData = new ObservableArray(([{ xAxis: ' ', coastTime: this.user.data.activity_goal_coast_time, impact: 7 }] as any[]));
      this.coastTimeCirclePercentage = (parseFloat(this.todayCoastTime) / this.user.data.activity_goal_coast_time) * 100;
    });
  }

  onActivityTap() {
    this._modalService
      .showModal(ActivityTabComponent, {
        context: {},
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

  onWatchTap() {
    Log.D('watch item tapped');
  }

  _getFirstDayOfWeek(date) {
    date = new Date(date);
    const day = date.getDay();
    if (day === 0) return date; // Sunday is the first day of the week
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  async _loadWeeklyActivity() {
    const didLoad = await this._activityService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      this.weeklyActivity = new ObservableArray(
        this._formatActivityForView('Week')
      );
      this._weekStart = new Date(this._activityService.weeklyActivity.date);
      this._weekEnd = new Date(this._weekStart);
      this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    } else {
      this.weeklyActivity = new ObservableArray([]);
    }
    const dateFormatted = function (date: Date) {
      return (
        date.getFullYear() +
        '/' +
        (date.getMonth() + 1 < 10
          ? '0' + (date.getMonth() + 1)
          : date.getMonth() + 1) +
        '/' +
        (date.getDate() < 10 ? '0' + date.getDate() : date.getDate())
      );
    };
    this.yAxisMax = 0;
    const days = this._activityService.weeklyActivity['days'];
    for (const i in days) {
      const day = days[i];
      if (day) {
        if (day.date === dateFormatted(this._currentDayInView))
          this._todaysActivity = day;
        if (day.coast_time_avg > this.yAxisMax)
          this.yAxisMax = day.coast_time_avg + 0.4 * day.coast_time_avg;
      }
    }
    // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
    if (this._todaysActivity) {
      this.todayCoastTime = (this._todaysActivity.coast_time_avg || 0).toFixed(1);
      this.todayPushCount = (this._todaysActivity.push_count || 0).toFixed();
    } else {
      this.todayCoastTime = (0).toFixed(1);
      this.todayPushCount = (0).toFixed();
    }

    this.weeklyActivityAnnotationValue = this.user.data.activity_goal_coast_time;

    if (this.yAxisMax === 0) this.yAxisMax = 10;

    if (this.weeklyActivityAnnotationValue > this.yAxisMax)
      this.yAxisMax =
        this.weeklyActivityAnnotationValue +
        0.4 * this.weeklyActivityAnnotationValue;
    this.yAxisStep = parseInt((this.yAxisMax / 3.0).toFixed());
    this.coastTimeGoalMessage =
      'Reach an average coast time of ' +
      this.user.data.activity_goal_coast_time +
      's per day';
    this.distanceCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_distance;
    this.coastTimeCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_coast_time;
    this.weeklyActivityLoaded = true;
    this.goalLabelChartData = new ObservableArray(([{ xAxis: ' ', coastTime: this.user.data.activity_goal_coast_time, impact: 7 }] as any[]));
    this.coastTimeCirclePercentage = (parseFloat(this.todayCoastTime) / this.user.data.activity_goal_coast_time) * 100;
  }

  _formatActivityForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._activityService.weeklyActivity;
      if (activity) {
        const result = [];
        const date = new Date(activity.date);
        const weekViewDayArray = [];
        const currentDay = date;
        let i = 0;
        while (i < 7) {
          weekViewDayArray.push(new Date(currentDay));
          currentDay.setDate(currentDay.getDate() + 1);
          i = i + 1;
        }
        const days = activity.days;
        let j = 0;
        const dayNames: string[] = [
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ];
        for (const i in weekViewDayArray) {
          const dayInWeek = weekViewDayArray[i];
          if (days && j < days.length) {
            while (j < days.length) {
              const dailyActivity = days[j];
              if (
                dayInWeek.toDateString() ===
                new Date(dailyActivity.date).toDateString()
              ) {
                // We have daily activity for this day
                result.push({
                  xAxis: dayNames[parseInt(i)],
                  coastTime: dailyActivity.coast_time_avg || 0,
                  pushCount: dailyActivity.push_count || 0,
                  date: dayInWeek
                });
                j += 1;
                continue;
              } else {
                result.push({
                  xAxis: dayNames[parseInt(i)],
                  coastTime: 0,
                  pushCount: 0,
                  date: dayInWeek
                });
                break;
              }
            }
          } else {
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastTime: 0,
              pushCount: 0,
              date: dayInWeek
            });
          }
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '       ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        return result;
      }
    }
  }

  async _loadSmartDriveUsage() {
    const didLoad = await this._smartDriveUsageService.loadWeeklyActivity(this._weekStart);
    if (didLoad) {
      this.usageActivity = new ObservableArray(this._formatUsageForView('Week'));
      this._weekStart = new Date(this._smartDriveUsageService.weeklyActivity.date);
      this._weekEnd = new Date(this._weekStart);
      this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    } else {
      this.usageActivity = new ObservableArray([]);
    }
    console.log(this._formatUsageForView('Week'));
    this.distanceGoalMessage = 'Travel ' +
      this.user.data.activity_goal_distance + 'mi per day';
  }

  _formatUsageForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._smartDriveUsageService.weeklyActivity;
      if (activity) {
        const result = [];
        const date = new Date(activity.date);
        const weekViewDayArray = [];
        const currentDay = date;
        let i = 0;
        while (i < 7) {
          weekViewDayArray.push(new Date(currentDay));
          currentDay.setDate(currentDay.getDate() + 1);
          i = i + 1;
        }
        const days = activity.days;
        let j = 0;
        const dayNames: string[] = [
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ];
        for (const i in weekViewDayArray) {
          const dayInWeek = weekViewDayArray[i];
          if (days && j < days.length) {
            while (j < days.length) {
              const dailyUsage = days[j];
              if (
                dayInWeek.toDateString() ===
                new Date(dailyUsage.date).toDateString()
              ) {
                // We have daily activity for this day
                result.push({
                  xAxis: dayNames[parseInt(i)],
                  coastDistanceStart: dailyUsage.distance_smartdrive_coast_start || 0,
                  coastDistanceEnd: dailyUsage.distance_smartdrive_coast || 0,
                  driveDistanceStart: dailyUsage.distance_smartdrive_drive_start || 0,
                  driveDistanceEnd: dailyUsage.distance_smartdrive_drive || 0,
                  date: dayInWeek
                });
                j += 1;
                continue;
              } else {
                result.push({
                  xAxis: dayNames[parseInt(i)],
                  coastDistanceStart: 0,
                  coastDistanceEnd: 0,
                  driveDistanceStart: 0,
                  driveDistanceEnd: 0,
                  date: dayInWeek
                });
                break;
              }
            }
          } else {
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastDistanceStart: 0,
              coastDistanceEnd: 0,
              driveDistanceStart: 0,
              driveDistanceEnd: 0,
              date: dayInWeek
            });
          }
        }
        result.unshift({ xAxis: ' ', coastDistanceStart: 0, coastDistanceEnd: 0, driveDistanceStart: 0, driveDistanceEnd: 0 });
        result.unshift({ xAxis: '  ', coastDistanceStart: 0, coastDistanceEnd: 0, driveDistanceStart: 0, driveDistanceEnd: 0 });
        result.push({ xAxis: '       ', coastDistanceStart: 0, coastDistanceEnd: 0, driveDistanceStart: 0, driveDistanceEnd: 0 });
        result.push({ xAxis: '        ', coastDistanceStart: 0, coastDistanceEnd: 0, driveDistanceStart: 0, driveDistanceEnd: 0 });
        return result;
      }
    }
  }
}
