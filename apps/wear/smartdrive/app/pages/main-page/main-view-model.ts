import { Log } from '@permobil/core';
import { getDefaultLang, L, Prop } from '@permobil/nativescript';
import { closestIndexTo, format, isSameDay, isToday, subDays } from 'date-fns';
import { ReflectiveInjector } from 'injection-js';
import clamp from 'lodash/clamp';
import differenceBy from 'lodash/differenceBy';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import once from 'lodash/once';
import throttle from 'lodash/throttle';
import { AnimatedCircle } from 'nativescript-animated-circle';
import { allowSleepAgain, keepAwake } from 'nativescript-insomnia';
import * as LS from 'nativescript-localstorage';
import { Pager } from 'nativescript-pager';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Level, Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { Vibrate } from 'nativescript-vibrate';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import { showSuccess } from 'nativescript-wear-os/packages/dialogs';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { EventData, fromObject, Observable } from 'tns-core-modules/data/observable';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { screen } from 'tns-core-modules/platform';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { ItemEventData } from 'tns-core-modules/ui/list-view';
import { Page, View } from 'tns-core-modules/ui/page';
import { ScrollView } from 'tns-core-modules/ui/scroll-view';
import { ad } from 'tns-core-modules/utils/utils';
import { DataKeys } from '../../enums';
import { SmartDrive, TapDetector } from '../../models';
import { PowerAssist, SmartDriveData } from '../../namespaces';
import { BluetoothService, KinveyService, NetworkService, SensorChangedEventData, SensorService, SERVICES, SqliteService } from '../../services';
import { hideOffScreenLayout, showOffScreenLayout } from '../../utils';

const ambientTheme = require('../../scss/theme-ambient.scss').toString();
const defaultTheme = require('../../scss/theme-default.scss').toString();
const retroTheme = require('../../scss/theme-retro.scss').toString();

const dateLocales = {
  da: require('date-fns/locale/da'),
  de: require('date-fns/locale/de'),
  en: require('date-fns/locale/en'),
  es: require('date-fns/locale/es'),
  fr: require('date-fns/locale/fr'),
  it: require('date-fns/locale/it'),
  ja: require('date-fns/locale/ja'),
  ko: require('date-fns/locale/ko'),
  nb: require('date-fns/locale/nb'),
  nl: require('date-fns/locale/nl'),
  nn: require('date-fns/locale/nb'),
  zh: require('date-fns/locale/zh_cn')
};

export class MainViewModel extends Observable {
  // for managing the inset of the layouts ourselves
  @Prop() insetPadding: number = 0;
  // battery display
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;
  @Prop() watchCurrentBatteryPercentage: number = 0;
  @Prop() watchIsCharging: boolean = false;
  @Prop() powerAssistRingColor: Color = PowerAssist.InactiveRingColor;
  // smartdrive data display
  @Prop() displayRssi: boolean = false;
  @Prop() estimatedDistance: number = 0.0;
  @Prop() estimatedDistanceDisplay: string = '0.0';
  // 'Estimated Range (mi)';
  @Prop() estimatedDistanceDescription: string = L(
    'power-assist.estimated-range'
  );
  @Prop() currentSpeed: number = 0.0;
  @Prop() currentSpeedDisplay: string = '0.0';
  // Speed (mph)';
  @Prop() currentSpeedDescription: string = L('power-assist.speed');
  @Prop() currentSignalStrength: string = '--';
  // time display
  @Prop() displayTime: boolean = true;
  @Prop() currentTime: string = '';
  @Prop() currentTimeMeridiem: string = '';
  @Prop() currentDay: string = '';
  @Prop() currentYear: string = '';
  // state variables
  @Prop() isAmbient: boolean = false;
  @Prop() watchBeingWorn: boolean = false;
  @Prop() powerAssistActive: boolean = false;
  @Prop() hasTapped = false;
  @Prop() motorOn = false;
  @Prop() isTraining: boolean = false;
  @Prop() disableWearCheck: boolean = false;

  /**
   * Layout Management
   */
  private previousLayouts: string[] = [];
  private layouts = {
    about: false,
    changeSettings: false,
    errorHistory: false,
    main: true,
    scanning: false,
    settings: false,
    updates: false
  };
  @Prop() enabledLayout = fromObject(this.layouts);

  /**
   * SmartDrive Settings UI:
   */
  @Prop() scanningProgressText: string = L('settings.scanning');
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';
  @Prop() pairSmartDriveText: string = L('settings.pair-smartdrive');

  /**
   * SmartDrive Wireless Updates:
   */
  @Prop() updateProgressText: string = L('updates.checking-for-updates');
  @Prop() isUpdatingSmartDrive: boolean = false;
  @Prop() hasUpdateData: boolean = false;
  @Prop() checkingForUpdates: boolean = false;
  @Prop() smartDriveOtaProgress: number = 0;
  @Prop() smartDriveOtaState: string = null;
  @Prop() smartDriveOtaActions = new ObservableArray();

  /**
   *
   * SmartDrive Related Data
   *
   */
  tapDetector: TapDetector = null;
  tapTimeoutId: any = null;
  // Sensor listener config:
  SENSOR_DELAY_US: number = 40 * 1000;
  MAX_REPORTING_INTERVAL_US: number = 20 * 1000;
  // Estimated range min / max factors
  minRangeFactor: number = 2.0 / 100.0; // never estimate less than 2 mi per full charge
  maxRangeFactor: number = 12.0 / 100.0; // never estimate more than 12 mi per full charge
  // error related info
  lastErrorId: number = null;

  /**
   * State tracking for power assist
   */
  @Prop() powerAssistState: PowerAssist.State = PowerAssist.State.Inactive;

  /**
   * Data to bind to the Battery Usage Chart repeater.
   */
  @Prop() batteryChartData: any[];
  @Prop() batteryChartMaxValue: string;

  /**
   * Data to bind to the Distance Chart repeater.
   */
  @Prop() distanceChartData: any[];
  @Prop() distanceChartMaxValue: string;
  @Prop() distanceUnits: string = 'mi';

  /**
   * Data to bind to the Error History repeater
   */
  @Prop() errorHistoryData = new ObservableArray();

  /**
   * SmartDrive data display so we don't directly bind to the
   * SmartDrive itself (since it may be null)
   */
  @Prop() mcuVersion: string = '---';
  @Prop() bleVersion: string = '---';
  @Prop() sdSerialNumber: string = '---';
  @Prop() watchSerialNumber: string = '---';
  @Prop() appVersion: string = '---';
  @Prop() databaseId: string = KinveyService.api_app_key;

  /**
   * SmartDrive Data / state management
   */
  public smartDrive: SmartDrive;
  private settings = new SmartDrive.Settings();
  private tempSettings = new SmartDrive.Settings();
  private switchControlSettings = new SmartDrive.SwitchControlSettings();
  private tempSwitchControlSettings = new SmartDrive.SwitchControlSettings();
  private hasSentSettings: boolean = false;
  private _savedSmartDriveAddress: string = null;
  private _ringTimerId = null;
  private RING_TIMER_INTERVAL_MS = 500;
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;
  private DATABASE_SAVE_INTERVAL_MS = 10 * 1000;
  private _lastChartDay = null;

  /**
   * User interaction objects
   */
  private wakeLock: any = null;
  private pager: Pager;
  private settingsScrollView: ScrollView;
  private errorsScrollView: ScrollView;
  private aboutScrollView: ScrollView;
  private updateProgressCircle: AnimatedCircle;
  private scanningProgressCircle: AnimatedCircle;
  private _vibrator: Vibrate = new Vibrate();
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;
  private _sqliteService: SqliteService;
  private _networkService: NetworkService;
  private _kinveyService: KinveyService;
  private _throttledOtaAction: any = null;
  private _throttledSmartDriveSaveFn: any = null;
  private _onceSendSmartDriveSettings: any = null;

  /**
   * Layouts
   */
  private _settingsLayout: SwipeDismissLayout;
  private _changeSettingsLayout: SwipeDismissLayout;
  private _errorHistoryLayout: SwipeDismissLayout;
  private _aboutLayout: SwipeDismissLayout;
  private _updatesLayout: SwipeDismissLayout;
  private _scanningLayout: SwipeDismissLayout;

