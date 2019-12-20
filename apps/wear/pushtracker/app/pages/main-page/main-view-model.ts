import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { EventData, Observable, Page, ShowModalOptions, View, ViewBase } from '@nativescript/core';
import * as application from '@nativescript/core/application';
import * as appSettings from '@nativescript/core/application-settings';
import { screen } from '@nativescript/core/platform';
import { alert } from '@nativescript/core/ui/dialogs';
import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { Log } from '@permobil/core';
import { getDefaultLang, L, Prop } from '@permobil/nativescript';
import { closestIndexTo, format, isSameDay, isToday } from 'date-fns';
import { ReflectiveInjector } from 'injection-js';
import * as LS from 'nativescript-localstorage';
import { Pager } from 'nativescript-pager';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Sentry } from 'nativescript-sentry';
import { DataBroadcastReceiver } from '../../data-broadcast-receiver';
import { DataKeys } from '../../enums';
import { DailyActivity, Profile } from '../../namespaces';
import { PushTrackerKinveyService, SqliteService } from '../../services';
import { applyTheme, getSerialNumber, loadSerialNumber, saveSerialNumber, sentryBreadCrumb } from '../../utils';

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

const debug: boolean = false;

export class MainViewModel extends Observable {
  // #region "Public Members for UI"

  /**
   * Goal progress data.
   *   * CurrentProgress: [0,100] used for ring display
   *   * CurrentValue: {R} actual daily number used for text display
   *   * Value: {R} actual goal number used for text display
   */
  @Prop() distanceGoalValue: number = 0;
  @Prop() distanceGoalCurrentValue: number = 0;
  @Prop() distanceGoalCurrentProgress: number =
    (this.distanceGoalCurrentValue / this.distanceGoalValue) * 100.0;
  @Prop()
  distanceGoalCurrentValueDisplay = this.distanceGoalCurrentValue.toFixed(1);
  @Prop() distanceGoalValueDisplay = this.distanceGoalValue.toFixed(1);
  @Prop() coastGoalValue: number = 0;
  @Prop() coastGoalCurrentValue: number = 0;
  @Prop() coastGoalCurrentProgress: number =
    (this.coastGoalCurrentValue / this.coastGoalValue) * 100.0;
  @Prop() coastGoalCurrentValueDisplay = this.coastGoalCurrentValue.toFixed(1);
  @Prop() coastGoalValueDisplay = this.coastGoalValue.toFixed(1);
  @Prop() distanceUnits: string = '';
  /**
   * For showing button to install SD.W app
   */
  @Prop() isSmartDriveAppInstalled: boolean = false;
  // for managing when we send data to server
  @Prop() watchIsCharging: boolean = false;

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

  /**
   * Settings
   */
  @Prop() settings: Profile.Settings = new Profile.Settings();

  /**
   * Activity Related Data
   */
  @Prop() currentPushCount: number = 0;
  @Prop() currentPushCountDisplay = this.currentPushCount.toFixed(0);
  @Prop() currentHighStressActivityCount: number = 0;

  /**
   * Layout related data
   */
  @Prop() insetPadding: number = 0;
  @Prop() chinSize: number = 0;

  // #endregion "Public Members for UI"

  // #region "Private Members"
  private CAPABILITY_WEAR_APP: string = 'permobil_pushtracker_wear_app';
  private CAPABILITY_PHONE_APP: string = 'permobil_pushtracker_phone_app';

  private _showingModal: boolean = false;

  private pager: Pager = null;
  private _mainPage: ViewBase = null;
  private _synchronizingModal: string =
    'pages/modals/synchronizing/synchronizing';
  private _synchronizingView: ViewBase = null;

  // used to update the chart display when the date changes
  private lastChartDay = null;
  // Used for doing work while charing
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;
  /**
   * User interaction objects
   */
  private sqliteService: SqliteService;
  private kinveyService: PushTrackerKinveyService;

  // permissions for the app
  private permissionsNeeded: any[] = [];
  private permissionsReasons: string[] = [];

