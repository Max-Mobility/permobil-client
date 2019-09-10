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
import { DailyActivity, Profile } from '../../namespaces';
import { BluetoothService, KinveyService, SERVICES, SqliteService } from '../../services';
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

declare const com: any;

let debug: boolean = false;

@JavaProxy('com.permobil.pushtracker.DataBroadcastReceiver')
class DataBroadcastReceiver extends android.content.BroadcastReceiver {
  public onReceiveFunction: any = null;
  constructor() {
    super();
    return global.__native(this);
  }
  onReceive(androidContext: android.content.Context,
    intent: android.content.Intent) {
    if (this.onReceiveFunction)
      this.onReceiveFunction(androidContext, intent);
  }
}

@JavaProxy('com.permobil.pushtracker.ResultReceiver')
class ResultReceiver extends android.os.ResultReceiver {
  public onReceiveFunction: any = null;
  constructor(handler: android.os.Handler) {
    super(handler);
    return global.__native(this);
  }
  onReceiveResult(resultCode: number, resultData: android.os.Bundle) {
    if (this.onReceiveFunction)
      this.onReceiveFunction(resultCode, resultData);
  }
}

export class MainViewModel extends Observable {
  /**
   * Goal progress data.
   *   * CurrentProgress: [0,100] used for ring display
   *   * CurrentValue: {R} actual daily number used for text display
   *   * Value: {R} actual goal number used for text display
   */
  @Prop() distanceGoalValue: number = debug ? ((Math.random() * 10.0) + 2.0) : 0;
  @Prop() distanceGoalCurrentValue: number = debug ? Math.random() * this.distanceGoalValue : 0;
  @Prop() distanceGoalCurrentProgress: number =
    (this.distanceGoalCurrentValue / this.distanceGoalValue) * 100.0;
  @Prop() distanceGoalCurrentValueDisplay = this.distanceGoalCurrentValue.toFixed(1);
  @Prop() distanceGoalValueDisplay = this.distanceGoalValue.toFixed(1);

  @Prop() coastGoalValue: number = debug ? ((Math.random() * 10) + 2.0) : 0;
  @Prop() coastGoalCurrentValue: number = debug ? Math.random() * this.coastGoalValue : 0;
  @Prop() coastGoalCurrentProgress: number =
    (this.coastGoalCurrentValue / this.coastGoalValue) * 100.0;
  @Prop() coastGoalCurrentValueDisplay = this.coastGoalCurrentValue.toFixed(1);
  @Prop() coastGoalValueDisplay = this.coastGoalValue.toFixed(1);

  @Prop() distanceUnits: string = '';

  /**
   * Settings
   */
  @Prop() settings: Profile.Settings = new Profile.Settings();
  @Prop() tempSettings: Profile.Settings = new Profile.Settings();
  @Prop() hasSentSettings: boolean = false;

  /**
   * Activity Related Data
   */
  @Prop() currentPushCount: number = debug ? Math.random() * 10000 : 0;
  @Prop() currentPushCountDisplay = this.currentPushCount.toFixed(0);
  @Prop() currentHighStressActivityCount: number = 0;

  // for managing the inset of the layouts ourselves
  @Prop() screenWidth: number = 200;
  @Prop() screenHeight: number = 200;
  @Prop() insetPadding: number = 0;
  @Prop() chinSize: number = 0;

  // for managing when we send data to server
  @Prop() watchIsCharging: boolean = false;

  // state variables
  @Prop() isAmbient: boolean = false;
  @Prop() disableWearCheck: boolean = false;

  /**
   * Layout Management
   */
  private previousLayouts: string[] = [];
  private layouts = {
    about: false,
    changeSettings: false,
    main: true,
    profile: false,
    settings: false
  };
  @Prop() enabledLayout = fromObject(this.layouts);
  private settingsLayout: SwipeDismissLayout;
  private profileLayout: SwipeDismissLayout;
  private changeSettingsLayout: SwipeDismissLayout;
  private aboutLayout: SwipeDismissLayout;
  private settingsScrollView: ScrollView;
  private profileScrollView: ScrollView;
  private aboutScrollView: ScrollView;

  /**
   * Settings UI:
   */
  @Prop() activeSettingToChange = ' ';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';

  /**
   * Data to bind to the Distance Chart repeater.
   */
  @Prop() distanceChartData: any[] = null;
  @Prop() distanceChartMaxValue: string;

  /**
   * Data to bind to the Coast Chart repeater.
   */
  @Prop() coastChartData: any[];
  @Prop() coastChartMaxValue: string;

  // used to update the chart display when the date changes
  private lastChartDay = null;

