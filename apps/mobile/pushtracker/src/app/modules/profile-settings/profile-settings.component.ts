import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Device, Log, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import debounce from 'lodash/debounce';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import * as appSettings from 'tns-core-modules/application-settings';
import { EventData, PropertyChangeData } from 'tns-core-modules/data/observable';
import { fromResource as imageFromResource } from 'tns-core-modules/image-source';
import { screen } from 'tns-core-modules/platform';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { Page } from 'tns-core-modules/ui/page';
import { Switch } from 'tns-core-modules/ui/switch';
import { APP_LANGUAGES, APP_THEMES, STORAGE_KEYS } from '../../enums';
import { BluetoothService, LoggingService, PushTrackerState, SettingsService } from '../../services';
import { PushTrackerUserService } from '../../services/pushtracker.user.service';
import { enableDarkTheme, enableDefaultTheme } from '../../utils/themes-utils';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  @ViewChild('sliderSettingDialog', { static: false })
  sliderSettingDialog: ElementRef;

  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;

  HEIGHT_UNITS: string[];
  HEIGHT: string;
  WEIGHT_UNITS: string[];
  WEIGHT: string;
  DISTANCE_UNITS: string[];
  DISTANCE: string;
  CURRENT_THEME: string = appSettings.getString(
    STORAGE_KEYS.APP_THEME,
    APP_THEMES.DEFAULT
  );
  CURRENT_LANGUAGE: string;
  watchIconString: string =
    this.CURRENT_THEME === APP_THEMES.DEFAULT
      ? 'watch_question_black'
      : 'watch_question_white';
  watchIconOpacity: number =
    this.CURRENT_THEME === APP_THEMES.DEFAULT ? 0.7 : 1.0;
  watchIcon: any = imageFromResource(this.watchIconString);
  user: PushTrackerUser; // this is our Kinvey.User
  screenHeight: number;
  activeSettingTitle: string = 'Setting';
  activeSettingDescription: string = 'Description';
  SLIDER_VALUE: number = 0;
  listPickerItems: string[];
  listPickerIndex: number = 0;

  private activeSetting: string = null;

  private _debouncedCommitSettingsFunction: any = null;

  private MAX_COMMIT_INTERVAL_MS: number = 1 * 1000;

  constructor(
    public settingsService: SettingsService,
    public bluetoothService: BluetoothService,
    private _zone: NgZone,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private userService: PushTrackerUserService,
    private _params: ModalDialogParams
  ) {
    this._page.actionBarHidden = true;

    // save the debounced commit settings function
    this._debouncedCommitSettingsFunction = debounce(
      this.commitSettingsChange.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true, trailing: true }
    );

    // set up the status watcher for the pushtracker state
    this.bluetoothService.on(
      BluetoothService.pushtracker_status_changed,
      this.updateWatchIcon,
      this
    );

    // get current app style theme from app-settings on device
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

  ngOnInit() {
    this._logService.logBreadCrumb('profile-settings.component ngOnInit');

    this.getUser();

    this.HEIGHT_UNITS = ['Centimeters', 'Feet & inches'];
    this.HEIGHT = this.HEIGHT_UNITS[this.user.data.height_unit_preference];

    this.WEIGHT_UNITS = ['Kilograms', 'Pounds'];
    this.WEIGHT = this.WEIGHT_UNITS[this.user.data.weight_unit_preference];

    this.DISTANCE_UNITS = ['Kilometers', 'Miles'];
    this.DISTANCE = this.DISTANCE_UNITS[
      this.user.data.distance_unit_preference
    ];

    this.screenHeight = screen.mainScreen.heightDIPs;
  }

  ngAfterViewInit() {
    this.updateWatchIcon({});
  }

  getUser() {
    this.userService.user.subscribe(user => (this.user = user));
  }

  closeModal() {
    Log.D('profile-settings.component modal closed');
    this._params.closeCallback('');
  }

  setWatchIconVariables(status: string) {
    if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
      this.watchIconString = `watch_${status}_black`;
      this.watchIcon = imageFromResource(this.watchIconString);
      this.watchIconOpacity = 0.7;
    } else {
      this.watchIconString = `watch_${status}_white`;
      this.watchIcon = imageFromResource(this.watchIconString);
      this.watchIconOpacity = 1.0;
    }
  }

  updateWatchIcon(event: any) {
    this._zone.run(() => {
      Log.D('status changed', event.data);
      const state =
        (event && event.data && event.data.state) ||
        BluetoothService.pushTrackerStatus.get('state');
      switch (state) {
        default:
        case PushTrackerState.unknown:
          console.log('Unknown');
          this.setWatchIconVariables('question');
          break;
        case PushTrackerState.paired:
          console.log('Paired');
          this.setWatchIconVariables('empty');
          break;
        case PushTrackerState.disconnected:
          console.log('Disconnected');
          this.setWatchIconVariables('x');
          break;
        case PushTrackerState.connected:
          console.log('Connected');
          this.setWatchIconVariables('check');
          break;
        case PushTrackerState.ready:
          console.log('ready');
          this.setWatchIconVariables('check');
          break;
      }
    });
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
    let updatedSmartDriveSettings = false;
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
        updatedSmartDriveSettings = true;
        this.settingsService.settings.maxSpeed = this.SLIDER_VALUE * 10;
        break;
      case 'acceleration':
        updatedSmartDriveSettings = true;
        this.settingsService.settings.acceleration = this.SLIDER_VALUE * 10;
        break;
      case 'tap-sensitivity':
        updatedSmartDriveSettings = true;
        this.settingsService.settings.tapSensitivity = this.SLIDER_VALUE * 10;
        break;
      case 'mode':
        updatedSmartDriveSettings = true;
        this.settingsService.settings.controlMode = this.listPickerItems[
          this.listPickerIndex
        ];
        break;
      case 'switch-control-max-speed':
        updatedSmartDriveSettings = true;
        this.settingsService.switchControlSettings.maxSpeed =
          this.SLIDER_VALUE * 10;
        break;
      case 'switch-control-mode':
        updatedSmartDriveSettings = true;
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
        this.userService.updateDataProperty(
          'theme_preference',
          this.CURRENT_THEME
        );
        KinveyUser.update({ theme_preference: this.CURRENT_THEME });
        appSettings.setString(STORAGE_KEYS.APP_THEME, this.CURRENT_THEME);
        this.updateWatchIcon({});
        break;
      case 'language':
        this.CURRENT_LANGUAGE = this.listPickerItems[this.listPickerIndex];
        console.log(
          'need to get the value of the enum to set the correct translation'
        );
        this._translateService.use(this.CURRENT_LANGUAGE);
        break;
    }
    if (updatedSmartDriveSettings) {
      this._debouncedCommitSettingsFunction();
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

  async commitSettingsChange() {
    this.settingsService.saveToFileSystem();
    const pts = BluetoothService.PushTrackers.filter(p => p.connected);
    if (pts && pts.length > 0) {
      Log.D('sending to pushtrackers:', pts.map(pt => pt.address));
      // this.setWatchIconVariables('Wait', '.gif');
      this.setWatchIconVariables('empty');
      await pts.map(async pt => {
        try {
          await pt.sendSettingsObject(this.settingsService.settings);
          await pt.sendSwitchControlSettingsObject(
            this.settingsService.switchControlSettings
          );
          this.setWatchIconVariables('check');
        } catch (err) {
          // Show watch icon 'X'
          this.setWatchIconVariables('x');
          this._logService.logException(err);
        }
      });
    } else {
      Log.D('no pushtrackers!');
    }
    try {
      await this.settingsService.save();
    } catch (error) {
      this._logService.logException(error);
    }
  }

  async onSettingsChecked(args: PropertyChangeData, setting: string) {
    let updatedSmartDriveSettings = false;

    let isChecked = args.value;
    // apply the styles if the switch is false/off
    const sw = args.object as Switch;
    sw.className =
      isChecked === true ? 'setting-switch' : 'inactive-setting-switch';

    switch (setting) {
      case 'ez-on':
        if (isChecked !== this.settingsService.settings.ezOn)
          updatedSmartDriveSettings = true;
        this.settingsService.settings.ezOn = isChecked;
        break;
      case 'power-assist-beep':
        // since the value we use is actually the OPPOSITE of the
        // switch
        isChecked = !isChecked;
        if (isChecked !== this.settingsService.settings.disablePowerAssistBeep)
          updatedSmartDriveSettings = true;
        this.settingsService.settings.disablePowerAssistBeep = isChecked;
        break;
      default:
        break;
    }
    if (updatedSmartDriveSettings) {
      this._debouncedCommitSettingsFunction();
    }
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
