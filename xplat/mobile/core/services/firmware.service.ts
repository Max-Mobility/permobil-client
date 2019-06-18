import { Injectable } from '@angular/core';
import { User } from '@maxmobility/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import * as LS from 'nativescript-localstorage';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { knownFolders, path } from 'tns-core-modules/file-system';
import * as httpModule from 'tns-core-modules/http';
import { isIOS, isAndroid } from 'tns-core-modules/platform';
import { LoggingService } from './logging.service';

@Injectable()
export class FirmwareService {
  // static members
  static firmwarePathPrefix = '/assets/ota/';
  private static fsKeyPrefix = 'FirmwareService.';
  private static fsKeyMetadata = 'Metadata';

  //  members
  haveFirmwares = false;
  last_check: Date;
  description = new ObservableArray<string>();
  firmwares: OtaFirmwares = {
    MCU: {
      filename: 'SmartDriveMCU.ota',
      id: null,
      length: 0,
      data: null,
      version: null
    },
    BLE: {
      filename: 'SmartDriveBLE.ota',
      id: null,
      length: 0,
      data: null,
      version: null
    },
    PT: {
      filename: 'PushTracker.ota',
      id: null,
      length: 0,
      data: null,
      version: null
    }
  };

  constructor(private _logService: LoggingService) {}

  static versionByteToString(version: number): string {
    if (version === 0xff || version === 0x00) {
      return 'unknown';
    } else {
      return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
    }
  }

  async initFirmwareService() {
    try {
      await this.loadFromFS();
      await this.downloadFirmwares();
    } catch (error) {
      //this._logService.logException(`${error}`);
    }
  }

  async loadFromFS() {
    await this.loadMetadata();
    const tasks = await Object.keys(this.firmwares).map(k => {
      return this.loadFirmwareFile(this.firmwares[k].filename);
    });

    const result = await Promise.all(tasks);
  }

  get currentVersion(): string {
    const maxVersion = Math.max(
      this.firmwares.PT.version,
      this.firmwares.BLE.version,
      this.firmwares.MCU.version
    );
    return FirmwareService.versionByteToString(maxVersion);
  }

  private versionStringToByte(version: string): number {
    const [major, minor] = version.split('.');
    return (parseInt(major) << 4) | parseInt(minor);
  }

