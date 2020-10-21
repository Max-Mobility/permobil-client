import { Observable } from '@nativescript/core';
import { bindingTypeToString } from '../packet';
import { mod } from '../utils';

type TranslateFunction = (translationKey: string) => string;

export namespace Device {
  // for rendering the different parts of each of the settings in
  // different ways
  export enum Display {
    Label,
    Value
  }

  // Standard Device Settings:
  export class Settings extends Observable {
    // settings classes
    static ControlMode = class {
      static Options: string[] = ['MX1', 'MX2', 'MX2+'];

      static Off = 'Off';

      static Beginner = 'MX1';
      static Intermediate = 'MX2';
      static Advanced = 'MX2+';

      static MX1 = 'MX1';
      static MX2 = 'MX2';
      static MX2plus = 'MX2+';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('SmartDriveControlMode', s.ControlMode);
        return Device.Settings.ControlMode[o];
      }
    };

    static Units = class {
      static Options: string[] = ['English', 'Metric'];
      static Translations: string[] = [
        'smartdrive.settings.units.english',
        'smartdrive.settings.units.metric'
      ];

      static English = 'English';
      static Metric = 'Metric';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('Units', s.Units);
        return Device.Settings.Units[o];
      }
    };

    public static Defaults = {
      controlMode: Settings.ControlMode.MX2plus,
      ezOn: false,
      disablePowerAssistBeep: false,
      units: Settings.Units.English,
      acceleration: 30,
      maxSpeed: 70,
      tapSensitivity: 70
    };

    // public members
    controlMode: string = Device.Settings.Defaults.controlMode;
    ezOn = Device.Settings.Defaults.ezOn;
    disablePowerAssistBeep = Device.Settings.Defaults.disablePowerAssistBeep;
    units: string = Device.Settings.Defaults.units;
    acceleration = Device.Settings.Defaults.acceleration;
    maxSpeed = Device.Settings.Defaults.maxSpeed;
    tapSensitivity = Device.Settings.Defaults.tapSensitivity;

    constructor() {
      super();
    }

    static getBoolSetting(flags: number, settingBit: number): boolean {
      return ((flags >> settingBit) & 0x01) > 0;
    }

    getFlags() {
      const flags = [this.ezOn, this.disablePowerAssistBeep].reduce(
        (f, s, i) => {
          if (s) {
            f |= 1 << i;
          }
          return f;
        },
        0
      );
      return flags;
    }

    getDisplayString(
      displayType: Device.Display,
      key: string,
      TRANSLATE: TranslateFunction
    ): string {
      key = key.toLowerCase().replace(/\W/g, '');
      let translationKey = '';
      let displayString = undefined;
      switch (displayType) {
        case Device.Display.Label:
          switch (key) {
            case 'maxspeed':
              displayString = TRANSLATE('settings.max-speed');
              break;
            case 'acceleration':
              displayString = TRANSLATE('settings.acceleration');
              break;
            case 'tapsensitivity':
              displayString = TRANSLATE('settings.tap-sensitivity');
              break;
            case 'powerassistbuzzer':
              displayString = TRANSLATE('settings.power-assist-buzzer');
              break;
            case 'controlmode':
              displayString = TRANSLATE('settings.control-mode');
              break;
            case 'units':
              displayString = TRANSLATE('settings.units');
              break;
          }
          break;
        case Device.Display.Value:
          switch (key) {
            case 'maxspeed':
              displayString = `${this.maxSpeed} %`;
              break;
            case 'acceleration':
              displayString = `${this.acceleration} %`;
              break;
            case 'tapsensitivity':
              displayString = `${this.tapSensitivity} %`;
              break;
            case 'powerassistbuzzer':
              if (this.disablePowerAssistBeep) {
                displayString = TRANSLATE(
                  'sd.settings.power-assist-buzzer.disabled'
                );
              } else {
                displayString = TRANSLATE(
                  'sd.settings.power-assist-buzzer.enabled'
                );
              }
              break;
            case 'controlmode':
              displayString = `${this.controlMode}`;
              break;
            case 'units':
              translationKey = 'sd.settings.units.' + this.units.toLowerCase();
              displayString = TRANSLATE(translationKey);
              break;
          }
          break;
        default:
          break;
      }
      return displayString;
    }

    increase(key: string, increment: number = 10): void {
      key = key.toLowerCase().replace(/\W/g, '');
      let index = 0;
      switch (key) {
        case 'maxspeed':
          this.maxSpeed = Math.min(this.maxSpeed + increment, 100);
          break;
        case 'acceleration':
          this.acceleration = Math.min(this.acceleration + increment, 100);
          break;
        case 'tapsensitivity':
          this.tapSensitivity = Math.min(this.tapSensitivity + increment, 100);
          break;
        case 'powerassistbuzzer':
          this.disablePowerAssistBeep = !this.disablePowerAssistBeep;
          break;
        case 'controlmode':
          index = Device.Settings.ControlMode.Options.indexOf(this.controlMode);
          index = mod(index + 1, Device.Settings.ControlMode.Options.length);
          this.controlMode = Device.Settings.ControlMode.Options[index];
          break;
        case 'units':
          index = Device.Settings.Units.Options.indexOf(this.units);
          index = mod(index + 1, Device.Settings.Units.Options.length);
          this.units = Device.Settings.Units.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 10): void {
      key = key.toLowerCase().replace(/\W/g, '');
      let index = 0;
      switch (key) {
        case 'maxspeed':
          this.maxSpeed = Math.max(this.maxSpeed - increment, 10);
          break;
        case 'acceleration':
          this.acceleration = Math.max(this.acceleration - increment, 10);
          break;
        case 'tapsensitivity':
          this.tapSensitivity = Math.max(this.tapSensitivity - increment, 10);
          break;
        case 'powerassistbuzzer':
          this.disablePowerAssistBeep = !this.disablePowerAssistBeep;
          break;
        case 'controlmode':
          index = Device.Settings.ControlMode.Options.indexOf(this.controlMode);
          index = mod(index - 1, Device.Settings.ControlMode.Options.length);
          this.controlMode = Device.Settings.ControlMode.Options[index];
          break;
        case 'units':
          index = Device.Settings.Units.Options.indexOf(this.units);
          index = mod(index - 1, Device.Settings.Units.Options.length);
          this.units = Device.Settings.Units.Options[index];
          break;
      }
    }

    toObj(): any {
      return Object.keys(Device.Settings.Defaults).reduce((obj, key) => {
        obj[key] = this[key];
        return obj;
      }, {});
    }

    fromSettings(s: any): void {
      // from c++ settings bound array to c++ class
      this.controlMode = Device.Settings.ControlMode.fromSettings(s);
      this.units = Device.Settings.Units.fromSettings(s);
      this.ezOn = Device.Settings.getBoolSetting(s.Flags, 0);
      this.disablePowerAssistBeep = Device.Settings.getBoolSetting(s.Flags, 1);
      // these floats are [0,1] on pushtracker
      this.acceleration = Math.round(s.Acceleration * 100.0);
      this.maxSpeed = Math.round(s.MaxSpeed * 100.0);
      this.tapSensitivity = Math.round(s.TapSensitivity * 100.0);
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
        this[key] = other[key];
      } else if (key in Device.Settings.Defaults) {
        this[key] = Device.Settings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a settings class exactly like this
      Object.keys(Device.Settings.Defaults).forEach(k => this.copyKey(k, s));
    }

    equals(s: any): boolean {
      return Object.keys(Device.Settings.Defaults).reduce((equal, key) => {
        return equal && this[key] === s[key];
      }, true);
    }
  }

  // Device Push Settings:
  export class PushSettings extends Observable {
    // This class is for controling push sensitivity on the original
    // PushTracker wristband.

    public static Defaults = {
      threshold: 3,
      timeWindow: 15,
      clearCounter: false
    };

    // public members
    threshold = Device.PushSettings.Defaults.threshold;
    timeWindow = Device.PushSettings.Defaults.timeWindow;
    clearCounter = Device.PushSettings.Defaults.clearCounter;

    constructor() {
      super();
    }

    toObj(): any {
      return Object.keys(Device.PushSettings.Defaults).reduce((obj, key) => {
        obj[key] = this[key];
        return obj;
      }, {});
    }

    fromSettings(ps: any): void {
      // from c++ push settings bound array to c++ class
      this.threshold = ps.threshold;
      this.timeWindow = ps.timeWindow;
      this.clearCounter = ps.clearCounter > 0;
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
        this[key] = other[key];
      } else if (key in Device.PushSettings.Defaults) {
        this[key] = Device.PushSettings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a push-settings class exactly like this
      Object.keys(Device.PushSettings.Defaults).forEach(k =>
        this.copyKey(k, s)
      );
    }

    equals(ps: any): boolean {
      return Object.keys(Device.PushSettings.Defaults).reduce((equal, key) => {
        return equal && this[key] === ps[key];
      }, true);
    }
  }

  // Device Switch Control Settings:
  export class SwitchControlSettings extends Observable {
    // settings classes
    static Mode = class {
      static Options: string[] = ['Momentary', 'Latching'];

      static Momentary = 'Momentary';
      static Latching = 'Latching';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('SwitchControlMode', s.Mode);
        return Device.SwitchControlSettings.Mode[o];
      }
    };

    public static Defaults = {
      mode: SwitchControlSettings.Mode.Momentary,
      maxSpeed: 30
    };

    // public members
    mode: string = Device.SwitchControlSettings.Defaults.mode;
    maxSpeed = Device.SwitchControlSettings.Defaults.maxSpeed;

    constructor() {
      super();
    }

    getDisplayString(
      displayType: Device.Display,
      key: string,
      TRANSLATE: TranslateFunction
    ): string {
      key = key.toLowerCase().replace(/\W/g, '');
      let translationKey = '';
      let displayString = undefined;
      switch (displayType) {
        case Device.Display.Label:
          switch (key) {
            case 'switchcontrolspeed':
              displayString = TRANSLATE('switch-control.max-speed');
              break;
            case 'switchcontrolmode':
              displayString = TRANSLATE('switch-control.mode');
              break;
          }
          break;
        case Device.Display.Value:
          switch (key) {
            case 'switchcontrolspeed':
              displayString = `${this.maxSpeed} %`;
              break;
            case 'switchcontrolmode':
              translationKey =
                'sd.switch-settings.mode.' + this.mode.toLowerCase();
              displayString = TRANSLATE(translationKey);
              break;
          }
          break;
        default:
          break;
      }
      return displayString;
    }

    increase(key: string, increment: number = 10): void {
      key = key.toLowerCase().replace(/\W/g, '');
      let index;
      switch (key) {
        case 'switchcontrolspeed':
          this.maxSpeed = Math.min(this.maxSpeed + increment, 100);
          break;
        case 'switchcontrolmode':
          index = Device.SwitchControlSettings.Mode.Options.indexOf(this.mode);
          index = mod(
            index + 1,
            Device.SwitchControlSettings.Mode.Options.length
          );
          this.mode = Device.SwitchControlSettings.Mode.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 10): void {
      key = key.toLowerCase().replace(/\W/g, '');
      let index;
      switch (key) {
        case 'switchcontrolspeed':
          this.maxSpeed = Math.max(this.maxSpeed - increment, 10);
          break;
        case 'switchcontrolmode':
          index = Device.SwitchControlSettings.Mode.Options.indexOf(this.mode);
          index = mod(
            index - 1,
            Device.SwitchControlSettings.Mode.Options.length
          );
          this.mode = Device.SwitchControlSettings.Mode.Options[index];
          break;
      }
    }

    toObj(): any {
      return Object.keys(Device.SwitchControlSettings.Defaults).reduce(
        (obj, key) => {
          obj[key] = this[key];
          return obj;
        },
        {}
      );
    }

    fromSettings(s: any): void {
      // from c++ settings bound array to c++ class
      this.mode = Device.SwitchControlSettings.Mode.fromSettings(s);
      // these floats are [0,1] on smartdrive
      this.maxSpeed = Math.round(s.MaxSpeed * 100.0);
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
        this[key] = other[key];
      } else if (key in Device.SwitchControlSettings.Defaults) {
        this[key] = Device.SwitchControlSettings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a SwitchControlSettings class exactly like this
      Object.keys(Device.SwitchControlSettings.Defaults).forEach(k =>
        this.copyKey(k, s)
      );
    }

    equals(s: any): boolean {
      return Object.keys(Device.SwitchControlSettings.Defaults).reduce(
        (equal, key) => {
          return equal && this[key] === s[key];
        },
        true
      );
    }
  }
}
