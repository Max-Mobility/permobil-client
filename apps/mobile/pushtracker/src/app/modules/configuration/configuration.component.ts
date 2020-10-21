import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import { ApplicationSettings as appSettings, Page } from '@nativescript/core';
import { CONFIGURATIONS } from '../../enums';
import { PushTrackerUser } from '../../models';

@Component({
  selector: 'configuration',
  moduleId: module.id,
  templateUrl: './configuration.component.html'
})
export class ConfigurationComponent implements OnInit {
  CONFIGURATIONS = CONFIGURATIONS;
  private _user: PushTrackerUser;

  constructor(private _router: Router, private _page: Page) {
    this._page.actionBarHidden = true;
  }

  ngOnInit() {
    this._user = KinveyUser.getActiveUser() as PushTrackerUser;
  }

  async onConfigurationSelection(_, selection) {
    if (this._user) {
      await this._user.update({
        control_configuration: selection
      });
      appSettings.setString('Kinvey.User', JSON.stringify(this._user));
    }
    if (selection === CONFIGURATIONS.SWITCHCONTROL_WITH_SMARTDRIVE) {
      this._router.navigate(['/tabs/default']);
    } else {
      this._router.navigate(['/device-setup']);
    }
  }
}
