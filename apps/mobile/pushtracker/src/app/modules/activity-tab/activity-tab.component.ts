import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'activity-tab',
  moduleId: module.id,
  templateUrl: 'activity-tab.component.html'
})
export class ActivityTabComponent implements OnInit {
  private static LOG_TAG = 'activity-tab.component ';
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb(ActivityTabComponent.LOG_TAG + `ngOnInit`);
    this.infoItems = this._translateService.instant(
      'activity-tab-component.sections'
    );
  }

  onShownModally(args) {
    Log.D('activity-tab.component modal shown');
  }

  closeModal(event) {
    Log.D('activity-tab.component modal closed');
    this._params.closeCallback('some value');
  }
}
