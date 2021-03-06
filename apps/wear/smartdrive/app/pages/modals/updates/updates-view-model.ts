import { AnimatedCircle } from '@nativescript/animated-circle';
import {
  Application,
  ApplicationSettings,
  EventData,
  Observable,
  ObservableArray
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import debounce from 'lodash/debounce';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import * as LS from 'nativescript-localstorage';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Sentry } from 'nativescript-sentry';
import * as themes from 'nativescript-themes';
import { DataKeys } from '../../../enums';
import { SmartDrive, SmartDriveException } from '../../../models';
import { SmartDriveData } from '../../../namespaces';
import {
  BluetoothService,
  SmartDriveKinveyService,
  SqliteService
} from '../../../services';
import {
  checkFirmwareMetaData,
  formatDateTime,
  getCurrentFirmwareData,
  sentryBreadCrumb
} from '../../../utils';

const ambientTheme = require('../../../scss/theme-ambient.css').toString();
const defaultTheme = require('../../../scss/theme-default.css').toString();

export class UpdatesViewModel extends Observable {
  @Prop() updateProgressCircle: AnimatedCircle;
  @Prop() smartDriveOtaProgress: number = 0;
  @Prop() smartDriveOtaState: string = null;
  @Prop() smartDriveOtaActions = new ObservableArray();
  @Prop() watchSerialNumber: string = '---';

  // time display
  @Prop() currentTime: string = '';
  @Prop() currentTimeMeridiem: string = '';

  // state variables
  private isAmbient: boolean = false;

  // permissions for the app
  private permissionsNeeded = [
    android.Manifest.permission.ACCESS_COARSE_LOCATION,
    android.Manifest.permission.READ_PHONE_STATE
  ];

  // Debounced OTA action
  private _debouncedOtaAction: any = null;
  private _debouncedCloseModal: any = null;

  /**
   * SmartDrive Data / state management
   */
  private smartDrive: SmartDrive;
  private _savedSmartDriveAddress: string = null;
  private initialized: boolean = false;
  private wakeLock: any = null;
  private hasAppliedTheme: boolean = false;
  private _bluetoothService: BluetoothService;
  private _kinveyService: SmartDriveKinveyService;
  private _sqliteService: SqliteService;
  private _closeCallback: any;

