import { Observable } from 'tns-core-modules/data/observable';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { Trial } from './trial.model';

export enum EvaluationStatus {
  'Incomplete',
  'Complete'
}

export class Evaluation extends Observable {
  // public members
  _id = null;
  creator_id = null;
  status = EvaluationStatus.Incomplete;
  pushing_pain = 0;
  pushing_fatigue = 0;
  impact_on_independence = 0;
  flat_difficulty = 0.0;
  ramp_difficulty = 0.0;
  incline_difficulty = 0.0;
  other_difficulty = 0.0;
  ramp_incline_difficulty = 0.0;
  unableToCompleteFlat = false;
  unableToCompleteRampIncline = false;
  unableToCompleteOther = false;
  years = '';
  chair = '';
  chairType = '';
  trials: ObservableArray<Trial> = new ObservableArray();

  // private members

  // functions

  constructor(obj?: any) {
    super();
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  fromObject(obj: any) {
    Object.assign(this, obj);
  }

  data(): any {
    const obj = {
      trials: []
    };
    Object.keys(this).map(k => {
      if (
        typeof this[k] === 'number' ||
        typeof this[k] === 'string' ||
        typeof this[k] === 'boolean'
      ) {
        obj[k] = this[k];
      }
    });
    this.trials.map(t => {
      obj.trials.push(t.data());
    });
    return obj;
  }
}
