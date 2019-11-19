import { PushTrackerUserData } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';

export class PushTrackerUser extends KinveyUser {
  data: PushTrackerUserData;
}
