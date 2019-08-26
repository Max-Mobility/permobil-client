import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'app-info',
  moduleId: module.id,
  templateUrl: 'app-info.component.html'
})
export class AppInfoComponent implements OnInit {
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

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
