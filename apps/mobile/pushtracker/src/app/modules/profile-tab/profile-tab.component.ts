import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
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
import { prompt, PromptOptions } from 'tns-core-modules/ui/dialogs';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { PushTrackerUserService } from '../../services/pushtracker.user.service';

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

  user: PushTrackerUser; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User

  isHeightInCentimeters: boolean;
  displayWeight: string;
  displayHeight: string;
  // List picker related fields
  LIST_PICKER_OPTIONS: string[];
  primary: string[];
  secondary: string[];
  primaryIndex: number;
  secondaryIndex: number;
  listPickerIndex: number;
  listPickerTitle: string;
  listPickerDescription: string;
  listPickerDescriptionNecessary: boolean;
  listPickerNeedsSecondary: boolean;
  // Settings
  SETTING_WEIGHT_UNITS: string[];
  SETTING_WEIGHT: string;
  SETTING_HEIGHT_UNITS: string[];
  SETTING_HEIGHT: string;
  SETTING_DISTANCE_UNITS: string[];
  SETTING_DISTANCE: string;
  SETTING_MAX_SPEED: string;
  SETTING_ACCELERATION: string;
  SETTING_TAP_SENSITIVITY: string;
  SETTING_MODE: string;
  COAST_TIME_ACTIVITY_GOAL; // user defined coast-time activity goal
  DISTANCE_ACTIVITY_GOAL; // user defined distance activity goal
  _barcodeScanner: BarcodeScanner;

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
    private _page: Page,
    private userService: PushTrackerUserService
  ) {
    // appSettings.clear();
    this.getUser();
    this._page.actionBarHidden = true;
    this._barcodeScanner = new BarcodeScanner();

    if (!this.user.data.dob || this.user.data.dob === null)
      this.user.data.dob = subYears(new Date(), 18); // 'Jan 01, 2001';

    this.primary = ['100', '200', '300'];
    this.secondary = ['100', '200', '300'];
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    this.listPickerIndex = 0;
    this.listPickerTitle = '';
    this.listPickerDescription = '';
    this.listPickerDescriptionNecessary = true;
    this.listPickerNeedsSecondary = false;

    this.LIST_PICKER_OPTIONS = [
      'Gender',
      'Weight',
      'Height',
      'Chair Type',
      'Chair Make'
    ];
    this.listPickerIndex = 0;

    // Units for settings
    this.SETTING_HEIGHT_UNITS = ['Centimeters', 'Feet & inches'];
    this.SETTING_WEIGHT_UNITS = ['Kilograms', 'Pounds'];
    this.SETTING_DISTANCE_UNITS = ['Kilometers', 'Miles'];

    // Unit settings
    this.SETTING_HEIGHT =
      this.SETTING_HEIGHT_UNITS[this.user.data.height_unit_preference] ||
      'Feet & inches';
    this.SETTING_WEIGHT =
      this.SETTING_WEIGHT_UNITS[this.user.data.weight_unit_preference] ||
      'Pounds';
    this.SETTING_DISTANCE =
      this.SETTING_DISTANCE_UNITS[this.user.data.distance_unit_preference] ||
      'Miles';
    this.isHeightInCentimeters = this.SETTING_HEIGHT === 'Centimeters';

    // SmartDrive settings
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

    this._page.on(Page.navigatedToEvent, args => {
      this.getUser();
      this.SETTING_HEIGHT =
        this.SETTING_HEIGHT_UNITS[this.user.data.height_unit_preference] ||
        'Feet & inches';
      this.SETTING_WEIGHT =
        this.SETTING_WEIGHT_UNITS[this.user.data.weight_unit_preference] ||
        'Pounds';
      this.SETTING_DISTANCE =
        this.SETTING_DISTANCE_UNITS[this.user.data.distance_unit_preference] ||
        'Miles';

      this._initDisplayWeight();
      this._initDisplayHeight();

      this.isHeightInCentimeters = this.SETTING_HEIGHT === 'Centimeters';
    });
  }

  ngOnInit() {
    this.getUser();
    this._logService.logBreadCrumb('profile-tab.component ngOnInit');
    this._initDisplayWeight();
    this._initDisplayHeight();
  }

  getUser(): void {
    this.userService.user.subscribe(user => this.user = user);
  }

  onHelpTap() {
    Log.D('help action item tap');
  }

  onSettingsTap() {
    Log.D('settings action item tap');
    this._routerExtensions.navigate(['../profile-settings'], {
      relativeTo: this.activeRoute,
      transition: {
        name: 'slideLeft',
        duration: 250,
        curve: AnimationCurve.easeInOut
      }
    });
  }

  onNameLongPress(args, nameField: string) {
    Log.D('First name long press');

    const opts = {
      title: this._translateService.instant(`profile-tab.edit-${nameField}`),
      defaultText:
        nameField === 'first-name'
          ? this.user.data.first_name
          : this.user.data.last_name,
      cancelable: true,
      cancelButtonText: this._translateService.instant('general.cancel'),
      okButtonText: this._translateService.instant('general.ok')
    } as PromptOptions;

    prompt(opts).then(r => {
      if (r.result === true) {
        if (nameField === 'first-name') {
          KinveyUser.update({ first_name: r.text });
          this.userService.updateDataProperty('first_name', r.text);
          this._logService.logBreadCrumb(`User updated first name: ${r.text}`);
        } else if (nameField === 'last-name') {
          KinveyUser.update({ last_name: r.text });
          this.userService.updateDataProperty('last_name', r.text);
          this._logService.logBreadCrumb(`User updated last name: ${r.text}`);
        }
      }
    });
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

    // Setting the dialog data to the actual user value
    if (configKey === 'COAST_TIME_ACTIVITY_GOAL') {
      if (this.user.data.activity_goal_coast_time)
        this.activity_goals_dialog_data.config_value = this.user.data.activity_goal_coast_time;
    } else if (configKey === 'DISTANCE_ACTIVITY_GOAL') {
      if (this.user.data.activity_goal_distance)
        this.activity_goals_dialog_data.config_value = this.user.data.activity_goal_distance;
    }

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
      this.userService.updateDataProperty('activity_goal_coast_time', this.activity_goals_dialog_data.config_value);
      KinveyUser.update({
        activity_goal_coast_time: this.activity_goals_dialog_data.config_value
      });
    } else if (
      this.activity_goals_dialog_data.config_key ===
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL
    ) {
      this.userService.updateDataProperty('activity_goal_distance', this.activity_goals_dialog_data.config_value);
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

  onBirthDateTap(args: EventData) {
    Log.D(`Birthday tapped`);

    this._setActiveDataBox(args);

    const dateTimePickerStyle = DateTimePickerStyle.create(
      args.object as StackLayout
    );

    DateTimePicker.pickDate(
      {
        context: (args.object as StackLayout)._context,
        date: new Date(this.user.data.dob),
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
        this._removeActiveDataBox();
        if (result) {
          this._logService.logBreadCrumb(
            `User changed birthday: ${result.toDateString()}`
          );
          this.userService.updateDataProperty('dob', result);
          const date = new Date(result);
          const month = date.getUTCMonth() + 1;
          const day = date.getUTCDate();
          const year = date.getUTCFullYear();
          const dateFormatted = month + '/' + day + '/' + year;
          Log.D('Birthday formatted', dateFormatted);
          KinveyUser.update({ dob: dateFormatted });
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onListPickerTap(args: EventData, index) {
    this.listPickerIndex = index;
    switch (this.listPickerIndex) {
      case 0:
        this._onListGenderTap(args);
        break;
      case 1:
        this._onListWeightTap(args);
        break;
      case 2:
        this._onListHeightTap(args);
        break;
      case 3:
        this._onListChairTypeTap(args);
        break;
      case 4:
        this._onListChairMakeTap(args);
        break;
    }
  }

  primaryIndexChanged(picker) {
    this.primaryIndex = picker.selectedIndex;
  }

  secondaryIndexChanged(picker) {
    this.secondaryIndex = picker.selectedIndex;
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
    switch (this.listPickerIndex) {
      case 0:
        this.userService.updateDataProperty('gender', this.primary[this.primaryIndex]);
        KinveyUser.update({ gender: this.user.data.gender });
        break;
      case 1:
        this._saveWeightOnChange(
          parseFloat(this.primary[this.primaryIndex]),
          parseFloat(this.secondary[this.secondaryIndex])
        );
        break;
      case 2:
        this._saveHeightOnChange(
          parseFloat(this.primary[this.primaryIndex]),
          parseFloat(this.secondary[this.secondaryIndex])
        );
        break;
      case 3:
        this.userService.updateDataProperty('chair_type', this.primary[this.primaryIndex]);
        KinveyUser.update({ chair_type: this.user.data.chair_type });
        break;
      case 4:
        this.userService.updateDataProperty('chair_make', this.primary[this.primaryIndex]);
        KinveyUser.update({ chair_make: this.user.data.chair_make });
        break;
    }

    this.primaryIndex = 0;
    this.secondaryIndex = 0;
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

  private _getHeightIndices() {
    let heightString = this.user.data.height + '';
    if (this.SETTING_HEIGHT === 'Feet & inches') {
      heightString = this._centimetersToFeetInches(this.user.data.height);
    }
    const primaryIndex = Math.floor(parseFloat(heightString));
    const secondaryIndex = parseFloat(heightString.split('.')[1]);
    return [primaryIndex - 2, secondaryIndex];
  }

  private _onListGenderTap(args: EventData) {
    Log.D('User tapped Gender data box');

    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    Log.D('User tapped gender data box');
    this._setActiveDataBox(args);

    this.primary = ['Male', 'Female'];
    if (this.user.data.gender === 'Male') this.primaryIndex = 0;
    else this.primaryIndex = 1;

    this.listPickerTitle = this._translateService.instant('general.gender');
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
  }

  private _onListWeightTap(args: EventData) {
    Log.D('User tapped Weight data box');

    this.primaryIndex = 0;
    this.secondaryIndex = 0;
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

    this.listPickerTitle = this._translateService.instant('general.weight');
    this.listPickerDescriptionNecessary = true;
    this.listPickerDescription = this._translateService.instant(
      'general.weight-guess'
    );
    this.listPickerNeedsSecondary = true;

    this._openListPickerDialog();
  }

  private _onListHeightTap(args: EventData) {
    Log.D('User tapped Height data box');

    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    this.listPickerIndex = 2;
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
    this.listPickerTitle = this._translateService.instant('general.height');
    this.listPickerDescriptionNecessary = true;
    this.listPickerDescription = this._translateService.instant(
      'general.height-guess'
    );
    this.listPickerNeedsSecondary = !this.isHeightInCentimeters;

    this._openListPickerDialog();
  }

  private _onListChairTypeTap(args: EventData) {
    Log.D('User tapped Chair Type data box');

    this.primaryIndex = 0;
    this._setActiveDataBox(args);

    this.primary = [];
    this._translateService.instant('profile-tab.chair-types').forEach(i => {
      this.primary.push(i);
    });
    this.primaryIndex = this.primary.indexOf(this.user.data.chair_type);

    this.listPickerTitle = this._translateService.instant('general.chair-type');
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
  }

  private _onListChairMakeTap(args: EventData) {
    Log.D('User tapped Chair Make data box');

    this.primaryIndex = 0;
    this._setActiveDataBox(args);

    this.primary = [
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

    this.primaryIndex = this.primary.indexOf(this.user.data.chair_make);

    this.listPickerTitle = this._translateService.instant(
      'profile-tab.chair-make'
    );
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
  }

  private _initDisplayWeight() {
    this.displayWeight = this._displayWeightInKilograms(this.user.data.weight);
    // convert from metric weight (as stored in Kinvey) to user preferred unit
    if (this.SETTING_WEIGHT === 'Pounds') {
      this.displayWeight = this._displayWeightInPounds(
        this._kilogramsToPounds(this.user.data.weight)
      );
    }
    if (!this.displayWeight) this.displayWeight = '';
  }

  private _initDisplayHeight() {
    this.displayHeight = this._displayHeightInCentimeters(
      this.user.data.height
    );
    // convert from metric height (as stored in Kinvey) to user preferred unit
    if (this.SETTING_HEIGHT === 'Feet & inches') {
      const heightString = this._centimetersToFeetInches(this.user.data.height);
      const feet = parseFloat(heightString.split('.')[0]);
      const inches = parseFloat(heightString.split('.')[1]);
      this.displayHeight = this._displayHeightInFeetInches(feet, inches);
    }
    if (!this.displayHeight) this.displayHeight = '';
  }

  private _saveWeightOnChange(primaryValue: number, secondaryValue: number) {
    this.userService.updateDataProperty('weight', primaryValue + secondaryValue);
    if (this.SETTING_WEIGHT === 'Pounds') {
      this.userService.updateDataProperty('weight', this._poundsToKilograms(primaryValue + secondaryValue));
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    } else {
      this.userService.updateDataProperty('weight', (primaryValue + secondaryValue));
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    }
    KinveyUser.update({ weight: this.user.data.weight });
  }

  private _saveHeightOnChange(primaryValue: number, secondaryValue: number) {
    this.userService.updateDataProperty('height', (primaryValue + 0.01 * (secondaryValue || 0)));
    if (this.SETTING_HEIGHT === 'Feet & inches') {
      this.userService.updateDataProperty('height', this._feetInchesToCentimeters(primaryValue, secondaryValue));
      this.displayHeight = this._displayHeightInFeetInches(
        primaryValue,
        secondaryValue
      );
    } else {
      this.userService.updateDataProperty('height', primaryValue + 0.01 * (secondaryValue || 0));
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
    if (!val) return 0 + ' lbs';
    else return val.toFixed(1) + ' lbs';
  }

  private _displayWeightInKilograms(val: number) {
    if (!val) return 0 + ' kg';
    else return val.toFixed(1) + ' kg';
  }

  private _displayHeightInFeetInches(feet: number, inches: number) {
    if (!feet || !inches) return '0\' 0"';
    else return `${Math.floor(feet).toFixed()}\' ${inches.toFixed()}\"`;
  }

  private _displayHeightInCentimeters(val: number) {
    if (!val) return 0 + ' cm';
    return val.toFixed() + ' cm';
  }

  onListChairTypeTap(args: EventData) {
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    Log.D('User tapped Chair Type data box');
    this._setActiveDataBox(args);

    this.primary = [];
    this._translateService.instant('profile-tab.chair-types').forEach(i => {
      this.primary.push(i);
    });
    this.primaryIndex = this.primary.indexOf(this.user.data.chair_type);

    this.listPickerTitle = this._translateService.instant('general.chair-type');
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
  }

  onListChairMakeTap(args: EventData) {
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    Log.D('User tapped Chair Make data box');
    this._setActiveDataBox(args);

    this.primary = [
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
    this.primaryIndex = this.primary.indexOf(this.user.data.chair_make);

    this.listPickerTitle = this._translateService.instant(
      'profile-tab.chair-make'
    );
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
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

  onScan(deviceName) {
    this._barcodeScanner
      .scan({
        formats: 'QR_CODE, EAN_13',
        cancelLabel: this._translateService.instant('demo-detail.cancel-scan'), // iOS only
        cancelLabelBackgroundColor: '#333333', // iOS only
        message: `${this._translateService.instant(
          'demo-detail.scan-msg'
        )} ${this._translateService.instant('demo-detail.sd-or-pt')}`, // Android only
        showFlipCameraButton: true,
        preferFrontCamera: false,
        showTorchButton: true,
        beepOnScan: true,
        torchOn: false,
        closeCallback: () => {
          // scanner closed, not doing anything for now
        },
        resultDisplayDuration: 500, // Android only
        openSettingsIfPermissionWasPreviouslyDenied: true
      })
      .then(result => {
        const validDevices =
          deviceName === 'pushtracker'
            ? ['pushtracker', 'wristband']
            : ['smartdrive'];
        this._handleSerial(result.text, validDevices);
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  private _handleSerial(text: string, forDevices?: string[]) {
    try {
      text = text || '';
      text = text.trim().toUpperCase();
      let deviceType = null;
      const isPushTracker = text[0] === 'B';
      const isWristband = text[0] === 'A';
      let isSmartDrive = false;
      const serialNumber = text;

      const value = parseInt(text, 10);
      const valid = isFinite(value);
      isSmartDrive = !isPushTracker && !isWristband && valid && value > 0;

      if (isPushTracker) {
        deviceType = 'pushtracker';
      } else if (isWristband) {
        deviceType = 'wristband';
      } else if (isSmartDrive) {
        deviceType = 'smartdrive';
      } else {
        return;
      }
      // check the type
      if (
        forDevices &&
        forDevices.length &&
        forDevices.indexOf(deviceType) === -1
      ) {
        this._logService.logMessage(
          `Wrong device entered/scanned --- text: ${text}, forDevices: ${forDevices}`
        );
        return;
      }

      // now set the serial number
      if (deviceType === 'pushtracker' || deviceType === 'wristband') {
        this.userService.updateDataProperty('pushtracker_serial_number', serialNumber);
        KinveyUser.update({pushtracker_serial_number: this.user.data.pushtracker_serial_number});
      } else if (deviceType === 'smartdrive') {
        this.userService.updateDataProperty('smartdrive_serial_number', serialNumber);
        KinveyUser.update({smartdrive_serial_number: this.user.data.smartdrive_serial_number});
      }
    } catch (error) {
      this._logService.logException(error);
    }
  }

}
