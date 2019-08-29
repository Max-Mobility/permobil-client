import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, Device } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService, BluetoothService } from '../../services';
import { PowerAssist, SmartDriveData } from '../../namespaces';
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

  /**
 * SmartDrive Wireless Updates:
 */
  updateProgressText: string = '';
  isUpdatingSmartDrive: boolean = false;
  smartDriveOtaProgress: number = 0;
  smartDriveOtaState: string = null;
  smartDriveOtaActions = new ObservableArray();

  /**
   *
   * SmartDrive Related Data
   *
   */
  // Sensor listener config:
  SENSOR_DELAY_US: number = 10 * 1000;
  MAX_REPORTING_INTERVAL_US: number = 20 * 1000;
  // Estimated range min / max factors
  minRangeFactor: number = 2.0 / 100.0; // never estimate less than 2 mi per full charge
  maxRangeFactor: number = 12.0 / 100.0; // never estimate more than 12 mi per full charge
  // error related info
  lastErrorId: number = null;

  /**
   * State tracking for power assist
   */
  powerAssistState: PowerAssist.State = PowerAssist.State.Inactive;

  /**
   * SmartDrive Data / state management
   */
  public smartDrive: SmartDrive;
  private settings = new Device.Settings();
  private tempSettings = new Device.Settings();
  private switchControlSettings = new Device.SwitchControlSettings();
  private tempSwitchControlSettings = new Device.SwitchControlSettings();
  private hasSentSettings: boolean = false;
  private _savedSmartDriveAddress: string = null;
  private _ringTimerId = null;
  private RING_TIMER_INTERVAL_MS = 500;
  private CHARGING_WORK_PERIOD_MS = 30 * 1000;
  private DATABASE_SAVE_INTERVAL_MS = 10 * 1000;
  private _lastChartDay = null;

  /**
 * User interaction objects
 */
  private initialized: boolean = false;
  private wakeLock: any = null;
  private _bluetoothService: BluetoothService;
  private _throttledOtaAction: any = null;
  private _throttledSmartDriveSaveFn: any = null;
  private _onceSendSmartDriveSettings: any = null;

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
