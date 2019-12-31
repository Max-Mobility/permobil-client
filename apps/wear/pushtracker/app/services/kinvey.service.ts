import { Injectable } from 'injection-js';
import { KinveyService } from '../../../../../@permobil/nativescript/src/services/kinvey.service';

@Injectable()
export class PushTrackerKinveyService extends KinveyService {
  constructor() {
    super();
  }
}
