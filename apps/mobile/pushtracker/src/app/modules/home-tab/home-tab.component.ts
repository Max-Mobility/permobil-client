import { Component, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import debounce from 'lodash/debounce';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import { ChartFontStyle, Palette, PaletteEntry, PointLabelStyle } from 'nativescript-ui-chart';
import { Subscription } from 'rxjs';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { screen } from 'tns-core-modules/platform';
import { ActivityTabComponent } from '..';
import { APP_THEMES, DISTANCE_UNITS, STORAGE_KEYS } from '../../enums';
import { DeviceBase } from '../../models';
import { ActivityService, LoggingService, PushTrackerUserService, SmartDriveUsageService } from '../../services';
import { enableDarkTheme, enableDefaultTheme, milesToKilometers } from '../../utils';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent {
  user: PushTrackerUser;
  screenWidth = screen.mainScreen.widthDIPs;
  distanceCirclePercentage: number = 0;
  distanceCirclePercentageMaxValue;
  coastTimeCirclePercentage: number;
  coastTimeCirclePercentageMaxValue;
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

  distancePlotPalettes: ObservableArray<Palette>;
  private pointLabelStyle: PointLabelStyle;

  private _progressUpdatedOnce: boolean = false;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 500;
  private _currentDayInView: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _todaysActivity: any;
  private _firstLoad: boolean = true;

  private _userSubscription$: Subscription;

  public goalLabelChartData: ObservableArray<any[]> = new ObservableArray([
    { xAxis: '        ', coastTime: 5, impact: 7 }
  ] as any[]);

  constructor(
    public userService: PushTrackerUserService,
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _activityService: ActivityService
  ) {}

  onHomeTabLoaded() {
    this._logService.logBreadCrumb(`HomeTabComponent loaded`);

    this._userSubscription$ = this.userService.user.subscribe(user => {
      this.user = user;

      this.savedTheme = appSettings.getString(
        STORAGE_KEYS.APP_THEME,
        APP_THEMES.DEFAULT
      );
      this.savedTheme === APP_THEMES.DEFAULT
        ? enableDefaultTheme()
        : enableDarkTheme();

      this._currentDayInView = new Date();
      this._weekStart = this._getFirstDayOfWeek(this._currentDayInView);
      this._weekEnd = new Date(this._weekStart);
      this._weekEnd.setDate(this._weekEnd.getDate() + 6);
      this._loadWeeklyData();

      debounce(
        this._loadSmartDriveUsage.bind(this),
        this.MAX_COMMIT_INTERVAL_MS,
        { trailing: true }
      );

      this._smartDriveUsageService.usageUpdated.subscribe(usageUpdated => {
        if (usageUpdated && !this._progressUpdatedOnce) {
          this._updateProgress();
          this._progressUpdatedOnce = true;
        }
      });
    });
  }

  onHomeTabUnloaded() {
    Log.D('HomeTabComponent unloaded');
    this._userSubscription$.unsubscribe();
  }

  refreshPlots(args) {
    Log.D('Refreshing the data on HomeTabComponent');
    const pullRefresh = args.object;
    this._loadWeeklyData();
    pullRefresh.refreshing = false;
  }

  private _loadWeeklyData() {
    this.weeklyActivityLoaded = false;

    this.savedTheme = this.user.data.theme_preference;
    if (this._firstLoad) {
      this._loadWeeklyActivity();
      this._loadSmartDriveUsage();
      this._firstLoad = false;
    } else {
      debounce(
        this._loadWeeklyActivity.bind(this),
        this.MAX_COMMIT_INTERVAL_MS,
        { trailing: true }
      );

      debounce(
        this._loadSmartDriveUsage.bind(this),
        this.MAX_COMMIT_INTERVAL_MS,
        { trailing: true }
      );
    }
    this._updateProgress();
    this._updatePointLabelStyle();
    this._updatePalettes();

    this.weeklyActivityLoaded = true;
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

  private async _loadSmartDriveUsage() {
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
    this.distanceGoalValue = this._updateDistanceUnit(
      this.user.data.activity_goal_distance
    ).toFixed(1);
    this.distanceGoalUnit =
      this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' kilometers per day'
        : ' miles per day';
    // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
    if (this._todaysUsage) {
      this.todayCoastDistance = this._updateDistanceUnit(
        DeviceBase.caseTicksToMiles(
          this._todaysUsage.distance_smartdrive_coast -
            this._todaysUsage.distance_smartdrive_coast_start
        ) || 0
      ).toFixed(1);
      this.todayDriveDistance = this._updateDistanceUnit(
        DeviceBase.motorTicksToMiles(
          this._todaysUsage.distance_smartdrive_drive -
            this._todaysUsage.distance_smartdrive_drive_start
        ) || 0
      ).toFixed(1);
      this.todayOdometer = this._updateDistanceUnit(
        DeviceBase.caseTicksToMiles(
          this._todaysUsage.distance_smartdrive_coast
        ) || 0
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
    this._updateProgress();
  }

  private async _loadWeeklyActivity() {
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
    this.coastTimeGoalMessage = 'Coast for ';
    this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
    this.coastTimeGoalUnit = ' seconds each day';
    this.distanceGoalMessage = 'Travel ';
    this.distanceGoalValue = this._updateDistanceUnit(
      this.user.data.activity_goal_distance
    ).toFixed(1);
    this.distanceGoalUnit =
      this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' kilometers per day'
        : ' miles per day';
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

    this.coastTimeGoalMessage = 'Coast for ';
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
    this._updateProgress();
  }

  private _updateProgress() {
    this.coastTimeGoalMessage = 'Coast for ';
    this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
    this.coastTimeGoalUnit = ' seconds each day';
    this.distanceGoalMessage = 'Travel ';
    this.distanceGoalValue = this._updateDistanceUnit(
      this.user.data.activity_goal_distance
    ).toFixed(1);
    this.distanceGoalUnit =
      this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' kilometers per day'
        : ' miles per day';
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

  private _updatePalettes() {
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

  private _updatePointLabelStyle() {
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

  private _getFirstDayOfWeek(date) {
    date = new Date(date);
    const day = date.getDay();
    if (day === 0) return date; // Sunday is the first day of the week
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  private _updateCoastTimePlotYAxis() {
    const dateFormatted = function(date: Date) {
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

    if (this.yAxisMax > 1.0) this.yAxisMax = Math.ceil(this.yAxisMax / 5) * 5;
    // round to the nearest multiple of 5
    else if (this.yAxisMax === 0) this.yAxisMax = 1.0;
    else if (this.yAxisMax <= 1.0) this.yAxisMax = 1.0;
    this.yAxisStep = this.yAxisMax / 5.0;
  }

  private _formatActivityForView(viewMode) {
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

  private _updateDistancePlotYAxis() {
    const dateFormatted = function(date: Date) {
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
            DeviceBase.caseTicksToMiles(
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

    if (this.coastDistanceYAxisMax > 1.0)
      this.coastDistanceYAxisMax =
        Math.ceil(this.coastDistanceYAxisMax / 5) * 5;
    // round to the nearest multiple of 5
    else if (this.coastDistanceYAxisMax === 0) this.coastDistanceYAxisMax = 1.0;
    else if (this.coastDistanceYAxisMax <= 1.0)
      this.coastDistanceYAxisMax = 1.0;
    this.coastDistanceYAxisStep = this.coastDistanceYAxisMax / 5.0;
  }

  private _formatUsageForView(viewMode) {
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
                DeviceBase.caseTicksToMiles(
                  dailyUsage.distance_smartdrive_coast -
                    dailyUsage.distance_smartdrive_coast_start
                ) || 0
              ),
              driveDistance: this._updateDistanceUnit(
                DeviceBase.motorTicksToMiles(
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

  private _updateDistanceUnit(distance: number) {
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS) {
      return milesToKilometers(distance);
    }
    return distance;
  }
}
