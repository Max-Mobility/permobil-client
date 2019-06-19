import {
  BluetoothService,
  DataKeys,
  Log,
  Prop,
  SensorChangedEventData,
  SensorService,
  SentryService,
  SERVICES,
  SmartDrive,
  SqliteService
} from '@permobil/core';
import { closestIndexTo, format, isSameDay, isToday, subDays } from 'date-fns';
import { ReflectiveInjector } from 'injection-js';
import clamp from 'lodash/clamp';
import last from 'lodash/last';
import once from 'lodash/once';
import throttle from 'lodash/throttle';
import { AnimatedCircle } from 'nativescript-animated-circle';
import { allowSleepAgain, keepAwake } from 'nativescript-insomnia';
import { Pager } from 'nativescript-pager';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { Vibrate } from 'nativescript-vibrate';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import {
  showFailure,
  showSuccess
} from 'nativescript-wear-os/packages/dialogs';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { Observable } from 'tns-core-modules/data/observable';
import { device } from 'tns-core-modules/platform';
import { action } from 'tns-core-modules/ui/dialogs';
import { Page, View } from 'tns-core-modules/ui/page';
import { Repeater } from 'tns-core-modules/ui/repeater';
import { PowerAssist, SmartDriveData } from '../../namespaces';
import {
  currentSystemTime,
  currentSystemTimeMeridiem,
  hideOffScreenLayout,
  showOffScreenLayout
} from '../../utils';

const ambientTheme = require('../../scss/theme-ambient.scss').toString();
const defaultTheme = require('../../scss/theme-default.scss').toString();
const retroTheme = require('../../scss/theme-retro.scss').toString();

export class MainViewModel extends Observable {
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;
  @Prop() watchCurrentBatteryPercentage: number = 0;
  @Prop() watchIsCharging: boolean = false;
  @Prop() powerAssistRingColor: Color = PowerAssist.InactiveRingColor;
  @Prop() estimatedDistance: number = 0.0;
  @Prop() estimatedDistanceDisplay: string = '0.0';
  @Prop() estimatedDistanceDescription: string = 'Estimated Range (mi)';
  @Prop() currentSpeed: number = 0.0;
  @Prop() currentSpeedDisplay: string = '0.0';
  @Prop() currentSpeedDescription: string = 'Speed (mph)';
  @Prop() currentTime;
  @Prop() currentTimeMeridiem;
  @Prop() powerAssistActive: boolean = false;
  @Prop() isTraining: boolean = false;
  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop() isSettingsLayoutEnabled = false;
  @Prop() isChangeSettingsLayoutEnabled = false;
  @Prop() changeSettingKeyString = '';
  @Prop() changeSettingKeyValue;

  /**
   * Boolean to track the error history swipe layout visibility.
   */
  @Prop() isErrorHistoryLayoutEnabled = false;

  /**
   *
   * SmartDrive Related Data
   *
   */
  lastTapTime: number;
  lastAccelZ: number = null;
  tapLockoutTimeMs: number = 200;
  maxTapSensitivity: number = 3.5;
  minTapSensitivity: number = 1.5;
  SENSOR_DELAY_US: number = 25 * 1000;
  MAX_REPORTING_INTERVAL_US: number = 50 * 1000;
  minRangeFactor: number = 2.0 / 100.0; // never estimate less than 2 mi per full charge
  maxRangeFactor: number = 12.0 / 100.0; // never estimate more than 12 mi per full charge

  /**
   * State tracking for power assist
   */
  @Prop() powerAssistState: PowerAssist.State = PowerAssist.State.Inactive;

  /**
   * Boolean to track if the SmartDrive motor is on.
   */
  @Prop() public motorOn = false;

  /**
   * Boolean to track if the user has tapped (for indication).
   */
  @Prop() public hasTapped = false;

  /**
   * Data to bind to the Battery Usage Chart repeater.
   */
  @Prop() public batteryChartData;
  /**
   * Used to indicate the highest value in the battery chart.
   */
  @Prop() batteryChartMaxValue: string;
  /**
   * Data to bind to the Distance Chart repeater.
   */
  @Prop() public distanceChartData;
  /**
   * Used to indicate the highest value in the distance chart.
   */
  @Prop() distanceChartMaxValue: string;
  /**
   * Units of distance for the distance chart.
   */
  @Prop() distanceUnits: string = 'mi';

  /**
   * Data to bind to the Error History repeater
   */
  @Prop() public errorHistoryData;

  /**
   * State Management for Sensor Monitoring / Data Collection
   */
  private _isListeningDeviceSensors = false;
  private watchBeingWorn = false;

  /**
   * SmartDrive Data / state management
   */
  private settings = new SmartDrive.Settings();
  private tempSettings = new SmartDrive.Settings();
  private _smartDrive: SmartDrive;
  private _savedSmartDriveAddress: string = null;
  private _ringTimerId = null;
  private RING_TIMER_INTERVAL_MS = 500;
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;
  private DATABASE_SAVE_INTERVAL_MS = 10 * 1000;
  private _lastChartDay = null;

  /**
   * User interaction objects
   */
  private pager: Pager;
  private powerAssistRing: AnimatedCircle;
  private tapRing: AnimatedCircle;
  private watchBatteryRing: AnimatedCircle;
  private smartDriveBatteryRing: AnimatedCircle;
  private _settingsLayout: SwipeDismissLayout;
  public _changeSettingsLayout: SwipeDismissLayout;
  private _errorHistoryLayout: SwipeDismissLayout;
  private _vibrator: Vibrate = new Vibrate();
  private _sentryService: SentryService;
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;
  private _sqliteService: SqliteService;

  private _throttledSmartDriveSaveFn: any = null;
  private _onceSendSmartDriveSettings: any = null;

