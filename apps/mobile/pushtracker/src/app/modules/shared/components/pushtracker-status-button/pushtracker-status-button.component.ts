import { Component, EventEmitter, Input, NgZone, Output, ViewContainerRef } from '@angular/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { fromResource as imageFromResource, ImageSource } from 'tns-core-modules/image-source';
import { Color, ContentView } from 'tns-core-modules/ui/content-view';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import { AppInfoComponent, ProfileSettingsComponent, SupportComponent, WirelessUpdatesComponent } from '../../../../modules';
import { BluetoothService, PushTrackerState } from '../../../../services';
import { TranslateService } from '@ngx-translate/core';
const dialogs = require('tns-core-modules/ui/dialogs');

@Component({
  selector: 'PushTrackerStatusButton',
  moduleId: module.id,
  templateUrl: 'pushtracker-status-button.component.html'
})
export class PushTrackerStatusButtonComponent {
  icon: ImageSource;
  iconString: string;
  CURRENT_THEME: string;
  updateWatchIcon;

  constructor(
    private _bluetoothService: BluetoothService,
    private _translateService: TranslateService,
    private _vcRef: ViewContainerRef,
    private _zone: NgZone
  ) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.updateWatchIcon = this._updateWatchIcon;

    // set up the status watcher for the pushtracker state
    this._bluetoothService.on(
      BluetoothService.pushtracker_status_changed,
      this._updateWatchIcon,
      this
    );

    this.iconString =
      this.CURRENT_THEME === APP_THEMES.DEFAULT
        ? 'watch_question_black'
        : 'watch_question_white';

    this.icon = imageFromResource(this.iconString);
    this._updateWatchIcon({});
  }

  onWatchTap() {
    dialogs.alert({
      title: this._translateService.instant('profile-settings.watch-status-alert-title'),
      message: this._translateService.instant('profile-settings.watch-status-alert-message.' +
        this._getTranslationKeyForPushTrackerStatus()),
      okButtonText: this._translateService.instant('dialogs.ok')
    });
  }

  private _updateWatchIcon(event: any) {
    this._zone.run(() => {
      const state =
        (event && event.data && event.data.state) ||
        BluetoothService.pushTrackerStatus.get('state');
      switch (state) {
        default:
        case PushTrackerState.unknown:
          this._setWatchIconVariables('question');
          break;
        case PushTrackerState.paired:
          this._setWatchIconVariables('empty');
          break;
        case PushTrackerState.disconnected:
          this._setWatchIconVariables('x');
          break;
        case PushTrackerState.connected:
          this._setWatchIconVariables('check');
          break;
        case PushTrackerState.ready:
          this._setWatchIconVariables('check');
          break;
      }
    });
  }

  private _getTranslationKeyForPushTrackerStatus() {
    const state = BluetoothService.pushTrackerStatus.get('state');
    switch (state) {
      default:
      case PushTrackerState.unknown:
        return 'unknown';
      case PushTrackerState.paired:
        return 'paired';
      case PushTrackerState.disconnected:
        return 'disconnected';
      case PushTrackerState.connected:
        return 'connected';
      case PushTrackerState.ready:
        return 'ready';
    }
  }

  private _setWatchIconVariables(status: string) {
    if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
      this.iconString = `watch_${status}_black`;
      this.icon = imageFromResource(this.iconString);
    } else {
      this.iconString = `watch_${status}_white`;
      this.icon = imageFromResource(this.iconString);
    }
  }
}

registerElement('PushTrackerStatusButton', () => {
  return ContentView;
});