  /**
   * Information for About page
   */
  @Prop() watchSerialNumber: string = '---';
  @Prop() appVersion: string = '---';
  @Prop() databaseId: string = KinveyService.api_app_key;

  // Used for doing work while charing
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;

  /**
   * User interaction objects
   */
  private bluetoothService: BluetoothService;
  private sqliteService: SqliteService;
  private kinveyService: KinveyService;

  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.READ_PHONE_STATE,
    android.Manifest.permission.ACCESS_FINE_LOCATION
  ];

  constructor() {
    super();
    this.sentryBreadCrumb('Main-View-Model constructor.');

    // determine inset padding
    const androidConfig = ad
      .getApplicationContext()
      .getResources()
      .getConfiguration();
    const isCircleWatch = androidConfig.isScreenRound();
    const screenWidth = screen.mainScreen.widthPixels;
    const screenHeight = screen.mainScreen.heightPixels;
    // this.screenWidth = screen.mainScreen.widthPixels;
    // this.screenHeight = screen.mainScreen.heightPixels;
    Log.D('WxH', screenWidth, screenHeight);
    if (isCircleWatch) {
      this.insetPadding = Math.round(0.146467 * screenWidth);
      // if the height !== width then there is a chin!
      if (screenWidth !== screenHeight &&
        screenWidth > screenHeight) {
        this.chinSize = screenWidth - screenHeight;
      }
    }
    Log.D('chinSize:', this.chinSize);

    // handle application lifecycle events
    this.sentryBreadCrumb('Registering app event handlers.');
    this.registerAppEventHandlers();
    this.sentryBreadCrumb('App event handlers registered.');

    this.registerForServiceDataUpdates();
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
    this.sentryBreadCrumb('Main-View-Model init.');

    this.sentryBreadCrumb('Initializing Sentry...');
    console.time('Sentry_Init');
    // init sentry - DNS key for permobil-wear Sentry project
    Sentry.init(
      'https://5670a4108fb84bc6b2a8c427ab353472@sentry.io/1485857'
      // 'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1485857'
    );
    console.timeEnd('Sentry_Init');
    this.sentryBreadCrumb('Sentry has been initialized.');

    this.sentryBreadCrumb('Creating services...');
    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this.bluetoothService = injector.get(BluetoothService);
    this.sqliteService = injector.get(SqliteService);
    this.kinveyService = injector.get(KinveyService);
    this.sentryBreadCrumb('All Services created.');

    // initialize data storage for usage, errors, settings
    this.initSqliteTables();

    // load serial number from settings / memory
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = ad
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    const savedSerial = sharedPreferences.getString(
      prefix + com.permobil.pushtracker.Datastore.WATCH_SERIAL_NUMBER_KEY,
      ''
    );
    if (savedSerial && savedSerial.length) {
      this.watchSerialNumber = savedSerial;
      this.kinveyService.watch_serial_number = this.watchSerialNumber;
    }
    const packageManager = application.android.context.getPackageManager();
    const packageInfo = packageManager.getPackageInfo(
      application.android.context.getPackageName(),
      0
    );
    const versionName = packageInfo.versionName;
    const versionCode = packageInfo.versionCode;
    this.appVersion = versionName;

    // register for time updates
    this.registerForTimeUpdates();

    // load settings from memory
    this.sentryBreadCrumb('Loading settings.');
    this.loadSettings();
    this.sentryBreadCrumb('Settings loaded.');

    // load activity data
    this.loadCurrentActivityData();

    this.sentryBreadCrumb('Updating display.');
    this.updateDisplay();
    this.sentryBreadCrumb('Display updated.');

    // register for time updates
    this.registerForTimeUpdates();

    setTimeout(this.startActivityService.bind(this), 5000);
  }

  async initSqliteTables() {
    this.sentryBreadCrumb('Initializing SQLite...');
    try {
      console.time('SQLite_Init');
      // create / load tables for activity data
      const sqlitePromises = [
        this.sqliteService.makeTable(
          DailyActivity.Info.TableName,
          DailyActivity.Info.IdName,
          DailyActivity.Info.Fields
        )
      ];
      await Promise.all(sqlitePromises);
      console.timeEnd('SQLite_Init');
      this.sentryBreadCrumb('SQLite has been initialized.');
    } catch (err) {
      // Sentry.captureException(err);
      Log.E('Could not make table:', err);
    }
  }

  loadSmartDriveData() {
    const plottedDates = DailyActivity.Info.getPastDates(6);
    let distanceData = plottedDates.map(d => {
      return {
        day: this.format(new Date(d), 'dd'),
        value: 0
      };
    });
    const today = this.format(new Date(), 'YYYY/MM/DD');
    let maxDist = 0;
    let currentDist = 0;
    try {
      const cursor = ad
        .getApplicationContext()
        .getContentResolver()
        .query(
          com.permobil.pushtracker.SmartDriveUsageProvider.USAGE_URI,
          null, null, null, null);
      if (cursor && cursor.moveToFirst()) {
        // there is data
        const serialized = cursor.getString(
          com.permobil.pushtracker.SmartDriveUsageProvider.DATA_INDEX
        );
        cursor.close();
        const data = JSON.parse(serialized);
        // distances provided are always in miles
        if (data[today]) {
          currentDist = data[today].total || 0.0;
        }
        Object.keys(data).map(k => {
          const total = data[k].total;
          if (total > maxDist) maxDist = total;
        });
        distanceData = plottedDates.map(d => {
          const date = new Date(d);
          let value = 0;
          const dateKey = this.format(date, 'YYYY/MM/DD');
          if (data[dateKey] !== undefined && data[dateKey].total > 0) {
            // for now we're using total
            value = (100.0 * data[dateKey].total) / maxDist;
          }
          return {
            day: this.format(date, 'dd'),
            value: value
          };
        });
      } else {
        Log.E('could not craete package context!');
      }
    } catch (err) {
      Log.E('Could not get smartdrive data', err);
      // Sentry.captureException(err);
    }
    // Log.D('Highest Distance Value:', maxDist);
    this.distanceChartData = distanceData;
    if (this.settings.units === 'metric') {
      this.distanceChartMaxValue = (maxDist * 1.609).toFixed(1);
      this.distanceGoalCurrentValue = currentDist * 1.609;
    } else {
      this.distanceChartMaxValue = maxDist.toFixed(1);
      this.distanceGoalCurrentValue = currentDist;
    }
  }

  loadCurrentActivityData() {
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = ad
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    this.currentPushCount = sharedPreferences.getInt(
      prefix + com.permobil.pushtracker.Datastore.CURRENT_PUSH_COUNT_KEY,
      0
    );
    this.coastGoalCurrentValue = sharedPreferences.getFloat(
      prefix + com.permobil.pushtracker.Datastore.CURRENT_COAST_KEY,
      0.0
    );
  }

  debugTap() {
    debug = !debug;
    if (debug) {
      this.currentPushCount = ((Math.random() * 2000) + 1000);
      this.distanceGoalValue = ((Math.random() * 10.0) + 2.0);
      this.distanceGoalCurrentValue = debug ? Math.random() * this.distanceGoalValue : 0;
      this.coastGoalValue = ((Math.random() * 10) + 2.0);
      this.coastGoalCurrentValue = Math.random() * this.coastGoalValue;
    } else {
      this.loadCurrentActivityData();
    }
    this.updateDisplay();
  }

  onServiceData(context, intent) {
    // get the info from the event
    const pushes = intent.getIntExtra(
      com.permobil.pushtracker.Constants.ACTIVITY_SERVICE_PUSHES,
      0
    );
    const coast = intent.getFloatExtra(
      com.permobil.pushtracker.Constants.ACTIVITY_SERVICE_COAST,
      0
    );
    Log.D('Got service data', pushes, coast);
    this.currentPushCount = pushes;
    this.coastGoalCurrentValue = coast;
    this.updateDisplay();
  }

  private serviceDataReceiver = new DataBroadcastReceiver();

  registerForServiceDataUpdates() {
    this.sentryBreadCrumb('Registering for service data updates.');
    this.serviceDataReceiver.onReceiveFunction = this.onServiceData.bind(this);
    const context = ad
      .getApplicationContext();
    androidx.localbroadcastmanager.content.LocalBroadcastManager
      .getInstance(context)
      .registerReceiver(
        this.serviceDataReceiver,
        new android.content.IntentFilter(
          com.permobil.pushtracker.Constants.ACTIVITY_SERVICE_DATA_INTENT_KEY
        )
      );
    this.sentryBreadCrumb('Service Data Update registered.');
  }

  async startActivityService() {
    try {
      await this.askForPermissions();
      this.sentryBreadCrumb('Starting Activity Service.');
      console.log('Starting activity service!');
      const intent = new android.content.Intent();
      const context = application.android.context;
      intent.setClassName(context, 'com.permobil.pushtracker.ActivityService');
      intent.setAction('ACTION_START_SERVICE');
      context.startService(intent);
      console.log('Started activity service!');
      this.sentryBreadCrumb('Activity Service started.');
    } catch (err) {
      console.error('could not start activity service:', err);
      setTimeout(this.startActivityService.bind(this), 5000);
    }
  }

  async askForPermissions() {
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
      await alert({
        title: L('permissions-request.title'),
        message: reasons,
        okButtonText: L('buttons.ok')
      });
      try {
        const permissions = await requestPermissions(neededPermissions, () => { });
        // now that we have permissions go ahead and save the serial number
        this.watchSerialNumber = android.os.Build.getSerial();
        // save it to datastore for service to use
        const prefix = com.permobil.pushtracker.Datastore.PREFIX;
        const sharedPreferences = ad
          .getApplicationContext()
          .getSharedPreferences('prefs.db', 0);
        const editor = sharedPreferences.edit();
        editor.putString(
          prefix + com.permobil.pushtracker.Datastore.WATCH_SERIAL_NUMBER_KEY,
          this.watchSerialNumber
        );
        editor.commit();
        this.kinveyService.watch_serial_number = this.watchSerialNumber;
        // and return true letting the caller know we got the permissions
        return true;
      } catch (err) {
        // Sentry.captureException(err);
        throw L('failures.permissions');
      }
    } else {
      return true;
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

  private windowInsetsListener = new android.view.View.OnApplyWindowInsetsListener({
    onApplyWindowInsets: function(view, insets) {
      this.chinSize = insets.getSystemWindowInsetBottom();
      Log.D('chinSize', this.chinSize);
      view.onApplyWindowInsets(insets);
      return insets;
    }
  });

  async onMainPageLoaded(args: any) {
    this.sentryBreadCrumb('onMainPageLoaded');
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
  }

  private hasAppliedTheme: boolean = false;
  applyTheme(theme?: string) {
    // apply theme
    this.sentryBreadCrumb('applying theme');
    this.hasAppliedTheme = true;
    try {
      if (theme === 'ambient' || this.isAmbient) {
        themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
      } else {
        themes.applyThemeCss(defaultTheme, 'theme-default.scss');
      }
    } catch (err) {
      // Sentry.captureException(err);
      Log.E('apply theme error:', err);
    }
    this.sentryBreadCrumb('theme applied');
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
    this.sentryBreadCrumb('*** enterAmbient ***');
    this.isAmbient = true;
    Log.D('*** enterAmbient ***');
    this.applyTheme();
  }

  onUpdateAmbient() {
    this.isAmbient = true;
  }

  onExitAmbient() {
    this.sentryBreadCrumb('*** exitAmbient ***');
    this.isAmbient = false;
    Log.D('*** exitAmbient ***');
    this.applyTheme();
  }

  onAppLowMemory(args?: any) {
    this.sentryBreadCrumb('*** appLowMemory ***');
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

  format(d: Date, fmt: string) {
    return format(d, fmt, {
      locale: dateLocales[getDefaultLang()] || dateLocales['en']
    });
  }

  async updateUserData() {
    // make sure kinvey service is initialized
    if (this.kinveyService === undefined) {
      return;
    }
    // make sure the kinvey service has authentication (or get it)
    if (!this.kinveyService.hasAuth()) {
      const validAuth = await this.updateAuthorization();
      if (!validAuth) {
        return;
      }
    }
    try {
      Log.D('requesting user data');
      // now request user data
      const userData = await this.kinveyService.getUserData() as any;
      Log.D('userInfo', JSON.stringify(userData, null, 2));
      // pull the data out of the user structure
      this.settings.fromUser(userData);
      this.saveSettings();
      // now update any display that needs settings:
      this.updateDisplay();
    } catch (err) {
      Log.E('could not get user data:', err);
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
    showOffScreenLayout(this.aboutLayout);
    this.enableLayout('about');
  }

  /**
   * Setings page handlers
   */
  onSettingsLayoutLoaded(args) {
    this.settingsLayout = args.object as SwipeDismissLayout;
    this.settingsScrollView = this.settingsLayout.getViewById(
      'settingsScrollView'
    ) as ScrollView;
    this.settingsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this.settingsLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  onProfileLayoutLoaded(args) {
    this.profileLayout = args.object as SwipeDismissLayout;
    this.profileScrollView = this.profileLayout.getViewById(
      'profileScrollView'
    ) as ScrollView;
    this.profileLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this.profileLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  onAboutLayoutLoaded(args) {
    // show the chart
    this.aboutLayout = args.object as SwipeDismissLayout;
    this.aboutScrollView = this.aboutLayout.getViewById(
      'aboutScrollView'
    ) as ScrollView;
    this.aboutLayout.on(SwipeDismissLayout.dimissedEvent, args => {
      // hide the offscreen layout when dismissed
      hideOffScreenLayout(this.aboutLayout, { x: 500, y: 0 });
      this.previousLayout();
    });
  }

  /**
   * FOR COMMUNICATING WITH PHONE AND DETERMINING IF THE PHONE HAS THE
   * APP, AND FOR OPENING THE APP STORE OR APP
   */

  onResultData(resultCode: number, resultData: android.os.Bundle) {
    Log.D('onResultData:', resultCode);
    if (resultCode === com.google.android.wearable.intent.RemoteIntent.RESULT_OK) {
      Log.D('result ok!');
    } else if (resultCode === com.google.android.wearable.intent.RemoteIntent.RESULT_FAILED) {
      Log.D('result failed!');
    } else {
      Log.E('Unexpected result ' + resultCode);
    }
  }

  private ANDROID_MARKET_APP_URI =
    'market://details?id=com.permobil.pushtracker';
  // 'market://details?id=com.iconfactory.smartdrive';
  private APP_STORE_APP_URI =
    'https://itunes.apple.com/us/app/pushtracker/id1121427802';

  private mResultReceiver = new ResultReceiver(new android.os.Handler());

  openAppOnPhone() {
    Log.D('openAppInStoreOnPhone()');
    try {

      this.mResultReceiver.onReceiveFunction = this.onResultData.bind(this);

      const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType
        .getPhoneDeviceType(ad.getApplicationContext());
      switch (phoneDeviceType) {
        // Paired to Android phone, use Play Store URI.
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
          Log.D('\tDEVICE_TYPE_ANDROID');
          // Create Remote Intent to open Play Store listing of app on remote device.
          const intentAndroid =
            new android.content.Intent(android.content.Intent.ACTION_VIEW)
              .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
              .setData(android.net.Uri.parse(this.ANDROID_MARKET_APP_URI));

          com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
            ad.getApplicationContext(),
            intentAndroid,
            this.mResultReceiver);
          break;

        // Paired to iPhone, use iTunes App Store URI
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
          Log.D('\tDEVICE_TYPE_IOS');

          // Create Remote Intent to open App Store listing of app on iPhone.
          const intentIOS =
            new android.content.Intent(android.content.Intent.ACTION_VIEW)
              .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
              .setData(android.net.Uri.parse(this.APP_STORE_APP_URI));

          com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
            ad.getApplicationContext(),
            intentIOS,
            this.mResultReceiver);
          break;

        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ERROR_UNKNOWN:
          Log.E('\tDEVICE_TYPE_ERROR_UNKNOWN');
          break;
      }
      // now show the open on phone activity
      this.showConfirmation(
        android.support.wearable.activity.ConfirmationActivity.OPEN_ON_PHONE_ANIMATION
      );
    } catch (err) {
      Log.E('Error opening on phone:', err);
    }
  }

  async onConnectPushTrackerTap() {
    if (!this.kinveyService.hasAuth()) {
      const validAuth = await this.updateAuthorization();
      if (!validAuth) {
        this.openAppOnPhone();
        return;
      }
    }
    // if we got here then we have valid authorization!
    this.showConfirmation(
      android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
    );
  }

  /**
   * END FOR COMMUNICATIONS WITH PHONE
   */

  async showConfirmation(animationType: number, message?: string) {
    const intent = new android.content.Intent(
      ad.getApplicationContext(),
      android.support.wearable.activity.ConfirmationActivity.class
    );
    intent.putExtra(
      android.support.wearable.activity.ConfirmationActivity.EXTRA_ANIMATION_TYPE,
      animationType);
    if (message !== undefined) {
      intent.putExtra(
        android.support.wearable.activity.ConfirmationActivity.EXTRA_MESSAGE,
        message);
    }
    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NO_ANIMATION);
    application.android.foregroundActivity.startActivity(intent);
    application.android.foregroundActivity.overridePendingTransition(0, 0);
  }

  registerForTimeUpdates() {
    // monitor the clock / system time for display and logging:
    const timeReceiverCallback = (androidContext, intent) => {
      try {
        this.sentryBreadCrumb('timeReceiverCallback');
        // update charts if date has changed
        if (!isSameDay(new Date(), this.lastChartDay)) {
          this.updateDisplay();
        }
      } catch (error) {
        // Sentry.captureException(error);
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

  async updateChartData() {
    // Log.D('Updating Chart Data / Display');
    try {
      let activityData = await this.getActivityInfoFromDatabase(7) as any[];
      // we've asked for one more day than needed so that we can
      // compute distance differences
      const oldest = activityData[0];
      const newest = last(activityData);
      // keep track of the most recent day so we know when to update
      this.lastChartDay = new Date(newest.date);
      // remove the oldest so it's not displayed - we only use it
      // to track distance differences
      activityData = activityData.slice(1);
      // update coast data
      const maxCoast = activityData.reduce((max, obj) => {
        return obj.coast_time_avg > max ?
          obj.coast_time_avg : max;
      }, 0);
      const coastData = activityData.map(e => {
        return {
          day: this.format(new Date(e.date), 'dd'),
          value: (e.coast_time_avg * 100.0) / (maxCoast || 1)
        };
      });
      // Log.D('Highest Coast Value:', maxCoast);
      this.coastChartMaxValue = maxCoast.toFixed(1);
      this.coastChartData = coastData;
    } catch (err) {
      // Sentry.captureException(err);
    }
  }

  onProfileTap() {
    this.updateUserData();
    if (this.settingsScrollView) {
      // reset to to the top when entering the page
      this.settingsScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this.settingsLayout);
    this.enableLayout('settings');
  }

  onEditProfileTap() {
    if (this.profileScrollView) {
      // reset to to the top when entering the page
      this.profileScrollView.scrollToVerticalOffset(0, true);
    }
    showOffScreenLayout(this.profileLayout);
    this.enableLayout('profile');
  }

  onSettingsInfoItemTap(args: EventData) {
    const messageKey = 'settings.' + this.activeSettingToChange + '.description';
    const message = this.changeSettingKeyString + ':\n\n' + L(messageKey);
    alert({
      title: L('settings.information'),
      message: message,
      okButtonText: L('buttons.ok')
    });
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settings);
    const tappedId = args.object.id as string;
    this.activeSettingToChange = tappedId.toLowerCase();
    const translationKey = 'settings.' + this.activeSettingToChange + '.title';
    this.changeSettingKeyString = L(translationKey);
    this.updateSettingsChangeDisplay();

    showOffScreenLayout(this.changeSettingsLayout).then(() => {
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
    let value = null;
    switch (this.activeSettingToChange) {
      case 'coastgoal':
        this.changeSettingKeyValue =
          this.tempSettings.coastGoal.toFixed(1) + ' ' + L('settings.coastgoal.units');
        break;
      case 'distancegoal':
        value = this.tempSettings.distanceGoal;
        if (this.tempSettings.units === 'metric') {
          value *= 1.609;
        }
        this.changeSettingKeyValue = value.toFixed(1) + ' ';
        translationKey = 'settings.distancegoal.units.' + this.tempSettings.units;
        this.changeSettingKeyValue += L(translationKey);
        break;
      case 'height':
        this.changeSettingKeyValue = this.tempSettings.getHeightDisplay();
        break;
      case 'units':
        translationKey =
          'settings.units.values.' + this.tempSettings.units.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'weight':
        value = this.tempSettings.weight;
        if (this.tempSettings.units === 'english') {
          value *= 2.20462;
        }
        this.changeSettingKeyValue = Math.round(value) + ' ';
        translationKey = 'settings.weight.units.' + this.tempSettings.units;
        this.changeSettingKeyValue += L(translationKey);
        break;
      case 'watchrequired':
        if (this.disableWearCheck) {
          this.changeSettingKeyValue = L(
            'settings.watchrequired.values.disabled'
          );
        } else {
          this.changeSettingKeyValue = L(
            'settings.watchrequired.values.enabled'
          );
        }
        break;
      default:
        break;
    }
  }

  onCancelChangesTap() {
    hideOffScreenLayout(this.changeSettingsLayout, { x: 500, y: 0 });
    this.previousLayout();
  }

  updateDisplay() {
    try {
      // load the distance from the smartdrive app
      this.loadSmartDriveData();
      // update the goal displays
      this.updateGoalDisplay();
      // update distance units
      this.distanceUnits = L(
        'goals.distance.' + this.settings.units.toLowerCase()
      );
      this.updateChartData();
    } catch (err) {
      // Sentry.captureException(err);
      Log.E('Could not update display', err);
    }
  }

  updateGoalDisplay() {
    // distance goal display
    this.distanceGoalValue = this.settings.distanceGoal; // always in miles
    // always compute progress prior to conversion of units
    this.distanceGoalCurrentProgress =
      (this.distanceGoalCurrentValue / this.distanceGoalValue) * 100.0;
    this.distanceGoalCurrentValueDisplay = this.distanceGoalCurrentValue.toFixed(1);
    this.distanceGoalValueDisplay = this.distanceGoalValue.toFixed(1);
    // update the distance displays in case they are metric
    if (this.settings.units === 'metric') {
      this.distanceGoalCurrentValueDisplay = (this.distanceGoalCurrentValue * 1.609).toFixed(1);
      this.distanceGoalValueDisplay = (this.distanceGoalValue * 1.609).toFixed(1);
    }
    // coast goal display
    this.coastGoalValue = this.settings.coastGoal;
    this.coastGoalCurrentProgress =
      (this.coastGoalCurrentValue / this.coastGoalValue) * 100.0;
    this.coastGoalCurrentValueDisplay = this.coastGoalCurrentValue.toFixed(1);
    this.coastGoalValueDisplay = this.coastGoalValue.toFixed(1);
    // push count display
    this.currentPushCountDisplay = this.currentPushCount.toFixed(0);
  }

  updateSpeedDisplay() {
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this.changeSettingsLayout, {
      x: 500,
      y: 0
    });
    this.previousLayout();
    // SAVE THE VALUE to local data for the setting user has selected
    this.settings.copy(this.tempSettings);
    this.saveSettings();
    this.sendSettings();
    // now update any display that needs settings:
    this.updateDisplay();
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.activeSettingToChange);
    if (this.activeSettingToChange === 'watchrequired') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap() {
    this.tempSettings.decrease(this.activeSettingToChange);
    if (this.activeSettingToChange === 'watchrequired') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    this.updateSettingsChangeDisplay();
  }

  onChangeSettingsLayoutLoaded(args) {
    this.changeSettingsLayout = args.object as SwipeDismissLayout;
    // disabling swipeable to make it easier to tap the cancel button
    // without starting the swipe behavior
    (this.changeSettingsLayout as any).swipeable = false;
  }

  /**
   * user / Profile / Settings saving / loading
   */
  async sendSettings() {
    // make sure kinvey service is initialized
    if (this.kinveyService === undefined) {
      this.showConfirmation(
        android.support.wearable.activity.ConfirmationActivity.FAILURE_ANIMATION,
        L('failures.not-fully-initialized')
      );
      return;
    }
    // make sure the kinvey service has authentication (or get it)
    if (!this.kinveyService.hasAuth()) {
      const validAuth = await this.updateAuthorization();
      if (!validAuth) {
        this.showConfirmation(
          android.support.wearable.activity.ConfirmationActivity.FAILURE_ANIMATION,
          L('failures.not-connected-to-mobile')
        );
        return;
      }
    }
    try {
      // TODO: waiting on the resolution of this to not have to get
      // the user data again
      // https://support.kinvey.com/support/tickets/6897
      Log.D('requesting user data');
      // now request user data
      const userData = await this.kinveyService.getUserData() as any;
      const values = this.settings.toUser();
      Object.keys(values).map(k => {
        userData[k] = values[k];
      });
      // don't want to do anything to these
      delete userData._acl;
      delete userData._kmd;

      const response = await this.kinveyService.updateUser(userData);
      const statusCode = response && response.statusCode;
      if (statusCode !== 200) {
        throw response;
      }
      this.showConfirmation(
        android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
      );
    } catch (err) {
      Log.E('could not save to database:', err);
      this.showConfirmation(
        android.support.wearable.activity.ConfirmationActivity.FAILURE_ANIMATION,
        L('failures.could-not-update-profile') + `: ${err}`
      );
    }
  }

  loadSettings() {
    this.settings.copy(
      LS.getItem('com.permobil.pushtracker.profile.settings')
    );
    this.hasSentSettings =
      appSettings.getBoolean(DataKeys.PROFILE_SETTINGS_DIRTY_FLAG) || false;

    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = ad
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    this.disableWearCheck = sharedPreferences.getBoolean(
      prefix + com.permobil.pushtracker.Datastore.DISABLE_WEAR_CHECK_KEY,
      false
    );
  }

  saveSettings() {
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = ad
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    const editor = sharedPreferences.edit();
    editor.putBoolean(
      prefix + com.permobil.pushtracker.Datastore.DISABLE_WEAR_CHECK_KEY,
      this.disableWearCheck
    );
    editor.commit();
    appSettings.setBoolean(
      DataKeys.PROFILE_SETTINGS_DIRTY_FLAG,
      this.hasSentSettings
    );
    LS.setItemObject(
      'com.permobil.pushtracker.profile.settings',
      this.settings.toObj()
    );
  }

  /*
   * DATABASE FUNCTIONS
   */
  async getTodaysActivityInfoFromDatabase() {
    try {
      const e = await this.sqliteService
        .getLast(DailyActivity.Info.TableName, DailyActivity.Info.IdName);
      const date = new Date((e && e[1]) || null);
      if (e && e[1] && isToday(date)) {
        // @ts-ignore
        return DailyActivity.Info.loadInfo(...e);
      } else {
        return DailyActivity.Info.newInfo(new Date(), 0, 0, 0);
      }
    } catch (err) {
      // Sentry.captureException(err);
      // nothing was found
      return DailyActivity.Info.newInfo(new Date(), 0, 0, 0);
    }
  }

  async getActivityInfoFromDatabase(numDays: number) {
    const dates = DailyActivity.Info.getPastDates(numDays);
    const activityInfo = dates.map((d: Date) => {
      if (debug) {
        const pushes = Math.random() * 3000 + 1000;
        const coast = Math.random() * 10.0 + 0.5;
        const distance = Math.random() * 5.0 + 1.0;
        return DailyActivity.Info.newInfo(d, pushes, coast, distance);
      } else {
        return DailyActivity.Info.newInfo(d, 0, 0, 0);
      }
    });
    try {
      const objs = await this.getRecentInfoFromDatabase(numDays + 1);
      objs.map((o: any) => {
        // @ts-ignore
        const obj = DailyActivity.Info.loadInfo(...o);
        // have to ts-ignore since we're using the java defs.
        // @ts-ignore
        const objDate = new Date(obj.date);
        const index = closestIndexTo(objDate, dates);
        const activityDate = dates[index];
        // Log.D('recent info:', o);
        if (index > -1 && isSameDay(objDate, activityDate)) {
          activityInfo[index] = obj;
        }
      });
    } catch (err) {
      // Sentry.captureException(err);
      Log.E('error getting recent info:', err);
    }
    return activityInfo;
  }

  async getRecentInfoFromDatabase(numRecentEntries: number) {
    let recentInfo = [];
    try {
      recentInfo = await this.sqliteService.getAll({
        tableName: DailyActivity.Info.TableName,
        orderBy: DailyActivity.Info.DateName,
        ascending: false,
        limit: numRecentEntries
      });
    } catch (err) {
      Log.E('getRecentnfoFromDatabase', err);
    }
    return recentInfo;
  }

  public motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  public caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  /**
   * Network Functions
   */
  async updateAuthorization() {
    // check the content provider here to see if the user has
    // sync-ed up with the pushtracker mobile app
    let authorization = null;
    let userId = null;
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = ad
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    const savedToken = sharedPreferences.getString(
      prefix + com.permobil.pushtracker.Datastore.AUTHORIZATION_KEY,
      ''
    );
    const savedUserId = sharedPreferences.getString(
      prefix + com.permobil.pushtracker.Datastore.USER_ID_KEY,
      ''
    );
    if (savedToken && savedToken.length && savedUserId && savedUserId.length) {
      authorization = savedToken;
      userId = savedUserId;
    }

    if (authorization === null || userId === null) {
      // if the user has not configured this app with the PushTracker
      // Mobile app
      Log.D('No authorization found in app settings!');
      try {
        const contentResolver = ad
          .getApplicationContext()
          .getContentResolver();
        const authCursor = contentResolver
          .query(
            com.permobil.pushtracker.DatabaseHandler.AUTHORIZATION_URI,
            null, null, null, null);
        if (authCursor && authCursor.moveToFirst()) {
          // there is data
          const token = authCursor.getString(
            com.permobil.pushtracker.DatabaseHandler.DATA_INDEX
          );
          authCursor.close();
          Log.D('Got token:', token);
          if (token !== null && token.length) {
            // we have a valid token
            authorization = token;
          }
        } else {
          Log.E('Could not get authCursor to move to first:', authCursor);
        }
        const idCursor = contentResolver
          .query(
            com.permobil.pushtracker.DatabaseHandler.USER_ID_URI,
            null, null, null, null);
        if (idCursor && idCursor.moveToFirst()) {
          // there is data
          const uid = idCursor.getString(
            com.permobil.pushtracker.DatabaseHandler.DATA_INDEX
          );
          idCursor.close();
          Log.D('Got uid:', uid);
          if (uid !== null && uid.length) {
            // we have a valid token
            userId = uid;
          }
        } else {
          Log.E('Could not get idCursor to move to first:', idCursor);
        }
      } catch (err) {
        Log.E('error getting auth:', err);
      }
    }
    if (authorization === null || userId === null) {
      Log.D('No authorization found in anywhere!');
      return false;
    }
    // now set the authorization and see if it's valid
    const validAuth = await this.kinveyService.setAuth(authorization, userId);
    return validAuth;
  }

  private sentryBreadCrumb(message: string) {
    Sentry.captureBreadcrumb({
      message,
      category: 'info',
      level: Level.Info
    });
  }
}
