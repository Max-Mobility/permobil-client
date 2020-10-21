import { Injectable } from '@angular/core';
import { Observable } from '@nativescript/core';

@Injectable({ providedIn: 'root' })
export class PushTrackerUserService extends Observable {
  static configuration_change_event = 'configuration_change_event';
  static theme_change_event = 'theme_change_event';
  static goal_change_event = 'goal_change_event';
  static units_change_event = 'units_change_event';

  constructor() {
    super();
  }

  emitEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }
}
