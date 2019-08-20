import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import { Subscription } from 'rxjs';
import { Color } from 'tns-core-modules/color';
import { LoggingService } from '../../services';
import { PushTrackerUserService } from '../../services/pushtracker.user.service';
import { ActivityTabComponent } from '../activity-tab/activity-tab.component';
import { ActivityService } from '../../services/activity.service';
import { ObservableArray } from 'tns-core-modules/data/observable-array/observable-array';
import * as appSettings from 'tns-core-modules/application-settings';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { Injectable } from '@angular/core';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  distanceCirclePercentage: number;
  distanceCirclePercentageMaxValue;
  coastTimeCirclePercentage: number;
  coastTimeCirclePercentageMaxValue;
  distanceRemainingText: string;
  pushCountData: string;
  coastTimeData: string;
  distanceData: string;
  distanceChartData;
  infoItems;
  user: PushTrackerUser;

  private routeSub: Subscription; // subscription to route observer

  private _currentDayInView: Date;
  public weeklyActivity: ObservableArray<any[]>;
  private _weeklyActivityCache = {};
  private _weekStart: Date;
  private _weekEnd: Date;
  private _todaysActivity: any;
  public todayCoastTime: number;
  public todayPushCount: number;
  public yAxisMax: number = 10;
  public yAxisStep: number = 2.5;
  public savedTheme: string;
  public weeklyActivityAnnotationValue: number = 0;
  public coastTimeGoalMessage: string;

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _router: Router,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private userService: PushTrackerUserService,
    private _activityService: ActivityService
  ) {
    this._currentDayInView = new Date();
    const sunday = this._getFirstDayOfWeek(this._currentDayInView);
    this._weekStart = sunday;
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    this.weeklyActivityAnnotationValue = 0;
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._loadWeeklyActivity();
  }

  ngOnInit() {
    this._logService.logBreadCrumb(`HomeTabComponent OnInit`);
    this.userService.user.subscribe(user => {
      this.user = user;
      this.savedTheme = appSettings.getString(
        STORAGE_KEYS.APP_THEME,
        APP_THEMES.DEFAULT
      );
      this._refreshGoalData();
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

  private _refreshGoalData() {
    // determine users distance value and get user activity goal for distance
    this.distanceCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.distanceCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_distance;

    // determine users coast-time value and get user activity goal for distance
    this.coastTimeCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.coastTimeCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_coast_time;

    this.distanceRemainingText = `0.4 ${this._translateService.instant(
      'home-tab.miles-to-go'
    )}`;
    this.pushCountData = `1514`;
    this.coastTimeData = `3.6`;
    this.distanceData = `2.75`;

    this.distanceChartData = null;
  }

  _getFirstDayOfWeek(date) {
    date = new Date(date);
    const day = date.getDay();
    if (day === 0) return date; // Sunday is the first day of the week
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  async _loadWeeklyActivity() {
    let didLoad = false;
    // Check if data is available in daily activity cache first
    if (!(this._weekStart.toUTCString() in this._weeklyActivityCache)) {
      didLoad = await this._activityService.loadWeeklyActivity(this._weekStart);
      if (didLoad) {
        this.weeklyActivity = new ObservableArray(
          this._formatActivityForView('Week')
        );
        this._weekStart = new Date(this._activityService.weeklyActivity.date);
        this._weekEnd = new Date(this._weekStart);
        this._weekEnd.setDate(this._weekEnd.getDate() + 6);
      } else {
        this.weeklyActivity = new ObservableArray(
          this._formatActivityForView('Week')
        );
      }
      // Cache activity by day so we can easily pull it up next time
      this._weeklyActivityCache[this._weekStart.toUTCString()] = {
        chartData: this.weeklyActivity,
        weeklyActivity: this._activityService.weeklyActivity
      };
    } else {
      // We have the data cached. Pull it up
      didLoad = true;
      const cache = this._weeklyActivityCache[this._weekStart.toUTCString()];
      this.weeklyActivity = cache.chartData;
      this._weekStart = new Date(cache.weeklyActivity.date);
      this._weekEnd = new Date(this._weekStart);
      this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    }
    const dateFormatted = function(date: Date) {
      return date.getFullYear() + '/' + ((date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1))
        + '/' + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate());
    };
    this.yAxisMax = 0;
    const days = this._activityService.weeklyActivity['days'];
    for (const i in days) {
      const day = days[i];
      if (day.date === dateFormatted(this._currentDayInView))
        this._todaysActivity = day;
      if (day.coast_time_avg > this.yAxisMax)
        this.yAxisMax = day.coast_time_avg + 0.2 * day.coast_time_avg;
    }
    this.todayCoastTime = (this._todaysActivity.coast_time_avg || 0).toFixed(1);
    this.todayPushCount = (this._todaysActivity.push_count || 0).toFixed();
    this.weeklyActivityAnnotationValue = this.user.data.activity_goal_coast_time;

    if (this.yAxisMax === 0)
      this.yAxisMax = 10;

    if (this.weeklyActivityAnnotationValue > this.yAxisMax) this.yAxisMax = this.weeklyActivityAnnotationValue + 0.2 * this.weeklyActivityAnnotationValue;
    this.yAxisStep = parseInt((this.yAxisMax / 3.0).toFixed());
    this.coastTimeGoalMessage = 'Reach an average coast time of ' + this.user.data.activity_goal_coast_time + 's per day';
  }

  _formatActivityForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._activityService.weeklyActivity;
      if (activity) {
        const result = [];
        const date = new Date(activity.date);
        const range = function(start, end) {
          return new Array(end - start + 1)
            .fill(undefined)
            .map((_, i) => i + start);
        };
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

}
