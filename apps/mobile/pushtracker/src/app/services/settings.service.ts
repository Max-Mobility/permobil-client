import { Injectable } from '@angular/core';
import { PushTracker } from '../models';

@Injectable()
export class SettingsService {
  settings = new PushTracker.Settings();
  pushSettings = new PushTracker.PushSettings();
}
