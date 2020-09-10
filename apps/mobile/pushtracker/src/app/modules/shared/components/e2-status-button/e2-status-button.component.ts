import { Component, Input, NgZone, ViewContainerRef } from '@angular/core';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { ModalDialogService, registerElement } from '@nativescript/angular';
import {
  ApplicationSettings as appSettings, Dialogs, ImageSource,
  isAndroid
} from '@nativescript/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ToastDuration, Toasty } from 'nativescript-toasty';
import { DeviceSetupComponent } from '../../..';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import {
  LoggingCategory,
  LoggingService,
  ThemeService
} from '../../../../services';

@Component({
  selector: 'e2-status-button',
  moduleId: module.id,
  templateUrl: 'e2-status-button.component.html'
})
export class E2StatusButtonComponent {
  public APP_THEMES = APP_THEMES;
  public CURRENT_THEME: string;
  public iconString: string;
  public icon: ImageSource;
  public updateWatchIcon;
  /**
   * For showing indication that we're sending data to the wear os apps
   */
  private _loadingIndicator = new LoadingIndicator();

  @Input() allowUserInteraction = true;

  constructor(
    private _themeService: ThemeService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _translateService: TranslateService,
    private _vcRef: ViewContainerRef,
    private _zone: NgZone
  ) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this.updateWatchIcon = this._updateWatchIcon;
    this._themeService.theme.subscribe(theme => {
      this.CURRENT_THEME = theme;
      this.updateWatchIcon();
    });
    this.updateWatchIcon();
  }

  onUnloaded() {}

  async onTap() {
    if (!this.allowUserInteraction) return;

    WearOsComms.setDebugOutput(false);
    if (!WearOsComms.hasCompanion()) {
      // open the device configuration page
      this._showDeviceSetup();
      return;
    }

    if (!isAndroid) {
      this._loadingIndicator.show({
        message: this._translateService.instant(
          'wearos-comms.messages.synchronizing'
        ),
        details: this._translateService.instant(
          'wearos-comms.messages.synchronizing-long'
        ),
        dimBackground: true
      });
    }

    this._logService.logBreadCrumb(
      E2StatusButtonComponent.name,
      'Connecting to Watch'
    );

    // TODO: set status display to busy
    const didConnect = await this._connectCompanion();
    if (didConnect) {
      const sentMessage = await this._sendMessage();
      await this._disconnectCompanion();
      this._loadingIndicator.hide();
      if (sentMessage) {
        // TODO: set status display to check
        new Toasty({
          text: this._translateService.instant(
            'wearos-comms.messages.pte2-sync-successful'
          ),
          duration: ToastDuration.LONG
        }).show();
      } else {
        // TODO: set status display to 'x'
        Dialogs.alert({
          title: this._translateService.instant(
            'wearos-comms.errors.pte2-send-error.title'
          ),
          message: this._translateService.instant(
            'wearos-comms.errors.pte2-send-error.message'
          ),
          okButtonText: this._translateService.instant('profile-tab.ok')
        });
      }
    } else {
      // TODO: set status display to 'x'
      this._loadingIndicator.hide();
      Dialogs.alert({
        title: this._translateService.instant(
          'wearos-comms.errors.pte2-connection-error.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.pte2-connection-error.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    }
  }

  private _showDeviceSetup() {
    this._modalService
      .showModal(DeviceSetupComponent, {
        context: { modal: true },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {})
      .catch(err => {
        this._logService.logException(err);
      });
  }

  private _updateWatchIcon() {
    if (this.CURRENT_THEME === APP_THEMES.DEFAULT)
      this.iconString = 'pte2_black';
    else this.iconString = 'pte2_white';
    this.icon = ImageSource.fromResourceSync(this.iconString);
  }

  private _getSerializedAuth() {
    // get user
    const user = KinveyUser.getActiveUser();
    const id = user._id;
    const token = user._kmd.authtoken;
    // this._logService.logBreadCrumb(E2StatusButtonComponent.name, `user id: ${id}`);
    // this._logService.logBreadCrumb(E2StatusButtonComponent.name, `user token: ${token}`);
    return `${id}:Kinvey ${token}`;
  }

  private async _connectCompanion() {
    // if we're Android we rely on WearOS Messaging, so we cannot manage connection state
    if (isAndroid) return true;
    // if we're iOS we have to actually find a companion
    let didConnect = false;
    try {
      // now connect
      didConnect = await WearOsComms.connectCompanion(10000);
    } catch (err) {
      /*
      console.error('error connecting:', err);
      // clear out the companion so we can search again
      WearOsComms.clearCompanion();
      */
      // this._logService.logException(err);
      this._logService.logBreadCrumb(
        E2StatusButtonComponent.name,
        'Error connecting: ' + err.message + '\n\t' + err,
        LoggingCategory.Warning
      );
    }
    return didConnect;
  }

  private async _disconnectCompanion() {
    // if we're Android we rely on WearOS Messaging, so we cannot manage connection state
    if (isAndroid) return true;
    // if we're iOS we have to actually disconnect from the companion
    try {
      await WearOsComms.disconnectCompanion();
    } catch (err) {
      // this._logService.logException(err);
      this._logService.logBreadCrumb(
        E2StatusButtonComponent.name,
        'Error disconnecting: ' + err.message + '\n\t' + err,
        LoggingCategory.Warning
      );
    }
  }

  private async _sendData() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendData(this._getSerializedAuth());
      if (didSend) {
        this._logService.logBreadCrumb(
          E2StatusButtonComponent.name,
          'SendData successful.'
        );
      } else {
        this._logService.logBreadCrumb(
          E2StatusButtonComponent.name,
          'SendData unsuccessful.'
        );
      }
    } catch (error) {
      // this._logService.logException(error);
      this._logService.logBreadCrumb(
        E2StatusButtonComponent.name,
        'Error sending data: ' + error.message + '\n\t' + error,
        LoggingCategory.Warning
      );
    }
    return didSend;
  }

  private async _sendMessage() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendMessage(
        '/app-message',
        this._getSerializedAuth()
      );
      if (didSend) {
        this._logService.logBreadCrumb(
          E2StatusButtonComponent.name,
          'SendMessage successful.'
        );
      } else {
        this._logService.logBreadCrumb(
          E2StatusButtonComponent.name,
          'SendMessage unsuccessful.'
        );
      }
    } catch (error) {
      // this._logService.logException(error);
      this._logService.logBreadCrumb(
        E2StatusButtonComponent.name,
        'Error sending message: ' + error.message + '\n\t' + error,
        LoggingCategory.Warning
      );
    }
    return didSend;
  }
}

registerElement('e2-status-button', () => {
  return require('@nativescript/core/ui/content-view').ContentView;
});
