import { ApplicationSettings, Frame, knownFolders, Observable, Page, path, ShowModalOptions, ViewBase } from '@nativescript/core';
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
  private _isDownloadingFiles: boolean = false;

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
    // wait(1000).then(() => {
    //   this._downloadTranslationFiles();
    // });
  }

  onChangeSettingsItemTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb(
        'Already showing modal, not showing change settings modal.'
      );
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
    // make sure we are not already downloading translation files
    if (this._isDownloadingFiles) {
      sentryBreadCrumb('Files are being downloaded. Will not execute again.');
      return;
    }
    this._isDownloadingFiles = true;

    // make sure we have network before trying to download translation files
    const hasNetwork = isNetworkAvailable();
    if (hasNetwork === false) {
      sentryBreadCrumb(
        'No network connection available. Unable to download the translation files.'
      );
      this._isDownloadingFiles = false;
      return;
    }

    // show the modal that blocks the user while we query the server
    const page = Frame.topmost()?.currentPage;
    let vb: ViewBase; // used as ref to close the modal after downloading is complete
    if (page) {
      vb = page.showModal('pages/modals/scanning/scanning', {
        context: {
          scanningText: L('settings.syncing-with-server')
        },
        closeCallback: () => {
          this._isDownloadingFiles = false;
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
    const files = (await this._SDKinveyService
      .downloadTranslationFiles(defaultLang)
      .catch(err => {
        this._isDownloadingFiles = false;
        vb.closeModal();
        this._handleDownloadError(err);
      })) as any[];
    // handle the case that the query failed - don't continue doing
    // anything, return early
    if (!this._isDownloadingFiles) return;

    // grab the highest version number files from the server response
    const filesToCheck = files.reduce((acc, val) => {
      const { _filename } = val;
      const current = acc[_filename];
      acc[_filename] = !current
        ? val
        : val._version > current._version
        ? val
        : current;
      return acc;
    }, {});

    // check if the highest version number file has already been downloaded to the device
    let f;
    const filesToDownload = [];
    for (f of Object.values(filesToCheck)) {
      const savedVersion = parseFloat(
        ApplicationSettings.getNumber(`${f._filename}_version`, 0.0).toFixed(5)
      );
      if (savedVersion < f._version) {
        sentryBreadCrumb(
          `Device needs to download ${f._filename} ${savedVersion} -> ${f._version}`
        );
        // need to download this one so put into the array
        filesToDownload.push(f);
      }
    }

    if (filesToDownload.length <= 0) {
      sentryBreadCrumb('Device already has the latest translation files.');
      vb.closeModal();
      this._isDownloadingFiles = false;
      return; // at this point we have the latest files
    }

    for (f of filesToDownload) {
      // need to make sure the downloadUrl of the file uses `https` and not `http` to avoid IOExceptions
      const fileUrl = f._downloadURL.replace(/^http:\/\//i, 'https://');
      await getFile(fileUrl, `${i18nPath}/${f._filename}`).catch(err => {
        this._isDownloadingFiles = false;
        vb.closeModal();
        this._handleDownloadError(err);
      });
      // handle the case that the file download failed - return early
      // since we should have already closed the modal and updated the
      // state
      if (!this._isDownloadingFiles) return;
      sentryBreadCrumb(
        `File: ${f._filename} download successful for ${f._version}`
      );
      // save the file version of the file to check when this function executes next time
      ApplicationSettings.setNumber(`${f._filename}_version`, f._version);
    }

    // close the scanning modal that's blocking the user when done
    vb.closeModal();
    this._isDownloadingFiles = false;
  }

  private _handleDownloadError(err) {
    sentryBreadCrumb(`Error downloading files: ${err}`);
    Sentry.captureException(err);
    alert({
      title: L('failures.title'),
      message: L('failures.downloading-translations'),
      okButtonText: L('buttons.ok')
    });
    this._isDownloadingFiles = false;
  }
}
