import { Log } from '@permobil/core';
import { WearOsLayout } from 'nativescript-wear-os';
import {
  EventData,
  fromObject,
  Observable
} from 'tns-core-modules/data/observable';
import { screen } from 'tns-core-modules/platform';
import { Page, ShownModallyData, View } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import {
  BluetoothService,
  KinveyService,
  SqliteService,
  SERVICES
} from '../../../services';
import { getSerialNumber, saveSerialNumber } from '../../../utils';
import { ShowModalOptions } from 'tns-core-modules/ui/page/page';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { getDefaultLang, L, Prop } from '@permobil/nativescript';
import { Level, Sentry } from 'nativescript-sentry';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import once from 'lodash/once';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import { AnimatedCircle } from 'nativescript-animated-circle';
import { PowerAssist, SmartDriveData } from '../../../namespaces';
import { SmartDrive, Acceleration, TapDetector } from '../../../models';
import { DataKeys } from '../../../enums';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { ReflectiveInjector } from 'injection-js';
import { Pager } from 'nativescript-pager';
import * as LS from 'nativescript-localstorage';
import { closestIndexTo, format, isSameDay, isToday, subDays } from 'date-fns';
import { ad } from 'tns-core-modules/utils/utils';
import * as themes from 'nativescript-themes';
const ambientTheme = require('../../../scss/theme-ambient.css').toString();
const defaultTheme = require('../../../scss/theme-default.css').toString();

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

class SmartDriveException extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'SmartDriveMX2+ Exception';
  }
}

export class UpdatesViewModel extends Observable {
  @Prop() updateProgressCircle: AnimatedCircle;
  @Prop() updateProgressText: string = 'Foo';
  @Prop() isUpdatingSmartDrive: boolean = false;
  @Prop() smartDriveOtaProgress: number = 0;
  @Prop() smartDriveOtaState: string = null;
  @Prop() smartDriveOtaActions = new ObservableArray();
  @Prop() savedSmartDriveAddress: string = null;
  @Prop() debouncedOtaAction: any;
  @Prop() watchSerialNumber: string = '---';

  // state variables
  @Prop() powerAssistActive: boolean = false;
  @Prop() motorOn = false;
  @Prop() smartDriveCurrentBatteryPercentage: number = 0;
  @Prop() isAmbient: boolean = false;

