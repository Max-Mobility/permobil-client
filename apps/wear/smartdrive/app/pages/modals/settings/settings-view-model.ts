import { EventData, Observable } from 'tns-core-modules/data/observable';
import { Log, Device } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import { ShowModalOptions } from 'tns-core-modules/ui/page/page';
import * as appSettings from 'tns-core-modules/application-settings';
import { DataKeys } from '../../../enums';
import * as LS from 'nativescript-localstorage';
import { SettingsService } from '../../../services';
import { ReflectiveInjector } from 'injection-js';

export class SettingsViewModel extends Observable {
  /**
   * SmartDrive Settings UI:
   */
  @Prop() activeSettingToChange = '';
  @Prop() changeSettingKeyString = ' ';
  @Prop() changeSettingKeyValue: any = ' ';
  private tempSettings = new Device.Settings();
  private tempSwitchControlSettings = new Device.SwitchControlSettings();
  settingsService: SettingsService;

  async onSettingsPageLoaded(args: EventData) {
    // this.settingsService.loadSettings();
  }

  onChangeSettingsItemTap(args) {
    // copy the current settings into temporary store
    this.tempSettings.copy(this.settingsService.settings);
    this.tempSwitchControlSettings.copy(this.settingsService.switchControlSettings);
    const tappedId = (args.object as any).id as string;
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
    const changeSettingsPage = 'pages/modals/change-settings/change-settings-page';
    const btn = args.object;
    const option: ShowModalOptions = {
        context: {
            activeSettingToChange: this.activeSettingToChange,
            changeSettingKeyString: this.changeSettingKeyString,
            changeSettingKeyValue: this.changeSettingKeyValue,
            disableWearCheck: this.settingsService.disableWearCheck,
            settings: this.settingsService.settings,
            switchControlSettings: this.settingsService.switchControlSettings
        },
        closeCallback: (confirmedByUser, tempSettings, tempSwitchControlSettings, disableWearCheck) => {
            if (confirmedByUser) {
                this.settingsService.settings.copy(tempSettings);
                this.settingsService.switchControlSettings.copy(tempSwitchControlSettings);
                this.settingsService.disableWearCheck = disableWearCheck;
                this.settingsService.hasSentSettings = false;
                this.settingsService.saveSettings();
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
    btn.showModal(changeSettingsPage, option);
  }

  updateSettingsChangeDisplay() {
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
        if (this.settingsService.disableWearCheck) {
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