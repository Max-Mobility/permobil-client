import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'support',
  moduleId: module.id,
  templateUrl: 'support.component.html'
})
export class SupportComponent implements OnInit {
  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb('support.component OnInit');
  }

  onNavBtnTap() {
    console.log('nav btn tap');
    this._params.closeCallback('');
  }

  closeModal(event) {
    this._params.closeCallback('');
  }
}
