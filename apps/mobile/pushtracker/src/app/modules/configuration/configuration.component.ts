import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Page } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { CONFIGURATIONS } from '../../enums';
import { PushTrackerUser } from '../../models';

@Component({
  selector: 'configuration',
  moduleId: module.id,
  templateUrl: './configuration.component.html'
})
export class ConfigurationComponent implements OnInit {
  public CONFIGURATIONS = CONFIGURATIONS;
  private _user: PushTrackerUser;

  constructor(
    private _router: Router,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;
  }

  ngOnInit() {
    this._user = KinveyUser.getActiveUser() as PushTrackerUser;
  }

  onConfigurationSelection(_, selection) {
    const loggedInUser = KinveyUser.getActiveUser();
    if (loggedInUser) {
      KinveyUser.update({
        control_configuration: selection
      });
      if (this._user) {
        this._user.data.control_configuration = selection;
        this._user.update({
          control_configuration: selection
        });
        appSettings.setString('Kinvey.User', JSON.stringify(this._user));
      }
    }
    if (selection === CONFIGURATIONS.SWITCHCONTROL_WITH_SMARTDRIVE) {
      this._router.navigate(['/tabs/default']);
    } else {
      this._router.navigate(['/device-setup']);
    }
  }
}
