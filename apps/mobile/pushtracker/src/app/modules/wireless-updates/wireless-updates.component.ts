import { Component, OnInit, AfterViewInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, Device } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService, BluetoothService } from '../../services';
import { SmartDriveData } from '../../namespaces';
import { ObservableArray } from 'tns-core-modules/data/observable-array/observable-array';
import { SmartDrive } from '~/app/models';
import { Files as KinveyFiles, Query as KinveyQuery } from 'kinvey-nativescript-sdk';
import * as appSettings from 'tns-core-modules/application-settings';
const dialogs = require('tns-core-modules/ui/dialogs');
import last from 'lodash/last';
import debounce from 'lodash/debounce';

@Component({
  selector: 'wireless-updates',
  moduleId: module.id,
  templateUrl: 'wireless-updates.component.html'
})
export class WirelessUpdatesComponent implements OnInit, AfterViewInit {
  ptCirclePercentage: number = 83;
  sdCirclePercentage: number = 30;
  controlConfiguration: string = '';

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
  public smartDrive: SmartDrive;
  public smartDriveCheckedForUpdates = false;
  public smartDriveUpToDate = false;
  public noSmartDriveDetected = false;
  private _throttledOtaAction: any = null;
  public canBackNavigate = true;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams,
    private _bluetoothService: BluetoothService
  ) {
    this.controlConfiguration = _params.context.controlConfiguration || '';
    this.checkForSmartDriveUpdates();
  }

  ngOnInit() {
    this._logService.logBreadCrumb('wireless-updates.component OnInit');
  }

  ngAfterViewInit() {
  }

  onMoreBtnTap() {
    console.log('morebtn tapped in mock action bar');
  }

  closeModal() {
    this._params.closeCallback();
  }

  onRescanForSmartDrives() {
    this.noSmartDriveDetected = false;
    this.smartDriveCheckedForUpdates = false;
    this.smartDriveOtaProgress = 0;
    this.checkForSmartDriveUpdates();
  }

  async getFirmwareData() {
    const versions = JSON.parse(appSettings.getString(SmartDriveData.Firmwares.TableName));

    const objs = [];
    for (const key in versions) {
      objs.push(versions[key]);
    }
    if (objs.length) {
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
    SmartDriveData.Firmwares.saveToFileSystem({
      filename: this.currentVersions[f.name].filename,
      data: f.data
    });
    if (id !== undefined) {
      this.currentVersions[f.name].id = id;
      newFirmware[SmartDriveData.Firmwares.IdName] = id;
    }
    appSettings.setString(SmartDriveData.Firmwares.TableName,
      JSON.stringify(this.currentVersions));
  }

  private currentVersions = {};
  async checkForSmartDriveUpdates() {
    try {
      this.currentVersions = await this.getFirmwareData();
    } catch (err) {
      // TODO: log error
    }

    const kinveyQuery = new KinveyQuery();
    kinveyQuery.equalTo('firmware_file', true);
    kinveyQuery.equalTo('_filename', 'SmartDriveBLE.ota');
    const kinveySecondQuery = new KinveyQuery();
    kinveySecondQuery.equalTo('firmware_file', true);
    kinveySecondQuery.equalTo('_filename', 'SmartDriveMCU.ota');
    kinveyQuery.or(kinveySecondQuery);

    KinveyFiles.find(kinveyQuery).then(async kinveyResponse => {
      // Now that we have the metadata, check to see if we already
      // have the most up to date firmware files and download them
      // if we don't
      const mds = kinveyResponse;
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

      // do we need to download any firmware files?
      if (fileMetaDatas && fileMetaDatas.length) {
        // TODO: update UI

        // now download the files
        promises = fileMetaDatas.map(SmartDriveData.Firmwares.download);
      }
      let files = null;
      try {
        files = await Promise.all(promises);
      } catch (err) {
        // TODO: log error
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
        // TODO: log error
      }

      // Now perform the SmartDrive updates if we need to
      this.performSmartDriveWirelessUpdate();
    });
  }

  async performSmartDriveWirelessUpdate() {
    // do we need to update? - check against smartdrive version
    const bleVersion = this.currentVersions['SmartDriveBLE.ota'].version;
    const mcuVersion = this.currentVersions['SmartDriveMCU.ota'].version;

    if (!this.smartDrive) {
      await this._bluetoothService.scanForSmartDrive(10).then(() => {
        const drives = BluetoothService.SmartDrives;
        if (drives.length === 0) {
          dialogs.alert('Failed to detect a SmartDrive. Please make sure that your SmartDrive is switched ON and nearby.');
          this.smartDriveCheckedForUpdates = true;
          this.smartDriveOtaState = this._translateService.instant('No SmartDrives detected!');
          this.smartDriveOtaProgress = 0;
          this.noSmartDriveDetected = true;
          return;
        }
        else if (drives.length > 1) {
          dialogs.alert('More than one SmartDrive detected! Please switch OFF all but one of the SmartDrives and retry');
          this.smartDriveCheckedForUpdates = true;
          this.smartDriveOtaState = this._translateService.instant('More than one SmartDrive detected!');
          this.smartDriveOtaProgress = 0;
          this.noSmartDriveDetected = true;
          return;
        }
        else {
          drives.map(drive => {
            this.smartDrive = drive;
          });
          console.log(this.smartDrive.address, this.smartDrive.ble_version, this.smartDrive.mcu_version);
        }
      });
    }

    if (!this.smartDrive)
      return;

    if (this.smartDrive.isMcuUpToDate(mcuVersion) && this.smartDrive.isBleUpToDate(bleVersion)) {
      // smartdrive is already up to date
      this.smartDriveOtaProgress = 100;
      this.smartDriveCheckedForUpdates = true;
      this.smartDriveUpToDate = true;
      return;
    }

    this.smartDriveUpToDate = false;

    // the smartdrive is not up to date, so we need to update it.
    // reset the ota progress to 0 (since downloaing may have used it)
    // this.smartDriveOtaProgress = 0;
    // get info out to tell the user
    const version = SmartDriveData.Firmwares.versionByteToString(
      Math.max(mcuVersion, bleVersion)
    );
    Log.D('got version', version);
    // show dialog to user informing them of the version number and changes
    const changes = Object.keys(this.currentVersions).map(
      k => this.currentVersions[k].changes
    );
    const bleFw = new Uint8Array(
      this.currentVersions['SmartDriveBLE.ota'].data
    );
    const mcuFw = new Uint8Array(
      this.currentVersions['SmartDriveMCU.ota'].data
    );
    // smartdrive needs to update
    let otaStatus = '';
    try {
      this.registerForSmartDriveEvents();
      otaStatus = await this.smartDrive
        .performOTA(bleFw, mcuFw, bleVersion, mcuVersion, 300 * 1000);
    } catch (err) {
      if (this.smartDrive)
        this.smartDrive.cancelOTA();
    }
    this.unregisterForSmartDriveEvents();
  }

  registerForSmartDriveEvents() {
    if (!this.smartDrive) return;
    this.unregisterForSmartDriveEvents();
    // set up ota action handler
    // throttled function to keep people from pressing it too frequently
    this._throttledOtaAction = debounce(this.smartDrive.onOTAActionTap, 500, {
      leading: true,
      trailing: true
    });
    this.smartDrive.on(
      SmartDrive.smartdrive_ota_status_event,
      this.onSmartDriveOtaStatus,
      this
    );
  }

  unregisterForSmartDriveEvents() {
    if (!this.smartDrive) return;
    this.smartDrive.off(
      SmartDrive.smartdrive_ota_status_event,
      this.onSmartDriveOtaStatus,
      this
    );
  }

  onSmartDriveOtaStatus(args: any) {
    // this.canBackNavigate = true;
    // get the current progress of the update
    const progress = args.data.progress;
    // translate the state
    const state = this._translateService.instant(args.data.state); // .replace('ota.sd.state.', '');
    // now turn the actions into structures for our UI
    const actions = args.data.actions.map(a => {
      // if (a.includes('cancel')) {
      //   this.canBackNavigate = false;
      // }
      const actionClass = 'action-' + last(a.split('.')) +
        ' compact';
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
    this.smartDriveOtaState = state;
    if (!this.smartDriveCheckedForUpdates)
      this.smartDriveCheckedForUpdates = true;
    if (this.smartDrive.otaState === SmartDrive.OTAState.already_uptodate ||
        this.smartDrive.otaState === SmartDrive.OTAState.complete) {
      this.smartDriveOtaProgress = 100;
    }
  }
}