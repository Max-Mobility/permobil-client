import { Injectable } from '@angular/core';
import { Device } from '@permobil/core';
import * as LS from 'nativescript-localstorage';
import { STORAGE_KEYS } from '../enums';
import {
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';

@Injectable()
export class SettingsService {
  settings = new Device.Settings();
  pushSettings = new Device.PushSettings();
  switchControlSettings = new Device.SwitchControlSettings();

  private datastore = KinveyDataStore.collection('SmartDriveSettings');

  constructor(private _logService: LoggingService) { }

  private toData(): SettingsService.Data {
    return {
      settings: this.settings.toObj(),
      pushSettings: this.pushSettings.toObj(),
      switchControlSettings: this.switchControlSettings.toObj()
    };
  }

  private fromData(data: any) {
    this.settings.copy(data.settings);
    this.pushSettings.copy(data.pushSettings);
    this.switchControlSettings.copy(data.switchControlSettings);
  }

  save() {
    return new Promise(async (resolve, reject) => {
      try {
        await this.datastore.save(this.toData());
        await this.datastore.push();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  saveToFileSystem() {
    LS.setItemObject(
      STORAGE_KEYS.DEVICE_SETTINGS,
      this.settings.toObj()
    );
    LS.setItemObject(
      STORAGE_KEYS.DEVICE_PUSH_SETTINGS,
      this.pushSettings.toObj()
    );
    LS.setItemObject(
      STORAGE_KEYS.DEVICE_SWITCH_CONTROL_SETTINGS,
      this.switchControlSettings.toObj()
    );
  }

  loadFromFileSystem() {
    this.settings.copy(
      LS.getItem(STORAGE_KEYS.DEVICE_SETTINGS)
    );
    this.pushSettings.copy(
      LS.getItem(STORAGE_KEYS.DEVICE_PUSH_SETTINGS)
    );
    this.switchControlSettings.copy(
      LS.getItem(STORAGE_KEYS.DEVICE_SWITCH_CONTROL_SETTINGS)
    );
  }

  async loadSettings() {
    try {
      await this.login();
      await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only settings that were
      // saved by this user, and to get only the most recent settings
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.lmt');
      query.limit = 1;

      const stream = this.datastore.find(query);
      const data = await stream.toPromise();
      if (data && data.length) {
        this.fromData(data[0]);
      } else {
        this.loadFromFileSystem();
      }
    } catch (err) {
      this._logService.logException(err);
    }
  }

  private login(): Promise<any> {
    if (!!KinveyUser.getActiveUser()) {
      return Promise.resolve();
    } else {
      return Promise.reject('no active user');
    }
  }
}

namespace SettingsService {
  export interface Data {
    pushSettings?: any;
    settings?: any;
    switchControlSettings?: any;
  }
}
