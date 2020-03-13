import { KinveyService } from '@permobil/nativescript/src/services';
import { Injectable } from 'injection-js';

@Injectable()
export class PushTrackerKinveyService extends KinveyService {
  constructor() {
    super();
  }
}
