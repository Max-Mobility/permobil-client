import { Component, EventEmitter, Input, NgZone, Output, ViewContainerRef } from '@angular/core';
import { ModalDialogService, registerElement } from '@nativescript/angular';
import { Color } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { Toasty } from 'nativescript-toasty';
import { APP_THEMES, STORAGE_KEYS } from '../../../../enums';
import { AppInfoComponent, ProfileSettingsComponent, SupportComponent, WirelessUpdatesComponent } from '../../../../modules';
const dialogs = require('@nativescript/core/ui/dialogs');

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
  @Input() languagePreference: string = 'English';
  @Input() controlConfiguration: string = '';

  @Input() user: PushTrackerUser;

  navIcon; // this sets the font icon in the UI based on the value of backNavIcon
  CURRENT_THEME: string;

  constructor(
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
  }

  onLoaded(args) {}

  onUnloaded(args) {}

  onNavBtnTap() {
    this.navTapEvent.emit();
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
          CURRENT_THEME: this.CURRENT_THEME
        },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {
        this.onUnloaded({});
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
        this.onUnloaded({});
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
        this.onUnloaded({});
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
        this.onUnloaded({});
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
}

registerElement('MockActionBar', () => {
  return require('@nativescript/core/ui/content-view').ContentView;
});
