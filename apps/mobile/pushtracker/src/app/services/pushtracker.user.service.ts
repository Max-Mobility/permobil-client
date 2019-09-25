import { Injectable } from '@angular/core';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushTrackerUserService {
  private _user: BehaviorSubject<PushTrackerUser>;

  public user: Observable<PushTrackerUser>;

  constructor() {
    this._user = new BehaviorSubject<PushTrackerUser>(<PushTrackerUser>(
      (<any>KinveyUser.getActiveUser())
    ));
    this.user = this._user.asObservable();
  }

  initializeUser(user: PushTrackerUser) {
    this._user = new BehaviorSubject<PushTrackerUser>(user);
    this.user = this._user.asObservable();
    console.log('User initialized', this._user.value);
  }

  updateUser(user: PushTrackerUser) {
    this._user.next(user);
  }

  refreshUser(): Promise<boolean> {
    return <any>KinveyUser.getActiveUser().me()
      .then((activeUser) => {
        this._user.next(<PushTrackerUser>(<any>activeUser));
        return true;
      });
  }

  reset() {
    this._user = new BehaviorSubject<PushTrackerUser>(<PushTrackerUser>(
      (<any>KinveyUser.getActiveUser())
    ));
    this.user = this._user.asObservable();
  }

  updateDataProperty(field: string, value: any): void {
    if (this._user) {
      const updatedUser = this._user.value;
      updatedUser.data[field] = value;
      this._user.next(updatedUser);
    }
  }
}
