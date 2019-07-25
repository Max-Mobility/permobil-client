import { Component, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import * as appSettings from 'tns-core-modules/application-settings';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout/stack-layout';
import { Button } from 'tns-core-modules/ui/button/button';
import { Page } from 'tns-core-modules/ui/page';
import { STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';
import { ProfileSettingsComponent} from '../profile-settings/profile-settings.component';
import { Toasty } from 'nativescript-toasty';
import { Color } from 'tns-core-modules/color';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { dialog } from '../../utils/dialog-list.utils';
import { ListPicker } from 'tns-core-modules/ui/list-picker';
import { DatePicker } from 'tns-core-modules/ui/date-picker';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  @ViewChild('activityGoalsDialog', { static: false })
  activityGoalsDialog: ElementRef;
  @ViewChild('settingsDialog', { static: false })
  settingsDialog: ElementRef;
  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;
  @ViewChild('datePickerDialog', { static: false})
  datePickerDialog: ElementRef;
  coastTime: Array<string>;
  distance: Array<string>;
  gender: Array<string>;
  birthday: Array<string>;
  weight: Array<String>;
  height: Array<string>;
  chairInfo: Array<string>;
  name: string;
  email: string;

  primary: Array<string>;
  secondary: Array<string>;

  USER_GENDER: string;
  USER_BIRTHDAY: string;
  USER_WEIGHT: string;
  USER_HEIGHT: string;
  USER_CHAIR_INFO: string;

  SETTING_WEIGHT: string;
  SETTING_HEIGHT: string;
  SETTING_DISTANCE: string;
  SETTING_MAX_SPEED: string;
  SETTING_ACCELERATION: string;
  SETTING_TAP_SENSITIVITY: string;
  SETTING_MODE: string;

  COAST_TIME_ACTIVITY_GOAL; // user defined coast-time activity goal
  DISTANCE_ACTIVITY_GOAL; // user defined distance activity goal

  /**
   * Object to use for activityGoalsDialog
   */
  activity_goals_dialog_data: {
    /**
     * The STORAGE_KEYS enum value for the ACTIVITY_GOALS config the user selected.
     */
    config_key: string;
    /**
     * Value to display to user when they're changing their activity goals
     * Depending which value the user tapped we show the translation for the goal (distance, coast-time)
     */
    config_value: any;
    /**
     * Title to display to user when they're changing their activity goals
     * Depending which value the user tapped we show the translation for the goal (distance, coast-time)
     */
    config_title: string;
  };

  /**
   * The user selected activity goal layout. Used to keep track of which UI layout was selected to apply/remove CSS classes.
   */
  activeDataBox: StackLayout;


  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    // appSettings.clear();

    this._page.actionBarHidden = true;

    this.coastTime = ['100', '200'];
    this.distance = ['3.0', '4.0'];
    this.gender = ['Male', 'Female'];
    this.birthday = ['290 AC', '291 AC'];
    this.weight = ['115 lb', '130 lb'];
    this.height = ['5\'1"', '5\'5"'];
    this.chairInfo = ['Rigid', 'Folding', 'Pediatric'];
    this.name = 'Bran Stark';
    this.email = 'email@permobil.com';
    this. primary = ['100', '200', '300'];
    this. secondary = ['100', '200', '300'];
    // user data
    this.USER_GENDER = 'Male';
    this.USER_BIRTHDAY = '04/01/1980';
    this.USER_WEIGHT = '190 lbs';
    this.USER_HEIGHT = '5 ft 10 in';
    this.USER_CHAIR_INFO = 'Rigid';
    // Setting
    this.SETTING_HEIGHT = 'Feet & inches';
    this.SETTING_WEIGHT = 'Pounds';
    this.SETTING_DISTANCE = 'Miles';
    this.SETTING_MAX_SPEED = '70%';
    this.SETTING_ACCELERATION = '70%';
    this.SETTING_TAP_SENSITIVITY = '100%';
    this.SETTING_MODE = 'MX2+';

    this.COAST_TIME_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL,
      60
    );
    this.DISTANCE_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL,
      100
    );

    this.activity_goals_dialog_data = {
      config_key: null,
      config_value: null,
      config_title: null
    };
  }

  ngOnInit() {
    this._logService.logBreadCrumb('profile-tab.component ngOnInit');
  }

  onHelpTap() {
    Log.D('help action item tap');
  }


  async onActivityGoalTap(
    args,
    configTitle: string,
    configKey: string,
    configValue
  ) {
    Log.D('user tapped config = ', configTitle, args.object);
    const stack = args.object as StackLayout;
    stack.className = 'data-box-active';
    this.activeDataBox = stack; // set the activeDataBox so that we can remove the applied css class when the selection is made by the user

    // setting the dialog data so we know what we are changing
    this.activity_goals_dialog_data.config_key = configKey;
    this.activity_goals_dialog_data.config_value = configValue;
    this.activity_goals_dialog_data.config_title = this._translateService.instant(
      `general.${configTitle}`
    );

    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    cfl
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeOut,
        translate: {
          x: 0,
          y: 0
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  async closeActivityGoalsDialog() {
    // remove the active data box class from the previously selected box
    this.activeDataBox.className = 'data-box';
    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    cfl.animate({
      duration: 300,
      opacity: 0,
      curve: AnimationCurve.easeOut,
      translate: {
        x: 0,
        y: 900
      }
    });
  }

  incrementConfigValue() {
    Log.D('Increment the config value');
    this.activity_goals_dialog_data.config_value =
      this.activity_goals_dialog_data.config_value + 5;
  }

  decrementConfigValue() {
    Log.D('Decrement the config value');
    this.activity_goals_dialog_data.config_value =
      this.activity_goals_dialog_data.config_value - 5;
  }

  onSetGoalBtnTap() {
    this._logService.logBreadCrumb(
      'User set activity goals: ' +
        this.activity_goals_dialog_data.config_key +
        ' ' +
        this.activity_goals_dialog_data.config_value
    );
    // Save the Activity Goals value
    appSettings.setNumber(
      this.activity_goals_dialog_data.config_key,
      this.activity_goals_dialog_data.config_value
    );

    this.COAST_TIME_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL
    );
    this.DISTANCE_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL
    );

    // close the dialog which can re-use the function that the close btn uses
    this.closeActivityGoalsDialog();
  }

  onGenderTap() {
    Log.D('gender');
    dialog('Gender', this.gender, this.gender.indexOf(this.USER_GENDER))
      .then(
        (val) => this.USER_GENDER = val
      );
  }

  onChairInfoTap() {
    Log.D('chair info tapped');
    dialog('Chair Info', this.chairInfo, this.chairInfo.indexOf(this.USER_CHAIR_INFO))
      .then(
        (val) => this.USER_CHAIR_INFO = val
      );
  }

  async onSettingsTap(args) {
    Log.D('user tapped settings');

    const cfl = this.settingsDialog.nativeElement as GridLayout;
    cfl
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeOut,
        translate: {
          x: 0,
          y: 0
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  async closeSettingsDialog() {
    const cfl = this.settingsDialog.nativeElement as GridLayout;
    cfl.animate({
      duration: 300,
      opacity: 0,
      curve: AnimationCurve.easeOut,
      translate: {
        x: 0,
        y: 900
      }
    });
  }

  onHeightTap(args) {
    Log.D('height action item tap');
    const data = ['Centimeters', 'Feet & inches'];
    dialog('Height', data, data.indexOf(this.SETTING_HEIGHT) )
      .then(
        (val) => this.SETTING_HEIGHT = val,
        (err) => console.error(err)
      );
  }

  onWeightTap(args) {
    Log.D('Weight action item tap');
    const data = ['Kilograms', 'Pounds'];
    dialog('Weight', data ,  data.indexOf(this.SETTING_WEIGHT))
      .then(
        (val) => this.SETTING_WEIGHT = val,
        (err) => console.error(err)
      );
  }

  onDistanceTap(args) {
    Log.D('Distance action item tap');
    const data = ['Kilometers', 'Miles'];
    dialog('Distance', data, data.indexOf(this.SETTING_DISTANCE))
      .then(
        (val) => this.SETTING_DISTANCE = val,
        (err) => console.error(err)
      );
  }

  onMaxSpeedTap(args) {
    Log.D('Max Speed action item tap');
  }

  onAccelerationTap(args) {
    Log.D('Acceleration action item tap');
  }

  onTapSensitivityTap(args) {
    Log.D('Tap Sensitivity action item tap');
  }

  onModeTap(args) {
    Log.D('Mode action item tap');
  }

  onListWeightTap() {
    const a  = Array.from({length: 300}, (v , k) => k + 1);
    console.dir(a);
    this.listPicker();
  }

  onListHeightTap() {
    this.primary = ['1 ft', '2 ft', '3 ft', '4 ft', '5 ft', '6 ft', '7 ft', '8 ft'];
    this.secondary = ['0 in', '1 in', '2 in', '3 in', '4 in', '5 in', '6 in', '7 in', '8 in', '9 in', '10 in', '11 in'];
    this.listPicker();
  }

  listPicker() {
    Log.D('user tapped settings');
     const cfl = this.listPickerDialog.nativeElement as GridLayout;
    cfl
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeOut,
        translate: {
          x: 0,
          y: 0
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  async closeListPickerDialog() {
    const cfl = this.listPickerDialog.nativeElement as GridLayout;
    cfl.animate({
      duration: 300,
      opacity: 0,
      curve: AnimationCurve.easeOut,
      translate: {
        x: 0,
        y: 900
      }
    });
  }

  datePicker() {
    Log.D('user tapped settings');
    const cfl = this.datePickerDialog.nativeElement as GridLayout;
    cfl
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeOut,
        translate: {
          x: 0,
          y: 0
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  async closeDatePickerDialog() {
    const cfl = this.datePickerDialog.nativeElement as GridLayout;
    cfl.animate({
      duration: 300,
      opacity: 0,
      curve: AnimationCurve.easeOut,
      translate: {
        x: 0,
        y: 900
      }
    });
  }

  onDateChanged(args) {
    Log.D('on date change');
  }

  onPickerLoaded(args) {
    Log.D('date picker loaded');
    const datePicker = <DatePicker>args.object;

    datePicker.year = 1980;
    datePicker.month = 2;
    datePicker.day = 9;
    datePicker.minDate = new Date(1950, 0, 29);
    datePicker.maxDate = new Date(2050, 12, 12);
}

}
