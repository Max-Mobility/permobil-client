import {
  AfterViewInit,
  Component,
  OnInit,
  ViewContainerRef
} from '@angular/core';
import {
  Files as KinveyFiles,
  Query as KinveyQuery
} from '@bradmartin/kinvey-nativescript-sdk';
import { ModalDialogParams, ModalDialogService } from '@nativescript/angular';
import {
  AndroidActivityBackPressedEventData,
  AndroidApplication,
  Application,
  ApplicationSettings as appSettings,
  Color,
  Connectivity,
  Dialogs,
  isAndroid,
  isIOS,
  Page,
  Screen
} from '@nativescript/core';
import { TranslateService } from '@ngx-translate/core';
import debounce from 'lodash/debounce';
import last from 'lodash/last';
import throttle from 'lodash/throttle';
import { allowSleepAgain, keepAwake } from 'nativescript-insomnia';
import { ToastDuration, Toasty } from 'nativescript-toasty';
import { APP_THEMES, CONFIGURATIONS } from '../../enums';
import { PushTracker, PushTrackerData, SmartDrive } from '../../models';
import { UpdatesInfoComponent } from '../../modules';
import { SmartDriveData } from '../../namespaces';
import { BluetoothService, LoggingService } from '../../services';

@Component({
  selector: 'wireless-updates',
  moduleId: module.id,
  templateUrl: 'wireless-updates.component.html'
})
export class WirelessUpdatesComponent implements OnInit, AfterViewInit {
  APP_THEMES = APP_THEMES;
  CONFIGURATIONS = CONFIGURATIONS;
  languagePreference: string = '';
  controlConfiguration: string = '';
  screenWidth = Screen.mainScreen.widthDIPs;
  allowBackNav: boolean = true;

  /**
   * SmartDrive Wireless Updates:
   */
  updateProgressText: string = '';
  isUpdatingSmartDrive: boolean = false;
  smartDriveOtaProgress: number = 0;
  smartDriveOtaState: string = null;
  smartDriveOtaActions = [];

  /**
   * SmartDrive Data / state management
   */
  smartDrive: SmartDrive;
  smartDriveCheckedForUpdates = false;
  smartDriveUpToDate = false;
  noSmartDriveDetected = false;
  private _throttledOtaAction: any = null;
  private _throttledOtaStatus: any = null;

  /**
   * PushTracker Data / state management
   */
  pushTrackerOtaProgress: number = 0;
  pushTrackerOtaState: string = null;
  pushTrackerOtaActions = [];
  pushTracker: PushTracker;
  pushTrackerCheckedForUpdates = false;
  pushTrackerUpToDate = false;
  noPushTrackerDetected = false;
  private _throttledPTOtaAction: any = null;
  private _throttledPTOtaStatus: any = null;
  CURRENT_THEME: string;

  constructor(
    private _page: Page,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams,
    private _bluetoothService: BluetoothService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    this.languagePreference = _params.context.languagePreference || 'English';
    this.controlConfiguration = _params.context.controlConfiguration || '';
    this.CURRENT_THEME = this._params.context.CURRENT_THEME;
  }

  ngOnInit() {
    this._logService.logBreadCrumb(WirelessUpdatesComponent.name, 'OnInit');
    // make sure we allow background execution (iOS) of the bluetooth
    BluetoothService.requestOtaBackgroundExecution();
    // now get updates
    this.checkForSmartDriveUpdates();
    if (
      this.controlConfiguration === CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
    )
      this.checkForPushTrackerUpdates();
  }

  ngAfterViewInit() {}

  onMoreBtnTap() {
    this._logService.logBreadCrumb(
      WirelessUpdatesComponent,
      'morebtn tapped in mock action bar'
    );
    this._modalService
      .showModal(UpdatesInfoComponent, {
        context: {
          languagePreference: this.languagePreference,
          'SmartDriveBLE.ota': this.currentVersions['SmartDriveBLE.ota'],
          'SmartDriveMCU.ota': this.currentVersions['SmartDriveMCU.ota'],
          'PushTracker.ota': this.currentPushTrackerVersions['PushTracker.ota']
        },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {
        // Do anything?
      })
      .catch(err => {
        this._logService.logException(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        }).show();
      });
  }

