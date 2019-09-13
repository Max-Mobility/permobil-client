import { Component, ElementRef, NgZone, ViewChild, ViewContainerRef } from '@angular/core';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { subYears } from 'date-fns';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { RouterExtensions } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { DateTimePicker, DateTimePickerStyle } from 'nativescript-datetimepicker';
import { Toasty } from 'nativescript-toasty';
import { Subscription } from 'rxjs';
import { Color } from 'tns-core-modules/color';
import { screen } from 'tns-core-modules/platform';
import { action, prompt, PromptOptions } from 'tns-core-modules/ui/dialogs';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { ActivityGoalSettingComponent, PrivacyPolicyComponent } from '..';
import { DISTANCE_UNITS, HEIGHT_UNITS, WEIGHT_UNITS } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';
import { centimetersToFeetInches, enableDefaultTheme, feetInchesToCentimeters, kilogramsToPounds, kilometersToMiles, poundsToKilograms } from '../../utils';

@Component({
  selector: 'profile-tab',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent {
  @ViewChild('listPickerDialog', { static: false })
  listPickerDialog: ElementRef;

  user: PushTrackerUser; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User
  isUserEditingSetting: boolean = false;
  displayActivityGoalCoastTime: string;
  displayActivityGoalDistance: string;
  displayWeight: string;
  displayHeight: string;
  chairTypes: Array<string> = [];
  displayChairType: string;
  chairMakes: Array<string> = [];
  displayChairMake: string;

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
  isUserLoaded: boolean;
  private _barcodeScanner: BarcodeScanner;
  private _userSubscription$: Subscription;

  constructor(
    private _userService: PushTrackerUserService,
    private _zone: NgZone,
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {}

  onProfileTabLoaded() {
    this._logService.logBreadCrumb('ProfileTabComponent loaded');

    this.isUserLoaded = false;
    this.screenHeight = screen.mainScreen.heightDIPs;

    this._page.actionBarHidden = true;
    this._barcodeScanner = new BarcodeScanner();

    this.primary = ['100', '200', '300'];
    this.secondary = ['100', '200', '300'];
    this.primaryIndex = 0;
    this.secondaryIndex = 0;
    this.listPickerIndex = 0;
    this.listPickerTitle = '';
    this.listPickerDescription = '';
    this.listPickerDescriptionNecessary = true;
    this.listPickerNeedsSecondary = false;

    this.chairTypes = [];
    this._translateService.instant('profile-tab.chair-types').forEach(i => {
      this.chairTypes.push(i);
    });

    this.chairMakes = [];
    this._translateService.instant('profile-tab.chair-makes').forEach(i => {
      this.chairMakes.push(i);
    });

    this._userSubscription$ = this._userService.user.subscribe(user => {
      if (!user) return;
      this.user = user;
      this.isUserLoaded = true;
      this._initDisplayActivityGoalCoastTime();
      this._initDisplayActivityGoalDistance();
      this._initDisplayWeight();
      this._initDisplayHeight();
      this._initDisplayChairType();
      this._initDisplayChairMake();
    });
  }

  onProfileTabUnloaded() {
    this._logService.logBreadCrumb('ProfileTabComponent unloaded');
    // this._userSubscription$.unsubscribe();
  }

  onWatchConnectTap() {
    Log.D('Connecting to Watch...');
    this._sendData();
    this._sendMessage();
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
          const logoutResult = await KinveyUser.logout();
          Log.D('logout result', logoutResult);
          this._userService.reset();
          enableDefaultTheme();
          // go ahead and nav to login to keep UI moving without waiting
          this._routerExtensions.navigate(['/login'], {
            clearHistory: true
          });
        });
      }
    });
  }

  onPrivacyTap() {
    this._modalService
      .showModal(PrivacyPolicyComponent, {
        context: { data: this.user.data, navigatedFrom: 'profile' },
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
      if (
        this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
      ) {
        value_description = `${this._translateService.instant(
          'profile-tab.distance-units-km'
        )} ${this._translateService.instant('profile-tab.per-day')}`;
      } else {
        value_description = `${this._translateService.instant(
          'profile-tab.distance-units-mi'
        )} ${this._translateService.instant('profile-tab.per-day')}`;
      }
      if (this.user.data.activity_goal_distance)
        value =
          parseFloat(
            this._updateDistanceUnit(
              this.user.data.activity_goal_distance
            ).toFixed(1)
          ) || 0.0;
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
      .then(result => {
        Log.D('activity setting result', result);
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
        date: this.user.data.dob
          ? new Date(this.user.data.dob)
          : subYears(new Date(), 18),
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

  onPushTrackerE2SerialNumberTap(args) {
    alert({
      title: this._translateService.instant(
        'profile-tab.pushtracker-e2-serial-number-dialog-title'
      ),
      message: this._translateService.instant(
        'profile-tab.pushtracker-e2-serial-number-dialog-message'
      ),
      okButtonText: this._translateService.instant('profile-tab.ok')
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
          this.primaryIndex // index into CHAIR_TYPE enum
        );
        KinveyUser.update({ chair_type: this.primaryIndex });
        break;
      case 4:
        this._userService.updateDataProperty(
          'chair_make',
          this.primaryIndex // index into CHAIR_MAKE enum
        );
        KinveyUser.update({ chair_make: this.primaryIndex });
        break;
      case 5:
        const newConfiguration = this.primary[this.primaryIndex];
        this._userService.updateDataProperty(
          'control_configuration',
          newConfiguration
        );
        Log.D('Configuration changed to', newConfiguration);
        KinveyUser.update({
          control_configuration: newConfiguration
        });
        break;
    }

    this.primaryIndex = 0;
    this.secondaryIndex = 0;
  }

  private _getWeightIndices() {
    let weight = this.user.data.weight;
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
      weight = kilogramsToPounds(weight);
    }
    const primaryIndex = Math.floor(weight);
    const secondaryIndex = parseFloat((weight % 1).toFixed(1));
    return [primaryIndex - 2, secondaryIndex];
  }

  private _getHeightIndices() {
    let heightString = this.user.data.height + '';
    if (
      this.user.data.height_unit_preference === HEIGHT_UNITS.FEET_AND_INCHES
    ) {
      heightString = centimetersToFeetInches(this.user.data.height);
    }
    const primaryIndex = Math.floor(parseFloat(heightString));
    let secondaryIndex = 0;
    if (this.user.data.height_unit_preference === HEIGHT_UNITS.CENTIMETERS)
      secondaryIndex = parseFloat(heightString.split('.')[1]);
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

    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.KILOGRAMS) {
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

    if (this.user.data.height_unit_preference === HEIGHT_UNITS.CENTIMETERS) {
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
      this.user.data.height_unit_preference === HEIGHT_UNITS.FEET_AND_INCHES
        ? true
        : false;

    this._openListPickerDialog();
  }

  private _onListChairTypeTap(args: EventData) {
    Log.D('User tapped Chair Type data box');

    this.primaryIndex = 0;
    this._setActiveDataBox(args);

    this.primary = this.chairTypes;
    this.primaryIndex = this.user.data.chair_type || 0;

    this.listPickerTitle = this._translateService.instant('general.chair-type');
    this.listPickerDescriptionNecessary = false;
    this.listPickerNeedsSecondary = false;

    this._openListPickerDialog();
  }

  private _onListChairMakeTap(args: EventData) {
    Log.D('User tapped Chair Make data box');

    this.primaryIndex = 0;
    this._setActiveDataBox(args);

    this.primary = this.chairMakes;
    this.primaryIndex = this.user.data.chair_make || 0;

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

  private async _initDisplayActivityGoalCoastTime() {
    this.displayActivityGoalCoastTime =
      this.user.data.activity_goal_coast_time + ' s';
  }

  private async _initDisplayActivityGoalDistance() {
    this.displayActivityGoalDistance =
      this.user.data.activity_goal_distance + '';
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.MILES) {
      this.displayActivityGoalDistance =
        (this.user.data.activity_goal_distance * 0.621371).toFixed(1) + ' mi';
    } else {
      this.displayActivityGoalDistance += ' km';
    }
  }

  private async _initDisplayWeight() {
    this.displayWeight = this._displayWeightInKilograms(this.user.data.weight);
    // convert from metric weight (as stored in Kinvey) to user preferred unit
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
      this.displayWeight = this._displayWeightInPounds(
        kilogramsToPounds(this.user.data.weight)
      );
    }
    if (!this.displayWeight) this.displayWeight = '';
  }

  private async _initDisplayHeight() {
    this.displayHeight = this._displayHeightInCentimeters(
      this.user.data.height
    );
    // convert from metric height (as stored in Kinvey) to user preferred unit
    if (
      this.user.data.height_unit_preference === HEIGHT_UNITS.FEET_AND_INCHES
    ) {
      const heightString = centimetersToFeetInches(this.user.data.height);
      const feet = parseFloat(heightString.split('.')[0]);
      const inches = parseFloat(heightString.split('.')[1]);
      this.displayHeight = this._displayHeightInFeetInches(feet, inches);
    }
    if (!this.displayHeight) this.displayHeight = '';
  }

  private async _initDisplayChairType() {
    this.displayChairType = this.chairTypes[this.user.data.chair_type || 0];
  }

  private async _initDisplayChairMake() {
    this.displayChairMake = this.chairMakes[this.user.data.chair_make || 0];
  }

  private _saveWeightOnChange(primaryValue: number, secondaryValue: number) {
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.KILOGRAMS) {
      this._userService.updateDataProperty(
        'weight',
        primaryValue + secondaryValue // user's preferred unit is Kg. Save as is
      );
      this.displayWeight = this._displayWeightInKilograms(
        primaryValue + secondaryValue
      );
    } else {
      // User's preferred unit is lbs
      // Database stores all weight measures in metric
      // Convert to Kg and then store in database
      this._userService.updateDataProperty(
        'weight',
        poundsToKilograms(primaryValue + secondaryValue)
      );
      this.displayWeight = this._displayWeightInPounds(
        primaryValue + secondaryValue
      );
    }
    KinveyUser.update({ weight: this.user.data.weight });
  }

  private _saveHeightOnChange(primaryValue: number, secondaryValue: number) {
    if (this.user.data.height_unit_preference === HEIGHT_UNITS.CENTIMETERS) {
      // User's preference matches the database preference - Metric
      // Save height as is
      this._userService.updateDataProperty('height', primaryValue);
      this.displayHeight = this._displayHeightInCentimeters(primaryValue);
    } else {
      // User's preference is Ft and inches
      // Database wants height in Centimeters
      // Convert and save
      this._userService.updateDataProperty(
        'height',
        feetInchesToCentimeters(primaryValue, secondaryValue)
      );
      this.displayHeight = this._displayHeightInFeetInches(
        primaryValue,
        secondaryValue
      );
    }
    KinveyUser.update({ height: this.user.data.height });
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

  private _getSerializedAuth() {
    // get user
    const user = KinveyUser.getActiveUser();
    const id = user._id;
    const token = user._kmd.authtoken;
    // Log.D('user:', JSON.stringify(user, null, 2));
    Log.D('user id:', id);
    Log.D('user token:', token);
    return `Kinvey ${token}:${id}`;
  }

  private _sendData() {
    try {
      WearOsComms.sendData(this._getSerializedAuth()).then(() => {
        Log.D('SendData successful.');
      });
    } catch (error) {
      Log.E(error);
    }
  }

  private _sendMessage() {
    try {
      WearOsComms.sendMessage('/app-message', this._getSerializedAuth()).then(
        () => {
          Log.D('SendData successful.');
        }
      );
    } catch (error) {
      Log.E(error);
    }
  }

  private _updateDistanceUnit(distance: number) {
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.MILES) {
      return kilometersToMiles(distance);
    }
    return distance;
  }
}
