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
  coastTimePlotAnnotationValue: number = 1;
  coastTimeGoalMessage: string;
  usageActivity: ObservableArray<any[]>;
  distanceGoalMessage: string;
  weeklyActivityLoaded: boolean = false;
  weeklySmartDriveUsage: ObservableArray<any[]>;

  coastDistanceYAxisMax: number = 1.0;
  coastDistanceYAxisStep: number = 0.25;
  todayCoastDistance: string = '0.0';
  todayDriveDistance: string = '0.0';
  private _todaysUsage: any;
  distancePlotAnnotationValue: number = 0;
  distanceGoalLabelChartData: ObservableArray<any[]>;

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

      // Update bindings for coast_time plot
      this.coastTimeGoalMessage =
        'Reach an average coast time of ' +
        this.user.data.activity_goal_coast_time +
        's per day';
      this.distanceGoalMessage = 'Travel ' +
        this.user.data.activity_goal_distance + 'mi per day';
      this.distanceCirclePercentageMaxValue =
        '/' + this.user.data.activity_goal_distance;
      this.coastTimeCirclePercentageMaxValue =
        '/' + this.user.data.activity_goal_coast_time;
      this.weeklyActivityLoaded = true;
      this.goalLabelChartData = new ObservableArray(([{ xAxis: ' ', coastTime: this.user.data.activity_goal_coast_time, impact: 7 }] as any[]));
      this.coastTimeCirclePercentage = (parseFloat(this.todayCoastTime) / this.user.data.activity_goal_coast_time) * 100;

      // Update bindings for coast_distance plot
      this._loadSmartDriveUsage();

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

    this.coastTimePlotAnnotationValue = this.user.data.activity_goal_coast_time;
    this.coastTimeGoalMessage =
    'Reach an average coast time of ' +
    this.user.data.activity_goal_coast_time +
    's per day';
  this.distanceGoalMessage = 'Travel ' +
    this.user.data.activity_goal_distance + 'mi per day';
  this.distanceCirclePercentageMaxValue =
    '/' + this.user.data.activity_goal_distance;
  this.coastTimeCirclePercentageMaxValue =
    '/' + this.user.data.activity_goal_coast_time;
  this.weeklyActivityLoaded = true;
  this.goalLabelChartData = new ObservableArray(([{ xAxis: ' ', coastTime: this.user.data.activity_goal_coast_time, impact: 7 }] as any[]));
  this.coastTimeCirclePercentage = (parseFloat(this.todayCoastTime) / this.user.data.activity_goal_coast_time) * 100;
    if (this.yAxisMax === 0) this.yAxisMax = 10;

    if (this.coastTimePlotAnnotationValue > this.yAxisMax)
      this.yAxisMax =
        this.coastTimePlotAnnotationValue +
        0.4 * this.coastTimePlotAnnotationValue;
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
          const dailyActivity = days[i];
          if (dailyActivity) {
            // We have daily activity for this day
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastTime: dailyActivity.coast_time_avg || 0,
              pushCount: dailyActivity.push_count || 0,
              date: dayInWeek
            });
          }
          else {
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

  _motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  _caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
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
    this.distanceGoalMessage = 'Travel ' +
      this.user.data.activity_goal_distance + 'mi per day';
    this.coastDistanceYAxisMax = 0;
    if (this._smartDriveUsageService.weeklyActivity) {
      const days = this._smartDriveUsageService.weeklyActivity['days'];
      for (const i in days) {
        const day = days[i];
        if (day) {
          const coastDistance = this._caseTicksToMiles(day.distance_smartdrive_coast - day.distance_smartdrive_coast_start) || 0;
          if (day.date === dateFormatted(this._currentDayInView))
            this._todaysUsage = day;
          if (coastDistance > this.coastDistanceYAxisMax)
            this.coastDistanceYAxisMax = coastDistance + 0.4 * coastDistance;
        }
      }
    }
    // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
    if (this._todaysUsage) {
      this.todayCoastDistance = (this._caseTicksToMiles(this._todaysUsage.distance_smartdrive_coast - this._todaysUsage.distance_smartdrive_coast_start) || 0).toFixed(1);
      this.todayDriveDistance = (this._caseTicksToMiles(this._todaysUsage.distance_smartdrive_drive - this._todaysUsage.distance_smartdrive_drive_start) || 0).toFixed(1);
    } else {
      this.todayCoastDistance = (0).toFixed(1);
      this.todayDriveDistance = (0).toFixed();
    }

    this.distancePlotAnnotationValue = this.user.data.activity_goal_distance;

    if (this.coastDistanceYAxisMax === 0) this.coastDistanceYAxisMax = 10;
    if (this.distancePlotAnnotationValue > this.coastDistanceYAxisMax)
      this.coastDistanceYAxisMax = this.distancePlotAnnotationValue + 0.4 * this.distancePlotAnnotationValue;
    this.coastDistanceYAxisStep = parseInt((this.coastDistanceYAxisMax / 3.0).toFixed());
    this.distanceGoalLabelChartData = new ObservableArray(([{ xAxis: ' ', coastDistance: this.user.data.activity_goal_distance, impact: 7 }] as any[]));
    this.distanceCirclePercentage = (parseFloat(this.todayCoastDistance) / this.user.data.activity_goal_distance) * 100;
    console.log(this.todayCoastDistance, this.user.data.activity_goal_distance, this.distanceCirclePercentage);
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
          const dailyUsage = days[i];
          if (dailyUsage) {
            // We have daily activity for this day
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastDistance: this._caseTicksToMiles(dailyUsage.distance_smartdrive_coast - dailyUsage.distance_smartdrive_coast_start) || 0,
              driveDistance: this._motorTicksToMiles(dailyUsage.distance_smartdrive_drive - dailyUsage.distance_smartdrive_drive_start) || 0,
              date: dayInWeek
            });
          }
          else {
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastDistance: 0,
              driveDistance: 0,
              date: dayInWeek
            });
          }
        }
        result.unshift({ xAxis: ' ', coastDistance: 0, driveDistance: 0 });
        result.unshift({ xAxis: '  ', coastDistance: 0, driveDistance: 0 });
        result.push({ xAxis: '       ', coastDistance: 0, driveDistance: 0 });
        result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
        return result;
      }
    }
  }

}
