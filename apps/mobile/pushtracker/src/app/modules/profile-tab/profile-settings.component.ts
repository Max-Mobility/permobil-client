import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Device, Log, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import * as LS from 'nativescript-localstorage';
import * as appSettings from 'tns-core-modules/application-settings';
import { EventData } from 'tns-core-modules/data/observable';
import { screen } from 'tns-core-modules/platform';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { Page } from 'tns-core-modules/ui/page';
import { APP_LANGUAGES, APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService, SettingsService } from '../../services';
import { PushTrackerUserService } from '../../services/pushtracker.user.service';
import { enableDarkTheme, enableDefaultTheme } from '../../utils/themes-utils';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  infoItems;
  HEIGHT_UNITS: string[];
  HEIGHT: string;
  WEIGHT_UNITS: string[];
  WEIGHT: string;
  DISTANCE_UNITS: string[];
  DISTANCE: string;
  CURRENT_THEME: string;
  CURRENT_LANGUAGE: string;

  user: PushTrackerUser; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User

  @ViewChild('sliderSettingDialog', { static: false })
  sliderSettingDialog: ElementRef;

  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;

  screenHeight: number;
  activeSetting: string = null;
  activeSettingTitle: string = 'Setting';
  activeSettingDescription: string = 'Description';
  SLIDER_VALUE: number = 0;
  listPickerItems: string[];
  listPickerIndex: number = 0;

  constructor(
    public settingsService: SettingsService,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _routerExtensions: RouterExtensions,
    private _page: Page,
    private userService: PushTrackerUserService
  ) {
    this.getUser();
    this._page.actionBarHidden = true;

    this.HEIGHT_UNITS = ['Centimeters', 'Feet & inches'];
    this.HEIGHT = this.HEIGHT_UNITS[this.user.data.height_unit_preference];

    this.WEIGHT_UNITS = ['Kilograms', 'Pounds'];
    this.WEIGHT = this.WEIGHT_UNITS[this.user.data.weight_unit_preference];

    this.DISTANCE_UNITS = ['Kilometers', 'Miles'];
    this.DISTANCE = this.DISTANCE_UNITS[
      this.user.data.distance_unit_preference
    ];

    this.screenHeight = screen.mainScreen.heightDIPs;

    // get current app style theme from app-settings on device
    this.CURRENT_THEME =
      appSettings.getString(STORAGE_KEYS.APP_THEME) || APP_THEMES.DEFAULT;

    this.loadSettings();
  }

  ngOnInit() {
    this.getUser();
    this._logService.logBreadCrumb('profile-settings.component ngOnInit');
    this.infoItems = this._translateService.instant(
      'profile-settings-component.sections'
    );
  }

  getUser(): void {
    this.userService.user.subscribe(user => (this.user = user));
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

  async loadSettings() {
    const didLoad = await this.settingsService.loadSettings();
    if (!didLoad) {
      this.settingsService.settings.copy(
        LS.getItem(STORAGE_KEYS.DEVICE_SETTINGS)
      );
      this.settingsService.switchControlSettings.copy(
        LS.getItem(STORAGE_KEYS.DEVICE_SWITCH_CONTROL_SETTINGS)
      );
    }
  }

  saveSettingsToFileSystem() {
    LS.setItemObject(
      STORAGE_KEYS.DEVICE_SETTINGS,
      this.settingsService.settings.toObj()
    );
    LS.setItemObject(
      STORAGE_KEYS.DEVICE_SWITCH_CONTROL_SETTINGS,
      this.settingsService.switchControlSettings.toObj()
    );
  }

  onSliderValueChange(args: any) {
    this.SLIDER_VALUE = Math.floor(args.object.value);
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

  async saveSettings() {
    let pushToServer = false;
    // save settings
    switch (this.activeSetting) {
      case 'height':
        this.HEIGHT = this.listPickerItems[this.listPickerIndex];
        this.userService.updateDataProperty(
          'height_unit_preference',
          this.listPickerIndex
        );
        KinveyUser.update({ height_unit_preference: this.listPickerIndex });
        break;
      case 'weight':
        this.WEIGHT = this.listPickerItems[this.listPickerIndex];
        this.userService.updateDataProperty(
          'weight_unit_preference',
          this.listPickerIndex
        );
        KinveyUser.update({ weight_unit_preference: this.listPickerIndex });
        break;
      case 'distance':
        this.DISTANCE = this.listPickerItems[this.listPickerIndex];
        this.userService.updateDataProperty(
          'distance_unit_preference',
          this.listPickerIndex
        );
        KinveyUser.update({ distance_unit_preference: this.listPickerIndex });
        break;
      case 'max-speed':
        pushToServer = true;
        this.settingsService.settings.maxSpeed = this.SLIDER_VALUE * 10;
        break;
      case 'acceleration':
        pushToServer = true;
        this.settingsService.settings.acceleration = this.SLIDER_VALUE * 10;
        break;
      case 'tap-sensitivity':
        pushToServer = true;
        this.settingsService.settings.tapSensitivity = this.SLIDER_VALUE * 10;
        break;
      case 'mode':
        pushToServer = true;
        this.settingsService.settings.controlMode = this.listPickerItems[
          this.listPickerIndex
        ];
        break;
      case 'switch-control-max-speed':
        pushToServer = true;
        this.settingsService.switchControlSettings.maxSpeed =
          this.SLIDER_VALUE * 10;
        break;
      case 'switch-control-mode':
        pushToServer = true;
        this.settingsService.switchControlSettings.mode =
          Device.SwitchControlSettings.Mode.Options[this.listPickerIndex];
        break;
      case 'theme':
        this.CURRENT_THEME = this.listPickerItems[this.listPickerIndex];
        if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
          enableDefaultTheme();
        } else if (this.CURRENT_THEME === APP_THEMES.DARK) {
          enableDarkTheme();
        }
        break;
      case 'language':
        this.CURRENT_LANGUAGE = this.listPickerItems[this.listPickerIndex];
        console.log(
          'need to get the value of the enum to set the correct translation'
        );
        this._translateService.use(this.CURRENT_LANGUAGE);
        break;
    }
    if (pushToServer) {
      this.saveSettingsToFileSystem();
      try {
        await this.settingsService.save();
      } catch (error) {
        Log.E('error pushing to server', error);
      }
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
        this.activeSettingTitle = this._translateService.instant(
          'general.height'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.height'
        );
        this.listPickerItems = this.HEIGHT_UNITS;
        this.listPickerIndex = this.listPickerItems.indexOf(this.HEIGHT);
        this._openListPickerDialog();
        break;
      case 'weight':
        this.activeSettingTitle = this._translateService.instant(
          'general.weight'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.weight'
        );
        this.listPickerItems = this.WEIGHT_UNITS;
        this.listPickerIndex = this.listPickerItems.indexOf(this.WEIGHT);
        this._openListPickerDialog();
        break;
      case 'distance':
        this.activeSettingTitle = this._translateService.instant(
          'general.distance'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.distance'
        );
        this.listPickerItems = this.DISTANCE_UNITS;
        this.listPickerIndex = this.listPickerItems.indexOf(this.DISTANCE);
        this._openListPickerDialog();
        break;
      case 'max-speed':
        this.SLIDER_VALUE = this.settingsService.settings.maxSpeed / 10;
        this.activeSettingTitle = this._translateService.instant(
          'general.max-speed'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.max-speed'
        );
        this._openSliderSettingDialog();
        break;
      case 'acceleration':
        this.SLIDER_VALUE = this.settingsService.settings.acceleration / 10;
        this.activeSettingTitle = this._translateService.instant(
          'general.acceleration'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.acceleration'
        );
        this._openSliderSettingDialog();
        break;
      case 'tap-sensitivity':
        this.SLIDER_VALUE = this.settingsService.settings.tapSensitivity / 10;
        this.activeSettingTitle = this._translateService.instant(
          'general.tap-sensitivity'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.tap-sensitivity'
        );
        this._openSliderSettingDialog();
        break;
      case 'mode':
        this.activeSettingTitle = this._translateService.instant(
          'general.mode'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.mode'
        );
        this.listPickerItems = Device.Settings.ControlMode.Options;
        this.listPickerIndex = this.listPickerItems.indexOf(
          this.settingsService.settings.controlMode
        );
        this._openListPickerDialog();
        break;
      case 'switch-control-max-speed':
        this.SLIDER_VALUE =
          this.settingsService.switchControlSettings.maxSpeed / 10;
        this.activeSettingTitle = this._translateService.instant(
          'general.switch-control-max-speed'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.switch-control-max-speed'
        );
        this._openSliderSettingDialog();
        break;
      case 'switch-control-mode':
        this.activeSettingTitle = this._translateService.instant(
          'general.switch-control-mode'
        );
        this.activeSettingDescription = this._translateService.instant(
          'general.switch-control-mode'
        );
        this.listPickerItems = Device.SwitchControlSettings.Mode.Options.map(
          o => {
            const translationKey = 'sd.switch-settings.mode.' + o.toLowerCase();
            return this._translateService.instant(translationKey);
          }
        );
        this.listPickerIndex = Device.SwitchControlSettings.Mode.Options.indexOf(
          this.settingsService.switchControlSettings.mode
        );
        this._openListPickerDialog();
        break;
      case 'theme':
        this.activeSettingTitle = this._translateService.instant(
          'profile-settings.theme'
        );
        this.activeSettingDescription = this._translateService.instant(
          'profile-settings.theme'
        );
        this.listPickerItems = Object.keys(APP_THEMES);
        this.listPickerIndex = Object.keys(APP_THEMES).indexOf(
          this.CURRENT_THEME
        );
        this._openListPickerDialog();
        break;
      case 'language':
        this.activeSettingTitle = this._translateService.instant(
          'profile-settings.language'
        );
        this.activeSettingDescription = this._translateService.instant(
          'profile-settings.language'
        );
        this.listPickerItems = Object.keys(APP_LANGUAGES);
        this.listPickerIndex = Object.keys(APP_LANGUAGES).indexOf(
          this.CURRENT_LANGUAGE
        );
        this._openListPickerDialog();
        break;
    }
  }
}
