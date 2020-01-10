import { Observable, Page, ShowModalOptions } from '@nativescript/core';
import { Device } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import { WearOsLayout } from 'nativescript-wear-os';
import { SettingsService } from '../../../services';
import { configureLayout, sentryBreadCrumb } from '../../../utils';
import { WatchSettings } from '../../../models';

export class SettingsViewModel extends Observable {
  @Prop() insetPadding = 0;
  @Prop() chinSize = 0;
  /**
   * SmartDrive Settings UI:
   */
  @Prop() activeSettingToChange = '';
  private _tempSettings = new Device.Settings();
  private _tempSwitchControlSettings = new Device.SwitchControlSettings();
  private _tempWatchSettings = new WatchSettings();
  private _settingsService: SettingsService;
  private _showingModal: boolean = false;

  constructor(page: Page, settingsService: SettingsService, data) {
    super();
    this._settingsService = settingsService;
    this._settingsService.loadSettings();
    const wearOsLayout: WearOsLayout = page.getViewById('wearOsLayout');
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
    this._tempWatchSettings.copy(
      this._settingsService.watchSettings
    );
    const tappedId = args.object.id as string;
    this.activeSettingToChange = tappedId.toLowerCase();
    const changeSettingsPage =
      'pages/modals/change-settings/change-settings-page';
    const btn = args.object;
    const option: ShowModalOptions = {
      context: {
        activeSettingToChange: this.activeSettingToChange,
        settings: this._settingsService.settings,
        switchControlSettings: this._settingsService.switchControlSettings,
        watchSettings: this._settingsService.watchSettings
      },
      closeCallback: (
        confirmedByUser: boolean,
        _tempSettings: Device.Settings,
        _tempSwitchControlSettings: Device.SwitchControlSettings,
        _tempWatchSettings: WatchSettings
      ) => {
        this._showingModal = false;
        if (confirmedByUser) {
          this._settingsService.settings.copy(_tempSettings);
          this._settingsService.switchControlSettings.copy(
            _tempSwitchControlSettings
          );
          this._settingsService.watchSettings.copy(
            _tempWatchSettings
          );
          this._settingsService.hasSentSettings = false;
          this._settingsService.saveSettings();
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
}
