import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Page } from 'tns-core-modules/ui/page';
import { PushTrackerUserService } from '../../services';
import { CONFIGURATIONS } from '../../enums';
import * as appSettings from 'tns-core-modules/application-settings';

@Component({
  selector: 'device-setup',
  moduleId: module.id,
  templateUrl: './device-setup.component.html'
})
export class DeviceSetupComponent implements OnInit {
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
}
