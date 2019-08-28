import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import * as appSettings from 'tns-core-modules/application-settings';
import { TextField } from 'tns-core-modules/ui/text-field';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';

@Component({
  moduleId: module.id,
  selector: 'activity-goal-setting',
  templateUrl: './activity-goal-setting.component.html'
})
export class ActivityGoalSettingComponent implements OnInit {
  config: {
    title: string;
    description: string;
    key: string;
    value: number;
    value_description: string;
  };

  savedTheme: string;

  private _user: PushTrackerUser;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _userService: PushTrackerUserService,
    private _params: ModalDialogParams
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb('activity-goal-setting.component OnInit');
    this.config = {
      title: '',
      description: '',
      key: '',
      value: 0,
      value_description: ''
    };
    Object.assign(this.config, this._params.context);
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._userService.user.subscribe(user => {
      this._user = user;
    });
  }

  closeModal() {
    this._params.closeCallback(this.config.value);
  }

  decrementConfigValue() {
    Log.D('Decrement the config value');
    this.config.value -= 0.1;
    if (this.config.value < 0) this.config.value = 0;
    this.config.value = Math.round(this.config.value * 10) / 10;
  }

  incrementConfigValue() {
    Log.D('Increment the config value');
    this.config.value += 0.1;
    this.config.value = Math.round(this.config.value * 10) / 10;
  }

  onTextFieldReturnPress(args) {
    const textField = args.object as TextField;
    // check for text to convert first, else just reset for now to avoid NaN
    if (textField.text || textField.text !== '') {
      this.config.value = parseFloat(textField.text);
      this.config.value = Math.round(this.config.value * 10) / 10;
    } else {
      if (this.config.key === STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) {
        this.config.value = this._user.data.activity_goal_coast_time;
      } else if (this.config.key === STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) {
        this.config.value = this._user.data.activity_goal_distance;
      }

      this.config.value = Math.round(this.config.value * 10) / 10;
    }
  }

  onTextFieldBlur(args) {
    this.onTextFieldReturnPress(args);
  }

  onSetGoalBtnTap() {
    this._logService.logBreadCrumb(
      'User set activity goals: ' + this.config.key + ' ' + this.config.value
    );

    // Persist this goal in Kinvey
    if (this.config.key === STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) {
      this._userService.updateDataProperty(
        'activity_goal_coast_time',
        this.config.value
      );
      KinveyUser.update({
        activity_goal_coast_time: this.config.value
      });
    } else if (this.config.key === STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) {
      this._userService.updateDataProperty(
        'activity_goal_distance',
        this.config.value
      );
      KinveyUser.update({
        activity_goal_distance: this.config.value
      });
    }

    // close the modal
    this.closeModal();
  }
}