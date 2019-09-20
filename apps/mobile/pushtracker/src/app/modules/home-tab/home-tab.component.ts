import { Component, ViewContainerRef } from '@angular/core';
import { PushTrackerKinveyKeys } from '@maxmobility/private-keys';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import debounce from 'lodash/debounce';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import { ChartFontStyle, Palette, PaletteEntry, PointLabelStyle } from 'nativescript-ui-chart';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import * as TNSHTTP from 'tns-core-modules/http';
import { screen } from 'tns-core-modules/platform';
import { ActivityComponent } from '..';
import { APP_THEMES, DISTANCE_UNITS, STORAGE_KEYS } from '../../enums';
import { DeviceBase } from '../../models';
import { LoggingService, PushTrackerUserService } from '../../services';
import { enableDarkTheme, enableDefaultTheme, milesToKilometers, convertToMilesIfUnitPreferenceIsMiles } from '../../utils';

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
  coastDistanceYAxisMax: number = 1.0;
  coastDistanceYAxisStep: number = 0.25;

  todayMessage: string = '';
  todayCoastDistance: string = '0.0';
  todayDriveDistance: string = '0.0';
  todayOdometer: string = '0.0';
  distancePlotAnnotationValue: number = 0;
  distanceGoalLabelChartData: ObservableArray<any[]>;
  distancePlotPalettes: ObservableArray<Palette>;
  goalLabelChartData: ObservableArray<any[]> = new ObservableArray([
    { xAxis: '        ', coastTime: 5, impact: 7 }
  ] as any[]);
  private _todaysUsage: any;
  private pointLabelStyle: PointLabelStyle;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 3000; // 3 seconds
  private _currentDayInView: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _todaysActivity: any;
  private _firstLoad: boolean = true;
  private _debouncedLoadWeeklyActivity: any;
  private _debouncedLoadWeeklyUsage: any;

  public static api_base = PushTrackerKinveyKeys.HOST_URL;
  public static api_app_key = PushTrackerKinveyKeys.DEV_KEY;
  public static api_app_secret = PushTrackerKinveyKeys.DEV_SECRET;
  private _weeklyActivityFromKinvey: any;
  private _weeklyUsageFromKinvey: any;

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _userService: PushTrackerUserService
  ) {}

  onHomeTabLoaded() {
    this._logService.logBreadCrumb(`HomeTabComponent loaded`);

    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._currentDayInView = new Date();
    this._weekStart = this._getFirstDayOfWeek(this._currentDayInView);
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);

    this.refreshUserFromKinvey().then(() => {
      this._loadWeeklyData();
    });

    this._debouncedLoadWeeklyActivity = debounce(
      this._loadWeeklyActivity.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { trailing: true }
    );

    this._debouncedLoadWeeklyUsage = debounce(
      this._loadSmartDriveUsage.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { trailing: true }
    );

    this._userService.user.subscribe(user => {
      if (this.savedTheme !== user.data.theme_preference)
        this.savedTheme = user.data.theme_preference;
      this.savedTheme === APP_THEMES.DEFAULT
        ? enableDefaultTheme()
        : enableDarkTheme();
    });
  }

  onHomeTabUnloaded() {
    Log.D('HomeTabComponent unloaded');
  }

  // Update what is displayed in the center of the home-tab circle #263
  // https://github.com/Max-Mobility/permobil-client/issues/263
  updateTodayMessage() {
    const coastTimeValue = parseFloat(this.todayCoastTime) || 0.0;
    const coastTimeGoal = this.user.data.activity_goal_coast_time;
    const distanceValue = parseFloat(this.todayCoastDistance) || 0.0;
    const distanceGoal = convertToMilesIfUnitPreferenceIsMiles(
      this.user.data.activity_goal_distance,
      this.user.data.distance_unit_preference
    );
    const distanceUnit =
      this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? this._translateService.instant('units.km')
        : this._translateService.instant('units.mi');
    // Welcome back ${first name} if the user is at 0 of both goals
    if (coastTimeValue === 0.0 && distanceValue === 0.0) {
      this.todayMessage = this._translateService.instant('home-tab.welcome-back')
        + ' ' + this.user.data.first_name;
      return;
    }
    // Off to a good start if the user is > 0 of one of the goals but < 30% of both goals
    else if (
      (coastTimeValue > 0.0 || distanceValue > 0.0) &&
      (coastTimeValue < 0.3 * coastTimeGoal &&
        distanceValue < 0.3 * distanceGoal)
    ) {
      this.todayMessage = this._translateService.instant('home-tab.off-to-a-good-start');
      return;
    }
    // Going strong if the user is >= 30% of one of the goals but < 70% of both goals
    else if (
      (coastTimeValue >= 0.3 * coastTimeGoal &&
        coastTimeValue < coastTimeGoal) ||
      (distanceValue >= 0.3 * distanceGoal && distanceValue < distanceGoal)
    ) {
      this.todayMessage = this._translateService.instant('home-tab.going-strong');
      return;
    }
    // Only ${x} ${units} left if the user is >= 70% of one of the goals but < 100% of both goals
    else if (
      coastTimeValue >= 0.7 * coastTimeGoal &&
      coastTimeValue < coastTimeGoal
    ) {
      this.todayMessage = this._translateService.instant('home-tab.only') +
        ' ' + (coastTimeGoal - coastTimeValue).toFixed(1) + ' ' +
        this._translateService.instant('home-tab.seconds-left');
      return;
    } else if (
      distanceValue >= 0.7 * distanceGoal &&
      distanceValue < distanceGoal
    ) {
      this.todayMessage = this._translateService.instant('home-tab.only') +
          ' ' +
          (distanceGoal - distanceValue).toFixed(1) +
          ' ' +
          distanceUnit +
          ' ' +
          this._translateService.instant('home-tab.left');
      return;
    }
    // Reached ${goal name} goal, way to go! if the user is >= 100% of one goal but < 100% of the other goal
    else if (coastTimeValue >= coastTimeGoal && distanceValue < distanceGoal) {
      this.todayMessage = this._translateService.instant('home-tab.reached-coast-time-goal');
      return;
    } else if (
      distanceValue >= distanceGoal &&
      coastTimeValue < coastTimeGoal
    ) {
      this.todayMessage = this._translateService.instant('home-tab.reached-distance-goal');
      return;
    }
    // Reached all your goals, you're amazing! if the user is >= 100% of both goals
    else if (distanceValue >= distanceGoal && coastTimeValue >= coastTimeGoal) {
      this.todayMessage = this._translateService.instant('home-tab.reached-all-goals');
      return;
    }

    // Something's wrong if we're here
    this.todayMessage = this._translateService.instant('home-tab.welcome-back')
      + ' ' + this.user.data.first_name;
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
      if (
        !['_id', '_acl', '_kmd', 'authtoken', 'username', 'email'].includes(key)
      ) {
        result.data[key] = user[key];
      }
    }
    return result;
  }

  async refreshUserFromKinvey() {
    if (this._firstLoad) {
      try {
        const user = JSON.parse(appSettings.getString('Kinvey.User'));
        if (user) {
          this.user = user;
          user._id = user.data._id;
          user._acl = user.data._acl;
          user._kmd = user.data._kmd;
          user.authtoken = user.data._kmd.authtoken;
          user.username = user.data.username;
          user.email = user.data.email;
          this.user = user;
          return Promise.resolve(true);
        } else Promise.reject(false);
      } catch (err) {
        Log.E('HomeTab | refreshUserFromKinvey |', err);
      }
    }

    const kinveyActiveUser = KinveyUser.getActiveUser();
    try {
      return TNSHTTP.request({
        url:
          'https://baas.kinvey.com/user/kid_rkoCpw8VG/' +
          kinveyActiveUser['_id'],
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

  async refreshPlots(args) {
    Log.D('Refreshing the data on HomeTabComponent');
    const pullRefresh = args.object;
    this.weeklyActivityLoaded = false;
    this.refreshUserFromKinvey().then(result => {
      if (!result) return;
      // The user might come back and refresh the next day, just keeping
      // the app running - Update currentDayInView and weekStart to
      // account for this
      this._currentDayInView = new Date();
      this._weekStart = this._getFirstDayOfWeek(this._currentDayInView);
      this._weekEnd = new Date(this._weekStart);
      this._weekEnd.setDate(this._weekEnd.getDate() + 6);

      // Check for theme changes
      if (this.savedTheme !== this.user.data.theme_preference) {
        this.savedTheme = this.user.data.theme_preference;
        this.savedTheme === APP_THEMES.DEFAULT
          ? enableDefaultTheme()
          : enableDarkTheme();
      }

      // Now refresh the data
      this._loadWeeklyData().then(() => {
        pullRefresh.refreshing = false;
      });
    });
  }

  private async _loadWeeklyData() {
    this.weeklyActivityLoaded = false;

    this.savedTheme = this.user.data.theme_preference;
    if (this._firstLoad) {
      this._loadWeeklyActivity();
      this._loadSmartDriveUsage();
      this._firstLoad = false;
    } else {
      this._debouncedLoadWeeklyActivity();
      this._debouncedLoadWeeklyUsage();
    }
    this._updateProgress();
    this._updatePointLabelStyle();
    this._updatePalettes();
    this.updateTodayMessage();
    this.weeklyActivityLoaded = true;
  }

  onActivityTap() {
    this._modalService
      .showModal(ActivityComponent, {
        context: {
          tabSelectedIndex:
          this.user.data.control_configuration !== 'PushTracker with SmartDrive'
            ? 0
            : 1,
          user: this.user
        },
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

  async loadSmartDriveUsageFromKinvey(weekStartDate: Date) {
    Log.D('HomeTab | Loading weekly usage from Kinvey...');
    let result = [];
    if (!this.user) return Promise.resolve(result);

    const month = weekStartDate.getMonth() + 1;
    const day = weekStartDate.getDate();
    const date =
      weekStartDate.getFullYear() +
      '/' +
      (month < 10 ? '0' + month : month) +
      '/' +
      (day < 10 ? '0' + day : day);

    if (this._firstLoad) {
      // First load of the home tab
      // Check if there's cached activity loaded in app.component.ts
      Log.D('HomeTab | Loading weekly usage from appSettings');
      try {
        result = JSON.parse(
          appSettings.getString('SmartDrive.WeeklyUsage.' + date)
        );
        if (result && result.length) {
          return Promise.resolve(result[0]);
        }
      } catch (err) {
        Log.E('HomeTab | Loading weekly usage from appSettings |', err);
      }
    }

    try {
      const queryString =
        '?query={"_acl.creator":"' +
        this.user._id +
        '","data_type":"SmartDriveWeeklyInfo","date":"' +
        date +
        '"}&limit=1&sort={"_kmd.lmt": -1}';
      return TNSHTTP.request({
        url:
          'https://baas.kinvey.com/appdata/kid_rkoCpw8VG/SmartDriveUsage' +
          queryString,
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
            Log.D(
              'HomeTab | loadSmartDriveUsageFromKinvey | Loaded weekly usage'
            );
            return Promise.resolve(result);
          }
          Log.D('HomeTab | loadSmartDriveUsageFromKinvey | No data for this week yet');
          return Promise.resolve(this._weeklyUsageFromKinvey);
        })
        .catch(err => {
          Log.D('HomeTab | loadSmartDriveUsageFromKinvey |', err);
          return Promise.reject([]);
        });
    } catch (err) {
      Log.D('HomeTab | loadSmartDriveUsageFromKinvey |', err);
      return Promise.reject([]);
    }
  }

  private async _loadSmartDriveUsage() {
    this.loadSmartDriveUsageFromKinvey(this._weekStart).then(() => {
      this._formatUsageForView('Week').then(result => {
        this.usageActivity = new ObservableArray(result);
        this.distanceGoalMessage = this._translateService.instant('home-tab.travel') + ' ';
        this.distanceGoalValue = convertToMilesIfUnitPreferenceIsMiles(
          this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference
        ).toFixed(1);
        this.distanceGoalUnit =
          this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
            ? ' ' + this._translateService.instant('home-tab.km-per-day')
            : ' ' + this._translateService.instant('home-tab.mi-per-day');
        this._updateDistancePlotYAxis(); // sets this._todaysUsage
        // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
        if (this._todaysUsage) {
          let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(DeviceBase.caseTicksToMiles(
              this._todaysUsage.distance_smartdrive_coast -
                this._todaysUsage.distance_smartdrive_coast_start
            ) || 0),
            this.user.data.distance_unit_preference
          );
          if (coastDistance < 0.0) coastDistance = 0.0;
          this.todayCoastDistance = coastDistance.toFixed(1);

          let driveDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(DeviceBase.motorTicksToMiles(
              this._todaysUsage.distance_smartdrive_drive -
                this._todaysUsage.distance_smartdrive_drive_start
            ) || 0),
            this.user.data.distance_unit_preference
          );
          if (driveDistance < 0.0) driveDistance = 0.0;
          this.todayDriveDistance = driveDistance.toFixed(1);

          this.todayOdometer = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(DeviceBase.caseTicksToMiles(
              this._todaysUsage.distance_smartdrive_coast
            ) || 0),
            this.user.data.distance_unit_preference
          ).toFixed(1);
          // Today coast distance changed, update message
          this.updateTodayMessage();
        } else {
          this.todayCoastDistance = (0).toFixed(1);
          this.todayDriveDistance = (0).toFixed();
          this.todayOdometer = (0).toFixed();
        }

        this.distancePlotAnnotationValue = convertToMilesIfUnitPreferenceIsMiles(
          this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference
        );
        this.distanceGoalLabelChartData = new ObservableArray([
          {
            xAxis: '        ',
            coastDistance: convertToMilesIfUnitPreferenceIsMiles(
              this.user.data.activity_goal_distance,
              this.user.data.distance_unit_preference
            ),
            impact: 7
          }
        ] as any[]);
        this.distanceCirclePercentage =
          (parseFloat(this.todayCoastDistance) /
            convertToMilesIfUnitPreferenceIsMiles(this.user.data.activity_goal_distance,
              this.user.data.distance_unit_preference)) *
          100;
        this._updateProgress();
      });
    });
  }

  async loadWeeklyActivityFromKinvey(weekStartDate: Date) {
    Log.D('HomeTab | Loading weekly activity from Kinvey...');

    let result = [];
    if (!this.user) return result;

    const month = weekStartDate.getMonth() + 1;
    const day = weekStartDate.getDate();
    const date =
      weekStartDate.getFullYear() +
      '/' +
      (month < 10 ? '0' + month : month) +
      '/' +
      (day < 10 ? '0' + day : day);

    if (this._firstLoad) {
      // First load of the home tab
      // Check if there's cached activity loaded in app.component.ts
      Log.D('HomeTab | Loading weekly activity from appSettings');
      try {
        result = JSON.parse(
          appSettings.getString('PushTracker.WeeklyActivity.' + date)
        );
      } catch (err) {
        Log.E('HomeTab | Loading weekly activity from appSettings |', err);
      }
      if (result && result.length) {
        return result[0];
      }
    }

    try {
      const queryString =
        '?query={"_acl.creator":"' +
        this.user._id +
        '","data_type":"WeeklyActivity","date":"' +
        date +
        '"}&limit=1&sort={"_kmd.lmt": -1}';
      return TNSHTTP.request({
        url:
          'https://baas.kinvey.com/appdata/kid_rkoCpw8VG/PushTrackerActivity' +
          queryString,
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
            Log.D(
              'HomeTab | loadWeeklyActivityFromKinvey | Loaded weekly activity'
            );
            return Promise.resolve(result);
          }
          return Promise.resolve(this._weeklyActivityFromKinvey);
        })
        .catch(err => {
          Log.D('HomeTab | loadWeeklyActivityFromKinvey |', err);
          return Promise.reject([]);
        });
    } catch (err) {
      Log.D('HomeTab | loadWeeklyActivityFromKinvey |', err);
      return Promise.reject([]);
    }
  }

  private async _loadWeeklyActivity() {
    this.loadWeeklyActivityFromKinvey(this._weekStart).then(() => {
      this._formatActivityForView('Week').then(result => {
        this.weeklyActivity = new ObservableArray(result);
        this._updateCoastTimePlotYAxis();

        // guard against undefined --- https://github.com/Max-Mobility/permobil-client/issues/190
        if (this._todaysActivity) {
          this.todayCoastTime = (
            this._todaysActivity.coast_time_avg || 0
          ).toFixed(1);
          this.todayPushCount = (
            this._todaysActivity.push_count || 0
          ).toFixed();
          // Today coast time changed, update message
          this.updateTodayMessage();
        } else {
          this.todayCoastTime = (0).toFixed(1);
          this.todayPushCount = (0).toFixed();
        }

        this.coastTimePlotAnnotationValue = this.user.data.activity_goal_coast_time;
        this.coastTimeGoalMessage = this._translateService.instant('home-tab.coast-for');
        this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
        this.coastTimeGoalUnit = ' ' + this._translateService.instant('home-tab.seconds-per-day');
        this.distanceGoalMessage = this._translateService.instant('home-tab.travel') + ' ';
        this.distanceGoalValue = convertToMilesIfUnitPreferenceIsMiles(
          this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference
        ).toFixed(1);
        this.distanceGoalUnit =
          this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
            ? ' ' + this._translateService.instant('home-tab.km-per-day')
            : ' ' + this._translateService.instant('home-tab.mi-per-day');
        this.distanceCirclePercentageMaxValue =
          '/' +
          convertToMilesIfUnitPreferenceIsMiles(
            this.user.data.activity_goal_distance,
            this.user.data.distance_unit_preference
          ).toFixed(1);
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

        this.coastTimeGoalMessage = this._translateService.instant('home-tab.coast-for') + ' ';
        this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
        this.coastTimeGoalUnit = ' ' + this._translateService.instant('home-tab.seconds-per-day');
        this.distanceCirclePercentageMaxValue =
          '/' +
          convertToMilesIfUnitPreferenceIsMiles(
            this.user.data.activity_goal_distance,
            this.user.data.distance_unit_preference
          ).toFixed(1);
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
      });
    });
  }

  private async _updateProgress() {
    this.coastTimeGoalMessage = this._translateService.instant('home-tab.coast-for') + ' ';
    this.coastTimeGoalValue = this.user.data.activity_goal_coast_time + '';
    this.coastTimeGoalUnit = ' ' + this._translateService.instant('home-tab.seconds-per-day');
    this.distanceGoalMessage = this._translateService.instant('home-tab.travel') + ' ';
    this.distanceGoalValue = convertToMilesIfUnitPreferenceIsMiles(
      this.user.data.activity_goal_distance,
      this.user.data.distance_unit_preference
    ).toFixed(1);
    this.distanceGoalUnit =
      this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' ' + this._translateService.instant('home-tab.km-per-day')
        : ' ' + this._translateService.instant('home-tab.mi-per-day');
    this.distanceCirclePercentageMaxValue =
      '/' +
      convertToMilesIfUnitPreferenceIsMiles(this.user.data.activity_goal_distance,
        this.user.data.distance_unit_preference).toFixed(
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
    this.distancePlotAnnotationValue = convertToMilesIfUnitPreferenceIsMiles(
      this.user.data.activity_goal_distance,
      this.user.data.distance_unit_preference
    );
    this.distanceGoalLabelChartData = new ObservableArray([
      {
        xAxis: '        ',
        coastDistance: convertToMilesIfUnitPreferenceIsMiles(
          this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference
        ),
        impact: 7
      }
    ] as any[]);
    this.distanceCirclePercentage =
      (parseFloat(this.todayCoastDistance) /
        convertToMilesIfUnitPreferenceIsMiles(this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference)) *
      100;
    this._updateDistancePlotYAxis();
  }

  private async _updatePalettes() {
    {
      // Distance Plot Palettes

      // Coast Distance Palette
      const coastDistancePalette = new Palette();
      coastDistancePalette.seriesName = 'CoastDistanceUsageActivity';
      const coastDistancePaletteEntry = new PaletteEntry();
      coastDistancePaletteEntry.fillColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#0067a6')
          : new Color('#89d4e3');
      coastDistancePaletteEntry.strokeColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#0067a6')
          : new Color('#89d4e3');
      coastDistancePalette.entries = new ObservableArray<PaletteEntry>([
        coastDistancePaletteEntry
      ]);

      // Drive Distance Palette
      const driveDistancePalette = new Palette();
      driveDistancePalette.seriesName = 'DriveDistanceUsageActivity';
      const driveDistancePaletteEntry = new PaletteEntry();
      driveDistancePaletteEntry.fillColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#0067a6')
          : new Color('#89d4e3');
      driveDistancePaletteEntry.strokeColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#0067a6')
          : new Color('#89d4e3');
      driveDistancePalette.entries = new ObservableArray<PaletteEntry>([
        driveDistancePaletteEntry
      ]);

      // CoastDistanceGoalLineSeries
      const coastDistanceGoalPalette = new Palette();
      coastDistanceGoalPalette.seriesName = 'CoastDistanceGoalLineSeries';
      const coastDistanceGoalPaletteEntry = new PaletteEntry();
      coastDistanceGoalPaletteEntry.fillColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#0067a6')
          : new Color('#89d4e3');
      coastDistanceGoalPaletteEntry.strokeColor =
        this.user.data.theme_preference === 'DEFAULT'
          ? new Color('#0067a6')
          : new Color('#89d4e3');
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

  private async _updatePointLabelStyle() {
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

  private async _updateCoastTimePlotYAxis() {
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
    if (this._weeklyActivityFromKinvey) {
      const days = this._weeklyActivityFromKinvey['days'];
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

  private async _formatActivityForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._weeklyActivityFromKinvey;
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
        const dayNames: string[] = this._translateService.instant('home-tab.day-names');
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
        return Promise.resolve(result);
      } else {
        const result = [];
        const dayNames: string[] = this._translateService.instant('home-tab.day-names');
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
        return Promise.resolve(result);
      }
    }
  }

  private async _updateDistancePlotYAxis() {
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
    if (this._weeklyUsageFromKinvey) {
      const days = this._weeklyUsageFromKinvey['days'];
      for (const i in days) {
        const day = days[i];
        if (day) {
          let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(DeviceBase.caseTicksToMiles(
              day.distance_smartdrive_coast -
                day.distance_smartdrive_coast_start
            ) || 0),
            this.user.data.distance_unit_preference
          );
          if (coastDistance < 0.0) coastDistance = 0.0;

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

  private async _formatUsageForView(viewMode) {
    if (viewMode === 'Week') {
      const activity = this._weeklyUsageFromKinvey;
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
        const dayNames: string[] = this._translateService.instant('home-tab.day-names');
        for (const i in weekViewDayArray) {
          const dayInWeek = weekViewDayArray[i];
          const dailyUsage = days[i];
          if (dailyUsage) {
            // We have daily activity for this day
            let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
              milesToKilometers(DeviceBase.caseTicksToMiles(
                dailyUsage.distance_smartdrive_coast -
                  dailyUsage.distance_smartdrive_coast_start
              ) || 0),
              this.user.data.distance_unit_preference
            );
            if (coastDistance < 0.0) coastDistance = 0.0;

            let driveDistance = convertToMilesIfUnitPreferenceIsMiles(
              milesToKilometers(DeviceBase.motorTicksToMiles(
                dailyUsage.distance_smartdrive_drive -
                  dailyUsage.distance_smartdrive_drive_start
              ) || 0),
              this.user.data.distance_unit_preference
            );
            if (driveDistance < 0.0) driveDistance = 0.0;

            result.push({
              xAxis: dayNames[parseInt(i)],
              coastDistance: coastDistance || 0.0,
              driveDistance: driveDistance || 0.0,
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
        const dayNames: string[] = this._translateService.instant('home-tab.day-names');
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

  _openActivityTabModal(context: any) {
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

  onCoastTimeBarSelected(event) {
    Log.D('Coast time bar selected');
    if (!this._weeklyActivityFromKinvey) return;
    const dayIndex = event.pointIndex - 2;
    const dailyActivity = this._weeklyActivityFromKinvey.days[dayIndex];
    this._openActivityTabModal({
      tabSelectedIndex:
        this.user.data.control_configuration !== 'PushTracker with SmartDrive'
          ? 0
          : 1,
      currentDayInView: dailyActivity.date,
      viewMode: 0, // ViewMode.COAST_TIME
      user: this.user
    });
  }

  onDistanceBarSelected(event) {
    Log.D('Distance bar selected');
    if (!this._weeklyUsageFromKinvey) return;
    const dayIndex = event.pointIndex - 2;
    const dailyActivity = this._weeklyUsageFromKinvey.days[dayIndex];
    this._openActivityTabModal({
      tabSelectedIndex:
        this.user.data.control_configuration !== 'PushTracker with SmartDrive'
          ? 0
          : 1,
      currentDayInView: dailyActivity.date,
      viewMode: 2, // ViewMode.COAST_TIME
      user: this.user
    });
  }
}