  // Used for doing work while charing
  private chargingWorkTimeoutId: any = null;

  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.READ_PHONE_STATE,
    android.Manifest.permission.ACCESS_COARSE_LOCATION
  ];

  get SmartDriveWakeLock() {
    if (this.wakeLock) {
      return this.wakeLock;
    } else {
      // initialize the wake lock here
      const powerManager = application.android.context.getSystemService(
        android.content.Context.POWER_SERVICE
      );
      this.wakeLock = powerManager.newWakeLock(
        android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK,
        'com.permobil.smartdrive.wearos::WakeLock'
      );
      return this.wakeLock;
    }
  }

  constructor() {
    super();
    // handle application lifecycle events
    this._sentryBreadCrumb('Registering app event handlers.');
    this.registerAppEventHandlers();
    this._sentryBreadCrumb('App event handlers registered.');
    // determine inset padding
    const androidConfig = ad
      .getApplicationContext()
      .getResources()
      .getConfiguration();
    const isCircleWatch = androidConfig.isScreenRound();
    const widthPixels = screen.mainScreen.widthPixels;
    if (isCircleWatch) {
      this.insetPadding = Math.round(0.146467 * widthPixels);
    }
  }

  customWOLInsetLoaded(args: EventData) {
    (args.object as any).nativeView.setPadding(
      this.insetPadding,
      this.insetPadding,
      this.insetPadding,
      0
    );
  }

  async init() {
    this._sentryBreadCrumb('Main-View-Model init.');

    this._sentryBreadCrumb('Main-View-Model constructor.');
    this._sentryBreadCrumb('Initializing WakeLock...');
    console.time('Init_SmartDriveWakeLock');
    this.wakeLock = this.SmartDriveWakeLock;
    console.timeEnd('Init_SmartDriveWakeLock');
    this._sentryBreadCrumb('WakeLock has been initialized.');

    this._sentryBreadCrumb('Initializing Sentry...');
    console.time('Sentry_Init');
    // init sentry - DNS key for permobil-wear Sentry project
    Sentry.init(
      'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
    );
    console.timeEnd('Sentry_Init');
    this._sentryBreadCrumb('Sentry has been initialized.');

    this._sentryBreadCrumb('Creating services...');
    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this._bluetoothService = injector.get(BluetoothService);
    this._sensorService = injector.get(SensorService);
    this._sqliteService = injector.get(SqliteService);
    this._networkService = injector.get(NetworkService);
    this._kinveyService = injector.get(KinveyService);
    this._sentryBreadCrumb('All Services created.');

    // initialize data storage for usage, errors, settings
    this.initSqliteTables();

    // load serial number from settings / memory
    const savedSerial = appSettings.getString(DataKeys.WATCH_SERIAL_NUMBER);
    if (savedSerial && savedSerial.length) {
      this.watchSerialNumber = savedSerial;
      this._kinveyService.watch_serial_number = this.watchSerialNumber;
    }
    const packageManager = application.android.context.getPackageManager();
    const packageInfo = packageManager.getPackageInfo(
      application.android.context.getPackageName(),
      0
    );
    const versionName = packageInfo.versionName;
    const versionCode = packageInfo.versionCode;
    this.appVersion = versionName;

    // make throttled save function - not called more than once every 10 seconds
    this._throttledSmartDriveSaveFn = throttle(
      this.saveSmartDriveData,
      this.DATABASE_SAVE_INTERVAL_MS,
      { leading: true, trailing: false }
    );

    // regiter for system updates related to battery / time UI
    this._sentryBreadCrumb('Registering for battery updates.');
    this.registerForBatteryUpdates();
    this._sentryBreadCrumb('Battery updates registered.');
    this._sentryBreadCrumb('Registering for time updates.');
    this.registerForTimeUpdates();
    this._sentryBreadCrumb('Time updates registered.');

    // register for network service events
    this._sentryBreadCrumb('Registering network event handlers.');
    this.registerNetworkEventHandlers();
    this._sentryBreadCrumb('Network event handlers registered.');

    // Tap / Gesture detection related code:
    this._sensorService.on(
      SensorService.SensorChanged,
      this.handleSensorData.bind(this)
    );
    this._sentryBreadCrumb('Creating new TapDetector');
    console.time('new_tap_detector');
    this.tapDetector = new TapDetector();
    console.timeEnd('new_tap_detector');
    this._sentryBreadCrumb('New TapDetector created.');

    this._sentryBreadCrumb('Enabling body sensor.');
    this.enableBodySensor();
    this._sentryBreadCrumb('Body sensor enabled.');

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = appSettings.getString(DataKeys.SD_SAVED_ADDRESS);
    if (savedSDAddr && savedSDAddr.length) {
      this.updateSmartDrive(savedSDAddr);
    }

    // load serialized smartdrive data
    if (this.smartDrive) {
      this.loadSmartDriveStateFromLS();
    }

    // load settings from memory
    this._sentryBreadCrumb('Loading settings.');
    this.loadSettings();
    this._sentryBreadCrumb('Settings loaded.');

    this._sentryBreadCrumb('Updating settings display.');
    this.updateSettingsDisplay();
    this._sentryBreadCrumb('Settings display updated.');

    // Log.D(
    //   'Device Info: ---',
    //   'Serial Number: ' + this.watchSerialNumber,
    //   'Manufacturer: ' + device.manufacturer,
    //   'Model: ' + device.model,
    //   'OS: ' + device.os,
    //   'OS Version: ' + device.osVersion,
    //   'SDK Version: ' + device.sdkVersion,
    //   'Region: ' + device.region,
    //   'Device Language: ' + device.language,
    //   'UUID: ' + device.uuid
    // );
  }

  async initSqliteTables() {
    this._sentryBreadCrumb('Initializing SQLite...');
    console.time('SQLite_Init');
    // create / load tables for smartdrive data
    const sqlitePromises = [
      this._sqliteService.makeTable(
        SmartDriveData.Info.TableName,
        SmartDriveData.Info.IdName,
        SmartDriveData.Info.Fields
      ),
      this._sqliteService.makeTable(
        SmartDriveData.Errors.TableName,
        SmartDriveData.Errors.IdName,
        SmartDriveData.Errors.Fields
      ),
      this._sqliteService.makeTable(
        SmartDriveData.Firmwares.TableName,
        SmartDriveData.Firmwares.IdName,
        SmartDriveData.Firmwares.Fields
      )
    ];
    return Promise.all(sqlitePromises)
      .then(() => {
        console.timeEnd('SQLite_Init');
        this._sentryBreadCrumb('SQLite has been initialized.');

        // get last error
        return this._sqliteService
          .getLast(
            SmartDriveData.Errors.TableName,
            SmartDriveData.Errors.IdName
          )
          .then(obj => {
            try {
              const lastErrorId = parseInt((obj && obj[3]) || -1);
              this.lastErrorId = lastErrorId;
            } catch (err) {}
          })
          .catch(err => {
            Sentry.captureException(err);
            alert({
              title: L('failures.title'),
              message: `${L('failures.getting-error')}: ${err}`,
              okButtonText: L('buttons.ok')
            });
          });
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Could not make table:', err);
      });
  }

  askForPermissions() {
    // will throw an error if permissions are denied, else will
    // return either true or a permissions object detailing all the
    // granted permissions. The error thrown details which
    // permissions were rejected
    const neededPermissions = this.permissionsNeeded.filter(
      p => !hasPermission(p)
    );
    const reasons = [
      L('permissions-reasons.phone-state'),
      L('permissions-reasons.coarse-location')
    ].join('\n\n');
    if (neededPermissions && neededPermissions.length > 0) {
      // Log.D('requesting permissions!', neededPermissions);
      return alert({
        title: L('permissions-request.title'),
        message: reasons,
        okButtonText: L('buttons.ok')
      })
        .then(() => {
          return requestPermissions(neededPermissions, () => {});
        })
        .then(permissions => {
          // now that we have permissions go ahead and save the serial number
          this.watchSerialNumber = android.os.Build.getSerial();
          appSettings.setString(
            DataKeys.WATCH_SERIAL_NUMBER,
            this.watchSerialNumber
          );
          this._kinveyService.watch_serial_number = this.watchSerialNumber;
          // and return true letting the caller know we got the permissions
          return true;
        })
        .catch(err => {
          Sentry.captureException(err);
          throw L('failures.permissions');
        });
    } else {
      return Promise.resolve(true);
    }
  }

  previousLayout() {
    // get the most recent layout and remove it from the list
    const layoutName = this.previousLayouts.pop();
    if (layoutName) {
      Object.keys(this.layouts)
        .filter(k => k !== layoutName)
        .map(k => {
          this.enabledLayout.set(k, false);
        });
      this.enabledLayout.set(layoutName, true);
    } else {
      // if there is no previous - go back to the main screen
      this.enabledLayout.set('main', true);
    }
  }

  enableLayout(layoutName: string) {
    Object.keys(this.layouts)
      .filter(k => k !== layoutName)
      .map(k => {
        if (this.enabledLayout.get(k)) {
          this.previousLayouts.push(k);
        }
        this.enabledLayout.set(k, false);
      });
    this.enabledLayout.set(layoutName, true);
  }

  async onMainPageLoaded(args: any) {
    this._sentryBreadCrumb('onMainPageLoaded');
    // now init the ui
    await this.init();
    // get child references
    const page = args.object as Page;
    this.pager = page.getViewById('pager') as Pager;
    this.scanningProgressCircle = page.getViewById(
      'scanningProgressCircle'
    ) as AnimatedCircle;
    this.updateProgressCircle = page.getViewById(
      'updateProgressCircle'
    ) as AnimatedCircle;
    // apply theme
    this.applyTheme();
  }

  applyTheme(theme?: string) {
    // apply theme
    this._sentryBreadCrumb('applying theme');
    if (theme === 'ambient' || this.isAmbient) {
      themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
    } else {
      themes.applyThemeCss(defaultTheme, 'theme-default.scss');
    }
    this.applyStyle();
  }

  applyStyle() {
    this._sentryBreadCrumb('applying style');
    if (this.pager) {
      const children = this.pager._childrenViews;
      for (let i = 0; i < children.size; i++) {
        const child = children.get(i) as View;
        child._onCssStateChange();
      }
    }
  }

  fullStop() {
    // this.disableAllSensors();
    // this.disableTapSensor();
    this.disablePowerAssist();
  }

  registerForSmartDriveEvents() {
    this.unregisterForSmartDriveEvents();
    // set up ota action handler
    // throttled function to keep people from pressing it too frequently
    this._throttledOtaAction = throttle(this.smartDrive.onOTAActionTap, 500, {
      leading: true,
      trailing: false
    });
    // register for event handlers
    // set the event listeners for mcu_version_event and smartdrive_distance_event
    this.smartDrive.on(
      SmartDrive.smartdrive_connect_event,
      this.onSmartDriveConnect,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_mcu_version_event,
      this.onSmartDriveVersion,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_distance_event,
      this.onDistance,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_motor_info_event,
      this.onMotorInfo,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_error_event,
      this.onSmartDriveError,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_ota_status_event,
      this.onSmartDriveOtaStatus,
      this
    );
  }

  unregisterForSmartDriveEvents() {
    this.smartDrive.off(
      SmartDrive.smartdrive_connect_event,
      this.onSmartDriveConnect,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this.onSmartDriveDisconnect,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_mcu_version_event,
      this.onSmartDriveVersion,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_distance_event,
      this.onDistance,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_motor_info_event,
      this.onMotorInfo,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_error_event,
      this.onSmartDriveError,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_ota_status_event,
      this.onSmartDriveOtaStatus,
      this
    );
  }

  updateSmartDrive(address: string) {
    this._savedSmartDriveAddress = address;
    this.smartDrive = this._bluetoothService.getOrMakeSmartDrive({
      address: address
    });
    this.registerForSmartDriveEvents();
  }

  loadSmartDriveStateFromLS() {
    const savedSd = LS.getItem(
      'com.permobil.smartdrive.wearos.smartdrive.data'
    );
    Log.D('Loading SD state from LS', savedSd);
    if (savedSd) {
      this.smartDrive.fromObject(savedSd);
    }
    // update the displayed smartdrive data
    this.smartDriveCurrentBatteryPercentage = this.smartDrive.battery;
  }

  saveSmartDriveStateToLS() {
    Log.D('Saving SD state to LS');
    LS.setItemObject(
      'com.permobil.smartdrive.wearos.smartdrive.data',
      this.smartDrive.data()
    );
  }

  /**
   * Application lifecycle event handlers
   */
  registerAppEventHandlers() {
    // handle ambient mode callbacks
    application.on('enterAmbient', this.onEnterAmbient.bind(this));
    application.on('updateAmbient', this.onUpdateAmbient.bind(this));
    application.on('exitAmbient', this.onExitAmbient.bind(this));

    // Activity lifecycle event handlers
    application.android.on(
      application.AndroidApplication.activityPausedEvent,
      this.onActivityPaused.bind(this)
    );
    application.android.on(
      application.AndroidApplication.activityResumedEvent,
      this.onActivityResumed.bind(this)
    );
    application.android.on(
      application.AndroidApplication.activityStoppedEvent,
      this.onActivityStopped.bind(this)
    );

    // application lifecycle event handlers
    application.on(application.launchEvent, this.onAppLaunch.bind(this));
    application.on(application.resumeEvent, this.onAppResume.bind(this));
    application.on(application.suspendEvent, this.onAppSuspend.bind(this));
    application.on(application.exitEvent, this.onAppExit.bind(this));
    application.on(application.lowMemoryEvent, this.onAppLowMemory.bind(this));
    application.on(
      application.uncaughtErrorEvent,
      this.onAppUncaughtError.bind(this)
    );
  }

  isActivityThis(activity: any) {
    return `${activity}`.includes(application.android.packageName);
  }

  onActivityPaused(args: application.AndroidActivityBundleEventData) {
    if (this.isActivityThis(args.activity)) {
      this._sentryBreadCrumb('*** activityPaused ***');
      Log.D('*** activityPaused ***');
      // paused happens any time a new activity is shown
      // in front, e.g. showSuccess / showFailure - so we
      // probably don't want to fullstop on paused
    }
  }

  onActivityResumed(args: application.AndroidActivityBundleEventData) {
    if (this.isActivityThis(args.activity)) {
      this._sentryBreadCrumb('*** activityResumed ***');
      Log.D('*** activityResumed ***');
      // resumed happens after an app is re-opened out of
      // suspend, even though the app level resume event
      // doesn't seem to fire. Therefore we want to make
      // sure to re-enable device sensors since the
      // suspend event will have disabled them.
      this.enableBodySensor();
    }
  }

  onActivityStopped(args: application.AndroidActivityBundleEventData) {
    if (this.isActivityThis(args.activity)) {
      this._sentryBreadCrumb('*** activityStopped ***');
      Log.D('*** activityStopped ***');
      // similar to the app suspend / exit event.
      this.fullStop();
    }
  }

  onEnterAmbient() {
    this._sentryBreadCrumb('*** enterAmbient ***');
    this.isAmbient = true;
    Log.D('*** enterAmbient ***');
    // the user can enter ambient mode even when we hold wake lock
    // and use the keepAlive() function by full-palming the screen
    // or going underwater - so we have to handle the cases that
    // power assist is active or training mode is active.
    if (this.powerAssistActive) {
      this.disablePowerAssist();
      return;
    }
    if (this.isTraining) {
      this.onExitTrainingModeTap();
      return;
    }

    this.applyTheme();
  }

  onUpdateAmbient() {
    this.isAmbient = true;
    this.updateTimeDisplay();
    Log.D(
      'updateAmbient',
      this.currentTime,
      this.currentTimeMeridiem,
      this.currentDay,
      this.currentYear
    );
  }

  onExitAmbient() {
    this._sentryBreadCrumb('*** exitAmbient ***');
    this.isAmbient = false;
    Log.D('*** exitAmbient ***');
    this.enableBodySensor();
    this.applyTheme();
  }

  onAppLaunch(args?: any) {}

  onAppResume(args?: any) {
    this.enableBodySensor();
  }

  onAppSuspend(args?: any) {
    Log.D('*** appSuspend ***');
    this.fullStop();
  }

  onAppExit(args?: any) {
    Log.D('*** appExit ***');
    this.fullStop();
  }

  onAppLowMemory(args?: any) {
    this._sentryBreadCrumb('*** appLowMemory ***');
    Log.D('App low memory', args.android);
    // TODO: determine if we need to stop for this - we see this
    // even even when the app is using very little memory
    // this.fullStop();
  }

  onAppUncaughtError(args?: application.UnhandledErrorEventData) {
    if (args) {
      Sentry.captureException(args.error, {
        tags: {
          type: 'uncaughtErrorEvent'
        }
      });
    }
    Log.D('App uncaught error');
    this.fullStop();
  }

  registerForBatteryUpdates() {
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
      if (this.watchIsCharging && this.chargingWorkTimeoutId === null) {
        // do work that we need while charging
        this.chargingWorkTimeoutId = setTimeout(
          this.doWhileCharged.bind(this),
          this.CHARGING_WORK_PERIOD_MS
        );
      }
    };

    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_BATTERY_CHANGED,
      batteryReceiverCallback
    );
  }

  registerForTimeUpdates() {
    // monitor the clock / system time for display and logging:
    this.updateTimeDisplay();
    const timeReceiverCallback = (androidContext, intent) => {
      this.updateTimeDisplay();
      Log.D('timeReceiverCallback', this.currentTime);
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
  }

  toggleTimeDisplay() {
    this.displayTime = !this.displayTime;
  }

  _format(d: Date, fmt: string) {
    return format(d, fmt, {
      locale: dateLocales[getDefaultLang()] || dateLocales['en']
    });
  }

  updateTimeDisplay() {
    const now = new Date();
    this.currentTime = this._format(now, 'h:mm');
    this.currentTimeMeridiem = this._format(now, 'A');
    this.currentDay = this._format(now, 'ddd MMM D');
    this.currentYear = this._format(now, 'YYYY');
  }

  /**
   * Network manager event handlers
   */
  registerNetworkEventHandlers() {
    /*
      this._networkService.on(
      NetworkService.network_available_event,
      this.onNetworkAvailable.bind(this)
      );
      this._networkService.on(
      NetworkService.network_lost_event,
      this.onNetworkLost.bind(this)
      );
    */
  }

  unregisterNetworkEventHandlers() {
    /*
      this._networkService.off(
      NetworkService.network_available_event,
      this.onNetworkAvailable.bind(this)
      );
      this._networkService.off(
      NetworkService.network_lost_event,
      this.onNetworkLost.bind(this)
      );
    */
  }
  onNetworkAvailable(args?: any) {
    // Log.D('Network available - sending errors');
    return this.sendErrorsToServer(10)
      .then(ret => {
        // Log.D('Network available - sending info');
        return this.sendInfosToServer(10);
      })
      .then(ret => {
        // Log.D('Network available - sending settings');
        return this.sendSettingsToServer();
      })
      .then(ret => {
        // Log.D('Have sent data to server - unregistering from network');
        // unregister network since we're done sending that data now
        // this._networkService.unregisterNetwork();
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Error sending data to server', err);
        // unregister network since we're done sending that data now
        // this._networkService.unregisterNetwork();
      });
  }

  onNetworkLost(args: any) {
    Log.D('Network Lost!');
  }

  doWhileCharged() {
    if (this.watchIsCharging) {
      // Since we're not sending a lot of data, we'll not bother
      // requesting network
      /*
      // request network here
      // Log.D('Watch charging - requesting network');
      this._networkService.requestNetwork({
      timeoutMs: this.CHARGING_WORK_PERIOD_MS / 2
      });
      */
      this.onNetworkAvailable();
      // re-schedule any work that may still need to be done
      this.chargingWorkTimeoutId = setTimeout(
        this.doWhileCharged.bind(this),
        this.CHARGING_WORK_PERIOD_MS
      );
    } else {
      // clear the timeout id since we're not re-spawning it
      this.chargingWorkTimeoutId = null;
    }
  }

  /**
   * View Loaded event handlers
   */
  onPagerLoaded(args: any) {}

  /**
   * Sensor Data Handlers
   */
  handleSensorData(args: SensorChangedEventData) {
    // if we're using litedata for android sensor plugin option
    // the data structure is simplified to reduce redundant data
    const parsedData = args.data;

    if (
      parsedData.s === android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT
    ) {
      this.watchBeingWorn = (parsedData.d as any).state !== 0.0;
      if (!this.disableWearCheck) {
        if (!this.watchBeingWorn && this.powerAssistActive) {
          Log.D('Watch not being worn - disabling power assist!');
          // disable power assist if the watch is taken off!
          this.disablePowerAssist();
        }
      }
    }

    if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
      this.handleAccel(parsedData.d, parsedData.ts);
    }
  }

  handleAccel(acceleration: any, timestamp: number) {
    // ignore tapping if we're not in the right mode
    if (!this.powerAssistActive && !this.isTraining) {
      return;
    }
    // ignore tapping if we're not on the users wrist
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      return;
    }
    // set tap sensitivity threshold
    this.tapDetector.setSensitivity(this.settings.tapSensitivity);
    // now run the tap detector
    const didTap = this.tapDetector.detectTap(acceleration, timestamp);
    if (didTap) {
      // user has met threshold for tapping
      this.handleTap(timestamp);
    }
  }

  handleTap(timestamp: number) {
    this.hasTapped = true;
    // timeout for updating the power assist ring
    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
    }
    this.tapTimeoutId = setTimeout(() => {
      this.hasTapped = false;
    }, (TapDetector.TapLockoutTimeMs * 3) / 2);
    // now send
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      this.smartDrive.ableToSend
    ) {
      if (this.motorOn) {
        this._vibrator.cancel();
        this._vibrator.vibrate((TapDetector.TapLockoutTimeMs * 3) / 4);
      }
      this.smartDrive.sendTap().catch(err => {
        Sentry.captureException(err);
        Log.E('could not send tap', err);
      });
    } else if (this.isTraining) {
      // vibrate for tapping while training
      this._vibrator.cancel();
      this._vibrator.vibrate((TapDetector.TapLockoutTimeMs * 3) / 4);
    }
  }

  stopSmartDrive() {
    // turn off the motor if SD is connected
    if (this.smartDrive && this.smartDrive.ableToSend && this.motorOn) {
      return this.smartDrive.stopMotor().catch(err => {
        Log.E('Could not stop motor', err);
        Sentry.captureException(err);
      });
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Sensor Management
   */
  enableBodySensor() {
    try {
      this._sensorService.startDeviceSensor(
        android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT,
        this.SENSOR_DELAY_US,
        this.MAX_REPORTING_INTERVAL_US
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error starting the body sensor', err);
    }
  }

  enableTapSensor() {
    try {
      this._sensorService.startDeviceSensor(
        android.hardware.Sensor.TYPE_LINEAR_ACCELERATION,
        this.SENSOR_DELAY_US,
        this.MAX_REPORTING_INTERVAL_US
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error starting the tap sensor', err);
    }
  }

  disableAllSensors() {
    try {
      this._sensorService.stopAllDeviceSensors();
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error disabling the device sensors:', err);
    }
  }

  disableTapSensor() {
    try {
      this._sensorService.stopDeviceSensor(
        android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error disabling the device sensors:', err);
    }
  }

  /**
   * Power management
   */
  maintainCPU() {
    this.wakeLock.acquire();
    keepAwake();
  }

  releaseCPU() {
    if (this.wakeLock && this.wakeLock.isHeld()) this.wakeLock.release();
    allowSleepAgain();
  }

  /**
   * Main Menu Button Tap Handlers
   */
  onAboutTap() {
    if (this.aboutScrollView) {
      // reset to to the top when entering the page
      this.aboutScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this._aboutLayout);
    this.enableLayout('about');
  }

  onTrainingTap() {
    this.enableTapSensor();
    this.tapDetector.reset();
    this.maintainCPU();
    this.isTraining = true;
    this.powerAssistState = PowerAssist.State.Training;
    this.updatePowerAssistRing();
    if (this.pager) this.pager.selectedIndex = 0;
  }

  onExitTrainingModeTap() {
    this.disableTapSensor();
    this.releaseCPU();
    this.isTraining = false;
    this.powerAssistState = PowerAssist.State.Inactive;
    this.updatePowerAssistRing();
  }

  /**
   * Scanning Page Handlers
   */
  onScanningLayoutLoaded(args) {
    this._scanningLayout = args.object as SwipeDismissLayout;
    this._scanningLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._scanningLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  /**
   * Updates Page Handlers
   */
  onUpdatesTap() {
    if (this.smartDrive) {
      showOffScreenLayout(this._updatesLayout);
      this.enableLayout('updates');
      this.checkForUpdates();
    } else {
      alert({
        title: L('failures.title'),
        message: L('failures.no-smartdrive-paired'),
        okButtonText: L('buttons.ok')
      });
    }
  }

  onUpdatesLayoutLoaded(args) {
    this._updatesLayout = args.object as SwipeDismissLayout;
    this._updatesLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // make sure to release the CPU
      this.releaseCPU();
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._updatesLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  onSmartDriveOtaStatus(args: any) {
    let canSwipeDismiss = true;
    // get the current progress of the update
    const progress = args.data.progress;
    // translate the state
    const state = L(args.data.state); // .replace('ota.sd.state.', '');
    // now turn the actions into structures for our UI
    const actions = args.data.actions.map(a => {
      if (a.includes('cancel')) {
        canSwipeDismiss = false;
      }
      const actionClass = 'action-' + last(a.split('.'));
      // translate the label
      const actionLabel = L(a); // .replace('ota.action.', '');
      return {
        label: actionLabel,
        func: this._throttledOtaAction.bind(this.smartDrive, a),
        action: a,
        class: actionClass
      };
    });
    // now set the renderable bound data
    this.smartDriveOtaProgress = progress;
    this.smartDriveOtaActions.splice(
      0,
      this.smartDriveOtaActions.length,
      ...actions
    );
    this.smartDriveOtaState = state;
    // disable swipe close of the updates layout
    (this._updatesLayout as any).swipeable = canSwipeDismiss;
  }

  checkForUpdates() {
    // don't allow swiping while we're checking for updates!
    (this._updatesLayout as any).swipeable = false;
    // update display of update progress
    this.smartDriveOtaProgress = 0;
    this.updateProgressText = L('updates.checking-for-updates');
    // some state variables for the update
    this.isUpdatingSmartDrive = false;
    this.checkingForUpdates = true;
    this.hasUpdateData = false;
    let currentVersions = {};
    // @ts-ignore
    this.updateProgressCircle.spin();
    return this.getFirmwareData()
      .then(md => {
        currentVersions = md;
        // Log.D('Current FW Versions:', currentVersions);
        const query = {
          $or: [
            { _filename: 'SmartDriveBLE.ota' },
            { _filename: 'SmartDriveMCU.ota' }
          ],
          firmware_file: true
        };
        return this._kinveyService.getFile(undefined, query).catch(err => {
          Sentry.captureException(err);
          Log.E('Could not get metadata for files:', err);
          this.updateProgressText = L('updates.errors.getting') + `: ${err}`;
          throw err;
        });
      })
      .then(response => {
        // Now that we have the metadata, check to see if we already
        // have the most up to date firmware files and download them
        // if we don't
        const mds = response.content.toJSON();
        let promises = [];
        const maxes = mds.reduce((maxes, md) => {
          const v = SmartDriveData.Firmwares.versionStringToByte(md['version']);
          const fwName = md['_filename'];
          if (!maxes[fwName]) maxes[fwName] = 0;
          maxes[fwName] = Math.max(v, maxes[fwName]);
          return maxes;
        }, {});
        const fileMetaDatas = mds.filter(f => {
          const v = SmartDriveData.Firmwares.versionStringToByte(f['version']);
          const fwName = f['_filename'];
          const current = currentVersions[fwName];
          const currentVersion = current && current.version;
          const isMax = v === maxes[fwName];
          return isMax && (!current || v > currentVersion);
        });
        if (fileMetaDatas && fileMetaDatas.length) {
          // update progress circle
          // @ts-ignore
          this.updateProgressCircle.stopSpinning();
          // reset ota progress to 0 to show downloading progress
          this.smartDriveOtaProgress = 0;
          // update progress text
          this.updateProgressText = L('updates.downloading-new-firmwares');
          const progresses = fileMetaDatas.reduce((p, fmd) => {
            p[fmd['_filename']] = 0;
            return p;
          }, {});
          const progressKeys = Object.keys(progresses);
          SmartDriveData.Firmwares.setDownloadProgressCallback(
            (file, eventData) => {
              progresses[file['_filename']] = eventData.value;
              this.smartDriveOtaProgress =
                progressKeys.reduce((total, k) => {
                  return total + progresses[k];
                }, 0) / progressKeys.length;
            }
          );
          // now download the files
          promises = fileMetaDatas.map(SmartDriveData.Firmwares.download);
        }
        return Promise.all(promises).catch(err => {
          Sentry.captureException(err);
          Log.E('Could not download files:', err);
          this.updateProgressText =
            L('updates.errors.downloading') + `: ${err}`;
          throw err;
        });
      })
      .then(files => {
        // Now that we have the files, write them to disk and update
        // our local metadata
        let promises = [];
        if (files && files.length) {
          Log.D('Updating metadata and writing file data.');
          promises = files.map(f => {
            // update the data in the db
            if (currentVersions[f.name]) {
              // this is a file we have - update the table
              const id = currentVersions[f.name].id;
              // update current versions
              currentVersions[f.name].version = f.version;
              currentVersions[f.name].changes = f.changes;
              currentVersions[f.name].data = f.data;
              // save binary file to fs
              Log.D('saving file', currentVersions[f.name].filename);
              SmartDriveData.Firmwares.saveToFileSystem({
                filename: currentVersions[f.name].filename,
                data: f.data
              });
              return this._sqliteService.updateInTable(
                SmartDriveData.Firmwares.TableName,
                {
                  [SmartDriveData.Firmwares.VersionName]: f.version
                },
                {
                  [SmartDriveData.Firmwares.IdName]: id
                }
              );
            } else {
              // this is a file we don't have in the table
              const newFirmware = SmartDriveData.Firmwares.newFirmware(
                f.version,
                f.name,
                undefined,
                f.changes
              );
              // update current versions
              currentVersions[f.name] = {
                version: f.version,
                changes: f.changes,
                filename: newFirmware[SmartDriveData.Firmwares.FileName],
                data: f.data
              };
              // save binary file to fs
              Log.D('saving file', currentVersions[f.name].filename);
              SmartDriveData.Firmwares.saveToFileSystem({
                filename: currentVersions[f.name].filename,
                data: f.data
              });
              return this._sqliteService.insertIntoTable(
                SmartDriveData.Firmwares.TableName,
                newFirmware
              );
            }
          });
        }
        return Promise.all(promises).catch(err => {
          Sentry.captureException(err);
          Log.E('Could not write files:', err);
          this.updateProgressText = L('updates.errors.saving') + `: ${err}`;
          throw err;
        });
      })
      .then(() => {
        // Now let's connect to the SD to make sure that we get it's
        // version information
        return new Promise((resolve, reject) => {
          if (this.smartDrive && this.smartDrive.hasVersionInfo()) {
            // if we've already talked to this SD and gotten its
            // version info then we can just resolve
            resolve();
            return;
          }
          // we've not talked to this SD before, so we should connect
          // and get its version info
          this.updateProgressText = L('updates.connecting-to-smartdrive');
          const connectTimeoutId = setTimeout(() => {
            this.smartDrive.off(
              SmartDrive.smartdrive_mcu_version_event,
              onVersion
            );
            reject('Timeout');
          }, 30 * 1000);
          const onVersion = () => {
            this.smartDrive.off(
              SmartDrive.smartdrive_mcu_version_event,
              onVersion
            );
            clearTimeout(connectTimeoutId);
            resolve();
          };
          this.smartDrive.on(
            SmartDrive.smartdrive_mcu_version_event,
            onVersion
          );
          this.connectToSavedSmartDrive()
            .then(didConnect => {
              if (!didConnect) {
                reject('Did not connect');
              }
            })
            .catch(err => {
              Sentry.captureException(err);
              reject(err);
            });
        })
          .then(() => {
            return this.disconnectFromSmartDrive();
          })
          .catch(err => {
            Sentry.captureException(err);
            this.disconnectFromSmartDrive();
            Log.E('Could not connect to smartdrive:', err);
            this.updateProgressText =
              L('updates.errors.connecting') + `: ${err}`;
            throw err;
          });
      })
      .then(() => {
        // Now perform the SmartDrive updates if we need to
        // re-enable swipe close of the updates layout
        (this._updatesLayout as any).swipeable = true;
        // now see what we need to do with the data
        Log.D('Finished downloading updates.');
        this.hasUpdateData = true;
        this.updateProgressText = '';
        this.checkingForUpdates = false;
        // @ts-ignore
        this.updateProgressCircle.stopSpinning();
        // do we need to update? - check against smartdrive version
        const bleVersion = currentVersions['SmartDriveBLE.ota'].version;
        const mcuVersion = currentVersions['SmartDriveMCU.ota'].version;
        if (
          !this.smartDrive.isMcuUpToDate(mcuVersion) ||
          !this.smartDrive.isBleUpToDate(bleVersion)
        ) {
          // reset the ota progress to 0 (since downloaing may have
          // used it)
          this.smartDriveOtaProgress = 0;
          // get info out to tell the user
          const version = SmartDriveData.Firmwares.versionByteToString(
            Math.max(mcuVersion, bleVersion)
          );
          Log.D('got version', version);
          // show dialog to user informing them of the version number and changes
          const title = L('updates.version') + ' ' + version;
          const changes = Object.keys(currentVersions).map(
            k => currentVersions[k].changes
          );
          const msg =
            L('updates.changes') + '\n\n' + flatten(changes).join('\n\n');
          // Log.D('got changes', changes);
          alert({
            title: title,
            message: msg,
            okButtonText: L('buttons.ok')
          }).then(() => {
            this.isUpdatingSmartDrive = true;
            Log.D('Beginning SmartDrive update');
            const bleFw = new Uint8Array(
              currentVersions['SmartDriveBLE.ota'].data
            );
            const mcuFw = new Uint8Array(
              currentVersions['SmartDriveMCU.ota'].data
            );
            Log.D('mcu length:', typeof mcuFw, mcuFw.length);
            Log.D('ble length:', typeof bleFw, bleFw.length);
            // maintain CPU resources while updating
            this.maintainCPU();
            // smartdrive needs to update
            this.smartDrive
              .performOTA(bleFw, mcuFw, bleVersion, mcuVersion, 300 * 1000)
              .then(otaStatus => {
                this.releaseCPU();
                this.isUpdatingSmartDrive = false;
                const status = otaStatus.replace('OTA', 'Update');
                this.updateProgressText = status;
                Log.D('update status:', otaStatus);
                if (status === 'Update Complete') {
                  showSuccess(L('updates.success'));
                }
                // re-enable swipe close of the updates layout
                (this._updatesLayout as any).swipeable = true;
              })
              .catch(err => {
                Sentry.captureException(err);
                this.releaseCPU();
                this.isUpdatingSmartDrive = false;
                const msg = L('updates.failed') + `: ${err}`;
                Log.E(msg);
                this.updateProgressText = msg;
                alert({
                  title: L('updates.failed'),
                  message: `${err}`,
                  okButtonText: L('buttons.ok')
                });
                // re-enable swipe close of the updates layout
                (this._updatesLayout as any).swipeable = true;
              });
          });
        } else {
          this.releaseCPU();
          // re-enable swipe close of the updates layout
          (this._updatesLayout as any).swipeable = true;
          // smartdrive is already up to date
          showSuccess(L('updates.up-to-date'));
          setTimeout(() => {
            hideOffScreenLayout(this._updatesLayout, { x: 500, y: 0 });
            this.previousLayout();
          }, 2000);
        }
      })
      .catch(err => {
        Sentry.captureException(err);
        this.releaseCPU();
        // re-enable swipe close of the updates layout
        (this._updatesLayout as any).swipeable = true;
        this.hasUpdateData = false;
        this.checkingForUpdates = false;
        this.isUpdatingSmartDrive = false;
        // @ts-ignore
        this.updateProgressCircle.stopSpinning();
      });
  }

  cancelUpdates() {
    this.releaseCPU();
    this.updateProgressText = L('updates.canceled');
    // re-enable swipe close of the updates layout
    (this._updatesLayout as any).swipeable = true;
    if (this.smartDrive) {
      this.smartDrive.cancelOTA();
    }
  }

  /**
   * Error History Page Handlers
   */

  onErrorHistoryLayoutLoaded(args) {
    // show the chart
    this._errorHistoryLayout = args.object as SwipeDismissLayout;
    this.errorsScrollView = this._errorHistoryLayout.getViewById(
      'errorsScrollView'
    ) as ScrollView;
    this._errorHistoryLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._errorHistoryLayout, { x: 500, y: 0 });
      this.previousLayout();
      // clear the error history data when it's not being displayed to save on memory
      this.errorHistoryData.splice(0, this.errorHistoryData.length);
    });
  }

  onLoadMoreErrors(args?: ItemEventData) {
    this.getRecentErrors(10, this.errorHistoryData.length).then(recents => {
      // add the back button as the first element - should only load once
      if (this.errorHistoryData.length === 0) {
        this.errorHistoryData.push({
          code: L('buttons.back'),
          onTap: this.previousLayout.bind(this)
        });
      }
      // determine the unique errors that we have
      recents = differenceBy(recents, this.errorHistoryData.slice(), 'uuid');
      if (recents && recents.length) {
        // now add the recent data
        this.errorHistoryData.push(...recents);
      } else if (this.errorHistoryData.length === 1) {
        // or add the 'no errors' message
        this.errorHistoryData.push({
          code: L('error-history.no-errors')
        });
      }
    });
  }

  showErrorHistory() {
    // clear out any pre-loaded data
    this.errorHistoryData.splice(0, this.errorHistoryData.length);
    if (this.errorsScrollView) {
      // reset to to the top when entering the page
      this.errorsScrollView.scrollToVerticalOffset(0, true);
    }
    // load the error data
    this.onLoadMoreErrors();
    // show the layout
    showOffScreenLayout(this._errorHistoryLayout);
    this.enableLayout('errorHistory');
  }

  /**
   * Setings page handlers
   */
  onSettingsLayoutLoaded(args) {
    this._settingsLayout = args.object as SwipeDismissLayout;
    this.settingsScrollView = this._settingsLayout.getViewById(
      'settingsScrollView'
    ) as ScrollView;
    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._settingsLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  onAboutLayoutLoaded(args) {
    // show the chart
    this._aboutLayout = args.object as SwipeDismissLayout;
    this.aboutScrollView = this._aboutLayout.getViewById(
      'aboutScrollView'
    ) as ScrollView;
    this._aboutLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._aboutLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  updateChartData() {
    // Log.D('Updating Chart Data / Display');
    return this.getUsageInfoFromDatabase(7)
      .then((sdData: any[]) => {
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
            day: this._format(new Date(e.date), 'dd'),
            value: (e.battery * 100.0) / maxBattery
          };
        });
        // Log.D('Highest Battery Value:', maxBattery);
        this.batteryChartMaxValue = maxBattery.toFixed(0);
        this.batteryChartData = batteryData;

        // update distance data
        let oldestDist = oldest[SmartDriveData.Info.DriveDistanceName];
        const distanceData = sdData.map(e => {
          let diff = 0;
          const dist = e[SmartDriveData.Info.DriveDistanceName];
          if (dist > 0) {
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
          }
          return {
            day: this._format(new Date(e.date), 'dd'),
            value: diff
          };
        });
        const maxDist = distanceData.reduce((max, obj) => {
          return obj.value > max ? obj.value : max;
        }, 0.0);
        distanceData.map(data => {
          data.value = (100.0 * data.value) / maxDist;
        });
        // Log.D('Highest Distance Value:', maxDist);
        this.distanceChartMaxValue = maxDist.toFixed(1);
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
      .catch(err => {
        Sentry.captureException(err);
      });
  }

  onSettingsTap() {
    if (this.settingsScrollView) {
      // reset to to the top when entering the page
      this.settingsScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this._settingsLayout);
    this.enableLayout('settings');
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settings);
    this.tempSwitchControlSettings.copy(this.switchControlSettings);
    const tappedId = args.object.id as string;
    this.activeSettingToChange = tappedId.toLowerCase();
    switch (this.activeSettingToChange) {
      case 'maxspeed':
        this.changeSettingKeyString = L('settings.max-speed');
        break;
      case 'acceleration':
        this.changeSettingKeyString = L('settings.acceleration');
        break;
      case 'tapsensitivity':
        this.changeSettingKeyString = L('settings.tap-sensitivity');
        break;
      case 'powerassistbuzzer':
        this.changeSettingKeyString = L('settings.power-assist-buzzer');
        break;
      case 'controlmode':
        this.changeSettingKeyString = L('settings.control-mode');
        break;
      case 'units':
        this.changeSettingKeyString = L('settings.units');
        break;
      case 'switchcontrolmode':
        this.changeSettingKeyString = L('switch-control.mode');
        break;
      case 'switchcontrolspeed':
        this.changeSettingKeyString = L('switch-control.max-speed');
        break;
      case 'wearcheck':
        this.changeSettingKeyString = L('settings.watch-required.title');
        break;
      default:
        break;
    }
    this.updateSettingsChangeDisplay();

    showOffScreenLayout(this._changeSettingsLayout).then(() => {
      // TODO: this is a hack to force the layout to update for
      // showing the auto-size text view
      const prevVal = this.changeSettingKeyValue;
      this.changeSettingKeyValue = '  ';
      this.changeSettingKeyValue = prevVal;
    });
    this.enableLayout('changeSettings');
  }

  updateSettingsChangeDisplay() {
    let translationKey = '';
    switch (this.activeSettingToChange) {
      case 'maxspeed':
        this.changeSettingKeyValue = `${this.tempSettings.maxSpeed} %`;
        break;
      case 'acceleration':
        this.changeSettingKeyValue = `${this.tempSettings.acceleration} %`;
        break;
      case 'tapsensitivity':
        this.changeSettingKeyValue = `${this.tempSettings.tapSensitivity} %`;
        break;
      case 'powerassistbuzzer':
        if (this.tempSettings.disablePowerAssistBeep) {
          this.changeSettingKeyValue = L(
            'sd.settings.power-assist-buzzer.disabled'
          );
        } else {
          this.changeSettingKeyValue = L(
            'sd.settings.power-assist-buzzer.enabled'
          );
        }
        break;
      case 'controlmode':
        this.changeSettingKeyValue = `${this.tempSettings.controlMode}`;
        return;
      case 'units':
        translationKey =
          'sd.settings.units.' + this.tempSettings.units.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'switchcontrolmode':
        translationKey =
          'sd.switch-settings.mode.' +
          this.tempSwitchControlSettings.mode.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'switchcontrolspeed':
        this.changeSettingKeyValue = `${this.tempSwitchControlSettings.maxSpeed} %`;
        return;
      case 'wearcheck':
        if (this.disableWearCheck) {
          this.changeSettingKeyValue = L(
            'settings.watch-required.values.disabled'
          );
        } else {
          this.changeSettingKeyValue = L(
            'settings.watch-required.values.enabled'
          );
        }
        break;
      default:
        break;
    }
  }

  onCancelChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    this.previousLayout();
  }

  updateSettingsDisplay() {
    this.updateSpeedDisplay();
    this.updateChartData();
  }

  toggleDisplay() {
    this.displayRssi = !this.displayRssi;
  }

  updateSpeedDisplay() {
    // update distance units
    this.distanceUnits = L(
      'units.distance.' + this.settings.units.toLowerCase()
    );
    const speedUnits = L('units.speed.' + this.settings.units.toLowerCase());
    // update speed display
    this.currentSpeedDisplay = this.currentSpeed.toFixed(1);
    this.currentSpeedDescription = `${L('power-assist.speed')} (${speedUnits})`;
    // update estimated range display
    this.estimatedDistanceDisplay = this.estimatedDistance.toFixed(1);
    this.estimatedDistanceDescription = `${L(
      'power-assist.estimated-range'
    )} (${this.distanceUnits})`;
    if (this.settings.units === 'Metric') {
      // update estimated range display
      this.estimatedDistanceDisplay = (this.estimatedDistance * 1.609).toFixed(
        1
      );
    }
    // don't show 0.0 - show '--'
    if (this.estimatedDistanceDisplay === '0.0') {
      this.estimatedDistanceDisplay = '--';
    }
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, {
      x: 500,
      y: 0
    });
    this.previousLayout();
    // SAVE THE VALUE to local data for the setting user has selected
    this.settings.copy(this.tempSettings);
    this.switchControlSettings.copy(this.tempSwitchControlSettings);
    this.hasSentSettings = false;
    this.saveSettings();
    // now update any display that needs settings:
    this.updateSettingsDisplay();
    // warning / indication to the user that they've updated their settings
    alert({
      title: L('warnings.saved-settings.title'),
      message: L('warnings.saved-settings.message'),
      okButtonText: L('buttons.ok')
    });
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.activeSettingToChange);
    this.tempSwitchControlSettings.increase(this.activeSettingToChange);
    if (this.activeSettingToChange === 'wearcheck') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap() {
    this.tempSettings.decrease(this.activeSettingToChange);
    this.tempSwitchControlSettings.decrease(this.activeSettingToChange);
    if (this.activeSettingToChange === 'wearcheck') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    this.updateSettingsChangeDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this._changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button
    // without starting the swipe behavior
    (this._changeSettingsLayout as any).swipeable = false;
  }

  /**
   * Smart Drive Interaction and Data Management
   */

  loadSettings() {
    this.settings.copy(
      LS.getItem('com.permobil.smartdrive.wearos.smartdrive.settings')
    );
    this.switchControlSettings.copy(
      LS.getItem(
        'com.permobil.smartdrive.wearos.smartdrive.switch-control-settings'
      )
    );
    this.hasSentSettings =
      appSettings.getBoolean(DataKeys.SD_SETTINGS_DIRTY_FLAG) || false;
    this.disableWearCheck =
      appSettings.getBoolean(DataKeys.REQUIRE_WATCH_BEING_WORN) || false;
  }

  saveSettings() {
    appSettings.setBoolean(
      DataKeys.SD_SETTINGS_DIRTY_FLAG,
      this.hasSentSettings
    );
    appSettings.setBoolean(
      DataKeys.REQUIRE_WATCH_BEING_WORN,
      this.disableWearCheck
    );
    LS.setItemObject(
      'com.permobil.smartdrive.wearos.smartdrive.settings',
      this.settings.toObj()
    );
    LS.setItemObject(
      'com.permobil.smartdrive.wearos.smartdrive.switch-control-settings',
      this.switchControlSettings.toObj()
    );
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
          if (this.smartDrive.ableToSend) {
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
    Log.D('Enabling power assist');
    // only enable power assist if we're on the user's wrist
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      alert({
        title: L('failures.title'),
        message: L('failures.must-wear-watch'),
        okButtonText: L('buttons.ok')
      });
      return;
    } else if (this.hasSavedSmartDrive()) {
      this.tapDetector.reset();
      this.maintainCPU();
      this.powerAssistState = PowerAssist.State.Disconnected;
      this.powerAssistActive = true;
      this.updatePowerAssistRing();
      return this.askForPermissions()
        .then(() => {
          return this.connectToSavedSmartDrive();
        })
        .then((didConnect: boolean) => {
          if (didConnect) {
            // vibrate for enabling power assist
            this._vibrator.vibrate(200); // vibrate for 250 ms
            // enable the tap sensor
            this.enableTapSensor();
            this._ringTimerId = setInterval(
              this.blinkPowerAssistRing.bind(this),
              this.RING_TIMER_INTERVAL_MS
            );
          } else {
            Log.D('Did not connect, disabling power assist');
            this.disablePowerAssist();
          }
        })
        .catch(err => {
          Sentry.captureException(err);
          Log.E(`Caught error, disabling power assist: ${err}`);
          this.disablePowerAssist();
        });
    } else {
      return this.saveNewSmartDrive()
        .then((didSave: boolean) => {
          if (didSave) {
            return this.enablePowerAssist();
          } else {
            Log.D('SmartDrive was not saved!');
          }
        })
        .catch(err => {
          Sentry.captureException(err);
          Log.E(`Could not save new smartdrive: ${err}`);
        });
    }
  }

  disablePowerAssist() {
    Log.D('Disabling power assist');
    this.disableTapSensor();
    this.releaseCPU();
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
        Sentry.captureException(err);
        return this.disconnectFromSmartDrive();
      });
  }

  showScanning() {
    showOffScreenLayout(this._scanningLayout);
    // disable swipe close of the updates layout
    (this._scanningLayout as any).swipeable = false;
    this.enableLayout('scanning');
    // @ts-ignore
    this.scanningProgressCircle.spin();
  }

  hideScanning() {
    // re-enable swipe close of the updates layout
    (this._scanningLayout as any).swipeable = true;
    hideOffScreenLayout(this._scanningLayout, { x: 500, y: 0 });
    this.previousLayout();
    // @ts-ignore
    this.scanningProgressCircle.stopSpinning();
  }

  onPairingTap() {
    return this.saveNewSmartDrive()
      .then((didSave: boolean) => {
        if (didSave) {
          showSuccess(
            `${L('settings.paired-to-smartdrive')} ${this.smartDrive.address}`
          );
        }
      })
      .catch((err: any) => {
        Sentry.captureException(err);
        Log.E('Could not pair', err);
      });
  }

  saveNewSmartDrive(): Promise<any> {
    let scanDisplayId = null;
    this.showScanning();
    // ensure we have the permissions
    return this.askForPermissions()
      .then(() => {
        // ensure bluetoothservice is functional
        return this._bluetoothService.initialize();
      })
      .then(() => {
        this.pairSmartDriveText = L('settings.scanning');
        scanDisplayId = setInterval(() => {
          this.pairSmartDriveText += '.';
        }, 1000);
        // scan for smartdrives
        return this._bluetoothService.scanForSmartDrives(3);
      })
      .then(() => {
        this.hideScanning();
        clearInterval(scanDisplayId);
        this.pairSmartDriveText = L('settings.pair-smartdrive');
        Log.D(`Discovered ${BluetoothService.SmartDrives.length} SmartDrives`);

        // make sure we have smartdrives
        if (BluetoothService.SmartDrives.length <= 0) {
          alert({
            title: L('failures.title'),
            message: L('failures.no-smartdrives-found'),
            okButtonText: L('buttons.ok')
          });
          return false;
        }

        // these are the smartdrives that are pushed into an array on the bluetooth service
        const sds = BluetoothService.SmartDrives;

        // map the smart drives to get all of the addresses
        const addresses = sds.map(sd => `${sd.address}`);

        // present action dialog to select which smartdrive to connect to
        return action({
          title: L('settings.select-smartdrive'),
          message: L('settings.select-smartdrive'),
          actions: addresses,
          cancelButtonText: L('buttons.dismiss')
        }).then(result => {
          // if user selected one of the smartdrives in the action dialog, attempt to connect to it
          if (addresses.indexOf(result) > -1) {
            // save the smartdrive here
            this.updateSmartDrive(result);
            appSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);
            return true;
          } else {
            return false;
          }
        });
      })
      .catch(err => {
        Sentry.captureException(err);
        this.hideScanning();
        clearInterval(scanDisplayId);
        this.pairSmartDriveText = L('settings.pair-smartdrive');
        Log.E('could not scan', err);
        alert({
          title: L('failures.title'),
          message: `${L('failures.scan')}: ${err}`,
          okButtonText: L('buttons.ok')
        });
        return false;
      });
  }

  connectToSmartDrive(smartDrive) {
    if (!smartDrive) return;
    this.updateSmartDrive(smartDrive.address);
    // now connect to smart drive
    return this.smartDrive
      .connect()
      .then(() => {
        return true;
      })
      .catch(err => {
        Sentry.captureException(err);
        alert({
          title: L('failures.title'),
          message: L('failures.connect') + ' ' + smartDrive.address,
          okButtonText: L('buttons.ok')
        });
        return false;
      });
  }

  hasSavedSmartDrive(): boolean {
    return (
      this._savedSmartDriveAddress !== null &&
      this._savedSmartDriveAddress.length > 0
    );
  }

  connectToSavedSmartDrive(): Promise<any> {
    if (!this.hasSavedSmartDrive()) {
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
    if (this.smartDrive) {
      this.smartDrive.disconnect().then(() => {
        this.motorOn = false;
      });
    }
  }

  retrySmartDriveConnection() {
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      !this.smartDrive.connected
    ) {
      setTimeout(() => {
        this.connectToSavedSmartDrive();
      }, 1 * 1000);
    }
  }

  sendSmartDriveSettings() {
    // send the current settings to the SD
    return this.smartDrive
      .sendSettingsObject(this.settings)
      .then(() => {
        return this.smartDrive.sendSwitchControlSettingsObject(
          this.switchControlSettings
        );
      })
      .catch(err => {
        Sentry.captureException(err);
        // make sure we retry this while we're connected
        this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
        // indicate failure
        Log.E('send settings failed', err);
        const msg =
          L('failures.send-settings') +
          ' ' +
          this._savedSmartDriveAddress +
          '\n\n' +
          err;
        alert({
          title: L('failures.title'),
          message: msg,
          okButtonText: L('buttons.ok')
        });
      });
  }

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  async onSmartDriveConnect(args: any) {
    this.powerAssistState = PowerAssist.State.Connected;
    this.updatePowerAssistRing();
    this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
    if (this.rssiIntervalId) {
      clearInterval(this.rssiIntervalId);
      this.rssiIntervalId = null;
    }
    this.rssiIntervalId = setInterval(
      this.readSmartDriveSignalStrength.bind(this),
      this.RSSI_INTERVAL_MS
    );
  }

  async onSmartDriveDisconnect(args: any) {
    if (this.rssiIntervalId) {
      clearInterval(this.rssiIntervalId);
      this.rssiIntervalId = null;
    }
    if (this.motorOn) {
      // record disconnect error - the SD should never be on when
      // we disconnect!
      const errorCode = this.smartDrive.getBleDisconnectError();
      this.saveErrorToDatabase(errorCode, undefined);
    }
    this.motorOn = false;
    if (this.powerAssistActive) {
      this.powerAssistState = PowerAssist.State.Disconnected;
      this.updatePowerAssistRing();
      this.retrySmartDriveConnection();
    }
  }

  async onSmartDriveError(args: any) {
    // Log.D('onSmartDriveError event');
    const errorType = args.data.errorType;
    const errorId = args.data.errorId;
    // save the error into the database
    this.saveErrorToDatabase(errorType, errorId);
  }

  private _rssi = 0;
  private rssiIntervalId = null;
  private RSSI_INTERVAL_MS = 200;
  readSmartDriveSignalStrength() {
    if (this.smartDrive && this.smartDrive.connected) {
      this._bluetoothService
        .readRssi(this.smartDrive.address)
        .then((args: any) => {
          this._rssi = (this._rssi * 9) / 10 + (args.value * 1) / 10;
          this.currentSignalStrength = `${this._rssi.toFixed(1)}`;
        });
    }
  }

  async onMotorInfo(args: any) {
    // send current settings to SD
    this._onceSendSmartDriveSettings();
    // Log.D('onMotorInfo event');
    const motorInfo = args.data.motorInfo;

    // update motor state
    if (this.motorOn !== this.smartDrive.driving) {
      if (this.smartDrive.driving) {
        this._vibrator.cancel();
        this._vibrator.vibrate(250); // vibrate for 250 ms
      } else {
        this._vibrator.cancel();
        this._vibrator.vibrate([0, 250, 50, 250]); // vibrate twice
      }
    }
    this.motorOn = this.smartDrive.driving;
    // determine if we've used more battery percentage
    const batteryChange =
      this.smartDriveCurrentBatteryPercentage - this.smartDrive.battery;
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
    this.smartDriveCurrentBatteryPercentage = this.smartDrive.battery;
    // save the updated smartdrive battery
    appSettings.setNumber(DataKeys.SD_BATTERY, this.smartDrive.battery);
    // update speed display
    this.currentSpeed = motorInfo.speed;
    this.updateSpeedDisplay();
  }

  async onDistance(args: any) {
    const currentCoast = appSettings.getNumber(DataKeys.SD_DISTANCE_CASE);
    const currentDrive = appSettings.getNumber(DataKeys.SD_DISTANCE_DRIVE);

    // Log.D('onDistance event');
    const coastDistance = args.data.coastDistance;
    const driveDistance = args.data.driveDistance;

    if (coastDistance !== currentCoast || driveDistance !== currentDrive) {
      // save to the database
      this._throttledSmartDriveSaveFn({
        driveDistance: this.smartDrive.driveDistance,
        coastDistance: this.smartDrive.coastDistance
      });

      // save the updated distance
      appSettings.setNumber(
        DataKeys.SD_DISTANCE_CASE,
        this.smartDrive.coastDistance
      );
      appSettings.setNumber(
        DataKeys.SD_DISTANCE_DRIVE,
        this.smartDrive.driveDistance
      );
    }
  }

  async onSmartDriveVersion(args: any) {
    // Log.D('onSmartDriveVersion event');
    const mcuVersion = args.data.mcu;

    // update version displays
    this.mcuVersion = this.smartDrive.mcu_version_string;
    this.bleVersion = this.smartDrive.ble_version_string;

    // save the updated SmartDrive version info
    appSettings.setNumber(DataKeys.SD_VERSION_MCU, this.smartDrive.mcu_version);
    appSettings.setNumber(DataKeys.SD_VERSION_BLE, this.smartDrive.ble_version);
  }

  /*
   * DATABASE FUNCTIONS
   */
  getFirmwareData() {
    return this._sqliteService
      .getAll({ tableName: SmartDriveData.Firmwares.TableName })
      .then(objs => {
        // @ts-ignore
        return objs.map(o => SmartDriveData.Firmwares.loadFirmware(...o));
      })
      .then(mds => {
        // make the metadata
        return mds.reduce((data, md) => {
          const fname = md[SmartDriveData.Firmwares.FileName];
          const blob = SmartDriveData.Firmwares.loadFromFileSystem({
            filename: fname
          });
          if (blob && blob.length) {
            data[md[SmartDriveData.Firmwares.FirmwareName]] = {
              version: md[SmartDriveData.Firmwares.VersionName],
              filename: fname,
              id: md[SmartDriveData.Firmwares.IdName],
              changes: md[SmartDriveData.Firmwares.ChangesName],
              data: blob
            };
          }
          return data;
        }, {});
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Could not get firmware metadata:', err);
      });
  }

  saveErrorToDatabase(errorCode: string, errorId: number) {
    if (errorId === undefined) {
      // we use this when saving a local error
      errorId = -1;
    }
    if (errorId === -1 || errorId !== this.lastErrorId) {
      // update the error id
      if (errorId !== -1) {
        this.lastErrorId = errorId;
      }
      const newError = SmartDriveData.Errors.newError(errorCode, errorId);
      // now save the error into the table
      return this._sqliteService
        .insertIntoTable(SmartDriveData.Errors.TableName, newError)
        .catch(err => {
          Sentry.captureException(err);
          alert({
            title: L('failures.title'),
            message: `${L('failures.saving-error')}: ${err}`,
            okButtonText: L('buttons.ok')
          });
        });
    }
  }

  getRecentErrors(numErrors: number, offset: number = 0) {
    // Log.D('getRecentErrors', numErrors, offset);
    let errors = [];
    return this._sqliteService
      .getAll({
        tableName: SmartDriveData.Errors.TableName,
        orderBy: SmartDriveData.Errors.IdName,
        ascending: false,
        limit: numErrors,
        offset: offset
      })
      .then(rows => {
        if (rows && rows.length) {
          errors = rows.map(r => {
            const translationKey =
              'error-history.errors.' + (r && r[2]).toLowerCase();
            return {
              time: this._format(new Date(r && +r[1]), 'YYYY-MM-DD HH:mm'),
              code: L(translationKey),
              id: r && r[3],
              uuid: r && r[4]
            };
          });
        }
        // Log.D('errors', errors);
        return errors;
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Could not get errors', err);
        return errors;
      });
  }

  saveSmartDriveData(args: {
    driveDistance?: number;
    coastDistance?: number;
    battery?: number;
  }) {
    // save state to LS
    this.saveSmartDriveStateToLS();
    // now save to database
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
              [SmartDriveData.Info.CoastDistanceName]: updatedCoastDistance,
              [SmartDriveData.Info.HasBeenSentName]: 0
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
        Sentry.captureException(err);
        Log.E('Failed saving usage:', err);
        alert({
          title: L('failures.title'),
          message: `${L('failures.saving-usage')}: ${err}`,
          okButtonText: L('buttons.ok')
        });
      });
  }

  getTodaysUsageInfoFromDatabase() {
    return this._sqliteService
      .getLast(SmartDriveData.Info.TableName, SmartDriveData.Info.IdName)
      .then(e => {
        const date = new Date((e && e[1]) || null);
        if (e && e[1] && isToday(date)) {
          // @ts-ignore
          return SmartDriveData.Info.loadInfo(...e);
        } else {
          return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
        }
      })
      .catch(err => {
        Sentry.captureException(err);
        // nothing was found
        return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
      });
  }

  getUsageInfoFromDatabase(numDays: number) {
    const dates = SmartDriveData.Info.getPastDates(numDays);
    const usageInfo = dates.map(d => {
      return SmartDriveData.Info.newInfo(null, d, 0, 0, 0);
    });
    return this.getRecentInfoFromDatabase(6)
      .then(objs => {
        objs.map(o => {
          // @ts-ignore
          const obj = SmartDriveData.Info.loadInfo(...o);
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
        Sentry.captureException(err);
        console.log('error getting recent info:', err);
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

  getUnsentInfoFromDatabase(numEntries: number) {
    return this._sqliteService.getAll({
      tableName: SmartDriveData.Info.TableName,
      queries: {
        [SmartDriveData.Info.HasBeenSentName]: 0
      },
      orderBy: SmartDriveData.Info.IdName,
      ascending: true,
      limit: numEntries
    });
  }

  /**
   * Network Functions
   */
  sendSettingsToServer() {
    if (!this.hasSentSettings) {
      const settingsObj = {
        settings: this.settings.toObj(),
        switchControlSettings: this.switchControlSettings.toObj()
      };
      return this._kinveyService
        .sendSettings(settingsObj)
        .then(() => {
          this.hasSentSettings = true;
          appSettings.setBoolean(
            DataKeys.SD_SETTINGS_DIRTY_FLAG,
            this.hasSentSettings
          );
        })
        .catch(err => {
          Sentry.captureException(err);
        });
    } else {
      return Promise.resolve();
    }
  }

  sendErrorsToServer(numErrors: number) {
    return this._sqliteService
      .getAll({
        tableName: SmartDriveData.Errors.TableName,
        orderBy: SmartDriveData.Errors.IdName,
        queries: {
          [SmartDriveData.Errors.HasBeenSentName]: 0
        },
        ascending: true,
        limit: numErrors
      })
      .then(errors => {
        if (errors && errors.length) {
          // now send them one by one
          const promises = errors.map(e => {
            // @ts-ignore
            e = SmartDriveData.Errors.loadError(...e);
            return this._kinveyService.sendError(
              e,
              e[SmartDriveData.Errors.UuidName]
            );
          });
          return Promise.all(promises);
        }
      })
      .then(rets => {
        if (rets && rets.length) {
          const promises = rets
            .map(r => r.content.toJSON())
            .map(r => {
              const id = r['_id'];
              return this._sqliteService.updateInTable(
                SmartDriveData.Errors.TableName,
                {
                  [SmartDriveData.Errors.HasBeenSentName]: 1
                },
                {
                  [SmartDriveData.Errors.UuidName]: id
                }
              );
            });
          return Promise.all(promises);
        }
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Error sending errors to server:', err);
      });
  }

  sendInfosToServer(numInfo: number) {
    return this.getUnsentInfoFromDatabase(numInfo)
      .then(infos => {
        if (infos && infos.length) {
          // now send them one by one
          const promises = infos.map(i => {
            // @ts-ignore
            i = SmartDriveData.Info.loadInfo(...i);
            // update info date here
            i[SmartDriveData.Info.DateName] = new Date(
              i[SmartDriveData.Info.DateName]
            );
            return this._kinveyService.sendInfo(
              i,
              i[SmartDriveData.Info.UuidName]
            );
          });
          return Promise.all(promises);
        }
      })
      .then(rets => {
        if (rets && rets.length) {
          const promises = rets
            .map(r => r.content.toJSON())
            .map(r => {
              const id = r['_id'];
              return this._sqliteService.updateInTable(
                SmartDriveData.Info.TableName,
                {
                  [SmartDriveData.Info.HasBeenSentName]: 1
                },
                {
                  [SmartDriveData.Info.UuidName]: id
                }
              );
            });
          return Promise.all(promises);
        }
      })
      .catch(e => {
        Sentry.captureException(e);
        Log.E('Error sending infos to server:', e);
      });
  }

  private _sentryBreadCrumb(message: string) {
    Sentry.captureBreadcrumb({
      message,
      category: 'info',
      level: Level.Info
    });
  }
}
