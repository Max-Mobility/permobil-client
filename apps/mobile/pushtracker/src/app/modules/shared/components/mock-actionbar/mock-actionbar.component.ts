import { AfterViewInit, Component, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, ViewContainerRef } from '@angular/core';
import { Log } from '@permobil/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { ToastPosition, Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { fromResource as imageFromResource, ImageSource } from 'tns-core-modules/image-source';
import { Color, ContentView } from 'tns-core-modules/ui/content-view';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import { AppInfoComponent } from '../../../../modules/app-info/app-info.component';
import { ProfileSettingsComponent } from '../../../../modules/profile-settings/profile-settings.component';
import { SupportComponent } from '../../../../modules/support/support.component';
import { WirelessUpdatesComponent } from '../../../../modules/wireless-updates/wireless-updates.component';
import { BluetoothService, PushTrackerState } from '../../../../services';

@Component({
  selector: 'MockActionBar',
  moduleId: module.id,
  templateUrl: 'mock-actionbar.component.html'
})
export class MockActionbarComponent
  implements OnInit, AfterViewInit, OnDestroy {
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

  navIcon; // this sets the font icon in the UI based on the value of backNavIcon
  CURRENT_THEME: string;
  watchIconString: string;
  watchIcon: ImageSource;

  constructor(
    private _bluetoothService: BluetoothService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _zone: NgZone
  ) {}

  ngOnInit() {
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
  }

  ngAfterViewInit() {
    this.updateWatchIcon({});
  }

  ngOnDestroy() {
    this._bluetoothService.off(BluetoothService.pushtracker_status_changed);
  }

  onNavBtnTap() {
    this.navTapEvent.emit();
  }

  onWatchTap() {
    new Toasty({
      text: 'Show info about current watch status.',
      position: ToastPosition.CENTER
    }).show();
  }

  onRefreshTap() {
    this.refreshTapEvent.emit();
  }

  onUpdateTap() {
    this._modalService
      .showModal(WirelessUpdatesComponent, {
        context: {},
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
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

  onMoreTap() {
    this.moreTapEvent.emit();
  }

  onSupportTap() {
    this._modalService
      .showModal(SupportComponent, {
        context: {},
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
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
        context: {},
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
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
      Log.D('watch status changed', event.data);
      const state =
        (event && event.data && event.data.state) ||
        BluetoothService.pushTrackerStatus.get('state');
      switch (state) {
        default:
        case PushTrackerState.unknown:
          console.log('Unknown');
          this._setWatchIconVariables('question');
          break;
        case PushTrackerState.paired:
          console.log('Paired');
          this._setWatchIconVariables('empty');
          break;
        case PushTrackerState.disconnected:
          console.log('Disconnected');
          this._setWatchIconVariables('x');
          break;
        case PushTrackerState.connected:
          console.log('Connected');
          this._setWatchIconVariables('check');
          break;
        case PushTrackerState.ready:
          console.log('ready');
          this._setWatchIconVariables('check');
          break;
      }
    });
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
}

registerElement('MockActionBar', () => {
  return ContentView;
});