  private timeReceiverCallback = (_1, _2) => {
    try {
      this.updateTimeDisplay();
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  private _otaStarted: boolean = false;

  constructor() {
    super();
    // debounced function to keep people from pressing it too frequently
    this._debouncedCloseModal = debounce(this.closeModal, 500, {
      leading: true,
      trailing: false
    });
  }

  get SmartDriveWakeLock() {
    if (this.wakeLock) {
      return this.wakeLock;
    } else {
      // initialize the wake lock here
      const powerManager = Application.android.context.getSystemService(
        android.content.Context.POWER_SERVICE
      ) as android.os.PowerManager;
      this.wakeLock = powerManager.newWakeLock(
        // android.os.PowerManager.PARTIAL_WAKE_LOCK, // - best battery life, but allows ambient mode
        android.os.PowerManager.SCREEN_DIM_WAKE_LOCK, // - moderate battery life, buttons still active
        // android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK, // - worst battery life - easy to see
        'com.permobil.smartdrive.wearos::WakeLock'
      );
      return this.wakeLock;
    }
  }

  async init() {
    sentryBreadCrumb('Updates-View-Model init.');

    sentryBreadCrumb('Initializing WakeLock...');
    console.time('Init_SmartDriveWakeLock');
    this.wakeLock = this.SmartDriveWakeLock;
    console.timeEnd('Init_SmartDriveWakeLock');
    sentryBreadCrumb('WakeLock has been initialized.');

    sentryBreadCrumb('Registering for time updates.');
    this.registerForTimeUpdates();
    sentryBreadCrumb('Time updates registered.');

    // load savedSmartDriveAddress from settings / memory
    const savedSDAddr = ApplicationSettings.getString(
      DataKeys.SD_SAVED_ADDRESS
    );
    if (savedSDAddr && savedSDAddr.length) {
      this.updateSmartDrive(savedSDAddr);
    }

    // load serialized smartdrive data
    if (this.smartDrive) {
      this.loadSmartDriveStateFromLS();
    }

    sentryBreadCrumb('Initialized Updates View Model');
  }

  async onUpdatesPageLoaded(
    _bluetoothService: BluetoothService,
    _kinveyService: SmartDriveKinveyService,
    _sqliteService: SqliteService,
    _closeCallback: any
  ) {
    sentryBreadCrumb('onUpdatesPageLoaded');

    this._bluetoothService = _bluetoothService;
    this._kinveyService = _kinveyService;
    this._sqliteService = _sqliteService;
    this._closeCallback = _closeCallback;

    // clear out ota actions
    this.smartDriveOtaActions.splice(0, this.smartDriveOtaActions.length);

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
    await this.init().catch(err => {
      sentryBreadCrumb('updates init error: ' + JSON.stringify(err));
      Sentry.captureException(err);
    });

    // now check for updates
    await this.checkForUpdates().catch(err => {
      sentryBreadCrumb('checkForUpdates::error: ' + JSON.stringify(err));
    });
  }

  async onUpdateProgressCircleLoaded(args: EventData) {
    Log.D('onUpdateProgressCircleLoaded: ' + args.object);
    this.updateProgressCircle = args.object as AnimatedCircle;
  }

  applyTheme(theme?: string) {
    this.hasAppliedTheme = true;
    // apply theme
    sentryBreadCrumb('applying theme');
    try {
      if (theme === 'ambient' || this.isAmbient) {
        themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
      } else {
        themes.applyThemeCss(defaultTheme, 'theme-default.scss');
      }
    } catch (err) {
      Log.E('apply theme error:', err);
      Sentry.captureException(err);
    }
    sentryBreadCrumb('theme applied');
  }

  maintainCPU() {
    this.wakeLock.acquire();
  }

  releaseCPU() {
    if (this.wakeLock && this.wakeLock.isHeld()) this.wakeLock.release();
  }

  async askForPermissions() {
    // sentryBreadCrumb('asking for permissions');
    // determine if we have shown the permissions request
    const hasShownRequest =
      ApplicationSettings.getBoolean(
        DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST
      ) || false;
    // will throw an error if permissions are denied, else will
    // return either true or a permissions object detailing all the
    // granted permissions. The error thrown details which
    // permissions were rejected
    const blePermission = android.Manifest.permission.ACCESS_COARSE_LOCATION;
    const reasons = [];
    const neededPermissions = this.permissionsNeeded.filter(
      p =>
        !hasPermission(p) &&
        (Application.android.foregroundActivity.shouldShowRequestPermissionRationale(
          p
        ) ||
          !hasShownRequest)
    );
    // update the has-shown-request
    ApplicationSettings.setBoolean(
      DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST,
      true
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
      // sentryBreadCrumb('requesting permissions: ' + neededPermissions);
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
      sentryBreadCrumb('getting smartdrive version');
      if (this.smartDrive && this.smartDrive.hasVersionInfo()) {
        // if we've already talked to this SD and gotten its
        // version info then we can just resolve
        sentryBreadCrumb(
          'Already have smartdrive version:' +
          '\n\tmcu: ' +
          this.smartDrive.mcu_version_string +
          '\n\tble: ' +
          this.smartDrive.ble_version_string
        );
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
          sentryBreadCrumb(
            'Got smartdrive version:' +
            '\n\tmcu: ' +
            this.smartDrive.mcu_version_string +
            '\n\tble: ' +
            this.smartDrive.ble_version_string
          );
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
    ApplicationSettings.setString(
      DataKeys.WATCH_SERIAL_NUMBER,
      this.watchSerialNumber
    );
    this._kinveyService.watch_serial_number = this.watchSerialNumber;

    // Set the Sentry Context Tags
    Sentry.setContextTags({
      watch_serial_number: this.watchSerialNumber
    });
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
    sentryBreadCrumb('Loading SD state from LS');
    const savedSd = LS.getItem(
      'com.permobil.smartdrive.wearos.smartdrive.data'
    );
    if (savedSd) {
      this.smartDrive.fromObject(savedSd);
    }
  }

  saveSmartDriveStateToLS() {
    sentryBreadCrumb('Saving SD state to LS');
    if (this.smartDrive) {
      LS.setItemObject(
        'com.permobil.smartdrive.wearos.smartdrive.data',
        this.smartDrive.data()
      );
    }
  }

  closeModal() {
    sentryBreadCrumb('Closing Updates page');
    this.releaseCPU();
    this.unregisterForSmartDriveEvents();
    if (this.smartDrive) {
      this.smartDrive.cancelOTA();
      sentryBreadCrumb('Updating saved SD state');
      this.smartDrive.saveStateToLS();
    }
    this.unregisterForTimeUpdates();
    this._closeCallback();
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
          func: this._debouncedCloseModal.bind(this),
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
            func: this._debouncedCloseModal.bind(this),
            action: 'ota.action.close',
            class: 'action-close'
          }
        );
      }
    }
    if (state !== this.smartDriveOtaState) {
      sentryBreadCrumb('SmartDrive OTA Status, new state: ' + state);
    }
    this.smartDriveOtaState = state;
  }

