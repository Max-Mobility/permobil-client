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

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private params: ModalDialogParams
  ) {
    this.user = this.params.context.user;
    const currentTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.androidBackIcon =
      currentTheme === APP_THEMES.DEFAULT
        ? AppResourceIcons.BLACK_BACK_NAV
        : AppResourceIcons.WHITE_BACK_NAV;
  }

  openWebsite(url) {
    url = this._translateService.instant(url);
    utilityModule.openUrl(url);
  }

  ngOnInit() {
    this._logService.logBreadCrumb('privacy-policy.component OnInit');
  }

  close() {
    this.params.closeCallback(this.user);
  }

  cancel() {
    this.params.closeCallback();
  }
}
