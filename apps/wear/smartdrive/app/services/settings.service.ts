import { Injectable } from 'injection-js';
import { Device } from '@permobil/core';
import * as LS from 'nativescript-localstorage';
import * as appSettings from 'tns-core-modules/application-settings';
import { DataKeys } from '../enums';

@Injectable()
export class SettingsService {
  settings = new Device.Settings();
  switchControlSettings = new Device.SwitchControlSettings();
  disableWearCheck: boolean = false;
  hasSentSettings: boolean = false;

  constructor() {
    // TODO: try to load authorization from ContentProvider
  }

  loadSettings() {
    this.settings.copy(
      LS.getItem('com.permobil.smartdrive.wearos.smartdrive.settings')
    );
    this.switchControlSettings.copy(
      LS.getItem(
        'com.permobil.smartdrive.wearos.smartdrive.switch-control-settings'
      )
    );
    this.hasSentSettings =
      appSettings.getBoolean(DataKeys.SD_SETTINGS_DIRTY_FLAG) || false;
    this.disableWearCheck =
      appSettings.getBoolean(DataKeys.REQUIRE_WATCH_BEING_WORN) || false;
  }

  saveSettings() {
    // make sure to save the units setting for the complications
    appSettings.setString(
      DataKeys.SD_UNITS,
      this.settings.units.toLowerCase()
    );
    // save state and local settings
    appSettings.setBoolean(
      DataKeys.SD_SETTINGS_DIRTY_FLAG,
      this.hasSentSettings
    );
    appSettings.setBoolean(
      DataKeys.REQUIRE_WATCH_BEING_WORN,
      this.disableWearCheck
    );
    // now save the actual device settings objects
    LS.setItemObject(
      'com.permobil.smartdrive.wearos.smartdrive.settings',
      this.settings.toObj()
    );
    LS.setItemObject(
      'com.permobil.smartdrive.wearos.smartdrive.switch-control-settings',
      this.switchControlSettings.toObj()
    );
  }

}