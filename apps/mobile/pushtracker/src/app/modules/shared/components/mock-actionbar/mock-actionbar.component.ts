import { Component, EventEmitter, Input, NgZone, Output, ViewContainerRef } from '@angular/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { ToastPosition, Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { fromResource as imageFromResource, ImageSource } from 'tns-core-modules/image-source';
import { Color, ContentView } from 'tns-core-modules/ui/content-view';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import { AppInfoComponent, ProfileSettingsComponent, SupportComponent, WirelessUpdatesComponent } from '../../../../modules';
import { BluetoothService, PushTrackerState } from '../../../../services';
import { TranslateService } from '@ngx-translate/core';
const dialogs = require('tns-core-modules/ui/dialogs');

@Component({
  selector: 'MockActionBar',
  moduleId: module.id,
  templateUrl: 'mock-actionbar.component.html'
})
export class MockActionbarComponent {
  @Input() title: string;
  @Input() backNavIcon = 0; // default is the back arrow

  @Input() showSettingsBtn = false; // no emitter
  @Input() showInfoBtn = false; // no emitter
  @Input() showSupportBtn = false; // no emitter
  @Input() showUpdateBtn = false; // no emitter

  @Input() showBackNav = false;
  @Output() navTapEvent = new EventEmitter();
  @Input() showRefreshBtn = false;
  @Output() refreshTapEvent = new EventEmitter();
  @Input() showMoreBtn = false;
  @Output() moreTapEvent = new EventEmitter();
  @Input() showWatchBtn = false;
  @Input() languagePreference: string = 'English';
  @Input() controlConfiguration: string = '';
  @Input() showWatchConnectBtn = false;
  @Output() watchConnectEvent = new EventEmitter();

  @Input() user: PushTrackerUser;

  watchConnectIconString: string;
  watchConnectIcon: ImageSource;
  navIcon; // this sets the font icon in the UI based on the value of backNavIcon
  CURRENT_THEME: string;
  watchIconString: string;
  watchIcon: ImageSource;

  constructor(
    private _bluetoothService: BluetoothService,
    private _translateService: TranslateService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _zone: NgZone
  ) {
    if (this.backNavIcon === 0) {
      this.navIcon = String.fromCharCode(0xe5c4); // arrow
    } else {
      this.navIcon = String.fromCharCode(0xe5cd); // close
    }

    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.watchIconString =
      this.CURRENT_THEME === APP_THEMES.DEFAULT
        ? 'watch_question_black'
        : 'watch_question_white';

    this.watchIcon = imageFromResource(this.watchIconString);

    // set up the status watcher for the pushtracker state
    this._bluetoothService.on(
      BluetoothService.pushtracker_status_changed,
      this.updateWatchIcon,
      this
    );

    this.updateWatchIcon({});
    this._setWatchConnectIconVariables('check');
  }

  onMockActionBarLoaded() {}

  onUnloaded() {
    this._bluetoothService.off(BluetoothService.pushtracker_status_changed);
  }

  onNavBtnTap() {
    this.navTapEvent.emit();
  }

  onWatchTap() {
    dialogs.alert({
      title: this._translateService.instant('profile-settings.watch-status-alert-title'),
      message: this._translateService.instant('profile-settings.watch-status-alert-message.' +
        this._getTranslationKeyForPushTrackerStatus()),
      okButtonText: this._translateService.instant('dialogs.ok')
    });
  }

  onWatchConnectTap() {
    this.watchConnectEvent.emit();
  }

  onRefreshTap() {
    this.refreshTapEvent.emit();
  }

  onMoreTap() {
    this.moreTapEvent.emit();
  }

  onUpdateTap() {
    this._modalService
      .showModal(WirelessUpdatesComponent, {
        context: {
          languagePreference: this.languagePreference,
          controlConfiguration: this.controlConfiguration,
          savedTheme: this.CURRENT_THEME
        },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {
        this.onUnloaded();
      })
      .catch(err => {
        Log.E(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  onSupportTap() {
    this._modalService
      .showModal(SupportComponent, {
        context: {},
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {
        this.onUnloaded();
      })
      .catch(err => {
        Log.E(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  onSettingsTap() {
    this._modalService
      .showModal(ProfileSettingsComponent, {
        context: { user: this.user },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {
        this.onUnloaded();
      })
      .catch(err => {
        Log.E(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  onInfoTap() {
    this._modalService
      .showModal(AppInfoComponent, {
        context: {},
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {
        this.onUnloaded();
      })
      .catch(err => {
        Log.E(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  public updateWatchIcon(event: any) {
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
      this.watchIconString = `watch_${status}_black`;
      this.watchIcon = imageFromResource(this.watchIconString);
    } else {
      this.watchIconString = `watch_${status}_white`;
      this.watchIcon = imageFromResource(this.watchIconString);
    }
  }

  private _setWatchConnectIconVariables(status: string) {
    if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
      this.watchConnectIconString = `watch_${status}_black`;
      this.watchConnectIcon = imageFromResource(this.watchConnectIconString);
    } else {
      this.watchConnectIconString = `watch_${status}_white`;
      this.watchConnectIcon = imageFromResource(this.watchConnectIconString);
    }
  }
}

registerElement('MockActionBar', () => {
  return ContentView;
});
