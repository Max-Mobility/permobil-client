import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/directives/dialogs';
import * as appSettings from 'tns-core-modules/application-settings';
import { AppResourceIcons, APP_THEMES, STORAGE_KEYS } from '../../enums';
import * as utilityModule from 'tns-core-modules/utils/utils';

@Component({
  selector: 'privacy-policy',
  moduleId: module.id,
  templateUrl: 'privacy-policy.component.html'
})
export class PrivacyPolicyComponent {
  androidBackIcon: any;

  has_agreed_to_user_agreement: boolean = false;
  has_read_privacy_policy: boolean = false;
  consent_to_product_development: boolean = false;
  consent_to_research: boolean = false;

  constructor(
    private _translateService: TranslateService,
    private params: ModalDialogParams
  ) {
    const data = this.params.context.data;
    // copy to local vars
    this.has_agreed_to_user_agreement =
      data.has_agreed_to_user_agreement || false;
    this.has_read_privacy_policy =
      data.has_read_privacy_policy || false;
    this.consent_to_product_development =
      data.consent_to_product_development || false;
    this.consent_to_research =
      data.consent_to_research || false;

    // set the theme
    const currentTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.androidBackIcon =
      currentTheme === APP_THEMES.DEFAULT
        ? AppResourceIcons.BLACK_BACK_NAV
        : AppResourceIcons.WHITE_BACK_NAV;
  }

  openWebsite(url: string) {
    url = this._translateService.instant(url);
    utilityModule.openUrl(url);
  }

  close() {
    this.params.closeCallback({
      has_agreed_to_user_agreement: this.has_agreed_to_user_agreement,
      has_read_privacy_policy: this.has_read_privacy_policy,
      consent_to_product_development: this.consent_to_product_development,
      consent_to_research: this.consent_to_research,
    });
  }

  cancel() {
    this.params.closeCallback();
  }
}
