import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'wireless-updates',
  moduleId: module.id,
  templateUrl: 'wireless-updates.component.html'
})
export class WirelessUpdatesComponent implements OnInit {
  ptCirclePercentage: number = 83;
  sdCirclePercentage: number = 30;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb('wireless-updates.component OnInit');
  }

  onMoreBtnTap() {
    console.log('morebtn tapped in mock action bar');
  }

  closeModal() {
    this._params.closeCallback();
  }

  onStartTap(device: string) {
    Log.D('start tap');
  }

  onStopTap(device: string) {
    Log.D('stop tap');
  }
}
