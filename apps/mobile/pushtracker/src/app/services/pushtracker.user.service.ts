import { Injectable } from '@angular/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { PushTrackerUser } from '@permobil/core';
import { Observable, of, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushTrackerUserService {
  private _user = new BehaviorSubject<PushTrackerUser>(<PushTrackerUser>(<any>KinveyUser.getActiveUser()));
  user = this._user.asObservable();

  constructor() {}

  updateDataProperty(field: string, value: any): void {
    const updatedUser = this._user.value;
    updatedUser.data[field] = value;
    this._user.next(updatedUser);
  }

}
