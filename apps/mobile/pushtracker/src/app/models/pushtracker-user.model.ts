import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import { PushTrackerUserData } from '@permobil/core';

export class PushTrackerUser extends KinveyUser {
  data: PushTrackerUserData;
}
