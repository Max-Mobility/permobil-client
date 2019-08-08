import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { subYears } from 'date-fns';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import {
  DateTimePicker,
  DateTimePickerStyle
} from 'nativescript-datetimepicker';
import * as appSettings from 'tns-core-modules/application-settings';
import { screen } from 'tns-core-modules/platform/platform';
import { View } from 'tns-core-modules/ui/core/view';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { topmost } from 'tns-core-modules/ui/frame/frame';
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
  displayWeight: string;
  displayHeight: string;
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
    private activeRoute: ActivatedRoute,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _dialogService: DialogService,
    private _page: Page
  ) {
    // appSettings.clear();
    this._page.actionBarHidden = true;
    this.user = KinveyUser.getActiveUser();

    if (!this.user.data.dob || this.user.data.dob === '')
      this.user.data.dob = subYears(new Date(), 18); // 'Jan 01, 2001';

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
    this._initDisplayWeight();
    this._initDisplayHeight();
  }

  onHelpTap() {
    Log.D('help action item tap');
  }

  onSettingsTap() {
    Log.D('settings action item tap');
    this._routerExtensions.navigate(['../profile-settings'], {
      relativeTo: this.activeRoute,
      animated: true,
      transition: {
        name: 'slide'
      }
    });
    /*
    this._routerExtensions.navigate(
      [{
        outlets: {
          profileTab: ['../profile-settings']
        }
      }]
    );
    */
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
    this._removeActiveDataBox();
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

    // Persist this goal in Kinvey
    if (
      this.activity_goals_dialog_data.config_key ===
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL
    ) {
      (this.user
        .data as PtMobileUserData).activity_goal_coast_time = this.activity_goals_dialog_data.config_value;
      KinveyUser.update({
        activity_goal_coast_time: this.activity_goals_dialog_data.config_value
      });
    } else if (
      this.activity_goals_dialog_data.config_key ===
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL
    ) {
      (this.user
        .data as PtMobileUserData).activity_goal_distance = this.activity_goals_dialog_data.config_value;
      KinveyUser.update({
        activity_goal_distance: this.activity_goals_dialog_data.config_value
      });
    }

    this.COAST_TIME_ACTIVITY_GOAL =
      appSettings.getNumber(STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) ||
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE;
    this.DISTANCE_ACTIVITY_GOAL =
      appSettings.getNumber(STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) ||
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE;

    // close the dialog which can re-use the function that the close btn uses
    this.closeActivityGoalsDialog();
  }

  onDataBoxTap(args: EventData, key: string) {
    Log.D(`data box ${key} tapped`);

    this._setActiveDataBox(args);

    // need to get the actions for the selected key data box
    let actions;
    if (key === 'gender') {
      actions = ['Male', 'Female'];
    } else if (key === 'chair-type') {
      actions = []; // init the array
      this._translateService.instant('profile-tab.chair-types').forEach(i => {
        actions.push(i);
      });
    } else if (key === 'chair-make') {
      actions = [
        'Colours',
        'Invacare / Küschall',
        'Karman',
        'Ki',
        'Motion Composites',
        'Panthera',
        'Quickie / Sopur / RGK',
        'TiLite',
        'Top End',
        'Other'
      ];
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
          } else if (key === 'chair-type') {
            (this.user.data as PtMobileUserData).chair_type = val;
            KinveyUser.update({ chair_type: val });
            this._logService.logBreadCrumb(`User set chair-type: ${val}`);
          } else if (key === 'chair-make') {
            (this.user.data as PtMobileUserData).chair_make = val;
            KinveyUser.update({ chair_make: val });
            this._logService.logBreadCrumb(`User set chair-make: ${val}`);
          }
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onBirthDateTap(args: EventData) {
    Log.D(`Birthday tapped`);

    this._setActiveDataBox(args);

    const dateTimePickerStyle = DateTimePickerStyle.create(
      args.object as StackLayout
    );

    DateTimePicker.pickDate(
      {
        context: (args.object as StackLayout)._context,
        date: this.user.data.dob,
        minDate: subYears(new Date(), 110),
        maxDate: new Date(),
        title: this._translateService.instant('general.birthday'),
        okButtonText: this._translateService.instant('general.ok'),
        cancelButtonText: this._translateService.instant('general.cancel'),
        locale: this._translateService.getDefaultLang()
      },
      dateTimePickerStyle
    )
      .then(result => {
        console.log('Date saved', result);
        this._removeActiveDataBox();
        if (result) {
          this._logService.logBreadCrumb(
            `User changed birthday: ${result.toDateString()}`
          );
          (this.user.data as any).dob = result;
          KinveyUser.update({ dob: result });
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

  onListWeightTap(args: EventData) {
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    Log.D('User tapped Weight data box');
    this._setActiveDataBox(args);

    if (this.SETTING_WEIGHT === 'Kilograms') {
      this.primary = Array.from({ length: 280 }, (v, k) => k + 1 + '');
      this.secondary = Array.from({ length: 9 }, (v, k) => '.' + k);
    } else {
      this.primary = Array.from({ length: 600 }, (v, k) => k + 1 + '');
      this.secondary = Array.from({ length: 10 }, (v, k) => '.' + k);
    }

    // Initialize primaryIndex and secondaryIndex from user.data.weight
    const indices = this._getWeightIndices();
    this.primaryIndex = parseFloat(this.primary[indices[0]]);
    this.secondaryIndex = 10 * indices[1];

    this.isWeight = true;
    this._openListPickerDialog();

    const rootTabView = topmost().currentPage.frame.getViewById('rootTabView');
    console.log('rootTabView', rootTabView);
  }

  private _getWeightIndices() {
    let weight = this.user.data.weight;
    if (this.SETTING_WEIGHT === 'Pounds') {
      weight = this._kilogramsToPounds(weight);
    }
    const primaryIndex = Math.floor(weight);
    const secondaryIndex = parseFloat((weight % 1).toFixed(1));
    return [primaryIndex - 2, secondaryIndex];
  }

  onListHeightTap(args: EventData) {
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    Log.D('User tapped Height data box');
    this._setActiveDataBox(args);

    if (this.SETTING_HEIGHT === 'Centimeters') {
      this.primary = Array.from({ length: 300 }, (v, k) => k + 1 + ' cm');
    } else {
      this.primary = Array.from({ length: 8 }, (v, k) => k + 1 + ' ft');
      this.secondary = Array.from({ length: 12 }, (v, k) => k + ' in');
    }

    // Initialize primaryIndex and secondaryIndex from user.data.height
    const indices = this._getHeightIndices();
    this.primaryIndex = parseFloat(this.primary[indices[0]]);
    this.secondaryIndex = indices[1];
    if (this.secondaryIndex === 12) {
      this.primaryIndex += 1;
      this.secondaryIndex = 0;
    }
    this.isWeight = false;
    this._openListPickerDialog();
  }

  private _getHeightIndices() {
    let heightString = this.user.data.height + '';
    if (this.SETTING_HEIGHT === 'Feet & inches') {
      heightString = this._centimetersToFeetInches(this.user.data.height);
    }
    const primaryIndex = Math.floor(parseFloat(heightString));
    const secondaryIndex = parseFloat(heightString.split('.')[1]);
    return [primaryIndex - 2, secondaryIndex];
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
        },
        duration: 0
      });
    });

    this._removeActiveDataBox();
  }

  async saveListPickerValue() {
    this.closeListPickerDialog(); // close the list picker dialog from the UI then save the height/weight value for the user based on their settings
    const primaryValue = parseFloat(this.primary[this.primaryIndex]);
    const secondaryValue = parseFloat(this.secondary[this.secondaryIndex]);

    if (this.isWeight) {
      this._saveWeightOnChange(primaryValue, secondaryValue);
    } else {
      this._saveHeightOnChange(primaryValue, secondaryValue);
    }
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
  }

  private _initDisplayWeight() {
    if (!this.displayWeight) {
      this.displayWeight = this._displayWeightInKilograms(
        this.user.data.weight
      );
      // convert from metric weight (as stored in Kinvey) to user preferred unit
      if (this.SETTING_WEIGHT === 'Pounds') {
        this.displayWeight = this._displayWeightInPounds(
          this._kilogramsToPounds(this.user.data.weight)
        );
      }
      if (!this.displayWeight) this.displayWeight = '';
    }
  }

  private _initDisplayHeight() {
    if (!this.displayHeight) {
      this.displayHeight = this._displayHeightInCentimeters(
        this.user.data.height
      );
      // convert from metric height (as stored in Kinvey) to user preferred unit
      if (this.SETTING_HEIGHT === 'Feet & inches') {
        const heightString = this._centimetersToFeetInches(
          this.user.data.height
        );
        const feet = parseFloat(heightString.split('.')[0]);
        const inches = parseFloat(heightString.split('.')[1]);
        this.displayHeight = this._displayHeightInFeetInches(feet, inches);
      }
      if (!this.displayHeight) this.displayHeight = '';
    }
  }

  private _saveWeightOnChange(primaryValue: number, secondaryValue: number) {
    (this.user.data as PtMobileUserData).weight = primaryValue + secondaryValue;
    if (this.SETTING_WEIGHT === 'Pounds') {
      this.user.data.weight = this._poundsToKilograms(
        primaryValue + secondaryValue
      );
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    } else {
      this.user.data.weight = primaryValue + secondaryValue;
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    }
    KinveyUser.update({ weight: this.user.data.weight });
  }

  private _saveHeightOnChange(primaryValue: number, secondaryValue: number) {
    (this.user.data as PtMobileUserData).height =
      primaryValue + 0.01 * secondaryValue;
    if (this.SETTING_HEIGHT === 'Feet & inches') {
      this.user.data.height = this._feetInchesToCentimeters(
        primaryValue,
        secondaryValue
      );
      this.displayHeight = this._displayHeightInFeetInches(
        primaryValue,
        secondaryValue
      );
    } else {
      this.user.data.height = primaryValue + 0.01 * secondaryValue;
      this.displayHeight = this._displayHeightInCentimeters(
        this.user.data.height
      );
    }
    KinveyUser.update({ height: this.user.data.height });
  }

  private _poundsToKilograms(val: number) {
    return val * 0.453592;
  }

  private _kilogramsToPounds(val: number) {
    return parseFloat((val * 2.20462).toFixed(1));
  }

  private _feetInchesToCentimeters(feet: number, inches: number) {
    return (feet * 12 + inches) * 2.54;
  }

  private _centimetersToFeetInches(val: number) {
    const inch = val * 0.3937;
    if (Math.round(inch % 12) === 0) return Math.floor(inch / 12) + 1 + '.0';
    else return Math.floor(inch / 12) + '.' + Math.round(inch % 12);
  }

  private _displayWeightInPounds(val: number) {
    return val + ' lbs';
  }

  private _displayWeightInKilograms(val: number) {
    return val + ' kg';
  }

  private _displayHeightInFeetInches(feet: number, inches: number) {
    return `${Math.floor(feet).toFixed()}' ${inches.toFixed()}`;
  }

  private _displayHeightInCentimeters(val: number) {
    return val + ' cm';
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

  public primaryIndexChanged(picker) {
    this.primaryIndex = picker.selectedIndex;
  }

  public secondaryIndexChanged(picker) {
    this.secondaryIndex = picker.selectedIndex;
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
