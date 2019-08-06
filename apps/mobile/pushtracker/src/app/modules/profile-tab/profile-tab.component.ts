import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { subYears } from 'date-fns';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import { DateTimePicker } from 'nativescript-datetimepicker';
import * as appSettings from 'tns-core-modules/application-settings';
import { screen } from 'tns-core-modules/platform/platform';
import { View } from 'tns-core-modules/ui/core/view';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { STORAGE_KEYS } from '../../enums';
import { PtMobileUserData } from '../../models';
// import { PtMobileUser } from '../../models';
import { DialogService, LoggingService } from '../../services';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  @ViewChild('activityGoalsDialog', { static: false })
  activityGoalsDialog: ElementRef;

  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;

  user: any; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User

  isWeight: boolean;
  primary: string[];
  secondary: string[];
  primaryIndex: number;
  secondaryIndex: number;
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

  /**
   * Being used to databind the translateY for 'off-screen' positioned layouts.
   */
  screenHeight: number;

  constructor(
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _dialogService: DialogService,
    private _page: Page
  ) {
    // appSettings.clear();
    this._page.actionBarHidden = true;
    this.user = KinveyUser.getActiveUser();
    console.log('current pt mobile user', this.user);

    this.primary = ['100', '200', '300'];
    this.secondary = ['100', '200', '300'];
    this.primaryIndex = 0;
    this.secondaryIndex = 0;

    this.isWeight = false;
    // Setting
    this.SETTING_HEIGHT = 'Feet & inches';
    this.SETTING_WEIGHT = 'Pounds';
    this.SETTING_DISTANCE = 'Miles';
    this.SETTING_MAX_SPEED = '70%';
    this.SETTING_ACCELERATION = '70%';
    this.SETTING_TAP_SENSITIVITY = '100%';
    this.SETTING_MODE = 'MX2+';

    this.COAST_TIME_ACTIVITY_GOAL =
      appSettings.getNumber(STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) ||
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE;
    this.DISTANCE_ACTIVITY_GOAL =
      appSettings.getNumber(STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) ||
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE;

    this.activity_goals_dialog_data = {
      config_key: null,
      config_value: null,
      config_title: null,
      config_description: null
    };

    this.screenHeight = screen.mainScreen.heightDIPs;
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
    this._setActiveDataBox(args);

    // setting the dialog data so we know what we are changing
    this.activity_goals_dialog_data.config_key = configKey;
    this.activity_goals_dialog_data.config_value = configValue;
    this.activity_goals_dialog_data.config_title = this._translateService.instant(
      `general.${configTitle}`
    );
    this.activity_goals_dialog_data.config_description = this._translateService.instant(
      `general.${configDescription}`
    );

    const x = this.activityGoalsDialog.nativeElement as GridLayout;
    this._animateDialog(x, 0, 0);
  }

  async closeActivityGoalsDialog() {
    // remove the active data box class from the previously selected box
    this.activeDataBox.className = 'data-box';
    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    this._animateDialog(cfl, 0, 900);
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

    this.COAST_TIME_ACTIVITY_GOAL =
      appSettings.getNumber(STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) ||
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE;
    this.DISTANCE_ACTIVITY_GOAL =
      appSettings.getNumber(STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) ||
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE;

    // close the dialog which can re-use the function that the close btn uses
    this.closeActivityGoalsDialog();
  }

  async onSettingsTap(args) {
    Log.D('User tapped settings');

    this._routerExtensions.navigate(['/profile-settings'], {});

    // this._modalService
    //   .showModal(ProfileSettingsComponent, {
    //     context: {},
    //     fullscreen: true,
    //     viewContainerRef: this._vcRef
    //   })
    //   .catch(err => {
    //     this._logService.logException(err);
    //   });
  }

  onDataBoxTap(args: EventData, key: string) {
    Log.D(`data box ${key} tapped`);

    this._setActiveDataBox(args);

    // need to get the actions for the selected key data box
    let actions;
    if (key === 'gender') {
      actions = ['Male', 'Female'];
    } else if (key === 'chair-info') {
      actions = ['Rigid', 'Folding', 'Pediatric'];
    }

    this._dialogService
      .action(this._translateService.instant(`general.${key}`), actions)
      .then(val => {
        this._removeActiveDataBox();

        if (val) {
          // map the selected value to the user profile key
          if (key === 'gender') {
            (this.user.data as PtMobileUserData).gender = val;
            KinveyUser.update({ gender: val });
            this._logService.logBreadCrumb(`User set gender: ${val}`);
          } else if (key === 'chair-info') {
            (this.user.data as PtMobileUserData).chair_info = val;
            this._logService.logBreadCrumb(`User set chair-info: ${val}`);
          }
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onBirthDateTap(args: EventData) {
    this._setActiveDataBox(args);

    DateTimePicker.pickDate({
      context: (args.object as StackLayout)._context,
      date: subYears(new Date(), 18),
      minDate: subYears(new Date(), 110),
      maxDate: new Date(),
      title: this._translateService.instant('general.birthday'),
      okButtonText: this._translateService.instant('general.ok'),
      cancelButtonText: this._translateService.instant('general.cancel')
    })
      .then(result => {
        this._removeActiveDataBox();
        if (result) {
          this._logService.logBreadCrumb(
            `User changed birthday: ${result.toDateString()}`
          );
          (this.user.data as any).dob = result;
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onHeightTap(args) {
    Log.D('height action item tap');
    this._setActiveDataBox(args);

    const data = ['Centimeters', 'Feet & inches'];
    this._dialogService
      .action(this._translateService.instant('general.height'), data)
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
      .action(this._translateService.instant('general.weight'), data)
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
      .action(this._translateService.instant('general.distance'), data)
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
    Log.D('User tapped Weight data box');
    this._setActiveDataBox(args);

    if (this.SETTING_WEIGHT === 'Kilograms') {
      this.primary = Array.from({ length: 280 }, (v, k) => k + 1 + '');
      this.secondary = Array.from({ length: 9 }, (v, k) => '.' + (k + 1));
    } else {
      this.primary = Array.from({ length: 600 }, (v, k) => k + 1 + '');
      this.secondary = Array.from({ length: 9 }, (v, k) => '.' + (k + 1));
    }

    this.isWeight = true;
    this._openListPickerDialog();
  }

  onListHeightTap(args: EventData) {
    Log.D('User tapped Height data box');
    this._setActiveDataBox(args);

    if (this.SETTING_HEIGHT === 'Centimeters') {
      this.primary = Array.from({ length: 300 }, (v, k) => k + 1 + ' cm');
    } else {
      this.primary = Array.from({ length: 8 }, (v, k) => k + 1 + ' ft');
      this.secondary = Array.from({ length: 11 }, (v, k) => k + 1 + ' in');
    }

    this.isWeight = false;
    this._openListPickerDialog();
  }

  async closeListPickerDialog() {
    const x = this.listPickerDialog.nativeElement as GridLayout;
    x.animate({
      opacity: 0,
      duration: 200
    }).then(() => {
      x.animate({
        translate: {
          x: 0,
          y: this.screenHeight
        }
      });
    });
    this._removeActiveDataBox();
  }

  private _openListPickerDialog() {
    const x = this.listPickerDialog.nativeElement as GridLayout;
    x.animate({
      translate: {
        x: 0,
        y: 0
      },
      duration: 0
    }).then(() => {
      x.animate({
        opacity: 1,
        duration: 200
      });
    });
  }

  private _animateDialog(args, x: number, y: number) {
    const layout = args as View;
    layout
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeIn,
        translate: {
          x: x,
          y: y
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
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