  // FOR STORING METADATA TO FILE SYSTEM
  private saveMetadata() {
    return new Promise((resolve, reject) => {
      try {
        const md = {
          last_check: this.last_check
        };
        Object.keys(this.firmwares).map(k => {
          md[k] = {
            id: this.firmwares[k].id,
            length: this.firmwares[k].length,
            version: this.firmwares[k].version
          };
        });
        LS.setItem(
          FirmwareService.fsKeyPrefix + FirmwareService.fsKeyMetadata,
          md
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private loadMetadata() {
    try {
      const md = LS.getItem(
        FirmwareService.fsKeyPrefix + FirmwareService.fsKeyMetadata
      );
      if (md) {
        // now update our firmwares data
        this.last_check = md.last_check ? new Date(md.last_check) : null;
        Object.keys(this.firmwares).map(k => {
          this.firmwares[k].id = (md[k] && md[k].id) || null;
          this.firmwares[k].length = (md[k] && md[k].length) || 0;
          this.firmwares[k].version = (md[k] && md[k].version) || null;
        });
        return Promise.resolve();
      } else {
        return Promise.resolve();
      }
    } catch (err) {
      return Promise.reject(`Couldn't load metadata file: ${err}`);
    }
  }

  private deleteMetadata() {
    try {
      LS.removeItem(
        FirmwareService.fsKeyPrefix + FirmwareService.fsKeyMetadata
      );
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }
  // END FOR STORING METADATA TO FILE SYSTEM

  // FOR LOADING A FW FILE FROM FS
  private loadFirmwareFile(fileName: string) {
    return new Promise((resolve, reject) => {
      try {
        const fwData = LS.getItem(fileName);
        if (fwData) {
          resolve(fwData);
        } else {
          reject(`Couldn't find fw data for ${fileName}`);
        }
      } catch (err) {
        reject(`Couldn't load firmware file ${fileName}: ${err}`);
      }
    });
  }
  // END FOR LOADING A FW FILE FROM FS

  // FOR LOADING A FW FILE FROM SERVER
  getData(url, filename) {
    let filePath;
    // on Android this is working, iOS needs to use `documents` for permission to write during a release build. currentApp is readonly for iOS.
    if (isAndroid) {
      filePath = path.join(
        knownFolders.currentApp().path,
        FirmwareService.firmwarePathPrefix + filename
      );
    } else if (isIOS) {
      filePath = path.join(
        knownFolders.documents().path,
        FirmwareService.firmwarePathPrefix + filename
      );
    }
    return httpModule.getFile(url, filePath);
  }

  onError(error: Response | any) {
    const body = error.json() || '';
    const err = body.error || JSON.stringify(body);
  }

  private unpackFirmwareData(fwKey, data) {
    const length = this.firmwares[fwKey].length;
    let bytes = null;
    if (isIOS) {
      const tmp = new ArrayBuffer(length);
      data.getBytes(tmp);
      bytes = new Uint8Array(tmp);
    } else {
      bytes = new Uint8Array(data);
    }

    // actually save the firmware
    this.firmwares[fwKey].data = bytes;

    // check to make sure they're valid
    const validLength = this.firmwares[fwKey].length;
    const actualLength = this.firmwares[fwKey].data.length;
    if (actualLength !== validLength) {
      const msg = `${fwKey} data length (${actualLength}) not the expected (${validLength})!`;
      return Promise.reject(msg);
    } else {
      return Promise.resolve();
    }
  }

  private updateFirmware(fwKey, file) {
    this.firmwares[fwKey].version = this.versionStringToByte(
      '' + file._version
    );
    this.firmwares[fwKey].id = file._id;
    this.firmwares[fwKey].length = file.size;
  }

  async downloadFirmwares() {
    return new Promise(async (resolve, reject) => {
      try {
        this.haveFirmwares = false;
        // determine whether or not to download the beta firmware files
        const currentUser = Kinvey.User.getActiveUser();
        const downloadBetaFirmware = (currentUser.data as User)
          .beta_firmware_tester;

        const tasks = Object.keys(this.firmwares).map(async fwKey => {
          const query = new Kinvey.Query();
          let fileName = this.firmwares[fwKey].filename;
          if (downloadBetaFirmware) {
            fileName += '.beta';
          }
          query.equalTo('_filename', fileName);
          const files = await Kinvey.Files.find(query);

          if (files.length > 1) {
            throw new Error(`Found more than one OTA for ${fwKey}!`);
          }

          if (files.length === 1) {
            const file = files[0];
            this.updateFirmware(fwKey, file);
            // download the firmware data and save it to temporary storage
            const fileData = await this.getData(
              file._downloadURL,
              file._filename
            );

            // marshal the firmware data
            try {
              await this.unpackFirmwareData(fwKey, fileData.readSync());
            } catch (err) {
              throw new Error(`Couldn't unpack OTA for ${fwKey}!`);
            }

            // save the firmware data to persistent storage
            try {
              LS.setItem(
                this.firmwares[fwKey].filename,
                this.firmwares[fwKey].data
              );
            } catch (err) {
              // console.log(`Couldn't save firmware data: ${err}`);
            }
          } else {
            throw new Error(`Couldn't find OTA for ${fwKey}!`);
          }
        });

        Promise.all(tasks)
          .then(() => {
            this.haveFirmwares = true;
            this.last_check = new Date();
            this.saveMetadata();
            resolve();
          })
          .catch(err => {
            this.haveFirmwares = false;
            reject(err);
          });
      } catch (error) {
        //this._logService.logException(`${error}`);
        reject(error);
      }
    });
  }

  // END FOR LOADING A FW FILE FROM SERVER
}

export interface OtaFirmwares {
  MCU: FirmwareFile;
  BLE: FirmwareFile;
  PT: FirmwareFile;
}

export interface FirmwareFile {
  filename: string;
  id: any;
  length: number;
  data: any;
  version: number;
}