  closeModal() {
    // make sure to stop the bluetooth background execution (iOS)
    if (this.smartDrive) {
      this.smartDrive.cancelOTA();
      this.smartDrive.disconnect();
    }
    BluetoothService.stopOtaBackgroundExecution();
    // now close the page
    this._params.closeCallback();
  }

  onRescanForSmartDrives() {
    this.noSmartDriveDetected = false;
    this.smartDriveCheckedForUpdates = false;
    this.smartDriveOtaProgress = 0;
    this.checkForSmartDriveUpdates();
  }

  onRescanForPushTrackers() {
    this.noPushTrackerDetected = false;
    this.pushTrackerCheckedForUpdates = false;
    this.pushTrackerOtaProgress = 0;
    this.checkForPushTrackerUpdates();
  }

  updateBackButton() {
    this.allowBackNav =
      (this.pushTracker ? this.pushTracker.canBackNavigate : true) &&
      (this.smartDrive ? this.smartDrive.canBackNavigate : true);
    if (this.allowBackNav) {
      this.setBackNav(true);
    } else {
      this.setBackNav(false);
    }
  }

  updateInsomnia() {
    const canSleep =
      (this.pushTracker ? this.pushTracker.canBackNavigate : true) &&
      (this.smartDrive ? this.smartDrive.canBackNavigate : true);
    if (!canSleep) {
      keepAwake();
    } else {
      allowSleepAgain();
    }
  }

  async getFirmwareData() {
    let versions = {};
    try {
      versions = JSON.parse(
        appSettings.getString(SmartDriveData.Firmwares.TableName, '{}')
      );
    } catch (err) {}

    const objs = [];
    for (const key in versions) {
      objs.push(versions[key]);
    }
    let firmwareData = {};
    if (objs.length) {
      // @ts-ignore
      const mds = objs.map(o => SmartDriveData.Firmwares.loadFirmware(...o));
      // make the metadata
      firmwareData = mds.reduce((data, md) => {
        const fname = md[SmartDriveData.Firmwares.FileName];
        if (fname && fname.length) {
          this._logService.logBreadCrumb(
            WirelessUpdatesComponent.name,
            `Loading SD firmware file: ${fname}`
          );
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
        }
        return data;
      }, firmwareData);
    }
    return firmwareData;
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
    SmartDriveData.Firmwares.saveToFileSystem({
      filename: this.currentVersions[f.name].filename,
      data: f.data
    });
    if (id !== undefined) {
      this.currentVersions[f.name].id = id;
      newFirmware[SmartDriveData.Firmwares.IdName] = id;
    }
    appSettings.setString(
      SmartDriveData.Firmwares.TableName,
      JSON.stringify(this.currentVersions)
    );
  }

  private async _loadSmartDriveFirmwareFromFileSystem() {
    this.currentVersions = JSON.parse(
      appSettings.getString(SmartDriveData.Firmwares.TableName, '{}')
    );
    if (this.currentVersions['SmartDriveMCU.ota']) {
      this.currentVersions[
        'SmartDriveMCU.ota'
      ].data = SmartDriveData.Firmwares.loadFromFileSystem(
        this.currentVersions['SmartDriveMCU.ota']
      );
    }
    if (this.currentVersions['SmartDriveBLE.ota']) {
      this.currentVersions[
        'SmartDriveBLE.ota'
      ].data = SmartDriveData.Firmwares.loadFromFileSystem(
        this.currentVersions['SmartDriveBLE.ota']
      );
    }
    // console.log('Loaded from FS', this.currentVersions);
  }

