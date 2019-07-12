import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  private static LOG_TAG = 'profile-settings.component ';
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb(ProfileSettingsComponent.LOG_TAG + `ngOnInit`);
    this.infoItems = this._translateService.instant(
      'profile-settings-component.sections'
    );
  }

  onShownModally(args) {
    Log.D('profile-settings.component modal shown');
  }

  closeModal(event) {
    Log.D('profile-settings.component modal closed');
    this._params.closeCallback('some value');
  }
}
