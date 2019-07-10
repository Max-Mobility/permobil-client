import { SentryKeys } from '@maxmobility/private-keys';
import { Log } from '@permobil/core';
import { Prop } from '@permobil/nativescript';
import { ReflectiveInjector } from 'injection-js';
import { Pager } from 'nativescript-pager';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { Vibrate } from 'nativescript-vibrate';
import { SwipeDismissLayout } from 'nativescript-wear-os';
import * as application from 'tns-core-modules/application';
import { Observable } from 'tns-core-modules/data/observable';
import { device } from 'tns-core-modules/platform';
import { Page, View } from 'tns-core-modules/ui/page';
import { BluetoothService, SensorService, SentryService, SERVICES, SqliteService } from './services';
import { hideOffScreenLayout, showOffScreenLayout } from './utils';

const ambientTheme = require('./scss/theme-ambient.scss').toString();
const defaultTheme = require('./scss/theme-default.scss').toString();

export class MainViewModel extends Observable {
  @Prop() minuteCirclePercentage: number = 88;
  @Prop() pointsCirclePercentage: number = 40;
  @Prop() watchIsCharging: boolean = false;

  /**
   * Boolean to track the settings swipe layout visibility.
   */
  @Prop() isSettingsLayoutEnabled = false;

  /**
   * User interaction objects
   */
  private _pager: Pager;

  private _settingsLayout: SwipeDismissLayout;
  private _changeSettingsLayout: SwipeDismissLayout;

  private _vibrator: Vibrate = new Vibrate();
  private _sentryService: SentryService;
  private _bluetoothService: BluetoothService;
  private _sensorService: SensorService;
  private _sqliteService: SqliteService;
  constructor() {
    super();

    console.time('Sentry_Init');
    // init sentry - DNS key for permobil-wear Sentry project
    Sentry.init(SentryKeys.PUSHTRACKER_WEAROS_DSN);
    console.timeEnd('Sentry_Init');

    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this._sentryService = injector.get(SentryService);
    this._bluetoothService = injector.get(BluetoothService);
    this._sensorService = injector.get(SensorService);
    this._sqliteService = injector.get(SqliteService);

    // handle ambient mode callbacks
    application.on('enterAmbient', args => {
      Log.D('*** enterAmbient ***');
      themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');

      if (this._pager) {
        const children = this._pager._childrenViews;
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

      if (this._pager) {
        const children = this._pager._childrenViews;
        for (let i = 0; i < children.size; i++) {
          const child = children.get(i) as View;
          child._onCssStateChange();
        }
      }
    });

    // now enable the sensors
    this.enableDeviceSensors();

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

  doWhileCharged() {
    // TODO: send errors to kinvey here
    // TODO: send usage data to kinvey here
    if (this.watchIsCharging) {
      // re-schedule any work that may still need to be done
      // setTimeout(this.doWhileCharged.bind(this), this.CHARGING_WORK_PERIOD_MS);
    }
  }

  onPagerLoaded(args: any) {
    const page = args.object as Page;
    this._pager = page.getViewById('pager') as Pager;
  }

  onWatchCircleLoaded(args: any) {
    const page = args.object as Page;
    // this.watchBatteryRing = page.getViewById(
    //   'watchBatteryCircle'
    // ) as AnimatedCircle;
    // (this.watchBatteryRing as any).android.setOuterContourSize(0);
    // (this.watchBatteryRing as any).android.setInnerContourSize(0);
  }

  disableDeviceSensors() {
    try {
      this._sensorService.stopDeviceSensors();
    } catch (err) {
      Log.E('Error disabling the device sensors:', err);
    }
    // this._isListeningDeviceSensors = false;
    return;
  }

  enableDeviceSensors() {
    try {
      // if (!this._isListeningDeviceSensors) {
      //   this._sensorService.startDeviceSensors(
      //     this.SENSOR_DELAY_US,
      //     this.MAX_REPORTING_INTERVAL_US
      //   );
      //   this._isListeningDeviceSensors = true;
      // }
    } catch (err) {
      Log.E('Error starting the device sensors', err);
    }
  }

  /**
   * Setings page handlers
   */
  onProfileOptionsLayoutLoaded(args) {
    // this._profileOptionsLayout = args.object as SwipeDismissLayout;
    // this._profileOptionsLayout.on(SwipeDismissLayout.dimissedEvent, args => {
    //   // Log.D('dismissedEvent', args.object);
    //   // hide the offscreen layout when dismissed
    //   hideOffScreenLayout(this._profileOptionsLayout, { x: 500, y: 0 });
    //   this.isProfileOptionsLayoutEnabled = false;
    // });
  }

  onDistanceChartRepeaterLoaded(args) {
    // const rpter = args.object as Repeater;
    // get distance data from db here then handle the data binding and
    // calculating the Max Value for the chart and some sizing checks
  }

  onSettingsTap() {
    showOffScreenLayout(this._settingsLayout);
    this.isSettingsLayoutEnabled = true;
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    // this.tempSettings.copy(this.settings);
    const tappedId = args.object.id as string;
    // switch (tappedId.toLowerCase()) {
    //   case 'maxspeed':
    //     this.changeSettingKeyString = 'Max Speed';
    //     break;
    //   case 'acceleration':
    //     this.changeSettingKeyString = 'Acceleration';
    //     break;
    //   case 'tapsensitivity':
    //     this.changeSettingKeyString = 'Tap Sensitivity';
    //     break;
    //   case 'controlmode':
    //     this.changeSettingKeyString = 'Control Mode';
    //     break;
    //   case 'units':
    //     this.changeSettingKeyString = 'Units';
    //     break;
    //   default:
    //     break;
    // }
    this.updateSettingsChangeDisplay();
    if (args.object.id) {
    }

    showOffScreenLayout(this._changeSettingsLayout);
    // this.isChangeSettingsLayoutEnabled = true;
  }

  updateSettingsChangeDisplay() {
    // switch (this.changeSettingKeyString) {
    //   case 'Max Speed':
    //     this.changeSettingKeyValue = `${this.tempSettings.maxSpeed}%`;
    //     break;
    //   case 'Acceleration':
    //     this.changeSettingKeyValue = `${this.tempSettings.acceleration}%`;
    //     break;
    //   case 'Tap Sensitivity':
    //     this.changeSettingKeyValue = `${this.tempSettings.tapSensitivity}%`;
    //     break;
    //   case 'Control Mode':
    //     this.changeSettingKeyValue = `${this.tempSettings.controlMode}`;
    //     return;
    //   case 'Units':
    //     this.changeSettingKeyValue = `${this.tempSettings.units}`;
    //     return;
    //   default:
    //     break;
    // }
  }

  onCancelChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, { x: 500, y: 0 });
    // this.isChangeSettingsLayoutEnabled = false;
  }

  onConfirmChangesTap() {
    hideOffScreenLayout(this._changeSettingsLayout, {
      x: 500,
      y: 0
    });
    // this.isChangeSettingsLayoutEnabled = false;
    // SAVE THE VALUE to local data for the setting user has selected
    // this.settings.copy(this.tempSettings);
    // this.saveSettings();
    // // now update any display that needs settings:
    // this.updateSettingsDisplay();
  }

  onIncreaseSettingsTap() {
    // this.tempSettings.increase(this.changeSettingKeyString);
    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap(args) {
    // this.tempSettings.decrease(this.changeSettingKeyString);
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
}
