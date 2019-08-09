import { Injectable } from '@angular/core';
import { CanActivate, CanLoad, Route } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';

@Injectable()
export class AuthGuardService implements CanActivate, CanLoad {
  constructor(private router: RouterExtensions) {}

  canActivate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const user = <PushTrackerUser>(<any>KinveyUser.getActiveUser());
      if (user) {
        resolve(true);
      } else {
        this.router.navigate(['/login'], {
          clearHistory: true
        });
        resolve(false);
      }
    });
  }

  canLoad(route: Route): Promise<boolean> {
    // reuse same logic to activate
    return this.canActivate();
  }
}
