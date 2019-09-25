import { Component, OnInit } from '@angular/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';
import { Log } from '@permobil/core';
import { APP_LANGUAGES } from '../../enums';

@Component({
  selector: 'updates-info',
  moduleId: module.id,
  templateUrl: 'updates-info.component.html'
})
export class UpdatesInfoComponent implements OnInit {
  infoItems;

  constructor(
    private _logService: LoggingService,
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
    this._logService.logBreadCrumb(UpdatesInfoComponent.name, 'OnInit');
    const context = this._params.context;
    this.infoItems = [];
    const languagePreference = context['languagePreference'];
    const smartDriveMCUData = context['SmartDriveMCU.ota'];
    const smartDriveBLEData = context['SmartDriveBLE.ota'];
    const pushTrackerOTAData = context['PushTracker.ota'];
    if (context) {
      // Assumption here: The changelog for each category is translated per the preferred language of
      // the user in the parent component, i.e., wireless updates
      // So check in wireless updates to make sure that the translated version of the changelog
      // is propagated here https://github.com/Max-Mobility/permobil-client/issues/280
      let smartDriveMCUChanges = [];
      let smartDriveMCUVersion = '';
      if (smartDriveMCUData && smartDriveMCUData.changes) {
        smartDriveMCUChanges = smartDriveMCUData.changes[APP_LANGUAGES[languagePreference]];
        smartDriveMCUVersion = this.versionByteToString(smartDriveMCUData.version);
      }

      let smartDriveBLEChanges = [];
      let smartDriveBLEVersion = '';
      if (smartDriveBLEData && smartDriveBLEData.changes) {
        smartDriveBLEChanges = smartDriveBLEData.changes[APP_LANGUAGES[languagePreference]];
        smartDriveBLEVersion = this.versionByteToString(smartDriveBLEData.version);
      }

      let pushTrackerChanges = [];
      let pushTrackerVersion = '';
      if (pushTrackerOTAData && pushTrackerOTAData.changes) {
        pushTrackerChanges = pushTrackerOTAData.changes[APP_LANGUAGES[languagePreference]];
        pushTrackerVersion = this.versionByteToString(pushTrackerOTAData.version);
      }

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
