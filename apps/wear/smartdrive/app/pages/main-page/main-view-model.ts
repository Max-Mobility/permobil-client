import { Log, Device } from '@permobil/core';
import { getDefaultLang, L, Prop } from '@permobil/nativescript';
import { closestIndexTo, format, isSameDay, isToday, subDays } from 'date-fns';
import { ReflectiveInjector } from 'injection-js';
import clamp from 'lodash/clamp';
import differenceBy from 'lodash/differenceBy';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import once from 'lodash/once';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import { AnimatedCircle } from 'nativescript-animated-circle';
import * as LS from 'nativescript-localstorage';
import { Pager } from 'nativescript-pager';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Level, Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { Vibrate } from 'nativescript-vibrate';
import { SwipeDismissLayout } from 'nativescript-wear-os';
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
import { BluetoothService, KinveyService, SensorChangedEventData, SensorService, SERVICES, SqliteService } from '../../services';
import { hideOffScreenLayout, showOffScreenLayout } from '../../utils';

const ambientTheme = require('../../scss/theme-ambient.scss').toString();
const defaultTheme = require('../../scss/theme-default.scss').toString();
const retroTheme = require('../../scss/theme-retro.scss').toString();

declare let com: any;

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
  @Prop() chinSize: number = 0;
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
  @Prop() estimatedDistanceDescription: string = '';
  @Prop() currentSpeed: number = 0.0;
  @Prop() currentSpeedDisplay: string = '0.0';
  // Speed (mph)';
  @Prop() currentSpeedDescription: string = '';
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
  private _ambientTimeView: View;
  private _powerAssistView: View;
  private _settingsLayout: SwipeDismissLayout;
  private _changeSettingsLayout: SwipeDismissLayout;
  private _errorHistoryLayout: SwipeDismissLayout;
  private _aboutLayout: SwipeDismissLayout;
  private _updatesLayout: SwipeDismissLayout;
  private _scanningLayout: SwipeDismissLayout;


  /**
   * SmartDrive Settings UI:
   */
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';

  /**
   * SmartDrive Wireless Updates:
   */
  @Prop() updateProgressText: string = '';
  @Prop() isUpdatingSmartDrive: boolean = false;
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
  SENSOR_DELAY_US: number = 10 * 1000;
  MAX_REPORTING_INTERVAL_US: number = 10 * 1000;
  // Estimated range min / max factors
  minRangeFactor: number = 2.0 / 100.0; // never estimate less than 2 mi per full charge
  maxRangeFactor: number = 12.0 / 100.0; // never estimate more than 12 mi per full charge
  // error related info
  lastErrorId: number = null;
  // whether the settings have been sent to the smartdrive
  hasSentSettingsToSmartDrive: boolean = false;

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
  private settings = new Device.Settings();
  private tempSettings = new Device.Settings();
  private switchControlSettings = new Device.SwitchControlSettings();
  private tempSwitchControlSettings = new Device.SwitchControlSettings();
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
  private initialized: boolean = false;
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
  private _kinveyService: KinveyService;
  private _debouncedOtaAction: any = null;
  private _throttledSmartDriveSaveFn: any = null;
  private _onceSendSmartDriveSettings: any = null;

  // Used for doing work while charing
  private chargingWorkTimeoutId: any = null;

  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.ACCESS_COARSE_LOCATION,
    android.Manifest.permission.READ_PHONE_STATE
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
        // android.os.PowerManager.PARTIAL_WAKE_LOCK, // - best battery life, but allows ambient mode
        android.os.PowerManager.SCREEN_DIM_WAKE_LOCK, // - moderate battery life, buttons still active
        // android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK, // - worst battery life - easy to see
        'com.permobil.smartdrive.wearos::WakeLock'
      );
      return this.wakeLock;
    }
  }

  constructor() {
    super();
    this._sentryBreadCrumb('Main-View-Model constructor.');
    // handle application lifecycle events
    this._sentryBreadCrumb('Registering app event handlers.');
    this.registerAppEventHandlers();
    this._sentryBreadCrumb('App event handlers registered.');
    // determine inset padding
    // https://developer.android.com/reference/android/content/res/Configuration.htm
    const androidConfig = ad
      .getApplicationContext()
      .getResources()
      .getConfiguration();
    const isCircleWatch = androidConfig.isScreenRound();
    const widthPixels = screen.mainScreen.widthPixels;
    const heightPixels = screen.mainScreen.heightPixels;
    const fontScale = androidConfig.fontScale; // floating point
    if (isCircleWatch) {
      this.insetPadding = Math.round(0.146467 * widthPixels);
      // if the height !== width then there is a chin!
      if (widthPixels !== heightPixels && widthPixels > heightPixels) {
        this.chinSize = widthPixels - heightPixels;
      }
    }
    Log.D('chinsize:', this.chinSize);
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
    if (this.initialized) {
      this._sentryBreadCrumb('Already initialized.');
      return;
    }

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

    // remember that we're already initialized
    this.initialized = true;
  }

  async initSqliteTables() {
    try {
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
      await Promise.all(sqlitePromises);
      console.timeEnd('SQLite_Init');
      this._sentryBreadCrumb('SQLite has been initialized.');
      const obj = await this._sqliteService
        .getLast(
          SmartDriveData.Errors.TableName,
          SmartDriveData.Errors.IdName
        );
      const lastErrorId = parseInt((obj && obj[3]) || -1);
      this.lastErrorId = lastErrorId;
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  async askForPermissions() {
    // Log.D('asking for permissions');
    // determine if we have shown the permissions request
    const hasShownRequest = appSettings.getBoolean(
      DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST
    ) || false;
    // will throw an error if permissions are denied, else will
    // return either true or a permissions object detailing all the
    // granted permissions. The error thrown details which
    // permissions were rejected
    const blePermission = android.Manifest.permission.ACCESS_COARSE_LOCATION;
    const reasons = [];
    const neededPermissions = this.permissionsNeeded.filter(
      p => !hasPermission(p) &&
        (application.android.foregroundActivity.shouldShowRequestPermissionRationale(p) ||
          !hasShownRequest)
    );
    // update the has-shown-request
    appSettings.setBoolean(
      DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST,
      true
    );
    const reasoning = {
      [android.Manifest.permission.ACCESS_COARSE_LOCATION]: L('permissions-reasons.coarse-location'),
      [android.Manifest.permission.READ_PHONE_STATE]: L('permissions-reasons.phone-state')
    };
    neededPermissions.map((r) => {
      reasons.push(reasoning[r]);
    });
    if (neededPermissions && neededPermissions.length > 0) {
      // this._sentryBreadCrumb('requesting permissions!', neededPermissions);
      await alert({
        title: L('permissions-request.title'),
        message: reasons.join('\n\n'),
        okButtonText: L('buttons.ok')
      });
      try {
        const permissions = await requestPermissions(neededPermissions, () => { });
        // now that we have permissions go ahead and save the serial number
        this.watchSerialNumber = android.os.Build.getSerial();
        appSettings.setString(
          DataKeys.WATCH_SERIAL_NUMBER,
          this.watchSerialNumber
        );
        this._kinveyService.watch_serial_number = this.watchSerialNumber;
        // and return true letting the caller know we got the permissions
        return true;
      } catch (permissionsObj) {
        const hasBlePermission =
          permissionsObj[blePermission] ||
          hasPermission(blePermission);
        if (hasBlePermission) {
          return true;
        } else {
          throw L('failures.permissions');
        }
      }
    } else if (hasPermission(blePermission)) {
      return Promise.resolve(true);
    } else {
      throw L('failures.permissions');
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

  async onAmbientTimeViewLoaded(args: EventData) {
    this._ambientTimeView = args.object as View;
  }

  async onPowerAssistViewLoaded(args: EventData) {
    this._powerAssistView = args.object as View;
  }

  async onMainPageLoaded(args: EventData) {
    this._sentryBreadCrumb('onMainPageLoaded');
    try {
      if (!this.hasAppliedTheme) {
        // apply theme
        if (this.isAmbient) {
          this.applyTheme('ambient');
        } else {
          this.applyTheme('default');
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('theme on startup error:', err);
    }
    // now init the ui
    try {
      await this.init();
    } catch (err) {
      Sentry.captureException(err);
      Log.E('activity init error:', err);
    }
    // get child references
    try {
      // store reference to pageer so that we can control what page
      // it's on programatically
      const page = args.object as Page;
      this.pager = page.getViewById('pager') as Pager;
      // get references to scanning and update circles to control
      // their spin state
      this.scanningProgressCircle = page.getViewById(
        'scanningProgressCircle'
      ) as AnimatedCircle;
      this.updateProgressCircle = page.getViewById(
        'updateProgressCircle'
      ) as AnimatedCircle;
    } catch (err) {
      Sentry.captureException(err);
      Log.E('onMainPageLoaded::error:', err);
    }
  }

  showAmbientTime() {
    if (this._powerAssistView) {
      this._powerAssistView.animate({
        opacity: 0,
        scale: { x: 0.5, y: 0.5 }
      });
    }
    if (this._ambientTimeView) {
      this._ambientTimeView.animate({
        translate: { x: 0, y: 0 },
        opacity: 1,
        scale: { x: 1, y: 1 }
      });
    }
  }

  showMainDisplay() {
    if (this._ambientTimeView) {
      this._ambientTimeView.animate({
        translate: { x: 0, y: screen.mainScreen.heightPixels },
        opacity: 0,
        scale: { x: 0.5, y: 0.5 }
      });
    }
    if (this._powerAssistView) {
      this._powerAssistView.animate({
        opacity: 1,
        scale: { x: 1, y: 1 }
      });
    }
  }

  private hasAppliedTheme: boolean = false;
  applyTheme(theme?: string) {
    this.hasAppliedTheme = true;
    // apply theme
    this._sentryBreadCrumb('applying theme');
    try {
      if (theme === 'ambient' || this.isAmbient) {
        themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
        this.showAmbientTime();
      } else {
        themes.applyThemeCss(defaultTheme, 'theme-default.scss');
        this.showMainDisplay();
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('apply theme error:', err);
    }
    this._sentryBreadCrumb('theme applied');
    this.applyStyle();
  }

  applyStyle() {
    this._sentryBreadCrumb('applying style');
    try {
      if (this.pager) {
        try {
          const children = this.pager._childrenViews;
          for (let i = 0; i < children.size; i++) {
            const child = children.get(i) as View;
            child._onCssStateChange();
          }
        } catch (err) {
          Sentry.captureException(err);
          Log.E('apply style error:', err);
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('apply style error:', err);
    }
    this._sentryBreadCrumb('style applied');
  }

  fullStop() {
    this.disablePowerAssist();
  }

  registerForSmartDriveEvents() {
    this.unregisterForSmartDriveEvents();
    // set up ota action handler
    // debounced function to keep people from pressing it too frequently
    this._debouncedOtaAction = debounce(this.smartDrive.onOTAActionTap, 500, {
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
    if (this.smartDrive === undefined || this.smartDrive === null) {
      return;
    }
    this._sentryBreadCrumb('Loading SD state from LS');
    const savedSd = LS.getItem(
      'com.permobil.smartdrive.wearos.smartdrive.data'
    );
    if (savedSd) {
      this.smartDrive.fromObject(savedSd);
    }
    // update the displayed smartdrive data
    this.smartDriveCurrentBatteryPercentage = (this.smartDrive && this.smartDrive.battery) || 0;
  }

  saveSmartDriveStateToLS() {
    this._sentryBreadCrumb('Saving SD state to LS');
    if (this.smartDrive) {
      LS.setItemObject(
        'com.permobil.smartdrive.wearos.smartdrive.data',
        this.smartDrive.data()
      );
    }
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
      // paused happens any time a new activity is shown
      // in front, e.g. showSuccess / showFailure - so we
      // probably don't want to fullstop on paused
    }
  }

  onActivityResumed(args: application.AndroidActivityBundleEventData) {
    if (this.isActivityThis(args.activity)) {
      this._sentryBreadCrumb('*** activityResumed ***');
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
      // similar to the app suspend / exit event.
      this.fullStop();
    }
  }

  onEnterAmbient() {
    this._sentryBreadCrumb('*** enterAmbient ***');
    this.isAmbient = true;
    // the user can enter ambient mode even when we hold wake lock
    // and use the keepAlive() function by full-palming the screen
    // or going underwater - so we have to handle the cases that
    // power assist is active or training mode is active.
    if (this.powerAssistActive) {
      this.disablePowerAssist();
    }
    if (this.isTraining) {
      this.onExitTrainingModeTap();
    }

    this.applyTheme();
  }

  onUpdateAmbient() {
    this.isAmbient = true;
    this.updateTimeDisplay();
    this._sentryBreadCrumb('updateAmbient');
  }

  onExitAmbient() {
    this._sentryBreadCrumb('*** exitAmbient ***');
    this.isAmbient = false;
    this.enableBodySensor();
    this.applyTheme();
    if (this.chargingWorkTimeoutId === null) {
      // reset our work interval
      this.chargingWorkTimeoutId = setInterval(
        this.doWhileCharged.bind(this),
        this.CHARGING_WORK_PERIOD_MS
      );
    }
  }

  onAppLaunch() { }

  onAppResume() {
    this.enableBodySensor();
  }

  onAppSuspend() {
    this._sentryBreadCrumb('*** appSuspend ***');
    this.fullStop();
  }

  onAppExit() {
    this._sentryBreadCrumb('*** appExit ***');
    this.fullStop();
  }

  onAppLowMemory() {
    this._sentryBreadCrumb('*** appLowMemory ***');
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
    };

    application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_BATTERY_CHANGED,
      batteryReceiverCallback
    );
  }

  onNewDay() {
    if (this.smartDrive) {
      // it's a new day, reset smartdrive battery to 0
      this.smartDrive.battery = 0;
      // update displayed battery percentage
      this.smartDriveCurrentBatteryPercentage = this.smartDrive.battery;
      // and save it
      this.saveSmartDriveStateToLS();
    }
  }

  registerForTimeUpdates() {
    // monitor the clock / system time for display and logging:
    this.updateTimeDisplay();
    const timeReceiverCallback = (androidContext, intent) => {
      try {
        this.updateTimeDisplay();
        this._sentryBreadCrumb('timeReceiverCallback');
        // update charts if date has changed
        if (!isSameDay(new Date(), this._lastChartDay)) {
          this.onNewDay();
          this.updateChartData();
        }
      } catch (error) {
        Sentry.captureException(error);
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
    const context = ad
      .getApplicationContext();
    const is24HourFormat = android.text.format.DateFormat.is24HourFormat(context);
    if (is24HourFormat) {
      this.currentTime = this._format(now, 'HH:mm');
      this.currentTimeMeridiem = ''; // in 24 hour format we don't need AM/PM
    } else {
      this.currentTime = this._format(now, 'h:mm');
      this.currentTimeMeridiem = this._format(now, 'A');
    }
    this.currentDay = this._format(now, 'ddd MMM D');
    this.currentYear = this._format(now, 'YYYY');
  }

  async onNetworkAvailable() {
    if (this._sqliteService === undefined) {
      // if this has gotten called before sqlite has been fully set up
      return;
    }
    // this._sentryBreadCrumb('Network available - sending errors');
    await this.sendErrorsToServer(10);
    // this._sentryBreadCrumb('Network available - sending info');
    await this.sendInfosToServer(10);
    // this._sentryBreadCrumb('Network available - sending settings');
    await this.sendSettingsToServer();
  }

  doWhileCharged() {
    // Since we're not sending a lot of data, we'll not bother
    // requesting network
    try {
      this.onNetworkAvailable();
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Error sending data to server', err);
    }
  }

  /**
   * View Loaded event handlers
   */
  onPagerLoaded() { }

  /**
   * Sensor Data Handlers
   */
  handleSensorData(args: SensorChangedEventData) {
    try {
      // if we're using litedata for android sensor plugin option
      // the data structure is simplified to reduce redundant data
      const parsedData = args.data;
      if (parsedData === null || parsedData === undefined) {
        this._sentryBreadCrumb('Received bad sensor data, turning off power assist!');
        this.disablePowerAssist();
        return;
      }

      if (
        parsedData.s === android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT
      ) {
        this.watchBeingWorn = (parsedData.d as any).state !== 0.0;
        if (!this.disableWearCheck) {
          if (!this.watchBeingWorn && this.powerAssistActive) {
            this._sentryBreadCrumb('Watch not being worn - disabling power assist!');
            // disable power assist if the watch is taken off!
            this.disablePowerAssist();
          }
        }
      }

      if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
        this.handleAccel(parsedData.d, parsedData.ts);
      }
    } catch (err) {
      Log.E('handleSensorData::err -', err);
      Sentry.captureException(err);
    }
  }

  private _previousData: any[] = [];
  private _previousDataLength: number = 4;
  handleAccel(acceleration: any, timestamp: number) {
    // ignore tapping if we're not in the right mode
    if (!this.powerAssistActive && !this.isTraining) {
      return;
    }
    // ignore tapping if we're not on the users wrist
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      return;
    }
    // add the data to our accel history
    this._previousData.push({
      accel: acceleration,
      timestamp
    });
    // since we're now running at a higher frequency, we want to
    // average every 4 points to get a reading
    if (this._previousData.length === this._previousDataLength) {
      // determine the average acceleration and timestamp
      const total = this._previousData.reduce((total, e) => {
        total.accel.x += e.accel.x;
        total.accel.y += e.accel.y;
        total.accel.z += e.accel.z;
        total.timestamp += e.timestamp;
        return total;
      });
      const averageAccel = {
        x: total.accel.x / this._previousDataLength,
        y: total.accel.y / this._previousDataLength,
        z: total.accel.z / this._previousDataLength,
      };
      const averageTimestamp = total.timestamp / this._previousDataLength;
      // reset the length of the data
      this._previousData = [];
      // set tap sensitivity threshold
      this.tapDetector.setSensitivity(this.settings.tapSensitivity);
      // now run the tap detector
      const didTap = this.tapDetector.detectTap(averageAccel, averageTimestamp);
      if (didTap) {
        // user has met threshold for tapping
        this.handleTap(/* averageTimestamp */);
      }
    }
  }

  async stopTaps() {
    if (this.sendTapTimeoutId) {
      clearTimeout(this.sendTapTimeoutId);
    }
    this.sendTapTimeoutId = null;
    this.numTaps = 0;
  }

  private sendTapTimeoutId: any = null;
  @Prop() numTaps: number = 0;
  async sendTap() {
    // do we have any taps to send now?
    if (this.numTaps > 0) {
      try {
        const ret = await this.smartDrive.sendTap();
        if (ret.status === android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
          // only decrease the number of unsent taps if it was
          // successfully sent and if we haven't gone to or below 0
          if (this.numTaps > 0)
            this.numTaps--;
        }
      } catch (err) {
        Sentry.captureException(err);
        Log.E('could not send tap', err);
        /*
          this.disablePowerAssist()
          .catch((err) => {
          Sentry.captureException(err);
          });
          setTimeout(() => {
          alert({
          title: L('failures.title'),
          message: err,
          okButtonText: L('buttons.ok')
          });
          }, 1000);
        */
      }
    }
    // do we have any remaining taps to send?
    if (this.numTaps > 0) {
      this.sendTapTimeoutId = setTimeout(this.sendTap.bind(this), 0);
    } else {
      this.sendTapTimeoutId = null;
    }
  }

  async handleTap(/* timestamp: number */) {
    this.hasTapped = true;
    // timeout for updating the power assist ring
    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
    }
    this.tapTimeoutId = setTimeout(() => {
      this.hasTapped = false;
    }, (TapDetector.TapLockoutTimeMs * 3) / 2);
    // vibrate for tap
    if (this.powerAssistActive || this.isTraining) {
      this._vibrator.cancel();
      this._vibrator.vibrate((TapDetector.TapLockoutTimeMs * 3) / 4);
    }
    // now send the tap
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      this.smartDrive.ableToSend &&
      this.hasSentSettingsToSmartDrive
    ) {
      // increase number of taps to send
      this.numTaps++;
      // make sure the handler sends the taps
      if (this.sendTapTimeoutId === null) {
        this.sendTapTimeoutId = setTimeout(this.sendTap.bind(this), 0);
      }
    }
  }

  async stopSmartDrive() {
    // turn off the motor if SD is connected
    if (this.smartDrive && this.smartDrive.ableToSend && this.motorOn) {
      this.smartDrive.stopMotor().catch(err => {
        Log.E('Could not stop motor', err);
        Sentry.captureException(err);
      });
    }
  }

  /**
   * Sensor Management
   */
  enableBodySensor(): boolean {
    try {
      return this._sensorService.startDeviceSensor(
        android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT,
        this.SENSOR_DELAY_US,
        this.MAX_REPORTING_INTERVAL_US
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error starting the body sensor', err);
      return false;
    }
  }

  enableTapSensor(): boolean {
    try {
      return this._sensorService.startDeviceSensor(
        android.hardware.Sensor.TYPE_LINEAR_ACCELERATION,
        this.SENSOR_DELAY_US,
        this.MAX_REPORTING_INTERVAL_US
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error starting the tap sensor', err);
      return false;
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
  }

  releaseCPU() {
    if (this.wakeLock && this.wakeLock.isHeld()) this.wakeLock.release();
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
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      alert({
        title: L('failures.title'),
        message: L('failures.must-wear-watch'),
        okButtonText: L('buttons.ok')
      });
      return;
    }
    const didEnableTapSensor = this.enableTapSensor();
    if (!didEnableTapSensor) {
      // TODO: translate this alert!
      alert({
        title: L('failures.title'),
        message: L('failures.could-not-enable-tap-sensor'),
        okButtonText: L('buttons.ok')
      });
      return;
    }
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
  onScanningLayoutLoaded(args: EventData) {
    this._scanningLayout = args.object as SwipeDismissLayout;
    this._scanningLayout.on(SwipeDismissLayout.dimissedEvent, () => {
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

  onUpdatesLayoutLoaded(args: EventData) {
    this._updatesLayout = args.object as SwipeDismissLayout;
    this._updatesLayout.on(SwipeDismissLayout.dimissedEvent, () => {
      // make sure to release the CPU
      this.releaseCPU();
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._updatesLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  async getSmartDriveVersion() {
    return new Promise((resolve, reject) => {
      if (this.smartDrive && this.smartDrive.hasVersionInfo()) {
        // if we've already talked to this SD and gotten its
        // version info then we can just resolve
        resolve(true);
        return;
      } else {
        this.updateProgressText = L('updates.connecting-to-smartdrive');
        // we've not talked to this SD before, so we should connect
        // and get its version info
        const remove = () => {
          this.smartDrive.off(
            SmartDrive.smartdrive_mcu_version_event,
            onVersion
          );
        };
        const connectTimeoutId = setTimeout(() => {
          remove();
          reject(L('updates.errors.timeout'));
        }, 30 * 1000);
        const onVersion = () => {
          remove();
          clearTimeout(connectTimeoutId);
          resolve();
        };
        this.smartDrive.on(
          SmartDrive.smartdrive_mcu_version_event,
          onVersion
        );
        this.connectToSavedSmartDrive()
          .then((didConnect) => {
            if (!didConnect) {
              remove();
              reject();
            }
          })
          .catch((err) => {
            remove();
            Sentry.captureException(err);
            reject(err);
          });
      }
    })
      .then(() => {
        // now that we've gotten the version, disconnect
        return this.disconnectFromSmartDrive();
      })
      .catch(err => {
        // make sure to disconnect if we had an error / rejection
        this.disconnectFromSmartDrive();
        throw err;
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
      const actionClass = 'action-' + last(a.split('.')) +
        ' compact';
      // translate the label
      const actionLabel = L(a); // .replace('ota.action.', '');
      return {
        label: actionLabel,
        func: this._debouncedOtaAction.bind(this.smartDrive, a),
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

  // TODO: don't use ':' with the errors - use [...] instead.
  private currentVersions = {};
  async checkForUpdates() {
    // don't allow swiping while we're checking for updates!
    (this._updatesLayout as any).swipeable = false;
    // update display of update progress
    this.smartDriveOtaProgress = 0;
    this.updateProgressText = L('updates.checking-for-updates');
    // some state variables for the update
    this.isUpdatingSmartDrive = false;
    // @ts-ignore
    this.updateProgressCircle.spin();
    try {
      this.currentVersions = await this.getFirmwareData();
    } catch (err) {
      return this.updateError(err, L('updates.errors.loading'), `${err}`);
    }
    this._sentryBreadCrumb(`Current FW Versions: ${this.currentVersions}`);
    let response = null;
    const query = {
      $or: [
        { _filename: 'SmartDriveBLE.ota' },
        { _filename: 'SmartDriveMCU.ota' }
      ],
      firmware_file: true
    };
    try {
      response = await this._kinveyService.getFile(undefined, query);
    } catch (err) {
      return this.updateError(err, L('updates.errors.getting'), `${err}`);
    }
    // Now that we have the metadata, check to see if we already
    // have the most up to date firmware files and download them
    // if we don't
    const mds = response.content.toJSON();
    let promises = [];
    // get the max firmware version for each firmware
    const maxes = mds.reduce((maxes, md) => {
      const v = SmartDriveData.Firmwares.versionStringToByte(md['version']);
      const fwName = md['_filename'];
      if (!maxes[fwName]) maxes[fwName] = 0;
      maxes[fwName] = Math.max(v, maxes[fwName]);
      return maxes;
    }, {});
    // filter only the firmwares that we don't have or that are newer
    // than the ones we have (and are the max)
    const fileMetaDatas = mds.filter(f => {
      const v = SmartDriveData.Firmwares.versionStringToByte(f['version']);
      const fwName = f['_filename'];
      const current = this.currentVersions[fwName];
      const currentVersion = current && current.version;
      const isMax = v === maxes[fwName];
      return isMax && (!current || v > currentVersion);
    });
    // @ts-ignore
    this.updateProgressCircle.stopSpinning();
    // do we need to download any firmware files?
    if (fileMetaDatas && fileMetaDatas.length) {
      // update progress text
      this.updateProgressText = L('updates.downloading-new-firmwares');
      // reset ota progress to 0 to show downloading progress
      this.smartDriveOtaProgress = 0;
      // update progress circle
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
    let files = null;
    try {
      files = await Promise.all(promises);
    } catch (err) {
      return this.updateError(err, L('updates.errors.downloading'), `${err}`);
    }
    // Now that we have the files, write them to disk and update
    // our local metadata
    promises = [];
    if (files && files.length) {
      promises = files.map(this.updateFirmwareData.bind(this));
    }
    try {
      await Promise.all(promises);
    } catch (err) {
      return this.updateError(err, L('updates.errors.saving'), `${err}`);
    }
    // Now let's connect to the SD to make sure that we get it's
    // version information
    try {
      await this.getSmartDriveVersion();
    } catch (err) {
      return this.updateError(err, L('updates.errors.connecting'), err);
    }
    // Now perform the SmartDrive updates if we need to
    // re-enable swipe close of the updates layout
    (this._updatesLayout as any).swipeable = true;
    // now see what we need to do with the data
    this._sentryBreadCrumb('Finished downloading updates.');
    this.performSmartDriveWirelessUpdate();
  }

  async performSmartDriveWirelessUpdate() {
    this.updateProgressText = '';
    // @ts-ignore
    this.updateProgressCircle.stopSpinning();
    // do we need to update? - check against smartdrive version
    const bleVersion = this.currentVersions['SmartDriveBLE.ota'].version;
    const mcuVersion = this.currentVersions['SmartDriveMCU.ota'].version;
    if (this.smartDrive.isMcuUpToDate(mcuVersion) && this.smartDrive.isBleUpToDate(bleVersion)) {
      // smartdrive is already up to date
      this.stopUpdates(L('updates.up-to-date'));
      setTimeout(() => {
        hideOffScreenLayout(this._updatesLayout, { x: 500, y: 0 });
        this.previousLayout();
      }, 5000);
      return;
    }
    // the smartdrive is not up to date, so we need to update it.
    // reset the ota progress to 0 (since downloaing may have used it)
    this.smartDriveOtaProgress = 0;
    // get info out to tell the user
    const version = SmartDriveData.Firmwares.versionByteToString(
      Math.max(mcuVersion, bleVersion)
    );
    Log.D('got version', version);
    // show dialog to user informing them of the version number and changes
    const changes = Object.keys(this.currentVersions).map(
      k => this.currentVersions[k].changes
    );
    // Log.D('got changes', changes);
    await alert({
      title: L('updates.version') + ' ' + version,
      message: L('updates.changes') + '\n\n' + flatten(changes).join('\n\n'),
      okButtonText: L('buttons.ok')
    });
    this.isUpdatingSmartDrive = true;
    this._sentryBreadCrumb('Beginning SmartDrive update');
    const bleFw = new Uint8Array(
      this.currentVersions['SmartDriveBLE.ota'].data
    );
    const mcuFw = new Uint8Array(
      this.currentVersions['SmartDriveMCU.ota'].data
    );
    this._sentryBreadCrumb(`mcu length: ${mcuFw.length}`);
    this._sentryBreadCrumb(`ble length: ${bleFw.length}`);
    // maintain CPU resources while updating
    this.maintainCPU();
    // smartdrive needs to update
    let otaStatus = '';
    try {
      otaStatus = await this.smartDrive
        .performOTA(bleFw, mcuFw, bleVersion, mcuVersion, 300 * 1000);
    } catch (err) {
      return this.updateError(err, L('updates.failed'), `${err}`);
    }
    const updateMsg = L(otaStatus);
    this.stopUpdates(updateMsg, false);
  }

  async updateFirmwareData(f: any) {
    const id = this.currentVersions[f.name] && this.currentVersions[f.name].id;
    // update the data in the db
    const newFirmware = SmartDriveData.Firmwares.newFirmware(
      f.version,
      f.name,
      undefined,
      f.changes
    );
    // update current versions
    this.currentVersions[f.name] = {
      version: f.version,
      changes: f.changes,
      filename: newFirmware[SmartDriveData.Firmwares.FileName],
      data: f.data
    };
    // save binary file to fs
    this._sentryBreadCrumb(`saving file ${this.currentVersions[f.name].filename}`);
    SmartDriveData.Firmwares.saveToFileSystem({
      filename: this.currentVersions[f.name].filename,
      data: f.data
    });
    if (id !== undefined) {
      this.currentVersions[f.name].id = id;
      newFirmware[SmartDriveData.Firmwares.IdName] = id;
      await this._sqliteService.updateInTable(
        SmartDriveData.Firmwares.TableName,
        {
          [SmartDriveData.Firmwares.VersionName]: newFirmware[SmartDriveData.Firmwares.VersionName],
          [SmartDriveData.Firmwares.ChangesName]: newFirmware[SmartDriveData.Firmwares.ChangesName],
          [SmartDriveData.Firmwares.FileName]: newFirmware[SmartDriveData.Firmwares.FileName]
        },
        {
          [SmartDriveData.Firmwares.IdName]: id
        }
      );
    } else {
      await this._sqliteService.insertIntoTable(
        SmartDriveData.Firmwares.TableName,
        newFirmware
      );
    }
  }

  updateError(err: any, msg: string, alertMsg?: string) {
    Sentry.captureException(err);
    Log.E(msg);
    if (alertMsg !== undefined) {
      alert({
        title: L('updates.failed'),
        message: alertMsg,
        okButtonText: L('buttons.ok')
      });
    }
    this.stopUpdates(msg, true);
  }

  stopUpdates(msg: string, doCancelOta: boolean = true) {
    this.releaseCPU();
    this.updateProgressText = msg;
    // make sure we update the state variable
    this.isUpdatingSmartDrive = false;
    // re-enable swipe close of the updates layout
    (this._updatesLayout as any).swipeable = true;
    if (doCancelOta && this.smartDrive) {
      this.smartDrive.cancelOTA();
    }
  }

  /**
   * Error History Page Handlers
   */

  // TODO: add tap listener for each error showing what to do
  onErrorHistoryLayoutLoaded(args: EventData) {
    // show the chart
    this._errorHistoryLayout = args.object as SwipeDismissLayout;
    this.errorsScrollView = this._errorHistoryLayout.getViewById(
      'errorsScrollView'
    ) as ScrollView;
    this._errorHistoryLayout.on(SwipeDismissLayout.dimissedEvent, () => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._errorHistoryLayout, { x: 500, y: 0 });
      this.previousLayout();
      // clear the error history data when it's not being displayed to save on memory
      this.errorHistoryData.splice(0, this.errorHistoryData.length);
    });
  }

  async onLoadMoreErrors() {
    let recents = await this.getRecentErrors(10, this.errorHistoryData.length);
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
  onSettingsLayoutLoaded(args: EventData) {
    this._settingsLayout = args.object as SwipeDismissLayout;
    this.settingsScrollView = this._settingsLayout.getViewById(
      'settingsScrollView'
    ) as ScrollView;
    this._settingsLayout.on(SwipeDismissLayout.dimissedEvent, () => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._settingsLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  onAboutLayoutLoaded(args: EventData) {
    // show the chart
    this._aboutLayout = args.object as SwipeDismissLayout;
    this.aboutScrollView = this._aboutLayout.getViewById(
      'aboutScrollView'
    ) as ScrollView;
    this._aboutLayout.on(SwipeDismissLayout.dimissedEvent, () => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this._aboutLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  async updateBatteryChart(sdData: any[]) {
    try {
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
      // this._sentryBreadCrumb('Highest Battery Value:', maxBattery);
      this.batteryChartMaxValue = maxBattery.toFixed(0);
      this.batteryChartData = batteryData;
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  async updateDistanceChart(sdData: any[]) {
    try {
      // we've asked for one more day than needed so that we can
      // compute distance differences, keep a reference to the first
      // before we remove it below with the call to slice()
      const oldest = sdData[0];
      // update distance data
      let oldestDist = oldest[SmartDriveData.Info.DriveDistanceName];
      const distanceData = sdData.slice(1).map(e => {
        let diff = 0;
        const dist = e[SmartDriveData.Info.DriveDistanceName];
        if (dist > 0) {
          // make sure we only compute diffs between valid distances
          if (oldestDist > 0) {
            diff = dist - oldestDist;
          }
          oldestDist = Math.max(dist, oldestDist);
          diff = SmartDrive.motorTicksToMiles(diff);
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
      // this._sentryBreadCrumb('Highest Distance Value:', maxDist);
      if (this.settings.units === 'Metric') {
        this.distanceChartMaxValue = (maxDist * 1.609).toFixed(1);
      } else {
        this.distanceChartMaxValue = maxDist.toFixed(1);
      }
      this.distanceChartData = distanceData;
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  async updateEstimatedRange() {
    try {
      // now get the past data (regardless of when it was collected)
      // for computing the estimated range:
      const sdData = await this.getRecentInfoFromDatabase(7) as any[];
      // update estimated range based on battery / distance
      let sumDistance = 0;
      let sumBattery = 0;
      // set the range factor to be default (half way between the min/max)
      let rangeFactor = (this.minRangeFactor + this.maxRangeFactor) / 2.0;
      if (sdData && sdData.length) {
        let oldestDist = sdData[0][SmartDriveData.Info.DriveDistanceName];
        sdData.map(e => {
          const dist = e[SmartDriveData.Info.DriveDistanceName];
          if (dist > 0) {
            // make sure we only compute diffs between valid distances
            if (oldestDist > 0) {
              const diff = dist - oldestDist;
              // used for range computation
              sumDistance += diff;
              sumBattery += e[SmartDriveData.Info.BatteryName];
            }
            oldestDist = Math.max(dist, oldestDist);
          }
        });
      }
      if (sumDistance && sumBattery) {
        // convert from ticks to miles
        sumDistance = SmartDrive.motorTicksToMiles(sumDistance);
        // now compute the range factor
        rangeFactor = clamp(
          sumDistance / sumBattery,
          this.minRangeFactor,
          this.maxRangeFactor
        );
      }
      // estimated distance is always in miles
      this.estimatedDistance =
        this.smartDriveCurrentBatteryPercentage * rangeFactor;
      // save the updated estimated range for complication use
      appSettings.setNumber(DataKeys.SD_ESTIMATED_RANGE, this.estimatedDistance);
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  async updateChartData() {
    try {
      // this._sentryBreadCrumb('Updating Chart Data / Display');
      const sdData = await this.getUsageInfoFromDatabase(7) as any[];
      // keep track of the most recent day so we know when to update
      this._lastChartDay = new Date(last(sdData).date);
      // now update the charts
      await this.updateBatteryChart(sdData.slice(1));
      await this.updateDistanceChart(sdData);
      await this.updateSharedUsageInfo(sdData);
      // update the estimated range (doesn't use weekly usage info -
      // since that may not have any data, so it internally pulls the
      // most recent 7 records (which contain real data
      await this.updateEstimatedRange();
      // now actually update the display of the distance
      this.updateSpeedDisplay();
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  onSettingsTap() {
    if (this.settingsScrollView) {
      // reset to to the top when entering the page
      this.settingsScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this._settingsLayout);
    this.enableLayout('settings');
  }

  onSettingsInfoItemTap() {
    const messageKey = 'settings.description.' + this.activeSettingToChange;
    const message = this.changeSettingKeyString + '\n\n' + L(messageKey);
    alert({
      title: L('settings.information'),
      message: message,
      okButtonText: L('buttons.ok')
    });
  }

  onChangeSettingsItemTap(args: EventData) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settings);
    this.tempSwitchControlSettings.copy(this.switchControlSettings);
    const tappedId = (args.object as any).id as string;
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
    // this.displayRssi = !this.displayRssi;
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

  onChangeSettingsLayoutLoaded(args: EventData) {
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
    // make sure to save the units setting for the complications
    appSettings.setString(
      DataKeys.SD_UNITS,
      this.settings.units.toLowerCase()
    );
    // save state and local settings
    appSettings.setBoolean(
      DataKeys.SD_SETTINGS_DIRTY_FLAG,
      this.hasSentSettings
    );
    appSettings.setBoolean(
      DataKeys.REQUIRE_WATCH_BEING_WORN,
      this.disableWearCheck
    );
    // now save the actual device settings objects
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
          if (this.hasSentSettingsToSmartDrive) {
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

  async enablePowerAssist() {
    this._sentryBreadCrumb('Enabling power assist');
    // only enable power assist if we're on the user's wrist
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      alert({
        title: L('failures.title'),
        message: L('failures.must-wear-watch'),
        okButtonText: L('buttons.ok')
      });
      return;
    } else if (this.hasSavedSmartDrive()) {
      try {
        // make sure everything works
        const didEnsure = await this.ensureBluetoothCapabilities();
        if (!didEnsure) {
          return false;
        }
        // now actually set up power assist
        clearInterval(this.chargingWorkTimeoutId);
        this.chargingWorkTimeoutId = null;
        this.tapDetector.reset();
        this.maintainCPU();
        this.powerAssistState = PowerAssist.State.Disconnected;
        this.powerAssistActive = true;
        this.updatePowerAssistRing();
        const didConnect = await this.connectToSavedSmartDrive();
        if (didConnect) {
          // vibrate for enabling power assist
          this._vibrator.vibrate(200); // vibrate for 250 ms
          // make sure to clear out any previous tapping state
          this.stopTaps();
          // enable the tap sensor
          const didEnableTapSensor = this.enableTapSensor();
          if (!didEnableTapSensor) {
            // TODO: translate this alert!
            alert({
              title: L('failures.title'),
              message: L('failures.could-not-enable-tap-sensor'),
              okButtonText: L('buttons.ok')
            });
            throw 'Could not enable tap sensor for power assist!';
          } else {
            this._ringTimerId = setInterval(
              this.blinkPowerAssistRing.bind(this),
              this.RING_TIMER_INTERVAL_MS
            );
          }
        } else {
          this._sentryBreadCrumb('Did not connect, disabling power assist');
          this.disablePowerAssist();
        }
      } catch (err) {
        Sentry.captureException(err);
        // Log.E(`Caught error, disabling power assist: ${err}`);
        this.disablePowerAssist();
      }
    } else {
      const didSave = await this.saveNewSmartDrive();
      if (didSave) {
        setTimeout(this.enablePowerAssist.bind(this), 300);
      } else {
        this._sentryBreadCrumb('SmartDrive was not saved!');
      }
    }
  }

  private _showDebugChartData = false;
  debugChartTap() {
    this._showDebugChartData = !this._showDebugChartData;
    this.updateChartData();
  }

  async disablePowerAssist() {
    this._sentryBreadCrumb('Disabling power assist');

    // update state variables
    this.powerAssistActive = false;
    this.motorOn = false;

    // make sure to stop any pending taps
    this.stopTaps();

    // decrease energy consumption
    this.disableTapSensor();
    this.releaseCPU();
    this.powerAssistState = PowerAssist.State.Inactive;

    // update UI
    if (this._ringTimerId) {
      clearInterval(this._ringTimerId);
    }
    this.updatePowerAssistRing();
    if (!this.powerAssistActive && !this.motorOn) {
      return;
    }

    // turn off the smartdrive
    try {
      await this.disconnectFromSmartDrive();
    } catch (err) {
      Sentry.captureException(err);
    }

    // reset our work interval
    if (this.chargingWorkTimeoutId === null) {
      this.chargingWorkTimeoutId = setInterval(
        this.doWhileCharged.bind(this),
        this.CHARGING_WORK_PERIOD_MS
      );
    }

    return Promise.resolve();
  }

  showScanning() {
    showOffScreenLayout(this._scanningLayout);
    // disable swipe close of the updates layout
    (this._scanningLayout as any).swipeable = false;
    this.enableLayout('scanning');
  }

  hideScanning() {
    // re-enable swipe close of the updates layout
    (this._scanningLayout as any).swipeable = true;
    hideOffScreenLayout(this._scanningLayout, { x: 500, y: 0 });
    this.previousLayout();
    // @ts-ignore
    this.scanningProgressCircle.stopSpinning();
  }

  onConnectPushTrackerTap() {
    // TODO: flesh this out to show UI and connect to PushTracker
    // Mobile App to receive credentials.
  }

  async onPairingTap() {
    try {
      const didSave = await this.saveNewSmartDrive();
      if (didSave) {
        alert({
          title: L('warnings.title.notice'),
          message: `${L('settings.paired-to-smartdrive')}\n\n${this.smartDrive.address}`,
          okButtonText: L('buttons.ok')
        });
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Could not pair', err);
    }
  }

  async ensureBluetoothCapabilities() {
    try {
      // ensure we have the permissions
      await this.askForPermissions();
      // ensure bluetooth radio is enabled
      // Log.D('checking radio is enabled');
      const radioEnabled = await this._bluetoothService.radioEnabled();
      if (!radioEnabled) {
        Log.D('radio is not enabled!');
        // if the radio is not enabled, we should turn it on
        const didEnable = await this._bluetoothService.enableRadio();
        if (!didEnable) {
          // we could not enable the radio!
          // throw 'BLE OFF';
          return false;
        }
        // await a promise here to ensure that the radio is back on!
        const promise = new Promise((resolve, reject) => {
          setTimeout(resolve, 500);
        });
        await promise;
      }
      // ensure bluetoothservice is functional
      await this._bluetoothService.initialize();
      return true;
    } catch (err) {
      return false;
    }
  }

  async saveNewSmartDrive(): Promise<any> {
    this._sentryBreadCrumb('Saving new SmartDrive');
    try {
      // make sure everything works
      const didEnsure = await this.ensureBluetoothCapabilities();
      if (!didEnsure) {
        return false;
      }
      this.showScanning();
      // scan for smartdrives
      // @ts-ignore
      this.scanningProgressCircle.spin();
      await this._bluetoothService.scanForSmartDrives(3);
      this.hideScanning();
      this._sentryBreadCrumb(`Discovered ${BluetoothService.SmartDrives.length} SmartDrives`);

      // make sure we have smartdrives
      if (BluetoothService.SmartDrives.length <= 0) {
        alert({
          title: L('failures.title'),
          message: L('failures.no-smartdrives-found'),
          okButtonText: L('buttons.ok')
        });
        return false;
      }

      // make sure we have only one smartdrive
      if (BluetoothService.SmartDrives.length > 1) {
        alert({
          title: L('failures.title'),
          message: L('failures.too-many-smartdrives-found'),
          okButtonText: L('buttons.ok')
        });
        return false;
      }

      // these are the smartdrives that are pushed into an array on the bluetooth service
      const sds = BluetoothService.SmartDrives;

      // map the smart drives to get all of the addresses
      const addresses = sds.map(sd => `${sd.address}`);

      const result = await action({
        title: L('settings.select-smartdrive'),
        message: L('settings.select-smartdrive'),
        actions: addresses,
        cancelButtonText: L('buttons.cancel')
      });
      // if user selected one of the smartdrives in the action dialog, attempt to connect to it
      if (addresses.indexOf(result) > -1) {
        // save the smartdrive here
        this.updateSmartDrive(result);
        appSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      Sentry.captureException(err);
      this.hideScanning();
      Log.E('could not scan', err);
      alert({
        title: L('failures.title'),
        message: `${L('failures.scan')}\n\n${err}`,
        okButtonText: L('buttons.ok')
      });
      return false;
    }
  }

  async connectToSmartDrive(address: string) {
    this._sentryBreadCrumb('Connecting to SmartDrive ' + address);
    this.updateSmartDrive(address);
    // now connect to smart drive
    try {
      const didEnsure = await this.ensureBluetoothCapabilities();
      if (!didEnsure) {
        Log.E('could not ensure bluetooth capabilities!');
        return false;
      }
      await this.smartDrive.connect();
      return true;
    } catch (err) {
      Sentry.captureException(err);
      alert({
        title: L('failures.title'),
        message: L('failures.connect') + '\n\n' + address,
        okButtonText: L('buttons.ok')
      });
      return false;
    }
  }

  hasSavedSmartDrive(): boolean {
    return (
      this._savedSmartDriveAddress !== null &&
      this._savedSmartDriveAddress.length > 0
    );
  }

  async connectToSavedSmartDrive() {
    if (!this.hasSavedSmartDrive()) {
      const didSave = await this.saveNewSmartDrive();
      if (!didSave) {
        return false;
      }
    }

    // try to connect to the SmartDrive
    return this.connectToSmartDrive(this._savedSmartDriveAddress);
  }

  async disconnectFromSmartDrive() {
    if (this.smartDrive) {
      await this.smartDrive.disconnect();
      this.motorOn = false;
    }
  }

  retrySmartDriveConnection() {
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      !this.smartDrive.connected
    ) {
      setTimeout(this.connectToSavedSmartDrive.bind(this), 1 * 1000);
    }
  }

  async sendSmartDriveSettings() {
    // send the current settings to the SD
    try {
      let ret = null;
      ret = await this.smartDrive.sendSettingsObject(this.settings);
      if (ret.status !== android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
        throw 'Send Settings bad status: ' + ret.status;
      }
      ret = await this.smartDrive.sendSwitchControlSettingsObject(this.switchControlSettings);
      if (ret.status !== android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
        throw 'Send Switch Control Settings bad status: ' + ret.status;
      }
      this.hasSentSettingsToSmartDrive = true;
    } catch (err) {
      Sentry.captureException(err);
      /*
      // indicate failure
      const msg =
        L('failures.send-settings') +
        '\n\n' +
        this._savedSmartDriveAddress +
        '\n\n' +
        err;
      alert({
        title: L('failures.title'),
        message: msg,
        okButtonText: L('buttons.ok')
      });
      */
      // make sure we retry this while we're connected
      this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
    }
  }

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  async onSmartDriveConnect() {
    this.powerAssistState = PowerAssist.State.Connected;
    this.updatePowerAssistRing();
    this.hasSentSettingsToSmartDrive = false;
    this._onceSendSmartDriveSettings = once(this.sendSmartDriveSettings);
    /*
    if (this.rssiIntervalId) {
      clearInterval(this.rssiIntervalId);
      this.rssiIntervalId = null;
    }
    this.rssiIntervalId = setInterval(
      this.readSmartDriveSignalStrength.bind(this),
      this.RSSI_INTERVAL_MS
    );
    */
  }

  async onSmartDriveDisconnect() {
    /*
    if (this.rssiIntervalId) {
      clearInterval(this.rssiIntervalId);
      this.rssiIntervalId = null;
    }
    */
    // make sure to stop any pending taps
    this.stopTaps();
    // handle the case that the motor is on
    if (this.motorOn) {
      // record disconnect error - the SD should never be on when
      // we disconnect!
      const errorCode = this.smartDrive.getBleDisconnectError();
      this.saveErrorToDatabase(errorCode, undefined);
    }
    this.motorOn = false;
    this.hasSentSettingsToSmartDrive = false;
    if (this.powerAssistActive) {
      this.powerAssistState = PowerAssist.State.Disconnected;
      this.updatePowerAssistRing();
      this.retrySmartDriveConnection();
    }
  }

  async onSmartDriveError(args: any) {
    // this._sentryBreadCrumb('onSmartDriveError event');
    const errorType = args.data.errorType;
    const errorId = args.data.errorId;
    // save the error into the database
    this.saveErrorToDatabase(errorType, errorId);
  }

  /*
  private _rssi = 0;
  private rssiIntervalId = null;
  private RSSI_INTERVAL_MS = 500;
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
  */

  async onMotorInfo(args: any) {
    // send current settings to SD
    this._onceSendSmartDriveSettings();
    // this._sentryBreadCrumb('onMotorInfo event');
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

    // this._sentryBreadCrumb('onDistance event');
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
      // make sure to save the units setting as well
      appSettings.setString(
        DataKeys.SD_UNITS,
        this.settings.units.toLowerCase()
      );
    }
  }

  async onSmartDriveVersion() {
    // this._sentryBreadCrumb('onSmartDriveVersion event');
    // const mcuVersion = args.data.mcu;

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
  async getFirmwareData() {
    try {
      const objs = await this._sqliteService
        .getAll({ tableName: SmartDriveData.Firmwares.TableName });
      // @ts-ignore
      const mds = objs.map(o => SmartDriveData.Firmwares.loadFirmware(...o));
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
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Could not get firmware metadata:', err);
      return {};
    }
  }

  async saveErrorToDatabase(errorCode: string, errorId: number) {
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
            message: `${L('failures.saving-error')}\n\n${err}`,
            okButtonText: L('buttons.ok')
          });
        });
    }
  }

  async getRecentErrors(numErrors: number, offset: number = 0) {
    // this._sentryBreadCrumb('getRecentErrors', numErrors, offset);
    let errors = [];
    try {
      const rows = await this._sqliteService
        .getAll({
          tableName: SmartDriveData.Errors.TableName,
          orderBy: SmartDriveData.Errors.IdName,
          ascending: false,
          limit: numErrors,
          offset: offset
        });
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
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Could not get errors', err);
    }
    return errors;
  }

  async saveSmartDriveData(args: {
    driveDistance?: number;
    coastDistance?: number;
    battery?: number;
  }) {
    try {
      // save state to LS
      this.saveSmartDriveStateToLS();
      // now save to database
      const driveDistance = args.driveDistance || 0;
      const coastDistance = args.coastDistance || 0;
      const battery = args.battery || 0;
      if (driveDistance === 0 && coastDistance === 0 && battery === 0) {
        return;
      }
      const infos = await this.getRecentInfoFromDatabase(1);
      // this._sentryBreadCrumb('recent infos', infos);
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
          await this._sqliteService.insertIntoTable(
            SmartDriveData.Info.TableName,
            firstEntry
          );
        }
      }
      const u = await this.getTodaysUsageInfoFromDatabase();
      if (u[SmartDriveData.Info.IdName]) {
        // there was a record, so we need to update it. we add the
        // already used battery plus the amount of new battery
        // that has been used
        const updates = SmartDriveData.Info.updateInfo(args, u);
        await this._sqliteService.updateInTable(
          SmartDriveData.Info.TableName,
          updates,
          {
            [SmartDriveData.Info.IdName]: u.id
          }
        );
      } else {
        const newEntry = SmartDriveData.Info.newInfo(
          undefined,
          new Date(),
          battery,
          driveDistance,
          coastDistance
        );
        // this is the first record, so we create it
        await this._sqliteService.insertIntoTable(
          SmartDriveData.Info.TableName,
          newEntry
        );
      }
      this.updateChartData();
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Failed saving usage:', err);
    }
  }

  async getTodaysUsageInfoFromDatabase() {
    try {
      const e = await this._sqliteService
        .getLast(SmartDriveData.Info.TableName, SmartDriveData.Info.IdName);
      const date = new Date((e && e[1]) || null);
      if (e && e[1] && isToday(date)) {
        // @ts-ignore
        return SmartDriveData.Info.loadInfo(...e);
      } else {
        return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
      }
    } catch (err) {
      Sentry.captureException(err);
      // nothing was found
      return SmartDriveData.Info.newInfo(undefined, new Date(), 0, 0, 0);
    }
  }

  async updateSharedUsageInfo(sdData: any[]) {
    try {
      // aggregate the data
      const data = {};
      // we've asked for one more day than needed so that we can
      // compute distance differences, keep a reference to the first
      // before we remove it below with the call to slice()
      const oldest = sdData[0];
      // update distance data
      let oldestDrive = oldest[SmartDriveData.Info.DriveDistanceName];
      let oldestTotal = oldest[SmartDriveData.Info.CoastDistanceName];
      sdData.slice(1).map(e => {
        // record the date
        const drive = e[SmartDriveData.Info.DriveDistanceName];
        const total = e[SmartDriveData.Info.CoastDistanceName];
        // determine drive ditance
        let driveDiff = 0;
        if (drive > 0) {
          // make sure we only compute diffs between valid distances
          if (oldestDrive > 0) {
            driveDiff = drive - oldestDrive;
          }
          oldestDrive = Math.max(drive, oldestDrive);
          // we only save it in miles
          driveDiff = SmartDrive.motorTicksToMiles(driveDiff);
        }
        // determine total distance
        let totalDiff = 0;
        if (total > 0) {
          // make sure we only compute diffs between valid distances
          if (oldestTotal > 0) {
            totalDiff = total - oldestTotal;
          }
          oldestTotal = Math.max(total, oldestTotal);
          // we only save it in miles
          totalDiff = SmartDrive.caseTicksToMiles(totalDiff);
        }
        // compute the date for the data
        const date = this._format(new Date(e.date), 'YYYY/MM/DD');
        // now save the drive / total in this record
        data[date] = {
          drive: driveDiff,
          total: totalDiff
        };
      });
      // Log.D('saving data', data);
      const serialized = JSON.stringify(data);
      // there is only ever one record in this table, so we always insert - the db will perform upsert for us.
      const values = new android.content.ContentValues();
      values.put('data', serialized);
      const uri = ad
        .getApplicationContext()
        .getContentResolver()
        .insert(com.permobil.smartdrive.wearos.DatabaseHandler.CONTENT_URI, values);
      if (uri === null) {
        Log.E('Could not insert into content resolver!');
      }
    } catch (err) {
      Log.E(err);
      Sentry.captureException(err);
    }
  }

  async getUsageInfoFromDatabase(numDays: number) {
    const dates = SmartDriveData.Info.getPastDates(numDays);
    let coastDistance = 0;
    let driveDistance = 0;
    const usageInfo = dates.map(d => {
      if (this._showDebugChartData) {
        const battery = Math.random() * 50 + 30;
        const mileDiff = (battery * (Math.random() * 2.0 + 6.0)) / 100.0;
        driveDistance += SmartDrive.milesToMotorTicks(mileDiff);
        coastDistance += SmartDrive.milesToCaseTicks(mileDiff);
        return SmartDriveData.Info.newInfo(null, d, battery, driveDistance, coastDistance);
      } else {
        return SmartDriveData.Info.newInfo(null, d, 0, 0, 0);
      }
    });
    // will get one more than we need since getPastDates() returns
    // (numDays + 1) elements in the array
    return this.getRecentInfoFromDatabase(numDays + 1)
      .then((objs: any[]) => {
        objs.map((o: any) => {
          // @ts-ignore
          const obj = SmartDriveData.Info.loadInfo(...o);
          const objDate = new Date(obj.date);
          const index = closestIndexTo(objDate, dates);
          // const usageDate = dates[index];
          if (index > -1) {
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

  async getRecentInfoFromDatabase(numRecentEntries: number) {
    try {
      return this._sqliteService
        .getAll({
          tableName: SmartDriveData.Info.TableName,
          orderBy: SmartDriveData.Info.DateName,
          ascending: false,
          limit: numRecentEntries
        });
    } catch (err) {
      Sentry.captureException(err);
      return [];
    }
  }

  async getUnsentInfoFromDatabase(numEntries: number) {
    try {
      return this._sqliteService
        .getAll({
          tableName: SmartDriveData.Info.TableName,
          queries: {
            [SmartDriveData.Info.HasBeenSentName]: 0
          },
          orderBy: SmartDriveData.Info.IdName,
          ascending: true,
          limit: numEntries
        });
    } catch (err) {
      Sentry.captureException(err);
      return [];
    }
  }

  /**
   * Network Functions
   */
  async sendSettingsToServer() {
    if (!this.hasSentSettings) {
      const settingsObj = {
        settings: this.settings.toObj(),
        switchControlSettings: this.switchControlSettings.toObj()
      };
      return this._kinveyService
        .sendSettings(settingsObj)
        .then(r => r.content.toJSON())
        .then(r => {
          const id = r['_id'];
          if (id) {
            this.hasSentSettings = true;
            appSettings.setBoolean(
              DataKeys.SD_SETTINGS_DIRTY_FLAG,
              this.hasSentSettings
            );
          } else {
            Log.E('no id returned by kinvey!', r);
          }
        })
        .catch(err => {
          Sentry.captureException(err);
        });
    }
  }

  async sendErrorsToServer(numErrors: number) {
    try {
      const errors = await this._sqliteService
        .getAll({
          tableName: SmartDriveData.Errors.TableName,
          orderBy: SmartDriveData.Errors.IdName,
          queries: {
            [SmartDriveData.Errors.HasBeenSentName]: 0
          },
          ascending: true,
          limit: numErrors
        });
      // now send them one by one
      const sendPromises = errors.map(e => {
        // @ts-ignore
        e = SmartDriveData.Errors.loadError(...e);
        return this._kinveyService.sendError(
          e,
          e[SmartDriveData.Errors.UuidName]
        );
      });
      const rets = await Promise.all(sendPromises) as any[];
      const updatePromises = rets
        .map(r => r.content.toJSON())
        .map(r => {
          const id = r['_id'];
          if (id) {
            return this._sqliteService.updateInTable(
              SmartDriveData.Errors.TableName,
              {
                [SmartDriveData.Errors.HasBeenSentName]: 1
              },
              {
                [SmartDriveData.Errors.UuidName]: id
              }
            );
          } else {
            Log.E('no id returned by kinvey!', r);
          }
        });
      return Promise.all(updatePromises);
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Error sending errors to server:', err);
    }
  }

  async sendInfosToServer(numInfo: number) {
    try {
      const infos = await this.getUnsentInfoFromDatabase(numInfo);
      // now send them one by one
      const sendPromises = infos.map(i => {
        // @ts-ignore
        i = SmartDriveData.Info.loadInfo(...i);
        try {
          i[SmartDriveData.Info.RecordsName] = JSON.parse(i[SmartDriveData.Info.RecordsName]);
        } catch (err) {
          Log.E('parse error', err);
        }
        return this._kinveyService.sendInfo(
          i,
          i[SmartDriveData.Info.UuidName]
        );
      });
      const rets = await Promise.all(sendPromises) as any[];
      const updatePromises = rets
        .map(r => r.content.toJSON())
        .map(r => {
          const id = r['_id'];
          if (id) {
            return this._sqliteService.updateInTable(
              SmartDriveData.Info.TableName,
              {
                [SmartDriveData.Info.HasBeenSentName]: 1
              },
              {
                [SmartDriveData.Info.UuidName]: id
              }
            );
          } else {
            Log.E('no id returned by kinvey!', r);
          }
        });
      return Promise.all(updatePromises);
    } catch (e) {
      Sentry.captureException(e);
      Log.E('Error sending infos to server:', e);
    }
  }

  private _sentryBreadCrumb(message: string) {
    // Log.D(message);
    Sentry.captureBreadcrumb({
      message,
      category: 'info',
      level: Level.Info
    });
  }
}
