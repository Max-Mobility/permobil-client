import { Frame, knownFolders, Observable, Page, path, ShowModalOptions, ViewBase } from '@nativescript/core';
import { getFile } from '@nativescript/core/http';
import { Device, Log } from '@permobil/core';
import { getDefaultLang, L, Prop } from '@permobil/nativescript';
import { Sentry } from 'nativescript-sentry';
import { WatchSettings } from '../../../models';
import { SettingsService, SmartDriveKinveyService } from '../../../services';
import { configureLayout, isNetworkAvailable, sentryBreadCrumb } from '../../../utils';

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
  private _SDKinveyService: SmartDriveKinveyService;
  private _showingModal: boolean = false;

  constructor(
    page: Page,
    settingsService: SettingsService,
    data,
    sdKinveyService: SmartDriveKinveyService
  ) {
    super();
    this._settingsService = settingsService;
    this._settingsService.loadSettings();
    this._SDKinveyService = sdKinveyService;
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

    // when the user opens the settings we are going to download the translation files and store them if needed
    // @link - https://github.com/Max-Mobility/permobil-client/issues/658
    this._downloadTranslationFiles();
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
    this._tempWatchSettings.copy(this._settingsService.watchSettings);
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
          this._settingsService.watchSettings.copy(_tempWatchSettings);
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
      cancelable: false,
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal(changeSettingsPage, option);
  }

  private async _downloadTranslationFiles() {
    // make sure we have network before trying to download translation files
    const hasNetwork = isNetworkAvailable();
    if (hasNetwork === false) {
      sentryBreadCrumb(
        'No network connection available. Unable to download the translation files.'
      );
      return;
    }

    // we have network so show the scanning modal component with proper i18n text for this process
    const page = Frame.topmost()?.currentPage;
    let vb: ViewBase; // used as ref to close the modal after downloading is complete
    if (page) {
      vb = page.showModal('pages/modals/scanning/scanning', {
        context: {
          scanningText: L('settings.syncing-with-server')
        },
        closeCallback: () => {
          Log.D('Scanning modal closed after translation file downloads.');
        },
        animated: false,
        fullscreen: true,
        cancelable: false
      });
    }

    // "~/assets/i18n" path to save the files when downloaded with http.getFile()
    const i18nPath = path.join(
      knownFolders.currentApp().path,
      'assets',
      'i18n'
    );

    // get the current default language to ensure we query for the correct translation
    const defaultLang = getDefaultLang();
    const files = await this._SDKinveyService
      .downloadTranslationFiles(defaultLang)
      .catch(err => {
        Sentry.captureException(err);
        vb.closeModal();
        alert({
          title: L('failures.title'),
          message: L('failures.downloading-translations'),
          okButtonText: L('buttons.ok')
        });
      });

    // we should get back 1 or 2 files from the query (2 if the current device language is NOT en)
    // now we have the files from backend, we need to actually download them
    for (const f of files) {
      // need to make sure the downloadUrl of the file uses `https` and not `http` to avoid IOExceptions
      const fileUrl = f._downloadURL.replace(/^http:\/\//i, 'https://');
      await getFile(fileUrl, `${i18nPath}/${f._filename}`).catch(err => {
        Sentry.captureException(err);
        vb.closeModal();
        alert({
          title: L('failures.title'),
          message: L('failures.downloading-translations'),
          okButtonText: L('buttons.ok')
        });
      });
      sentryBreadCrumb(`File: ${f._filename} download successful.`);
    }

    // close the scanning modal that's blocking the user when done
    vb?.closeModal();
  }
}
