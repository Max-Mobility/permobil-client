import { Component, EventEmitter, Input, NgZone, Output, ViewContainerRef } from '@angular/core';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { Log, PushTrackerUser } from '@permobil/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty, ToastDuration } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { fromResource as imageFromResource, ImageSource } from 'tns-core-modules/image-source';
import { Color, ContentView } from 'tns-core-modules/ui/content-view';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import { TranslateService } from '@ngx-translate/core';
import { LoggingService, BluetoothService } from '../../../../services';
import { isAndroid, isIOS, screen } from 'tns-core-modules/platform';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';

const dialogs = require('tns-core-modules/ui/dialogs');

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

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _vcRef: ViewContainerRef,
    private _zone: NgZone
  ) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this.updateWatchIcon = this._updateWatchIcon;
    this.updateWatchIcon();
  }

  onUnloaded() {

  }

  async onTap() {
    this._logService.logBreadCrumb(E2StatusButtonComponent.name, 'Connecting to Watch');
    this._loadingIndicator.show({
      message: this._translateService.instant('wearos-comms.messages.synchronizing'),
      details: this._translateService.instant('wearos-comms.messages.synchronizing-long'),
      dimBackground: true
    });

    WearOsComms.setDebugOutput(false);
    const didConnect = await this._connectCompanion();
    if (didConnect) {
      // const sentData = await this._sendData();
      const sentMessage = await this._sendMessage();
      await this._disconnectCompanion();
      this._loadingIndicator.hide();
      if (sentMessage) { // && sentData) {
        new Toasty({
          text:
          this._translateService.instant('wearos-comms.messages.pte2-sync-successful'),
          duration: ToastDuration.LONG
        }).show();
      } else {
        alert({
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
      this._loadingIndicator.hide();
      alert({
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

  private _updateWatchIcon() {
    if (this.CURRENT_THEME === APP_THEMES.DEFAULT)
      this.iconString = 'pte2_black';
    else
      this.iconString = 'pte2_white';
    this.icon = imageFromResource(this.iconString);
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
      if (!WearOsComms.hasCompanion()) {
        // find and save the companion
        const address = await WearOsComms.findAvailableCompanions(5);
        this._logService.logBreadCrumb(E2StatusButtonComponent.name, 'saving new companion: ' + address);
        WearOsComms.saveCompanion(address);
      }
      // now connect
      didConnect = await WearOsComms.connectCompanion(10000);
    } catch (err) {
      console.error('error connecting:', err);
      // clear out the companion so we can search again
      WearOsComms.clearCompanion();
      this._logService.logException(err);
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
      this._logService.logException(err);
    }
  }

  private async _sendData() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendData(this._getSerializedAuth());
      if (didSend) {
        this._logService.logBreadCrumb(E2StatusButtonComponent.name, 'SendData successful.');
      } else {
        this._logService.logBreadCrumb(E2StatusButtonComponent.name, 'SendData unsuccessful.');
      }
    } catch (error) {
      this._logService.logException(error);
    }
    return didSend;
  }

  private async _sendMessage() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendMessage('/app-message', this._getSerializedAuth());
      if (didSend) {
        this._logService.logBreadCrumb(E2StatusButtonComponent.name, 'SendMessage successful.');
      } else {
        this._logService.logBreadCrumb(E2StatusButtonComponent.name, 'SendMessage unsuccessful.');
      }
    } catch (error) {
      this._logService.logException(error);
    }
    return didSend;
  }

}

registerElement('e2-status-button', () => {
  return ContentView;
});
