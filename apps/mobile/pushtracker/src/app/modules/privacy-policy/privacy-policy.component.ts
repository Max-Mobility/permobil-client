import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/directives/dialogs';
import * as appSettings from 'tns-core-modules/application-settings';
import { AppResourceIcons, APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';
import * as utilityModule from 'tns-core-modules/utils/utils';

@Component({
  selector: 'privacy-policy',
  moduleId: module.id,
  templateUrl: 'privacy-policy.component.html'
})
export class PrivacyPolicyComponent implements OnInit {
  androidBackIcon;
  user;

  has_agreed_to_user_agreement: boolean = false;
  has_read_privacy_policy: boolean = false;
  consent_to_product_development: boolean = false;
  consent_to_research: boolean = false;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private params: ModalDialogParams
  ) {
    this.user = this.params.context.user;

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

  ngOnInit() {
    this._logService.logBreadCrumb('privacy-policy.component OnInit');
    this.has_agreed_to_user_agreement =
      this.user.has_agreed_to_user_agreement || false;
    this.has_read_privacy_policy =
      this.user.has_read_privacy_policy || false;
    this.consent_to_product_development =
      this.user.consent_to_product_development || false;
    this.consent_to_research =
      this.user.consent_to_research || false;
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
