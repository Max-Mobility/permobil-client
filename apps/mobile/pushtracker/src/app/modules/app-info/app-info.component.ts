import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'app-info',
  moduleId: module.id,
  templateUrl: 'app-info.component.html'
})
export class AppInfoComponent implements OnInit {
  private static LOG_TAG = 'app-info.component ';
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb(AppInfoComponent.LOG_TAG + `ngOnInit`);
    this.infoItems = this._translateService.instant(
      'app-info-component.sections'
    );
  }

  closeModal(event) {
    Log.D('app-info.component modal closed');
    this._params.closeCallback('some value');
  }
}
