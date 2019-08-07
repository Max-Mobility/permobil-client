import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import * as appSettings from 'tns-core-modules/application-settings';
import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page/page';
import { APP_THEMES, STORAGE_KEYS } from '~/app/enums';
import { enableDarkTheme, enableDefaultTheme } from '~/app/utils/themes-utils';
import { DialogService, LoggingService } from '../../services';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  private static LOG_TAG = 'profile-settings.component ';
  infoItems;
  HEIGHT: string;
  WEIGHT: string;
  DISTANCE: string;
  MAX_SPEED: string;
  ACCELERATION: string;
  TAP_SENSITIVITY: string;
  MODE: string;
  CURRENT_THEME: string;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _routerExtensions: RouterExtensions,
    private _dialogService: DialogService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;

    this.HEIGHT = 'Feet & inches';
    this.WEIGHT = 'Pounds';
    this.DISTANCE = 'Miles';
    this.MAX_SPEED = '70%';
    this.ACCELERATION = '70%';
    this.TAP_SENSITIVITY = '100%';
    this.MODE = 'MX2+';

    // get current app style theme from app-settings on device
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

  ngOnInit() {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.LOG_TAG + `ngOnInit`
    );
    this.infoItems = this._translateService.instant(
      'profile-settings-component.sections'
    );
  }

  navBack() {
    if (this._routerExtensions.canGoBack()) {
      this._routerExtensions.back();
    } else {
      this._routerExtensions.navigate(['/login'], {
        transition: {
          name: 'slideRight'
        }
      });
    }
  }

  onItemTap(args: EventData, item: string) {
    Log.D(`User tapped: ${item}`);

    switch (item) {
      case 'height':
        this._dialogService
          .action(this._translateService.instant('general.height'), [
            'Centimeters',
            'Feet & inches'
          ])
          .then(
            val => {
              if (val) this.HEIGHT = val;
            },
            err => console.error(err)
          );
        break;
      case 'weight':
        this._dialogService
          .action(this._translateService.instant('general.weight'), [
            'Kilograms',
            'Pounds'
          ])
          .then(
            val => {
              if (val) this.WEIGHT = val;
            },
            err => console.error(err)
          );
        break;
      case 'distance':
        this._dialogService
          .action(this._translateService.instant('general.distance'), [
            'Kilometers',
            'Miles'
          ])
          .then(
            val => {
              if (val) this.DISTANCE = val;
            },
            err => console.error(err)
          );
        break;
      case 'max-speed':
        this._dialogService
          .action(this._translateService.instant('general.max-speed'), [
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7'
          ])
          .then(
            val => {
              if (val) this.MAX_SPEED = val;
            },
            err => console.error(err)
          );
        break;
      case 'acceleration':
        this._dialogService
          .action(this._translateService.instant('general.acceleration'), [
            'slow',
            'fast',
            'turbo'
          ])
          .then(
            val => {
              if (val) this.ACCELERATION = val;
            },
            err => console.error(err)
          );
        break;
      case 'tap-sensitivity':
        this._dialogService
          .action(this._translateService.instant('general.tap-sensitivity'), [
            'slow',
            'fast',
            'turbo'
          ])
          .then(
            val => {
              if (val) this.TAP_SENSITIVITY = val;
            },
            err => console.error(err)
          );
        break;
      case 'mode':
        this._dialogService
          .action(this._translateService.instant('general.mode'), [
            'bad',
            'good',
            'best'
          ])
          .then(
            val => {
              if (val) this.MODE = val;
            },
            err => console.error(err)
          );
        break;
      case 'theme':
        this._dialogService
          .action(this._translateService.instant('profile-settings.theme'), [
            'Light',
            'Dark'
          ])
          .then(
            val => {
              if (val === 'Light') {
                enableDefaultTheme();
              } else if (val === 'Dark') {
                enableDarkTheme();
              }
            },
            err => console.error(err)
          );
        break;
    }
  }
}
