import { Component, NgZone } from '@angular/core';
import { registerElement } from '@nativescript/angular';
import { ImageSource } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { alert } from '@nativescript/core/ui/dialogs';
import { TranslateService } from '@ngx-translate/core';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import { BluetoothService, PushTrackerState } from '../../../../services/bluetooth.service';

@Component({
  selector: 'pushtracker-status-button',
  moduleId: module.id,
  templateUrl: 'pushtracker-status-button.component.html'
})
export class PushTrackerStatusButtonComponent {
  unknownIconText: string = `${String.fromCharCode(
    0xe1a7
  )}${String.fromCharCode(0xe8fd)}`;
  connectedIconText: string = `${String.fromCharCode(
    0xe1a7
  )}${String.fromCharCode(0x2713)}`;
  disconnectedIconText: string = `${String.fromCharCode(
    0xe1a7
  )}${String.fromCharCode(0x10007)}`;

  PushTrackerState = PushTrackerState;
  APP_THEMES = APP_THEMES;
  state: PushTrackerState;
  icon: ImageSource;
  iconString: string;
  CURRENT_THEME: string;
  updateWatchIcon;

  constructor(
    private _bluetoothService: BluetoothService,
    private _translateService: TranslateService,
    private _zone: NgZone
  ) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this.updateWatchIcon = this._updateWatchIcon;
    this.iconString =
      this.CURRENT_THEME === APP_THEMES.DEFAULT
        ? 'og_band_black'
        : 'og_band_white';

    this.icon = ImageSource.fromResourceSync(this.iconString);
    // set up the status watcher for the pushtracker state
    this._bluetoothService.on(
      BluetoothService.pushtracker_status_changed,
      this._updateWatchState,
      this
    );
    this.state = BluetoothService.pushTrackerStatus.get('state');
    this._updateWatchIcon();
  }

  onUnloaded() {
    this._bluetoothService.off(BluetoothService.pushtracker_status_changed);
  }

  private _updateWatchState() {
    this.state = BluetoothService.pushTrackerStatus.get('state');
    this._updateWatchIcon();
  }

  private _updateWatchIcon() {
    this._zone.run(() => {
      if (this.CURRENT_THEME === APP_THEMES.DEFAULT)
        this.iconString = 'og_band_black';
      else this.iconString = 'og_band_white';
      this.icon = ImageSource.fromResourceSync(this.iconString);
    });
  }

  onTap() {
    alert({
      title: this._translateService.instant(
        'profile-settings.watch-status-alert-title'
      ),
      message: this._translateService.instant(
        'profile-settings.watch-status-alert-message.' +
          this._getTranslationKeyForPushTrackerStatus()
      ),
      okButtonText: this._translateService.instant('dialogs.ok')
    });
  }

  private _getTranslationKeyForPushTrackerStatus() {
    switch (this.state) {
      case PushTrackerState.unknown:
        return 'unknown';
      case PushTrackerState.busy:
        return 'busy';
      case PushTrackerState.paired:
        return 'paired';
      case PushTrackerState.disconnected:
        return 'disconnected';
      case PushTrackerState.connected:
        return 'connected';
      case PushTrackerState.ready:
        return 'ready';
      default:
        return 'unknown';
    }
  }
}

registerElement('pushtracker-status-button', () => {
  return require('@nativescript/core/ui/content-view').ContentView;
});
