import {
  Component,
  NgZone,
  OnInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import {
  BottomSheetOptions,
  BottomSheetService
} from '@nativescript-community/ui-material-bottomsheet/angular';
import { ModalDialogParams } from '@nativescript/angular';
import {
  getVersionCodeSync,
  getVersionNameSync
} from '@nativescript/appversion';
import {
  ApplicationSettings as appSettings,
  Device,
  Dialogs,
  Page,
  PropertyChangeData,
  Switch,
  Utils
} from '@nativescript/core';
import { TranslateService } from '@ngx-translate/core';
import { Device as PermobilCoreDevice } from '@permobil/core';
import debounce from 'lodash/debounce';
import once from 'lodash/once';
import {
  APP_LANGUAGES,
  APP_THEMES,
  CONFIGURATIONS,
  DISTANCE_UNITS,
  HEIGHT_UNITS,
  STORAGE_KEYS,
  TIME_FORMAT,
  WEIGHT_UNITS
} from '../../enums';
import {
  DeviceBase,
  PushTracker,
  PushTrackerData,
  PushTrackerUser,
  SmartDrive
} from '../../models';
import { SmartDriveData } from '../../namespaces';
import {
  BluetoothService,
  LoggingService,
  PushTrackerState,
  PushTrackerUserService,
  SettingsService,
  ThemeService,
  TranslationService
} from '../../services';
import { applyTheme } from '../../utils';
import {
  ListPickerSheetComponent,
  PushTrackerStatusButtonComponent,
  SliderSheetComponent
} from '../shared/components';

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

  appBuildDisplay = '';

  /**
   * Used to keep track of the setting value the user is interacting/modifying
   */
  private activeSetting: string = null;
  private _debouncedCommitSettingsFunction: any = null;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 1000;
  private smartDrive: SmartDrive = undefined;

  constructor(
    public settingsService: SettingsService,
    private _userService: PushTrackerUserService,
    private _logService: LoggingService,
    private _translationService: TranslationService,
    private _translateService: TranslateService,
    private _page: Page,
    private _themeService: ThemeService,
    private _params: ModalDialogParams,
    private _bluetoothService: BluetoothService,
    private _zone: NgZone,
    private _bottomSheet: BottomSheetService,
    private _vcRef: ViewContainerRef
  ) { }

  ngOnInit() {
    this._logService.logBreadCrumb(ProfileSettingsComponent.name, 'ngOnInit');

    this._translationService
      .updateTranslationFilesFromKinvey()
      .then(() => {
        this._logService.logBreadCrumb(
          ProfileSettingsComponent.name,
          'Updated translation files'
        );
      })
      .catch(error => {
        this._logService.logBreadCrumb(
          ProfileSettingsComponent.name,
          'Error updating translation files: ' + error
        );
      });

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

    // update app build version for display
    const appVersionName = getVersionNameSync();
    const appVersionCode = getVersionCodeSync();
    this.appBuildDisplay = `${appVersionName} - ${appVersionCode}`;

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
      this.registerPushTrackerEvents();
      const ptConnected = BluetoothService.PushTrackers.filter(pt => {
        return pt.connected === true;
      });
      if (ptConnected && ptConnected.length === 1) {
        const pt = ptConnected[0];
        this._updatePushTrackerSectionLabel(pt);
      }
    }
  }

  /**
   * BLUETOOTH EVENT MANAGEMENT
   */
  private unregisterPushTrackerEvents() {
    this._bluetoothService.off(
      BluetoothService.pushtracker_added,
      this.onPushTrackerAdded,
      this
    );
    BluetoothService.PushTrackers.map(pt => {
      pt.off(PushTracker.version_event, this.onPushTrackerVersionInfo, this);
      pt.off(PushTracker.daily_info_event, this.onPushTrackerVersionInfo, this);
    });
  }

  private _registerEventsForPT(pt: PushTracker) {
    // unregister
    pt.off(PushTracker.version_event, this.onPushTrackerVersionInfo, this);
    pt.off(PushTracker.daily_info_event, this.onPushTrackerVersionInfo, this);
    // register for version and info events
    pt.on(PushTracker.version_event, this.onPushTrackerVersionInfo, this);
    pt.once(PushTracker.daily_info_event, this.onPushTrackerVersionInfo, this);
  }

  private registerPushTrackerEvents() {
    this.unregisterPushTrackerEvents();
    // handle pushtracker pairing events for existing pushtrackers
    BluetoothService.PushTrackers.map(pt => {
      this._registerEventsForPT(pt);
    });

    // listen for completely new pusthrackers (that we haven't seen before)
    this._bluetoothService.on(
      BluetoothService.pushtracker_added,
      this.onPushTrackerAdded,
      this
    );
  }

  onPushTrackerAdded(args: any) {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'PushTracker Added event received from BLE service'
    );
    this._registerEventsForPT(args.data.pt);
  }

  onPushTrackerVersionInfo(args: any) {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'PushTracker Version Info received'
    );
    const pt = args.object as PushTracker;
    this._updatePushTrackerSectionLabel(pt);
  }

  getUser() {
    this.user = KinveyUser.getActiveUser() as PushTrackerUser;
    let defaultLanguage = 'English';
    Object.entries(APP_LANGUAGES).forEach(([key, value]) => {
      if (Device.language.startsWith(value)) {
        defaultLanguage = key;
      }
    });
    if (this.user && this.user.data) {
      this.CURRENT_LANGUAGE =
        this.user.data.language_preference || defaultLanguage;
    } else {
      this.CURRENT_LANGUAGE = defaultLanguage;
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
          SmartDrive.smartdrive_motor_info_event,
          this._onSmartDriveMotorInfo,
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

  private _changedSettingsWhichRequireUpdate: boolean = false;
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
        if (
          isChecked !== this.settingsService.settings.disablePowerAssistBeep
        ) {
          this._changedSettingsWhichRequireUpdate = true;
          updatedSmartDriveSettings = true;
        }
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
    console.log('list picker item tap', item);
    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true
    };

    let primaryIndex;

    switch (item.toLowerCase()) {
      case 'height':
        this.activeSetting = 'height';
        let userHeightUnitPreference = null;
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
        const primaryItems = PermobilCoreDevice.Settings.ControlMode.Options;
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
          primaryItems: PermobilCoreDevice.SwitchControlSettings.Mode.Options.map(
            o => {
              const translationKey =
                'sd.switch-settings.mode.' + o.toLowerCase();
              return this._translateService.instant(translationKey);
            }
          ),
          primaryIndex: PermobilCoreDevice.SwitchControlSettings.Mode.Options.indexOf(
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

  private async updateUser(update: any) {
    let didUpdate = false;
    try {
      await this.user.update(update);
      didUpdate = true;
    } catch (err) {
      this._logService.logBreadCrumb(
        ProfileSettingsComponent.name,
        'Could not update the user - ' + err
      );
      Utils.setTimeout(() => {
        Dialogs.alert({
          title: this._translateService.instant(
            'profile-tab.network-error.title'
          ),
          message: this._translateService.instant(
            'profile-tab.network-error.message'
          ),
          okButtonText: this._translateService.instant('profile-tab.ok')
        });
      }, 1000);
    }
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
    return didUpdate;
  }

  private async _saveListPickerSettings(index) {
    // save settings
    let didUpdate = false;
    switch (this.activeSetting) {
      case 'height':
        didUpdate = await this.updateUser({
          height_unit_preference: this.heightUnits[index]
        });
        if (didUpdate) {
          this.displayHeightUnit = this.heightUnitsTranslated[index];
          this._userService.emitEvent(
            PushTrackerUserService.units_change_event,
            { height_unit_preference: this.heightUnits[index] }
          );
        }
        break;
      case 'weight':
        didUpdate = await this.updateUser({
          weight_unit_preference: this.weightUnits[index]
        });
        if (didUpdate) {
          this.displayWeightUnit = this.weightUnitsTranslated[index];
          this._userService.emitEvent(
            PushTrackerUserService.units_change_event,
            { weight_unit_preference: this.weightUnits[index] }
          );
        }
        break;
      case 'distance':
        didUpdate = await this.updateUser({
          distance_unit_preference: this.distanceUnits[index]
        });
        if (didUpdate) {
          this.displayDistanceUnit = this.distanceUnitsTranslated[index];
          this._userService.emitEvent(
            PushTrackerUserService.units_change_event,
            { distance_unit_preference: this.distanceUnits[index] }
          );
        }
        break;
      case 'mode':
        this.settingsService.settings.controlMode =
          PermobilCoreDevice.Settings.ControlMode.Options[index];
        break;
      case 'switch-control-mode':
        this._changedSettingsWhichRequireUpdate = true;
        this.settingsService.switchControlSettings.mode =
          PermobilCoreDevice.SwitchControlSettings.Mode.Options[index];
        break;
      case 'time format':
        didUpdate = await this.updateUser({
          time_format_preference: this.timeFormats[index]
        });
        if (didUpdate) {
          this.displayTimeFormat = this.timeFormatsTranslated[index];
        }
        break;
      case 'theme':
        this.CURRENT_THEME = Object.keys(APP_THEMES)[index];
        applyTheme(this.CURRENT_THEME);
        appSettings.setString(STORAGE_KEYS.APP_THEME, this.CURRENT_THEME);
        this._themeService.updateTheme(this.CURRENT_THEME);
        // Update PushTracker watch icon color
        if (this.ptStatusButton) {
          this.ptStatusButton.CURRENT_THEME = this.CURRENT_THEME;
          this.ptStatusButton.updateWatchIcon();
        }
        break;
      case 'language':
        const newLanguage = Object.keys(APP_LANGUAGES)[index];
        didUpdate = await this.updateUser({ language_preference: newLanguage });
        if (didUpdate) {
          this.CURRENT_LANGUAGE = newLanguage;
          const language = APP_LANGUAGES[this.CURRENT_LANGUAGE];
          if (this._translateService.currentLang !== language) {
            this._translateService.reloadLang(language);
            this._translateService.use(language);
          }
        }
        break;
    }
    if (this.activeSetting !== 'theme') this._debouncedCommitSettingsFunction();
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
        this._changedSettingsWhichRequireUpdate = true;
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

  private async _showUpdateWarning(ptsUpToDate: boolean, sdsUpToDate: boolean) {
    // use set timeout so iOS can show the alert
    Utils.setTimeout(() => {
      if (this._changedSettingsWhichRequireUpdate) {
        this._changedSettingsWhichRequireUpdate = false;
        // Alert user if they are sync-ing settings to a pushtracker
        // or smartdrive which is out of date -
        // https://github.com/Max-Mobility/permobil-client/issues/516
        // TODO: should get this version from the server somewhere!
        if (!sdsUpToDate && !ptsUpToDate) {
          // both the pushtrackers and the smartdrives are not up to date
          Dialogs.alert({
            title: this._translateService.instant(
              'profile-settings.update-notice.title'
            ),
            message: this._translateService.instant(
              'profile-settings.update-notice.both-settings-require-update'
            ),
            okButtonText: this._translateService.instant('profile-tab.ok')
          });
        } else if (!sdsUpToDate) {
          // the pushtrackers are up to date but the smartdrives are not
          Dialogs.alert({
            title: this._translateService.instant(
              'profile-settings.update-notice.title'
            ),
            message: this._translateService.instant(
              'profile-settings.update-notice.smartdrive-settings-require-update'
            ),
            okButtonText: this._translateService.instant('profile-tab.ok')
          });
        } else if (!ptsUpToDate) {
          // only the pushtrackers are out of date
          Dialogs.alert({
            title: this._translateService.instant(
              'profile-settings.update-notice.title'
            ),
            message: this._translateService.instant(
              'profile-settings.update-notice.pushtracker-settings-require-update'
            ),
            okButtonText: this._translateService.instant('profile-tab.ok')
          });
        }
      }
    }, 300);
  }

  private async _getLatestVersionInfo() {
    // get the latest version from what the updates component has
    // downloaded (stored in appsettings), default to latest when the
    // app was released if there is nothing there
    const pt_info_str = appSettings.getString(PushTrackerData.Firmware.TableName, '{}');
    const sd_info_str = appSettings.getString(SmartDriveData.Firmwares.TableName, '{}');
    let latest_pt = '2.1';
    let latest_mcu = '2.0';
    let latest_ble = '2.0';
    // parse the pt info
    try {
      const pt_info = JSON.parse(pt_info_str);
      if (pt_info['PushTracker.ota']) {
        latest_pt = PushTracker.versionByteToString(pt_info['PushTracker.ota'].version);
      }
    } catch (err) {
      this._logService.logBreadCrumb(
        ProfileSettingsComponent.name,
        'Could not parse pt info: ' + err
      );
    }
    // parse the sd info
    try {
      const sd_info = JSON.parse(sd_info_str);
      if (sd_info['SmartDriveMCU.ota']) {
        latest_mcu = PushTracker.versionByteToString(sd_info['SmartDriveMCU.ota'].version);
      }
      if (sd_info['SmartDriveBLE.ota']) {
        latest_ble = PushTracker.versionByteToString(sd_info['SmartDriveBLE.ota'].version);
      }
    } catch (err) {
      this._logService.logBreadCrumb(
        ProfileSettingsComponent.name,
        'Could not parse sd info: ' + err
      );
    }
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'Got latest versions: ' +
      latest_pt + ', ' +
      latest_mcu + ', ' +
      latest_ble
    );
    // return the structure
    return {
      'pt': latest_pt,
      'mcu': latest_mcu,
      'ble': latest_ble,
    };
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
            'Sending to pushtrackers: ' +
            pts.map(pt => pt.address) +
            ' - ' +
            this._changedSettingsWhichRequireUpdate
          );

          // note - we are not using the latest info here because
          // right now we only care if they are at least 2.0 - at
          // which point they can receive the latest settings this app
          // provides.

          const ptsUpToDate = pts.reduce((upToDate, pt) => {
            return upToDate && pt.isUpToDate('2.0');
          }, true);
          const sdsUpToDate = pts.reduce((upToDate, pt) => {
            return upToDate && pt.isSmartDriveUpToDate('2.0');
          }, true);
          this._showUpdateWarning(ptsUpToDate, sdsUpToDate);

          if (this.ptStatusButton)
            this.ptStatusButton.state = PushTrackerState.busy;
          pts.forEach(async pt => {
            try {
              await pt.sendSettingsObject(this.settingsService.settings);
              await this._sleep(300);
              await pt.sendSwitchControlSettingsObject(
                this.settingsService.switchControlSettings
              );
              if (this.ptStatusButton)
                this.ptStatusButton.state = PushTrackerState.connected;
            } catch (err) {
              // Show watch icon 'X'
              this._logService.logException(err);
            }
          });
          // now that all PTs have had their settings updated, we
          // probably want to update the icon
          this.ptStatusButton.state = PushTrackerState.connected;
        } else {
          if (this.ptStatusButton)
            this.ptStatusButton.state = PushTrackerState.disconnected;
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
            Dialogs.alert({
              message:
                'Failed to detect a SmartDrive. Please make sure that your SmartDrive is switched ON and nearby.',
              okButtonText: this._translateService.instant('general.ok')
            });
            this.syncingWithSmartDrive = false;
            return false;
          } else if (drives.length > 1) {
            Dialogs.alert({
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
    this._updateSmartDriveSectionLabel();
  }

  private async _onSmartDriveMcuVersion(args: any) {
    this._updateSmartDriveSectionLabel();
  }

  private async _updatePushTrackerSectionLabel(pt: PushTracker) {
    if (pt.hasVersionInfo()) {
      this._zone.run(() => {
        const ptVersionString = DeviceBase.versionByteToString(pt.version);
        const btVersionString = DeviceBase.versionByteToString(pt.ble_version);
        const sdVersionString = DeviceBase.versionByteToString(pt.mcu_version);
        this.versionInfo = `(PT ${ptVersionString}, SD ${sdVersionString}, BT ${btVersionString})`;
      });
    }
  }

  private async _updateSmartDriveSectionLabel() {
    this._zone.run(async () => {
      if (this.smartDrive.hasVersionInfo()) {
        this.versionInfo = `(SD ${this.smartDrive.mcu_version_string}, BT ${this.smartDrive.ble_version_string})`;
      }
    });
  }

  private _onceSyncAndDisconnect: any = null;
  private async _syncAndDisconnectSmartDrive() {
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
          // update the label
          this._updateSmartDriveSectionLabel();
          // again, we statically check against 2.0 since that's the
          // one that matters w.r.t. the settings this app currently
          // sends
          this._showUpdateWarning(true, this.smartDrive.isUpToDate('2.0'));

          // now actually send the data
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
          this.syncSuccessful = true;
          await this._sleep(300);
          this.syncingWithSmartDrive = false;
          this._logService.logBreadCrumb(
            ProfileSettingsComponent.name,
            'Done sync-ing with SmartDrive'
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

  private async _onSmartDriveMotorInfo(_: any) {
    this._onceSyncAndDisconnect();
  }

  private async _onSmartDriveConnect(_: any) {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.name,
      'SmartDrive connected: ' + this.smartDrive.address
    );
    // set the once handler here for sending data
    this._onceSyncAndDisconnect = once(
      this._syncAndDisconnectSmartDrive.bind(this)
    );
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
      SmartDrive.smartdrive_motor_info_event,
      this._onSmartDriveMotorInfo,
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
    return new Promise(resolve => Utils.setTimeout(resolve, ms));
  }
}
