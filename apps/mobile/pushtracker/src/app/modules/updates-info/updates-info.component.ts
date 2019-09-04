import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';

@Component({
  selector: 'updates-info',
  moduleId: module.id,
  templateUrl: 'updates-info.component.html'
})
export class UpdatesInfoComponent implements OnInit {
  infoItems;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb('updates-info.component OnInit');
    const context = this._params.context;
    if (context) {
      const smartDriveMCUChanges = context['SmartDriveMCU.ota'] ? context['SmartDriveMCU.ota'].changes || [] : [];
      const smartDriveBLEChanges = context['SmartDriveBLE.ota'] ? context['SmartDriveBLE.ota'].changes || [] : [];
      const pushTrackerChanges = context['PushTracker.ota'] ? context['PushTracker.ota'].changes || [] : [];
      this.infoItems = [];
      const allChanges = [...smartDriveMCUChanges, ...smartDriveBLEChanges, ...pushTrackerChanges];
      for (const i in allChanges) {
        this.infoItems.push({
          text: (parseInt(i) + 1) + '. ' + allChanges[i]
        });
      }
    }
    else {
      this.infoItems = [];
    }
  }

  closeModal() {
    this._params.closeCallback();
  }
}
