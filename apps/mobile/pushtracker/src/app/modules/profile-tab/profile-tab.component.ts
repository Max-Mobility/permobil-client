import { Component, ElementRef, NgZone, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { subYears } from 'date-fns';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { RouterExtensions } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { DateTimePicker, DateTimePickerStyle } from 'nativescript-datetimepicker';
import { Toasty } from 'nativescript-toasty';
import { Color } from 'tns-core-modules/color';
import { EventData } from 'tns-core-modules/data/observable';
import { screen } from 'tns-core-modules/platform';
import { action, prompt, PromptOptions } from 'tns-core-modules/ui/dialogs';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { Page } from 'tns-core-modules/ui/page';
import { LoggingService, PushTrackerUserService } from '../../services';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';
import { ActivityGoalSettingComponent } from './activity-goal-setting';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;

  user: PushTrackerUser; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User
  isUserEditingSetting: boolean = false;
  isHeightInCentimeters: boolean;
  displayActivityGoalCoastTime: string;
  displayActivityGoalDistance: string;
  displayWeight: string;
  displayHeight: string;

  // List picker related fields

  primary: string[];
  secondary: string[];
  primaryIndex: number;
  secondaryIndex: number;
  listPickerIndex: number;
  listPickerTitle: string;
  listPickerDescription: string;
  listPickerDescriptionNecessary: boolean;
  listPickerNeedsSecondary: boolean;

  /**
   * The user selected activity goal layout. Used to keep track of which UI layout was selected to apply/remove CSS classes.
   */
  activeDataBox: StackLayout;

  /**
   * Being used to databind the translateY for 'off-screen' positioned layouts.
   */
  screenHeight: number;

  private _barcodeScanner: BarcodeScanner;

  constructor(
    private _zone: NgZone,
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private _userService: PushTrackerUserService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    this._page.actionBarHidden = true;
    this._barcodeScanner = new BarcodeScanner();
    this.screenHeight = screen.mainScreen.heightDIPs;

    this.primary = ['100', '200', '300'];
    this.secondary = ['100', '200', '300'];
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    this.listPickerIndex = 0;
    this.listPickerTitle = '';
    this.listPickerDescription = '';
    this.listPickerDescriptionNecessary = true;
    this.listPickerNeedsSecondary = false;

    this.getUser();
    if (!this.user.data.dob || this.user.data.dob === null)
      this.user.data.dob = subYears(new Date(), 18); // 'Jan 01, 2001';
  }

  ngOnInit() {
    this._logService.logBreadCrumb('profile-tab.component ngOnInit');
    this._initDisplayActivityGoalCoastTime();
    this._initDisplayActivityGoalDistance();
    this._initDisplayWeight();
    this._initDisplayHeight();
  }

  getUser(): void {
    this._userService.user.subscribe(user => {
      this.user = user;
      this._initDisplayActivityGoalCoastTime();
      this._initDisplayActivityGoalDistance();
      this._initDisplayWeight();
      this._initDisplayHeight();
    });
  }

  onAvatarTap() {
    const signOut = this._translateService.instant('general.sign-out');
    action({
      title: '',
      cancelButtonText: this._translateService.instant('general.cancel'),
      actions: [signOut]
    }).then(result => {
      if (
        !result ||
        result === this._translateService.instant('general.cancel')
      ) {
        return;
      }

      if (result === signOut) {
        this._zone.run(async () => {
          // go ahead and nav to login to keep UI moving without waiting
          this._routerExtensions.navigate(['/login'], {
            clearHistory: true
          });

          const logoutResult = await KinveyUser.logout();
          console.log('logout result', logoutResult);
        });
      }
    });
  }

  onPrivacyTap() {
    this._modalService
      .showModal(PrivacyPolicyComponent, {
        context: { data: this.user.data },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(result => {
        if (result !== undefined) {
          KinveyUser.update(result);
          Object.keys(result).map(k => {
            this._userService.updateDataProperty(k, result[k]);
          });
        }
      })
      .catch(err => {
        this._logService.logException(err);
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
          this._userService.updateDataProperty('first_name', r.text);
          this._logService.logBreadCrumb(`User updated first name: ${r.text}`);
        } else if (nameField === 'last-name') {
          KinveyUser.update({ last_name: r.text });
          this._userService.updateDataProperty('last_name', r.text);
          this._logService.logBreadCrumb(`User updated last name: ${r.text}`);
        }
      }
    });
  }

  async onActivityGoalTap(
    args: EventData,
    config_title: string,
    config_description: string,
    key: string
  ) {
    this.isUserEditingSetting = true;
    Log.D('user tapped config = ', config_title, args.object);
    this._setActiveDataBox(args);

    let value_description: string;
    let value;

    // Determine the Setting to map to the user preference for units (km/mi)
    if (key === 'COAST_TIME_ACTIVITY_GOAL') {
      value_description = `${this._translateService.instant(
        'profile-tab.coast-time-units'
      )} ${this._translateService.instant('profile-tab.per-day')}`;
      if (this.user.data.activity_goal_coast_time)
        value = this.user.data.activity_goal_coast_time;
    } else if (key === 'DISTANCE_ACTIVITY_GOAL') {
      if (this.user.data.distance_unit_preference === 0) {
        value_description = `${this._translateService.instant(
          'profile-tab.distance-units-km'
        )} ${this._translateService.instant('profile-tab.per-day')}`;
      } else {
        value_description = `${this._translateService.instant(
          'profile-tab.distance-units-mi'
        )} ${this._translateService.instant('profile-tab.per-day')}`;
      }
      if (this.user.data.activity_goal_distance)
        value = this.user.data.activity_goal_distance;
    }

    this._modalService
      .showModal(ActivityGoalSettingComponent, {
        context: {
          title: this._translateService.instant(`general.${config_title}`),
          description: this._translateService.instant(
            `general.${config_description}`
          ),
          key,
          value,
          value_description
        },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(res => {
        this._removeActiveDataBox();
        this._initDisplayActivityGoalCoastTime();
        this._initDisplayActivityGoalDistance();
      })
      .catch(err => {
        Log.E(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  onBirthDateTap(args: EventData) {
    this.isUserEditingSetting = true;
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
        this.isUserEditingSetting = false;
        this._removeActiveDataBox();
        if (result) {
          this._logService.logBreadCrumb(
            `User changed birthday: ${result.toDateString()}`
          );
          this._userService.updateDataProperty('dob', result);
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
    this.isUserEditingSetting = true;
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
      case 5:
        this._onListControlConfigurationTap(args);
    }
  }

  primaryIndexChanged(picker) {
    this.primaryIndex = picker.selectedIndex;
  }

  secondaryIndexChanged(picker) {
    this.secondaryIndex = picker.selectedIndex;
  }

  onScan(deviceName) {
    this._barcodeScanner
      .scan({
        formats: 'QR_CODE, EAN_13',
        cancelLabel: this._translateService.instant('profile-tab.cancel-scan'), // iOS only
        cancelLabelBackgroundColor: '#333333', // iOS only
        message: `${this._translateService.instant(
          'profile-tab.scan-msg'
        )} ${this._translateService.instant('profile-tab.sd-or-pt')}`, // Android only
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
    this.isUserEditingSetting = false;
  }

  async saveListPickerValue() {
    this.closeListPickerDialog(); // close the list picker dialog from the UI then save the height/weight value for the user based on their settings
    switch (this.listPickerIndex) {
      case 0:
        this._userService.updateDataProperty(
          'gender',
          this.primary[this.primaryIndex]
        );
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
        this._userService.updateDataProperty(
          'chair_type',
          this.primary[this.primaryIndex]
        );
        KinveyUser.update({ chair_type: this.user.data.chair_type });
        break;
      case 4:
        this._userService.updateDataProperty(
          'chair_make',
          this.primary[this.primaryIndex]
        );
        KinveyUser.update({ chair_make: this.user.data.chair_make });
        break;
      case 5:
        this._userService.updateDataProperty(
          'control_configuration',
          this.primary[this.primaryIndex]
        );
        KinveyUser.update({
          control_configuration: this.user.data.control_configuration
        });
        break;
    }

    this.primaryIndex = 0;
    this.secondaryIndex = 0;
  }

  private _getWeightIndices() {
    let weight = this.user.data.weight;
    if (this.user.data.weight_unit_preference === 0) {
      weight = this._kilogramsToPounds(weight);
    }
    const primaryIndex = Math.floor(weight);
    const secondaryIndex = parseFloat((weight % 1).toFixed(1));
    return [primaryIndex - 2, secondaryIndex];
  }

  private _getHeightIndices() {
    let heightString = this.user.data.height + '';
    if (this.user.data.height_unit_preference === 1) {
      heightString = this._centimetersToFeetInches(this.user.data.height);
    }
    const primaryIndex = Math.floor(parseFloat(heightString));
    let secondaryIndex = 0;
    if (this.user.data.height_unit_preference === 0)
      secondaryIndex = parseFloat(heightString.split('.')[1]);

    console.log('getHeightIndex', heightString, secondaryIndex);
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

    if (this.user.data.weight_unit_preference === 1) {
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

    if (this.user.data.height_unit_preference === 1) {
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
    this.listPickerNeedsSecondary =
      this.user.data.height_unit_preference === 0 ? true : false;

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

  private _onListControlConfigurationTap(args: EventData) {
    Log.D('User tapped Control Configuration data box');

    this.primaryIndex = 0;
    this._setActiveDataBox(args);

    this.primary = [
      'PushTracker E2 with SmartDrive',
      'PushTracker with SmartDrive',
      'Switch Control with SmartDrive'
    ];

    this.primaryIndex = this.primary.indexOf(
      this.user.data.control_configuration
    );

    this.listPickerTitle = this._translateService.instant(
      'profile-tab.control-configuration'
    );
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
  }

  private _initDisplayActivityGoalCoastTime() {
    this.displayActivityGoalCoastTime =
      this.user.data.activity_goal_coast_time + ' s';
  }

  private _initDisplayActivityGoalDistance() {
    this.displayActivityGoalDistance =
      this.user.data.activity_goal_distance + '';
    if (this.user.data.distance_unit_preference === 0) {
      this.displayActivityGoalDistance =
        (this.user.data.activity_goal_distance * 0.621371).toFixed(1) + ' km';
    } else {
      this.displayActivityGoalDistance += ' mi';
    }
  }

  private _initDisplayWeight() {
    this.displayWeight = this._displayWeightInKilograms(this.user.data.weight);
    // convert from metric weight (as stored in Kinvey) to user preferred unit
    if (this.user.data.weight_unit_preference === 0) {
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
    if (this.user.data.height_unit_preference === 1) {
      const heightString = this._centimetersToFeetInches(this.user.data.height);
      const feet = parseFloat(heightString.split('.')[0]);
      const inches = parseFloat(heightString.split('.')[1]);
      this.displayHeight = this._displayHeightInFeetInches(feet, inches);
    }
    if (!this.displayHeight) this.displayHeight = '';
  }

  private _saveWeightOnChange(primaryValue: number, secondaryValue: number) {
    this._userService.updateDataProperty(
      'weight',
      primaryValue + secondaryValue
    );
    if (this.user.data.weight_unit_preference === 0) {
      this._userService.updateDataProperty(
        'weight',
        this._poundsToKilograms(primaryValue + secondaryValue)
      );
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    } else {
      this._userService.updateDataProperty(
        'weight',
        primaryValue + secondaryValue
      );
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    }
    KinveyUser.update({ weight: this.user.data.weight });
  }

  private _saveHeightOnChange(primaryValue: number, secondaryValue: number) {
    this._userService.updateDataProperty(
      'height',
      primaryValue + 0.01 * (secondaryValue || 0)
    );
    if (this.user.data.height_unit_preference === 0) {
      this._userService.updateDataProperty(
        'height',
        this._feetInchesToCentimeters(primaryValue, secondaryValue)
      );
      this.displayHeight = this._displayHeightInFeetInches(
        primaryValue,
        secondaryValue
      );
    } else {
      this._userService.updateDataProperty(
        'height',
        primaryValue + 0.01 * (secondaryValue || 0)
      );
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

  private onListChairTypeTap(args: EventData) {
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

  private onListChairMakeTap(args: EventData) {
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
        this._userService.updateDataProperty(
          'pushtracker_serial_number',
          serialNumber
        );
        KinveyUser.update({
          pushtracker_serial_number: this.user.data.pushtracker_serial_number
        });
      } else if (deviceType === 'smartdrive') {
        this._userService.updateDataProperty(
          'smartdrive_serial_number',
          serialNumber
        );
        KinveyUser.update({
          smartdrive_serial_number: this.user.data.smartdrive_serial_number
        });
      }
    } catch (error) {
      this._logService.logException(error);
    }
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
