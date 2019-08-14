import { Injectable } from '@angular/core';
import { Device } from '@permobil/core';
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

  constructor(private _logService: LoggingService) {}

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

  async loadSettings(): Promise<boolean> {
    try {
      await this.login();
      await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only settings that were
      // saved by this user, and to get only the most recent settings
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.ect');
      query.limit = 1;

      const stream = this.datastore.find(query);
      const data = await stream.toPromise();
      if (data && data.length) {
        this.fromData(data[0]);
        return true;
      }
      return false;
    } catch (err) {
      this._logService.logException(err);
      return false;
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
