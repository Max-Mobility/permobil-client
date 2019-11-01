import { Device, Log } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import { Observable } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';

export class ChangeSettingsViewModel extends Observable {
  @Prop() insetPadding = 0;
  @Prop() chinSize = 0;
  @Prop() tempSettings = new Device.Settings();
  @Prop() tempSwitchControlSettings = new Device.SwitchControlSettings();
  @Prop() disableWearCheck: boolean = false;
  /**
   * SmartDrive Settings UI:
   */
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';

  private _closeCallback;

  constructor(page: Page, data) {
    super();

    this.activeSettingToChange = data.activeSettingToChange;
    this.changeSettingKeyString = data.changeSettingKeyString;
    this.changeSettingKeyValue = data.changeSettingKeyValue;
    this.disableWearCheck = data.disableWearCheck;
    this.tempSettings.copy(data.tempSettings);
    this.tempSwitchControlSettings.copy(data.switchControlSettings);
    this._closeCallback = data.closeCallback;

    this._updateSettingsChangeDisplay();
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.activeSettingToChange);
    this.tempSwitchControlSettings.increase(this.activeSettingToChange);
    if (this.activeSettingToChange === 'wearcheck') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    this._updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap() {
    this.tempSettings.decrease(this.activeSettingToChange);
    this.tempSwitchControlSettings.decrease(this.activeSettingToChange);
    if (this.activeSettingToChange === 'wearcheck') {
      this.disableWearCheck = !this.disableWearCheck;
    }
    this._updateSettingsChangeDisplay();
  }

  onSettingsInfoItemTap() {
    Log.D(this.activeSettingToChange, this.changeSettingKeyString);
    const messageKey = 'settings.description.' + this.activeSettingToChange;
    const message = this.changeSettingKeyString + '\n\n' + L(messageKey);
    alert({
      title: L('settings.information'),
      message: message,
      okButtonText: L('buttons.ok')
    });
  }

  onConfirmChangesTap() {
    this._closeCallback(
      true,
      this.tempSettings,
      this.tempSwitchControlSettings,
      this.disableWearCheck
    );
  }

  private _updateSettingsChangeDisplay() {
    let translationKey = '';
    switch (this.activeSettingToChange) {
      case 'maxspeed':
        this.changeSettingKeyValue = `${this.tempSettings.maxSpeed} %`;
        break;
      case 'acceleration':
        this.changeSettingKeyValue = `${this.tempSettings.acceleration} %`;
        break;
      case 'tapsensitivity':
        this.changeSettingKeyValue = `${this.tempSettings.tapSensitivity} %`;
        break;
      case 'powerassistbuzzer':
        if (this.tempSettings.disablePowerAssistBeep) {
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
        this.changeSettingKeyValue = `${this.tempSettings.controlMode}`;
        return;
      case 'units':
        translationKey =
          'sd.settings.units.' + this.tempSettings.units.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'switchcontrolmode':
        translationKey =
          'sd.switch-settings.mode.' +
          this.tempSwitchControlSettings.mode.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'switchcontrolspeed':
        this.changeSettingKeyValue = `${this.tempSwitchControlSettings.maxSpeed} %`;
        return;
      case 'wearcheck':
        if (this.disableWearCheck) {
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
