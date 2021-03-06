import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import { ModalDialogParams } from '@nativescript/angular';
import { ApplicationSettings, TextField, Frame } from '@nativescript/core';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { PushTrackerUser } from '../../models';
import { LoggingService } from '../../services';

@Component({
  moduleId: module.id,
  selector: 'activity-goal-setting',
  templateUrl: './activity-goal-setting.component.html'
})
export class ActivityGoalSettingComponent implements OnInit {
  APP_THEMES = APP_THEMES;
  config: {
    title: string;
    description: string;
    key: string;
    value: number;
    value_description: string;
  };

  CURRENT_THEME: string;

  private _user: PushTrackerUser;

  private _textField: TextField;

  constructor(
    private _logService: LoggingService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._user = KinveyUser.getActiveUser() as PushTrackerUser;
    this._logService.logBreadCrumb(ActivityGoalSettingComponent.name, 'OnInit');
    this.config = {
      title: '',
      description: '',
      key: '',
      value: 0,
      value_description: ''
    };
    // The assumption here is that the parent component, profile-tab is passing translated text
    // in this._params.context - So we're not bothering to run this text through the translate
    // service here. https://github.com/Max-Mobility/permobil-client/issues/280
    Object.assign(this.config, this._params.context);
    this.CURRENT_THEME = ApplicationSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    if (this.config.value && typeof this.config.value === 'number') {
      this.config.value = parseFloat(this.config.value.toFixed(1));
    }
  }

  textFieldLoaded(args) {
    this._textField = args.object as TextField;
  }

  closeModal() {
    this._params.closeCallback(this.config.value);
  }

  decrementConfigValue() {
    this.config.value -= 0.1;
    if (this.config.value < 0) this.config.value = 0;
    this.config.value = Math.round(this.config.value * 10) / 10;
  }

  incrementConfigValue() {
    this.config.value += 0.1;
    this.config.value = Math.round(this.config.value * 10) / 10;
  }

  onTextFieldReturnPress(args) {
    const textField = args.object as TextField;
    // check for text to convert first, else just reset for now to avoid NaN
    this._validateGoalValueFromText(textField.text);
  }

  onTextFieldBlur(args) {
    this.onTextFieldReturnPress(args);
  }

  _validateGoalValueFromText(text) {
    if (text || text !== '') {
      // Attempt to parse as float
      this.config.value = parseFloat(text);

      // If goal value is negative, discard new value and restore to original value
      if (this.config.value < 0.0) {
        if (this.config.key === STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) {
          this.config.value = this._user.data.activity_goal_coast_time;
        } else if (this.config.key === STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) {
          this.config.value = this._user.data.activity_goal_distance;
        }
      }
      // round to the nearest 0.1
      this.config.value = Math.round(this.config.value * 10) / 10;
    } else {
      // Input text is invalid or empty - restore to original value
      if (this.config.key === STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) {
        this.config.value = this._user.data.activity_goal_coast_time;
      } else if (this.config.key === STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) {
        this.config.value = this._user.data.activity_goal_distance;
      }
      // round to the nearest 0.1
      this.config.value = Math.round(this.config.value * 10) / 10;
    }
  }

  onSetGoalBtnTap() {
    console.log('onSetGoalBtnTap', this._textField);
    console.log('have the textField');
    const goalValue = this._textField.text;

    // update this.config.value and convert it appropriately
    this._validateGoalValueFromText(goalValue);

    this._logService.logBreadCrumb(
      ActivityGoalSettingComponent.name,
      'User set activity goals: ' + this.config.key + ' ' + this.config.value
    );

    // close the modal
    this.closeModal();
  }
}
