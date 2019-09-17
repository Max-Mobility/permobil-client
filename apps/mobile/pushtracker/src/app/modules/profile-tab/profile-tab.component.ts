import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { subYears } from 'date-fns';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { RouterExtensions } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { DateTimePicker, DateTimePickerStyle } from 'nativescript-datetimepicker';
import { BottomSheetOptions, BottomSheetService } from 'nativescript-material-bottomsheet/angular';
import { Toasty } from 'nativescript-toasty';
import { Subscription } from 'rxjs';
import { Color } from 'tns-core-modules/color';
import { screen } from 'tns-core-modules/platform';
import { action, prompt, PromptOptions } from 'tns-core-modules/ui/dialogs';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { ActivityGoalSettingComponent, PrivacyPolicyComponent } from '..';
import { CHAIR_MAKE, CHAIR_TYPE, CONFIGURATIONS, DISTANCE_UNITS, HEIGHT_UNITS, WEIGHT_UNITS } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';
import { centimetersToFeetInches, enableDefaultTheme, feetInchesToCentimeters, kilogramsToPounds, kilometersToMiles, poundsToKilograms } from '../../utils';
import { ListPickerSheetComponent } from '../shared/components';

@Component({
  selector: 'profile-tab',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent {
  user: PushTrackerUser; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User
  displayActivityGoalCoastTime: string;
  displayActivityGoalDistance: string;
  displayGender: string;
  displayWeight: string;
  displayHeight: string;
  chairTypes: Array<string> = [];
  chairTypesTranslated: Array<string> = [];
  displayChairType: string;
  chairMakes: Array<string> = [];
  chairMakesTranslated: Array<string> = [];
  displayChairMake: string;
  configurations: Array<string> = [];
  configurationsTranslated: Array<string> = [];
  displayControlConfiguration: string;

  // List picker related fields
  primary: string[];
  secondary: string[];
  primaryIndex: number;
  secondaryIndex: number;
  listPickerIndex: number;

  /**
   * The user selected activity goal layout. Used to keep track of which UI layout was selected to apply/remove CSS classes.
   */
  activeDataBox: StackLayout;

  /**
   * Being used to databind the translateY for 'off-screen' positioned layouts.
   */
  screenHeight: number;
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
    private _bottomSheet: BottomSheetService,
    private _vcRef: ViewContainerRef
  ) {}

  onProfileTabLoaded() {
    this._logService.logBreadCrumb('ProfileTabComponent loaded');

    this._page.actionBarHidden = true;
    this.screenHeight = screen.mainScreen.heightDIPs;
    this._barcodeScanner = new BarcodeScanner();

    // WARNING: There's an important assumption here
    // chairTypes and chairTypesTranslated (or chairMakes and chairMakesTranslated) are
    // assumed to be ordered in the same way, i.e., chairMakes[foo] === chairMakesTranslated[foo]
    // When we index into chairTypes[i] and chairTypesTranslated[i] the assumption is that
    // indexing results in the same chair type on both lists. One's just a translated version of the other
    // DO NOT sort the translated list as it'll mess up the relative ordering
    this.chairTypes = Object.keys(CHAIR_TYPE).map(key => CHAIR_TYPE[key]);
    this.chairTypesTranslated = Object.keys(CHAIR_TYPE).map(key =>
      this._translateService.instant(CHAIR_TYPE[key])
    );
    this.chairMakes = Object.keys(CHAIR_MAKE).map(key => CHAIR_MAKE[key]);
    this.chairMakesTranslated = Object.keys(CHAIR_MAKE).map(key =>
      this._translateService.instant(CHAIR_MAKE[key])
    );
    this.configurations = Object.keys(CONFIGURATIONS).map(
      key => CONFIGURATIONS[key]
    );
    this.configurationsTranslated = Object.keys(CONFIGURATIONS).map(key =>
      this._translateService.instant(CONFIGURATIONS[key])
    );
    // If you need the chair makes to be sorted, sort it in the CHAIR_MAKE enum
    // Do not sort any derived lists, e.g., this.chairMakesTranslated, here.

    Log.D('Chair Types', this.chairTypesTranslated);
    Log.D('Chair Makes', this.chairMakesTranslated);
    Log.D('Configurations', this.configurations);

    this._userSubscription$ = this._userService.user.subscribe(user => {
      if (!user) return;
      this.user = user;
      this._initDisplayActivityGoalCoastTime();
      this._initDisplayActivityGoalDistance();
      this._initDisplayGender();
      this._initDisplayWeight();
      this._initDisplayHeight();
      this._initDisplayChairType();
      this._initDisplayChairMake();
      this._initDisplayControlConfiguration();
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

  onGenderTap(args) {
    Log.D('User tapped Gender data box');
    this._setActiveDataBox(args);

    let primaryIndex;
    if (this.user.data.gender === 'Male') {
      primaryIndex = 0;
    } else {
      primaryIndex = 1;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.gender'),
        primaryItems: [
          this._translateService.instant('profile-tab.male'),
          this._translateService.instant('profile-tab.female')
        ],
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };
    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        console.log(result);
        this._removeActiveDataBox();
      });
  }

  onWeightTap(args) {
    Log.D('User tapped Weight data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;
    let secondaryIndex = 0;
    let primaryItems;
    let secondaryItems;

    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.KILOGRAMS) {
      primaryItems = Array.from({ length: 280 }, (v, k) => k + 1 + '');
      secondaryItems = Array.from({ length: 9 }, (v, k) => '.' + k);
    } else {
      primaryItems = Array.from({ length: 600 }, (v, k) => k + 1 + '');
      secondaryItems = Array.from({ length: 10 }, (v, k) => '.' + k);
    }

    // Initialize primaryIndex and secondaryIndex from user.data.weight
    const indices = this._getWeightIndices();
    primaryIndex = parseFloat(primaryItems[indices[0]]);
    secondaryIndex = 10 * indices[1];

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.weight'),
        description: this._translateService.instant('general.weight-guess'),
        primaryItems,
        primaryIndex,
        secondaryItems,
        secondaryIndex,
        listPickerNeedsSecondary: true
      }
    };

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        console.log(result);
        this._removeActiveDataBox();
      });
  }

  onHeightTap(args) {
    Log.D('User tapped Height data box');
    this._setActiveDataBox(args);

    const listPickerNeedsSecondary =
      this.user.data.height_unit_preference === HEIGHT_UNITS.FEET_AND_INCHES
        ? true
        : false;

    let primaryIndex = 0;
    let secondaryIndex = 0;
    // let listPickerIndex = 2;
    let primaryItems;
    let secondaryItems;

    if (this.user.data.height_unit_preference === HEIGHT_UNITS.CENTIMETERS) {
      primaryItems = Array.from({ length: 300 }, (v, k) => k + 1 + ' cm');
    } else {
      primaryItems = Array.from({ length: 8 }, (v, k) => k + 1 + ' ft');
      secondaryItems = Array.from({ length: 12 }, (v, k) => k + ' in');
    }

    // Initialize primaryIndex and secondaryIndex from user.data.height
    const indices = this._getHeightIndices();
    primaryIndex = parseInt(primaryItems[indices[0]]);
    secondaryIndex = parseInt(secondaryItems[indices[1]]);
    if (secondaryIndex === 12) {
      primaryIndex += 1;
      secondaryIndex = 0;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.height'),
        description: this._translateService.instant('general.height-guess'),
        primaryItems,
        primaryIndex,
        secondaryItems,
        secondaryIndex,
        listPickerNeedsSecondary
      }
    };

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        console.log(result);
        this._removeActiveDataBox();
      });
  }

  onChairTypeTap(args) {
    Log.D('User tapped Chair Type data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;

    try {
      const userChairType = this.user.data.chair_type;
      primaryIndex = this.chairTypesTranslated.indexOf(
        this._translateService.instant(userChairType)
      );
      if (primaryIndex < 0) primaryIndex = 0;
    } catch (err) {
      primaryIndex = 0;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.height'),
        primaryItems: this.chairTypesTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        console.log(result);
        this._removeActiveDataBox();
      });
  }

  onChairMakeTap(args) {
    Log.D('User tapped Chair Make data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;

    try {
      const userChairMake = this.user.data.chair_make;
      primaryIndex = this.chairMakesTranslated.indexOf(
        this._translateService.instant(userChairMake)
      );
      if (primaryIndex < 0) primaryIndex = 0;
    } catch (err) {
      primaryIndex = 0;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('profile-tab.chair-make'),
        primaryItems: this.chairMakesTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        console.log(result);
        this._removeActiveDataBox();
      });
  }

  onControlConfigTap(args) {
    Log.D('User tapped Control Configuration data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;

    try {
      const userConfiguration = this.user.data.control_configuration;
      primaryIndex = this.configurationsTranslated.indexOf(
        this._translateService.instant(userConfiguration)
      );
      if (primaryIndex < 0) primaryIndex = 0;
    } catch (err) {
      primaryIndex = 0;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant(
          'profile-tab.control-configuration'
        ),
        primaryItems: this.configurationsTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        console.log(result);
        this._removeActiveDataBox();
      });
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

  async saveListPickerValue() {
    // this.closeListPickerDialog(); // close the list picker dialog from the UI then save the height/weight value for the user based on their settings
    switch (this.listPickerIndex) {
      case 0:
        this._userService.updateDataProperty(
          'gender',
          this.primaryIndex === 0 ? 'Male' : 'Female'
        );
        KinveyUser.update({
          gender: this.primaryIndex === 0 ? 'Male' : 'Female'
        });
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
          this.chairTypes[this.primaryIndex] // index into CHAIR_TYPE enum
        );
        KinveyUser.update({ chair_type: this.chairTypes[this.primaryIndex] });
        break;
      case 4:
        this._userService.updateDataProperty(
          'chair_make',
          this.chairMakes[this.primaryIndex] // index into CHAIR_MAKE enum
        );
        KinveyUser.update({ chair_make: this.chairMakes[this.primaryIndex] });
        break;
      case 5:
        this._userService.updateDataProperty(
          'control_configuration',
          this.configurations[this.primaryIndex]
        );
        Log.D(
          'Configuration changed to',
          this.configurations[this.primaryIndex]
        );
        KinveyUser.update({
          control_configuration: this.configurations[this.primaryIndex]
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
    if (this.user.data.height_unit_preference === HEIGHT_UNITS.FEET_AND_INCHES)
      secondaryIndex = parseFloat(heightString.split('.')[1]);
    return [primaryIndex - 2, secondaryIndex];
  }

  private _initDisplayActivityGoalCoastTime() {
    this.displayActivityGoalCoastTime =
      this.user.data.activity_goal_coast_time + ' s';
  }

  private _initDisplayActivityGoalDistance() {
    this.displayActivityGoalDistance =
      this.user.data.activity_goal_distance + '';
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.MILES) {
      this.displayActivityGoalDistance =
        (this.user.data.activity_goal_distance * 0.621371).toFixed(1) + ' mi';
    } else {
      this.displayActivityGoalDistance += ' km';
    }
  }

  private _initDisplayGender() {
    this.displayGender = '';
    if (this.user && this.user.data && this.user.data.gender)
      this.displayGender = this._translateService.instant(
        this.user.data.gender
      );
  }

  private _initDisplayWeight() {
    this.displayWeight = this._displayWeightInKilograms(this.user.data.weight);
    // convert from metric weight (as stored in Kinvey) to user preferred unit
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
      this.displayWeight = this._displayWeightInPounds(
        kilogramsToPounds(this.user.data.weight)
      );
    }
    if (!this.displayWeight) this.displayWeight = '';
  }

  private _initDisplayHeight() {
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

  private _initDisplayChairType() {
    if (!this.user || !this.user.data) this.displayChairType = '';
    if (this.user.data.chair_type && this.user.data.chair_type !== '')
      this.displayChairType = this._translateService.instant(
        this.user.data.chair_type
      );
    else this.displayChairType = '';
  }

  private _initDisplayChairMake() {
    if (!this.user || !this.user.data) this.displayChairMake = '';
    if (this.user.data.chair_make && this.user.data.chair_make !== '')
      this.displayChairMake = this._translateService.instant(
        this.user.data.chair_make
      );
    else this.displayChairMake = '';
  }

  private _initDisplayControlConfiguration() {
    this.displayControlConfiguration = '';
    if (this.user && this.user.data && this.user.data.control_configuration)
      this.displayControlConfiguration = this._translateService.instant(
        this.user.data.control_configuration
      );
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
