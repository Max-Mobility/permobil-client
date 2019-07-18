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
import * as LS from 'nativescript-localstorage';
import { Pager } from 'nativescript-pager';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Level, Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
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
import { ActivityDetector } from '../../models';
import { ActivityData } from '../../namespaces';
import { BluetoothService, KinveyService, SensorChangedEventData, SensorService, SERVICES, SqliteService } from '../../services';
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
  /**
   * Goal progress data.
   *   * CurrentProgress: [0,100] used for ring display
   *   * CurrentValue: {R} actual daily number used for text display
   *   * Value: {R} actual goal number used for text display
   */
  @Prop() distanceGoalCurrentProgress: number = 0;
  @Prop() distanceGoalCurrentValue: number = 0;
  @Prop() distanceGoalValue: number = 0;
  @Prop() coastGoalCurrentProgress: number = 0;
  @Prop() coastGoalCurrentValue: number = 0;
  @Prop() coastGoalValue: number = 0;

  @Prop() distanceUnits: string = '';

  /**
   * Activity Related Data
   */
  activityDetector: ActivityDetector = null;
  // Sensor listener config:
  SENSOR_DELAY_US: number = 40 * 1000;
  MAX_REPORTING_INTERVAL_US: number = 20 * 1000;

  @Prop() currentPushCount: number = 0;
  @Prop() currentHighStressActivityCount: number = 0;

  // for managing the inset of the layouts ourselves
  @Prop() insetPadding: number = 0;

  // for managing when we send data to server
  @Prop() watchIsCharging: boolean = false;

  // state variables
  @Prop() isAmbient: boolean = false;
  @Prop() watchBeingWorn: boolean = false;
  @Prop() disableWearCheck: boolean = false;

  /**
   * Layout Management
   */
  private previousLayouts: string[] = [];
  private layouts = {
    about: false,
    changeSettings: false,
    main: true,
    settings: false
  };
  @Prop() enabledLayout = fromObject(this.layouts);
  private _settingsLayout: SwipeDismissLayout;
  private _changeSettingsLayout: SwipeDismissLayout;
  private _aboutLayout: SwipeDismissLayout;

  /**
   * Settings UI:
   */
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';

  /**
   * Data to bind to the Distance Chart repeater.
   */
  @Prop() distanceChartData: any[];
  @Prop() distanceChartMaxValue: string;

  /**
   * Data to bind to the Coast Chart repeater.
   */
  @Prop() coastChartData: any[];
  @Prop() coastChartMaxValue: string;

  // used to update the chart display when the date changes
  private _lastChartDay = null;

  /**
   * Information for About page
   */
  @Prop() watchSerialNumber: string = '---';
  @Prop() appVersion: string = '---';
  @Prop() databaseId: string = KinveyService.api_app_key;

  // Used for doing work while charing
  private chargingWorkTimeoutId: any = null;
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;
  private DATABASE_SAVE_INTERVAL_MS = 10 * 1000;

  /**
   * User interaction objects
   */
  private pager: Pager;
  private settingsScrollView: ScrollView;
  private aboutScrollView: ScrollView;
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;
  private _sqliteService: SqliteService;
  private _kinveyService: KinveyService;


  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.READ_PHONE_STATE,
    android.Manifest.permission.ACCESS_COARSE_LOCATION
  ];

  constructor() {
    super();
    this._sentryBreadCrumb('Main-View-Model constructor.');
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

    // Activity detection related code:
    this._sensorService.on(
      SensorService.SensorChanged,
      this.handleSensorData.bind(this)
    );
    this._sentryBreadCrumb('Creating new ActivityDetector');
    console.time('new_activity_detector');
    this.activityDetector = new ActivityDetector();
    console.timeEnd('new_activity_detector');
    this._sentryBreadCrumb('New ActivityDetector created.');

    this._sentryBreadCrumb('Enabling body sensor.');
    this.enableBodySensor();
    this._sentryBreadCrumb('Body sensor enabled.');

    // load settings from memory
    this._sentryBreadCrumb('Loading settings.');
    this.loadSettings();
    this._sentryBreadCrumb('Settings loaded.');

    this._sentryBreadCrumb('Updating settings display.');
    this.updateSettingsDisplay();
    this._sentryBreadCrumb('Settings display updated.');
  }

  async initSqliteTables() {
    this._sentryBreadCrumb('Initializing SQLite...');
    console.time('SQLite_Init');
    // create / load tables for activity data
    const sqlitePromises = [
      this._sqliteService.makeTable(
        ActivityData.Info.TableName,
        ActivityData.Info.IdName,
        ActivityData.Info.Fields
      )
    ];
    return Promise.all(sqlitePromises)
      .then(() => {
        console.timeEnd('SQLite_Init');
        this._sentryBreadCrumb('SQLite has been initialized.');
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
          return requestPermissions(neededPermissions, () => { });
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
    try {
      await this.init();
    } catch (err) {
      Sentry.captureException(err);
      Log.E('activity init error:', err);
    }
    // get child references
    try {
      const page = args.object as Page;
      this.pager = page.getViewById('pager') as Pager;
    } catch (err) {
      Sentry.captureException(err);
      Log.E('onMainPageLoaded::error:', err);
    }

    // apply theme
    this.applyTheme();
  }

  applyTheme(theme?: string) {
    // apply theme
    this._sentryBreadCrumb('applying theme');
    try {
      if (theme === 'ambient' || this.isAmbient) {
        themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
      } else {
        themes.applyThemeCss(defaultTheme, 'theme-default.scss');
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

  /**
   * Application lifecycle event handlers
   */
  registerAppEventHandlers() {
    // handle ambient mode callbacks
    application.on('enterAmbient', this.onEnterAmbient.bind(this));
    application.on('updateAmbient', this.onUpdateAmbient.bind(this));
    application.on('exitAmbient', this.onExitAmbient.bind(this));

    // Activity lifecycle event handlers
    application.on(application.lowMemoryEvent, this.onAppLowMemory.bind(this));
    application.on(
      application.uncaughtErrorEvent,
      this.onAppUncaughtError.bind(this)
    );
  }

  onEnterAmbient() {
    this._sentryBreadCrumb('*** enterAmbient ***');
    this.isAmbient = true;
    Log.D('*** enterAmbient ***');
    this.applyTheme();
  }

  onUpdateAmbient() {
    this.isAmbient = true;
  }

  onExitAmbient() {
    this._sentryBreadCrumb('*** exitAmbient ***');
    this.isAmbient = false;
    Log.D('*** exitAmbient ***');
    this.applyTheme();
  }

  onAppLowMemory(args?: any) {
    this._sentryBreadCrumb('*** appLowMemory ***');
    Log.D('App low memory', args.android);
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
  }

  _format(d: Date, fmt: string) {
    return format(d, fmt, {
      locale: dateLocales[getDefaultLang()] || dateLocales['en']
    });
  }

  onNetworkAvailable(args?: any) {
    // Log.D('Network available - sending info');
    return this.sendActivityToServer(10)
      .then(ret => {
        // Log.D('Have sent data to server - unregistering from network');
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Error sending data to server', err);
      });
  }

  doWhileCharged() {
    if (this.watchIsCharging) {
      // Since we're not sending a lot of data, we'll not bother
      // requesting network
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
  onPagerLoaded(args: any) { }

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
    }

    if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
      this.handleAccel(parsedData.d, parsedData.ts);
    }
  }

  handleAccel(acceleration: any, timestamp: number) {
    // now run the activity detector
    const detectedActivity = this.activityDetector.detectActivity(
      acceleration,
      timestamp
    );
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
    return this.getActivityInfoFromDatabase(7)
      .then((activityData: any[]) => {
        // we've asked for one more day than needed so that we can
        // compute distance differences
        const oldest = activityData[0];
        const newest = last(activityData);
        // keep track of the most recent day so we know when to update
        this._lastChartDay = new Date(newest.date);
        // remove the oldest so it's not displayed - we only use it
        // to track distance differences
        activityData = activityData.slice(1);
        // update coast data
        const maxCoast = activityData.reduce((max, obj) => {
          return obj.coast > max ? obj.coast : max;
        }, 0);
        const coastData = activityData.map(e => {
          return {
            day: this._format(new Date(e.date), 'dd'),
            value: (e.coast * 100.0) / maxCoast
          };
        });
        // Log.D('Highest Coast Value:', maxCoast);
        this.coastChartMaxValue = maxCoast.toFixed(0);
        this.coastChartData = coastData;

        // update distance data
        const distanceData = activityData.map(e => {
          const dist = e[ActivityData.Info.DistanceName];
          return {
            day: this._format(new Date(e.date), 'dd'),
            value: dist
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

        // TODO: update the display of the data
      })
      .catch(err => {
        Sentry.captureException(err);
      });
  }

  onProfileTap() {
    if (this.settingsScrollView) {
      // reset to to the top when entering the page
      this.settingsScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this._settingsLayout);
    this.enableLayout('settings');
  }

  onSettingsInfoItemTap(args: EventData) {
    const messageKey = 'settings.description.' + this.activeSettingToChange;
    const message = this.changeSettingKeyString + ':\n\n' + L(messageKey);
    alert({
      title: L('settings.information'),
      message: message,
      okButtonText: L('buttons.ok')
    });
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    // TODO: update settings storage
    /*
    this.tempSettings.copy(this.settings);
    this.tempSwitchControlSettings.copy(this.switchControlSettings);
    */
    const tappedId = args.object.id as string;
    this.activeSettingToChange = tappedId.toLowerCase();
    switch (this.activeSettingToChange) {
      case 'units':
        this.changeSettingKeyString = L('settings.units');
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
      case 'units':
        // TODO: update settings storage
        translationKey =
          'sd.settings.units.'; // + this.tempSettings.units.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
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

  updateSpeedDisplay() {
    // update distance units
    // TODO: update once we have new settings
    this.distanceUnits = L(
      'units.distance.' // + this.settings.units.toLowerCase()
    );
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, {
      x: 500,
      y: 0
    });
    this.previousLayout();
    // SAVE THE VALUE to local data for the setting user has selected
    // TODO: update once we have new settings
    /*
    this.settings.copy(this.tempSettings);
    this.switchControlSettings.copy(this.tempSwitchControlSettings);
    */
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
    // TODO: update once we have new settings
    /*
    this.tempSettings.increase(this.activeSettingToChange);
    this.tempSwitchControlSettings.increase(this.activeSettingToChange);
    if (this.activeSettingToChange === 'wearcheck') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    */
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap() {
    // TODO: update once we have new settings
    /*
    this.tempSettings.decrease(this.activeSettingToChange);
    this.tempSwitchControlSettings.decrease(this.activeSettingToChange);
    if (this.activeSettingToChange === 'wearcheck') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    */
    this.updateSettingsChangeDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this._changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button
    // without starting the swipe behavior
    (this._changeSettingsLayout as any).swipeable = false;
  }

  /**
   * user / Profile / Settings saving / loading
   */
  loadSettings() {
    /*
    this.settings.copy(
      LS.getItem('com.permobil.pushtracker.wearos.smartdrive.settings')
    );
    this.switchControlSettings.copy(
      LS.getItem(
        'com.permobil.pushtracker.wearos.smartdrive.switch-control-settings'
      )
    );
    this.hasSentSettings =
      appSettings.getBoolean(DataKeys.SD_SETTINGS_DIRTY_FLAG) || false;
    this.disableWearCheck =
      appSettings.getBoolean(DataKeys.REQUIRE_WATCH_BEING_WORN) || false;
    */
  }

  saveSettings() {
    /*
    appSettings.setBoolean(
      DataKeys.SD_SETTINGS_DIRTY_FLAG,
      this.hasSentSettings
    );
    appSettings.setBoolean(
      DataKeys.REQUIRE_WATCH_BEING_WORN,
      this.disableWearCheck
    );
    LS.setItemObject(
      'com.permobil.pushtracker.wearos.smartdrive.settings',
      this.settings.toObj()
    );
    LS.setItemObject(
      'com.permobil.pushtracker.wearos.smartdrive.switch-control-settings',
      this.switchControlSettings.toObj()
    );
    */
  }

  /*
   * DATABASE FUNCTIONS
   */
  saveActivityData(args: {
    pushes?: number;
    coast?: number;
    distance?: number;
  }) {
    // now save to database
    const pushes = args.pushes || 0;
    const coast = args.coast || 0;
    const distance = args.distance || 0;
    if (pushes === 0 && coast === 0 && distance === 0) {
      return Promise.reject(
        'Must provide at least one valid activity data point!'
      );
    }
    return this.getRecentInfoFromDatabase(1)
      .then(infos => {
        // Log.D('recent infos', infos);
        if (!infos || !infos.length) {
          // record the data if we have it
          if (pushes > 0 && coast > 0) {
            // make the first entry for computing distance differences
            const firstEntry = ActivityData.Info.newInfo(
              undefined,
              subDays(new Date(), 1),
              0,
              pushes,
              coast
            );
            return this._sqliteService.insertIntoTable(
              ActivityData.Info.TableName,
              firstEntry
            );
          }
        }
      })
      .then(() => {
        return this.getTodaysActivityInfoFromDatabase();
      })
      .then(u => {
        if (u[ActivityData.Info.IdName]) {
          // there was a record, so we need to update it. we add the
          // already used distance plus the amount of new distance
          // that has been used
          const updatedDistance = distance + u[ActivityData.Info.DistanceName];
          const updatedPushes =
            pushes || u[ActivityData.Info.PushName];
          const updatedCoast =
            coast || u[ActivityData.Info.CoastName];
          return this._sqliteService.updateInTable(
            ActivityData.Info.TableName,
            {
              [ActivityData.Info.PushName]: updatedPushes,
              [ActivityData.Info.CoastName]: updatedCoast,
              [ActivityData.Info.DistanceName]: updatedDistance,
              [ActivityData.Info.HasBeenSentName]: 0
            },
            {
              [ActivityData.Info.IdName]: u.id
            }
          );
        } else {
          // this is the first record, so we create it
          return this._sqliteService.insertIntoTable(
            ActivityData.Info.TableName,
            ActivityData.Info.newInfo(
              undefined,
              new Date(),
              pushes,
              coast,
              distance
            )
          );
        }
      })
      .then(() => {
        return this.updateChartData();
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Failed saving activity:', err);
        alert({
          title: L('failures.title'),
          message: `${L('failures.saving-activity')}: ${err}`,
          okButtonText: L('buttons.ok')
        });
      });
  }

  getTodaysActivityInfoFromDatabase() {
    return this._sqliteService
      .getLast(ActivityData.Info.TableName, ActivityData.Info.IdName)
      .then(e => {
        const date = new Date((e && e[1]) || null);
        if (e && e[1] && isToday(date)) {
          // @ts-ignore
          return ActivityData.Info.loadInfo(...e);
        } else {
          return ActivityData.Info.newInfo(undefined, new Date(), 0, 0, 0);
        }
      })
      .catch(err => {
        Sentry.captureException(err);
        // nothing was found
        return ActivityData.Info.newInfo(undefined, new Date(), 0, 0, 0);
      });
  }

  getActivityInfoFromDatabase(numDays: number) {
    const dates = ActivityData.Info.getPastDates(numDays);
    const activityInfo = dates.map(d => {
      return ActivityData.Info.newInfo(null, d, 0, 0, 0);
    });
    return this.getRecentInfoFromDatabase(6)
      .then(objs => {
        objs.map(o => {
          // @ts-ignore
          const obj = ActivityData.Info.loadInfo(...o);
          const objDate = new Date(obj.date);
          const index = closestIndexTo(objDate, dates);
          const activityDate = dates[index];
          // Log.D('recent info:', o);
          if (index > -1 && isSameDay(objDate, activityDate)) {
            activityInfo[index] = obj;
          }
        });
        return activityInfo;
      })
      .catch(err => {
        Sentry.captureException(err);
        console.log('error getting recent info:', err);
        return activityInfo;
      });
  }

  getRecentInfoFromDatabase(numRecentEntries: number) {
    return this._sqliteService.getAll({
      tableName: ActivityData.Info.TableName,
      orderBy: ActivityData.Info.DateName,
      ascending: false,
      limit: numRecentEntries
    });
  }

  getUnsentInfoFromDatabase(numEntries: number) {
    return this._sqliteService.getAll({
      tableName: ActivityData.Info.TableName,
      queries: {
        [ActivityData.Info.HasBeenSentName]: 0
      },
      orderBy: ActivityData.Info.IdName,
      ascending: true,
      limit: numEntries
    });
  }

  /**
   * Network Functions
   */
  sendActivityToServer(numInfo: number) {
    return this.getUnsentInfoFromDatabase(numInfo)
      .then(infos => {
        if (infos && infos.length) {
          // now send them one by one
          const promises = infos.map(i => {
            // @ts-ignore
            i = ActivityData.Info.loadInfo(...i);
            // update info date here
            i[ActivityData.Info.DateName] = new Date(
              i[ActivityData.Info.DateName]
            );
            return this._kinveyService.sendActivity(
              i,
              i[ActivityData.Info.UuidName]
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
                ActivityData.Info.TableName,
                {
                  [ActivityData.Info.HasBeenSentName]: 1
                },
                {
                  [ActivityData.Info.UuidName]: id
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
