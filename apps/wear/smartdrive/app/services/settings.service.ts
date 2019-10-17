import { Injectable } from 'injection-js';
import { Device } from '@permobil/core';

@Injectable()
export class SettingsService {
  settings = new Device.Settings();
  switchControlSettings = new Device.SwitchControlSettings();

  constructor() {
    // TODO: try to load authorization from ContentProvider
  }
}
