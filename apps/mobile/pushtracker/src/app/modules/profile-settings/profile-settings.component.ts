import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Device, Log } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import * as appSettings from 'tns-core-modules/application-settings';
import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page/page';
import { APP_THEMES, STORAGE_KEYS } from '~/app/enums';
import { enableDarkTheme, enableDefaultTheme } from '~/app/utils/themes-utils';
import { LoggingService } from '../../services';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { screen } from 'tns-core-modules/platform/platform';

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

  @ViewChild('sliderSettingDialog', { static: false })
  sliderSettingDialog: ElementRef;

  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;

  screenHeight: number;

  activeSetting: string = null;
  activeSettingTitle: string = 'Setting';
  activeSettingDescription: string = 'Description';
  SLIDER_VALUE: number = 50;
  listPickerItems: string[];
  listPickerIndex: number = 0;

  settings: Device.Settings = new Device.Settings();
  switchControlSettings: Device.SwitchControlSettings = new Device.SwitchControlSettings();

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _routerExtensions: RouterExtensions,
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

    this.screenHeight = screen.mainScreen.heightDIPs;

    // get current app style theme from app-settings on device
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME
    ) || APP_THEMES.DEFAULT;
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

  async closeSliderSettingDialog() {
    const x = this.sliderSettingDialog.nativeElement as GridLayout;
    x.animate({
      opacity: 0,
      duration: 200
    }).then(() => {
      x.animate({
        translate: {
          x: 0,
          y: this.screenHeight
        },
        duration: 0
      });
    });
    // this._removeActiveDataBox();
  }

  async saveSliderSettingValue() {
    this.saveSettings();
    this.closeSliderSettingDialog();
  }

  private _openSliderSettingDialog() {
    const x = this.sliderSettingDialog.nativeElement as GridLayout;
    x.animate({
      translate: {
        x: 0,
        y: 0
      },
      duration: 0
    }).then(() => {
      x.animate({
        opacity: 1,
        duration: 200
      });
    });
  }

  async closeListPickerDialog() {
    const x = this.listPickerDialog.nativeElement as GridLayout;
    x.animate({
      opacity: 0,
      duration: 200
    }).then(() => {
      x.animate({
        translate: {
          x: 0,
          y: this.screenHeight
        },
        duration: 0
      });
    });
  }

  async saveListPickerValue() {
    this.saveSettings();
    this.closeListPickerDialog();
  }

  listPickerIndexChange(args: any) {
    this.listPickerIndex = args.object.selectedIndex;
  }

  saveSettings() {
    Log.D('saving settings', this.activeSetting, this.listPickerItems, this.listPickerIndex);
    // save settings
    switch (this.activeSetting) {
      case 'height':
        this.HEIGHT = this.listPickerItems[this.listPickerIndex];
        break;
      case 'weight':
        this.WEIGHT = this.listPickerItems[this.listPickerIndex];
        break;
      case 'distance':
        this.DISTANCE = this.listPickerItems[this.listPickerIndex];
        break;
      case 'max-speed':
        this.settings.maxSpeed = this.SLIDER_VALUE * 10;
        break;
      case 'acceleration':
        this.settings.acceleration = this.SLIDER_VALUE * 10;
        break;
      case 'tap-sensitivity':
        this.settings.tapSensitivity = this.SLIDER_VALUE * 10;
        break;
      case 'mode':
        this.settings.controlMode = this.listPickerItems[this.listPickerIndex];
        break;
      case 'theme':
        this.CURRENT_THEME = this.listPickerItems[this.listPickerIndex];
        if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
          enableDefaultTheme();
        } else if (this.CURRENT_THEME === APP_THEMES.DARK) {
          enableDarkTheme();
        }
        break;
    }
  }

  private _openListPickerDialog() {
    const x = this.listPickerDialog.nativeElement as GridLayout;
    x.animate({
      translate: {
        x: 0,
        y: 0
      },
      duration: 0
    }).then(() => {
      x.animate({
        opacity: 1,
        duration: 200
      });
    });
  }

  onItemTap(args: EventData, item: string) {
    Log.D(`User tapped: ${item}`);
    this.activeSetting = item;
    switch (this.activeSetting) {
      case 'height':
        this.activeSettingTitle = this._translateService.instant('general.height');
        this.activeSettingDescription = this._translateService.instant('general.height');
        this.listPickerItems = ['Centimeters', 'Feet & inches'];
        this.listPickerIndex = this.listPickerItems.indexOf(this.HEIGHT);
        this._openListPickerDialog();
        break;
      case 'weight':
        this.activeSettingTitle = this._translateService.instant('general.weight');
        this.activeSettingDescription = this._translateService.instant('general.weight');
        this.listPickerItems = ['Kilograms', 'Pounds'];
        this.listPickerIndex = this.listPickerItems.indexOf(this.WEIGHT);
        this._openListPickerDialog();
        break;
      case 'distance':
        this.activeSettingTitle = this._translateService.instant('general.distance');
        this.activeSettingDescription = this._translateService.instant('general.distance');
        this.listPickerItems = ['Kilometers', 'Miles'];
        this.listPickerIndex = this.listPickerItems.indexOf(this.DISTANCE);
        this._openListPickerDialog();
        break;
      case 'max-speed':
        this.SLIDER_VALUE = this.settings.maxSpeed / 10;
        this.activeSettingTitle = this._translateService.instant('general.max-speed');
        this.activeSettingDescription = this._translateService.instant('general.max-speed');
        this._openSliderSettingDialog();
        break;
      case 'acceleration':
        this.SLIDER_VALUE = this.settings.acceleration / 10;
        this.activeSettingTitle = this._translateService.instant('general.acceleration');
        this.activeSettingDescription = this._translateService.instant('general.acceleration');
        this._openSliderSettingDialog();
        break;
      case 'tap-sensitivity':
        this.SLIDER_VALUE = this.settings.tapSensitivity / 10;
        this.activeSettingTitle = this._translateService.instant('general.tap-sensitivity');
        this.activeSettingDescription = this._translateService.instant('general.tap-sensitivity');
        this._openSliderSettingDialog();
        break;
      case 'mode':
        this.activeSettingTitle = this._translateService.instant('general.mode');
        this.activeSettingDescription = this._translateService.instant('general.mode');
        this.listPickerItems = Device.Settings.ControlMode.Options;
        this.listPickerIndex = this.listPickerItems.indexOf(this.settings.controlMode);
        this._openListPickerDialog();
        break;
      case 'theme':
        this.activeSettingTitle = this._translateService.instant('profile-settings.theme');
        this.activeSettingDescription = this._translateService.instant('profile-settings.theme');
        this.listPickerItems = Object.keys(APP_THEMES);
        this.listPickerIndex = Object.keys(APP_THEMES).indexOf(this.CURRENT_THEME);
        this._openListPickerDialog();
        break;
    }
  }
}
