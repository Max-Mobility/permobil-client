import { Injectable } from '@angular/core';
import {
  DataStore as KinveyDataStore,
  DataStoreType,
  Query as KinveyQuery,
  User as KinveyUser
} from '@bradmartin/kinvey-nativescript-sdk';
import { Device } from '@permobil/core';
import * as LS from 'nativescript-localstorage';
import { STORAGE_KEYS } from '../enums';
import { LoggingService } from './logging.service';

@Injectable()
export class SettingsService {
  settings = new Device.Settings();
  pushSettings = new Device.PushSettings();
  switchControlSettings = new Device.SwitchControlSettings();

  private datastore = KinveyDataStore.collection(
    'SmartDriveSettings',
    DataStoreType.Sync
  );

  constructor(private _logService: LoggingService) {
    this.reset();
    // load any settings that have been saved
    this.loadFromFileSystem();
  }

  async reset() {
    // reset the settings to defaults
    this.settings = new Device.Settings();
    this.pushSettings = new Device.PushSettings();
    this.switchControlSettings = new Device.SwitchControlSettings();
    // now login and pull the latest
    this.login();
    await this.refresh();
  }

  async refresh() {
    const query = this.makeQuery();
    // we're only ever interested in the latest data from the server
    query.descending('_kmd.lmt');
    query.limit = 1;
    // query.equalTo('date', '2200-01-01');
    await this.datastore.sync(query);
  }

  clear() {
    this.datastore.clear();
  }

  private toData(): SettingsServiceNS.Data {
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

  async save() {
    await this.datastore.save(this.toData());
  }

  saveToFileSystem() {
    LS.setItemObject(STORAGE_KEYS.DEVICE_SETTINGS, this.settings.toObj());
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
    this.settings.copy(LS.getItem(STORAGE_KEYS.DEVICE_SETTINGS));
    this.pushSettings.copy(LS.getItem(STORAGE_KEYS.DEVICE_PUSH_SETTINGS));
    this.switchControlSettings.copy(
      LS.getItem(STORAGE_KEYS.DEVICE_SWITCH_CONTROL_SETTINGS)
    );
  }

  async loadSettings() {
    try {
      const query = this.makeQuery();
      // configure the query to search for only settings that were
      // saved by this user, and to get only the most recent settings
      query.descending('_kmd.lmt');
      query.limit = 1;

      const data = await this._query(query);
      if (data && data.length) {
        this.fromData(data[0]);
      } else {
        this.loadFromFileSystem();
      }
    } catch (err) {
      this._logService.logException(err);
    }
  }

  async _query(query: KinveyQuery): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.datastore.find(query).subscribe(
        (data: any[]) => {
          resolve(data);
        },
        err => {
          console.error('\n', 'error finding settings', err);
          reject(err);
        },
        () => {
          // this seems to be called right at the very end - after
          // we've gotten data, so this resolve will have been
          // superceded by the resolve(data) above
          resolve([]);
        }
      );
    });
  }

  private makeQuery() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      const query = new KinveyQuery();
      query.equalTo('_acl.creator', activeUser._id);
      return query;
    } else {
      throw new Error('no active user');
    }
  }

  private async login() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      // do nothing - we're good now
    } else {
      throw new Error('no active user');
    }
  }
}

namespace SettingsServiceNS {
  export interface Data {
    pushSettings?: any;
    settings?: any;
    switchControlSettings?: any;
  }
}