  /**
   * FOR COMMUNICATING WITH PHONE AND DETERMINING IF THE PHONE HAS THE
   * APP, AND FOR OPENING THE APP STORE OR APP
   */
  private PHONE_ANDROID_PACKAGE_NAME = 'com.permobil.pushtracker';
  private PHONE_IOS_APP_STORE_URI =
    'https://itunes.apple.com/us/app/pushtracker/id1121427802';
  private ANDROID_MARKET_SMARTDRIVE_URI =
    'market://details?id=com.permobil.smartdrive.wearos';
  private serviceDataReceiver = new DataBroadcastReceiver();
  // #endregion "Private Members"

  constructor() {
    super();
    sentryBreadCrumb('Main-View-Model constructor.');
    // determine inset padding
    this._setupInsetChin();
  }

  // #region "Public Functions"

  async onMainPageLoaded(args: EventData) {
    sentryBreadCrumb('onMainPageLoaded');
    try {
      // apply theme
      this._applyTheme('default');
    } catch (err) {
      Sentry.captureException(err);
      Log.E('theme on startup error:', err);
    }
    // now init the ui
    try {
      this._init().then(() => {
        Log.D('init finished in the main-view-model');
      });
    } catch (err) {
      Sentry.captureException(err);
      Log.E('activity init error:', err);
    }
    try {
      // store reference to pageer so that we can control what page
      // it's on programatically
      const page = args.object as Page;
      this._mainPage = page;
    } catch (err) {
      Sentry.captureException(err);
      Log.E('onMainPageLoaded::error:', err);
    }
  }

  onPagerLoaded(args: EventData) {
    this.pager = args.object as Pager;
  }

  customWOLInsetLoaded(args: EventData) {
    (args.object as any).nativeView.setPadding(
      this.insetPadding,
      this.insetPadding,
      this.insetPadding,
      0
    );
  }

  onInstallSmartDriveTap() {
    const intent = new android.content.Intent(
      android.content.Intent.ACTION_VIEW
    )
      .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
      .addFlags(
        android.content.Intent.FLAG_ACTIVITY_NO_HISTORY |
          android.content.Intent.FLAG_ACTIVITY_CLEAR_WHEN_TASK_RESET
      )
      .setData(android.net.Uri.parse(this.ANDROID_MARKET_SMARTDRIVE_URI));
    application.android.foregroundActivity.startActivity(intent);
  }

