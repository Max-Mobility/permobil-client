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

  versionByteToString(version: number): string {
    if (version === 0xff || version === 0x00) {
      return 'unknown';
    } else {
      return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
    }
  }

  ngOnInit() {
    this._logService.logBreadCrumb('updates-info.component OnInit');
    const context = this._params.context;
    this.infoItems = [];
    if (context) {
      const smartDriveMCUChanges = context['SmartDriveMCU.ota'] ? context['SmartDriveMCU.ota'].changes || [] : [];
      const smartDriveMCUVersion = context['SmartDriveMCU.ota'] ? this.versionByteToString(context['SmartDriveMCU.ota'].version) || '' : '';
      const smartDriveBLEChanges = context['SmartDriveBLE.ota'] ? context['SmartDriveBLE.ota'].changes || [] : [];
      const smartDriveBLEVersion = context['SmartDriveBLE.ota'] ? this.versionByteToString(context['SmartDriveBLE.ota'].version) || '' : '';
      const pushTrackerChanges = context['PushTracker.ota'] ? context['PushTracker.ota'].changes || [] : [];
      const pushTrackerVersion = context['PushTracker.ota'] ? this.versionByteToString(context['PushTracker.ota'].version) || '' : '';

      if (smartDriveMCUVersion !== '') {
        const smartDriveMCUSection = { 'title': 'SmartDrive MCU v' + smartDriveMCUVersion, 'items': [] };
        for (const i in smartDriveMCUChanges) {
          const item = smartDriveMCUChanges[i];
          smartDriveMCUSection['items'].push({
            text: (parseInt(i) + 1) + '. ' + item
          });
        }
        if (smartDriveMCUChanges.length) {
          this.infoItems.push(smartDriveMCUSection);
        }
      }

      if (smartDriveBLEVersion !== '') {
        const smartDriveBLESection = { 'title': 'SmartDrive BLE v' + smartDriveBLEVersion, 'items': [] };
        for (const i in smartDriveBLEChanges) {
          const item = smartDriveBLEChanges[i];
          smartDriveBLESection['items'].push({
            text: (parseInt(i) + 1) + '. ' + item
          });
        }
        if (smartDriveBLEChanges.length) {
          this.infoItems.push(smartDriveBLESection);
        }
      }

      if (pushTrackerVersion !== '') {
        const pushTrackerSection = { 'title': 'PushTracker v' + pushTrackerVersion, 'items': [] };
        for (const i in pushTrackerChanges) {
          const item = pushTrackerChanges[i];
          pushTrackerSection['items'].push({
            text: (parseInt(i) + 1) + '. ' + item
          });
        }
        if (pushTrackerChanges.length) {
          this.infoItems.push(pushTrackerSection);
        }
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
