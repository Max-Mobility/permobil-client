import { Device, Observable } from '@nativescript/core';
import { mod } from '@permobil/core';

export class Profile extends Observable {
  public settings = new Profile.Settings();

  constructor() {
    super();
  }
}

export namespace Profile {
  export class ChairMake {
    static Options: string[] = [
      'colours',
      'invacare',
      'karman',
      'ki',
      'motion-composites',
      'panthera',
      'quickie',
      'tilite',
      'top-end',
      'other'
    ];
    static Translations: string[] = ChairMake.Options.map(
      o => 'settings.chairmake.values.' + o
    );
    static Default: string = 'tilite';
  }

  export class ChairType {
    static Options: string[] = ['rigid', 'folding', 'pediatric', 'other'];
    static Translations: string[] = ChairType.Options.map(
      o => 'settings.chairtype.values.' + o
    );
    static Default: string = 'rigid';
  }

  export class Units {
    static Options: string[] = ['english', 'metric'];
    static Translations: string[] = Units.Options.map(
      o => 'settings.units.values.' + o
    );
    static Default: string = 'english';
  }

  export class Settings extends Observable {
    static Languages = class {
      static Options: string[] = [
        'da',
        'de',
        'en',
        'es',
        'fr',
        'it',
        'ja',
        'ko',
        'nb',
        'nl',
        'sv',
        'zh'
      ];
    };

    public static Defaults = {
      chairMake: Profile.ChairMake.Default,
      chairType: Profile.ChairType.Default,
      coastGoal: 10.0, // seconds
      distanceGoal: 5.0, // miles
      height: 1.778, // meters
      weight: 80, // kg
      units: Profile.Units.Default,
      language: Device.language
    };

    chairMake: string = Profile.Settings.Defaults.chairMake;
    chairType: string = Profile.Settings.Defaults.chairType;
    coastGoal: number = Profile.Settings.Defaults.coastGoal;
    distanceGoal: number = Profile.Settings.Defaults.distanceGoal;
    height: number = Profile.Settings.Defaults.height;
    weight: number = Profile.Settings.Defaults.weight;
    units: string = Profile.Settings.Defaults.units;
    language: string = Profile.Settings.Defaults.language;

    constructor() {
      super();
    }

    getHeightDisplay(): string {
      let str = '';
      const feet = Math.floor(this.height * 3.28084);
      const inches = Math.round(((this.height * 3.28084) % feet) * 12);
      const centimeters = Math.round(this.height * 100.0);
      switch (this.units) {
        case 'english':
          str = `${feet}\' ${inches}\"`;
          break;
        case 'metric':
        default:
          str = `${centimeters} cm`;
          break;
      }
      return str;
    }

    getHeightIncrement(): number {
      let increment = 0;
      switch (this.units) {
        case 'english':
          increment = 0.0254; // 1 in in meters
          break;
        case 'metric':
        default:
          increment = 0.01; // 1 cm
          break;
      }
      return increment;
    }

    getDistanceIncrement(): number {
      let increment = 0;
      switch (this.units) {
        case 'english':
          increment = 0.1; // 0.1 miles in miles
          break;
        case 'metric':
        default:
          increment = 0.06215; // 0.1 kilometers in miles
          break;
      }
      return increment;
    }

    getWeightIncrement(): number {
      let increment = 0;
      switch (this.units) {
        case 'english':
          increment = 0.453592; // 1 lb in in kg
          break;
        case 'metric':
        default:
          increment = 0.5; // 0.5 kg
          break;
      }
      return increment;
    }

    increase(key: string, increment: number = 0.1): void {
      let index = 0;
      switch (key) {
        case 'chairmake':
          index = Profile.ChairMake.Options.indexOf(this.chairMake);
          index = mod(index + 1, Profile.ChairMake.Options.length);
          this.chairMake = Profile.ChairMake.Options[index];
          break;
        case 'chairtype':
          index = Profile.ChairType.Options.indexOf(this.chairType);
          index = mod(index + 1, Profile.ChairType.Options.length);
          this.chairType = Profile.ChairType.Options[index];
          break;
        case 'coastgoal':
          this.coastGoal = Math.min(this.coastGoal + increment, 500);
          break;
        case 'distancegoal':
          this.distanceGoal = Math.min(
            this.distanceGoal + this.getDistanceIncrement(),
            500
          );
          break;
        case 'height':
          this.height = Math.min(this.height + this.getHeightIncrement(), 3.0);
          break;
        case 'weight':
          this.weight = Math.min(this.weight + this.getWeightIncrement(), 400);
          break;
        case 'units':
          index = Profile.Units.Options.indexOf(this.units);
          index = mod(index + 1, Profile.Units.Options.length);
          this.units = Profile.Units.Options[index];
          break;
        case 'language':
          index = Profile.Settings.Languages.Options.indexOf(this.language);
          index = mod(index + 1, Profile.Settings.Languages.Options.length);
          this.language = Profile.Settings.Languages.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 0.1): void {
      let index = 0;
      switch (key) {
        case 'chairmake':
          index = Profile.ChairMake.Options.indexOf(this.chairMake);
          index = mod(index - 1, Profile.ChairMake.Options.length);
          this.chairMake = Profile.ChairMake.Options[index];
          break;
        case 'chairtype':
          index = Profile.ChairType.Options.indexOf(this.chairType);
          index = mod(index - 1, Profile.ChairType.Options.length);
          this.chairType = Profile.ChairType.Options[index];
          break;
        case 'coastgoal':
          this.coastGoal = Math.max(this.coastGoal - increment, 0);
          break;
        case 'distancegoal':
          this.distanceGoal = Math.max(
            this.distanceGoal - this.getDistanceIncrement(),
            0
          );
          break;
        case 'height':
          this.height = Math.max(this.height - this.getHeightIncrement(), 0);
          break;
        case 'weight':
          this.weight = Math.max(this.weight - this.getWeightIncrement(), 0);
          break;
        case 'units':
          index = Profile.Units.Options.indexOf(this.units);
          index = mod(index - 1, Profile.Units.Options.length);
          this.units = Profile.Units.Options[index];
          break;
        case 'language':
          index = Profile.Settings.Languages.Options.indexOf(this.language);
          index = mod(index - 1, Profile.Settings.Languages.Options.length);
          this.language = Profile.Settings.Languages.Options[index];
          break;
      }
    }

    fromUser(obj: any) {
      if (obj && obj.height) this.height = obj.height / 100.0;
      if (obj && obj.weight) this.weight = obj.weight;
      if (obj && obj.activity_goal_distance)
        this.distanceGoal = obj.activity_goal_distance / 1.609;
      if (obj && obj.activity_goal_coast_time)
        this.coastGoal = obj.activity_goal_coast_time;
    }

    toUser(): any {
      return {
        height: this.height * 100.0, // cm
        weight: this.weight,
        activity_goal_distance: this.distanceGoal * 1.609, // km
        activity_goal_coast_time: this.coastGoal
      };
    }

    toObj(): any {
      return Object.keys(Profile.Settings.Defaults).reduce((obj, key) => {
        obj[key] = this[key];
        return obj;
      }, {});
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
        this[key] = other[key];
      } else if (key in Profile.Settings.Defaults) {
        this[key] = Profile.Settings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a settings class exactly like this
      Object.keys(Profile.Settings.Defaults).forEach(k => this.copyKey(k, s));
    }

    diff(s: any): boolean {
      return Object.keys(Profile.Settings.Defaults).reduce((equal, key) => {
        return equal && this[key] === s[key];
      }, true);
    }
  }
}
