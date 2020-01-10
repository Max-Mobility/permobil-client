import { Device, Log } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import { Observable, Page } from '@nativescript/core';
import { WatchSettings } from '../../../models';

export class ChangeSettingsViewModel extends Observable {
  @Prop() insetPadding = 0;
  @Prop() chinSize = 0;
  @Prop() tempSettings = new Device.Settings();
  @Prop() tempSwitchControlSettings = new Device.SwitchControlSettings();
  @Prop() tempWatchSettings = new WatchSettings();
  /**
   * SmartDrive Settings UI:
   */
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';

  private _closeCallback;

  constructor(page: Page, data, closeCallback) {
    super();

    // copy the settings into temporary storage
    this.tempSettings.copy(data.settings);
    this.tempSwitchControlSettings.copy(data.switchControlSettings);
    this.tempWatchSettings.copy(data.watchSettings);

    // determine which one we are changing
    this.activeSettingToChange = data.activeSettingToChange;
    // now set the displayed setting label
    this._updateSettingsLabelDisplay();
    // now set the displayed setting value
    this._updateSettingsValueDisplay();
    // save the close callback to bind to buttons
    this._closeCallback = closeCallback;
  }

  onIncreaseSettingsTap() {
    this.tempSettings.increase(this.activeSettingToChange);
    this.tempSwitchControlSettings.increase(this.activeSettingToChange);
    this.tempWatchSettings.increase(this.activeSettingToChange);
    this._updateSettingsValueDisplay();
  }

  onDecreaseSettingsTap() {
    this.tempSettings.decrease(this.activeSettingToChange);
    this.tempSwitchControlSettings.decrease(this.activeSettingToChange);
    this.tempWatchSettings.decrease(this.activeSettingToChange);
    this._updateSettingsValueDisplay();
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
      this.tempWatchSettings
    );
  }

  private _updateSettingsLabelDisplay() {
    // set the displayed settings label based on the selected setting
    this.changeSettingKeyString =
      this.tempSettings.displayLabel(this.activeSettingToChange, L) ||
      this.tempSwitchControlSettings.displayLabel(this.activeSettingToChange, L) ||
      this.tempWatchSettings.displayLabel(this.activeSettingToChange, L);
  }

  private _updateSettingsValueDisplay() {
    // now set the displayed value
    this.changeSettingKeyValue =
      this.tempSettings.displayValue(this.activeSettingToChange, L) ||
      this.tempSwitchControlSettings.displayValue(this.activeSettingToChange, L) ||
      this.tempWatchSettings.displayValue(this.activeSettingToChange, L);
  }
}