  constructor() {
    super();

    // handle ambient mode callbacks
    application.on('enterAmbient', args => {
      Log.D('*** enterAmbient ***');
      themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');

      if (this.pager) {
        const children = this.pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i);
          child._onCssStateChange();
        }
      }
    });

    // handle ambient mode callbacks
    application.on('exitAmbient', args => {
      Log.D('*** exitAmbient ***');
      themes.applyThemeCss(defaultTheme, 'theme-default.scss');

      if (this.pager) {
        const children = this.pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i) as View;
          child._onCssStateChange();
        }
      }
    });

    // handle ambient mode callbacks
    application.on('updateAmbient', args => {
      Log.D('updateAmbient', args.data, currentSystemTime());
    });

    // handle application lifecycle events
    this.registerAppEventHandlers();

    console.time('Sentry_Init');
    // init sentry - DNS key for permobil-wear Sentry project
    Sentry.init(
      'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
    );
    console.timeEnd('Sentry_Init');

    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this._sentryService = injector.get(SentryService);
    this._bluetoothService = injector.get(BluetoothService);
    this._sensorService = injector.get(SensorService);
    this._sqliteService = injector.get(SqliteService);

    console.time('SQLite_Init');
    // create / load tables for smartdrive data
    this._sqliteService
      .makeTable(
        SmartDriveData.Info.TableName,
        SmartDriveData.Info.IdName,
        SmartDriveData.Info.Fields
      )
      .catch(err => {
        Log.E(`Couldn't make SmartDriveData.Info table:`, err);
      });
    this._sqliteService
      .makeTable(
        SmartDriveData.Errors.TableName,
        SmartDriveData.Errors.IdName,
        SmartDriveData.Errors.Fields
      )
      .catch(err => {
        Log.E(`Couldn't make SmartDriveData.Errors table:`, err);
      });
    console.timeEnd('SQLite_Init');

    // make throttled save function - not called more than once every 10 seconds
    this._throttledSmartDriveSaveFn = throttle(
      this.saveUsageInfoToDatabase,
      this.DATABASE_SAVE_INTERVAL_MS,
      { leading: true, trailing: false }
    );

    // register for watch battery updates
    const batteryReceiverCallback = (
      androidContext: android.content.Context,
      intent: android.content.Intent
    ) => {
      // get the info from the event
      const level = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_LEVEL,
        -1
      );
      const scale = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_SCALE,
        -1
      );
      const plugged = intent.getIntExtra(
        android.os.BatteryManager.EXTRA_PLUGGED,
        -1
      );
      const percent = (level / scale) * 100.0;
      // update the battery display
      this.watchCurrentBatteryPercentage = percent;
      // are we charging
      this.watchIsCharging =
        plugged === android.os.BatteryManager.BATTERY_PLUGGED_AC ||
        plugged === android.os.BatteryManager.BATTERY_PLUGGED_USB ||
        plugged === android.os.BatteryManager.BATTERY_PLUGGED_WIRELESS;
      // do work that we need while charging
      setTimeout(this.doWhileCharged.bind(this), this.CHARGING_WORK_PERIOD_MS);
    };

    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_BATTERY_CHANGED,
      batteryReceiverCallback
    );

    // monitor the clock / system time for display and logging:
    this.currentTime = currentSystemTime();
    this.currentTimeMeridiem = currentSystemTimeMeridiem();
    const timeReceiverCallback = (androidContext, intent) => {
      Log.D('timeReceiverCallback', currentSystemTime());
      this.currentTime = currentSystemTime();
      this.currentTimeMeridiem = currentSystemTimeMeridiem();
      // update charts if date has changed
      if (!isSameDay(new Date(), this._lastChartDay)) {
        this.updateChartData();
      }
    };
    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIME_TICK,
      timeReceiverCallback
    );
    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIMEZONE_CHANGED,
      timeReceiverCallback
    );

    // Now set up the sensor service:
    // this._sensorService.on(
    //   SensorService.AccuracyChanged,
    //   (args: AccuracyChangedEventData) => {
    //     const sensor = args.data.sensor;
    //     const accuracy = args.data.accuracy;
    //     if (sensor.getType() === android.hardware.Sensor.TYPE_HEART_RATE) {
    //       this.heartRateAccuracy = accuracy;
    //       // save the heart rate
    //       appSettings.setNumber(
    //         DataKeys.HEART_RATE,
    //         parseInt(this.heartRate, 10)
    //       );
    //     }
    //   }
    // );

    this._sensorService.on(
      SensorService.SensorChanged,
      (args: SensorChangedEventData) => {
        // if we're using litedata for android sensor plugin option
        // the data structure is simplified to reduce redundant data
        const parsedData = args.data;

        if (
          parsedData.s ===
          android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT
        ) {
          this.watchBeingWorn = (parsedData.d as any).state !== 0.0;
          // Log.D('WatchBeingWorn: ' + this.watchBeingWorn);
          if (!this.watchBeingWorn && this.powerAssistActive) {
            // disable power assist if the watch is taken off!
            this.disablePowerAssist();
          }
        }

        if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
          this.handleAccel(parsedData.d, parsedData.ts);
        }
      }
    );
    // now enable the sensors
    this.enableDeviceSensors();

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = appSettings.getString(DataKeys.SD_SAVED_ADDRESS);
    if (savedSDAddr && savedSDAddr.length) {
      this._savedSmartDriveAddress = savedSDAddr;
    }

    // load settings from memory
    this.loadSettings();
    this.updateSettingsDisplay();

    Log.D(
      'Device Info: ---',
      'Manufacturer: ' + device.manufacturer,
      'Model: ' + device.model,
      'OS: ' + device.os,
      'OS Version: ' + device.osVersion,
      'SDK Version: ' + device.sdkVersion,
      'Region: ' + device.region,
      'Device Language: ' + device.language,
      'UUID: ' + device.uuid
    );
  }

  /**
   * Application lifecycle event handlers
   */
  registerAppEventHandlers() {
    application.on(application.launchEvent, this.onAppLaunch.bind(this));
    application.on(application.resumeEvent, this.onAppResume.bind(this));
    application.on(application.suspendEvent, this.onAppSuspend.bind(this));
    application.on(application.exitEvent, this.onAppExit.bind(this));
    application.on(application.displayedEvent, this.onAppDisplayed.bind(this));
    application.on(application.lowMemoryEvent, this.onAppLowMemory.bind(this));
    application.on(
      application.uncaughtErrorEvent,
      this.onAppUncaughtError.bind(this)
    );
  }

  unregisterAppEventHandlers() {
    application.off(application.launchEvent, this.onAppLaunch.bind(this));
    application.off(application.resumeEvent, this.onAppResume.bind(this));
    application.off(application.suspendEvent, this.onAppSuspend.bind(this));
    application.off(application.exitEvent, this.onAppExit.bind(this));
    application.off(application.displayedEvent, this.onAppDisplayed.bind(this));
    application.off(application.lowMemoryEvent, this.onAppLowMemory.bind(this));
    application.off(
      application.uncaughtErrorEvent,
      this.onAppUncaughtError.bind(this)
    );
  }

  onAppLaunch(args?: any) {
    Log.D('App launch');
  }

  onAppResume(args?: any) {
    Log.D('App resume');
  }

  onAppSuspend(args?: any) {
    Log.D('App suspend');
    this.fullStop();
  }

  onAppExit(args?: any) {
    Log.D('App exit');
    this.fullStop();
  }

  onAppDisplayed(args?: any) {
    Log.D('App displayed');
  }

  onAppLowMemory(args?: any) {
    Log.D('App low memory', args);
    this.fullStop();
  }

  onAppUncaughtError(args?: any) {
    Log.D('App uncaught error');
    this.fullStop();
  }

  fullStop() {
    Log.D('Disabling power assist');
    this.disablePowerAssist();
  }

  doWhileCharged() {
    // TODO: send errors to kinvey here
    // TODO: send usage data to kinvey here
    if (this.watchIsCharging) {
      // re-schedule any work that may still need to be done
      setTimeout(this.doWhileCharged.bind(this), this.CHARGING_WORK_PERIOD_MS);
    }
  }

  onPagerLoaded(args: any) {
    const page = args.object as Page;
    this.pager = page.getViewById('pager') as Pager;
  }

  onPowerAssistCircleLoaded(args: any) {
    const page = args.object as Page;
    this.powerAssistRing = page.getViewById(
      'powerAssistCircle'
    ) as AnimatedCircle;
    (this.powerAssistRing as any).android.setOuterContourSize(0);
    (this.powerAssistRing as any).android.setInnerContourSize(0);
  }

  onTapCircleLoaded(args: any) {
    const page = args.object as Page;
    this.tapRing = page.getViewById('tapCircle') as AnimatedCircle;
    (this.tapRing as any).android.setOuterContourSize(0);
    (this.tapRing as any).android.setInnerContourSize(0);
  }

  onSmartDriveCircleLoaded(args: any) {
    const page = args.object as Page;
    this.smartDriveBatteryRing = page.getViewById(
      'smartDriveBatteryCircle'
    ) as AnimatedCircle;
    (this.smartDriveBatteryRing as any).android.setOuterContourSize(0);
    (this.smartDriveBatteryRing as any).android.setInnerContourSize(0);
  }

  onWatchCircleLoaded(args: any) {
    const page = args.object as Page;
    this.watchBatteryRing = page.getViewById(
      'watchBatteryCircle'
    ) as AnimatedCircle;
    (this.watchBatteryRing as any).android.setOuterContourSize(0);
    (this.watchBatteryRing as any).android.setInnerContourSize(0);
  }

  handleAccel(acceleration: any, timestamp: number) {
    // ignore tapping if we're not in the right mode
    if (!this.powerAssistActive && !this.isTraining) {
      return;
    }
    // ignore tapping if we're not on the users wrist
    if (!this.watchBeingWorn) {
      return;
    }
    // now get the z-axis acceleration
    let acc = acceleration.z;
    const diff = acc - this.lastAccelZ;
    this.lastAccelZ = acc;
    if (this.motorOn) {
      // respond to both axes for tapping if the motor is on
      acc = Math.abs(acc);
    }
    const threshold =
      this.maxTapSensitivity -
      (this.maxTapSensitivity - this.minTapSensitivity) *
        (this.settings.tapSensitivity / 100.0);
    // get time diff in ms - stamps are in ns
    const timeDiffMs = (timestamp - this.lastTapTime) / (1000 * 1000);
    // block high frequency tapping
    if (timeDiffMs < this.tapLockoutTimeMs) {
      return;
    }
    // must have a high enough abs(accel.z) and it must be a jerk
    // movement - high difference between previous accel and current
    // accel
    if (acc > threshold && diff > threshold) {
      // record that there has been a tap
      this.lastTapTime = timestamp;
      // user has met threshold for tapping
      this.handleTap(timestamp);
    }
  }

  handleTap(timestamp: number) {
    this.hasTapped = true;
    // timeout for updating the power assist ring
    setTimeout(() => {
      this.hasTapped = false;
    }, this.tapLockoutTimeMs / 2);
    // now send
    if (
      this.powerAssistActive &&
      this._smartDrive &&
      this._smartDrive.ableToSend
    ) {
      if (this.motorOn) {
        this._vibrator.cancel();
        this._vibrator.vibrate((this.tapLockoutTimeMs * 3) / 4);
      }
      this._smartDrive.sendTap().catch(err => Log.E('could not send tap', err));
    } else if (this.isTraining) {
      // vibrate for tapping while training
      this._vibrator.cancel();
      this._vibrator.vibrate((this.tapLockoutTimeMs * 3) / 4);
    }
  }

  stopSmartDrive() {
    // turn off the motor if SD is connected
    if (this._smartDrive && this._smartDrive.ableToSend) {
      return this._smartDrive
        .stopMotor()
        .catch(err => Log.E('Could not stop motor', err));
    } else {
      return Promise.resolve();
    }
  }

  activatePowerAssistTap() {
    this.togglePowerAssist();
  }

  disableDeviceSensors() {
    try {
      this._sensorService.stopDeviceSensors();
    } catch (err) {
      Log.E('Error disabling the device sensors:', err);
    }
    this._isListeningDeviceSensors = false;
    return;
  }

  enableDeviceSensors() {
    try {
      if (!this._isListeningDeviceSensors) {
        this._sensorService.startDeviceSensors(
          this.SENSOR_DELAY_US,
          this.MAX_REPORTING_INTERVAL_US
        );
        this._isListeningDeviceSensors = true;
      }
    } catch (err) {
      Log.E('Error starting the device sensors', err);
    }
  }

  onLedSettingsTap() {
    Log.D('LED Settings tapped.');
  }

  onUpdatesTap() {
    showSuccess('No updates available.', 4);
  }

  onTrainingTap() {
    keepAwake();
    this.isTraining = true;
    this.powerAssistState = PowerAssist.State.Training;
    this.updatePowerAssistRing();
    if (this.pager) this.pager.selectedIndex = 0;
  }

  onExitTrainingModeTap() {
    allowSleepAgain();
    this.isTraining = false;
    this.powerAssistState = PowerAssist.State.Inactive;
    this.updatePowerAssistRing();
  }

  /**
   * Setings page handlers
   */
  onSettingsLayoutLoaded(args) {
    this._settingsLayout = args.object as SwipeDismissLayout;
    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // Log.D('dismissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._settingsLayout, { x: 500, y: 0 });
      this.isSettingsLayoutEnabled = false;
    });
  }

  onErrorHistoryLayoutLoaded(args) {
    // show the chart
    this._errorHistoryLayout = args.object as SwipeDismissLayout;
    this._errorHistoryLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // Log.D('dismissedEvent', args.object);
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._errorHistoryLayout, { x: 500, y: 0 });
      this.isErrorHistoryLayoutEnabled = false;
    });
  }

  updateChartData() {
    // Log.D('Updating Chart Data / Display');
    return this.getUsageInfoFromDatabase(7)
      .then(sdData => {
        // we've asked for one more day than needed so that we can
        // compute distance differences
        const oldest = sdData[0];
        const newest = last(sdData);
        let sumDistance = 0;
        // keep track of the most recent day so we know when to update
        this._lastChartDay = new Date(newest.date);
        // remove the oldest so it's not displayed - we only use it
        // to track distance differences
        sdData = sdData.slice(1);
        // update battery data
        const maxBattery = sdData.reduce((max, obj) => {
          return obj.battery > max ? obj.battery : max;
        }, 0);
        const batteryData = sdData.map(e => {
          return {
            day: format(new Date(e.date), 'dd'),
            value: (e.battery * 100.0) / maxBattery
          };
        });
        // Log.D('Highest Battery Value:', maxBattery);
        this.batteryChartMaxValue = maxBattery;
        this.batteryChartData = batteryData;

        // update distance data
        let oldestDist = oldest[SmartDriveData.Info.DriveDistanceName];
        const distanceData = sdData.map(e => {
          const dist = e[SmartDriveData.Info.DriveDistanceName];
          let diff = 0;
          // make sure we only compute diffs between valid distances
          if (oldestDist > 0) {
            diff = dist - oldestDist;
            // used for range computation
            sumDistance += diff;
          }
          oldestDist = Math.max(dist, oldestDist);
          diff = SmartDrive.motorTicksToMiles(diff);
          if (this.settings.units === 'Metric') {
            diff = diff * 1.609;
          }
          return {
            day: format(new Date(e.date), 'dd'),
            value: diff.toFixed(1)
          };
        });
        const maxDist = distanceData.reduce((max, obj) => {
          return obj.value > max ? obj.value : max;
        }, 0);
        distanceData.map(data => {
          data.value = (100.0 * data.value) / maxDist;
        });
        // Log.D('Highest Distance Value:', maxDist);
        this.distanceChartMaxValue = maxDist;
        this.distanceChartData = distanceData;

        // update estimated range based on battery / distance
        let rangeFactor = (this.minRangeFactor + this.maxRangeFactor) / 2.0;
        const totalBatteryUsage = sdData.reduce((usage, obj) => {
          return usage + obj[SmartDriveData.Info.BatteryName];
        }, 0);
        if (sumDistance && totalBatteryUsage) {
          // convert from ticks to miles
          sumDistance = SmartDrive.motorTicksToMiles(sumDistance);
          // now compute the range factor
          rangeFactor = clamp(
            sumDistance / totalBatteryUsage,
            this.minRangeFactor,
            this.maxRangeFactor
          );
        }
        // estimated distance is always in miles
        this.estimatedDistance =
          this.smartDriveCurrentBatteryPercentage * rangeFactor;
        // now actually update the display of the distance
        this.updateSpeedDisplay();
      })
      .catch(err => {});
  }

  onBatteryChartRepeaterLoaded(args) {
    const rpter = args.object as Repeater;
    // get distance data from db here then handle the data binding and
    // calculating the Max Value for the chart and some sizing checks
  }

  onDistanceChartRepeaterLoaded(args) {
    const rpter = args.object as Repeater;
    // get distance data from db here then handle the data binding and
    // calculating the Max Value for the chart and some sizing checks
  }

  showErrorHistory() {
    // load the error data
    this.getRecentErrors(10);
    showOffScreenLayout(this._errorHistoryLayout);
    this.isErrorHistoryLayoutEnabled = true;
  }

  onSettingsTap() {
    showOffScreenLayout(this._settingsLayout);
    this.isSettingsLayoutEnabled = true;
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settings);
    const tappedId = args.object.id as string;
    switch (tappedId.toLowerCase()) {
      case 'maxspeed':
        this.changeSettingKeyString = 'Max Speed';
        break;
      case 'acceleration':
        this.changeSettingKeyString = 'Acceleration';
        break;
      case 'tapsensitivity':
        this.changeSettingKeyString = 'Tap Sensitivity';
        break;
      case 'controlmode':
        this.changeSettingKeyString = 'Control Mode';
        break;
      case 'units':
        this.changeSettingKeyString = 'Units';
        break;
      default:
        break;
    }
    this.updateSettingsChangeDisplay();
    if (args.object.id) {
    }

    showOffScreenLayout(this._changeSettingsLayout);
    this.isChangeSettingsLayoutEnabled = true;
  }

  updateSettingsChangeDisplay() {
    switch (this.changeSettingKeyString) {
      case 'Max Speed':
        this.changeSettingKeyValue = `${this.tempSettings.maxSpeed}%`;
        break;
      case 'Acceleration':
        this.changeSettingKeyValue = `${this.tempSettings.acceleration}%`;
        break;
      case 'Tap Sensitivity':
        this.changeSettingKeyValue = `${this.tempSettings.tapSensitivity}%`;
        break;
      case 'Control Mode':
        this.changeSettingKeyValue = `${this.tempSettings.controlMode}`;
        return;
      case 'Units':
        this.changeSettingKeyValue = `${this.tempSettings.units}`;
        return;
      default:
        break;
    }
  }

  onCancelChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    this.isChangeSettingsLayoutEnabled = false;
  }

  updateSettingsDisplay() {
    this.updateSpeedDisplay();
    this.updateChartData();
  }

  updateSpeedDisplay() {
    if (this.settings.units === 'English') {
      // update distance units
      this.distanceUnits = 'mi';
      // update speed display
      this.currentSpeedDisplay = this.currentSpeed.toFixed(1);
      this.currentSpeedDescription = 'Speed (mph)';
      // update estimated range display
      this.estimatedDistanceDisplay = this.estimatedDistance.toFixed(1);
      this.estimatedDistanceDescription = 'Estimated Range (mi)';
    } else {
      // update distance units
      this.distanceUnits = 'km';
      // update speed display
      this.currentSpeedDisplay = (this.currentSpeed * 1.609).toFixed(1);
      this.currentSpeedDescription = 'Speed (kph)';
      // update estimated range display
      this.estimatedDistanceDisplay = (this.estimatedDistance * 1.609).toFixed(
        1
      );
      this.estimatedDistanceDescription = 'Estimated Range (km)';
    }
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, {
      x: 500,
      y: 0
    });
    this.isChangeSettingsLayoutEnabled = false;
    // SAVE THE VALUE to local data for the setting user has selected
    this.settings.copy(this.tempSettings);
    this.saveSettings();
    // now update any display that needs settings:
    this.updateSettingsDisplay();
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap(args) {
    this.tempSettings.decrease(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this._changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button without starting the swipe behavior
    (this._changeSettingsLayout as any).swipeable = false;
    // this._changeSettingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
    //   // hide the offscreen layout when dismissed
    //   hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    //   this.isChangeSettingsLayoutEnabled = false;
    // });
  }

  /**
   * Smart Drive Interaction and Data Management
   */

  loadSettings() {
    this.settings.maxSpeed = appSettings.getNumber(DataKeys.SD_MAX_SPEED) || 70;
    this.settings.acceleration =
      appSettings.getNumber(DataKeys.SD_ACCELERATION) || 30;
    this.settings.tapSensitivity =
      appSettings.getNumber(DataKeys.SD_TAP_SENSITIVITY) || 100;
    this.settings.controlMode =
      appSettings.getString(DataKeys.SD_CONTROL_MODE) || 'MX2+';
    this.settings.units = appSettings.getString(DataKeys.SD_UNITS) || 'English';
  }

  saveSettings() {
    appSettings.setNumber(DataKeys.SD_MAX_SPEED, this.settings.maxSpeed);
    appSettings.setNumber(DataKeys.SD_ACCELERATION, this.settings.acceleration);
    appSettings.setNumber(
      DataKeys.SD_TAP_SENSITIVITY,
      this.settings.tapSensitivity
    );
    appSettings.setString(DataKeys.SD_CONTROL_MODE, this.settings.controlMode);
    appSettings.setString(DataKeys.SD_UNITS, this.settings.units);
  }

  updatePowerAssistRing(color?: any) {
    if (color) {
      this.powerAssistRingColor = color;
    } else {
      switch (this.powerAssistState) {
        case PowerAssist.State.Connected:
          this.powerAssistRingColor = PowerAssist.ConnectedRingColor;
          break;
        case PowerAssist.State.Disconnected:
          this.powerAssistRingColor = PowerAssist.DisconnectedRingColor;
          break;
        case PowerAssist.State.Inactive:
          this.powerAssistRingColor = PowerAssist.InactiveRingColor;
          break;
        case PowerAssist.State.Training:
          this.powerAssistRingColor = PowerAssist.TrainingRingColor;
          break;
      }
    }
  }

  blinkPowerAssistRing() {
    if (this.powerAssistActive) {
      if (this.motorOn) {
        this.updatePowerAssistRing(PowerAssist.ConnectedRingColor);
      } else {
        if (this.powerAssistRingColor === PowerAssist.InactiveRingColor) {
          if (this._smartDrive.ableToSend) {
            this.updatePowerAssistRing(PowerAssist.ConnectedRingColor);
          } else {
            this.updatePowerAssistRing(PowerAssist.DisconnectedRingColor);
          }
        } else {
          this.updatePowerAssistRing(PowerAssist.InactiveRingColor);
        }
      }
    }
  }

  enablePowerAssist() {
    // only enable power assist if we're on the user's wrist
    if (!this.watchBeingWorn) {
      showFailure('You must wear the watch to activate power assist.');
      return;
    }
    keepAwake();
    this.powerAssistState = PowerAssist.State.Disconnected;
    this.powerAssistActive = true;
    this.updatePowerAssistRing();
    return this.connectToSavedSmartDrive()
      .then(didConnect => {
        if (didConnect) {
          this._ringTimerId = setInterval(
            this.blinkPowerAssistRing.bind(this),
            this.RING_TIMER_INTERVAL_MS
          );
        } else {
          allowSleepAgain();
          this.powerAssistState = PowerAssist.State.Inactive;
          this.powerAssistActive = false;
          this.updatePowerAssistRing();
        }
      })
      .catch(err => {
        allowSleepAgain();
        this.powerAssistState = PowerAssist.State.Inactive;
        this.powerAssistActive = false;
        this.updatePowerAssistRing();
      });
  }

  disablePowerAssist() {
    allowSleepAgain();
    this.powerAssistState = PowerAssist.State.Inactive;
    this.powerAssistActive = false;
    this.motorOn = false;
    if (this._ringTimerId) {
      clearInterval(this._ringTimerId);
    }
    this.updatePowerAssistRing();
    // turn off the smartdrive
    return this.stopSmartDrive()
      .then(() => {
        return this.disconnectFromSmartDrive();
      })
      .catch(err => {
        return this.disconnectFromSmartDrive();
      });
  }

  togglePowerAssist() {
    if (this.powerAssistActive) {
      this.disablePowerAssist();
    } else {
      this.enablePowerAssist();
    }
  }

  saveNewSmartDrive(): Promise<any> {
    new Toasty(
      'Scanning for SmartDrives...',
      ToastDuration.LONG,
      ToastPosition.CENTER
    ).show();

    // scan for smartdrives
    return this._bluetoothService
      .scanForSmartDrives(3)
      .then(() => {
        Log.D(`Discovered ${BluetoothService.SmartDrives.length} SmartDrives`);

        // make sure we have smartdrives
        if (BluetoothService.SmartDrives.length <= 0) {
          showFailure('No SmartDrives found nearby.');
          return false;
        }

        // these are the smartdrives that are pushed into an array on the bluetooth service
        const sds = BluetoothService.SmartDrives;

        // map the smart drives to get all of the addresses
        const addresses = sds.map(sd => `${sd.address}`);

        // present action dialog to select which smartdrive to connect to
        return action({
          title: '',
          message: 'Select SmartDrive:',
          actions: addresses,
          cancelButtonText: 'Dismiss'
        }).then(result => {
          // if user selected one of the smartdrives in the action dialog, attempt to connect to it
          if (addresses.indexOf(result) > -1) {
            // save the smartdrive here
            this._savedSmartDriveAddress = result;
            appSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);

            // showSuccess(`Paired to SmartDrive ${result}`);
            return true;
          } else {
            return false;
          }
        });
      })
      .catch(error => {
        Log.E('could not scan', error);
        return false;
      });
  }

  connectToSmartDrive(smartDrive) {
    if (!smartDrive) return;
    this._smartDrive = smartDrive;

    new Toasty(
      'Connecting to ' + this._savedSmartDriveAddress,
      ToastDuration.SHORT,
      ToastPosition.CENTER
    ).show();

    // need to make sure we unregister disconnect event since it may have been registered
    this._smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    // set the event listeners for mcu_version_event and smartdrive_distance_event
    this._smartDrive.on(
      SmartDrive.smartdrive_connect_event,
      this.onSmartDriveConnect,
      this
    );
    this._smartDrive.on(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    this._smartDrive.on(
      SmartDrive.smartdrive_mcu_version_event,
      this.onSmartDriveVersion,
      this
    );
    this._smartDrive.on(
      SmartDrive.smartdrive_distance_event,
      this.onDistance,
      this
    );
    this._smartDrive.on(
      SmartDrive.smartdrive_motor_info_event,
      this.onMotorInfo,
      this
    );
    this._smartDrive.on(
      SmartDrive.smartdrive_error_event,
      this.onSmartDriveError,
      this
    );

    // now connect to smart drive
    return this._smartDrive
      .connect()
      .then(() => {
        return true;
      })
      .catch(err => {
        showFailure('Could not connect to ' + smartDrive.address);
        return false;
      });
  }

  connectToSavedSmartDrive(): Promise<any> {
    if (
      this._savedSmartDriveAddress === null ||
      this._savedSmartDriveAddress.length === 0
    ) {
      return this.saveNewSmartDrive().then(didSave => {
        if (didSave) {
          return this.connectToSavedSmartDrive();
        }
        return false;
      });
    }

    // try to connect to the SmartDrive
    const sd = BluetoothService.SmartDrives.filter(
      sd => sd.address === this._savedSmartDriveAddress
    )[0];
    if (sd) {
      return this.connectToSmartDrive(sd);
    } else {
      const sd = this._bluetoothService.getOrMakeSmartDrive({
        address: this._savedSmartDriveAddress
      });
      return this.connectToSmartDrive(sd);
    }
  }

  async disconnectFromSmartDrive() {
    if (this._smartDrive && this._smartDrive.connected) {
      this._smartDrive.off(
        SmartDrive.smartdrive_connect_event,
        this.onSmartDriveConnect,
        this
      );
      this._smartDrive.off(
        SmartDrive.smartdrive_mcu_version_event,
        this.onSmartDriveVersion,
        this
      );
      this._smartDrive.off(
        SmartDrive.smartdrive_distance_event,
        this.onDistance,
        this
      );
      this._smartDrive.off(
        SmartDrive.smartdrive_motor_info_event,
        this.onMotorInfo,
        this
      );
      this._smartDrive.off(
        SmartDrive.smartdrive_error_event,
        this.onSmartDriveError,
        this
      );
      this._smartDrive.disconnect().then(() => {
        this.motorOn = false;
        this.powerAssistActive = false;
      });
    }
  }

  retrySmartDriveConnection() {
    if (
      this.powerAssistActive &&
      this._smartDrive &&
      !this._smartDrive.connected
    ) {
      setTimeout(() => {
        this.connectToSavedSmartDrive();
      }, 5 * 1000);
    }
  }

  sendSmartDriveSettings() {
    // send the current settings to the SD
    return this._smartDrive.sendSettingsObject(this.settings).catch(err => {
      // make sure we retry this while we're connected
      this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
      // indicate failure
      Log.E('send settings failed', err);
      new Toasty(
        'Failed to send settings to ' +
          this._savedSmartDriveAddress +
          ' ' +
          err,
        ToastDuration.SHORT,
        ToastPosition.CENTER
      ).show();
    });
  }

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  async onSmartDriveConnect(args: any) {
    this.powerAssistState = PowerAssist.State.Connected;
    this.updatePowerAssistRing();
    new Toasty(
      'Connected to ' + this._savedSmartDriveAddress,
      ToastDuration.SHORT,
      ToastPosition.CENTER
    ).show();
    this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
  }

  async onSmartDriveDisconnect(args: any) {
    this.motorOn = false;
    if (this.powerAssistActive) {
      this.powerAssistState = PowerAssist.State.Disconnected;
      this.updatePowerAssistRing();
      this.retrySmartDriveConnection();
    }
    this._smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    new Toasty(`Disconnected from ${this._smartDrive.address}`)
      .setToastPosition(ToastPosition.CENTER)
      .show();
  }

  async onSmartDriveError(args: any) {
    // Log.D('onSmartDriveError event');
    const errorType = args.data.errorType;
    const errorId = args.data.errorId;
    // save the error into the database
    this.saveErrorToDatabase(errorType, errorId);
  }

  async onMotorInfo(args: any) {
    // send current settings to SD
    this._onceSendSmartDriveSettings();
    // Log.D('onMotorInfo event');
    const motorInfo = args.data.motorInfo;

    // update motor state
    if (this.motorOn !== this._smartDrive.driving) {
      if (this._smartDrive.driving) {
        this._vibrator.cancel();
        this._vibrator.vibrate(250); // vibrate for 250 ms
      } else {
        this._vibrator.cancel();
        this._vibrator.vibrate([0, 250, 50, 250]); // vibrate twice
      }
    }
    this.motorOn = this._smartDrive.driving;
    // determine if we've used more battery percentage
    const batteryChange =
      this.smartDriveCurrentBatteryPercentage - this._smartDrive.battery;
    // only check against 1 so that we filter out charging and only
    // get decreases due to driving / while connected
    if (batteryChange === 1) {
      // cancel previous invocations of the save so that the next
      // one definitely saves the battery increment
      this._throttledSmartDriveSaveFn.flush();
      // save to the database
      this._throttledSmartDriveSaveFn({
        battery: 1
      });
    }
    // update battery percentage
    this.smartDriveCurrentBatteryPercentage = this._smartDrive.battery;
    // save the updated smartdrive battery
    appSettings.setNumber(DataKeys.SD_BATTERY, this._smartDrive.battery);
    // update speed display
    this.currentSpeed = motorInfo.speed;
    this.updateSpeedDisplay();
  }

  async onDistance(args: any) {
    // Log.D('onDistance event');
    const coastDistance = args.data.coastDistance;
    const driveDistance = args.data.driveDistance;

    // save to the database
    this._throttledSmartDriveSaveFn({
      driveDistance: this._smartDrive.driveDistance,
      coastDistance: this._smartDrive.coastDistance
    });

    // save the updated distance
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_CASE,
      this._smartDrive.coastDistance
    );
    appSettings.setNumber(
      DataKeys.SD_DISTANCE_DRIVE,
      this._smartDrive.driveDistance
    );
  }

  async onSmartDriveVersion(args: any) {
    // Log.D('onSmartDriveVersion event');
    const mcuVersion = args.data.mcu;

    // save the updated SmartDrive version info
    appSettings.setNumber(
      DataKeys.SD_VERSION_MCU,
      this._smartDrive.mcu_version
    );
    appSettings.setNumber(
      DataKeys.SD_VERSION_BLE,
      this._smartDrive.ble_version
    );
  }

  /*
   * DATABASE FUNCTIONS
   */
  saveErrorToDatabase(errorCode: number, errorId: number) {
    // get the most recent error
    this._sqliteService
      .getLast(SmartDriveData.Errors.TableName, SmartDriveData.Errors.IdName)
      .then(obj => {
        // Log.D('From DB: ', obj);
        const lastId = obj && obj[0];
        const lastTimestamp = obj && obj[1];
        const lastErrorCode = obj && obj[2];
        const lastErrorId = obj && obj[3];
        // make sure this isn't an error we've seen before
        if (errorId !== lastErrorId) {
          // now save the error into the table
          return this._sqliteService
            .insertIntoTable(
              SmartDriveData.Errors.TableName,
              SmartDriveData.Errors.newError(errorCode, errorId)
            )
            .catch(err => {
              new Toasty(
                `Failed Saving SmartDrive Error: ${err}`,
                ToastDuration.LONG
              )
                .setToastPosition(ToastPosition.CENTER)
                .show();
            });
        }
      })
      .catch(err => {
        new Toasty(
          `Failed getting SmartDrive Error: ${err}`,
          ToastDuration.LONG
        )
          .setToastPosition(ToastPosition.CENTER)
          .show();
      });
  }

  getRecentErrors(numErrors: number) {
    return this._sqliteService
      .getAll({
        tableName: SmartDriveData.Errors.TableName,
        orderBy: SmartDriveData.Errors.IdName,
        ascending: false,
        limit: numErrors
      })
      .then(rows => {
        this.errorHistoryData = rows.map(obj => {
          return {
            time: format(new Date(obj && +obj[1]), 'YYYY-MM-DD HH:mm'),
            code: obj && obj[2]
          };
        });
      })
      .catch(err => {
        Log.E(`couldn't get errors`, err);
        return [];
      });
  }

  saveUsageInfoToDatabase(args: {
    driveDistance?: number;
    coastDistance?: number;
    battery?: number;
  }) {
    const driveDistance = args.driveDistance || 0;
    const coastDistance = args.coastDistance || 0;
    const battery = args.battery || 0;
    if (driveDistance === 0 && coastDistance === 0 && battery === 0) {
      return Promise.reject(
        'Must provide at least one valid usage data point!'
      );
    }
    return this.getRecentInfoFromDatabase(1)
      .then(infos => {
        // Log.D('recent infos', infos);
        if (!infos || !infos.length) {
          // record the data if we have it
          if (driveDistance > 0 && coastDistance > 0) {
            // make the first entry for computing distance differences
            const firstEntry = SmartDriveData.Info.newInfo(
              undefined,
              subDays(new Date(), 1),
              0,
              driveDistance,
              coastDistance
            );
            return this._sqliteService.insertIntoTable(
              SmartDriveData.Info.TableName,
              firstEntry
            );
          }
        }
      })
      .then(() => {
        return this.getTodaysUsageInfoFromDatabase();
      })
      .then(u => {
        console.log('Got usage:', u);
        if (u[SmartDriveData.Info.IdName]) {
          // there was a record, so we need to update it. we add the
          // already used battery plus the amount of new battery
          // that has been used
          const updatedBattery = battery + u[SmartDriveData.Info.BatteryName];
          const updatedDriveDistance =
            driveDistance || u[SmartDriveData.Info.DriveDistanceName];
          const updatedCoastDistance =
            coastDistance || u[SmartDriveData.Info.CoastDistanceName];
          return this._sqliteService.updateInTable(
            SmartDriveData.Info.TableName,
            {
              [SmartDriveData.Info.BatteryName]: updatedBattery,
              [SmartDriveData.Info.DriveDistanceName]: updatedDriveDistance,
              [SmartDriveData.Info.CoastDistanceName]: updatedCoastDistance
            },
            {
              [SmartDriveData.Info.IdName]: u.id
            }
          );
        } else {
          // this is the first record, so we create it
          return this._sqliteService.insertIntoTable(
            SmartDriveData.Info.TableName,
            SmartDriveData.Info.newInfo(
              undefined,
              new Date(),
              battery,
              driveDistance,
              coastDistance
            )
          );
        }
      })
      .then(() => {
        return this.updateChartData();
      })
      .catch(err => {
        Log.E('Failed saving usage:', err);
        new Toasty(`Failed saving usage: ${err}`, ToastDuration.LONG)
          .setToastPosition(ToastPosition.CENTER)
          .show();
      });
  }

  getTodaysUsageInfoFromDatabase() {
    return this._sqliteService
      .getLast(SmartDriveData.Info.TableName, SmartDriveData.Info.IdName)
      .then(e => {
        const id = e && e[0];
        const date = new Date((e && e[1]) || null);
        const battery = e && e[2];
        const drive = e && e[3];
        const coast = e && e[4];
        if (isToday(date)) {
          return SmartDriveData.Info.newInfo(id, date, battery, drive, coast);
        } else {
          return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
        }
      })
      .catch(err => {
        // nothing was found
        return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
      });
  }

  getUsageInfoFromDatabase(numDays: number) {
    const dates = SmartDriveData.Info.getPastDates(numDays);
    const usageInfo = dates.map(d => {
      return SmartDriveData.Info.newInfo(null, d, 0, 0, 0);
    });
    // console.log('usage info', usageInfo);
    return this.getRecentInfoFromDatabase(6)
      .then(objs => {
        objs.map(o => {
          // @ts-ignore
          const obj = SmartDriveData.Info.newInfo(...o);
          const objDate = new Date(obj.date);
          const index = closestIndexTo(objDate, dates);
          const usageDate = dates[index];
          // Log.D('recent info:', o);
          if (index > -1 && isSameDay(objDate, usageDate)) {
            usageInfo[index] = obj;
          }
        });
        return usageInfo;
      })
      .catch(err => {
        console.log('error getting rececnt info:', err);
        return usageInfo;
      });
  }

  getRecentInfoFromDatabase(numRecentEntries: number) {
    return this._sqliteService.getAll({
      tableName: SmartDriveData.Info.TableName,
      orderBy: SmartDriveData.Info.DateName,
      ascending: false,
      limit: numRecentEntries
    });
  }
}
