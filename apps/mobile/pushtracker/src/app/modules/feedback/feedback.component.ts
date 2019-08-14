import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'feedback',
  moduleId: module.id,
  templateUrl: 'feedback.component.html'
})
export class FeedbackComponent implements OnInit {
  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb('feedback.component OnInit');
  }

  closeModal(event) {
    this._params.closeCallback('');
  }
}
