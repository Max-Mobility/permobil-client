import { mod } from '@permobil/core';
import { Observable } from 'tns-core-modules/data/observable';

export class Profile extends Observable {
  public settings = new Profile.Settings();

  constructor() {
    super();
  }
}

export namespace Profile {
  export class Chair {
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
    static Translations: string[] = Chair.Options.map(o => 'settings.chairinfo.values.' + o);
    static Default: string = 'tilite';
  };

  export class Units {
    static Options: string[] = ['english', 'metric'];
    static Translations: string[] = Units.Options.map(o => 'settings.units.values.' + o);
    static Default: string = 'english';
  };

  export class Settings extends Observable {

    public static Defaults = {
      chair: Profile.Chair.Default,
      coastGoal: 10.0,     // seconds
      distanceGoal: 5.0,   // miles
      height: 1.778,       // meters
      weight: 80,          // kg
      units: Profile.Units.Default
    }

    chair: string = Profile.Settings.Defaults.chair;
    coastGoal: number = Profile.Settings.Defaults.coastGoal;
    distanceGoal: number = Profile.Settings.Defaults.distanceGoal;
    height: number = Profile.Settings.Defaults.height;
    weight: number = Profile.Settings.Defaults.weight;
    units: string = Profile.Settings.Defaults.units;

    constructor() {
      super();
    }

    getHeightDisplay(): string {
      let str = '';
      let feet = Math.floor(this.height * 3.28084);
      let inches = Math.round(((this.height * 3.28084) % feet) * 12);
      let centimeters = Math.round(this.height * 100.0);
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

    increase(key: string, increment: number = 0.5): void {
      let index = 0;
      switch (key) {
        case 'chair':
        case 'chairinfo':
          index = Profile.Chair.Options.indexOf(this.chair);
          index = mod(index + 1, Profile.Chair.Options.length);
          this.chair = Profile.Chair.Options[index];
          break;
        case 'coastgoal':
          this.coastGoal = Math.min(this.coastGoal + increment, 500);
          break;
        case 'distancegoal':
          this.distanceGoal = Math.min(this.distanceGoal + increment, 500);
          break;
        case 'height':
          this.height = Math.min(this.height + this.getHeightIncrement(), 2.5);
          break;
        case 'weight':
          this.weight = Math.min(this.weight + this.getWeightIncrement(), 400);
          break;
        case 'units':
          index = Profile.Units.Options.indexOf(this.units);
          index = mod(index + 1, Profile.Units.Options.length);
          this.units = Profile.Units.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 0.5): void {
      let index = 0;
      switch (key) {
        case 'chair':
        case 'chairinfo':
          index = Profile.Chair.Options.indexOf(this.chair);
          index = mod(index - 1, Profile.Chair.Options.length);
          this.chair = Profile.Chair.Options[index];
          break;
        case 'coastgoal':
          this.coastGoal = Math.max(this.coastGoal - increment, 0);
          break;
        case 'distancegoal':
          this.distanceGoal = Math.max(this.distanceGoal - increment, 0);
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
      }
    }

    toObj(): any {
      return Object.keys(Profile.Settings.Defaults)
        .reduce((obj, key) => {
          obj[key] = this[key];
          return obj;
        }, {});
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
      } else if (key in Profile.Settings.Defaults) {
        this[key] = Profile.Settings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a settings class exactly like this
      Object.keys(Profile.Settings.Defaults)
        .map(k => this.copyKey(k, s));
    }

    diff(s: any): boolean {
      return Object.keys(Profile.Settings.Defaults)
        .reduce((equal, key) => {
          return equal && this[key] === s[key];
        }, true);
    }
  }
}
