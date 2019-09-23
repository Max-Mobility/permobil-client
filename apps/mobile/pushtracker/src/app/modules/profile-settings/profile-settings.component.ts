import { Component, ElementRef, NgZone, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Device, Log, PushTrackerUser } from '@permobil/core';
import debounce from 'lodash/debounce';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { BottomSheetOptions, BottomSheetService } from 'nativescript-material-bottomsheet/angular';
import * as appSettings from 'tns-core-modules/application-settings';
import { PropertyChangeData } from 'tns-core-modules/data/observable';
import { alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { Switch } from 'tns-core-modules/ui/switch';
import { APP_LANGUAGES, APP_THEMES, CONFIGURATIONS, DISTANCE_UNITS, HEIGHT_UNITS, STORAGE_KEYS, WEIGHT_UNITS } from '../../enums';
import { PushTracker, SmartDrive } from '../../models';
import { BluetoothService, LoggingService, PushTrackerState, PushTrackerUserService, SettingsService } from '../../services';
import { ListPickerSheetComponent, MockActionbarComponent, SliderSheetComponent } from '../shared/components';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  @ViewChild('mockActionBar', { static: false })
  mockActionBar: ElementRef;

  APP_THEMES = APP_THEMES;
  CONFIGURATIONS = CONFIGURATIONS;
  heightUnits: string[] = [];
  heightUnitsTranslated: string[] = [];
  displayHeightUnit: string;
  weightUnits: string[] = [];
  weightUnitsTranslated: string[] = [];
  displayWeightUnit: string;
  distanceUnits: string[] = [];
  distanceUnitsTranslated: string[] = [];
  displayDistanceUnit: string;
  CURRENT_THEME: string = appSettings.getString(
    STORAGE_KEYS.APP_THEME,
    APP_THEMES.DEFAULT
  );
  CURRENT_LANGUAGE: string;
  user: PushTrackerUser; // this is our Kinvey.User
  syncingWithSmartDrive = false;
  syncSuccessful = false;
  syncState = '';
  versionInfo = '';

  // activeSettingTitle: string = 'Setting';
  // activeSettingDescription: string = 'Description';
  // SLIDER_VALUE: number = 0;
  // listPickerItems: string[];
  // listPickerIndex: number = 0;

  private activeSetting: string = null;
  private _debouncedCommitSettingsFunction: any = null;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 1000;
  private smartDrive: SmartDrive = undefined;
  private _pt_version = '';
  private _mcu_version = '';
  private _ble_version = '';

  constructor(
    public settingsService: SettingsService,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private _userService: PushTrackerUserService,
    private _params: ModalDialogParams,
    private _bluetoothService: BluetoothService,
    private _zone: NgZone,
    private _bottomSheet: BottomSheetService,
    private _vcRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb('profile-settings.component ngOnInit');

    this._page.actionBarHidden = true;

    // save the debounced commit settings function
    this._debouncedCommitSettingsFunction = debounce(
      this._commitSettingsChange.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true, trailing: true }
    );

    // get current app style theme from app-settings on device
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.getUser();

    this.heightUnits = Object.keys(HEIGHT_UNITS).map(key => HEIGHT_UNITS[key]);
    this.heightUnitsTranslated = Object.keys(HEIGHT_UNITS).map(key =>
      this._translateService.instant(this._getTranslationKeyForHeightUnit(key))
    );

    this.weightUnits = Object.keys(WEIGHT_UNITS).map(key => WEIGHT_UNITS[key]);
    this.weightUnitsTranslated = Object.keys(WEIGHT_UNITS).map(key =>
      this._translateService.instant(this._getTranslationKeyForWeightUnit(key))
    );

    this.distanceUnits = Object.keys(DISTANCE_UNITS).map(
      key => DISTANCE_UNITS[key]
    );
    this.distanceUnitsTranslated = Object.keys(DISTANCE_UNITS).map(key =>
      this._translateService.instant(
        this._getTranslationKeyForDistanceUnit(key)
      )
    );

    if (this.user) {
      let index = this.heightUnits.indexOf(
        this.user.data.height_unit_preference.toString()
      );
      if (index < 0) index = 0;
      this.displayHeightUnit = this.heightUnitsTranslated[index];

      index = this.weightUnits.indexOf(
        this.user.data.weight_unit_preference.toString()
      );
      if (index < 0) index = 0;
      this.displayWeightUnit = this.weightUnitsTranslated[index];

      index = this.distanceUnits.indexOf(
        this.user.data.distance_unit_preference.toString()
      );
      if (index < 0) index = 0;
      this.displayDistanceUnit = this.distanceUnitsTranslated[index];
    }

    if (
      this.user.data.control_configuration ===
      CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
    ) {
      const ptConnected = BluetoothService.PushTrackers.filter(pt => {
        return pt.connected === true;
      });
      if (ptConnected && ptConnected.length === 1) {
        const pt = ptConnected[0] as PushTracker;
        this._pt_version = PushTracker.versionByteToString(pt.version);
        this._mcu_version = PushTracker.versionByteToString(pt.mcu_version);
        this._ble_version = PushTracker.versionByteToString(pt.ble_version);
        if (
          !(
            this._pt_version === '??' &&
            this._mcu_version === '??' &&
            this._ble_version === '??'
          )
        ) {
          this.versionInfo = `(PT ${this._pt_version}, SD ${this._mcu_version}, BT ${this._ble_version})`;
          Log.D('PushTracker connected', this.versionInfo);
        }
      }
    }
  }

  getUser() {
    this.user = this._params.context.user;
    if (this.user && this.user.data) {
      this.CURRENT_THEME = this.user.data.theme_preference;
      this.CURRENT_LANGUAGE = this.user.data.language_preference || 'English';
    }
  }

  private async _scanForSmartDrive(force: boolean = false) {
    this.syncState = this._translateService.instant(
      'profile-settings.scanning-for-smartdrives'
    );
    Log.D('Scanning for SmartDrives');
    if (!force && this.smartDrive && this.smartDrive.address) {
      this.syncState = this._translateService.instant(
        'profile-settings.detected-a-smartdrive'
      );
      Log.D(
        'Scan is not forced - Already have a SmartDrive',
        this.smartDrive.address
      );
      return true;
    }
    if (
      this.user.data.control_configuration ===
      CONFIGURATIONS.SWITCHCONTROL_WITH_SMARTDRIVE
    ) {
      return this._bluetoothService.scanForSmartDrive(10).then(() => {
        const drives = BluetoothService.SmartDrives;
        if (drives.length === 0) {
          alert({
            message:
              'Failed to detect a SmartDrive. Please make sure that your SmartDrive is switched ON and nearby.',
            okButtonText: this._translateService.instant('general.ok')
          });
          this.syncingWithSmartDrive = false;
          return false;
        } else if (drives.length > 1) {
          alert({
            message:
              'More than one SmartDrive detected! Please switch OFF all but one of the SmartDrives and retry',
            okButtonText: this._translateService.instant('general.ok')
          });
          this.syncingWithSmartDrive = false;
          return true;
        } else {
          drives.map(async drive => {
            this.smartDrive = drive;
            Log.D('SmartDrive detected', this.smartDrive.address);
            Log.D('Scan successful');
            this.syncState = this._translateService.instant(
              'profile-settings.detected-a-smartdrive'
            );
          });
          return true;
        }
      });
    }
  }

  closeModal() {
    Log.D('profile-settings.component modal closed');
    this._params.closeCallback('');
    if (this.smartDrive) this.smartDrive.disconnect();
  }

  onSyncSettingsWithSmartDrive(args) {
    this.syncingWithSmartDrive = true;
    Log.D('Synchronizing settings with SmartDrive');
    this._scanForSmartDrive().then(async () => {
      if (!this.smartDrive) return;
      await this.smartDrive.connect();
      Log.D('Connected to SmartDrive', this.smartDrive.address);
      this.syncState = this._translateService.instant(
        'profile-settings.connected-a-smartdrive'
      );
      // Register for SmartDrive connected and disconnected events
      this.smartDrive.on(
        SmartDrive.smartdrive_connect_event,
        this._onSmartDriveConnect,
        this
      );
      this.smartDrive.on(
        SmartDrive.smartdrive_ble_version_event,
        this._onSmartDriveBleVersion,
        this
      );
      this.smartDrive.on(
        SmartDrive.smartdrive_mcu_version_event,
        this._onSmartDriveMcuVersion,
        this
      );
      this.smartDrive.on(
        SmartDrive.smartdrive_disconnect_event,
        this._onSmartDriveDisconnect,
        this
      );
    });
  }

  async onRefreshTap(args) {
    // Do not allow sync when scanning for SmartDrives
    this.syncingWithSmartDrive = true;
    await this._scanForSmartDrive(true);
    await this._sleep(3000);
    this.syncingWithSmartDrive = false;
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

  onListPickerItemTap(item: string) {
    Log.D(`User tapped: ${item}`);

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true
    };

    switch (item.toLowerCase()) {
      case 'height':
        let userHeightUnitPreference = null;
        let primaryIndex;
        if (this.user)
          userHeightUnitPreference = this.user.data.height_unit_preference;
        primaryIndex = this.heightUnits.indexOf(userHeightUnitPreference);
        if (primaryIndex < 0) primaryIndex = 0;

        options.context = {
          title: this._translateService.instant('general.height'),
          primaryItems: this.heightUnitsTranslated,
          primaryIndex,
          listPickerNeedsSecondary: false
        };
        break;
      case 'weight':
        let userWeightUnitPreference = null;
        if (this.user)
          userWeightUnitPreference = this.user.data.weight_unit_preference;
        primaryIndex = this.weightUnits.indexOf(userWeightUnitPreference);
        if (primaryIndex < 0) primaryIndex = 0;

        options.context = {
          title: this._translateService.instant('general.weight'),
          primaryItems: this.weightUnitsTranslated,
          primaryIndex,
          listPickerNeedsSecondary: false
        };
        break;
      case 'distance':
        let userDistanceUnitPreference = null;
        if (this.user)
          userDistanceUnitPreference = this.user.data.distance_unit_preference;
        primaryIndex = this.distanceUnits.indexOf(userDistanceUnitPreference);
        if (primaryIndex < 0) primaryIndex = 0;

        options.context = {
          title: this._translateService.instant('general.distance'),
          primaryItems: this.distanceUnitsTranslated,
          primaryIndex,
          listPickerNeedsSecondary: false
        };
        break;
      case 'mode':
        const primaryItems = Device.Settings.ControlMode.Options;
        options.context = {
          title: this._translateService.instant('general.mode'),
          primaryItems,
          primaryIndex: primaryItems.indexOf(
            this.settingsService.settings.controlMode
          ),
          listPickerNeedsSecondary: false
        };
        break;
      case 'switch-control-mode':
        options.context = {
          title: this._translateService.instant('general.switch-control-mode'),
          primaryItems: Device.SwitchControlSettings.Mode.Options.map(o => {
            const translationKey = 'sd.switch-settings.mode.' + o.toLowerCase();
            return this._translateService.instant(translationKey);
          }),
          primaryIndex: Device.SwitchControlSettings.Mode.Options.indexOf(
            this.settingsService.switchControlSettings.mode
          ),
          listPickerNeedsSecondary: false
        };
        break;

      case 'theme':
        options.context = {
          title: this._translateService.instant('profile-settings.theme'),
          primaryItems: Object.keys(APP_THEMES),
          primaryIndex: Object.keys(APP_THEMES).indexOf(this.CURRENT_THEME),
          listPickerNeedsSecondary: false
        };
        break;
      case 'language':
        options.context = {
          title: this._translateService.instant('profile-settings.language'),
          primaryItems: Object.keys(APP_LANGUAGES),
          primaryIndex: Object.keys(APP_LANGUAGES).indexOf(
            this.CURRENT_LANGUAGE
          ),
          listPickerNeedsSecondary: false
        };
        break;
      default:
        break;
    }

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        if (result && result.data) {
          // this._userService.updateDataProperty(
          //   'gender',
          //   this.genders[result.data.primaryIndex]
          // );
          // KinveyUser.update({ gender: this.genders[result.data.primaryIndex] });
        }
        // this._removeActiveDataBox();
      });
  }

  onSliderItemTap(item: string) {
    Log.D(`User tapped: ${item}`);

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true
    };

    switch (item.toLowerCase()) {
      case 'max-speed':
        options.context = {
          title: this._translateService.instant('general.max-speed'),
          SLIDER_VALUE: this.settingsService.settings.maxSpeed / 10
        };
        break;
      case 'acceleration':
        options.context = {
          title: this._translateService.instant('general.acceleration'),
          SLIDER_VALUE: this.settingsService.settings.acceleration / 10
        };
        break;
      case 'tap-sensitivity':
        options.context = {
          title: this._translateService.instant('general.tap-sensitivity'),
          SLIDER_VALUE: this.settingsService.settings.tapSensitivity / 10
        };
        break;
      default:
        break;
    }

    this._bottomSheet.show(SliderSheetComponent, options).subscribe(result => {
      if (result && result.data) {
        // this._userService.updateDataProperty(
        //   'gender',
        //   this.genders[result.data.primaryIndex]
        // );
        // KinveyUser.update({ gender: this.genders[result.data.primaryIndex] });
      }
      // this._removeActiveDataBox();
    });
  }

  // private async saveSettings() {
  //   let updatedSmartDriveSettings = false;
  //   // save settings
  //   switch (this.activeSetting) {
  //     case 'height':
  //       this._userService.updateDataProperty(
  //         'height_unit_preference',
  //         this.heightUnits[this.listPickerIndex]
  //       );
  //       KinveyUser.update({
  //         height_unit_preference: this.heightUnits[this.listPickerIndex]
  //       });
  //       this.displayHeightUnit = this.heightUnitsTranslated[
  //         this.listPickerIndex
  //       ];
  //       break;
  //     case 'weight':
  //       this._userService.updateDataProperty(
  //         'weight_unit_preference',
  //         this.weightUnits[this.listPickerIndex]
  //       );
  //       KinveyUser.update({
  //         weight_unit_preference: this.weightUnits[this.listPickerIndex]
  //       });
  //       this.displayWeightUnit = this.weightUnitsTranslated[
  //         this.listPickerIndex
  //       ];
  //       break;
  //     case 'distance':
  //       this._userService.updateDataProperty(
  //         'distance_unit_preference',
  //         this.distanceUnits[this.listPickerIndex]
  //       );
  //       KinveyUser.update({
  //         distance_unit_preference: this.distanceUnits[this.listPickerIndex]
  //       });
  //       this.displayDistanceUnit = this.distanceUnitsTranslated[
  //         this.listPickerIndex
  //       ];
  //       break;
  //     case 'max-speed':
  //       updatedSmartDriveSettings = true;
  //       this.settingsService.settings.maxSpeed = this.SLIDER_VALUE * 10;
  //       break;
  //     case 'acceleration':
  //       updatedSmartDriveSettings = true;
  //       this.settingsService.settings.acceleration = this.SLIDER_VALUE * 10;
  //       break;
  //     case 'tap-sensitivity':
  //       updatedSmartDriveSettings = true;
  //       this.settingsService.settings.tapSensitivity = this.SLIDER_VALUE * 10;
  //       break;
  //     case 'mode':
  //       updatedSmartDriveSettings = true;
  //       this.settingsService.settings.controlMode = this.listPickerItems[
  //         this.listPickerIndex
  //       ];
  //       break;
  //     case 'switch-control-max-speed':
  //       updatedSmartDriveSettings = true;
  //       this.settingsService.switchControlSettings.maxSpeed =
  //         this.SLIDER_VALUE * 10;
  //       break;
  //     case 'switch-control-mode':
  //       updatedSmartDriveSettings = true;
  //       this.settingsService.switchControlSettings.mode =
  //         Device.SwitchControlSettings.Mode.Options[this.listPickerIndex];
  //       break;
  //     case 'theme':
  //       this.CURRENT_THEME = this.listPickerItems[this.listPickerIndex];
  //       if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
  //         enableDefaultTheme();
  //       } else if (this.CURRENT_THEME === APP_THEMES.DARK) {
  //         enableDarkTheme();
  //       }
  //       this._userService.updateDataProperty(
  //         'theme_preference',
  //         this.CURRENT_THEME
  //       );
  //       KinveyUser.update({ theme_preference: this.CURRENT_THEME });
  //       appSettings.setString(STORAGE_KEYS.APP_THEME, this.CURRENT_THEME);
  //       // this.updateWatchIcon({});
  //       console.log(
  //         'brad - look into sending event to MockActionBar to update watch status styling when theme changes'
  //       );
  //       break;
  //     case 'language':
  //       this.CURRENT_LANGUAGE = this.listPickerItems[this.listPickerIndex];
  //       this._userService.updateDataProperty(
  //         'language_preference',
  //         this.CURRENT_LANGUAGE
  //       );
  //       KinveyUser.update({ language_preference: this.CURRENT_LANGUAGE });

  //       const language = APP_LANGUAGES[this.CURRENT_LANGUAGE];
  //       if (this._translateService.currentLang !== language)
  //         this._translateService.use(language);
  //       break;
  //   }
  //   if (updatedSmartDriveSettings) {
  //     this._debouncedCommitSettingsFunction();
  //   }
  // }

  private async _commitSettingsChange() {
    this.syncSuccessful = false;
    const actionbar = this.mockActionBar
      .nativeElement as MockActionbarComponent;

    this.settingsService.saveToFileSystem();

    if (this.user) {
      if (
        this.user.data.control_configuration ===
        CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
      ) {
        // When configuration is PushTracker, commit settings changes
        // to any connected PushTracker. The PushTracker, being master,
        // will then communicate these settings changes to the
        // connected SmartDrive.
        const pts = BluetoothService.PushTrackers.filter(p => p.connected);
        if (pts && pts.length > 0) {
          Log.D('sending to pushtrackers:', pts.map(pt => pt.address));
          actionbar.updateWatchIcon({ data: PushTrackerState.unknown });
          await pts.map(async pt => {
            try {
              await pt.sendSettingsObject(this.settingsService.settings);
              await pt.sendSwitchControlSettingsObject(
                this.settingsService.switchControlSettings
              );
              actionbar.updateWatchIcon({ data: PushTrackerState.connected });
            } catch (err) {
              // Show watch icon 'X'
              actionbar.updateWatchIcon({
                data: PushTrackerState.disconnected
              });
              this._logService.logException(err);
            }
          });
        } else {
          Log.D('no pushtrackers!');
        }
      }
    }

    try {
      await this.settingsService.save();
    } catch (error) {
      this._logService.logException(error);
    }
  }

  private async _onSmartDriveBleVersion(args: any) {
    this._ble_version = SmartDrive.versionByteToString(args.data.ble);
    this._updateSmartDriveSectionLabel();
  }

  private async _onSmartDriveMcuVersion(args: any) {
    this._mcu_version = SmartDrive.versionByteToString(args.data.mcu);
    this._updateSmartDriveSectionLabel();
  }

  private async _updateSmartDriveSectionLabel() {
    if (this._mcu_version && this._ble_version)
      if (this._mcu_version !== '' && this._ble_version !== '')
        if (this._mcu_version !== 'unknown' && this._ble_version !== 'unknown')
          this.versionInfo = `(SD ${this.smartDrive.mcu_version_string}, BT ${this.smartDrive.ble_version_string})`;
  }

  private async _onSmartDriveConnect(args: any) {
    Log.D('SmartDrive connected', this.smartDrive.address);
    this._mcu_version = this.smartDrive.mcu_version_string;
    this._ble_version = this.smartDrive.ble_version_string;
    this._updateSmartDriveSectionLabel();

    Log.D('Able to send settings to SmartDrive?', this.smartDrive.ableToSend);
    if (this.smartDrive && this.smartDrive.ableToSend) {
      this.syncState = this._translateService.instant(
        'profile-settings.sending-settings'
      );
      this._zone.run(async () => {
        try {
          await this.smartDrive.sendSettingsObject(
            this.settingsService.settings
          );
          await this.smartDrive.sendSwitchControlSettingsObject(
            this.settingsService.switchControlSettings
          );
          await this.smartDrive.disconnect();
          this.syncState = this._translateService.instant(
            'profile-settings.sync-successful'
          );
          await this._sleep(3000);
          this.syncingWithSmartDrive = false;
          Log.D(`Done sync'ing with SmartDrive`);
          Log.D(
            'Settings successfully commited to SmartDrive',
            this.smartDrive.address
          );
          Log.D('Syncing with SmartDrive?', this.syncingWithSmartDrive);
          this.syncSuccessful = true;
        } catch (err) {
          this.syncState = this._translateService.instant(
            'profile-settings.error-sending-settings'
          );
          Log.D(
            'Error committing settings to SmartDrive',
            this.smartDrive.address
          );
          Log.D(err);
          this._logService.logException(err);
        }
      });
    }
  }

  private async _onSmartDriveDisconnect(args: any) {
    Log.D('SmartDrive disconnected', this.smartDrive.address);
    // Unregister for SmartDrive connected and disconnected events
    this.smartDrive.off(
      SmartDrive.smartdrive_connect_event,
      this._onSmartDriveConnect,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_ble_version_event,
      this._onSmartDriveBleVersion,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_mcu_version_event,
      this._onSmartDriveMcuVersion,
      this
    );
    this.smartDrive.off(
      SmartDrive.smartdrive_disconnect_event,
      this._onSmartDriveDisconnect,
      this
    );
  }

  private _getTranslationKeyForHeightUnit(key) {
    if (HEIGHT_UNITS[key] === HEIGHT_UNITS.CENTIMETERS)
      return 'units.centimeters';
    else if (HEIGHT_UNITS[key] === HEIGHT_UNITS.FEET_AND_INCHES)
      return 'units.feet-inches';
    else return 'units.centimeters';
  }

  private _getTranslationKeyForWeightUnit(key) {
    if (WEIGHT_UNITS[key] === WEIGHT_UNITS.KILOGRAMS) return 'units.kilograms';
    else if (WEIGHT_UNITS[key] === WEIGHT_UNITS.POUNDS) return 'units.pounds';
    else return 'units.kilograms';
  }

  private _getTranslationKeyForDistanceUnit(key) {
    if (DISTANCE_UNITS[key] === DISTANCE_UNITS.KILOMETERS)
      return 'units.kilometers';
    else if (DISTANCE_UNITS[key] === DISTANCE_UNITS.MILES) return 'units.miles';
    else return 'units.kilometers';
  }

  private _sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
