import { Injectable } from '@angular/core';
import { PushTracker } from '@maxmobility/core';

@Injectable()
export class SettingsService {
  settings = new PushTracker.Settings();
  pushSettings = new PushTracker.PushSettings();
}
