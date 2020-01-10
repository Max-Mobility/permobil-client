import { L } from '@permobil/nativescript';

// These settings are specific to the watch - they are not sent to the
// server or the SmartDrive
export class WatchSettings {
  public static Defaults = {
    disableWearCheck: false,
    powerAssistTimeoutMinutes: 5
  };

  // public members:
  disableWearCheck: boolean = WatchSettings.Defaults.disableWearCheck;
  powerAssistTimeoutMinutes: number = WatchSettings.Defaults.powerAssistTimeoutMinutes;

  constructor() {
  }

  toObj(): any {
    return Object.keys(WatchSettings.Defaults).reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});
  }

  copyKey(key: string, other: any) {
    if (other && key in other) {
      this[key] = other[key];
    } else if (key in WatchSettings.Defaults) {
      this[key] = WatchSettings.Defaults[key];
    }
  }

  copy(s: any) {
    // from a settings class exactly like this
    Object.keys(WatchSettings.Defaults).forEach(k => this.copyKey(k, s));
  }

  equals(s: any): boolean {
    return Object.keys(WatchSettings.Defaults).reduce((equal, key) => {
      return equal && this[key] === s[key];
    }, true);
  }

  displayLabel(key: string): string {
    let displayString = undefined;
    switch (key) {
      case 'wear-check':
      case 'disable-wear-check':
      case 'wearcheck':
      case 'disablewearcheck':
        displayString = L('settings.watch-required.title');
        break;
      case 'power-assist-timeout-time':
      case 'power-assist-timeout':
      case 'powerassisttimeouttime':
      case 'powerassisttimeout':
        displayString = L('settings.power-assist-timeout.title');
        break;
      default:
        break;
    }
    return displayString;
  }

  displayValue(key: string): string {
    const timeSeconds = (this.powerAssistTimeoutMinutes).toFixed(0);
    let displayString = undefined;
    switch (key) {
      case 'wear-check':
      case 'disable-wear-check':
      case 'wearcheck':
      case 'disablewearcheck':
        if (this.disableWearCheck) {
          displayString = L('settings.watch-required.values.disabled');
        } else {
          displayString = L('settings.watch-required.values.enabled');
        }
        break;
      case 'power-assist-timeout-time':
      case 'power-assist-timeout':
      case 'powerassisttimeouttime':
      case 'powerassisttimeout':
        displayString = timeSeconds + ' ' +
          L('settings.power-assist-timeout.units-short');
        break;
      default:
        break;
    }
    return displayString;
  }

  increase(key: string, increment: number = 1): void {
    switch (key) {
      case 'wear-check':
      case 'disable-wear-check':
      case 'wearcheck':
      case 'disablewearcheck':
        this.disableWearCheck = !this.disableWearCheck;
        break;
      case 'power-assist-timeout-time':
      case 'power-assist-timeout':
      case 'powerassisttimeouttime':
      case 'powerassisttimeout':
        this.powerAssistTimeoutMinutes =
          Math.min(this.powerAssistTimeoutMinutes + increment, 20);
        break;
      default:
        break;
    }
  }

  decrease(key: string, increment: number = 1): void {
    switch (key) {
      case 'wear-check':
      case 'disable-wear-check':
      case 'wearcheck':
      case 'disablewearcheck':
        this.disableWearCheck = !this.disableWearCheck;
        break;
      case 'power-assist-timeout-time':
      case 'power-assist-timeout':
      case 'powerassisttimeouttime':
      case 'powerassisttimeout':
        this.powerAssistTimeoutMinutes =
          Math.max(this.powerAssistTimeoutMinutes - increment, 1);
        break;
      default:
        break;
    }
  }
}