  private currentVersions = {};
  async checkForSmartDriveUpdates() {
    try {
      const smartDriveVersions = await this.getFirmwareData();
      this.currentVersions = { ...this.currentVersions, ...smartDriveVersions };
    } catch (err) {
      this._logService.logException(err);
    }

    const _connType = Connectivity.getConnectionType();
    if (_connType === Connectivity.connectionType.none) {
      try {
        await this._loadSmartDriveFirmwareFromFileSystem();
      } catch (err) {
        this._logService.logException(err);
      }
      // Now perform the SmartDrive updates if we need to
      try {
        await this.performSmartDriveWirelessUpdate();
        if (this.smartDrive) {
          this.smartDrive.disconnect();
        }
      } catch (err) {
        if (this.smartDrive) {
          this.smartDrive.cancelOTA();
        }
        this._logService.logException(err);
      }
      return;
    }

    const kinveyQuery = new KinveyQuery();
    kinveyQuery.equalTo('firmware_file', true);
    kinveyQuery.equalTo('_filename', 'SmartDriveBLE.ota');
    const kinveySecondQuery = new KinveyQuery();
    kinveySecondQuery.equalTo('firmware_file', true);
    kinveySecondQuery.equalTo('_filename', 'SmartDriveMCU.ota');
    kinveyQuery.or(kinveySecondQuery);

    KinveyFiles.find(kinveyQuery)
      .then(async kinveyResponse => {
        // Now that we have the metadata, check to see if we already
        // have the most up to date firmware files and download them
        // if we don't
        const mds = kinveyResponse;
        let promises = [];
        // get the max firmware version for each firmware
        const reducedMaxes = mds.reduce((maxes, md) => {
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
          const isMax = v === reducedMaxes[fwName];
          return isMax && (!current || v > currentVersion);
        });

        // do we need to download any firmware files?
        if (fileMetaDatas && fileMetaDatas.length) {
          // TODO: update UI

          // now download the files
          promises = fileMetaDatas.map(SmartDriveData.Firmwares.download);
        }

        let files = null;
        try {
          files = await Promise.all(promises);
        } catch (err1) {
          this._logService.logBreadCrumb(
            WirelessUpdatesComponent.name,
            'Failed to download SmartDrive firmware files' + '\n ' + err1
          );
        }

        // Now that we have the files, write them to disk and update
        // our local metadata
        promises = [];
        if (files && files.length) {
          promises = files.map(this.updateFirmwareData.bind(this));
        }
        try {
          await Promise.all(promises);
        } catch (err2) {
          this._logService.logBreadCrumb(
            WirelessUpdatesComponent.name,
            'Failed to save SmartDrive firmware files to disk' + '\n' + err2
          );
          // this._logService.logException(err2);
        }

        // Now perform the SmartDrive updates if we need to
        try {
          await this.performSmartDriveWirelessUpdate();
          if (this.smartDrive) {
            this.smartDrive.disconnect();
          }
        } catch (err3) {
          if (this.smartDrive) {
            this.smartDrive.cancelOTA();
          }
          this._logService.logException(err3);
        }
      })
      .catch(async () => {
        try {
          await this._loadSmartDriveFirmwareFromFileSystem();
        } catch (err4) {
          this._logService.logException(err4);
        }
        // Now perform the SmartDrive updates if we need to
        try {
          await this.performSmartDriveWirelessUpdate();
          if (this.smartDrive) {
            this.smartDrive.disconnect();
          }
        } catch (err5) {
          if (this.smartDrive) {
            this.smartDrive.cancelOTA();
          }
          this._logService.logException(err5);
        }
      });
  }

