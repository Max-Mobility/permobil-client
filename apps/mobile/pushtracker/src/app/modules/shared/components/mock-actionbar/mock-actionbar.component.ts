import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewContainerRef
} from '@angular/core';
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
  @Input() showBackNav = false;
  @Output() navBtnEvent = new EventEmitter();

  @Input() showSettingsBtn = false;
  @Output() settingsBtnEvent = new EventEmitter();

  @Input() showSupportBtn = false;
  @Output() supportTapEvent = new EventEmitter();

  @Input() showRefreshBtn = false;
  @Output() refreshBtnEvent = new EventEmitter();

  @Input() showInfoBtn = false;
  @Output() infoBtnEvent = new EventEmitter();

  @Input() showMoreBtn = false;
  @Output() moreBtnEvent = new EventEmitter();

  navIcon; // this sets the font icon in the UI based on the value of backNavIcon

  constructor(
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    if (this.backNavIcon === 0) {
      this.navIcon = String.fromCharCode(0xe5cd); // arrow
    } else {
      this.navIcon = String.fromCharCode(0xe5cd); // close
    }
  }

  onNavBtnTap() {
    this.navBtnEvent.emit();
  }

  onSupportTap(): void {
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

  onRefreshTap() {
    this.refreshBtnEvent.emit();
  }

  onMoreTap() {
    this.moreBtnEvent.emit();
  }
}

registerElement('MockActionBar', () => {
  return ContentView;
});
