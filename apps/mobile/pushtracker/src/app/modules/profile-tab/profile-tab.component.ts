import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import * as appSettings from 'tns-core-modules/application-settings';
import { DatePicker } from 'tns-core-modules/ui/date-picker';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout/stack-layout';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { STORAGE_KEYS } from '../../enums';
import { DialogService, LoggingService } from '../../services';

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
  @ViewChild('datePickerDialog', { static: false })
  datePickerDialog: ElementRef;

  gender: Array<string>;
  chairInfo: Array<string>;
  name: string;
  email: string;
  isWeight: boolean;

  primary: Array<string>;
  secondary: Array<string>;
  primaryIndex: number;
  secondaryIndex: number;

  USER_GENDER: string;
  USER_BIRTHDAY: Date;
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
    /**
     * Long-form description text to display to user when they're changing their activity goals
     * Depending which value the user tapped we show the translation for the goal (distance, coast-time)
     */
    config_description: string;
  };

  /**
   * The user selected activity goal layout. Used to keep track of which UI layout was selected to apply/remove CSS classes.
   */
  activeDataBox: StackLayout;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _dialogService: DialogService,
    private _page: Page,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    // appSettings.clear();

    this._page.actionBarHidden = true;
    this.gender = ['Male', 'Female'];
    this.chairInfo = ['Rigid', 'Folding', 'Pediatric'];
    this.name = 'Bran Stark';
    this.email = 'email@permobil.com';
    this.primary = ['100', '200', '300'];
    this.secondary = ['100', '200', '300'];
    this.primaryIndex = 0;
    this.secondaryIndex = 0;

    this.isWeight = false;
    // user data
    this.USER_GENDER = 'Male';
    this.USER_BIRTHDAY = new Date('04/01/1980');
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
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL
    ) || STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE;
    this.DISTANCE_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL
    ) || STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE;

    this.activity_goals_dialog_data = {
      config_key: null,
      config_value: null,
      config_title: null,
      config_description: null
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
    configDescription: string,
    configKey: string,
    configValue: number
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
    this.activity_goals_dialog_data.config_description = this._translateService.instant(
      `general.${configDescription}`
    );

    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 0);
  }

  async closeActivityGoalsDialog() {
    // remove the active data box class from the previously selected box
    this.activeDataBox.className = 'data-box';
    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 900);
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
    ) || STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE;
    this.DISTANCE_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL
    ) || STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE;

    // close the dialog which can re-use the function that the close btn uses
    this.closeActivityGoalsDialog();
  }

  onGenderTap(args: EventData) {
    Log.D('gender tap');
    this._setActiveDataBox(args);

    this._dialogService
      .action(
        this._translateService.instant('general.gender'),
        this.gender,
        this.gender.indexOf(this.USER_GENDER)
      )
      .then(val => {
        this._removeActiveDataBox();
        if (val) {
          this.USER_GENDER = val;
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onChairInfoTap(args: EventData) {
    Log.D('chair info tapped');
    this._setActiveDataBox(args);

    this._dialogService
      .action(
        this._translateService.instant('general.chair-info'),
        this.chairInfo,
        this.chairInfo.indexOf(this.USER_CHAIR_INFO)
      )
      .then(val => {
        this._removeActiveDataBox();
        if (val) {
          this.USER_CHAIR_INFO = val;
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  async onSettingsTap(args) {
    Log.D('user tapped settings');
    const cfl = this.settingsDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 0);
  }

  async closeSettingsDialog() {
    const cfl = this.settingsDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 900);
  }

  onHeightTap(args) {
    Log.D('height action item tap');
    this._setActiveDataBox(args);

    const data = ['Centimeters', 'Feet & inches'];
    this._dialogService
      .action(
        this._translateService.instant('general.height'),
        data,
        data.indexOf(this.SETTING_HEIGHT)
      )
      .then(val => {
        this._removeActiveDataBox();
        if (val) {
          this.SETTING_HEIGHT = val;
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onWeightTap(args) {
    Log.D('Weight action item tap');
    this._setActiveDataBox(args);

    const data = ['Kilograms', 'Pounds'];
    this._dialogService
      .action(
        this._translateService.instant('general.weight'),
        data,
        data.indexOf(this.SETTING_WEIGHT)
      )
      .then(val => {
        this._removeActiveDataBox();
        if (val) {
          this.SETTING_WEIGHT = val;
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onDistanceTap(args) {
    Log.D('Distance action item tap');
    this._setActiveDataBox(args);

    const data = ['Kilometers', 'Miles'];
    this._dialogService
      .action(
        this._translateService.instant('general.distance'),
        data,
        data.indexOf(this.SETTING_DISTANCE)
      )
      .then(val => {
        this._removeActiveDataBox();
        if (val) {
          this.SETTING_DISTANCE = val;
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
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

  onListWeightTap(args: EventData) {
    Log.D('on list weight');
    this._setActiveDataBox(args);

    if (this.SETTING_WEIGHT === 'Kilograms') {
      this.primary = Array.from({ length: 280 }, (v, k) => k + 1 + '');
      this.secondary = Array.from({ length: 9 }, (v, k) => '.' + (k + 1));
    } else {
      this.primary = Array.from({ length: 600 }, (v, k) => k + 1 + '');
      this.secondary = Array.from({ length: 9 }, (v, k) => '.' + (k + 1));
    }
    this.isWeight = true;
    this.listPicker();
  }

  onListHeightTap(args: EventData) {
    Log.D('on list Height');
    this._setActiveDataBox(args);

    console.log(this.SETTING_HEIGHT);
    if (this.SETTING_HEIGHT === 'Centimeters') {
      this.primary = Array.from({ length: 300 }, (v, k) => k + 1 + ' cm');
    } else {
      this.primary = Array.from({ length: 8 }, (v, k) => k + 1 + ' ft');
      this.secondary = Array.from({ length: 11 }, (v, k) => k + 1 + ' in');
    }
    this.isWeight = false;

    this.listPicker();
  }

  listPicker() {
    Log.D('user tapped settings');
    const cfl = this.listPickerDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 0);
  }

  async closeListPickerDialog() {
    const cfl = this.listPickerDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 900);
    this._removeActiveDataBox();
  }

  onBirthDateTap(args: EventData) {
    Log.D('user tapped birth date');
    this._setActiveDataBox(args);
    const cfl = this.datePickerDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 0);
  }

  async closeDatePickerDialog() {
    const cfl = this.datePickerDialog.nativeElement as GridLayout;
    this.animateDialog(cfl, 0, 900);
    this._removeActiveDataBox();
  }

  animateDialog(args, x: number, y: number) {
    const cfl = <GridLayout>args;
    cfl
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeOut,
        translate: {
          x: x,
          y: y
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  onDateChanged(args) {
    Log.D('on date change');
    const datePicker = <DatePicker>args.object;

    this.USER_BIRTHDAY = datePicker.date as Date;
    console.log(this.USER_BIRTHDAY);
  }

  onPickerLoaded(args) {
    Log.D('date picker loaded');
    const datePicker = <DatePicker>args.object;

    datePicker.date = this.USER_BIRTHDAY;
    datePicker.minDate = new Date(1950, 0, 1);
    datePicker.maxDate = new Date(2050, 0, 1);
  }

  private _setActiveDataBox(args: EventData) {
    const stack = args.object as StackLayout;
    stack.className = 'data-box-active';
    this.activeDataBox = stack; // set the activeDataBox so that we can remove the applied css class when the selection is made by the user
  }

  private _removeActiveDataBox() {
    // remove the active data box class from the previously selected box
    this.activeDataBox.className = 'data-box';
  }
}