  async performSmartDriveWirelessUpdate() {
    if (
      !this.currentVersions['SmartDriveBLE.ota'] ||
      !this.currentVersions['SmartDriveMCU.ota']
    ) {
      // Download failed
      this.smartDriveCheckedForUpdates = true;
      this.smartDriveOtaState = this._translateService.instant(
        'wireless-updates.state.firmware-download-failed'
      );
      this.smartDriveOtaProgress = 0;
      this.noSmartDriveDetected = true;
      return;
    }

    // do we need to update? - check against smartdrive version
    const bleVersion = this.currentVersions['SmartDriveBLE.ota'].version;
    const mcuVersion = this.currentVersions['SmartDriveMCU.ota'].version;

    if (!this.smartDrive) {
      await this._bluetoothService
        .scanForSmartDriveReturnOnFirst(10)
        .then(async () => {
          const drives = BluetoothService.SmartDrives;
          if (drives.length === 0) {
            new Toasty({
              text: this._translateService.instant(
                'wireless-updates.messages.no-smartdrives-detected'
              ),
              duration: ToastDuration.LONG
            }).show();
            this.smartDriveCheckedForUpdates = true;
            this.smartDriveOtaState = this._translateService.instant(
              'wireless-updates.state.no-smartdrives-detected'
            );
            this.smartDriveOtaProgress = 0;
            this.noSmartDriveDetected = true;
            return;
          } else if (drives.length > 1) {
            new Toasty({
              text: this._translateService.instant(
                'wireless-updates.messages.more-than-one-smartdrive-detected'
              ),
              duration: ToastDuration.LONG
            }).show();
            this.smartDriveCheckedForUpdates = true;
            this.smartDriveOtaState = this._translateService.instant(
              'wireless-updates.state.more-than-one-smartdrive-detected'
            );
            this.smartDriveOtaProgress = 0;
            this.noSmartDriveDetected = true;
            return;
          } else {
            drives.map(drive => {
              this.smartDrive = drive;
            });
          }
        })
        .catch(err => {
          this._logService.logException(err);
        });
    }

    if (!this.smartDrive) return;

    this.smartDriveUpToDate = false;

    // the smartdrive is not up to date, so we need to update it.
    // reset the ota progress to 0 (since downloaing may have used it)
    // this.smartDriveOtaProgress = 0;
    // get info out to tell the user
    const version = SmartDriveData.Firmwares.versionByteToString(
      Math.max(mcuVersion, bleVersion)
    );
    this._logService.logBreadCrumb(
      WirelessUpdatesComponent.name,
      `Got version: ${version}`
    );
    // show dialog to user informing them of the version number and changes
    Object.keys(this.currentVersions).forEach(
      k => this.currentVersions[k].changes
    );
    let bleFw = null;
    let mcuFw = null;
    if (isAndroid) {
      bleFw = new Uint8Array(this.currentVersions['SmartDriveBLE.ota'].data);
      mcuFw = new Uint8Array(this.currentVersions['SmartDriveMCU.ota'].data);
    } else {
      let len = 0;
      let tmp = null;
      // ble fw
      len = this.currentVersions['SmartDriveBLE.ota'].data.length;
      tmp = new ArrayBuffer(len);
      this.currentVersions['SmartDriveBLE.ota'].data.getBytes(tmp);
      bleFw = new Uint8Array(tmp);
      // mcu fw
      tmp = new ArrayBuffer(
        this.currentVersions['SmartDriveMCU.ota'].data.length
      );
      this.currentVersions['SmartDriveMCU.ota'].data.getBytes(tmp);
      mcuFw = new Uint8Array(tmp);
    }
    // smartdrive needs to update
    try {
      this.registerForSmartDriveEvents();
      await this.smartDrive.performOTA(
        bleFw,
        mcuFw,
        bleVersion,
        mcuVersion,
        300 * 1000
      );
      if (this.smartDrive) {
        this.smartDrive.disconnect();
      }
    } catch (err) {
      if (this.smartDrive) {
        this.smartDrive.cancelOTA();
      }
    }
    this.unregisterForSmartDriveEvents();
  }

  registerForSmartDriveEvents() {
    this.unregisterForSmartDriveEvents();
    if (!this.smartDrive) return;
    this.smartDrive.canBackNavigate = true;
    this.updateBackButton();
    this.updateInsomnia();
    // set up ota action handler
    // throttled function to keep people from pressing it too frequently
    this._throttledOtaAction = debounce(this.smartDrive.onOTAActionTap, 500, {
      leading: true,
      trailing: true
    });

    this._throttledOtaStatus = throttle(this.onSmartDriveOtaStatus, 500, {
      leading: true,
      trailing: true
    });

    this.smartDrive.on(
      SmartDrive.smartdrive_ota_status_event,
      this._throttledOtaStatus,
      this
    );
  }

  unregisterForSmartDriveEvents() {
    this.smartDrive.canBackNavigate = true;
    this.updateBackButton();
    this.updateInsomnia();
    if (!this.smartDrive) return;
    this.smartDrive.off(
      SmartDrive.smartdrive_ota_status_event,
      this._throttledOtaStatus,
      this
    );
  }

