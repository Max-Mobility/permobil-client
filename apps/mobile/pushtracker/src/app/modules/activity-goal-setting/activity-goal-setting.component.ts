import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import * as appSettings from 'tns-core-modules/application-settings';
import { TextField } from 'tns-core-modules/ui/text-field';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';
import { enableDarkTheme, enableDefaultTheme } from '../../utils';

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

  @ViewChild('textField', { read: false, static: false })
  textField: ElementRef;

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
    // The assumption here is that the parent component, profile-tab is passing translated text
    // in this._params.context - So we're not bothering to run this text through the translate
    // service here. https://github.com/Max-Mobility/permobil-client/issues/280
    Object.assign(this.config, this._params.context);
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._userService.user.subscribe(user => {
      this._user = user;
      this.savedTheme = this._user.data.theme_preference;
      this.savedTheme === APP_THEMES.DEFAULT
      ? enableDefaultTheme()
      : enableDarkTheme();
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
    const textField = (this.textField.nativeElement as TextField);
    const goalValue = textField.text;
    this._validateGoalValueFromText(goalValue);
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
