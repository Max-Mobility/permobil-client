import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { EventData } from 'tns-core-modules/data/observable';
import { DialogService, LoggingService } from '../../services';

@Component({
  selector: 'profile-settings',
  moduleId: module.id,
  templateUrl: 'profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  private static LOG_TAG = 'profile-settings.component ';
  infoItems;
  HEIGHT: string;
  WEIGHT: string;
  DISTANCE: string;
  MAX_SPEED: string;
  ACCELERATION: string;
  TAP_SENSITIVITY: string;
  MODE: string;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _dialogService: DialogService,
    private _params: ModalDialogParams
  ) {
    this.HEIGHT = 'Feet & inches';
    this.WEIGHT = 'Pounds';
    this.DISTANCE = 'Miles';
    this.MAX_SPEED = '70%';
    this.ACCELERATION = '70%';
    this.TAP_SENSITIVITY = '100%';
    this.MODE = 'MX2+';
  }

  ngOnInit() {
    this._logService.logBreadCrumb(
      ProfileSettingsComponent.LOG_TAG + `ngOnInit`
    );
    this.infoItems = this._translateService.instant(
      'profile-settings-component.sections'
    );
  }

  onShownModally(args: EventData) {
    Log.D('profile-settings.component modal shown');
  }

  onHeightTap(args: EventData) {
    Log.D('height action item tap');
    const data = ['Centimeters', 'Feet & inches'];
    this._dialogService
      .action('Height', data, data.indexOf(this.HEIGHT))
      .then(val => (this.HEIGHT = val), err => console.error(err));
  }

  onWeightTap(args: EventData) {
    Log.D('Weight action item tap');
    const data = ['Kilograms', 'Pounds'];
    this._dialogService
      .action('Weight', data, data.indexOf(this.WEIGHT))
      .then(val => (this.WEIGHT = val), err => console.error(err));
  }

  onDistanceTap(args: EventData) {
    Log.D('Distance action item tap');
    const data = ['Kilometers', 'Miles'];
    this._dialogService
      .action('Distance', data, data.indexOf(this.DISTANCE))
      .then(val => (this.DISTANCE = val), err => console.error(err));
  }

  onMaxSpeedTap(args: EventData) {
    Log.D('Max Speed action item tap');
  }

  onAccelerationTap(args: EventData) {
    Log.D('Acceleration action item tap');
  }

  onTapSensitivityTap(args: EventData) {
    Log.D('Tap Sensitivity action item tap');
  }

  onModeTap(args: EventData) {
    Log.D('Mode action item tap');
  }

  closeModal(event) {
    Log.D('profile-settings.component modal closed');
    this._params.closeCallback('some value');
  }
}
