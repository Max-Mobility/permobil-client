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
import { ProfileSettingsComponent } from '~/app/modules/profile-settings/profile-settings.component';
import { SupportComponent } from '~/app/modules/support/support.component';

@Component({
  selector: 'MockActionBar',
  moduleId: module.id,
  templateUrl: 'mock-actionbar.component.html'
})
export class MockActionbarComponent {
  @Input() title: string;
  @Input() showBackNav = false;
  @Input() showSettingsBtn = false;
  @Input() showSupportBtn = false;
  @Input() showRefreshBtn = false;
  @Output() supportTapEvent = new EventEmitter();
  @Output() navBtnEvent = new EventEmitter();
  @Output() settingsBtnEvent = new EventEmitter();
  @Output() refreshBtnEvent = new EventEmitter();

  constructor(
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {}

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

  onRefreshTap() {
    this.refreshBtnEvent.emit();
  }
}

registerElement('MockActionBar', () => {
  return ContentView;
});
