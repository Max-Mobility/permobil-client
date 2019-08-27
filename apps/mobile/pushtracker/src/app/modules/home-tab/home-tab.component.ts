import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import {
  ChartFontStyle,
  Palette,
  PaletteEntry,
  PointLabelStyle
} from 'nativescript-ui-chart';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { APP_THEMES, STORAGE_KEYS, DISTANCE_UNITS } from '../../enums';
import {
  ActivityService,
  LoggingService,
  PushTrackerUserService,
  SmartDriveUsageService
} from '../../services';
import { enableDarkTheme, enableDefaultTheme } from '../../utils/themes-utils';
import { screen } from 'tns-core-modules/platform';
import { ActivityTabComponent } from '../activity-tab/activity-tab.component';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  screenWidth = screen.mainScreen.widthDIPs;
  distanceCirclePercentage: number = 0;
  distanceCirclePercentageMaxValue;
  coastTimeCirclePercentage: number;
  coastTimeCirclePercentageMaxValue;
  distanceRemainingText: string = '0.0';
  pushCountData: string;
  coastTimeData: string;
  distanceData: string = '0.0';
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
  coastTimeGoalValue: string;
  coastTimeGoalUnit: string;
  usageActivity: ObservableArray<any[]>;
  distanceGoalMessage: string;
  distanceGoalValue: string;
  distanceGoalUnit: string;
  weeklyActivityLoaded: boolean = false;
  weeklySmartDriveUsage: ObservableArray<any[]>;

  coastDistanceYAxisMax: number = 1.0;
  coastDistanceYAxisStep: number = 0.25;
  todayCoastDistance: string = '0.0';
  todayDriveDistance: string = '0.0';
  todayOdometer: string = '0.0';
  private _todaysUsage: any;
  distancePlotAnnotationValue: number = 0;
  distanceGoalLabelChartData: ObservableArray<any[]>;

  pointLabelStyle: PointLabelStyle;
  distancePlotPalettes: ObservableArray<Palette>;
  private _progressUpdatedOnce: boolean = false;

  private _currentDayInView: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _todaysActivity: any;

  public goalLabelChartData: ObservableArray<any[]> = new ObservableArray([
    { xAxis: '        ', coastTime: 5, impact: 7 }
  ] as any[]);

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private userService: PushTrackerUserService,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _activityService: ActivityService
  ) {
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    if (this.savedTheme === APP_THEMES.DEFAULT) {
      enableDefaultTheme();
    } else if (this.savedTheme === APP_THEMES.DARK) {
      enableDarkTheme();
    }
    this.getUser();
    this._currentDayInView = new Date();
    const sunday = this._getFirstDayOfWeek(this._currentDayInView);
    this._weekStart = sunday;
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);
    console.log(this._weekStart, this._weekEnd);
  }

  ngOnInit() {
    this._logService.logBreadCrumb(`HomeTabComponent OnInit`);
  }

  ngAfterViewInit() {
    this.refreshPlots({ object: { refreshing: true } });
  }

  refreshPlots(args) {
    const pullRefresh = args.object;
    this.weeklyActivityLoaded = false;
    this.savedTheme = this.user.data.theme_preference;
    this._loadWeeklyActivity();
    this._loadSmartDriveUsage();
    this.updateProgress();
    this.updatePointLabelStyle();
    this.updatePalettes();
    this.weeklyActivityLoaded = true;
    pullRefresh.refreshing = false;
  }

  updateProgress() {
    this.coastTimeGoalMessage =
      'Coast for ';
    this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
    this.coastTimeGoalUnit = ' seconds each day';
    this.distanceGoalMessage = 'Travel ';
    this.distanceGoalValue =
      this._updateDistanceUnit(this.user.data.activity_goal_distance).toFixed(
        1
      );
      this.distanceGoalUnit =
      (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' kilometers per day'
        : ' miles per day');
    this.distanceCirclePercentageMaxValue =
      '/' +
      this._updateDistanceUnit(this.user.data.activity_goal_distance).toFixed(
        1
      );
    this.coastTimeCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_coast_time;
    this.goalLabelChartData = new ObservableArray([
      {
        xAxis: '        ',
        coastTime: this.user.data.activity_goal_coast_time,
        impact: 7
      }
    ] as any[]);
    this.coastTimeCirclePercentage =
      (parseFloat(this.todayCoastTime) /
        this.user.data.activity_goal_coast_time) *
      100;

    // Update Y axis for coast distance plot
    this.distancePlotAnnotationValue = this._updateDistanceUnit(
      this.user.data.activity_goal_distance
    );
    this.distanceGoalLabelChartData = new ObservableArray([
      {
        xAxis: '        ',
        coastDistance: this._updateDistanceUnit(
          this.user.data.activity_goal_distance
        ),
        impact: 7
      }
    ] as any[]);
    this.distanceCirclePercentage =
      (parseFloat(this.todayCoastDistance) /
        this.user.data.activity_goal_distance) *
      100;
    this._updateDistancePlotYAxis();
  }

  updatePalettes() {
    {
      // Distance Plot Palettes

      // Coast Distance Palette
      const coastDistancePalette = new Palette();
      coastDistancePalette.seriesName = 'CoastDistanceUsageActivity';
      const coastDistancePaletteEntry = new PaletteEntry();
      coastDistancePaletteEntry.fillColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#00c1d5')
          : new Color('#753bbd');
      coastDistancePaletteEntry.strokeColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#00c1d5')
          : new Color('#753bbd');
      coastDistancePalette.entries = new ObservableArray<PaletteEntry>([
        coastDistancePaletteEntry
      ]);

      // Drive Distance Palette
      const driveDistancePalette = new Palette();
      driveDistancePalette.seriesName = 'DriveDistanceUsageActivity';
      const driveDistancePaletteEntry = new PaletteEntry();
      driveDistancePaletteEntry.fillColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#753bbd')
          : new Color('#00c1d5');
      driveDistancePaletteEntry.strokeColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#753bbd')
          : new Color('#00c1d5');
      driveDistancePalette.entries = new ObservableArray<PaletteEntry>([
        driveDistancePaletteEntry
      ]);

      // CoastDistanceGoalLineSeries
      const coastDistanceGoalPalette = new Palette();
      coastDistanceGoalPalette.seriesName = 'CoastDistanceGoalLineSeries';
      const coastDistanceGoalPaletteEntry = new PaletteEntry();
      coastDistanceGoalPaletteEntry.fillColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#e31c79')
          : new Color('#00c1d5');
      coastDistanceGoalPaletteEntry.strokeColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#e31c79')
          : new Color('#00c1d5');
      coastDistanceGoalPalette.entries = new ObservableArray<PaletteEntry>([
        coastDistanceGoalPaletteEntry
      ]);

      this.distancePlotPalettes = new ObservableArray<Palette>([
        coastDistancePalette,
        driveDistancePalette,
        coastDistanceGoalPalette
      ]);
    }
  }

  getUser() {
    this.userService.user.subscribe(user => {
      this.user = user;
      this.refreshPlots({ object: { refreshing: true } });
    });
    this._smartDriveUsageService.usageUpdated.subscribe(usageUpdated => {
      if (usageUpdated && !this._progressUpdatedOnce) {
        this.updateProgress();
        this._progressUpdatedOnce = true;
      }
    });
  }

  updatePointLabelStyle() {
    this.pointLabelStyle = new PointLabelStyle();
    this.pointLabelStyle.margin = 10;
    this.pointLabelStyle.fontStyle = ChartFontStyle.Bold;
    this.pointLabelStyle.fillColor =
      this.user.data.theme_preference === 'DEFAULT'
        ? new Color('#e31c79')
        : new Color('#00c1d5');
    this.pointLabelStyle.strokeColor =
      this.user.data.theme_preference === 'DEFAULT'
        ? new Color('#e31c79')
        : new Color('#00c1d5');
    this.pointLabelStyle.textSize = 12;
    this.pointLabelStyle.textColor = new Color('White');
    this.pointLabelStyle.textFormat = '%.1f';
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
    } else {
      this.weeklyActivity = new ObservableArray(
        this._formatActivityForView('Week')
      );
    }
    this._updateCoastTimePlotYAxis();

    // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
    if (this._todaysActivity) {
      this.todayCoastTime = (this._todaysActivity.coast_time_avg || 0).toFixed(
        1
      );
      this.todayPushCount = (this._todaysActivity.push_count || 0).toFixed();
    } else {
      this.todayCoastTime = (0).toFixed(1);
      this.todayPushCount = (0).toFixed();
    }

    this.coastTimePlotAnnotationValue = this.user.data.activity_goal_coast_time;
    this.coastTimeGoalMessage =
      'Coast for ';
    this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
    this.coastTimeGoalUnit = ' seconds each day';
    this.distanceGoalMessage = 'Travel ';
    this.distanceGoalValue =
      this._updateDistanceUnit(this.user.data.activity_goal_distance).toFixed(
        1
      );
    this.distanceGoalUnit =
      (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' kilometers per day'
        : ' miles per day');
    this.distanceCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_distance;
    this.coastTimeCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_coast_time;
    this.goalLabelChartData = new ObservableArray([
      {
        xAxis: '        ',
        coastTime: this.user.data.activity_goal_coast_time,
        impact: 7
      }
    ] as any[]);
    this.coastTimeCirclePercentage =
      (parseFloat(this.todayCoastTime) /
        this.user.data.activity_goal_coast_time) *
      100;

      this.coastTimeGoalMessage =
      'Coast for ';
    this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
    this.coastTimeGoalUnit = ' seconds each day';
    this.distanceCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_distance;
    this.coastTimeCirclePercentageMaxValue =
      '/' + this.user.data.activity_goal_coast_time;
    this.goalLabelChartData = new ObservableArray([
      {
        xAxis: '        ',
        coastTime: this.user.data.activity_goal_coast_time,
        impact: 7
      }
    ] as any[]);
    this.coastTimeCirclePercentage =
      (parseFloat(this.todayCoastTime) /
        this.user.data.activity_goal_coast_time) *
      100;
    this.updateProgress();
  }

  _updateCoastTimePlotYAxis() {
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
    if (this._activityService.weeklyActivity) {
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
    }
    if (this.yAxisMax === 0) this.yAxisMax = 10;

    if (this.coastTimePlotAnnotationValue > this.yAxisMax)
      this.yAxisMax =
        this.coastTimePlotAnnotationValue +
        0.4 * this.coastTimePlotAnnotationValue;
    this.yAxisStep = parseInt((this.yAxisMax / 3.0).toFixed());
  }

  _formatActivityForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._activityService.weeklyActivity;
      if (activity && activity.days) {
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
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        return result;
      } else {
        const result = [];
        const dayNames: string[] = [
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ];
        for (const i in dayNames) {
          result.push({
            xAxis: dayNames[parseInt(i)],
            coastTime: 0,
            pushCount: 0
          });
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
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
    const didLoad = await this._smartDriveUsageService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      this.usageActivity = new ObservableArray(
        this._formatUsageForView('Week')
      );
    } else {
      this.usageActivity = new ObservableArray(
        this._formatUsageForView('Week')
      );
    }
    this.distanceGoalMessage = 'Travel ';
    this.distanceGoalValue =
      this._updateDistanceUnit(this.user.data.activity_goal_distance).toFixed(
        1
      );
      this.distanceGoalUnit =
      (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' kilometers per day'
        : ' miles per day');
    // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
    if (this._todaysUsage) {
      this.todayCoastDistance = this._updateDistanceUnit(
        this._caseTicksToMiles(
          this._todaysUsage.distance_smartdrive_coast -
          this._todaysUsage.distance_smartdrive_coast_start
        ) || 0
      ).toFixed(1);
      this.todayDriveDistance = this._updateDistanceUnit(
        this._motorTicksToMiles(
          this._todaysUsage.distance_smartdrive_drive -
          this._todaysUsage.distance_smartdrive_drive_start
        ) || 0
      ).toFixed(1);
      this.todayOdometer = this._updateDistanceUnit(
        this._caseTicksToMiles(this._todaysUsage.distance_smartdrive_coast) || 0
      ).toFixed(1);
    } else {
      this.todayCoastDistance = (0).toFixed(1);
      this.todayDriveDistance = (0).toFixed();
      this.todayOdometer = (0).toFixed();
    }

    this.distancePlotAnnotationValue = this._updateDistanceUnit(
      this.user.data.activity_goal_distance
    );
    this.distanceGoalLabelChartData = new ObservableArray([
      {
        xAxis: '        ',
        coastDistance: this._updateDistanceUnit(
          this.user.data.activity_goal_distance
        ),
        impact: 7
      }
    ] as any[]);
    this.distanceCirclePercentage =
      (parseFloat(this.todayCoastDistance) /
        this.user.data.activity_goal_distance) *
      100;
    this._updateDistancePlotYAxis();
    this.updateProgress();
  }

  _updateDistancePlotYAxis() {
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
    this.coastDistanceYAxisMax = 0;
    if (this._smartDriveUsageService.weeklyActivity) {
      const days = this._smartDriveUsageService.weeklyActivity['days'];
      for (const i in days) {
        const day = days[i];
        if (day) {
          const coastDistance = this._updateDistanceUnit(
            this._caseTicksToMiles(
              day.distance_smartdrive_coast -
              day.distance_smartdrive_coast_start
            ) || 0
          );
          if (day.date === dateFormatted(this._currentDayInView))
            this._todaysUsage = day;
          if (coastDistance > this.coastDistanceYAxisMax)
            this.coastDistanceYAxisMax = coastDistance + 0.4 * coastDistance;
        }
      }
    }
    if (this.coastDistanceYAxisMax === 0) this.coastDistanceYAxisMax = 1.0;
    if (this.distancePlotAnnotationValue > this.coastDistanceYAxisMax)
      this.coastDistanceYAxisMax =
        this.distancePlotAnnotationValue +
        0.4 * this.distancePlotAnnotationValue;
    this.coastDistanceYAxisStep = this.coastDistanceYAxisMax / 4.0;
  }

  _formatUsageForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._smartDriveUsageService.weeklyActivity;
      if (activity && activity.days) {
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
              coastDistance: this._updateDistanceUnit(
                this._caseTicksToMiles(
                  dailyUsage.distance_smartdrive_coast -
                  dailyUsage.distance_smartdrive_coast_start
                ) || 0
              ),
              driveDistance: this._updateDistanceUnit(
                this._motorTicksToMiles(
                  dailyUsage.distance_smartdrive_drive -
                  dailyUsage.distance_smartdrive_drive_start
                ) || 0
              ),
              date: dayInWeek
            });
          } else {
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
        result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
        result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
        return result;
      } else {
        const result = [];
        const dayNames: string[] = [
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ];
        for (const i in dayNames) {
          result.push({
            xAxis: dayNames[parseInt(i)],
            coastDistance: 0,
            driveDistance: 0
          });
        }
        result.unshift({ xAxis: ' ', coastDistance: 0, driveDistance: 0 });
        result.unshift({ xAxis: '  ', coastDistance: 0, driveDistance: 0 });
        result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
        result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
        return result;
      }
    }
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
}
