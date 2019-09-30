import { Component, ElementRef, NgZone, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Device, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import debounce from 'lodash/debounce';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { BottomSheetOptions, BottomSheetService } from 'nativescript-material-bottomsheet/angular';
import * as appSettings from 'tns-core-modules/application-settings';
import { PropertyChangeData } from 'tns-core-modules/data/observable';
import { alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { Switch } from 'tns-core-modules/ui/switch';
import { APP_LANGUAGES, APP_THEMES, CONFIGURATIONS, DISTANCE_UNITS, HEIGHT_UNITS, STORAGE_KEYS, TIME_FORMAT, WEIGHT_UNITS } from '../../enums';
import { PushTracker, SmartDrive } from '../../models';
import { BluetoothService, LoggingService, PushTrackerState, PushTrackerUserService, SettingsService } from '../../services';
import { applyTheme } from '../../utils';
import { ListPickerSheetComponent, MockActionbarComponent, SliderSheetComponent, PushTrackerStatusButtonComponent } from '../shared/components';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  @ViewChild('ptStatusButton', { static: false })
  ptStatusButton: PushTrackerStatusButtonComponent;

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
  timeFormats: string[] = [];
  timeFormatsTranslated: string[] = [];
  displayTimeFormat: string;
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

  /**
   * Used to keep track of the setting value the user is interacting/modifying
   */
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
    this._logService.logBreadCrumb(ProfileSettingsComponent.name, 'ngOnInit');

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

    this.timeFormats = Object.keys(TIME_FORMAT).map(key => TIME_FORMAT[key]);
    this.timeFormatsTranslated = Object.keys(TIME_FORMAT).map(key =>
      this._translateService.instant(this._getTranslationKeyForTimeFormat(key))
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

      if (this.user.data.time_format_preference) {
        index = this.timeFormats.indexOf(
          this.user.data.time_format_preference.toString()
        );
        if (index < 0) index = 0;
        this.displayTimeFormat = this.timeFormatsTranslated[index];
      } else {
        this.displayTimeFormat = this.timeFormatsTranslated[0];
      }
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
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'PushTracker connected: ' + this.versionInfo
          );
        }
      }
    }
  }

  getUser() {
    this.user = this._params.context.user;
    if (this.user && this.user.data) {
      this.CURRENT_LANGUAGE = this.user.data.language_preference || 'English';
    }
  }

  closeModal() {
    this._params.closeCallback('');
    if (this.smartDrive) this.smartDrive.disconnect();
  }

  onSyncSettingsWithSmartDrive(_) {
    this.syncingWithSmartDrive = true;
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'Synchronizing settings with SmartDrive'
    );
    this._scanForSmartDrive()
      .then(async () => {
        if (!this.smartDrive) return;
        await this.smartDrive.connect();
        this._logService.logBreadCrumb(
          ProfileSettingsComponent.name,
          'Connected to SmartDrive: ' + this.smartDrive.address
        );
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
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  async onRefreshTap(_) {
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
    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true
    };

    switch (item.toLowerCase()) {
      case 'height':
        this.activeSetting = 'height';
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
        this.activeSetting = 'weight';
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
        this.activeSetting = 'distance';
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
        this.activeSetting = 'mode';
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
        this.activeSetting = 'switch-control-mode';
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
      case 'time format':
        this.activeSetting = 'time format';
        let userTimeFormatPreference = null;
        if (this.user)
          userTimeFormatPreference =
            this.user.data.time_format_preference || this.timeFormats[0];
        primaryIndex = this.timeFormats.indexOf(userTimeFormatPreference);
        if (primaryIndex < 0) primaryIndex = 0;

        options.context = {
          title: this._translateService.instant('general.time-format'),
          primaryItems: this.timeFormatsTranslated,
          primaryIndex,
          listPickerNeedsSecondary: false
        };
        break;
      case 'theme':
        this.activeSetting = 'theme';
        options.context = {
          title: this._translateService.instant('profile-settings.theme'),
          primaryItems: Object.keys(APP_THEMES),
          primaryIndex: Object.keys(APP_THEMES).indexOf(this.CURRENT_THEME),
          listPickerNeedsSecondary: false
        };
        break;
      case 'language':
        this.activeSetting = 'language';
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
          this._saveListPickerSettings(result.data.primaryIndex);
        }
      });
  }

  onSliderItemTap(item: string) {
    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true
    };

    switch (item.toLowerCase()) {
      case 'max-speed':
        this.activeSetting = 'max-speed';
        options.context = {
          title: this._translateService.instant('general.max-speed'),
          SLIDER_VALUE: this.settingsService.settings.maxSpeed / 10
        };
        break;
      case 'acceleration':
        this.activeSetting = 'acceleration';
        options.context = {
          title: this._translateService.instant('general.acceleration'),
          SLIDER_VALUE: this.settingsService.settings.acceleration / 10
        };
        break;
      case 'tap-sensitivity':
        this.activeSetting = 'tap-sensitivity';
        options.context = {
          title: this._translateService.instant('general.tap-sensitivity'),
          SLIDER_VALUE: this.settingsService.settings.tapSensitivity / 10
        };
        break;
      case 'switch-control-max-speed':
        this.activeSetting = 'switch-control-max-speed';

        options.context = {
          title: this._translateService.instant(
            'general.switch-control-max-speed'
          ),
          SLIDER_VALUE: this.settingsService.switchControlSettings.maxSpeed / 10
        };

        break;
    }

    this._bottomSheet.show(SliderSheetComponent, options).subscribe(result => {
      if (result && result.data) {
        this._logService.logBreadCrumb(
          ProfileSettingsComponent.name,
          `Slider setting new value ${result.data.SLIDER_VALUE} for setting: ${this.activeSetting}`
        );
        this._saveSliderSetting(result.data.SLIDER_VALUE);
      }
    });
  }

  private async _saveListPickerSettings(index) {
    // save settings
    switch (this.activeSetting) {
      case 'height':
        this._userService.updateDataProperty(
          'height_unit_preference',
          this.heightUnits[index]
        );
        KinveyUser.update({
          height_unit_preference: this.heightUnits[index]
        });
        this.displayHeightUnit = this.heightUnitsTranslated[index];
        break;
      case 'weight':
        this._userService.updateDataProperty(
          'weight_unit_preference',
          this.weightUnits[index]
        );
        KinveyUser.update({
          weight_unit_preference: this.weightUnits[index]
        });
        this.displayWeightUnit = this.weightUnitsTranslated[index];
        break;
      case 'distance':
        this._userService.updateDataProperty(
          'distance_unit_preference',
          this.distanceUnits[index]
        );
        KinveyUser.update({
          distance_unit_preference: this.distanceUnits[index]
        });
        this.displayDistanceUnit = this.distanceUnitsTranslated[index];
        break;
      case 'mode':
        this.settingsService.settings.controlMode =
          Device.Settings.ControlMode.Options[index];
        break;
      case 'switch-control-mode':
        this.settingsService.switchControlSettings.mode =
          Device.SwitchControlSettings.Mode.Options[index];
        break;
      case 'time format':
        this._userService.updateDataProperty(
          'time_format_preference',
          this.timeFormats[index]
        );
        KinveyUser.update({
          time_format_preference: this.timeFormats[index]
        });
        this.displayTimeFormat = this.timeFormatsTranslated[index];
        break;
      case 'theme':
        this.CURRENT_THEME = Object.keys(APP_THEMES)[index];
        applyTheme(this.CURRENT_THEME);
        appSettings.setString(STORAGE_KEYS.APP_THEME, this.CURRENT_THEME);
        // Update PushTracker watch icon color
        if (this.ptStatusButton) {
          this.ptStatusButton.CURRENT_THEME = this.CURRENT_THEME;
          this.ptStatusButton.updateWatchIcon({});
        }
        break;
      case 'language':
        this.CURRENT_LANGUAGE = Object.keys(APP_LANGUAGES)[index];
        this._userService.updateDataProperty(
          'language_preference',
          this.CURRENT_LANGUAGE
        );
        KinveyUser.update({ language_preference: this.CURRENT_LANGUAGE });
        const language = APP_LANGUAGES[this.CURRENT_LANGUAGE];
        if (this._translateService.currentLang !== language)
          this._translateService.use(language);
        break;
    }
    // Update local cache of this.user in appSettings
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
    this._debouncedCommitSettingsFunction();
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      `User updated setting: ${this.activeSetting} to: ${index}`
    );
  }

  private async _saveSliderSetting(newValue) {
    switch (this.activeSetting) {
      case 'max-speed':
        this.settingsService.settings.maxSpeed = newValue * 10;
        break;
      case 'acceleration':
        this.settingsService.settings.acceleration = newValue * 10;
        break;
      case 'tap-sensitivity':
        this.settingsService.settings.tapSensitivity = newValue * 10;
        break;
      case 'switch-control-max-speed':
        this.settingsService.switchControlSettings.maxSpeed = newValue * 10;
        break;
      default:
        this._logService.logBreadCrumb(
          ProfileSettingsComponent.name,
          'no matching setting found for updating slider setting'
        );
        break;
    }

    this._debouncedCommitSettingsFunction();

    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      `User updated setting: ${this.activeSetting} to: ${newValue}`
    );
  }

  private async _commitSettingsChange() {
    this.syncSuccessful = false;
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
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'Sending to pushtrackers: ' + pts.map(pt => pt.address)
          );
          if (this.ptStatusButton)
            this.ptStatusButton.updateWatchIcon({ data: PushTrackerState.unknown });
          await pts.map(async pt => {
            try {
              await pt.sendSettingsObject(this.settingsService.settings);
              await pt.sendSwitchControlSettingsObject(
                this.settingsService.switchControlSettings
              );
              if (this.ptStatusButton)
                this.ptStatusButton.updateWatchIcon({ data: PushTrackerState.connected });
            } catch (err) {
              // Show watch icon 'X'
              this._logService.logException(err);
            }
          });
        } else {
          if (this.ptStatusButton)
            this.ptStatusButton.updateWatchIcon({ data: PushTrackerState.disconnected });
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'no pushtrackers!'
          );
        }
      }
    }

    try {
      await this.settingsService.save();
    } catch (error) {
      this._logService.logException(error);
    }
  }

  private async _scanForSmartDrive(force: boolean = false) {
    this.syncState = this._translateService.instant(
      'profile-settings.scanning-for-smartdrives'
    );
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'Scanning for SmartDrives'
    );
    if (!force && this.smartDrive && this.smartDrive.address) {
      this.syncState = this._translateService.instant(
        'profile-settings.detected-a-smartdrive'
      );
      this._logService.logBreadCrumb(
        ProfileSettingsComponent.name,
        'Scan is not forced - Already have a SmartDrive: ' +
          this.smartDrive.address
      );
      return true;
    }
    if (
      this.user.data.control_configuration ===
      CONFIGURATIONS.SWITCHCONTROL_WITH_SMARTDRIVE
    ) {
      return this._bluetoothService
        .scanForSmartDriveReturnOnFirst(10)
        .then(() => {
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
              this._logService.logBreadCrumb(
                ProfileSettingsComponent.name,
                'SmartDrive detected: ' + this.smartDrive.address
              );
              this._logService.logBreadCrumb(
                ProfileSettingsComponent.name,
                'Scan successful'
              );
              this.syncState = this._translateService.instant(
                'profile-settings.detected-a-smartdrive'
              );
            });
            return true;
          }
        })
        .catch(err => {
          this._logService.logException(err);
        });
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

  private async _onSmartDriveConnect(_: any) {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'SmartDrive connected: ' + this.smartDrive.address
    );
    this._mcu_version = this.smartDrive.mcu_version_string;
    this._ble_version = this.smartDrive.ble_version_string;
    this._updateSmartDriveSectionLabel();

    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'Able to send settings to SmartDrive? ' + this.smartDrive.ableToSend
    );
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
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            `Done sync'ing with SmartDrive`
          );
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'Settings successfully commited to SmartDrive: ' +
              this.smartDrive.address
          );
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'Syncing with SmartDrive? ' + this.syncingWithSmartDrive
          );
          this.syncSuccessful = true;
        } catch (err) {
          this.syncState = this._translateService.instant(
            'profile-settings.error-sending-settings'
          );
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'Error committing settings to SmartDrive: ' +
              this.smartDrive.address
          );
          this._logService.logBreadCrumb(ProfileSettingsComponent.name, err);
          this._logService.logException(err);
        }
      });
    }
  }

  private async _onSmartDriveDisconnect(_: any) {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'SmartDrive disconnected: ' + this.smartDrive.address
    );
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

  private _getTranslationKeyForTimeFormat(key) {
    if (TIME_FORMAT[key] === TIME_FORMAT.AM_PM) return 'units.time.am-pm';
    else if (TIME_FORMAT[key] === TIME_FORMAT.MILITARY)
      return 'units.time.military';
    else return 'units.time.am-pm';
  }

  private _sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
