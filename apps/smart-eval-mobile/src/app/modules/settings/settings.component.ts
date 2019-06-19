import { Component } from '@angular/core';
import {
  BluetoothService,
  FirmwareService,
  LoggingService,
  ProgressService
} from '@maxmobility/mobile';
import { Kinvey } from 'kinvey-nativescript-sdk';
import * as fs from 'tns-core-modules/file-system';
import { isAndroid, isIOS } from 'tns-core-modules/platform';

@Component({
  selector: 'settings',
  moduleId: module.id,
  templateUrl: 'settings.component.html',
  styleUrls: ['settings.component.scss']
})
export class SettingsComponent {
  private static LOG_TAG = 'settings.component ';

  constructor(
    private _bluetoothService: BluetoothService,
    private _firmwareService: FirmwareService,
    private _progressService: ProgressService,
    private _loggingService: LoggingService
  ) {
    this._loggingService.logBreadCrumb(
      SettingsComponent.LOG_TAG + `constructor.`
    );
  }

  onReload() {
    this._firmwareService.loadFromFS();
  }

  onRedownload() {
    this._firmwareService.downloadFirmwares();
  }

  onUploadFiles(): Promise<void> {
    let ptFW = null;
    let bleFW = null;
    let mcuFW = null;
    // load firmware files here!
    return this.loadFile('/assets/ota/PushTracker.16.ota')
      .then(otaData => {
        ptFW = otaData;
        return this.loadFile('/assets/ota/SmartDriveBLE.16.ota');
      })
      .then(otaData => {
        bleFW = otaData;
        return this.loadFile('/assets/ota/SmartDriveMCU.16.ota');
      })
      .then(otaData => {
        mcuFW = otaData;
      })
      .then(() => {
        const ptMD = {
          filename: 'PushTracker.ota',
          size: ptFW.readSync().length,
          version: '1.6',
          public: true
        };
        const mcuMD = {
          filename: 'SmartDriveMCU.ota',
          size: mcuFW.readSync().length,
          version: '1.6',
          public: true
        };
        const bleMD = {
          filename: 'SmartDriveBLE.ota',
          size: bleFW.readSync().length,
          version: '1.6',
          public: true
        };
        const ptPromise = Kinvey.Files.upload(ptFW, ptMD);
        const mcuPromise = Kinvey.Files.upload(mcuFW, mcuMD);
        const blePromise = Kinvey.Files.upload(bleFW, bleMD);
        return Promise.all([ptPromise, mcuPromise, blePromise])
          .then(files => {
            this._loggingService.logBreadCrumb(`Uploaded to Kinvey ${files}`);
          })
          .catch(error => {
            // this._loggingService.logException(error);
          });
      });
  }

  onStopBT(): void {
    this._loggingService.logBreadCrumb(
      SettingsComponent.LOG_TAG + `onStopBT()`
    );

    this._progressService.show('Stopping Bluetooth service');
    const stopProgress = result => {
      setTimeout(() => {
        this._progressService.hide();
      }, 1000);
    };
    this._bluetoothService
      .stop()
      .then(stopProgress)
      .catch(err => {
        // this._loggingService.logException(err);
        stopProgress(err);
      });
  }

  onRestartBT(): void {
    this._loggingService.logBreadCrumb(
      SettingsComponent.LOG_TAG + `onRestartBT()`
    );

    this._progressService.show('Restarting Bluetooth service');
    const stopProgress = result => {
      setTimeout(() => {
        this._progressService.hide();
      }, 1000);
    };
    this._bluetoothService
      .advertise()
      .then(stopProgress)
      .catch(err => {
        // this._loggingService.logException(err);
        stopProgress(err);
      });
  }

  private getFileBytes(data) {
    let bytes = null;
    if (isIOS) {
      const arr = new ArrayBuffer(data.length);
      data.getBytes(arr);
      bytes = new Uint8Array(arr);
    } else if (isAndroid) {
      bytes = new Uint8Array(data);
    }
    return bytes;
  }

  private loadFile(fileName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const filePath = fs.path.join(
          fs.knownFolders.currentApp().path,
          fileName
        );
        const f = fs.File.fromPath(filePath);
        resolve(f);
      } catch (error) {
        // this._loggingService.logException(error);
        reject(error);
      }
    });
  }
}
