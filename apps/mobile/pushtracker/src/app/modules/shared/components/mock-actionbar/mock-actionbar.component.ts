import { Component, Input, NgZone, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { registerElement } from 'nativescript-angular/element-registry';
import {
  ModalDialogParams,
  ModalDialogService
} from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import { Color } from 'tns-core-modules/color';
import { ActionBar } from 'tns-core-modules/ui/action-bar';
import { ContentView } from 'tns-core-modules/ui/content-view';
import { LoggingService } from '../../../../services';
import { ProfileSettingsComponent } from '../../../profile-settings/profile-settings.component';
import { SupportComponent } from '../../../support/support.component';

@Component({
  selector: 'MockActionBar',
  moduleId: module.id,
  templateUrl: 'mock-actionbar.component.html'
})
export class MockActionbarComponent extends ActionBar {
  @Input() title: string;
  @Input() showBackNav = false;
  @Input() showSettingsBtn = false;
  @Input() showSupportBtn = false;

  imgSrc = '~/assets/images/pt_conn_red.png';

  constructor(
    private _zone: NgZone,
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private _params: ModalDialogParams
  ) {
    super();
  }

  onNavBtnTap() {
    this._params.closeCallback('');
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
        this._logService.logException(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  onSettingsTap(): void {
    this._modalService
      .showModal(ProfileSettingsComponent, {
        context: {},
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .catch(err => {
        this._logService.logException(err);
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