  private _previousSmartDriveOtaState = null;
  onSmartDriveOtaStatus(args: any) {
    // get the current progress of the update
    const progress = args.data.progress;
    const otaState = args.data.state; // .replace('ota.sd.state.', '');

    // translate the state
    const state = this._translateService.instant(otaState);

    // Allow users to back navigate as long as the update is not
    // started:
    // https://github.com/Max-Mobility/permobil-client/issues/521
    if (otaState !== this._previousSmartDriveOtaState) {
      this._previousSmartDriveOtaState = otaState;
      if (
        otaState === SmartDrive.OTAState.canceled ||
        otaState === SmartDrive.OTAState.comm_failure ||
        otaState === SmartDrive.OTAState.complete ||
        otaState === SmartDrive.OTAState.failed ||
        otaState === SmartDrive.OTAState.not_started ||
        otaState === SmartDrive.OTAState.detected_sd ||
        otaState === SmartDrive.OTAState.timeout
      ) {
        this.smartDrive.canBackNavigate = true;
      } else {
        this.smartDrive.canBackNavigate = false;
      }
      this.updateBackButton();
    }

    // now turn the actions into structures for our UI
    const actions = args.data.actions.map(a => {
      const actionClass = 'action-' + last(a.split('.')) + ' compact';
      // translate the label
      const actionLabel = this._translateService.instant(a); // .replace('ota.action.', '');
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
    if (this.smartDriveOtaProgress > 0) {
      this.smartDriveOtaState = `${this.smartDriveOtaProgress.toFixed(
        1
      )} % ${state}`;
    } else {
      this.smartDriveOtaState = state;
    }
    if (!this.smartDriveCheckedForUpdates)
      this.smartDriveCheckedForUpdates = true;
    if (
      this.smartDrive.otaState === SmartDrive.OTAState.already_uptodate ||
      this.smartDrive.otaState === SmartDrive.OTAState.complete
    ) {
      this.smartDriveOtaProgress = 100;
      this.setBackNav(true);
    }
  }

  async getPushTrackerFirmwareData() {
    let versions = {};
    try {
      versions = JSON.parse(
        appSettings.getString(PushTrackerData.Firmware.TableName, '{}')
      );
    } catch (err) {}

    const objs = [];
    for (const key in versions) {
      objs.push(versions[key]);
    }
    let firmwareData = {};
    if (objs.length) {
      // @ts-ignore
      const mds = objs.map(o => PushTrackerData.Firmware.loadFirmware(...o));
      // make the metadata
      firmwareData = mds.reduce((data, md) => {
        const fname = md[PushTrackerData.Firmware.FileName];
        if (fname && fname.length) {
          this._logService.logBreadCrumb(
            WirelessUpdatesComponent.name,
            `Loading PT firmware file: ${fname}`
          );
          const blob = PushTrackerData.Firmware.loadFromFileSystem({
            filename: fname
          });
          if (blob && blob.length) {
            data[md[PushTrackerData.Firmware.FirmwareName]] = {
              version: md[PushTrackerData.Firmware.VersionName],
              filename: fname,
              id: md[PushTrackerData.Firmware.IdName],
              changes: md[PushTrackerData.Firmware.ChangesName],
              data: blob
            };
          }
        }
        return data;
      }, firmwareData);
    }
    return firmwareData;
  }

  async updatePushTrackerFirmwareData(f: any) {
    const id =
      this.currentPushTrackerVersions[f.name] &&
      this.currentPushTrackerVersions[f.name].id;
    // update the data in the db
    const newFirmware = PushTrackerData.Firmware.newFirmware(
      f.version,
      f.name,
      undefined,
      f.changes
    );
    // update current versions
    this.currentPushTrackerVersions[f.name] = {
      version: f.version,
      changes: f.changes,
      filename: newFirmware[PushTrackerData.Firmware.FileName],
      data: f.data
    };
    // save binary file to fs
    PushTrackerData.Firmware.saveToFileSystem({
      filename: this.currentPushTrackerVersions[f.name].filename,
      data: f.data
    });
    if (id !== undefined) {
      this.currentPushTrackerVersions[f.name].id = id;
      newFirmware[PushTrackerData.Firmware.IdName] = id;
    }
    appSettings.setString(
      PushTrackerData.Firmware.TableName,
      JSON.stringify(this.currentPushTrackerVersions)
    );
  }

  private async _loadPushTrackerFirmwareFromFileSystem() {
    this.currentPushTrackerVersions = JSON.parse(
      appSettings.getString(PushTrackerData.Firmware.TableName, '{}')
    );
    if (this.currentPushTrackerVersions['PushTracker.ota']) {
      this.currentPushTrackerVersions[
        'PushTracker.ota'
      ].data = PushTrackerData.Firmware.loadFromFileSystem(
        this.currentPushTrackerVersions['PushTracker.ota']
      );
    }
  }

  private currentPushTrackerVersions = {};
  async checkForPushTrackerUpdates() {
    try {
      const pushTrackerVersions = await this.getPushTrackerFirmwareData();
      this.currentPushTrackerVersions = {
        ...this.currentPushTrackerVersions,
        ...pushTrackerVersions
      };
    } catch (err) {
      this._logService.logException(err);
    }

    const _connType = Connectivity.getConnectionType();
    if (_connType === Connectivity.connectionType.none) {
      try {
        await this._loadPushTrackerFirmwareFromFileSystem();
      } catch (err) {
        this._logService.logException(err);
      }
      // Now perform the PushTracker updates if we need to
      try {
        await this.performPushTrackerWirelessUpdate();
      } catch (err) {
        this._logService.logException(err);
      }
      return;
    }

    const kinveyQuery = new KinveyQuery();
    kinveyQuery.equalTo('firmware_file', true);
    kinveyQuery.equalTo('_filename', 'PushTracker.ota');

    KinveyFiles.find(kinveyQuery)
      .then(async kinveyResponse => {
        // Now that we have the metadata, check to see if we already
        // have the most up to date firmware files and download them
        // if we don't
        const mds = kinveyResponse;

        let promises = [];
        // get the max firmware version for each firmware
        const maxes = mds.reduce((maxes, md) => {
          const v = PushTracker.versionStringToByte(md['version']);
          const fwName = md['_filename'];
          if (!maxes[fwName]) maxes[fwName] = 0;
          maxes[fwName] = Math.max(v, maxes[fwName]);
          return maxes;
        }, {});

        // filter only the firmwares that we don't have or that are newer
        // than the ones we have (and are the max)
        const fileMetaDatas = mds.filter(f => {
          const v = PushTracker.versionStringToByte(f['version']);
          const fwName = f['_filename'];
          const current = this.currentPushTrackerVersions[fwName];
          const currentVersion = current && current.version;
          const isMax = v === maxes[fwName];
          return isMax && (!current || v > currentVersion);
        });

        // do we need to download any firmware files?
        if (fileMetaDatas && fileMetaDatas.length) {
          // TODO: update UI
          // now download the files
          promises = fileMetaDatas.map(PushTrackerData.Firmware.download);
        }
        let files = null;
        try {
          files = await Promise.all(promises);
        } catch (err) {
          this._logService.logBreadCrumb(
            WirelessUpdatesComponent.name,
            'Failed to download PushTracker firmware files'
          );
        }

        // Now that we have the files, write them to disk and update
        // our local metadata
        promises = [];
        if (files && files.length) {
          promises = files.map(this.updatePushTrackerFirmwareData.bind(this));
        }
        try {
          await Promise.all(promises);
        } catch (err) {
          this._logService.logBreadCrumb(
            WirelessUpdatesComponent.name,
            'Failed to save PushTracker firmware files to disk'
          );
          // this._logService.logException(err);
        }

        // Now perform the PushTracker updates if we need to
        try {
          await this.performPushTrackerWirelessUpdate();
        } catch (err) {
          this._logService.logException(err);
        }
      })
      .catch(async err => {
        try {
          await this._loadPushTrackerFirmwareFromFileSystem();
        } catch (err) {
          this._logService.logException(err);
        }
        // Now perform the PushTracker updates if we need to
        try {
          await this.performPushTrackerWirelessUpdate();
        } catch (err) {
          this._logService.logException(err);
        }
      });
  }

  async performPushTrackerWirelessUpdate() {
    if (!this.currentPushTrackerVersions['PushTracker.ota']) {
      // Download failed
      this.pushTrackerCheckedForUpdates = true;
      this.pushTrackerOtaState = this._translateService.instant(
        'wireless-updates.state.firmware-download-failed'
      );
      this.pushTrackerOtaProgress = 0;
      this.noPushTrackerDetected = true;
      return;
    }

    // do we need to update? - check against pushtracker version
    const ptVersion = this.currentPushTrackerVersions['PushTracker.ota']
      .version;

    if (!this.pushTracker) {
      const trackers = BluetoothService.PushTrackers.filter((val, _1, _2) => {
        return val.connected;
      });
      if (trackers.length === 0) {
        /*
        new Toasty({
          text: this._translateService.instant(
            'wireless-updates.messages.no-pushtracker-detected'
          ),
          duration: ToastDuration.LONG
        }).show();
        */
        this.pushTrackerCheckedForUpdates = true;
        this.pushTrackerOtaState = this._translateService.instant(
          'wireless-updates.state.no-pushtracker-detected'
        );
        this.pushTrackerOtaProgress = 0;
        this.noPushTrackerDetected = true;
        return;
      } else if (trackers.length > 1) {
        /*
        new Toasty({
          text: this._translateService.instant(
            'wireless-updates.messages.more-than-one-pushtracker-connected'
          ),
          duration: ToastDuration.LONG
        }).show();
        */
        this.pushTrackerCheckedForUpdates = true;
        this.pushTrackerOtaState = this._translateService.instant(
          'wireless-updates.state.more-than-one-pushtracker-detected'
        );
        this.pushTrackerOtaProgress = 0;
        this.noPushTrackerDetected = true;
        return;
      } else {
        trackers.forEach(tracker => {
          this.pushTracker = tracker;
        });
      }
    }

    if (!this.pushTracker) {
      this.pushTrackerOtaProgress = 0;
      this.pushTrackerOtaState = PushTracker.OTAState.failed;
      this.pushTrackerCheckedForUpdates = true;
      this.pushTrackerUpToDate = true;
      return;
    }

    this.pushTrackerUpToDate = false;

    // the smartdrive is not up to date, so we need to update it.
    // reset the ota progress to 0 (since downloaing may have used it)
    // this.smartDriveOtaProgress = 0;
    // get info out to tell the user
    const version = PushTracker.versionByteToString(ptVersion);
    this._logService.logBreadCrumb(
      WirelessUpdatesComponent.name,
      `Got version: ${version}`
    );
    // show dialog to user informing them of the version number and changes
    Object.keys(this.currentPushTrackerVersions).forEach(
      k => this.currentPushTrackerVersions[k].changes
    );
    let ptFw = null;
    if (isAndroid) {
      ptFw = new Uint8Array(
        this.currentPushTrackerVersions['PushTracker.ota'].data
      );
    } else {
      const len = this.currentPushTrackerVersions['PushTracker.ota'].data
        .length;
      const tmp = new ArrayBuffer(len);
      this.currentPushTrackerVersions['PushTracker.ota'].data.getBytes(tmp);
      ptFw = new Uint8Array(tmp);
    }
    // pushtracker needs to update
    try {
      this.registerForPushTrackerEvents();
      await this.pushTracker.performOTA(ptFw, ptVersion, 300 * 1000);
    } catch (err) {
      if (this.pushTracker) {
        this.pushTracker.cancelOTA();
      }
    }
    this.unregisterForPushTrackerEvents();
  }

  registerForPushTrackerEvents() {
    this.unregisterForPushTrackerEvents();
    if (!this.pushTracker) return;
    this.pushTracker.canBackNavigate = true;
    this.updateBackButton();
    this.updateInsomnia();
    // set up ota action handler
    // throttled function to keep people from pressing it too frequently
    this._throttledPTOtaAction = debounce(
      this.pushTracker.onOTAActionTap,
      500,
      {
        leading: true,
        trailing: true
      }
    );

    this._throttledPTOtaStatus = throttle(this.onPushTrackerOtaStatus, 500, {
      leading: true,
      trailing: true
    });

    this.pushTracker.on(
      PushTracker.pushtracker_ota_status_event,
      this._throttledPTOtaStatus,
      this
    );
  }

  unregisterForPushTrackerEvents() {
    this.pushTracker.canBackNavigate = true;
    this.updateBackButton();
    this.updateInsomnia();
    if (!this.pushTracker) return;
    this.pushTracker.off(
      PushTracker.pushtracker_ota_status_event,
      this._throttledPTOtaStatus,
      this
    );
  }

  private _previousPushTrackerOtaState = null;
  onPushTrackerOtaStatus(args: any) {
    // get the current progress of the update
    const progress = args.data.progress;
    const otaState = args.data.state; // .replace('ota.sd.state.', '');

    // translate the state
    const state = this._translateService.instant(otaState);

    // Allow users to back navigate as long as the update is not
    // started:
    // https://github.com/Max-Mobility/permobil-client/issues/521
    if (otaState !== this._previousPushTrackerOtaState) {
      this._previousPushTrackerOtaState = otaState;
      if (
        otaState === PushTracker.OTAState.canceled ||
        otaState === PushTracker.OTAState.complete ||
        otaState === PushTracker.OTAState.failed ||
        otaState === PushTracker.OTAState.not_started ||
        otaState === PushTracker.OTAState.detected_pt ||
        otaState === PushTracker.OTAState.timeout
      ) {
        this.pushTracker.canBackNavigate = true;
      } else {
        this.pushTracker.canBackNavigate = false;
      }
      this.updateBackButton();
    }

    // now turn the actions into structures for our UI
    const actions = args.data.actions.map(a => {
      const actionClass = 'action-' + last(a.split('.')) + ' compact';
      // translate the label
      const actionLabel = this._translateService.instant(a); // .replace('ota.action.', '');
      return {
        label: actionLabel,
        func: this._throttledPTOtaAction.bind(this.pushTracker, a),
        action: a,
        class: actionClass
      };
    });
    // now set the renderable bound data
    this.pushTrackerOtaProgress = progress;
    this.pushTrackerOtaActions.splice(
      0,
      this.pushTrackerOtaActions.length,
      ...actions
    );
    if (this.pushTrackerOtaProgress > 0) {
      this.pushTrackerOtaState = `${this.pushTrackerOtaProgress.toFixed(
        1
      )} % ${state}`;
    } else {
      this.pushTrackerOtaState = state;
    }
    if (!this.pushTrackerCheckedForUpdates)
      this.pushTrackerCheckedForUpdates = true;
    if (
      this.pushTracker.otaState === PushTracker.OTAState.already_uptodate ||
      this.pushTracker.otaState === PushTracker.OTAState.complete
    ) {
      this.pushTrackerOtaProgress = 100;
      this.setBackNav(true);
    }
  }

  private setBackNav(allowed: boolean) {
    if (isIOS) {
      if (
        this._page.ios.navigationController &&
        this._page.ios.navigationController.interactivePopGestureRecognizer
      ) {
        this._page.ios.navigationController.interactivePopGestureRecognizer.enabled = allowed;
      }
      this._page.enableSwipeBackNavigation = allowed;
    } else if (isAndroid) {
      if (allowed) {
        Application.android.off(AndroidApplication.activityBackPressedEvent);
      } else {
        // setting the event listener for the android back pressed event
        Application.android.on(
          AndroidApplication.activityBackPressedEvent,
          (args: AndroidActivityBackPressedEventData) => {
            // cancel the back nav for now then confirm with user to leave
            args.cancel = true;

            let closeModal = false;
            Dialogs.confirm({
              title: this._translateService.instant(
                'ota.warnings.leaving.title'
              ),
              message: this._translateService.instant(
                'ota.warnings.leaving.message'
              ),
              okButtonText: this._translateService.instant('dialogs.yes'),
              cancelable: true,
              cancelButtonText: this._translateService.instant('general.cancel')
            })
              .then((result: boolean) => {
                if (result === true) {
                  // user wants to leave so remove the back pressed event
                  Application.android.off(
                    AndroidApplication.activityBackPressedEvent
                  );
                  closeModal = true;
                }
              })
              .catch(err => {
                this._logService.logException(err);
              })
              .then(() => {
                if (closeModal) this.closeModal();
              })
              .catch(err => {
                this._logService.logException(err);
              });
          }
        );
      }
    }
  }
}
