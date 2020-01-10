type TranslateFunction = (translationKey: string) => string;

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

  display(displayType: WatchSettings.Display, key: string, TRANSLATE: TranslateFunction): string {
    key = key.toLowerCase().replace(/\W/g, '');
    const timeSeconds = (this.powerAssistTimeoutMinutes).toFixed(0);
    let displayString = undefined;
    switch (displayType) {
      case WatchSettings.Display.Label:
        switch (key) {
          case 'wearcheck':
            displayString = TRANSLATE('settings.watch-required.title');
            break;
          case 'powerassisttimeout':
            displayString = TRANSLATE('settings.power-assist-timeout.title');
            break;
          default:
            break;
        }
        break;
      case WatchSettings.Display.Value:
        switch (key) {
          case 'wearcheck':
            if (this.disableWearCheck) {
              displayString = TRANSLATE('settings.watch-required.values.disabled');
            } else {
              displayString = TRANSLATE('settings.watch-required.values.enabled');
            }
            break;
          case 'powerassisttimeout':
            displayString = timeSeconds + ' ' +
              TRANSLATE('settings.power-assist-timeout.units-short');
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
    return displayString;
  }

  increase(key: string, increment: number = 1): void {
    key = key.toLowerCase().replace(/\W/g, '');
    switch (key) {
      case 'wearcheck':
        this.disableWearCheck = !this.disableWearCheck;
        break;
      case 'powerassisttimeout':
        this.powerAssistTimeoutMinutes =
          Math.min(this.powerAssistTimeoutMinutes + increment, 20);
        break;
      default:
        break;
    }
  }

  decrease(key: string, increment: number = 1): void {
    key = key.toLowerCase().replace(/\W/g, '');
    switch (key) {
      case 'wearcheck':
        this.disableWearCheck = !this.disableWearCheck;
        break;
      case 'powerassisttimeout':
        this.powerAssistTimeoutMinutes =
          Math.max(this.powerAssistTimeoutMinutes - increment, 1);
        break;
      default:
        break;
    }
  }
}

export namespace WatchSettings {
  export enum Display {
    Label, Value
  };
}
