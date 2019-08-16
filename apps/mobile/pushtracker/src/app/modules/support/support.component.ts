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
  supportItems;
  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {
    this.supportItems = this._translateService.instant(
      'support-component.faqs'
    );
  }

  ngOnInit() {
    this._logService.logBreadCrumb('support.component OnInit');
  }

  onItemTap(args) {
    console.log('item tap', args.object);
  }

  onNavBtnTap() {
    this._params.closeCallback('');
  }
}
