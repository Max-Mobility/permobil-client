import { Component, EventEmitter, Input, Output, ViewContainerRef } from '@angular/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import { Color, ContentView } from 'tns-core-modules/ui/content-view';
import { AppInfoComponent } from '../../../../modules/app-info/app-info.component';
import { ProfileSettingsComponent } from '../../../../modules/profile-settings/profile-settings.component';
import { SupportComponent } from '../../../../modules/support/support.component';

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

  @Input() showBackNav = false;
  @Output() navTapEvent = new EventEmitter();
  @Input() showRefreshBtn = false;
  @Output() refreshTapEvent = new EventEmitter();
  @Input() showMoreBtn = false;
  @Output() moreTapEvent = new EventEmitter();
  @Input() showWatchBtn = false;
  @Output() watchTapEvent = new EventEmitter();

  navIcon; // this sets the font icon in the UI based on the value of backNavIcon

  constructor(
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    if (this.backNavIcon === 0) {
      this.navIcon = String.fromCharCode(0xe5c4); // arrow
    } else {
      this.navIcon = String.fromCharCode(0xe5cd); // close
    }
  }

  onNavBtnTap() {
    this.navTapEvent.emit();
  }

  onWatchTap() {
    this.watchTapEvent.emit();
  }

  onRefreshTap() {
    this.refreshTapEvent.emit();
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
        console.log(err);
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
        console.log(err);
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
        viewContainerRef: this._vcRef
      })
      .catch(err => {
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }
}

registerElement('MockActionBar', () => {
  return ContentView;
});