  async onSettingsTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing settings');
      return;
    }
    await this.updateUserData(); // do we need to do this when opening the settings as modal, not certain, need to review

    const settingsPage = 'pages/modals/settings/settings';
    const btn = args.object as View;
    const option: ShowModalOptions = {
      context: {
        kinveyService: this.kinveyService
      },
      closeCallback: () => {
        this._showingModal = false;
        // now we need to update the display since goals / units may have changed
        this._updateDisplay();
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal(settingsPage, option);
  }

  /**
   * Main Menu Button Tap Handlers
   */
  onAboutTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing about');
      return;
    }
    const aboutPage = 'pages/modals/about/about';
    const btn = args.object as View;
    const option: ShowModalOptions = {
      context: {
        kinveyService: this.kinveyService
      },
      closeCallback: () => {
        this._showingModal = false;
        // we dont do anything with the about to return anything
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal(aboutPage, option);
  }

  debugTap() {
    /*
    debug = !debug;
    if (debug) {
      this.currentPushCount = Math.random() * 2000 + 1000;
      this.distanceGoalValue = Math.random() * 10.0 + 2.0;
      this.distanceGoalCurrentValue = debug
        ? Math.random() * this.distanceGoalValue
        : 0;
      this.coastGoalValue = Math.random() * 10 + 2.0;
      this.coastGoalCurrentValue = Math.random() * this.coastGoalValue;
    } else {
      this._loadCurrentActivityData();
    }
    this._updateDisplay();
    */
  }

  async onConnectPushTrackerTap() {
    if (!this.kinveyService.hasAuth()) {
      const validAuth = await this._updateAuthorization();
      if (!validAuth) {
        this._openAppOnPhone();
        return;
      }
    }
    // send an intent to the service - if it is already running this
    // will trigger a push to the server of the data
    this._sendIntentToService();
    // if we got here then we have valid authorization!
    this._showConfirmation(
      android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
    );
  }

  // #endregion "Public Functions"

  // #region "Private Functions"

  private async _init() {
    sentryBreadCrumb('Main-View-Model _init.');

    // handle application lifecycle events
    sentryBreadCrumb('Registering app event handlers.');
    this._registerAppEventHandlers();
    sentryBreadCrumb('App event handlers registered.');

    this._registerForServiceDataUpdates();

    // configure the needed permissions
    this.permissionsNeeded = [];
    if (WearOsComms.phoneIsIos()) {
      this.permissionsNeeded.push(
        android.Manifest.permission.ACCESS_COARSE_LOCATION
      );
      this.permissionsReasons.push(L('permissions-reasons.coarse-location'));
    }
    this.permissionsNeeded.push(android.Manifest.permission.READ_PHONE_STATE);
    this.permissionsReasons.push(L('permissions-reasons.phone-state'));

    console.time('Sentry_Init');
    // init sentry - DNS key for permobil-wear Sentry project
    Sentry.init(
      'https://5670a4108fb84bc6b2a8c427ab353472@sentry.io/1485857'
      // 'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1485857'
    );
    console.timeEnd('Sentry_Init');

    sentryBreadCrumb('Creating services...');
    const injector = ReflectiveInjector.resolveAndCreate([
      SqliteService,
      PushTrackerKinveyService
    ]);
    this.sqliteService = injector.get(SqliteService);
    this.kinveyService = injector.get(PushTrackerKinveyService);
    sentryBreadCrumb('All Services created.');

    // initialize data storage for usage, errors, settings
    this._initSqliteTables();
    //  // load serial number from settings / memory
    const savedSerial = loadSerialNumber();
    if (savedSerial && savedSerial.length) {
      this.kinveyService.watch_serial_number = savedSerial;
    }

    // load settings from memory
    sentryBreadCrumb('Loading settings.');
    this._loadSettings();
    sentryBreadCrumb('Settings loaded.');

    // load activity data
    this._loadCurrentActivityData();

    sentryBreadCrumb('Updating display.');
    this._updateDisplay();
    sentryBreadCrumb('Display updated.');

    // register for time updates
    this._registerForTimeUpdates();

    // determine if the smartdrive app is installed
    this.isSmartDriveAppInstalled = this._checkPackageInstalled(
      'com.permobil.smartdrive.wearos'
    );

    setTimeout(this._startActivityService.bind(this), 5000);
  }

  private async _initSqliteTables() {
    sentryBreadCrumb('Initializing SQLite...');
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
      sentryBreadCrumb('SQLite has been initialized.');
    } catch (err) {
      // Sentry.captureException(err);
      Log.E('Could not make table:', err);
    }
  }

  private _loadSmartDriveData() {
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
      const cursor = androidUtils
        .getApplicationContext()
        .getContentResolver()
        .query(
          com.permobil.pushtracker.SmartDriveUsageProvider.USAGE_URI,
          null,
          null,
          null,
          null
        );
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
            // @ts-ignore
            if (value) value += '%';
          }
          return {
            day: this.format(date, 'dd'),
            value: value
          };
        });
      } else {
        Log.E('could not create package context!');
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

  private _loadCurrentActivityData() {
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = androidUtils
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

  private _onServiceData(context, intent) {
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
    this._updateDisplay();
  }

  private _registerForServiceDataUpdates() {
    sentryBreadCrumb('Registering for service data updates.');
    this.serviceDataReceiver.onReceiveFunction = this._onServiceData.bind(this);
    const context = androidUtils.getApplicationContext();
    androidx.localbroadcastmanager.content.LocalBroadcastManager.getInstance(
      context
    ).registerReceiver(
      this.serviceDataReceiver,
      new android.content.IntentFilter(
        com.permobil.pushtracker.Constants.ACTIVITY_SERVICE_DATA_INTENT_KEY
      )
    );
    sentryBreadCrumb('Service Data Update registered.');
  }

  private async _onMessageReceived(data: {
    path: string;
    message: string;
    device: any;
  }) {
    Log.D('on message received:', data.path, data.message);
    this.showSynchronizing();
    const splits = data.message.split(':');
    if (splits.length <= 1) {
      this.hideSynchronizing();
      // we got bad data
      alert({
        title: L('failures.title'),
        message: L('wearos-comms.errors.bad-data'),
        okButtonText: L('buttons.ok')
      });
      return;
    }
    const userId = splits[0];
    // join them in case the token had ':' in it
    const token = splits.slice(1).join(':');
    Log.D('Got auth', userId, token);
    // now save it to datastore for service to use
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = androidUtils
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    const editor = sharedPreferences.edit();
    editor.putString(
      prefix + com.permobil.pushtracker.Datastore.USER_ID_KEY,
      userId
    );
    editor.putString(
      prefix + com.permobil.pushtracker.Datastore.AUTHORIZATION_KEY,
      token
    );
    editor.commit();
    try {
      const contentResolver = androidUtils
        .getApplicationContext()
        .getContentResolver();
      // write token to content provider for smartdrive wear
      const tokenValue = new android.content.ContentValues();
      tokenValue.put('data', token);
      contentResolver.insert(
        com.permobil.pushtracker.DatabaseHandler.AUTHORIZATION_URI,
        tokenValue
      );

      // write user id to content provider for smartdrive wear
      const userValue = new android.content.ContentValues();
      userValue.put('data', userId);
      contentResolver.insert(
        com.permobil.pushtracker.DatabaseHandler.USER_ID_URI,
        userValue
      );
    } catch (err) {
      Log.E('Could not set content values for authorization:', err);
    }
    // now actually check the authorization that we were provided
    const validAuth = await this._updateAuthorization();
    this.hideSynchronizing();
    if (validAuth) {
      // if we got here then we have valid authorization!
      this._showConfirmation(
        android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
      );
    } else {
      await alert({
        title: L('failures.title'),
        message: L('wearos-comms.errors.bad-authorization'),
        okButtonText: L('buttons.ok')
      });
    }
  }

  private async _onDataReceived(data: { data: any; device: any }) {
    Log.D('on data received:', data);
  }

  private async _startActivityService() {
    try {
      await this._askForPermissions();
      // init wear os comms which will be needed for communications
      // between the service and the phone / backend
      this._initWearOsComms();
      // sending an intent to the service will start it if it is not
      // already running
      this._sendIntentToService();
      // now that we're sure everything is running, try to pull data
      // from the server
      setTimeout(this.updateUserData.bind(this), 1000);
    } catch (err) {
      // permissions weren't granted - so try again later
      setTimeout(this._startActivityService.bind(this), 10000);
    }
  }

  private async _initWearOsComms() {
    try {
      // start the wear os communications
      Log.D('registering callbacks');
      WearOsComms.setDebugOutput(false);
      WearOsComms.registerMessageCallback(this._onMessageReceived.bind(this));
      WearOsComms.registerDataCallback(this._onDataReceived.bind(this));
      Log.D('initializing wear os comms!');
      WearOsComms.initWatch();
      sentryBreadCrumb('Wear os comms started.');
    } catch (err) {
      Sentry.captureException(err);
      Log.E('could not advertise as companion');
    }
  }

  private async _sendIntentToService() {
    try {
      sentryBreadCrumb('Sending intent to Activity Service.');
      const intent = new android.content.Intent();
      const context = application.android.context;
      intent.setClassName(context, 'com.permobil.pushtracker.ActivityService');
      intent.setAction('ACTION_START_SERVICE');
      context.startService(intent);
      sentryBreadCrumb('Activity Service started.');
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  private async _askForPermissions() {
    // will throw an error if permissions are denied, else will
    // return either true or a permissions object detailing all the
    // granted permissions. The error thrown details which
    // permissions were rejected
    const neededPermissions = this.permissionsNeeded.filter(
      p => !hasPermission(p)
    );
    const reasons = this.permissionsReasons.join('\n\n');
    if (neededPermissions && neededPermissions.length > 0) {
      // Log.D('requesting permissions!', neededPermissions);
      await alert({
        title: L('permissions-request.title'),
        message: reasons,
        okButtonText: L('buttons.ok')
      });
      try {
        await requestPermissions(neededPermissions, () => {});
        // now that we have permissions go ahead and save the serial number
        this._updateSerialNumber();
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

  private _updateSerialNumber() {
    const watchSerialNumber = getSerialNumber();
    saveSerialNumber(watchSerialNumber);
    this.kinveyService.watch_serial_number = watchSerialNumber;
  }

  private _applyTheme(theme?: string) {
    // apply theme
    applyTheme(theme);
    this._applyStyle();
  }

  private _applyStyle() {
    sentryBreadCrumb('applying style');
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
        }
      }
    } catch (err) {
      Sentry.captureException(err);
    }
    sentryBreadCrumb('style applied');
  }

  /**
   * Application lifecycle event handlers
   */
  private _registerAppEventHandlers() {
    // handle ambient mode callbacks
    application.on('enterAmbient', () => {
      sentryBreadCrumb('*** enterAmbient ***');
      this._applyTheme('ambient');
    });

    application.on('updateAmbient', () => {});

    application.on('exitAmbient', () => {
      sentryBreadCrumb('*** exitAmbient ***');
      this._applyTheme('default');
    });

    // Activity lifecycle event handlers
    application.on(application.exitEvent, async () => {
      sentryBreadCrumb('*** appExit ***');
      await WearOsComms.stopWatch();
    });
    application.on(
      application.lowMemoryEvent,
      (args: application.ApplicationEventData) => {
        sentryBreadCrumb('*** appLowMemory ***');
      }
    );
  }

  private format(d: Date, fmt: string) {
    return format(d, fmt, {
      locale: dateLocales[getDefaultLang()] || dateLocales['en']
    });
  }

  private showSynchronizing() {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing synchronizing');
      return;
    }
    const option: ShowModalOptions = {
      context: {},
      closeCallback: () => {
        this._showingModal = false;
        // we dont do anything with the about to return anything
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    this._synchronizingView = this._mainPage.showModal(
      this._synchronizingModal,
      option
    );
  }

  private hideSynchronizing() {
    this._synchronizingView.closeModal();
    this._showingModal = false;
  }

  private async updateUserData() {
    // make sure kinvey service is initialized
    if (this.kinveyService === undefined) {
      return;
    }
    // make sure the kinvey service has authentication (or get it)
    if (!this.kinveyService.hasAuth()) {
      const validAuth = await this._updateAuthorization();
      if (!validAuth) {
        return;
      }
    }
    // now actually update the user data
    try {
      Log.D('requesting user data');
      // now request user data
      this.showSynchronizing();
      const userData = (await this.kinveyService.getUserData()) as any;
      // Log.D('userInfo', JSON.stringify(userData, null, 2));
      // save stuff for display
      const userName = `${userData.first_name}\n${userData.last_name}`;
      const userEmail = userData.username;
      const userId = userData._id;
      // set the info for display
      appSettings.setString(DataKeys.USER_NAME, userName);
      appSettings.setString(DataKeys.USER_EMAIL, userEmail);
      // set the info for sentry
      Sentry.setContextUser({
        id: userId,
        email: userEmail,
        username: userEmail
      });
      // pull the data out of the user structure
      this.settings.fromUser(userData);
      this._saveSettings();
      // now update any display that needs settings:
      this._updateDisplay();
      this.hideSynchronizing();
    } catch (err) {
      this.hideSynchronizing();
      Log.E('could not get user data:', err);
    }
  }

  private async _openAppOnPhone() {
    Log.D('openAppOnPhone()');
    try {
      this.showSynchronizing();
      if (WearOsComms.phoneIsAndroid()) {
        // see if the paired phone has the companion app
        const devicesWithApp = await WearOsComms.findDevicesWithApp(
          this.CAPABILITY_PHONE_APP
        );
        if (devicesWithApp.length !== 0) {
          this.hideSynchronizing();
          // Create Remote Intent to open app on remote device.
          await WearOsComms.sendUriToPhone('permobil://pushtracker');
        } else {
          // we couldn't open the app on the phone so open the app in
          // the play store
          await WearOsComms.openAppInStoreOnPhone(
            this.PHONE_ANDROID_PACKAGE_NAME,
            this.PHONE_IOS_APP_STORE_URI
          );
        }
      } else {
        // we are paired to an iphone

        // NOTE: THE FOLLOWING IF CLAUSE WILL ALWAYS RETURN FALSE
        // BECAUSE THIS FUNCTION IS ONLY CALLED UNDER THE CONDITION
        // THAT WE DO NOT HAVE AUTH
        if (this.kinveyService && this.kinveyService.hasAuth()) {
          // we've received authorization from the app before, so the
          // app must have been installed - try opening it
          await WearOsComms.sendUriToPhone('permobil://pushtracker');
        } else {
          // never received any information - so the app is likely not
          // installed, open it in the app store
          await WearOsComms.openAppInStoreOnPhone(
            this.PHONE_ANDROID_PACKAGE_NAME,
            this.PHONE_IOS_APP_STORE_URI
          );
        }
      }
      this.hideSynchronizing();
      // now show the open on phone activity
      this._showConfirmation(
        android.support.wearable.activity.ConfirmationActivity
          .OPEN_ON_PHONE_ANIMATION
      );
    } catch (err) {
      Log.E('Error opening on phone:', err);
    }
  }

  /**
   * END FOR COMMUNICATIONS WITH PHONE
   */

  private async _showConfirmation(animationType: number, message?: string) {
    const intent = new android.content.Intent(
      androidUtils.getApplicationContext(),
      android.support.wearable.activity.ConfirmationActivity.class
    );
    intent.putExtra(
      android.support.wearable.activity.ConfirmationActivity
        .EXTRA_ANIMATION_TYPE,
      animationType
    );
    if (message !== undefined) {
      intent.putExtra(
        android.support.wearable.activity.ConfirmationActivity.EXTRA_MESSAGE,
        message
      );
    }
    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NO_ANIMATION);
    application.android.foregroundActivity.startActivity(intent);
    application.android.foregroundActivity.overridePendingTransition(0, 0);
  }

  private _registerForTimeUpdates() {
    // monitor the clock / system time for display and logging:
    const timeReceiverCallback = (androidContext, intent) => {
      try {
        // sentryBreadCrumb('timeReceiverCallback');
        // update charts if date has changed
        if (!isSameDay(new Date(), this.lastChartDay)) {
          sentryBreadCrumb('timereceiver - updating display for new day');
          this._updateDisplay();
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

  private async _updateChartData() {
    // Log.D('Updating Chart Data / Display');
    try {
      let activityData = (await this._getActivityInfoFromDatabase(7)) as any[];
      // we've asked for one more day than needed so that we can
      // compute distance differences
      const oldest = activityData[0];
      // const newest = last(activityData);
      const newest = activityData[activityData.length - 1]; // get the last item in the array
      // keep track of the most recent day so we know when to update
      this.lastChartDay = new Date(newest.date);
      // remove the oldest so it's not displayed - we only use it
      // to track distance differences
      activityData = activityData.slice(1);
      // update coast data
      const maxCoast = activityData.reduce((max, obj) => {
        return obj.coast_time_avg > max ? obj.coast_time_avg : max;
      }, 0);
      const coastData = activityData.map(e => {
        let value = (e.coast_time_avg * 100.0) / (maxCoast || 1);
        // @ts-ignore
        if (value) value += '%';
        return {
          day: this.format(new Date(e.date), 'dd'),
          value: value
        };
      });
      // Log.D('Highest Coast Value:', maxCoast);
      this.coastChartMaxValue = maxCoast.toFixed(1);
      this.coastChartData = coastData;
    } catch (err) {
      // Sentry.captureException(err);
    }
  }

  private _updateDisplay() {
    try {
      // load the settings to make sure goals and such are updated
      this._loadSettings();
      // load the distance from the smartdrive app
      this._loadSmartDriveData();
      // update the goal displays
      this._updateGoalDisplay();
      // update distance units
      this.distanceUnits = L(
        'goals.distance.' + this.settings.units.toLowerCase()
      );
      this._updateChartData();
    } catch (err) {
      // Sentry.captureException(err);
      Log.E('Could not update display', err);
    }
  }

  private _updateGoalDisplay() {
    // distance goal display
    this.distanceGoalValue = this.settings.distanceGoal; // always in miles
    // always compute progress prior to conversion of units
    this.distanceGoalCurrentProgress =
      (this.distanceGoalCurrentValue / this.distanceGoalValue) * 100.0;
    this.distanceGoalCurrentValueDisplay = this.distanceGoalCurrentValue.toFixed(
      1
    );
    this.distanceGoalValueDisplay = this.distanceGoalValue.toFixed(1);
    // update the distance displays in case they are metric
    if (this.settings.units === 'metric') {
      this.distanceGoalCurrentValueDisplay = (
        this.distanceGoalCurrentValue * 1.609
      ).toFixed(1);
      this.distanceGoalValueDisplay = (this.distanceGoalValue * 1.609).toFixed(
        1
      );
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

  private _updateSpeedDisplay() {}

  /**
   * SmartDrive Associated App Functions
   */
  private _checkPackageInstalled(packageName: string) {
    let found = true;
    try {
      application.android.context
        .getPackageManager()
        .getPackageInfo(packageName, 0);
    } catch (err) {
      found = false;
    }
    return found;
  }

  private _saveSettings() {
    LS.setItemObject(
      'com.permobil.pushtracker.profile.settings',
      this.settings.toObj()
    );
  }

  private _loadSettings() {
    const savedSettings = LS.getItem(
      'com.permobil.pushtracker.profile.settings'
    );
    this.settings.copy(savedSettings);
  }

  /*
   * DATABASE FUNCTIONS
   */
  private async getTodaysActivityInfoFromDatabase() {
    try {
      const e = await this.sqliteService.getLast(
        DailyActivity.Info.TableName,
        DailyActivity.Info.IdName
      );
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

  private async _getActivityInfoFromDatabase(numDays: number) {
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
      const objs = await this._getRecentInfoFromDatabase(numDays + 1);
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

  private async _getRecentInfoFromDatabase(numRecentEntries: number) {
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

  /**
   * Network Functions
   */
  private async _updateAuthorization() {
    // check the content provider here to see if the user has
    // sync-ed up with the pushtracker mobile app
    let authorization = null;
    let userId = null;
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = androidUtils
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
        const contentResolver = androidUtils
          .getApplicationContext()
          .getContentResolver();
        const authCursor = contentResolver.query(
          com.permobil.pushtracker.DatabaseHandler.AUTHORIZATION_URI,
          null,
          null,
          null,
          null
        );
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
        const idCursor = contentResolver.query(
          com.permobil.pushtracker.DatabaseHandler.USER_ID_URI,
          null,
          null,
          null,
          null
        );
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

  private _setupInsetChin() {
    // https://developer.android.com/reference/android/content/res/Configuration.htm
    const androidConfig = androidUtils
      .getApplicationContext()
      .getResources()
      .getConfiguration();
    const isCircleWatch = androidConfig.isScreenRound();
    const widthPixels = screen.mainScreen.widthPixels;
    const heightPixels = screen.mainScreen.heightPixels;
    if (isCircleWatch) {
      this.insetPadding = Math.round(0.146467 * widthPixels);
      // if the height !== width then there is a chin!
      if (widthPixels !== heightPixels && widthPixels > heightPixels) {
        this.chinSize = widthPixels - heightPixels;
      }
    }
    // Log.D('chinsize:', this.chinSize);
  }

  // #endregion "Private Functions"
}
