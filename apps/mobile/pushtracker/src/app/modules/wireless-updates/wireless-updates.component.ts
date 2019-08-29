import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, Device } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService, BluetoothService } from '../../services';
import { SmartDriveData } from '../../namespaces';
import { ObservableArray } from 'tns-core-modules/data/observable-array/observable-array';
import { SmartDrive } from '~/app/models';

@Component({
  selector: 'wireless-updates',
  moduleId: module.id,
  templateUrl: 'wireless-updates.component.html'
})
export class WirelessUpdatesComponent implements OnInit {
  ptCirclePercentage: number = 83;
  sdCirclePercentage: number = 30;
  controlConfiguration: string = '';

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {
    this.controlConfiguration = _params.context.controlConfiguration || '';
  }

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
    Log.D('start', device, 'update tap');
    if (device === 'pushtracker')
      this._startPushTrackerUpdate();
    else if (device === 'smartdrive')
      this._startSmartDriveUpdate();
  }

  onStopTap(device: string) {
    Log.D('stop', device, 'update tap');
    if (device === 'pushtracker')
      this._stopPushTrackerUpdate();
    else if (device === 'smartdrive')
      this._stopSmartDriveUpdate();
  }

  private _startPushTrackerUpdate() {

  }

  private _stopPushTrackerUpdate() {

  }

  private _startSmartDriveUpdate() {

  }

  private _stopSmartDriveUpdate() {

  }
}
