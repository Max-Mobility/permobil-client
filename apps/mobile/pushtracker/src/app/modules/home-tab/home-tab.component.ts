import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { PushTrackerKinveyKeys } from '@maxmobility/private-keys';
import { ModalDialogService } from '@nativescript/angular';
import { Color, ObservableArray } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { screen } from '@nativescript/core/platform';
import { TranslateService } from '@ngx-translate/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import debounce from 'lodash/debounce';
import { Toasty } from 'nativescript-toasty';
import { ActivityComponent } from '..';
import { APP_THEMES, CONFIGURATIONS, DISTANCE_UNITS, STORAGE_KEYS } from '../../enums';
import { PushTrackerUser, DeviceBase, PushTracker } from '../../models';
import { ActivityService, BluetoothService, SmartDriveUsageService, LoggingService } from '../../services';
import { convertToMilesIfUnitPreferenceIsMiles, getFirstDayOfWeek, milesToKilometers, YYYY_MM_DD } from '../../utils';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent {
  APP_THEMES = APP_THEMES;
  DISTANCE_UNITS = DISTANCE_UNITS;
  CONFIGURATIONS = CONFIGURATIONS;
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
  CURRENT_THEME: string;
  coastTimePlotAnnotationValue: number = 0.001;
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

  showBatteryInfo: boolean = false;
  ptBattery: string = '--';
  sdBattery: string = '--';

  todayMessage: string = '';
  todayCoastDistance: string = '0.0';
  todayDriveDistance: string = '0.0';
  weekCoastDistance: string = '0.0';
  weekDriveDistance: string = '0.0';
  driveOdometer: string = '0.0';
  coastOdometer: string = '0.0';
  distancePlotAnnotationValue: number = 0.001;
  private _todaysUsage: any;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 3000; // 3 seconds
  private _currentDayInView: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _todaysActivity: any;
  private _debouncedLoadWeeklyActivity: any;
  private _debouncedLoadWeeklyUsage: any;

  public static api_base = PushTrackerKinveyKeys.HOST_URL;
  public static api_app_key = PushTrackerKinveyKeys.PROD_KEY;
  public static api_app_secret = PushTrackerKinveyKeys.PROD_SECRET;
  private _weeklyActivityFromKinvey: any;
  private _weeklyUsageFromKinvey: any;

  constructor(
    private _zone: NgZone,
    private _bluetoothService: BluetoothService,
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _activityService: ActivityService,
    private _usageService: SmartDriveUsageService
  ) { }

  async onHomeTabLoaded(args) {
    this._logService.logBreadCrumb(HomeTabComponent.name, 'Loaded');

    this.refreshUserFromKinvey();

    // register for pushtracker events if we need to here -
    // https://github.com/Max-Mobility/permobil-client/issues/580
    this.registerPushTrackerEvents();

    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this._currentDayInView = new Date();
    this._weekStart = getFirstDayOfWeek(this._currentDayInView);
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);

    this.refreshPlots(args, false);

    this._debouncedLoadWeeklyActivity = debounce(
      this._loadWeeklyActivity.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true }
    );

    this._debouncedLoadWeeklyUsage = debounce(
      this._loadSmartDriveUsage.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true }
    );
  }

  onHomeTabUnloaded(args) {
    this._logService.logBreadCrumb(HomeTabComponent.name, 'Unloaded');
  }

  /**
   * BLUETOOTH EVENT MANAGEMENT - for
   * https://github.com/Max-Mobility/permobil-client/issues/580
   */
  private unregisterPushTrackerEvents() {
    this._bluetoothService.off(
      BluetoothService.pushtracker_added,
      this.onPushTrackerAdded,
      this
    );
    BluetoothService.PushTrackers.map(pt => {
      pt.off(PushTracker.daily_info_event, this.onPushTrackerDailyInfo, this);
    });
  }

  private _registerEventsForPT(pt: PushTracker) {
    // unregister
    pt.off(PushTracker.daily_info_event, this.onPushTrackerDailyInfo, this);
    // register for version and info events
    pt.on(PushTracker.daily_info_event, this.onPushTrackerDailyInfo, this);
  }

  private registerPushTrackerEvents() {
    if (this.user.data.control_configuration !==
      CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE) {
      // we only register for these events if the user is configured
      // to have a PushTracker!
      return;
    }
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      'Registering for pushtracker events'
    );
    this.showBatteryInfo = true;
    this.unregisterPushTrackerEvents();
    // handle pushtracker pairing events for existing pushtrackers
    BluetoothService.PushTrackers.map(pt => {
      this._registerEventsForPT(pt);
    });

    // listen for completely new pusthrackers (that we haven't seen before)
    this._bluetoothService.on(
      BluetoothService.pushtracker_added,
      this.onPushTrackerAdded,
      this
    );
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      'Registered for pushtracker events'
    );
  }

  onPushTrackerAdded(args: any) {
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      'PushTracker Added event received from BLE service'
    );
    this._registerEventsForPT(args.data.pt);
  }

  onPushTrackerDailyInfo(args: any) {
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      'Daily Info event received from pushtracker'
    );
    const pt = args.object as PushTracker;
    this._zone.run(() => {
      this.ptBattery = pt.battery + '%';
      this.sdBattery = pt.sdBattery ? (pt.sdBattery + '%') : '--';
    });
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
      this.todayMessage =
        this._translateService.instant('home-tab.welcome-back') +
        ' ' +
        this.user.data.first_name;
      return;
    }
    // Off to a good start if the user is > 0 of one of the goals but < 30% of both goals
    else if (
      (coastTimeValue > 0.0 || distanceValue > 0.0) &&
      (this.coastTimeCirclePercentage < 30 &&
        this.distanceCirclePercentage < 30)
    ) {
      this.todayMessage = this._translateService.instant(
        'home-tab.off-to-a-good-start'
      );
      return;
    }
    // Going strong if the user is >= 30% of one of the goals but < 70% of both goals
    else if (
      (this.coastTimeCirclePercentage >= 30 &&
        this.coastTimeCirclePercentage < 70) ||
      (this.distanceCirclePercentage >= 30 &&
        this.distanceCirclePercentage < 70)
    ) {
      this.todayMessage = this._translateService.instant(
        'home-tab.going-strong'
      );
      return;
    }
    // Only ${x} ${units} left if the user is >= 70% of one of the goals but < 100% of both goals
    else if (
      this.coastTimeCirclePercentage >= 70 &&
      coastTimeValue < coastTimeGoal &&
      distanceValue < distanceGoal
    ) {
      this.todayMessage =
        this._translateService.instant('home-tab.only') +
        ' ' +
        (coastTimeGoal - coastTimeValue).toFixed(1) +
        ' ' +
        this._translateService.instant('home-tab.seconds-left');
      return;
    } else if (
      this.distanceCirclePercentage >= 70 &&
      distanceValue < distanceGoal &&
      coastTimeValue < coastTimeGoal
    ) {
      this.todayMessage =
        this._translateService.instant('home-tab.only') +
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
      this.todayMessage = this._translateService.instant(
        'home-tab.reached-coast-time-goal'
      );
      return;
    }
    // Reached ${goal name} goal, way to go! if the user is >= 100% of one goal but < 100% of the other goal
    else if (distanceValue >= distanceGoal && coastTimeValue < coastTimeGoal) {
      this.todayMessage = this._translateService.instant(
        'home-tab.reached-distance-goal'
      );
      return;
    }
    // Reached all your goals, you're amazing! if the user is >= 100% of both goals
    else if (distanceValue >= distanceGoal && coastTimeValue >= coastTimeGoal) {
      this.todayMessage = this._translateService.instant(
        'home-tab.reached-all-goals'
      );
      return;
    }

    // Something's wrong if we're here
    this.todayMessage =
      this._translateService.instant('home-tab.welcome-back') +
      ' ' +
      this.user.data.first_name;
  }

  parseUser(user: KinveyUser) {
    this._zone.run(() => {
      this.user = user as PushTrackerUser;
      appSettings.setString('Kinvey.User', JSON.stringify(this.user));
    });
  }

  async refreshUserFromKinvey() {
    try {
      const kinveyUser = KinveyUser.getActiveUser();
      this.parseUser(kinveyUser);
      try {
        await kinveyUser.me();
        this.parseUser(kinveyUser);
      } catch (err) {
        this._logService.logBreadCrumb(HomeTabComponent.name,
          'Failed to refresh user from kinvey');
      }
      return true;
    } catch (err) {
      this._logService.logBreadCrumb(
        HomeTabComponent.name,
        'Failed to refresh user from kinvey: ' + err
      );
      return false;
    }
  }

  async refreshPlots(args, forceRefresh: boolean = true) {
    const pullRefresh = args.object;
    try {
      pullRefresh.refreshing = true;
      this.weeklyActivityLoaded = false;

      const gotUser = await this.refreshUserFromKinvey();
      if (!gotUser) return;

      // actually synchronize with the server
      if (forceRefresh) {
        try {
          await this._activityService.refreshWeekly();
        } catch (err) {
        }
        try {
          await this._usageService.refreshWeekly();
        } catch (err) {
        }
      }

      // The user might come back and refresh the next day, just keeping
      // the app running - Update currentDayInView and weekStart to
      // account for this
      this._currentDayInView = new Date();
      this._weekStart = getFirstDayOfWeek(this._currentDayInView);
      this._weekEnd = new Date(this._weekStart);
      this._weekEnd.setDate(this._weekEnd.getDate() + 6);

      // Now refresh the data
      await this._loadWeeklyData();
    } catch (err) {
      this._logService.logBreadCrumb(
        HomeTabComponent.name,
        'Failed to refresh plots'
      );
      // this._logService.logException(err);
    }
    pullRefresh.refreshing = false;
  }

  private async _loadWeeklyData() {
    this.weeklyActivityLoaded = false;

    this._debouncedLoadWeeklyActivity();
    this._debouncedLoadWeeklyUsage();
    this._updateProgress();
    this.updateTodayMessage();
    this.weeklyActivityLoaded = true;
  }

  onActivityTap() {
    this._modalService
      .showModal(ActivityComponent, {
        context: {
          currentTab:
            this.user.data.control_configuration !==
              CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
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
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      '' + 'Loading WeeklySmartDriveUsage from Kinvey'
    );
    let result = [];
    if (!this.user) return Promise.resolve(result);

    const date = YYYY_MM_DD(weekStartDate);

    return this._usageService.getWeeklyActivity(date, 1)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._weeklyUsageFromKinvey = result; // cache
          this._logService.logBreadCrumb(
            HomeTabComponent.name,
            '' + 'Successfully loaded WeeklySmartDriveUsage from Kinvey'
          );
          return Promise.resolve(result);
        }
        this._logService.logBreadCrumb(
          HomeTabComponent.name,
          '' + 'No WeeklySmartDriveUsage data available for this week'
        );
        // There's no data for this week
        // Reset weekly usage object
        this._weeklyUsageFromKinvey = {
          date: date,
          start_time: weekStartDate.getTime(),
          battery: 0,
          distance_smartdrive_coast_start: 0,
          distance_smartdrive_drive_start: 0,
          distance_smartdrive_coast: 0,
          distance_smartdrive_drive: 0,
          days: [null, null, null, null, null, null, null]
        };
        return Promise.resolve(this._weeklyUsageFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(HomeTabComponent.name, 'Failed to get JSON from kinvey');
        // this._logService.logException(err);
        return Promise.reject([]);
      });
  }

  private async _loadSmartDriveUsage() {
    this.loadSmartDriveUsageFromKinvey(this._weekStart)
      .then(() => {
        return this._formatUsageForView();
      })
      .then(async result => {
        this.usageActivity = new ObservableArray(result);
        this.distanceGoalMessage =
          this._translateService.instant('home-tab.travel') + ' ';
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
            milesToKilometers(
              DeviceBase.caseTicksToMiles(
                this._todaysUsage.distance_smartdrive_coast -
                this._todaysUsage.distance_smartdrive_coast_start
              ) || 0
            ),
            this.user.data.distance_unit_preference
          );
          if (coastDistance < 0.0) coastDistance = 0.0;
          this.todayCoastDistance = coastDistance.toFixed(1);

          let driveDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(
              DeviceBase.motorTicksToMiles(
                this._todaysUsage.distance_smartdrive_drive -
                this._todaysUsage.distance_smartdrive_drive_start
              ) || 0
            ),
            this.user.data.distance_unit_preference
          );
          if (driveDistance < 0.0) driveDistance = 0.0;
          this.todayDriveDistance = driveDistance.toFixed(1);

          // Today coast distance changed, update message
          this.updateTodayMessage();
        } else {
          this.todayCoastDistance = (0).toFixed(1);
          this.todayDriveDistance = (0).toFixed();
        }

        this.distancePlotAnnotationValue = convertToMilesIfUnitPreferenceIsMiles(
          this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference
        );
        this.distanceCirclePercentage =
          (parseFloat(this.todayCoastDistance) /
            convertToMilesIfUnitPreferenceIsMiles(
              this.user.data.activity_goal_distance,
              this.user.data.distance_unit_preference
            )) *
          100;
        this._updateProgress();
      })
      .catch(err => {
        this._logService.logBreadCrumb(HomeTabComponent.name, 'Failed to load smartdrive usage');
        // this._logService.logException(err);
      });
  }

  async loadLatestSmartDriveUsageFromKinvey() {
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      '' + 'Loading Latest WeeklySmartDriveUsage from Kinvey'
    );
    let result = {} as any;
    if (!this.user) return Promise.resolve(result);

    // don't want to filter by date, just give the latest data available
    return this._usageService.getWeeklyActivity(null, 1)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._logService.logBreadCrumb(
            HomeTabComponent.name,
            '' +
            'Successfully loaded WeeklySmartDriveUsage from Kinvey for date ' +
            result.date
          );
          return Promise.resolve(result);
        }
        this._logService.logBreadCrumb(
          HomeTabComponent.name,
          '' + 'No WeeklySmartDriveUsage data available at all!'
        );
        // There's no data for this week
        // Reset weekly usage object
        this._weeklyUsageFromKinvey = {
          battery: 0,
          distance_smartdrive_coast_start: 0,
          distance_smartdrive_drive_start: 0,
          distance_smartdrive_coast: 0,
          distance_smartdrive_drive: 0,
          days: [null, null, null, null, null, null, null]
        };
        return Promise.resolve(this._weeklyUsageFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(HomeTabComponent.name, 'Failed to get JSON from kinvey when loading latest smartdrive usage');
        // this._logService.logException(err);
        return Promise.reject({});
      });
  }

  async loadLatestWeeklyActivityFromKinvey() {
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      '' + 'Loading Latest WeeklyPushTrackerActivity from Kinvey'
    );
    let result = {} as any;
    if (!this.user) return result;

    return this._activityService.getWeeklyActivity(null, 1)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._logService.logBreadCrumb(
            HomeTabComponent.name,
            '' +
            'Successfully loaded latest WeeklyPushTrackerActivity from Kinvey - for ' +
            result.date
          );
          return Promise.resolve(result);
        }
        this._logService.logBreadCrumb(
          HomeTabComponent.name,
          '' + 'No WeeklyPushTrackerActivity data available at all'
        );
        // There's no data for this week
        // Reset weekly activity object
        const activity = {
          coast_time_avg: 0,
          coast_time_total: 0,
          distance_watch: 0,
          heart_rate: 0,
          push_count: 0,
          days: [null, null, null, null, null, null, null]
        };
        return Promise.resolve(activity);
      })
      .catch(err => {
        this._logService.logBreadCrumb(
          HomeTabComponent.name,
          'Failed to get latest activity from kinvey'
        );
        // this._logService.logException(err);
        return Promise.reject({});
      });
  }

  async loadWeeklyActivityFromKinvey(weekStartDate: Date) {
    this._logService.logBreadCrumb(
      HomeTabComponent.name,
      '' + 'Loading WeeklyPushTrackerActivity from Kinvey'
    );
    let result = [];
    if (!this.user) return result;

    const date = YYYY_MM_DD(weekStartDate);

    return this._activityService.getWeeklyActivity(date, 1)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._weeklyActivityFromKinvey = result; // cache
          this._logService.logBreadCrumb(
            HomeTabComponent.name,
            '' + 'Successfully loaded WeeklyPushTrackerActivity from Kinvey'
          );
          return Promise.resolve(result);
        }
        this._logService.logBreadCrumb(
          HomeTabComponent.name,
          '' + 'No WeeklyPushTrackerActivity data available for this week'
        );
        // There's no data for this week
        // Reset weekly activity object
        this._weeklyActivityFromKinvey = {
          date: date,
          start_time: weekStartDate.getTime(),
          coast_time_avg: 0,
          coast_time_total: 0,
          distance_watch: 0,
          heart_rate: 0,
          push_count: 0,
          days: [null, null, null, null, null, null, null]
        };
        return Promise.resolve(this._weeklyActivityFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(HomeTabComponent.name, 'Failed to get JSON from kinvey when loading weekly activity');
        // this._logService.logException(err);
        return Promise.reject([]);
      });
  }

  private async _loadWeeklyActivity() {
    this.loadWeeklyActivityFromKinvey(this._weekStart)
      .then(() => {
        this._formatActivityForView()
          .then(result => {
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
            this.coastTimeGoalMessage = this._translateService.instant(
              'home-tab.coast-for'
            );
            this.coastTimeGoalValue =
              this.user.data.activity_goal_coast_time.toFixed(1) + '';
            this.coastTimeGoalUnit =
              ' ' + this._translateService.instant('home-tab.seconds-per-day');
            this.distanceGoalMessage =
              this._translateService.instant('home-tab.travel') + ' ';
            this.distanceGoalValue = convertToMilesIfUnitPreferenceIsMiles(
              this.user.data.activity_goal_distance,
              this.user.data.distance_unit_preference
            ).toFixed(1);
            this.distanceGoalUnit =
              this.user.data.distance_unit_preference ===
                DISTANCE_UNITS.KILOMETERS
                ? ' ' + this._translateService.instant('home-tab.km-per-day')
                : ' ' + this._translateService.instant('home-tab.mi-per-day');
            this.distanceCirclePercentageMaxValue =
              '/' +
              convertToMilesIfUnitPreferenceIsMiles(
                this.user.data.activity_goal_distance,
                this.user.data.distance_unit_preference
              ).toFixed(1);
            this.coastTimeCirclePercentageMaxValue =
              '/' + this.user.data.activity_goal_coast_time.toFixed(1);
            this.coastTimeCirclePercentage =
              (parseFloat(this.todayCoastTime) /
                this.user.data.activity_goal_coast_time) *
              100;

            this.coastTimeGoalMessage =
              this._translateService.instant('home-tab.coast-for') + ' ';
            this.coastTimeGoalValue =
              this.user.data.activity_goal_coast_time.toFixed(1) + '';
            this.coastTimeGoalUnit =
              ' ' + this._translateService.instant('home-tab.seconds-per-day');
            this.distanceCirclePercentageMaxValue =
              '/' +
              convertToMilesIfUnitPreferenceIsMiles(
                this.user.data.activity_goal_distance,
                this.user.data.distance_unit_preference
              ).toFixed(1);
            this.coastTimeCirclePercentageMaxValue =
              '/' + this.user.data.activity_goal_coast_time.toFixed(1);
            this.coastTimeCirclePercentage =
              (parseFloat(this.todayCoastTime) /
                this.user.data.activity_goal_coast_time) *
              100;
            this._updateProgress();
          })
          .catch(err => {
            this._logService.logBreadCrumb(HomeTabComponent.name, 'Failed to format activity from view');
            // this._logService.logException(err);
          });
      })
      .catch(err => {
        this._logService.logBreadCrumb(HomeTabComponent.name, 'Failed to load weekly activity');
        // this._logService.logException(err);
      });
  }

  private async _updateProgress() {
    this.coastTimeGoalMessage =
      this._translateService.instant('home-tab.coast-for') + ' ';
    this.coastTimePlotAnnotationValue = this.user.data.activity_goal_coast_time;
    this.coastTimeGoalValue =
      this.user.data.activity_goal_coast_time.toFixed(1) + '';
    this.coastTimeGoalUnit =
      ' ' + this._translateService.instant('home-tab.seconds-per-day');
    this.distanceGoalMessage =
      this._translateService.instant('home-tab.travel') + ' ';
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
      '/' + this.user.data.activity_goal_coast_time.toFixed(1);
    this.coastTimeCirclePercentage =
      (parseFloat(this.todayCoastTime) /
        this.user.data.activity_goal_coast_time) *
      100;
    // update Y axis for coast time plot
    this._updateCoastTimePlotYAxis();

    // Update Y axis for distance plot
    this.distancePlotAnnotationValue = convertToMilesIfUnitPreferenceIsMiles(
      this.user.data.activity_goal_distance,
      this.user.data.distance_unit_preference
    );
    this.distanceCirclePercentage =
      (parseFloat(this.todayCoastDistance) /
        convertToMilesIfUnitPreferenceIsMiles(
          this.user.data.activity_goal_distance,
          this.user.data.distance_unit_preference
        )) *
      100;
    this._updateDistancePlotYAxis();
  }

  private async _updateCoastTimePlotYAxis() {
    this.yAxisMax = 0;
    // Set today's activity to null
    // If today's activity is available in this._weeklyActivityFromKinvey,
    // then it will be set below
    this._todaysActivity = null;
    if (this._weeklyActivityFromKinvey) {
      const days = this._weeklyActivityFromKinvey['days'];
      for (const i in days) {
        const day = days[i];
        if (day) {
          if (day.date === YYYY_MM_DD(this._currentDayInView))
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

  private async _formatActivityForView() {
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
      const dayNames: string[] = this._translateService.instant(
        'home-tab.day-names'
      );
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
      result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
      result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
      return Promise.resolve(result);
    } else {
      const result = [];
      const dayNames: string[] = this._translateService.instant(
        'home-tab.day-names'
      );
      for (const i in dayNames) {
        result.push({
          xAxis: dayNames[parseInt(i)],
          coastTime: 0,
          pushCount: 0
        });
      }
      result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
      result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
      return Promise.resolve(result);
    }
  }

  private async _updateDistancePlotYAxis() {
    this.coastDistanceYAxisMax = 0;
    // Set today's usage to null
    // If today's usage is available in this._weeklyUsageFromKinvey,
    // then it will be set below
    this._todaysUsage = null;
    if (this._weeklyUsageFromKinvey) {
      const days = this._weeklyUsageFromKinvey['days'];
      for (const i in days) {
        const day = days[i];
        if (day) {
          let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(
              DeviceBase.caseTicksToMiles(
                day.distance_smartdrive_coast -
                day.distance_smartdrive_coast_start
              ) || 0
            ),
            this.user.data.distance_unit_preference
          );
          if (coastDistance < 0.0) coastDistance = 0.0;

          if (day.date === YYYY_MM_DD(this._currentDayInView))
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

  private async _formatUsageForView() {
    const activity = this._weeklyUsageFromKinvey;
    if (activity && activity.days) {
      // update weekly odometers
      const weekDriveStart = activity.distance_smartdrive_drive_start || 0;
      const weekCoastStart = activity.distance_smartdrive_coast_start || 0;
      const weekDriveEnd = activity.distance_smartdrive_drive || 0;
      const weekCoastEnd = activity.distance_smartdrive_coast || 0;
      let driveDistance = weekDriveEnd - weekDriveStart;
      let coastDistance = weekCoastEnd - weekCoastStart;
      // format drive distance
      driveDistance = convertToMilesIfUnitPreferenceIsMiles(
        milesToKilometers(DeviceBase.motorTicksToMiles(driveDistance) || 0),
        this.user.data.distance_unit_preference
      );
      if (driveDistance < 0.0) driveDistance = 0.0;
      this.weekDriveDistance = driveDistance.toFixed(1);
      // format coast distance
      coastDistance = convertToMilesIfUnitPreferenceIsMiles(
        milesToKilometers(DeviceBase.caseTicksToMiles(coastDistance) || 0),
        this.user.data.distance_unit_preference
      );
      if (coastDistance < 0.0) coastDistance = 0.0;
      this.weekCoastDistance = coastDistance.toFixed(1);

      // get this week's usage for odometer --- https://github.com/Max-Mobility/permobil-client/issues/459
      let coastTotal = weekCoastEnd;
      let driveTotal = weekDriveEnd;
      if (coastTotal === 0) {
        // get last usage for odometer --- https://github.com/Max-Mobility/permobil-client/issues/459
        const latest = (await this.loadLatestSmartDriveUsageFromKinvey());
        coastTotal = (latest && latest.distance_smartdrive_coast) || 0;
        driveTotal = (latest && latest.distance_smartdrive_drive) || 0;
      }
      if (coastTotal === 0) this.coastOdometer = (0).toFixed();
      else {
        this.coastOdometer = convertToMilesIfUnitPreferenceIsMiles(
          milesToKilometers(DeviceBase.caseTicksToMiles(coastTotal) || 0),
          this.user.data.distance_unit_preference
        ).toFixed(1);
      }
      if (driveTotal === 0) this.driveOdometer = (0).toFixed();
      else {
        this.driveOdometer = convertToMilesIfUnitPreferenceIsMiles(
          milesToKilometers(DeviceBase.motorTicksToMiles(driveTotal) || 0),
          this.user.data.distance_unit_preference
        ).toFixed(1);
      }

      // now get format for plots
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
      const dayNames: string[] = this._translateService.instant(
        'home-tab.day-names'
      );
      for (const i in weekViewDayArray) {
        const dayInWeek = weekViewDayArray[i];
        const dailyUsage = days[i];
        if (dailyUsage) {
          // We have daily activity for this day
          let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(
              DeviceBase.caseTicksToMiles(
                dailyUsage.distance_smartdrive_coast -
                dailyUsage.distance_smartdrive_coast_start
              ) || 0
            ),
            this.user.data.distance_unit_preference
          );
          if (coastDistance < 0.0) coastDistance = 0.0;

          let driveDistance = convertToMilesIfUnitPreferenceIsMiles(
            milesToKilometers(
              DeviceBase.motorTicksToMiles(
                dailyUsage.distance_smartdrive_drive -
                dailyUsage.distance_smartdrive_drive_start
              ) || 0
            ),
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
      result.unshift({ xAxis: '  ', coastDistance: 0, driveDistance: 0 });
      result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
      return result;
    } else {
      const result = [];
      const dayNames: string[] = this._translateService.instant(
        'home-tab.day-names'
      );
      for (const i in dayNames) {
        result.push({
          xAxis: dayNames[parseInt(i)],
          coastDistance: 0,
          driveDistance: 0
        });
      }
      result.unshift({ xAxis: '  ', coastDistance: 0, driveDistance: 0 });
      result.push({ xAxis: '        ', coastDistance: 0, driveDistance: 0 });
      return result;
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
    if (!this._weeklyActivityFromKinvey) return;
    const dayIndex = event.pointIndex - 1;
    const dailyActivity = this._weeklyActivityFromKinvey.days[dayIndex];
    this._openActivityTabModal({
      currentTab:
        this.user.data.control_configuration !==
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
          ? 0
          : 1,
      currentDayInView: dailyActivity.date,
      chartYAxis: 0, // ViewMode.COAST_TIME
      user: this.user
    });
  }

  onDistanceBarSelected(event) {
    if (!this._weeklyUsageFromKinvey) return;
    const dayIndex = event.pointIndex - 1;
    const dailyActivity = this._weeklyUsageFromKinvey.days[dayIndex];
    this._openActivityTabModal({
      currentTab:
        this.user.data.control_configuration !==
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
          ? 0
          : 1,
      currentDayInView: dailyActivity.date,
      chartYAxis: 2, // ViewMode.DISTANCE
      user: this.user
    });
  }
}
