import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import * as appSettings from 'tns-core-modules/application-settings';
import { AppResourceIcons, APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';

@Component({
  selector: 'app-info',
  moduleId: module.id,
  templateUrl: 'app-info.component.html'
})
export class AppInfoComponent implements OnInit {
  infoItems;
  androidBackIcon;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {
    const currentTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.androidBackIcon =
      currentTheme === APP_THEMES.DEFAULT
        ? AppResourceIcons.BLACK_BACK_NAV
        : AppResourceIcons.WHITE_BACK_NAV;
  }

  ngOnInit() {
    this._logService.logBreadCrumb('app-info.component OnInit');
    this.infoItems = this._translateService.instant(
      'app-info-component.sections'
    );
  }

  closeModal() {
    this._params.closeCallback();
  }
}
