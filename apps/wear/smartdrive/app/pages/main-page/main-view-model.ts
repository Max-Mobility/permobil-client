import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import {
  AndroidActivityEventData,
  AndroidApplication,
  Application,
  ApplicationSettings,
  Color,
  Dialogs,
  Enums,
  EventData,
  Frame,
  GridLayout,
  Observable,
  Screen,
  ScrollView,
  ShowModalOptions,
  StackLayout,
  UnhandledErrorEventData,
  Utils
} from '@nativescript/core';
import { Log, wait } from '@permobil/core';
import {
  getDeviceSerialNumber,
  L,
  performance,
  Prop
} from '@permobil/nativescript';
import { closestIndexTo, isSameDay, isToday } from 'date-fns';
import { ReflectiveInjector } from 'injection-js';
import clamp from 'lodash/clamp';
import last from 'lodash/last';
import once from 'lodash/once';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { Vibrate } from 'nativescript-vibrate';
import { DataKeys } from '../../enums';
import {
  Acceleration,
  SmartDrive,
  SmartDriveException,
  StoredAcceleration,
  TapDetector
} from '../../models';
import { PowerAssist, SmartDriveData } from '../../namespaces';
import {
  BluetoothService,
  SensorChangedEventData,
  SensorService,
  SERVICES,
  SettingsService,
  SmartDriveKinveyService,
  SqliteService
} from '../../services';
import {
  formatDateTime,
  getUpdateInformation,
  isNetworkAvailable,
  sentryBreadCrumb,
  _isActivityThis,
  dailyDistanceNotification,
  odometerRecordNotification
} from '../../utils';
import { updatesViewModel } from '../modals/updates/updates-page';

const ambientTheme = require('../../scss/theme-ambient.scss');
const defaultTheme = require('../../scss/theme-default.scss');

declare const com: any;

export class MainViewModel extends Observable {
  // #region "Public Members for UI"
  @Prop() insetPadding: number = 0;
  @Prop() chinSize: number = 0;
  @Prop() screenWidth: number = 100;
  @Prop() screenHeight: number = 100;
  // battery display
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;
  @Prop() watchCurrentBatteryPercentage: number = 0;
  @Prop() powerAssistRingColor: Color = PowerAssist.InactiveRingColor;
  // smartdrive data display
  @Prop() estimatedDistanceDisplay: string = '0.0';
  // 'Estimated Range (mi)';
  @Prop() estimatedDistanceDescription: string = '';
  @Prop() currentSpeedDisplay: string = '0.0';
  // Speed (mph)';
  @Prop() currentSpeedDescription: string = '';
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

  /**
   * Data related to today's usage specifically
   */
  private _todaysUsage: any;

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
  @Prop() numTaps: number = 0;
  // #endregion "Public Members for UI"

  // #region "Private Members"
  private sendTapTimeoutId: any = null;
  private powerAssistTimeoutId: any = null;

  private _showingModal: boolean = false;

  // private currentSignalStrength: string = '--';
  private currentSpeed: number = 0.0;
  private estimatedDistance: number = 0.0;
  private watchIsCharging: boolean = false;
  // views for main page ambient mode
  private _ambientTimeView: StackLayout;
  private _powerAssistView: GridLayout;
  // tap detector config
  private tapDetector: TapDetector = null;
  private tapTimeoutId: any = null;
  // Sensor listener config:
  private SENSOR_DELAY_US: number = 10 * 1000;
  private MAX_REPORTING_INTERVAL_US: number = 10 * 1000;
  // Estimated range min / max factors
  private minRangeFactor: number = 2.0 / 100.0; // never estimate less than 2 mi per full charge
  private maxRangeFactor: number = 12.0 / 100.0; // never estimate more than 12 mi per full charge
  // error related info
  private lastErrorId: number = null;
  // whether the settings have been sent to the smartdrive
  private hasSentSettingsToSmartDrive: boolean = false;
  private powerAssistState: PowerAssist.State = PowerAssist.State.Inactive;

  /**
   * SmartDrive data display so we don't directly bind to the
   * SmartDrive itself (since it may be null)
   */
  private watchSerialNumber: string = '---';

  /**
   * For seeing if phone app is installed on paired android phone
   */
  private CAPABILITY_PHONE_APP: string = 'permobil_pushtracker_phone_app';

  /**
   * SmartDrive Data / state management
   */
  private smartDrive: SmartDrive;
  private _isUpdatingSmartDrive: boolean = false;
  private _savedSmartDriveAddress: string = null;
  private _ringTimerId = null;
  private RING_TIMER_INTERVAL_MS = 500;
  private CHARGING_WORK_PERIOD_MS = 1 * 60 * 1000;
  private _lastChartDay = null;

  /**
   * User interaction objects
   */
  private initialized: boolean = false;
  private wakeLock: any = null;
  private scrollView: ScrollView;
  private _vibrator: Vibrate = new Vibrate();
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;
  private _sqliteService: SqliteService;
  private _kinveyService: SmartDriveKinveyService;
  private _settingsService: SettingsService;
  private _onceSendSmartDriveSettings: any = null;
  // Used for doing work while charing
  private chargingWorkTimeoutId: any = null;
  // os version info
  private systemIsUpToDate: boolean = false;
  private wearIsUpToDate: boolean = false;
  private buildDisplay: string = null;
  private hasAppliedTheme: boolean = false;
  private _previousData: StoredAcceleration[] = [];
  private _previousDataLength: number = 4;
  private _wifiWasEnabled = false;
  private _bodySensorEnabled: boolean = false;
  private _tapSensorEnabled: boolean = false;

