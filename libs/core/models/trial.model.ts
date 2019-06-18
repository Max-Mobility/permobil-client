import { Observable } from 'tns-core-modules/data/observable';

export class Trial extends Observable {
  constructor(obj?: any) {
    super();
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  // NON STATIC:
  _id = null;

  name = '';
  // questionnaire
  flat = false;
  ramp = false;
  inclines = false;
  rampIncline = false;
  other = false;
  other_description = '';
  // settings
  ez_on = false;
  control_mode = 'MX2+';
  max_speed = 0.7;
  acceleration = 0.3;
  tap_sensitivity = 1.0;
  // state
  startedWith = false;
  startedWithout = false;
  finishedWith = false;
  finishedWithout = false;
  unableToCompleteWith = false;
  unableToCompleteWithout = false;
  // metrics
  distance = 0;
  // with SD
  with_pushes = 0;
  with_coast = 0;
  with_start: Date;
  with_end: Date;
  with_elapsed = 0;
  // without SD
  without_pushes = 0;
  without_coast = 0;
  without_start: Date;
  without_end: Date;
  without_elapsed = 0;
  // STATIC:
  static timeToString(seconds: number): string {
    const t = new Date(null);
    t.setSeconds(seconds);
    return t.toISOString().substr(11, 8);
  }

  setSettings(s: any) {
    const getValue = (val, scale, _default) => {
      if (val !== undefined) {
        return val / scale;
      } else {
        return _default;
      }
    };
    this.ez_on = s.ezOn || false;
    this.control_mode = s.controlMode || 'MX2+';
    this.max_speed = getValue(s.maxSpeed, 100.0, 0.7);
    this.acceleration = getValue(s.acceleration, 100.0, 0.3);
    this.tap_sensitivity = getValue(s.tap_sensitivity, 100.0, 1.0);
  }

  fromObject(obj: any) {
    Object.assign(this, obj);
  }

  data(): any {
    const obj = {};
    Object.keys(this).map(k => {
      if (
        typeof this[k] === 'number' ||
        typeof this[k] === 'string' ||
        typeof this[k] === 'boolean'
      ) {
        obj[k] = this[k];
      }
    });
    return obj;
  }
}