  // TODO: don't use ':' with the errors - use [...] instead.
  private currentVersions = {};
  async checkForUpdates() {
    sentryBreadCrumb('Checking for updates');
    // update display of update progress
    this.smartDriveOtaProgress = 0;
    this.smartDriveOtaState = L('updates.checking-for-updates');
    // @ts-ignore
    this.updateProgressCircle.spin();
    this.currentVersions = await getCurrentFirmwareData().catch(err => {
      return this.updateError(err, L('updates.errors.loading'), `${err}`);
    });
    sentryBreadCrumb(
      `Current FW Versions: ${JSON.stringify(this.currentVersions, null, 2)}`
    );

    const response = await this._kinveyService
      .downloadFirmwareFiles()
      .catch(err => {
        const errorMessage = `${L(
          'updates.errors.connection-failure'
        )}\n\n${err}`;
        return this.updateError(err, L('updates.errors.getting'), errorMessage);
      });

    // Now that we have the metadata, check to see if we already have
    // the most up to date firmware files and download them if we don't
    const mds = response;
    const fileMetaDatas = await checkFirmwareMetaData(mds, this.currentVersions);

    // @ts-ignore
    this.updateProgressCircle.stopSpinning();
    sentryBreadCrumb(
      'Got file metadatas, length: ' + (fileMetaDatas && fileMetaDatas.length)
    );

    // do we need to download any firmware files?
    const files: any = [];
    if (fileMetaDatas && fileMetaDatas.length) {
      sentryBreadCrumb('downloading firmwares');
      // update progress text
      this.smartDriveOtaState = L('updates.downloading-new-firmwares');
      // reset ota progress to 0 to show downloading progress
      this.smartDriveOtaProgress = 0;
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
        return this.updateError(
          err,
          L('updates.errors.downloading'),
          errorMessage
        );
      }
    }

    // Now that we have the files, write them to disk and update our local metadata
    let promises = [];
    if (files && files.length) {
      sentryBreadCrumb('updating firmware data');
      promises = files
        .filter(f => f)
        .map(this.updateFirmwareData.bind(this));
    }

    try {
      await Promise.all(promises);
    } catch (err) {
      return this.updateError(err, L('updates.errors.saving'), `${err}`);
    }

    // Now let's connect to the SD to make sure that we get it's version information
    await this.getSmartDriveVersion().catch(err => {
      sentryBreadCrumb('Connecting to smartdrive failed');
      return this.updateError(err, L('updates.errors.connecting'), err);
    });

