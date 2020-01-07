import { Observable, Page, ShowModalOptions } from '@nativescript/core';
import { Device } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import { SettingsService } from '../../../services';
import { configureLayout, sentryBreadCrumb } from '../../../utils';

export class SettingsViewModel extends Observable {
  @Prop() insetPadding = 0;
  @Prop() chinSize = 0;
  /**
   * SmartDrive Settings UI:
   */
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';
  private _tempSettings = new Device.Settings();
  private _tempSwitchControlSettings = new Device.SwitchControlSettings();
  private _settingsService: SettingsService;
  private _showingModal: boolean = false;

  constructor(page: Page, settingsService: SettingsService, data) {
    super();
    this._settingsService = settingsService;
    this._settingsService.loadSettings();
    const wearOsLayout: any = page.getViewById('wearOsLayout');
    const res = configureLayout(wearOsLayout);
    this.chinSize = res.chinSize;
    this.insetPadding = res.insetPadding;
    wearOsLayout.nativeView.setPadding(
      this.insetPadding,
      this.insetPadding,
      this.insetPadding,
      0
    );
  }

  onChangeSettingsItemTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing change settings');
      return;
    }
    // copy the current settings into temporary store
    this._tempSettings.copy(this._settingsService.settings);
    this._tempSwitchControlSettings.copy(
      this._settingsService.switchControlSettings
    );
    const tappedId = args.object.id as string;
    this.activeSettingToChange = tappedId.toLowerCase();
    switch (this.activeSettingToChange) {
      case 'maxspeed':
        this.changeSettingKeyString = L('settings.max-speed');
        break;
      case 'acceleration':
        this.changeSettingKeyString = L('settings.acceleration');
        break;
      case 'tapsensitivity':
        this.changeSettingKeyString = L('settings.tap-sensitivity');
        break;
      case 'powerassistbuzzer':
        this.changeSettingKeyString = L('settings.power-assist-buzzer');
        break;
      case 'controlmode':
        this.changeSettingKeyString = L('settings.control-mode');
        break;
      case 'units':
        this.changeSettingKeyString = L('settings.units');
        break;
      case 'switchcontrolmode':
        this.changeSettingKeyString = L('switch-control.mode');
        break;
      case 'switchcontrolspeed':
        this.changeSettingKeyString = L('switch-control.max-speed');
        break;
      case 'wearcheck':
        this.changeSettingKeyString = L('settings.watch-required.title');
        break;
      default:
        break;
    }
    this.updateSettingsChangeDisplay();
    const changeSettingsPage =
      'pages/modals/change-settings/change-settings-page';
    const btn = args.object;
    const option: ShowModalOptions = {
      context: {
        activeSettingToChange: this.activeSettingToChange,
        changeSettingKeyString: this.changeSettingKeyString,
        changeSettingKeyValue: this.changeSettingKeyValue,
        disableWearCheck: this._settingsService.disableWearCheck,
        settings: this._settingsService.settings,
        switchControlSettings: this._settingsService.switchControlSettings
      },
      closeCallback: (
        confirmedByUser: boolean,
        _tempSettings: Device.Settings,
        _tempSwitchControlSettings: Device.SwitchControlSettings,
        disableWearCheck: boolean
      ) => {
        this._showingModal = false;
        if (confirmedByUser) {
          this._settingsService.settings.copy(_tempSettings);
          this._settingsService.switchControlSettings.copy(
            _tempSwitchControlSettings
          );
          this._settingsService.disableWearCheck = disableWearCheck;
          this._settingsService.hasSentSettings = false;
          this._settingsService.saveSettings();
          // // now update any display that needs settings:
          // this.updateSettingsDisplay();
          // warning / indication to the user that they've updated their settings
          alert({
            title: L('warnings.saved-settings.title'),
            message: L('warnings.saved-settings.message'),
            okButtonText: L('buttons.ok')
          });
        }
      },
      animated: false,
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal(changeSettingsPage, option);
  }

  updateSettingsChangeDisplay() {
    let translationKey = '';
    switch (this.activeSettingToChange) {
      case 'maxspeed':
        this.changeSettingKeyValue = `${this._tempSettings.maxSpeed} %`;
        break;
      case 'acceleration':
        this.changeSettingKeyValue = `${this._tempSettings.acceleration} %`;
        break;
      case 'tapsensitivity':
        this.changeSettingKeyValue = `${this._tempSettings.tapSensitivity} %`;
        break;
      case 'powerassistbuzzer':
        if (this._tempSettings.disablePowerAssistBeep) {
          this.changeSettingKeyValue = L(
            'sd.settings.power-assist-buzzer.disabled'
          );
        } else {
          this.changeSettingKeyValue = L(
            'sd.settings.power-assist-buzzer.enabled'
          );
        }
        break;
      case 'controlmode':
        this.changeSettingKeyValue = `${this._tempSettings.controlMode}`;
        return;
      case 'units':
        translationKey =
          'sd.settings.units.' + this._tempSettings.units.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'switchcontrolmode':
        translationKey =
          'sd.switch-settings.mode.' +
          this._tempSwitchControlSettings.mode.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'switchcontrolspeed':
        this.changeSettingKeyValue = `${this._tempSwitchControlSettings.maxSpeed} %`;
        return;
      case 'wearcheck':
        if (this._settingsService.disableWearCheck) {
          this.changeSettingKeyValue = L(
            'settings.watch-required.values.disabled'
          );
        } else {
          this.changeSettingKeyValue = L(
            'settings.watch-required.values.enabled'
          );
        }
        break;
      default:
        break;
    }
  }
}