  // private _rssi = 0;
  private rssiIntervalId = null;

  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.ACCESS_COARSE_LOCATION,
    android.Manifest.permission.READ_PHONE_STATE
  ];

  /**
   * FOR COMMUNICATING WITH PHONE AND DETERMINING IF THE PHONE HAS THE
   * APP, AND FOR OPENING THE APP STORE OR APP
   */
  private PHONE_ANDROID_PACKAGE_NAME = 'com.permobil.pushtracker';
  private PHONE_IOS_APP_STORE_URI =
    'https://itunes.apple.com/us/app/pushtracker/id1121427802';

  // #endregion "Private Members"

  constructor() {
    super();
    sentryBreadCrumb('Main-View-Model constructor.');
    // determine inset padding
    this._setupInsetChin();
  }

  get SmartDriveWakeLock() {
    if (this.wakeLock) {
      return this.wakeLock;
    } else {
      // initialize the wake lock here
      const powerManager = Utils.android
        .getApplicationContext()
        .getSystemService(android.content.Context.POWER_SERVICE);
      this.wakeLock = powerManager.newWakeLock(
        // android.os.PowerManager.PARTIAL_WAKE_LOCK, // - best battery life, but allows ambient mode
        android.os.PowerManager.SCREEN_DIM_WAKE_LOCK, // - moderate battery life, buttons still active
        // android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK, // - worst battery life - easy to see
        'com.permobil.smartdrive.wearos::WakeLock'
      );
      return this.wakeLock;
    }
  }

  get disableWearCheck() {
    return this._settingsService.watchSettings.disableWearCheck;
  }

  // #region "Public Functions"

  async onMainPageLoaded(args: EventData) {
    sentryBreadCrumb('onMainPageLoaded');
    try {
      if (!this.hasAppliedTheme) {
        // apply theme
        if (this.isAmbient) {
          this._applyTheme('ambient');
        } else {
          this._applyTheme('default');
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('theme on startup error:', err);
    }
    // now init the ui
    try {
      await this._init();
      Log.D('init finished in the main-view-model');
      // According to Ben: only check for firmware updates on app startup:
      this._checkForUpdates();
      // TODO: schedule notifications here
    } catch (err) {
      Sentry.captureException(err);
      Log.E('activity init error:', err);
    }
  }

  setLeftRightTopPadding(args: EventData) {
    (args.object as any).nativeView.setPadding(
      this.insetPadding,
      this.insetPadding,
      this.insetPadding,
      0
    );
  }
  setLeftRightPadding(args: EventData) {
    (args.object as any).nativeView.setPadding(
      this.insetPadding,
      0,
      this.insetPadding,
      0
    );
  }

  stopSmartDrive() {
    // turn off the motor if SD is connected
    if (this.smartDrive && this.smartDrive.ableToSend && this.motorOn) {
      this.smartDrive.stopMotor().catch(err => {
        Log.E('Could not stop motor', err);
        Sentry.captureException(err);
      });
    }
  }

  toggleTimeDisplay() {
    this.displayTime = !this.displayTime;
  }

  async onSetTimeTap() {
    // open the date/time settings page
    const intent = new android.content.Intent(
      android.provider.Settings.ACTION_DATE_SETTINGS
    );
    Application.android.foregroundActivity.startActivity(intent);
  }

  async onConnectPushTrackerTap() {
    if (!this._checkPackageInstalled('com.permobil.pushtracker')) {
      this._openInPlayStore('com.permobil.pushtracker');
      return;
    }
    if (!this._kinveyService.hasAuth()) {
      const validAuth = await this._updateAuthorization();
      if (!validAuth) {
        this._openAppOnPhone();
        return;
      }
    }
    // try to send the data to synchronize
    await this._onNetworkAvailable();
    // if we got here then we have valid authorization!
    this._showConfirmation(
      android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
    );
  }

  async onPairingTap() {
    try {
      const didSave = await this._saveNewSmartDrive();
      if (didSave) {
        Dialogs.alert({
          title: L('warnings.title.notice'),
          message: `${L('settings.paired-to-smartdrive')}\n\n${
            this.smartDrive.address
            }`,
          okButtonText: L('buttons.ok')
        });
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Could not pair', err);
    }
  }

  /**
   * View Loaded event handlers
   */
  onScrollViewLoaded(args: EventData) {
    this.scrollView = args.object as ScrollView;
  }

  onAmbientTimeViewLoaded(args: EventData) {
    this._ambientTimeView = args.object as StackLayout;
  }

  onPowerAssistViewLoaded(args: EventData) {
    this._powerAssistView = args.object as GridLayout;
  }

  /**
   * Main Menu Button Tap Handlers
   */

  onSettingsTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing settings');
      return;
    }
    const btn = args.object;
    const option: ShowModalOptions = {
      context: {
        settingsService: this._settingsService,
        sdKinveyService: this._kinveyService
      },
      closeCallback: async (shouldConnectSmartDrive: boolean) => {
        this._showingModal = false;
        // we dont do anything with the about to return anything
        // now update any display that needs settings:
        this._updateSpeedDisplay();
        this._updateChartData();
        // see if the user changed accel, SC mode, SC max speed
        // (according to
        // https://github.com/Max-Mobility/permobil-client/issues/337)
        // and ask them if they'd like to send the settings now
        if (shouldConnectSmartDrive) {
          const turnPowerAssistOn = await Dialogs.confirm({
            title: L('warnings.title.notice'),
            message: L('settings.send-settings-prompt'),
            okButtonText: L('power-assist.activate'),
            cancelButtonText: L('buttons.dismiss'),
            cancelable: false
          });
          if (turnPowerAssistOn) {
            this.enablePowerAssist();
          }
        }
      },
      animated: false,
      cancelable: false,
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal('pages/modals/settings/settings-page', option);
  }

  onAboutTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing about');
      return;
    }
    const btn = args.object;
    const option: ShowModalOptions = {
      context: {
        kinveyService: this._kinveyService,
        sqliteService: this._sqliteService,
        bleVersion:
          this.smartDrive && this.smartDrive.hasVersionInfo()
            ? this.smartDrive.ble_version_string
            : '---',
        mcuVersion:
          this.smartDrive && this.smartDrive.hasVersionInfo()
            ? this.smartDrive.mcu_version_string
            : '---'
      },
      closeCallback: () => {
        // we dont do anything with the about to return anything
        this._showingModal = false;
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal('pages/modals/about/about', option);
  }

  private _enablingTraining: boolean = false;
  onTrainingTap() {
    if (this._enablingTraining) {
      return;
    }
    this._enablingTraining = true;
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.must-wear-watch'),
        okButtonText: L('buttons.ok')
      });
      this._enablingTraining = false;
      return;
    }
    const didEnableTapSensor = this._enableTapSensor();
    if (!didEnableTapSensor) {
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.could-not-enable-tap-sensor'),
        okButtonText: L('buttons.ok')
      });
      this._enablingTraining = false;
      return;
    }
    // make sure the UI updates
    if (this.scrollView) {
      this.scrollView.scrollToVerticalOffset(0, false);
    }
    this.isTraining = true;
    this.tapDetector.reset();
    this._maintainCPU();
    this.powerAssistState = PowerAssist.State.Training;
    this._updatePowerAssistRing();
    this._enablingTraining = false;
  }

  onExitTrainingModeTap() {
    this._disableTapSensor();
    this._releaseCPU();
    this.isTraining = false;
    this.powerAssistState = PowerAssist.State.Inactive;
    this._updatePowerAssistRing();
  }

  onUpdatesTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing updates');
      return;
    }
    if (!this.smartDrive) {
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.no-smartdrive-paired'),
        okButtonText: L('buttons.ok')
      });
      return;
    }
    if (!isNetworkAvailable()) {
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.no-network'),
        okButtonText: L('buttons.ok')
      });
      return;
    }
    this._isUpdatingSmartDrive = true;
    // we have a smartdrive and a network, now check for updates
    const btn = args.object;
    const option: ShowModalOptions = {
      context: {
        bluetoothService: this._bluetoothService,
        kinveyService: this._kinveyService,
        sqliteService: this._sqliteService
      },
      closeCallback: () => {
        // we dont do anything with the about to return anything
        this._isUpdatingSmartDrive = false;
        this._showingModal = false;
      },
      animated: false,
      cancelable: false,
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal('pages/modals/updates/updates-page', option);
  }

  private _clearPowerAssistTimeout() {
    // clear the timeout if it exists
    if (this.powerAssistTimeoutId !== null) {
      clearTimeout(this.powerAssistTimeoutId);
      this.powerAssistTimeoutId = null;
    }
  }

  private _restartPowerAssistTimeout(minutes: number) {
    this._clearPowerAssistTimeout();
    // set the timeout again
    this._ensurePowerAssistTimeout(minutes);
  }

  private _ensurePowerAssistTimeout(minutes: number) {
    if (this.powerAssistTimeoutId === null) {
      // set the timeout only if there is no timeout
      this.powerAssistTimeoutId = Utils.setTimeout(
        this.onPowerAssistTimeout.bind(this),
        minutes * 60 * 1000
      );
    }
  }

  private async onPowerAssistTimeout() {
    this._clearPowerAssistTimeout();
    // disable power assist
    this.disablePowerAssist();
    const showDialog = ApplicationSettings.getBoolean(
      DataKeys.SHOULD_SHOW_POWER_ASSIST_TIMEOUT,
      true
    );
    if (showDialog) {
      // and alert the user that we timed out
      Dialogs.confirm({
        title: L('failures.title'),
        message: L('failures.power-assist-timeout'),
        okButtonText: L('buttons.dismiss'),
        cancelButtonText: L('buttons.do-not-show-again'),
        cancelable: false
      }).then((res: boolean) => {
        // res is TRUE if they pressed OK (dismiss) and FALSE if they
        // pressed CANCEL (do not show again), s owe can simply store
        // the result
        ApplicationSettings.setBoolean(
          DataKeys.SHOULD_SHOW_POWER_ASSIST_TIMEOUT,
          res
        );
      });
    }
  }

  private _enablingPowerAssist: boolean = false;
  async enablePowerAssist() {
    if (this._enablingPowerAssist) {
      sentryBreadCrumb('Already enabling power assist!');
      return;
    }
    this._enablingPowerAssist = true;
    sentryBreadCrumb('Enabling power assist');
    // only enable power assist if we're on the user's wrist
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.must-wear-watch'),
        okButtonText: L('buttons.ok')
      });
      this._enablingPowerAssist = false;
      return;
    } else if (this._hasSavedSmartDrive()) {
      try {
        // make sure everything works
        const didEnsure = await this._ensureBluetoothCapabilities();
        if (!didEnsure) {
          this._enablingPowerAssist = false;
          return false;
        }
        // ensure the scrollview is on the right page
        if (this.scrollView) {
          this.scrollView.scrollToVerticalOffset(0, false);
        }
        this.powerAssistActive = true;
        // vibrate for enabling power assist
        this._vibrator.vibrate(200);
        // now actually set up power assist
        clearInterval(this.chargingWorkTimeoutId);
        this.chargingWorkTimeoutId = null;
        this.tapDetector.reset();
        this._disableWifi();
        this._maintainCPU();
        this.powerAssistState = PowerAssist.State.Disconnected;
        this._updatePowerAssistRing();
        const didConnect = await this._connectToSavedSmartDrive();
        if (didConnect) {
          // make sure to clear out any previous tapping state
          this._stopTaps();
          // enable the tap sensor
          const didEnableTapSensor = this._enableTapSensor();
          if (!didEnableTapSensor) {
            // TODO: translate this alert!
            Dialogs.alert({
              title: L('failures.title'),
              message: L('failures.could-not-enable-tap-sensor'),
              okButtonText: L('buttons.ok')
            });
            throw new SmartDriveException(
              'Could not enable tap sensor for power assist!'
            );
          } else {
            // we have successfully done everything to enable power
            // assist, now show the user the change in state
            if (this._ringTimerId === null) {
              this._ringTimerId = setInterval(
                this._blinkPowerAssistRing.bind(this),
                this.RING_TIMER_INTERVAL_MS
              );
            }
            // then set the timeout for power assist for 1 minute
            this._restartPowerAssistTimeout(1);
          }
        } else {
          sentryBreadCrumb('Did not connect, disabling power assist');
          this.disablePowerAssist();
        }
      } catch (err) {
        Sentry.captureException(err);
        // Log.E(`Caught error, disabling power assist: ${err}`);
        this.disablePowerAssist();
      }
    } else {
      const didSave = await this._saveNewSmartDrive();
      if (didSave) {
        Utils.setTimeout(this.enablePowerAssist.bind(this), 300);
      } else {
        sentryBreadCrumb('SmartDrive was not saved!');
      }
    }
    this._enablingPowerAssist = false;
  }

  handleChartTap() {
    this._updateChartData();
  }

  async disablePowerAssist() {
    // ensure that we only vibrate if this was called while power
    // assist was actually on or the motor was still registered as
    // being on.
    const shouldVibrate = this.powerAssistActive || this.motorOn;

    // update state variables
    this.powerAssistActive = false;
    this.motorOn = false;

    sentryBreadCrumb('Disabling power assist');

    // make sure to stop any pending taps
    this._stopTaps();

    // clear timeout if there was one
    this._clearPowerAssistTimeout();

    // decrease energy consumption
    this._disableTapSensor();
    this._releaseCPU();
    this._enableWifi();
    this.powerAssistState = PowerAssist.State.Inactive;

    if (shouldVibrate) {
      // vibrate twice
      this._vibrator.vibrate([0, 200, 50, 200]);
    }

    // update UI
    clearInterval(this._ringTimerId);
    this._ringTimerId = null;
    this._updatePowerAssistRing();

    // turn off the smartdrive
    try {
      await this._disconnectFromSmartDrive();
    } catch (err) {
      Sentry.captureException(err);
    }

    // reset our work interval
    if (this.chargingWorkTimeoutId === null) {
      this.chargingWorkTimeoutId = setInterval(
        this._doWhileCharged.bind(this),
        this.CHARGING_WORK_PERIOD_MS
      );
    }

    // now that we've disabled power assist - make sure the charts
    // update with the latest data from the smartdrive
    this._updateChartData();

    // now that we've updated the chart data and such - check the
    // activity for notifications
    this._updateNotifications();

    return Promise.resolve();
  }

  // #endregion "Public Functions"

  // #region "Private Functions"

  private async _init() {
    if (this.initialized) {
      sentryBreadCrumb('Already initialized.');
      return;
    }

    // init sentry - DNS key for permobil-wear Sentry project
    // Sentry.init(
    //   'https://234acf21357a45c897c3708fcab7135d:bb45d8ca410c4c2ba2cf1b54ddf8ee3e@sentry.io/1376181'
    // );

    // log the build version
    this._logVersions();

    try {
      if (!this.hasAppliedTheme) {
        // apply theme
        if (this.isAmbient) {
          this._applyTheme('ambient');
        } else {
          this._applyTheme('default');
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      Log.E('theme on startup error:', err);
    }

    this.wakeLock = this.SmartDriveWakeLock;
    sentryBreadCrumb('WakeLock has been initialized.');

    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this._bluetoothService = injector.get(BluetoothService);
    this._sensorService = injector.get(SensorService);
    this._sqliteService = injector.get(SqliteService);
    this._kinveyService = injector.get(SmartDriveKinveyService);
    this._settingsService = injector.get(SettingsService);

    // initialize data storage for usage, errors, settings
    performance.now('SQLite_Init');
    this._initSqliteTables()
      .then(async () => {
        performance.now('SQLite_Init_End');
        sentryBreadCrumb('SQLite has been initialized.');
        const obj = await this._sqliteService.getLast(
          SmartDriveData.Errors.TableName,
          SmartDriveData.Errors.IdName
        );
        const lastErrorId = parseInt((obj && obj[3]) || -1);
        this.lastErrorId = lastErrorId;
      })
      .catch(err => {
        Sentry.captureException(err);
      });

    // load serial number from settings / memory
    const savedSerial = ApplicationSettings.getString(
      DataKeys.WATCH_SERIAL_NUMBER
    );
    if (savedSerial && savedSerial.length) {
      this.watchSerialNumber = savedSerial;
      this._kinveyService.watch_serial_number = this.watchSerialNumber;
    }

    // handle application lifecycle events
    this._registerAppEventHandlers();

    // regiter for system updates related to battery / time UI
    this._registerForBatteryUpdates();
    this._registerForTimeUpdates();
    sentryBreadCrumb('Battery & Time updates registered.');

    // Tap / Gesture detection related code:
    this._sensorService.on(
      SensorService.SensorChanged,
      this._handleSensorData.bind(this)
    );
    this.tapDetector = new TapDetector();
    sentryBreadCrumb('TapDetector created.');

    this._enableBodySensor();
    sentryBreadCrumb('Body sensor enabled.');

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = ApplicationSettings.getString(
      DataKeys.SD_SAVED_ADDRESS
    );
    if (savedSDAddr && savedSDAddr.length) {
      this._updateSmartDrive(savedSDAddr);
    }

    // load serialized smartdrive data
    if (this.smartDrive) {
      this._loadSmartDriveStateFromLS();
    }

    // load settings from memory
    this._settingsService.loadSettings();
    sentryBreadCrumb('Settings loaded.');

    // update display
    this._updateChartData();

    // remember that we're already initialized
    this.initialized = true;
  }

  private _logVersions() {
    this.buildDisplay = android.os.Build.DISPLAY;
    const latestBuildDateCode = '190618';
    const latestBuildDisplay = 'PWDR.190618.001.A1';
    const currentBuildDateCode = this.buildDisplay.split('.')[1];
    this.systemIsUpToDate =
      this.buildDisplay === latestBuildDisplay ||
      currentBuildDateCode >= latestBuildDateCode;

    const packageManager = Utils.android
      .getApplicationContext()
      .getPackageManager();
    const packageInfo = packageManager.getPackageInfo(
      'com.google.android.wearable.app',
      0
    );
    const latestWearVersion = '2.28.0';
    this.wearIsUpToDate = packageInfo.versionName >= latestWearVersion;

    const buildMessage = `
    Android OS Build Version: ${android.os.Build.VERSION.RELEASE} - ${android.os.Build.VERSION.SDK_INT}
    Build Display:            ${this.buildDisplay}
    System is up to date:     ${this.systemIsUpToDate} (vs. ${latestBuildDisplay})
    Product Brand:            ${android.os.Build.BRAND} - ${android.os.Build.DEVICE}
    Android Wear Os Version:  ${packageInfo.versionName}
    Wear OS is up to date:    ${this.wearIsUpToDate} (vs. ${latestWearVersion})
    `;

    sentryBreadCrumb(buildMessage);
  }

  private async _initSqliteTables() {
    // create / load tables for smartdrive
    return new Promise((resolve, reject) => {
      try {
        sentryBreadCrumb('Initializing SQLite...');
        this._sqliteService.makeTable(
          SmartDriveData.Info.TableName,
          SmartDriveData.Info.IdName,
          SmartDriveData.Info.Fields
        );
        this._sqliteService.makeTable(
          SmartDriveData.Errors.TableName,
          SmartDriveData.Errors.IdName,
          SmartDriveData.Errors.Fields
        );
        this._sqliteService.makeTable(
          SmartDriveData.Firmwares.TableName,
          SmartDriveData.Firmwares.IdName,
          SmartDriveData.Firmwares.Fields
        );
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  private async _askForPermissions(onlyAskLocation: boolean = false) {
    try {
      // will throw an error if permissions are denied, else will
      // return either true or a permissions object detailing all the
      // granted permissions. The error thrown details which
      // permissions were rejected
      const reasons = [];
      const neededPermissions = this.permissionsNeeded.filter(
        p => (
          !hasPermission(p) &&
          (p === android.Manifest.permission.ACCESS_COARSE_LOCATION || !onlyAskLocation)
        )
      );
      const reasoning = {
        [android.Manifest.permission.ACCESS_COARSE_LOCATION]: L(
          'permissions-reasons.coarse-location'
        ),
        [android.Manifest.permission.READ_PHONE_STATE]: L(
          'permissions-reasons.phone-state'
        )
      };

      neededPermissions.forEach(r => {
        reasons.push(reasoning[r]);
      });

      if (neededPermissions && neededPermissions.length > 0) {
        sentryBreadCrumb('requesting permissions: ' + neededPermissions);
        await Dialogs.alert({
          title: L('permissions-request.title'),
          message: reasons.join('\n\n'),
          okButtonText: L('buttons.ok')
        });

        // @link - https://github.com/Max-Mobility/permobil-client/pull/819#pullrequestreview-391073852
        // if we get the permissions then we update the serial number
        // if no permission just log breadcrumb and return false
        const gotPermissions = await requestPermissions(neededPermissions)
          .then(() => {
            this._updateSerialNumber();

            // Set the Sentry Context Tags
            const device_serial_number = getDeviceSerialNumber();
            if (device_serial_number) {
              // Set the Sentry Context Tags
              Sentry.setContextTags({
                watch_serial_number: device_serial_number
              });
            }

            return true;
          })
          .catch(err => {
            sentryBreadCrumb(
              `Request Permissions was not granted ${JSON.stringify(err)}`
            );
            return false;
          });
        return gotPermissions;
      }

      return true;
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }

  private _updateSerialNumber() {
    const serialNumberPermission = android.Manifest.permission.READ_PHONE_STATE;
    if (!hasPermission(serialNumberPermission)) return;
    this.watchSerialNumber = android.os.Build.getSerial();
    ApplicationSettings.setString(
      DataKeys.WATCH_SERIAL_NUMBER,
      this.watchSerialNumber
    );
    this._kinveyService.watch_serial_number = this.watchSerialNumber;
  }

  private _showAmbientTime() {
    if (this._powerAssistView) {
      this._powerAssistView.animate({
        opacity: 0,
        scale: { x: 0.5, y: 0.5 },
        duration: 100,
        curve: Enums.AnimationCurve.linear
      });
    }
    if (this._ambientTimeView) {
      this._ambientTimeView.animate({
        translate: { x: 0, y: 0 },
        opacity: 1,
        scale: { x: 1, y: 1 },
        duration: 250,
        curve: Enums.AnimationCurve.easeIn
      });
    }
  }

  private _showMainDisplay() {
    if (this._ambientTimeView) {
      this._ambientTimeView.animate({
        translate: { x: 0, y: Screen.mainScreen.heightPixels },
        opacity: 0,
        scale: { x: 0.5, y: 0.5 },
        duration: 100,
        curve: Enums.AnimationCurve.linear
      });
    }
    if (this._powerAssistView) {
      this._powerAssistView.animate({
        opacity: 1,
        scale: { x: 1, y: 1 },
        duration: 250,
        curve: Enums.AnimationCurve.easeIn
      });
    }
  }

  private _applyTheme(theme?: string) {
    // apply theme
    this.hasAppliedTheme = true;
    try {
      if (theme === 'ambient' || this.isAmbient) {
        this._showAmbientTime();
        themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
      } else {
        this._showMainDisplay();
        themes.applyThemeCss(defaultTheme, 'theme-default.scss');
      }
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  private _registerForSmartDriveEvents() {
    this._unregisterForSmartDriveEvents();
    // register for event handlers
    // set the event listeners for mcu_version_event and smartdrive_distance_event
    this.smartDrive.on(
      SmartDrive.smartdrive_connect_event,
      this._onSmartDriveConnect,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_disconnect_event,
      this._onSmartDriveDisconnect,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_mcu_version_event,
      this._onSmartDriveVersion,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_distance_event,
      this._onDistance,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_motor_info_event,
      this._onMotorInfo,
      this
    );
    this.smartDrive.on(
      SmartDrive.smartdrive_error_event,
      this._onSmartDriveError,
      this
    );
  }

  private _unregisterForSmartDriveEvents() {
    this.smartDrive.off(
      SmartDrive.smartdrive_connect_event,
      this._onSmartDriveConnect,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this._onSmartDriveDisconnect,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_mcu_version_event,
      this._onSmartDriveVersion,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_distance_event,
      this._onDistance,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_motor_info_event,
      this._onMotorInfo,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_error_event,
      this._onSmartDriveError,
      this
    );
  }

  private _updateSmartDrive(address: string) {
    this._savedSmartDriveAddress = address;
    this.smartDrive = this._bluetoothService.getOrMakeSmartDrive({
      address: address
    });
    this._registerForSmartDriveEvents();
  }

  private _loadSmartDriveStateFromLS() {
    if (this.smartDrive === undefined || this.smartDrive === null) {
      return;
    }
    this.smartDrive.loadStateFromLS();
    // update the displayed smartdrive data
    this.smartDriveCurrentBatteryPercentage =
      (this.smartDrive && this.smartDrive.battery) || 0;
  }

  private _saveSmartDriveStateToLS() {
    if (this.smartDrive) {
      this.smartDrive.saveStateToLS();
    } else {
      // make sure we have 0 battery saved
      ApplicationSettings.setNumber(DataKeys.SD_BATTERY, 0);
    }
  }

  private _fullStop(forceDisable: boolean = false) {
    if (!this._ensuringBluetoothCapabilities || forceDisable) {
      // fullStop is called by app event handlers (such as suspend)
      // which may be triggered when we ask for permissions or to
      // enable the BLE radio when turning power assist on, so we
      // don't *always* want to turn power assist off
      this.disablePowerAssist();
    }
    if (this.isTraining) {
      this.onExitTrainingModeTap();
    }
  }

  private _registerAppEventHandlers() {
    // handle ambient mode callbacks
    Application.on('enterAmbient', () => {
      sentryBreadCrumb('*** enterAmbient ***');
      this.isAmbient = true;

      // the user can enter ambient mode even when we hold wake lock
      // and use the keepAlive() function by full-palming the screen
      // or going underwater - so we have to handle the cases that
      // power assist is active or training mode is active.
      this._fullStop();

      if (!this._showingModal) {
        if (this.scrollView) {
          this.scrollView.scrollToVerticalOffset(0, false);
        }

        this._applyTheme();
      }
    });

    Application.on('updateAmbient', () => {
      this.isAmbient = true;
      this._updateTimeDisplay();
      sentryBreadCrumb('updateAmbient');
    });

    Application.on('exitAmbient', () => {
      sentryBreadCrumb('*** exitAmbient ***');
      this.isAmbient = false;
      this._enableBodySensor();
      this._applyTheme();
      if (this.chargingWorkTimeoutId === null) {
        // reset our work interval
        this.chargingWorkTimeoutId = setInterval(
          this._doWhileCharged.bind(this),
          this.CHARGING_WORK_PERIOD_MS
        );
      }
    });

    // Activity lifecycle event handlers
    Application.android.on(
      AndroidApplication.activityPausedEvent,
      (args: AndroidActivityEventData) => {
        if (_isActivityThis(args.activity)) {
          sentryBreadCrumb('*** activityPaused ***');
          // paused happens any time a new activity is shown
          // in front, e.g. showSuccess / showFailure - so we
          // probably don't want to fullstop on paused
        }
      }
    );

    Application.android.on(
      AndroidApplication.activityResumedEvent,
      (args: AndroidActivityEventData) => {
        if (_isActivityThis(args.activity)) {
          sentryBreadCrumb('*** activityResumed ***');
          // resumed happens after an app is re-opened out of
          // suspend, even though the app level resume event
          // doesn't seem to fire. Therefore we want to make
          // sure to re-enable device sensors since the
          // suspend event will have disabled them.
          this._enableBodySensor();
        }
      }
    );

    Application.android.on(
      AndroidApplication.activityStoppedEvent,
      (args: AndroidActivityEventData) => {
        if (_isActivityThis(args.activity)) {
          sentryBreadCrumb('*** activityStopped ***');
          // similar to the app suspend / exit event.
          this._fullStop(true);
        }
      }
    );

    // application lifecycle event handlers
    Application.on(Application.launchEvent, () => {
      Log.D('application launch event');
    });

    Application.on(Application.resumeEvent, () => {
      this._enableBodySensor();
    });

    Application.on(Application.suspendEvent, async () => {
      sentryBreadCrumb('*** appSuspend ***');
      // this event is called when the app is backgrounded - e.g. when
      // the user presses the power button to leave the app, or when
      // an activity such as permissions request or incoming phone
      // call shows in front of our app

      // ensure power assist is turned off if it is on
      this._fullStop();

      if (updatesViewModel) {
        sentryBreadCrumb('Stopping OTA updates');
        await updatesViewModel.stopUpdates(L('updates.canceled'), true);
        sentryBreadCrumb('OTA updates successfully stopped');
      }

      this._updateComplications();
    });

    Application.on(Application.exitEvent, () => {
      sentryBreadCrumb('*** appExit ***');
      this._fullStop(true);
    });

    Application.on(Application.lowMemoryEvent, () => {
      sentryBreadCrumb('*** appLowMemory ***');
      // TODO: determine if we need to stop for this - we see this
      // even even when the app is using very little memory
      // this.disablePowerAssist();
    });

    Application.on(
      Application.uncaughtErrorEvent,
      (args: UnhandledErrorEventData) => {
        if (args) {
          Sentry.captureException(new Error(JSON.stringify(args)), {
            tags: {
              type: 'uncaughtErrorEvent'
            }
          });
        }
        Log.D('App uncaught error');
        this.disablePowerAssist();
      }
    );
  }

  private _updateComplications() {
    try {
      const context = Utils.android.getApplicationContext();
      com.permobil.smartdrive.wearos.BatteryComplicationProviderService.forceUpdate(
        context
      );
      com.permobil.smartdrive.wearos.DailyDistanceComplicationProviderService.forceUpdate(
        context
      );
      com.permobil.smartdrive.wearos.RangeComplicationProviderService.forceUpdate(
        context
      );
      com.permobil.smartdrive.wearos.OdometerComplicationProviderService.forceUpdate(
        context
      );
    } catch (err) {
      Log.E('could not update complications', err);
    }
  }

  private _registerForBatteryUpdates() {
    // register for watch battery updates
    const batteryReceiverCallback = (
      _: android.content.Context,
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

    Application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_BATTERY_CHANGED,
      batteryReceiverCallback
    );
  }

  private _onNewDay() {
    if (this.smartDrive) {
      // it's a new day, reset smartdrive battery to 0
      this.smartDrive.battery = 0;
      // update displayed battery percentage
      this.smartDriveCurrentBatteryPercentage = this.smartDrive.battery;
      // and save it
      this._saveSmartDriveStateToLS();
    }
  }

  private _registerForTimeUpdates() {
    // monitor the clock / system time for display and logging:
    this._updateTimeDisplay();
    const timeReceiverCallback = (_1, _2) => {
      try {
        this._updateTimeDisplay();
        // update charts if date has changed
        if (!isSameDay(new Date(), this._lastChartDay)) {
          this._onNewDay();
          this._updateChartData();
        }
      } catch (error) {
        Sentry.captureException(error);
      }
    };
    Application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIME_TICK,
      timeReceiverCallback
    );
    Application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIMEZONE_CHANGED,
      timeReceiverCallback
    );
  }

  private _updateTimeDisplay() {
    const datetime = formatDateTime(new Date());
    this.currentTime = datetime.time;
    this.currentTimeMeridiem = datetime.timeMeridiem;
    this.currentDay = datetime.day;
    this.currentYear = datetime.year;
  }

  private async _updateAuthorization() {
    // check the content provider here to see if the user has
    // sync-ed up with the pushtracker mobile app
    let authorization = null;
    let userId = null;
    try {
      const contentResolver = Utils.android
        .getApplicationContext()
        .getContentResolver();
      const authCursor = contentResolver.query(
        com.permobil.pushtracker.AuthorizationHandler.AUTHORIZATION_URI,
        null,
        null,
        null,
        null
      );
      if (authCursor && authCursor.moveToFirst()) {
        // there is data
        const token = authCursor.getString(
          com.permobil.pushtracker.AuthorizationHandler.AUTHORIZATION_DATA_INDEX
        );
        authCursor.close();
        // Log.D('Got token:', token);
        if (token !== null && token.length) {
          // we have a valid token
          authorization = token;
        }
      } else {
        // Log.E('Could not get authCursor to move to first:', authCursor);
      }
      const idCursor = contentResolver.query(
        com.permobil.pushtracker.AuthorizationHandler.USER_ID_URI,
        null,
        null,
        null,
        null
      );
      if (idCursor && idCursor.moveToFirst()) {
        // there is data
        const uid = idCursor.getString(
          com.permobil.pushtracker.AuthorizationHandler.USER_ID_DATA_INDEX
        );
        idCursor.close();
        // Log.D('Got uid:', uid);
        if (uid !== null && uid.length) {
          // we have a valid token
          userId = uid;
        }
      } else {
        // Log.E('Could not get idCursor to move to first:', idCursor);
      }
    } catch (err) {
      Log.E('error getting auth:', err);
    }
    if (authorization === null || userId === null) {
      // if the user has not configured this app with the PushTracker
      // Mobile app
      Log.W('Could not load authorization');
      return false;
    }
    // now set the authorization and see if it's valid
    const validAuth = await this._kinveyService.setAuth(authorization, userId);
    if (!validAuth) {
      Log.E('Have invalid authorization!');
    } else {
      // set sentry context
      Sentry.setContextUser({
        id: userId
      });
    }
    return validAuth;
  }

  private _disableWifi() {
    try {
      const wifiManager = Utils.android
        .getApplicationContext()
        .getSystemService(android.content.Context.WIFI_SERVICE);
      this._wifiWasEnabled = wifiManager.isWifiEnabled();
      wifiManager.setWifiEnabled(false);
    } catch (err) {
      Log.E('error disabling wifi:', err);
      Sentry.captureException(err);
    }
  }

  private _enableWifi() {
    try {
      const wifiManager = Utils.android
        .getApplicationContext()
        .getSystemService(android.content.Context.WIFI_SERVICE);
      wifiManager.setWifiEnabled(this._wifiWasEnabled);
    } catch (err) {
      Log.E('error enabling wifi:', err);
      Sentry.captureException(err);
    }
  }

  private async _onNetworkAvailable() {
    if (
      this.powerAssistActive ||
      this.isTraining ||
      this._isUpdatingSmartDrive
    ) {
      return;
    }
    if (this._sqliteService === undefined) {
      // if this has gotten called before sqlite has been fully set up
      return;
    }
    if (this._kinveyService === undefined) {
      // if this has gotten called before kinvey service has been fully set up
      return;
    }
    if (!isNetworkAvailable()) {
      Log.W('No network available!');
      return;
    }
    if (!this._kinveyService.hasAuth()) {
      const validAuth = await this._updateAuthorization();
      if (!validAuth) {
        // we still don't have valid authorization, don't send any
        // data
        return;
      }
      Log.D('Got valid authorization!');
    }
    // sentryBreadCrumb('Network available - sending errors');
    await this._sendErrorsToServer(10);
    // sentryBreadCrumb('Network available - sending info');
    await this._sendInfosToServer(10);
    // sentryBreadCrumb('Network available - sending settings');
    await this._sendSettingsToServer();
  }

  private _doWhileCharged() {
    // Since we're not sending a lot of data, we'll not bother
    // requesting network
    this._onNetworkAvailable().catch(err => {
      sentryBreadCrumb('Error sending data to server: ' + err);
    });
  }

  /**
   * Sensor Data Handlers
   */
  private _handleSensorData(args: SensorChangedEventData) {
    try {
      // if we're using litedata for android sensor plugin option
      // the data structure is simplified to reduce redundant data
      const parsedData = args.data;
      if (parsedData === null || parsedData === undefined) {
        sentryBreadCrumb('Received bad sensor data, turning off power assist!');
        this.disablePowerAssist();
        return;
      }

      if (
        parsedData.s === android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT
      ) {
        this.watchBeingWorn = parsedData.d.state !== 0.0;
        if (!this.disableWearCheck) {
          if (!this.watchBeingWorn && this.powerAssistActive) {
            sentryBreadCrumb('Watch not being worn - disabling power assist!');
            // disable power assist if the watch is taken off!
            this.disablePowerAssist();
          }
        }
      }

      if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
        this._handleAccel(parsedData.d, parsedData.ts);
      }
    } catch (err) {
      Log.E('_handleSensorData::err -', err);
      Sentry.captureException(err);
    }
  }

  private _handleAccel(acceleration: any, timestamp: number) {
    // ignore tapping if we're not in the right mode
    if (!this.powerAssistActive && !this.isTraining) {
      return;
    }
    // ignore tapping if we're not on the users wrist
    if (!this.watchBeingWorn && !this.disableWearCheck) {
      return;
    }
    // scale the acceleration values if we're not up to date
    if (!this.systemIsUpToDate) {
      const factor = 4.0;
      acceleration.x *= factor;
      acceleration.y *= factor;
      acceleration.z *= factor;
    }
    // add the data to our accel history
    this._previousData.push({
      accel: acceleration,
      timestamp
    });

    // update inputHistory with raw data
    this.tapDetector.updateRawHistory(acceleration);

    // since we're now running at a higher frequency, we want to
    // average every 4 points to get a reading
    if (this._previousData.length === this._previousDataLength) {
      // determine the average acceleration and timestamp
      const accelerationTotal = this._previousData.reduce(
        (total, e) => {
          total.accel.x += e.accel.x;
          total.accel.y += e.accel.y;
          total.accel.z += e.accel.z;
          total.timestamp += e.timestamp;
          return total;
        },
        {
          accel: { x: 0, y: 0, z: 0 },
          timestamp: 0
        }
      );

      const firstAccel = this._previousData[0].accel;
      const max = this._previousData.reduce(
        (_max, e) => {
          _max.x = Math.max(_max.x, e.accel.x);
          _max.y = Math.max(_max.y, e.accel.y);
          _max.z = Math.max(_max.z, e.accel.z);
          return _max;
        },
        {
          x: firstAccel.x,
          y: firstAccel.y,
          z: firstAccel.z
        }
      );

      const min = this._previousData.reduce(
        (_min, e) => {
          _min.x = Math.min(_min.x, e.accel.x);
          _min.y = Math.min(_min.y, e.accel.y);
          _min.z = Math.min(_min.z, e.accel.z);
          return _min;
        },
        {
          x: firstAccel.x,
          y: firstAccel.y,
          z: firstAccel.z
        }
      );

      // determine whether to use the max or the min of the data
      const signedMaxAccel: Acceleration = {
        x: accelerationTotal.accel.x >= 0 ? max.x : min.x,
        y: accelerationTotal.accel.y >= 0 ? max.y : min.y,
        z: accelerationTotal.accel.z >= 0 ? max.z : min.z
      };

      // compute the average timestamp of our stored higher-frequency
      // data
      const averageTimestamp =
        accelerationTotal.timestamp / this._previousDataLength;
      // reset the length of the data
      this._previousData = [];
      // set tap sensitivity threshold
      this.tapDetector.setSensitivity(
        this._settingsService.settings.tapSensitivity,
        this.motorOn
      );
      // now run the tap detector
      const didTap = this.tapDetector.detectTap(
        signedMaxAccel,
        averageTimestamp
      );
      if (didTap) {
        // user has met threshold for tapping
        this._handleTap();
      }
    }
  }

  private async _stopTaps() {
    if (this.sendTapTimeoutId) {
      clearTimeout(this.sendTapTimeoutId);
    }
    this.sendTapTimeoutId = null;
    this.numTaps = 0;
  }

  private async _sendTap() {
    // do we have any taps to send now?
    if (this.numTaps > 0) {
      try {
        const ret = await this.smartDrive.sendTap();
        if (ret.status === android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
          // only decrease the number of unsent taps if it was
          // successfully sent and if we haven't gone to or below 0
          if (this.numTaps > 0) this.numTaps--;
        }
      } catch (err) {
        Sentry.captureException(err);
        Log.E('could not send tap', err);
        // this.disablePowerAssist();
      }
    }
    // do we have any remaining taps to send?
    if (this.numTaps > 0) {
      this.sendTapTimeoutId = Utils.setTimeout(this._sendTap.bind(this), 0);
    } else {
      this.sendTapTimeoutId = null;
    }
  }

  private async _handleTap() {
    this.hasTapped = true;
    // timeout for updating the power assist ring
    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
    }
    this.tapTimeoutId = Utils.setTimeout(() => {
      this.hasTapped = false;
    }, TapDetector.TapLockoutTimeMs);
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
        this.sendTapTimeoutId = Utils.setTimeout(this._sendTap.bind(this), 0);
      }
    }
  }

  /**
   * Sensor Management
   */
  private _enableBodySensor(): boolean {
    try {
      if (!this._bodySensorEnabled) {
        this._bodySensorEnabled = this._sensorService.startDeviceSensor(
          android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT,
          this.SENSOR_DELAY_US,
          this.MAX_REPORTING_INTERVAL_US
        );
      }
    } catch (err) {
      this._bodySensorEnabled = false;
      Sentry.captureException(err);
      // Log.E('Error starting the body sensor', err);
      // Utils.setTimeout(this._enableBodySensor.bind(this), 500);
    }
    return this._bodySensorEnabled;
  }

  private _enableTapSensor(): boolean {
    try {
      if (!this._tapSensorEnabled) {
        this._tapSensorEnabled = this._sensorService.startDeviceSensor(
          android.hardware.Sensor.TYPE_LINEAR_ACCELERATION,
          this.SENSOR_DELAY_US,
          this.MAX_REPORTING_INTERVAL_US
        );
      }
    } catch (err) {
      this._tapSensorEnabled = false;
      Sentry.captureException(err);
      // Log.E('Error starting the tap sensor', err);
    }
    return this._tapSensorEnabled;
  }

  private _disableTapSensor() {
    try {
      this._tapSensorEnabled = false;
      this._sensorService.stopDeviceSensor(
        android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error disabling the tap sensor:', err);
    }
  }

  private _disableAllSensors() {
    try {
      this._bodySensorEnabled = false;
      this._tapSensorEnabled = false;
      this._sensorService.stopAllDeviceSensors();
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error disabling the device sensors:', err);
    }
  }

  /**
   * Power management
   */
  private _maintainCPU() {
    this.wakeLock.acquire();
  }

  private _releaseCPU() {
    if (this.wakeLock && this.wakeLock.isHeld()) this.wakeLock.release();
  }

  private async _updateBatteryChart(sdData: any[]) {
    try {
      // update battery data
      const maxBattery = sdData.reduce((max, obj) => {
        return obj.battery > max ? obj.battery : max;
      }, 0);
      const batteryData = sdData.map(e => {
        let value = Math.round((e.battery * 100.0) / (maxBattery || 1));
        // @ts-ignore
        if (value) value += '%';
        return {
          day: formatDateTime(new Date(e.date), 'EEE').formatted.slice(0, 2),
          value: value
        };
      });
      // sentryBreadCrumb('Highest Battery Value:', maxBattery);
      this.batteryChartMaxValue = maxBattery.toFixed(0);
      this.batteryChartData = batteryData;
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  private async _updateDistanceChart(sdData: any[]) {
    try {
      const todayCaseStart =
        sdData[sdData.length - 1][SmartDriveData.Info.CoastDistanceStartName];
      const todayCaseEnd =
        sdData[sdData.length - 1][SmartDriveData.Info.CoastDistanceName];
      if (todayCaseEnd > todayCaseStart) {
        // save today's current distance to storage for complication to use
        ApplicationSettings.setNumber(
          DataKeys.SD_DISTANCE_DAILY,
          SmartDrive.caseTicksToMiles(todayCaseEnd - todayCaseStart)
        );
      }
      // now actually update the chart
      let maxDist = 0;
      const distanceData = sdData.map(e => {
        let dist = 0;
        const start = e[SmartDriveData.Info.DriveDistanceStartName];
        const end = e[SmartDriveData.Info.DriveDistanceName];
        if (end > start && start > 0) {
          dist = end - start;
          dist = SmartDrive.motorTicksToMiles(dist);
          if (dist > maxDist) {
            maxDist = dist;
          }
        }
        return {
          day: formatDateTime(new Date(e.date), 'EEE').formatted.slice(0, 2),
          value: dist
        };
      });
      distanceData.forEach(data => {
        data.value = Math.round((100.0 * data.value) / (maxDist || 1));
        // @ts-ignore
        if (data.value) data.value += '%';
      });
      // sentryBreadCrumb('Highest Distance Value:', maxDist);
      if (this._settingsService.settings.units === 'Metric') {
        this.distanceChartMaxValue = (maxDist * 1.609).toFixed(1);
      } else {
        this.distanceChartMaxValue = maxDist.toFixed(1);
      }
      this.distanceChartData = distanceData;
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  private async _updateEstimatedRange() {
    try {
      // now get the past data (regardless of when it was collected)
      // for computing the estimated range:
      const sdData = (await this._getRecentInfoFromDatabase(7)) as any[];
      // update estimated range based on battery / distance
      let sumDistance = 0;
      let sumBattery = 0;
      // set the range factor to be default (half way between the min/max)
      let rangeFactor = (this.minRangeFactor + this.maxRangeFactor) / 2.0;
      if (sdData && sdData.length) {
        sdData.forEach(e => {
          const start = e[SmartDriveData.Info.DriveDistanceStartName];
          const end = e[SmartDriveData.Info.DriveDistanceName];
          if (end > start && start > 0) {
            const diff = end - start;
            // used for range computation
            sumDistance += diff;
            sumBattery += e[SmartDriveData.Info.BatteryName];
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
      ApplicationSettings.setNumber(
        DataKeys.SD_ESTIMATED_RANGE,
        this.estimatedDistance
      );
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  private async _updateChartData() {
    try {
      // sentryBreadCrumb('Updating Chart Data / Display');
      const sdData = (await this._getUsageInfoFromDatabase(6)) as any[];
      // keep track of the most recent day so we know when to update
      this._lastChartDay = new Date(last(sdData).date);
      // now update the charts
      await this._updateBatteryChart(sdData);
      await this._updateDistanceChart(sdData);
      await this._updateSharedUsageInfo(sdData);
      // update the estimated range (doesn't use weekly usage info -
      // since that may not have any data, so it internally pulls the
      // most recent 7 records (which contain real data
      await this._updateEstimatedRange();
      // now actually update the display of the distance
      this._updateSpeedDisplay();
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  private _updateSpeedDisplay() {
    // update distance units
    this.distanceUnits = L(
      'units.distance.' + this._settingsService.settings.units.toLowerCase()
    );
    const speedUnits = L(
      'units.speed.' + this._settingsService.settings.units.toLowerCase()
    );
    // update speed display
    this.currentSpeedDisplay = this.currentSpeed.toFixed(1);
    this.currentSpeedDescription = `${L('power-assist.speed')} (${speedUnits})`;
    // update estimated range display
    this.estimatedDistanceDisplay = this.estimatedDistance.toFixed(1);
    this.estimatedDistanceDescription = `${L(
      'power-assist.estimated-range'
    )} (${this.distanceUnits})`;
    if (this._settingsService.settings.units === 'Metric') {
      // update estimated speed display
      this.currentSpeedDisplay = (this.currentSpeed * 1.609).toFixed(1);
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

  /**
   * Smart Drive Interaction and Data Management
   */

  private _updatePowerAssistRing(color?: any) {
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

  private _blinkPowerAssistRing() {
    if (this.powerAssistActive) {
      if (this.motorOn) {
        this._updatePowerAssistRing(PowerAssist.ConnectedRingColor);
      } else {
        if (this.powerAssistRingColor === PowerAssist.InactiveRingColor) {
          if (this.hasSentSettingsToSmartDrive) {
            this._updatePowerAssistRing(PowerAssist.ConnectedRingColor);
          } else {
            this._updatePowerAssistRing(PowerAssist.DisconnectedRingColor);
          }
        } else {
          this._updatePowerAssistRing(PowerAssist.InactiveRingColor);
        }
      }
    }
  }

  private _scanningView = null;
  private _showScanning() {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing scanning');
      return;
    }
    // make sure we hide it if we were already showing it
    this._hideScanning();
    // now show it
    const option: ShowModalOptions = {
      context: {},
      closeCallback: () => {
        // we dont do anything with the about to return anything
        this._showingModal = false;
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      cancelable: false,
      fullscreen: true
    };
    this._showingModal = true;

    // Ensuring that we have the currentPage so this doesn't end up causing a crash to show the scanning dialog
    const page = Frame.topmost()?.currentPage;
    if (!page) {
      const ex = new Error(
        'The currentPage for the frame was not found, so the scanning modal cannot be opened.'
      );
      Sentry.captureException(ex);
      return;
    }

    this._scanningView = page.showModal(
      'pages/modals/scanning/scanning',
      option
    );
  }

  private _hideScanning() {
    if (this._scanningView !== null) {
      this._scanningView.closeModal();
    }
    this._showingModal = false;
    this._scanningView = null;
  }

  private _checkPackageInstalled(packageName: string) {
    let found = true;
    try {
      Utils.android
        .getApplicationContext()
        .getPackageManager()
        .getPackageInfo(packageName, 0);
    } catch (err) {
      found = false;
    }
    return found;
  }

  private _openInPlayStore(packageName: string) {
    const playStorePrefix = 'market://details?id=';
    const intent = new android.content.Intent(
      android.content.Intent.ACTION_VIEW
    )
      .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
      .addFlags(
        android.content.Intent.FLAG_ACTIVITY_NO_HISTORY |
        android.content.Intent.FLAG_ACTIVITY_CLEAR_WHEN_TASK_RESET
      )
      .setData(android.net.Uri.parse(playStorePrefix + packageName));
    Application.android.foregroundActivity.startActivity(intent);
  }

  private async _openAppOnPhone() {
    Log.D('openAppInStoreOnPhone()');
    try {
      if (WearOsComms.phoneIsAndroid()) {
        // see if the paired phone has the companion app
        const devicesWithApp = await WearOsComms.findDevicesWithApp(
          this.CAPABILITY_PHONE_APP
        );
        if (devicesWithApp.length !== 0) {
          // Create Remote Intent to open app on remote device.
          await WearOsComms.sendUriToPhone('permobil://pushtracker');
          // now show the open on phone activity
          this._showConfirmation(
            android.support.wearable.activity.ConfirmationActivity
              .OPEN_ON_PHONE_ANIMATION
          );
          // return - we don't need to do anything else
          return;
        }
      }
      // we couldn't open the app on the phone (either it's not
      // installed or the paired phone is ios), so open the app in the
      // proper store
      await WearOsComms.openAppInStoreOnPhone(
        this.PHONE_ANDROID_PACKAGE_NAME,
        this.PHONE_IOS_APP_STORE_URI
      );
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
      Utils.android.getApplicationContext(),
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
    intent.addFlags(
      android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK |
      android.content.Intent.FLAG_ACTIVITY_NEW_TASK
    );
    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NO_ANIMATION);
    Application.android.foregroundActivity.startActivity(intent);
    Application.android.foregroundActivity.overridePendingTransition(0, 0);
  }

  private _ensuringBluetoothCapabilities: boolean = false;
  private async _ensureBluetoothCapabilities(onlyEnforceBLEPermission: boolean = false) {
    if (this._ensuringBluetoothCapabilities) {
      return;
    }
    this._ensuringBluetoothCapabilities = true;
    try {
      sentryBreadCrumb('ensuring bluetooth capabilities');
      // ensure we have the permissions
      await this._askForPermissions(onlyEnforceBLEPermission);
      // we only need the BLE/Location permission to proceed with connecting devices
      if (!hasPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)) {
        sentryBreadCrumb(
          'ACCESS_COARSE_LOCATION not granted, unable to use bluetooth.'
        );
        Dialogs.alert({
          title: L('failures.title'),
          message: L('failures.permissions'),
          okButtonText: L('buttons.ok')
        });
        this._ensuringBluetoothCapabilities = false;
        return false;
      }

      // ensure bluetooth radio is enabled
      const radioEnabled = await this._bluetoothService.radioEnabled();
      if (!radioEnabled) {
        sentryBreadCrumb('bluetooth is not enabled');
        // if the radio is not enabled, we should turn it on
        const didEnable = await this._bluetoothService.enableRadio();
        if (!didEnable) {
          // we could not enable the radio!
          sentryBreadCrumb('Unable to enable the Bluetooth radio.');
          // throw 'BLE OFF';
          this._ensuringBluetoothCapabilities = false;
          return false;
        }
        // wait here to ensure that the radio is back on!
        wait(500);
      }
      // ensure bluetoothservice is functional
      await this._bluetoothService.initialize();
      this._ensuringBluetoothCapabilities = false;
      return true;
    } catch (err) {
      Sentry.captureException(err);
      this._ensuringBluetoothCapabilities = false;
      return false;
    }
  }

  private async _saveNewSmartDrive(): Promise<any> {
    sentryBreadCrumb('Saving new SmartDrive');
    try {
      // make sure everything works
      const didEnsure = await this._ensureBluetoothCapabilities(true);
      if (!didEnsure) {
        return false;
      }
      this._showScanning();
      // scan for smartdrives
      // @ts-ignore
      await this._bluetoothService.scanForSmartDrives(3);
      this._hideScanning();
      sentryBreadCrumb(
        `Discovered ${BluetoothService.SmartDrives.length} SmartDrives`
      );

      // make sure we have smartdrives
      if (BluetoothService.SmartDrives.length <= 0) {
        Dialogs.alert({
          title: L('failures.title'),
          message: L('failures.no-smartdrives-found'),
          okButtonText: L('buttons.ok')
        });
        return false;
      }

      // make sure we have only one smartdrive
      if (BluetoothService.SmartDrives.length > 1) {
        Dialogs.alert({
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

      const result = await Dialogs.action({
        title: L('settings.select-smartdrive'),
        message: L('settings.select-smartdrive'),
        actions: addresses,
        cancelButtonText: L('buttons.cancel')
      });
      // if user selected one of the smartdrives in the action dialog, attempt to connect to it
      if (addresses.indexOf(result) > -1) {
        // save the smartdrive here
        this._updateSmartDrive(result);
        ApplicationSettings.setString(DataKeys.SD_SAVED_ADDRESS, result);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      Sentry.captureException(err);
      this._hideScanning();
      Log.E('could not scan', err);
      Dialogs.alert({
        title: L('failures.title'),
        message: `${L('failures.scan')}\n\n${err}`,
        okButtonText: L('buttons.ok')
      });
      return false;
    }
  }

  private async _connectToSmartDrive(address: string) {
    sentryBreadCrumb('Connecting to SmartDrive ' + address);
    this._updateSmartDrive(address);
    // now connect to smart drive
    try {
      const didEnsure = await this._ensureBluetoothCapabilities(true);
      if (!didEnsure) {
        Log.E('could not ensure bluetooth capabilities!');
        return false;
      }
      await this.smartDrive.connect();
      return true;
    } catch (err) {
      Sentry.captureException(err);
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.connect') + '\n\n' + address,
        okButtonText: L('buttons.ok')
      });
      return false;
    }
  }

  private _hasSavedSmartDrive(): boolean {
    return (
      this._savedSmartDriveAddress !== null &&
      this._savedSmartDriveAddress.length > 0
    );
  }

  private async _connectToSavedSmartDrive() {
    // try to connect to the SmartDrive
    return this._connectToSmartDrive(this._savedSmartDriveAddress);
  }

  private async _disconnectFromSmartDrive() {
    if (this.smartDrive) {
      await this.smartDrive.disconnect();
      this.motorOn = false;
    }
  }

  private _retrySmartDriveConnection() {
    if (
      this.powerAssistActive &&
      this.smartDrive &&
      this._hasSavedSmartDrive() &&
      !this.smartDrive.connected
    ) {
      Utils.setTimeout(this._connectToSavedSmartDrive.bind(this), 0);
    }
  }

  private async _sendSmartDriveSettings() {
    // send the current settings to the SD
    try {
      let ret = null;
      ret = await this.smartDrive.sendSettingsObject(
        this._settingsService.settings
      );
      if (ret.status !== android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
        throw new SmartDriveException(
          'Send Settings bad status: ' + ret.status
        );
      }
      ret = await this.smartDrive.sendSwitchControlSettingsObject(
        this._settingsService.switchControlSettings
      );
      if (ret.status !== android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
        throw new SmartDriveException(
          'Send Switch Control Settings bad status: ' + ret.status
        );
      }
      this.hasSentSettingsToSmartDrive = true;
    } catch (err) {
      Sentry.captureException(err);
      // make sure we retry this while we're connected
      this._onceSendSmartDriveSettings = once(this._sendSmartDriveSettings);
    }
  }

  /*
   * SMART DRIVE EVENT HANDLERS
   */
  private async _onSmartDriveConnect() {
    this.powerAssistState = PowerAssist.State.Connected;
    this._updatePowerAssistRing();
    this.hasSentSettingsToSmartDrive = false;
    this._onceSendSmartDriveSettings = once(this._sendSmartDriveSettings);
    if (this.rssiIntervalId) {
      clearInterval(this.rssiIntervalId);
      this.rssiIntervalId = null;
    }
    if (this.powerAssistActive) {
      // we've connected - set the timeout to be the user-configured
      // timeout
      this._restartPowerAssistTimeout(
        this._settingsService.watchSettings.powerAssistTimeoutMinutes
      );
    }
    /*
    this.rssiIntervalId = setInterval(
      this._readSmartDriveSignalStrength.bind(this),
      this.RSSI_INTERVAL_MS
    );
    */
  }

  private async _onSmartDriveDisconnect() {
    if (this.rssiIntervalId) {
      clearInterval(this.rssiIntervalId);
      this.rssiIntervalId = null;
    }
    // make sure to stop any pending taps
    this._stopTaps();
    // handle the case that the motor is on
    if (this.motorOn) {
      // record disconnect error - the SD should never be on when
      // we disconnect!
      const errorCode = this.smartDrive.getBleDisconnectError();
      this._saveErrorToDatabase(errorCode, undefined);
    }
    this.motorOn = false;
    this.hasSentSettingsToSmartDrive = false;
    if (this.powerAssistActive) {
      if (this.powerAssistState !== PowerAssist.State.Disconnected) {
        // set the timeout for power assist to 1 minute since we're
        // disconnected
        this._restartPowerAssistTimeout(1);
      }
      // update state
      this.powerAssistState = PowerAssist.State.Disconnected;
      this._updatePowerAssistRing();
      this._retrySmartDriveConnection();
    } else {
      this._clearPowerAssistTimeout();
    }
  }

  private async _onSmartDriveError(args: any) {
    // sentryBreadCrumb('_onSmartDriveError event');
    const errorType = args.data.errorType;
    const errorId = args.data.errorId;
    // save the error into the database
    this._saveErrorToDatabase(errorType, errorId);
  }

  // private _readSmartDriveSignalStrength() {
  //   if (this.smartDrive && this.smartDrive.connected) {
  //     this._bluetoothService
  //       .readRssi(this.smartDrive.address)
  //       .then((args: any) => {
  //         this._rssi = (this._rssi * 9) / 10 + (args.value * 1) / 10;
  //         this.currentSignalStrength = `${this._rssi.toFixed(1)}`;
  //       });
  //   }
  // }

  private async _onMotorInfo(args: any) {
    // send current settings to SD
    this._onceSendSmartDriveSettings();
    // sentryBreadCrumb('_onMotorInfo event');
    const motorInfo = args.data.motorInfo;

    // update motor state
    if (this.motorOn !== this.smartDrive.driving) {
      if (this.smartDrive.driving) {
        // motor has turned on just now
        this._vibrator.cancel();
        this._vibrator.vibrate(250); // vibrate for 250 ms
        // cancel the existing power assist timeout id if there is one
        this._clearPowerAssistTimeout();
      } else {
        // motor has turned off just now
        this._vibrator.cancel();
        this._vibrator.vibrate([0, 250, 50, 250]); // vibrate twice
        // motor has just stopped - set the timeout to be the
        // user-configured timeout
        this._restartPowerAssistTimeout(
          this._settingsService.watchSettings.powerAssistTimeoutMinutes
        );
      }
    }
    this.motorOn = this.smartDrive.driving;
    // determine if we've used more battery percentage
    const batteryChange =
      this.smartDriveCurrentBatteryPercentage - this.smartDrive.battery;
    // only check against 1 so that we filter out charging and only
    // get decreases due to driving / while connected
    if (batteryChange === 1) {
      // save to the database
      this._saveSmartDriveData({
        battery: 1,
        driveDistance: this.smartDrive.driveDistance,
        coastDistance: this.smartDrive.coastDistance
      });
    }
    // update battery percentage
    this.smartDriveCurrentBatteryPercentage = this.smartDrive.battery;
    // save the updated smartdrive battery
    ApplicationSettings.setNumber(DataKeys.SD_BATTERY, this.smartDrive.battery);
    // update speed display
    this.currentSpeed = motorInfo.speed;
    this._updateSpeedDisplay();
  }

  private async _onDistance(args: any) {
    const currentCoast = ApplicationSettings.getNumber(
      DataKeys.SD_DISTANCE_CASE
    );
    const currentDrive = ApplicationSettings.getNumber(
      DataKeys.SD_DISTANCE_DRIVE
    );

    // sentryBreadCrumb('_onDistance event');
    const coastDistance = args.data.coastDistance;
    const driveDistance = args.data.driveDistance;

    if (coastDistance !== currentCoast || driveDistance !== currentDrive) {
      // save to the database
      this._saveSmartDriveData({
        battery: 0,
        driveDistance: this.smartDrive.driveDistance,
        coastDistance: this.smartDrive.coastDistance
      });

      // save the updated distance
      ApplicationSettings.setNumber(
        DataKeys.SD_DISTANCE_CASE,
        this.smartDrive.coastDistance
      );
      ApplicationSettings.setNumber(
        DataKeys.SD_DISTANCE_DRIVE,
        this.smartDrive.driveDistance
      );
      // make sure to save the units setting as well
      ApplicationSettings.setString(
        DataKeys.SD_UNITS,
        this._settingsService.settings.units.toLowerCase()
      );
    }
  }

  private async _onSmartDriveVersion() {
    // sentryBreadCrumb('_onSmartDriveVersion event');
    // const mcuVersion = args.data.mcu;

    // save the updated SmartDrive version info
    ApplicationSettings.setNumber(
      DataKeys.SD_VERSION_MCU,
      this.smartDrive.mcu_version
    );
    ApplicationSettings.setNumber(
      DataKeys.SD_VERSION_BLE,
      this.smartDrive.ble_version
    );
  }

  /*
   * DATABASE FUNCTIONS
   */
  private async _saveErrorToDatabase(errorCode: string, errorId: number) {
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
          Dialogs.alert({
            title: L('failures.title'),
            message: `${L('failures.saving-error')}\n\n${err}`,
            okButtonText: L('buttons.ok')
          });
        });
    }
  }

  private async _saveSmartDriveData(args: {
    driveDistance?: number;
    coastDistance?: number;
    battery?: number;
  }) {
    try {
      // save state to LS
      this._saveSmartDriveStateToLS();
      // now save to database
      const driveDistance =
        args.driveDistance || this.smartDrive?.driveDistance || 0;
      const coastDistance =
        args.coastDistance || this.smartDrive?.coastDistance || 0;
      const battery = args.battery || 0;
      if (driveDistance === 0 && coastDistance === 0 && battery === 0) {
        return;
      }
      const u = await this._getTodaysUsageInfoFromDatabase();
      if (u[SmartDriveData.Info.IdName]) {
        // there was a record, so we need to update it. we add the
        // already used battery plus the amount of new battery that
        // has been used. we directly overwrite the distance and
        // update the records
        const updates = SmartDriveData.Info.updateInfo(args, u);
        await this._updateTodaysUsageInfo(updates);
      } else {
        // should not come here - _getTodaysUsageInfoFromDatabase
        // loads / creates as needed - but if it encounters an
        // exception then it will not have an id - so we will try to
        // make it again...
        this._todaysUsage = await this._makeTodaysUsage(
          battery,
          driveDistance,
          coastDistance
        );
      }
      // update the estimated range (doesn't use weekly usage info -
      // since that may not have any data, so it internally pulls the
      // most recent 7 records (which contain real data
      await this._updateEstimatedRange();
      // now actually update the display of the speed / estimated range
      this._updateSpeedDisplay();
    } catch (err) {
      Sentry.captureException(err);
      Log.E('Failed saving usage:', err);
    }
  }

  private async _makeTodaysUsage(
    battery?: number,
    drive?: number,
    coast?: number
  ) {
    if (!drive || !coast) {
      // try to use our smartdrive's existing drive / coast to
      // initialize the data, fall back on 0 if necessary
      drive = this.smartDrive?.driveDistance || 0;
      coast = this.smartDrive?.coastDistance || 0;
    }
    const newEntry = SmartDriveData.Info.newInfo(
      undefined,
      new Date(),
      battery,
      drive,
      coast
    );
    try {
      const id = await this._sqliteService.insertIntoTable(
        SmartDriveData.Info.TableName,
        newEntry
      );
      newEntry[SmartDriveData.Info.IdName] = id;
    } catch (err) {
      Sentry.captureException(err);
    }
    return newEntry;
  }

  private async _getTodaysUsageInfoFromDatabase() {
    if (this._todaysUsage) {
      // check to see it is actually today and create a new one if
      // needed
      if (isToday(new Date(this._todaysUsage[SmartDriveData.Info.DateName]))) {
        return this._todaysUsage;
      } else {
        this._todaysUsage = await this._makeTodaysUsage();
      }
    } else {
      // try to load it from the db and create it if one cannot be
      // found
      try {
        const e = await this._sqliteService.getLast(
          SmartDriveData.Info.TableName,
          SmartDriveData.Info.IdName
        );
        const date = new Date((e && e[1]) || null);
        if (e && e[1] && isToday(date)) {
          // @ts-ignore
          this._todaysUsage = SmartDriveData.Info.loadInfo(...e);
        } else {
          this._todaysUsage = await this._makeTodaysUsage();
        }
      } catch (err) {
        Sentry.captureException(err);
        // nothing was found
        this._todaysUsage = await this._makeTodaysUsage();
      }
    }
    return this._todaysUsage;
  }

  private _getSmartDriveTotalMiles() {
    let totalMiles = 0;
    if (this.smartDrive) {
      totalMiles = SmartDrive.caseTicksToMiles(this.smartDrive.coastDistance);
    }
    return totalMiles;
  }

  private async _updateNotifications() {
    await this._checkDailyDistanceRecord();
    await this._checkTotalDistanceRecord();
  }

  private async _checkDailyDistanceRecord() {
    // if the user has at least a week of records and they have gone
    // at least 0.5 mi or 0.5 km (depending on their units) today,
    // then they get a notification
    // determine if they have enough records
    const numDays = await this._sqliteService.getNumRows(
      SmartDriveData.Info.TableName,
      SmartDriveData.Info.IdName
    );
    const hasEnoughData = numDays >= 5;
    if (hasEnoughData) {
      let numCaseTicksRequired = SmartDrive.milesToCaseTicks(0.5);
      if (this._settingsService.settings.units === 'Metric') {
        numCaseTicksRequired = SmartDrive.milesToCaseTicks(0.5 / 1.609);
      }
      // get the top two records ordered DESCENDING by CoastDistance
      let records = await this._sqliteService.getAllColumnDifferences({
        tableName: SmartDriveData.Info.TableName,
        columnA: SmartDriveData.Info.CoastDistanceName,
        columnB: SmartDriveData.Info.CoastDistanceStartName,
        limit: 2,
        minimum: numCaseTicksRequired,
        ascending: false
      });
      // if we have records which have gone at least 0.5 miles
      if (records && records.length) {
        // pull the distance (last column returned as the difference)
        // from the first record (largest difference)
        const recordDistance = last(records[0]);
        // now turn the records into actual SmartDrive Info objects
        // @ts-ignore
        records = records.map(r => SmartDriveData.Info.loadInfo(r));
        // get the date of the record distance
        const recordDay = records[0][SmartDriveData.Info.DateName];
        // and compare it to the date of the last time we notified
        // them
        const lastRecordDay = ApplicationSettings.getString(
          DataKeys.DAILY_DISTANCE_RECORD_DAY
        );
        const haveNotifiedThem =
          lastRecordDay && isToday(new Date(lastRecordDay));
        if (isToday(new Date(recordDay)) && !haveNotifiedThem) {
          // store the date that we've notified them today so that we
          // don't notify them multiple times in the same day
          ApplicationSettings.setString(
            DataKeys.DAILY_DISTANCE_RECORD_DAY,
            recordDay
          );
          Log.D('NEW DAILY DISTANCE RECORD: ', recordDay, recordDistance);
          // notify them - their record is today and they've gone
          // at least 0.5 miles!
          dailyDistanceNotification();
        }
      }
    }
  }

  private async _checkTotalDistanceRecord() {
    // each time the user goes over 50 mi/km increments (e.g. @ 50,
    // 100, 150, etc.) they get a notification. we store the data as
    // miles, so we'll want to represent the jumps as 50 km ->
    // converted to miles
    const incrementMiles = 50.0;
    const incrementKilometers = incrementMiles / 1.609;
    let increment = incrementMiles;
    if (this._settingsService.settings.units === 'Metric') {
      increment = incrementKilometers;
    }
    const todaysTotalMiles = this._getSmartDriveTotalMiles();
    const todaysTotalKilometers = todaysTotalMiles * 1.609;
    // get the current record value (default -1, always in miles) and
    // add 50 units to it (50 miles, 50/1.609 km)
    let currentRecord =
      ApplicationSettings.getNumber(DataKeys.TOTAL_DISTANCE_RECORD, -1);
    if (currentRecord === -1) {
      // there was no record saved, so we have a few options:
      if (todaysTotalMiles > increment) {
        // 1. They have been using the SD for a while so we should
        // give the first notification of their most recent record -
        // which will store a record so that we don't come down this
        // branch again. We compute the record prior to the closest,
        // since after this conditional block, it will be incremented
        // again.
        currentRecord = todaysTotalMiles - (todaysTotalMiles % increment) - increment;
      } else {
        // 2. they have not used the SD enough to have passed their
        // first record so they are starting out at 0 miles
        // effectively - this means they will not get a notification,
        // so we need to save 0 here so that we don't come down this
        // branch again
        currentRecord = 0;
        ApplicationSettings.setNumber(
          DataKeys.TOTAL_DISTANCE_RECORD,
          0
        );
      }
    }
    const recordToBeatMiles = currentRecord + increment;
    const recordToBeatKilometers = recordToBeatMiles * 1.609;
    // if they're over that record, then we notify them and store the
    // record we're at
    const hasBeatenRecord = todaysTotalMiles > recordToBeatMiles;
    if (hasBeatenRecord) {
      // store the new record they will have to beat (always in miles)
      ApplicationSettings.setNumber(
        DataKeys.TOTAL_DISTANCE_RECORD,
        recordToBeatMiles
      );
      Log.D('NEW ODOMETRY RECORD: ', todaysTotalMiles);
      // send the notification
      let distanceText = `${recordToBeatMiles.toFixed(0)} ${this.distanceUnits}`;
      if (this._settingsService.settings.units === 'Metric') {
        distanceText = `${recordToBeatKilometers.toFixed(0)} ${this.distanceUnits}`;
      }
      odometerRecordNotification(distanceText);
    }
  }

  private async _updateTodaysUsageInfo(updates: any) {
    if (!this._todaysUsage) {
      Log.E('_updateTodaysUsageInfo called but we have no _todaysUsageObject!');
      return;
    }
    // update the data stored in SQLite
    const _id = this._todaysUsage[SmartDriveData.Info.IdName];
    await this._sqliteService.updateInTable(
      SmartDriveData.Info.TableName,
      updates,
      {
        [SmartDriveData.Info.IdName]: _id
      }
    );
    // now update _todaysUsage variable
    Object.keys(updates).forEach(k => {
      this._todaysUsage[k] = updates[k];
    });
  }

  private async _updateSharedUsageInfo(sdData: any[]) {
    try {
      // aggregate the data
      const data = {};
      sdData.forEach(e => {
        // record the date
        const driveStart = e[SmartDriveData.Info.DriveDistanceStartName];
        const totalStart = e[SmartDriveData.Info.CoastDistanceStartName];
        const drive = e[SmartDriveData.Info.DriveDistanceName];
        const total = e[SmartDriveData.Info.CoastDistanceName];
        // determine drive ditance
        let driveDiff = 0;
        if (drive > driveStart && driveStart > 0) {
          driveDiff = drive - driveStart;
          // we only save it in miles
          driveDiff = SmartDrive.motorTicksToMiles(driveDiff);
        }
        // determine total distance
        let totalDiff = 0;
        if (total > totalStart && totalStart > 0) {
          totalDiff = total - totalStart;
          // we only save it in miles
          totalDiff = SmartDrive.caseTicksToMiles(totalDiff);
        }
        // compute the date for the data
        const date = formatDateTime(new Date(e.date), 'yyyy/MM/dd').formatted;
        // now save the drive / total in this record
        data[date] = {
          drive: driveDiff,
          total: totalDiff
        };
      });
      // Log.D('saving data', data);
      const serialized = JSON.stringify(data);
      // there is only ever one record in this table, so we always
      // insert - the db will perform upsert for us.
      const values = new android.content.ContentValues();
      values.put('data', serialized);
      const uri = Utils.android
        .getApplicationContext()
        .getContentResolver()
        .insert(
          com.permobil.smartdrive.wearos.DatabaseHandler.USAGE_URI,
          values
        );
      if (uri === null) {
        Log.E('Could not insert into content resolver!');
      }
    } catch (err) {
      Log.E(err);
      Sentry.captureException(err);
    }
  }

  private async _getUsageInfoFromDatabase(numDays: number) {
    const dates = SmartDriveData.Info.getPastDates(numDays);
    const usageInfo = dates.map(d => {
      return SmartDriveData.Info.newInfo(null, d, 0, 0, 0);
    });
    return this._getRecentInfoFromDatabase(numDays)
      .then((objs: any[]) => {
        objs.forEach((o: any) => {
          // @ts-ignore
          const obj = SmartDriveData.Info.loadInfo(...o);
          const objDate = new Date(obj.date);
          const index = closestIndexTo(objDate, dates);
          if (index > -1) {
            const usageDate = dates[index];
            const sameDay = isSameDay(usageDate, objDate);
            if (sameDay) {
              usageInfo[index] = obj;
            }
          }
        });
        return usageInfo;
      })
      .catch(err => {
        Sentry.captureException(err);
        console.error('error getting recent info:', err);
        return usageInfo;
      });
  }

  private async _getRecentInfoFromDatabase(numRecentEntries: number) {
    try {
      return this._sqliteService.getAll({
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

  private async _getUnsentInfoFromDatabase(numEntries: number) {
    try {
      return this._sqliteService.getAll({
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
  private async _sendSettingsToServer() {
    if (
      !this._settingsService.hasSentSettings &&
      this._kinveyService.hasAuth()
    ) {
      const settingsObj = {
        settings: this._settingsService.settings.toObj(),
        switchControlSettings: this._settingsService.switchControlSettings.toObj()
      };
      try {
        const r = await this._kinveyService.sendSettings(settingsObj);
        const id = r['_id'];
        if (id) {
          this._settingsService.hasSentSettings = true;
          ApplicationSettings.setBoolean(
            DataKeys.SD_SETTINGS_DIRTY_FLAG,
            this._settingsService.hasSentSettings
          );
        } else {
          Log.E('no id returned by kinvey!', r);
        }
      } catch (err) {
        this._handleAuthException(err);
        // Sentry.captureException(err);
        Log.E('Error sending errors to server:', err);
      }
    }
  }

  private async _sendErrorsToServer(numErrors: number) {
    try {
      if (!this._kinveyService.hasAuth()) {
        return;
      }
      const errors = await this._sqliteService.getAll({
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
      const rets = (await Promise.all(sendPromises)) as any[];
      const updatePromises = rets.map(r => {
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
      this._handleAuthException(err);
      // Sentry.captureException(err);
      Log.E('Error sending errors to server:', err);
    }
  }

  private async _sendInfosToServer(numInfo: number) {
    try {
      if (!this._kinveyService.hasAuth()) {
        return;
      }
      const infos = await this._getUnsentInfoFromDatabase(numInfo);
      // now send them one by one
      const sendPromises = infos.map(i => {
        // @ts-ignore
        i = SmartDriveData.Info.loadInfo(...i);
        try {
          i[SmartDriveData.Info.RecordsName] = JSON.parse(
            i[SmartDriveData.Info.RecordsName]
          );
        } catch (err) {
          Log.E('parse error', err);
        }
        return this._kinveyService.sendInfo(i, i[SmartDriveData.Info.UuidName]);
      });
      const rets = (await Promise.all(sendPromises)) as any[];
      const updatePromises = rets.map(r => {
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
      this._handleAuthException(e);
      // Sentry.captureException(e);
      Log.E('Error sending infos to server:', e);
    }
  }

  private _handleAuthException(e: any) {
    const statusCode = e && e.statusCode;
    const invalidCredentials = this._kinveyService.wasInvalidCredentials(
      statusCode
    );
    if (invalidCredentials || !this._kinveyService.hasAuth()) {
      // we had auth and now we don't - alert the user that it's
      // invalidated and we need new credentials
      Dialogs.alert({
        title: L('failures.title'),
        message: L('failures.app-connection.logout'),
        okButtonText: L('buttons.ok')
      });
    }
  }

  private _setupInsetChin() {
    // https://developer.android.com/reference/android/content/res/Configuration.htm
    const androidConfig = Utils.android
      .getApplicationContext()
      .getResources()
      .getConfiguration();
    const isCircleWatch = androidConfig.isScreenRound();
    const widthPixels = Screen.mainScreen.widthPixels;
    const heightPixels = Screen.mainScreen.heightPixels;
    const widthDIPs = Screen.mainScreen.widthDIPs;
    const heightDIPs = Screen.mainScreen.heightDIPs;
    this.screenWidth = widthDIPs;
    this.screenHeight = heightDIPs;
    if (isCircleWatch) {
      this.insetPadding = Math.round(0.146467 * widthPixels);
      // if the height !== width then there is a chin!
      if (widthPixels !== heightPixels && widthPixels > heightPixels) {
        this.chinSize = widthPixels - heightPixels;
      }
    }
    // Log.D('chinsize:', this.chinSize);
  }

  private async _checkForUpdates() {
    // only check for updates if we have a smartdrive
    if (!this.smartDrive || !this.smartDrive.hasVersionInfo()) {
      sentryBreadCrumb('Not checking for updates - no smartdrive saved with version info.');
      return;
    }
    // only check for updates if we actually have network connectivity
    if (!isNetworkAvailable()) {
      sentryBreadCrumb('Not checking for updates - network not available.');
      return;
    }
    // we have a smartdrive and we have network, let's check!
    const updateInfo = await getUpdateInformation();
    const updateAvailable = updateInfo.updateAvailable; // there is a new download available
    // we may have already downloaded the updated info, but the user
    // hasn't updated their smartdrive yet
    const localInfo = updateInfo.currentVersions;
    const bleVersion = localInfo['SmartDriveBLE.ota']?.version;
    const mcuVersion = localInfo['SmartDriveMCU.ota']?.version;
    const isUpToDate =
      this.smartDrive.isMcuUpToDate(mcuVersion) &&
      this.smartDrive.isBleUpToDate(bleVersion);
    sentryBreadCrumb('downloadable update available: ' + updateAvailable);
    sentryBreadCrumb('local info - mcu: ' + mcuVersion + '; ble: ' + bleVersion);
    sentryBreadCrumb('isUpToDate: ' + isUpToDate);
    if (updateAvailable || !isUpToDate) {
      // show action dialog with option to go to updates page
      const performUpdate = await Dialogs.confirm({
        title: L('warnings.title.notice'),
        message: L('updates.available'),
        okButtonText: L('updates.perform'),
        cancelButtonText: L('buttons.dismiss'),
        cancelable: false
      });
      if (performUpdate) {
        sentryBreadCrumb('User asked to update their smartdrive.');
        const page = Frame.topmost()?.currentPage;
        if (!page) {
          const ex = new Error(
            'The currentPage for the frame was not found, so the updates page cannot be opened.'
          );
          Sentry.captureException(ex);
          return;
        }
        // we have the page, now open the updates modal
        this.onUpdatesTap({
          object: page
        });
      }
    }
  }

  // #endregion "Private Functions"
}