    // Now perform the SmartDrive updates if we need to
    sentryBreadCrumb('Finished checking for updates');
    this.performSmartDriveWirelessUpdate();
  }

  async performSmartDriveWirelessUpdate() {
    sentryBreadCrumb('Performing SmartDrive Wireless Update');
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
    const versionString = [mcuVersion, bleVersion]
      .map(SmartDriveData.Firmwares.versionByteToString)
      .join(', ');
    sentryBreadCrumb('got curent firmware versions: ' + versionString);
    // do we need to update?
    const isUpToDate =
      this.smartDrive.isMcuUpToDate(mcuVersion) &&
      this.smartDrive.isBleUpToDate(bleVersion);
    if (isUpToDate) {
      this.smartDriveOtaState = L('updates.up-to-date');
      // let the user know early if they are already up to date!
      await alert({
        title: L('updates.status'),
        message: L('updates.up-to-date'),
        okButtonText: L('buttons.ok')
      });
      // now close the updates page
      this.closeModal();
    } else {
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
      sentryBreadCrumb('Beginning SmartDrive update');

      const bleFw = new Uint8Array(
        this.currentVersions['SmartDriveBLE.ota'].data
      );
      const mcuFw = new Uint8Array(
        this.currentVersions['SmartDriveMCU.ota'].data
      );
      sentryBreadCrumb(`mcu length: ${mcuFw.length}`);
      sentryBreadCrumb(`ble length: ${bleFw.length}`);
      // maintain CPU resources while updating
      this.maintainCPU();
      // smartdrive needs to update
      let otaStatus = '';
      try {
        this._otaStarted = true;
        this.registerForSmartDriveEvents();
        otaStatus = await this.smartDrive.performOTA(
          bleFw,
          mcuFw,
          bleVersion,
          mcuVersion,
          300 * 1000
        );
        this._otaStarted = false;
        sentryBreadCrumb(
          'ota status at end: "' + otaStatus + '" type=' + typeof otaStatus
        );
        if (otaStatus === 'updates.canceled') {
          this.smartDriveOtaActions.splice(
            0,
            this.smartDriveOtaActions.length,
            {
              label: L('ota.action.close'),
              func: this._debouncedCloseModal.bind(this),
              action: 'ota.action.close',
              class: 'action-close'
            }
          );
        }
      } catch (err) {
        return this.updateError(err, L('updates.failed'), `${err}`);
      }
      const updateMsg = L(otaStatus);
      await this.stopUpdates(updateMsg, false);
    }
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
    sentryBreadCrumb(`saving file ${this.currentVersions[f.name].filename}`);
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

  async updateError(err: any, msg: string, alertMsg?: string) {
    // TODO: Show 'CLOSE/BACK' button to close this modal
    sentryBreadCrumb(`${err}: ${msg} - ${alertMsg}`);
    this.smartDriveOtaActions.splice(0, this.smartDriveOtaActions.length, {
      label: L('ota.action.close'),
      func: this._debouncedCloseModal.bind(this),
      action: 'ota.action.close',
      class: 'action-close'
    });
    Sentry.captureException(err);
    if (alertMsg !== undefined) {
      alert({
        title: L('updates.failed'),
        message: alertMsg,
        okButtonText: L('buttons.ok')
      });
    }
    await this.stopUpdates(msg, true);
  }

  async stopUpdates(msg: string, doCancelOta: boolean = true) {
    this.releaseCPU();
    this.smartDriveOtaState = msg;

    if (doCancelOta && this.smartDrive) {
      if (this._otaStarted) {
        sentryBreadCrumb(
          'Updates view model: ota was started, waiting for it to stop'
        );
        await new Promise((resolve, reject) => {
          this.smartDrive.once(
            SmartDrive.smartdrive_ota_stopped_event,
            resolve
          );
          this.smartDrive.cancelOTA();
          setTimeout(resolve, 10000);
        });
      } else {
        sentryBreadCrumb('Updates view model: ota was not started');
      }
    } else {
      sentryBreadCrumb(
        'Updates view model: no smartdrive or not told to cancel ota'
      );
    }
    this.smartDriveOtaActions.splice(0, this.smartDriveOtaActions.length, {
      label: L('ota.action.close'),
      func: this._debouncedCloseModal.bind(this),
      action: 'ota.action.close',
      class: 'action-close'
    });
  }

  async ensureBluetoothCapabilities() {
    try {
      // ensure we have the permissions
      await this.askForPermissions();
      // ensure bluetooth radio is enabled
      // sentryBreadCrumb('checking radio is enabled');
      const radioEnabled = await this._bluetoothService.radioEnabled();
      if (!radioEnabled) {
        sentryBreadCrumb('radio is not enabled!');
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

  async connectToSmartDrive(address: string) {
    sentryBreadCrumb('Connecting to SmartDrive ' + address);
    this.updateSmartDrive(address);
    // now connect to smart drive
    try {
      const didEnsure = await this.ensureBluetoothCapabilities();
      if (!didEnsure) {
        sentryBreadCrumb('could not ensure bluetooth capabilities!');
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
      alert({
        title: L('failures.title'),
        message: L('failures.no-smartdrive-paired'),
        okButtonText: L('buttons.ok')
      });
      this.updateError(null, L('failures.no-smartdrive-paired'));
      return;
    }

    // try to connect to the SmartDrive
    return this.connectToSmartDrive(this._savedSmartDriveAddress);
  }

  async disconnectFromSmartDrive() {
    if (this.smartDrive) {
      await this.smartDrive.disconnect();
    }
  }

  unregisterForTimeUpdates() {
    Application.android.unregisterBroadcastReceiver(
      android.content.Intent.ACTION_TIME_TICK
    );
    Application.android.unregisterBroadcastReceiver(
      android.content.Intent.ACTION_TIMEZONE_CHANGED
    );
  }

  registerForTimeUpdates() {
    // monitor the clock / system time for display and logging:
    this.updateTimeDisplay();
    Application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIME_TICK,
      this.timeReceiverCallback
    );
    Application.android.registerBroadcastReceiver(
      android.content.Intent.ACTION_TIMEZONE_CHANGED,
      this.timeReceiverCallback
    );
  }

  updateTimeDisplay() {
    const datetime = formatDateTime(new Date());
    this.currentTime = datetime.time;
    this.currentTimeMeridiem = datetime.timeMeridiem;
  }
}