  // time display
  @Prop() currentTime: string = '';
  @Prop() currentTimeMeridiem: string = '';
  @Prop() currentDay: string = '';
  @Prop() currentYear: string = '';

  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.ACCESS_COARSE_LOCATION,
    android.Manifest.permission.READ_PHONE_STATE
  ];

  // Services
  private _bluetoothService: BluetoothService;
  private _sqliteService: SqliteService;
  private _kinveyService: KinveyService;

  // Debounced OTA action
  private _debouncedOtaAction: any = null;

  /**
   * SmartDrive Data / state management
   */
  private pager: Pager;
  public smartDrive: SmartDrive;
  private _savedSmartDriveAddress: string = null;
  private initialized: boolean = false;
  private wakeLock: any = null;

  closeCallback;

  async init() {
    this._sentryBreadCrumb('Updates-View-Model init.');
    if (this.initialized) {
      this._sentryBreadCrumb('Already initialized.');
      return;
    }

    this._sentryBreadCrumb('Initializing WakeLock...');
    console.time('Init_SmartDriveWakeLock');
    this.wakeLock = this.SmartDriveWakeLock;
    console.timeEnd('Init_SmartDriveWakeLock');
    this._sentryBreadCrumb('WakeLock has been initialized.');

    this._sentryBreadCrumb('Initializing Sentry...');

    this._sentryBreadCrumb('Creating services...');
    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this._bluetoothService = injector.get(BluetoothService);
    this._sqliteService = injector.get(SqliteService);
    this._kinveyService = injector.get(KinveyService);
    this._sentryBreadCrumb('All Services created.');

    this._sentryBreadCrumb('Registering for time updates.');
    this.registerForTimeUpdates();
    this._sentryBreadCrumb('Time updates registered.');

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = appSettings.getString(DataKeys.SD_SAVED_ADDRESS);
    if (savedSDAddr && savedSDAddr.length) {
      this.updateSmartDrive(savedSDAddr);
    }

    // load serialized smartdrive data
    if (this.smartDrive) {
      this.loadSmartDriveStateFromLS();
    }

    this.initialized = true;
    this._sentryBreadCrumb('Initialized Updates View Model');
  }

  async onUpdatesPageLoaded(args: EventData) {
    this._sentryBreadCrumb('onUpdatesPageLoaded');
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
      Log.E('theme on startup error:', err);
      Sentry.captureException(err);
    }
    // now init the ui
    try {
      await this.init();
    } catch (err) {
      this._sentryBreadCrumb('updates init error: ' + err);
      Sentry.captureException(err);
    }
    // get child references
    try {
      // store reference to pageer so that we can control what page
      // it's on programatically
      const page = args.object as Page;
      this.pager = page.getViewById('pager') as Pager;
      // get references to update circle to control spin state
      this.updateProgressCircle = page.getViewById(
        'updateProgressCircle'
      ) as AnimatedCircle;
    } catch (err) {
      this._sentryBreadCrumb('onUpdatesPageLoaded::error: ' + err);
      Sentry.captureException(err);
    }
    try {
      this.checkForUpdates();
    } catch (err) {
      this._sentryBreadCrumb('onUpdatesPageLoaded::error: ' + err);
    }
  }

  private hasAppliedTheme: boolean = false;
  applyTheme(theme?: string) {
    this.hasAppliedTheme = true;
    // apply theme
    this._sentryBreadCrumb('applying theme');
    try {
      if (theme === 'ambient' || this.isAmbient) {
        // Log.D('applying ambient theme');
        themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
        // this.showAmbientTime();
      } else {
        // Log.D('applying default theme');
        themes.applyThemeCss(defaultTheme, 'theme-default.scss');
        // this.showMainDisplay();
      }
    } catch (err) {
      Log.E('apply theme error:', err);
      Sentry.captureException(err);
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
          Log.E('apply style error:', err);
          Sentry.captureException(err);
        }
      }
    } catch (err) {
      Log.E('apply style error:', err);
      Sentry.captureException(err);
    }
    this._sentryBreadCrumb('style applied');
  }

  maintainCPU() {
    this.wakeLock.acquire();
  }

  releaseCPU() {
    if (this.wakeLock && this.wakeLock.isHeld()) this.wakeLock.release();
  }

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

  async askForPermissions() {
    // this._sentryBreadCrumb('asking for permissions');
    // determine if we have shown the permissions request
    const hasShownRequest =
      appSettings.getBoolean(DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST) || false;
    // will throw an error if permissions are denied, else will
    // return either true or a permissions object detailing all the
    // granted permissions. The error thrown details which
    // permissions were rejected
    const blePermission = android.Manifest.permission.ACCESS_COARSE_LOCATION;
    const reasons = [];
    const neededPermissions = this.permissionsNeeded.filter(
      p =>
        !hasPermission(p) &&
        (application.android.foregroundActivity.shouldShowRequestPermissionRationale(
          p
        ) ||
          !hasShownRequest)
    );
    // update the has-shown-request
    appSettings.setBoolean(DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST, true);
    const reasoning = {
      [android.Manifest.permission.ACCESS_COARSE_LOCATION]: L(
        'permissions-reasons.coarse-location'
      ),
      [android.Manifest.permission.READ_PHONE_STATE]: L(
        'permissions-reasons.phone-state'
      )
    };
    neededPermissions.map(r => {
      reasons.push(reasoning[r]);
    });
    if (neededPermissions && neededPermissions.length > 0) {
      // this._sentryBreadCrumb('requesting permissions: ' + neededPermissions);
      await alert({
        title: L('permissions-request.title'),
        message: reasons.join('\n\n'),
        okButtonText: L('buttons.ok')
      });
      try {
        await requestPermissions(neededPermissions, () => { });
        // now that we have permissions go ahead and save the serial number
        this.updateSerialNumber();
      } catch (permissionsObj) {
        // we were not given all permissions
      }
    }
    if (hasPermission(blePermission)) {
      return true;
    } else {
      throw new SmartDriveException(L('failures.permissions'));
    }
  }

  async getSmartDriveVersion() {
    return new Promise((resolve, reject) => {
      if (this.smartDrive && this.smartDrive.hasVersionInfo()) {
        // if we've already talked to this SD and gotten its
        // version info then we can just resolve
        resolve(true);
        return;
      } else {
        this.smartDriveOtaState = L('updates.connecting-to-smartdrive');
        // we've not talked to this SD before, so we should connect
        // and get its version info
        const remove = () => {
          if (this.smartDrive)
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
        this.smartDrive.on(SmartDrive.smartdrive_mcu_version_event, onVersion);
        this.connectToSavedSmartDrive()
          .then(didConnect => {
            if (!didConnect) {
              remove();
              reject();
            }
          })
          .catch(err => {
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

  updateSerialNumber() {
    const serialNumberPermission = android.Manifest.permission.READ_PHONE_STATE;
    if (!hasPermission(serialNumberPermission)) return;
    this.watchSerialNumber = android.os.Build.getSerial();
    appSettings.setString(DataKeys.WATCH_SERIAL_NUMBER, this.watchSerialNumber);
    this._kinveyService.watch_serial_number = this.watchSerialNumber;
  }

  registerForSmartDriveEvents() {
    this.unregisterForSmartDriveEvents();
    // set up ota action handler
    // debounced function to keep people from pressing it too frequently
    this._debouncedOtaAction = debounce(this.smartDrive.onOTAActionTap, 500, {
      leading: true,
      trailing: false
    });
    this.smartDrive.on(
      SmartDrive.smartdrive_ota_status_event,
      this.onSmartDriveOtaStatus,
      this
    );
  }

  unregisterForSmartDriveEvents() {
    if (this.smartDrive)
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
    this.smartDriveCurrentBatteryPercentage =
      (this.smartDrive && this.smartDrive.battery) || 0;
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

  onSmartDriveOtaStatus(args: any) {
    // get the current progress of the update
    const progress = args.data.progress;
    // translate the state
    const state = L(args.data.state); // .replace('ota.sd.state.', '');
    // now turn the actions into structures for our UI
    const actions = args.data.actions.map(a => {
      const actionClass = 'action-' + last(a.split('.')) + ' compact';
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

    // Allow to close modal when there are no OTA actions available
    if (this.smartDriveOtaActions.length === 0) {
      this.smartDriveOtaActions.splice(
        0,
        this.smartDriveOtaActions.length,
        ...actions,
        {
          label: L('ota.action.back'),
          func: this.closeCallback.bind(this),
          action: 'ota.action.close',
          class: 'action-close'
        }
      );
    }

    // When there is one OTA action available, e.g., 'Start',
    // then allow to close modal.
    //
    // Exception: When the only OTA action available is 'Cancel'
    // Then, let the user press cancel and then show 'Close' to close the modal
    if (this.smartDriveOtaActions.length === 1) {
      const action = this.smartDriveOtaActions.getItem(0);
      if (action['class'] && action['action'] !== 'ota.action.cancel') {
        this.smartDriveOtaActions.splice(
          0,
          this.smartDriveOtaActions.length,
          ...actions,
          {
            label: L('ota.action.close'),
            func: this.closeCallback.bind(this),
            action: 'ota.action.close',
            class: 'action-close'
          }
        );
      }
    }

    this.smartDriveOtaState = state;
  }

  // TODO: don't use ':' with the errors - use [...] instead.
  private currentVersions = {};
  async checkForUpdates() {
    this._sentryBreadCrumb('Checking for updates');
    // update display of update progress
    this.smartDriveOtaProgress = 0;
    this.smartDriveOtaState = L('updates.checking-for-updates');
    // some state variables for the update
    this.isUpdatingSmartDrive = true;
    // @ts-ignore
    this.updateProgressCircle.spin();
    try {
      this.currentVersions = await this.getFirmwareData();
    } catch (err) {
      return this.updateError(err, L('updates.errors.loading'), `${err}`);
    }
    this._sentryBreadCrumb(
      `Current FW Versions: ${JSON.stringify(this.currentVersions, null, 2)}`
    );
    let response = null;
    const query = {
      $or: [
        { _filename: 'SmartDriveBLE.ota' },
        { _filename: 'SmartDriveMCU.ota' }
      ],
      firmware_file: true
    };
    try {
      // NOTE: This is the only kinvey service function which *DOES
      // NOT REQUIRE USER AUTHENTICATION*, so we don't need to check
      // this._kinveyService.hasAuth()
      response = await this._kinveyService.getFile(undefined, query);
    } catch (err) {
      const errorMessage = `
      ${L('updates.errors.connection-failure')}\n\n${err}
      `;
      return this.updateError(err, L('updates.errors.getting'), errorMessage);
    }
    // Now that we have the metadata, check to see if we already
    // have the most up to date firmware files and download them
    // if we don't
    const mds = response;
    this._sentryBreadCrumb('mds: ' + mds);
    let promises = [];
    const files = [];
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
    this._sentryBreadCrumb(fileMetaDatas);
    // do we need to download any firmware files?
    if (fileMetaDatas && fileMetaDatas.length) {
      // update progress text
      this.smartDriveOtaState = L('updates.downloading-new-firmwares');
      // reset ota progress to 0 to show downloading progress
      this.smartDriveOtaProgress = 0;
      // update progress circle
      const progresses = fileMetaDatas.reduce((p, fmd) => {
        p[fmd['_filename']] = 0;
        return p;
      }, {});
      const progressKeys = Object.keys(progresses);
      SmartDriveData.Firmwares.setDownloadProgressCallback(
        throttle((file, progress) => {
          // Log.D(file['_filename'] + ': ' + progress * 100.0);
          progresses[file['_filename']] = progress * 100.0;
          this.smartDriveOtaProgress =
            progressKeys.reduce((total, k) => {
              return total + progresses[k];
            }, 0) / progressKeys.length;
          // Log.D('progress: ', this.smartDriveOtaProgress);
        }, 400)
      );
      // now download the files
      try {
        for (const fmd of fileMetaDatas) {
          const f = await SmartDriveData.Firmwares.download(fmd);
          files.push(f);
        }
      } catch (err) {
        const errorMessage = `
        ${L('updates.errors.connection-failure')}\n\n${err}
        `;
        return this.updateError(err, L('updates.errors.downloading'), errorMessage);
      }
    }
    // Now that we have the files, write them to disk and update
    // our local metadata
    promises = [];
    if (files && files.length) {
      promises = files.filter(f => f).map(this.updateFirmwareData.bind(this));
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
      console.log('Connecting to smartdrive failed', err);
      return this.updateError(err, L('updates.errors.connecting'), err);
    }
    // Now perform the SmartDrive updates if we need to

    // now see what we need to do with the data
    this._sentryBreadCrumb('Finished downloading updates.');
    this.performSmartDriveWirelessUpdate();
  }

  async performSmartDriveWirelessUpdate() {
    this._sentryBreadCrumb('Performing SmartDrive Wireless Update');
    this.smartDriveOtaState = L('updates.initializing');
    // @ts-ignore
    this.updateProgressCircle.stopSpinning();
    // do we need to update? - check against smartdrive version
    const bleVersion = this.currentVersions['SmartDriveBLE.ota'].version;
    const mcuVersion = this.currentVersions['SmartDriveMCU.ota'].version;

    // the smartdrive is not up to date, so we need to update it.
    // reset the ota progress to 0 (since downloaing may have used it)
    this.smartDriveOtaProgress = 0;
    // get info out to tell the user
    const version = SmartDriveData.Firmwares.versionByteToString(
      Math.max(mcuVersion, bleVersion)
    );
    this._sentryBreadCrumb('got version: ' + version);
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
      otaStatus = await this.smartDrive.performOTA(
        bleFw,
        mcuFw,
        bleVersion,
        mcuVersion,
        300 * 1000
      );
      this._sentryBreadCrumb('"' + otaStatus + '" ' + typeof otaStatus);
      if (otaStatus === 'updates.canceled') {
        if (this.closeCallback) {
          this.smartDriveOtaActions.splice(0, this.smartDriveOtaActions.length, {
            label: L('ota.action.close'),
            func: this.closeCallback.bind(this),
            action: 'ota.action.close',
            class: 'action-close'
          });
        }
      }
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
    this._sentryBreadCrumb(
      `saving file ${this.currentVersions[f.name].filename}`
    );
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
          [SmartDriveData.Firmwares.VersionName]:
            newFirmware[SmartDriveData.Firmwares.VersionName],
          [SmartDriveData.Firmwares.ChangesName]:
            newFirmware[SmartDriveData.Firmwares.ChangesName],
          [SmartDriveData.Firmwares.FileName]:
            newFirmware[SmartDriveData.Firmwares.FileName]
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
    // TODO: Show 'CLOSE/BACK' button to close this modal
    if (this.closeCallback) {
      this.smartDriveOtaActions.splice(0, this.smartDriveOtaActions.length, {
        label: L('ota.action.close'),
        func: this.closeCallback.bind(this),
        action: 'ota.action.close',
        class: 'action-close'
      });
    }
    this._sentryBreadCrumb(msg);
    Sentry.captureException(err);
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

    if (doCancelOta && this.smartDrive) {
      this.smartDrive.cancelOTA();
    }
    this.smartDriveOtaActions.splice(0, this.smartDriveOtaActions.length, {
      label: L('ota.action.close'),
      func: this.closeCallback.bind(this),
      action: 'ota.action.close',
      class: 'action-close'
    });
  }

  async ensureBluetoothCapabilities() {
    try {
      // ensure we have the permissions
      await this.askForPermissions();
      // ensure bluetooth radio is enabled
      // this._sentryBreadCrumb('checking radio is enabled');
      const radioEnabled = await this._bluetoothService.radioEnabled();
      if (!radioEnabled) {
        this._sentryBreadCrumb('radio is not enabled!');
        // if the radio is not enabled, we should turn it on
        const didEnable = await this._bluetoothService.enableRadio();
        if (!didEnable) {
          // we could not enable the radio!
          // throw 'BLE OFF';
          return false;
        }
        // await a promise here to ensure that the radio is back on!
        const promise = new Promise((resolve, _) => {
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
      // this.showScanning();
      // scan for smartdrives
      // @ts-ignore
      this.scanningProgressCircle.spin();
      await this._bluetoothService.scanForSmartDrives(3);
      // this.hideScanning();
      this._sentryBreadCrumb(
        `Discovered ${BluetoothService.SmartDrives.length} SmartDrives`
      );

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
      this._sentryBreadCrumb('could not scan ' + err);
      Sentry.captureException(err);
      // this.hideScanning();
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
        this._sentryBreadCrumb('could not ensure bluetooth capabilities!');
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

  async getFirmwareData() {
    this._sentryBreadCrumb('Getting firmware data');
    try {
      const objs = await this._sqliteService.getAll({
        tableName: SmartDriveData.Firmwares.TableName
      });
      Log.D('Done getting objects from SqliteService');
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
      this._sentryBreadCrumb('Could not get firmware metadata: ' + err);
      Sentry.captureException(err);
      return {};
    }
  }

  private _sentryBreadCrumb(message: string) {
    Log.D(message);
    Sentry.captureBreadcrumb({
      message,
      category: 'info',
      level: Level.Info
    });
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
    const timeReceiverCallback = (_1, _2) => {
      try {
        this.updateTimeDisplay();
        this._sentryBreadCrumb('timeReceiverCallback');
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

  _format(d: Date, fmt: string) {
    return format(d, fmt, {
      locale: dateLocales[getDefaultLang()] || dateLocales['en']
    });
  }

  updateTimeDisplay() {
    const now = new Date();
    const context = ad.getApplicationContext();
    const is24HourFormat = android.text.format.DateFormat.is24HourFormat(
      context
    );
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
}
