import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Log, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Page } from 'tns-core-modules/ui/page';
import { PushTrackerUserService } from '../../services';
import { CONFIGURATIONS } from '../../enums';
import * as appSettings from 'tns-core-modules/application-settings';

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
    private userService: PushTrackerUserService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;
  }

  ngOnInit() {
    this.userService.user.subscribe(user => {
      this._user = user;
    });
  }

  onConfigurationSelection(_, selection) {
    const loggedInUser = KinveyUser.getActiveUser();
    if (loggedInUser) {
      KinveyUser.update({
        control_configuration: selection
      });
      if (this._user) {
        this._user.data.control_configuration = selection;
        this.userService.updateDataProperty('control_configuration', selection);
        appSettings.setString('Kinvey.User', JSON.stringify(this._user));
      }
    }
    this._router.navigate(['/tabs/default']);
  }
}
