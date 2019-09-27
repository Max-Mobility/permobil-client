import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { TranslateService } from '@ngx-translate/core';
import { PushTrackerUser } from '@permobil/core';
import { subYears } from 'date-fns';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { RouterExtensions } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { DateTimePicker, DateTimePickerStyle } from 'nativescript-datetimepicker';
import { BottomSheetOptions, BottomSheetService } from 'nativescript-material-bottomsheet/angular';
import { Toasty, ToastDuration } from 'nativescript-toasty';
import { Color } from 'tns-core-modules/color';
import { isAndroid, isIOS, screen } from 'tns-core-modules/platform';
import { action, prompt, PromptOptions } from 'tns-core-modules/ui/dialogs';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { ActivityGoalSettingComponent, PrivacyPolicyComponent } from '..';
import { APP_THEMES, CHAIR_MAKE, CHAIR_TYPE, CONFIGURATIONS, DISTANCE_UNITS, GENDERS, HEIGHT_UNITS, WEIGHT_UNITS } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';
import { centimetersToFeetInches, convertToMilesIfUnitPreferenceIsMiles, enableDefaultTheme, feetInchesToCentimeters, kilogramsToPounds, poundsToKilograms, YYYY_MM_DD } from '../../utils';
import { ListPickerSheetComponent, TextFieldSheetComponent } from '../shared/components';
import * as appSettings from 'tns-core-modules/application-settings';

@Component({
  selector: 'profile-tab',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent {
  public APP_THEMES = APP_THEMES;
  public CONFIGURATIONS = CONFIGURATIONS;
  user: PushTrackerUser; // this is a Kinvey.User - assigning to any to bypass AOT template errors until we have better data models for our User
  displayActivityGoalCoastTime: string;
  displayActivityGoalDistance: string;
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

  genders: Array<String> = [];
  gendersTranslated: Array<string> = [];
  displayGender: string;

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
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'Loaded');

    this._page.actionBarHidden = true;
    this.screenHeight = screen.mainScreen.heightDIPs;
    this._barcodeScanner = new BarcodeScanner();

    // WARNING: There's an important assumption here
    // chairTypes and chairTypesTranslated (or chairMakes and chairMakesTranslated) are
    // assumed to be ordered in the same way, i.e., chairMakes[foo] === chairMakesTranslated[foo]
    // When we index into chairTypes[i] and chairTypesTranslated[i] the assumption is that
    // indexing results in the same chair type on both lists. One's just a translated version of the other
    // DO NOT sort the translated list as it'll mess up the relative ordering
    this.genders = Object.keys(GENDERS).map(key => GENDERS[key]);
    this.gendersTranslated = Object.keys(GENDERS).map(key =>
      this._translateService.instant(this.getTranslationKeyForGenders(key))
    );

    this.chairTypes = Object.keys(CHAIR_TYPE).map(key => CHAIR_TYPE[key]);
    this.chairTypesTranslated = Object.keys(CHAIR_TYPE).map(key =>
      this._translateService.instant(this.getTranslationKeyForChairType(key))
    );

    this.chairMakes = Object.keys(CHAIR_MAKE).map(key => CHAIR_MAKE[key]);
    this.chairMakesTranslated = Object.keys(CHAIR_MAKE).map(key =>
      this._translateService.instant(this.getTranslationKeyForChairMake(key))
    );

    this.configurations = Object.keys(CONFIGURATIONS).map(
      key => CONFIGURATIONS[key]
    );
    this.configurationsTranslated = Object.keys(CONFIGURATIONS).map(key =>
      this._translateService.instant(
        this.getTranslationKeyForConfiguration(key)
      )
    );
    // If you need the chair makes to be sorted, sort it in the CHAIR_MAKE enum
    // Do not sort any derived lists, e.g., this.chairMakesTranslated, here.

    this._userService.user.subscribe(user => {
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

  getTranslationKeyForGenders(key) {
    if (GENDERS[key] === GENDERS.MALE) return 'profile-tab.gender.male';
    else if (GENDERS[key] === GENDERS.FEMALE)
      return 'profile-tab.gender.female';
    else return 'profile-tab.gender.male';
  }

  getTranslationKeyForChairType(key) {
    if (CHAIR_TYPE[key] === CHAIR_TYPE.RIGID)
      return 'profile-tab.chair-types.rigid';
    else if (CHAIR_TYPE[key] === CHAIR_TYPE.FOLDING)
      return 'profile-tab.chair-types.folding';
    else if (CHAIR_TYPE[key] === CHAIR_TYPE.PEDIATRIC)
      return 'profile-tab.chair-types.pediatric';
    else return 'profile-tab.chair-types.rigid';
  }

  getTranslationKeyForChairMake(key) {
    if (CHAIR_MAKE[key] === CHAIR_MAKE.COLOURS)
      return 'profile-tab.chair-makes.colours';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.INVACARE_KUSCHALL)
      return 'profile-tab.chair-makes.invacare-kuschall';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.KARMAN)
      return 'profile-tab.chair-makes.karman';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.KI)
      return 'profile-tab.chair-makes.ki';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.MOTION_COMPOSITES)
      return 'profile-tab.chair-makes.motion-composites';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.PANTHERA)
      return 'profile-tab.chair-makes.panthera';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.QUICKIE_SOPUR_RGK)
      return 'profile-tab.chair-makes.quickie-sopur-rgk';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.TILITE)
      return 'profile-tab.chair-makes.tilite';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.TOP_END)
      return 'profile-tab.chair-makes.top-end';
    else if (CHAIR_MAKE[key] === CHAIR_MAKE.OTHER)
      return 'profile-tab.chair-makes.other';
    else return 'profile-tab.chair-makes.colours';
  }

  getTranslationKeyForConfiguration(key) {
    if (CONFIGURATIONS[key] === CONFIGURATIONS.PUSHTRACKER_E2_WITH_SMARTDRIVE)
      return 'profile-tab.configurations.pushtracker-e2-with-smartdrive';
    else if (CONFIGURATIONS[key] === CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE)
      return 'profile-tab.configurations.pushtracker-with-smartdrive';
    else if (
      CONFIGURATIONS[key] === CONFIGURATIONS.SWITCHCONTROL_WITH_SMARTDRIVE
    )
      return 'profile-tab.configurations.switch-control-with-smartdrive';
    else return 'profile-tab.configurations.pushtracker-e2-with-smartdrive';
  }

  onProfileTabUnloaded() {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'Unloaded');
    // this._userSubscription$.unsubscribe();
  }

  async onWatchConnectTap() {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'Connecting to Watch');
    WearOsComms.setDebugOutput(false);
    const didConnect = await this._connectCompanion();
    if (didConnect) {
      const sentData = await this._sendData();
      const sentMessage = await this._sendMessage();
      await this._disconnectCompanion();
      if (sentMessage && sentData) {
        new Toasty({
          text:
          this._translateService.instant('wearos-comms.messages.pte2-sync-successful'),
          duration: ToastDuration.LONG
        }).show();
      } else {
        alert({
          title: this._translateService.instant(
            'wearos-comms.errors.pte2-send-error.title'
          ),
          message: this._translateService.instant(
            'wearos-comms.errors.pte2-send-error.message'
          ),
          okButtonText: this._translateService.instant('profile-tab.ok')
        });
      }
    } else {
      alert({
        title: this._translateService.instant(
          'wearos-comms.errors.pte2-connection-error.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.pte2-connection-error.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    }
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
          // Clean up appSettings key-value pairs that were
          // saved in app.component.ts
          appSettings.remove('PushTracker.WeeklyActivity');
          appSettings.remove('SmartDrive.WeeklyUsage');
          appSettings.remove('Kinvey.User');
          // Reset the user service and restore to default theme
          this._userService.reset();
          enableDefaultTheme();
          // go ahead and nav to login to keep UI moving without waiting
          this._routerExtensions.navigate(['/login'], {
            clearHistory: true
          });
        });
      }
    })
    .catch(err => {
      this._logService.logException(err);
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
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
  }

  private _saveFirstNameOnChange(newFirstName: string) {
    this._userService.updateDataProperty(
      'first_name',
      newFirstName
    );
    KinveyUser.update({ first_name: newFirstName });
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
  }

  private _saveLastNameOnChange(newLastName: string) {
    this._userService.updateDataProperty(
      'last_name',
      newLastName
    );
    KinveyUser.update({ last_name: newLastName });
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
  }

  onNameLongPress(_, nameField: string) {
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
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
          this._logService.logBreadCrumb(ProfileTabComponent.name, `User updated first name: ${r.text}`);
        } else if (nameField === 'last-name') {
          KinveyUser.update({ last_name: r.text });
          this._userService.updateDataProperty('last_name', r.text);
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
          this._logService.logBreadCrumb(ProfileTabComponent.name, `User updated last name: ${r.text}`);
        }
      }
    })
    .catch(err => {
      this._logService.logException(err);
    });
  }

  async onActivityGoalTap(
    args: EventData,
    config_title: string,
    config_description: string,
    key: string
  ) {
    this._logService.logBreadCrumb(ProfileTabComponent.name,
      `User tapped config = ${config_title} ${args.object}`);
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
            convertToMilesIfUnitPreferenceIsMiles(
              this.user.data.activity_goal_distance,
              this.user.data.distance_unit_preference
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
        this._logService.logBreadCrumb(ProfileTabComponent.name, `Activity setting result: ${result}`);
        this._removeActiveDataBox();
        this._initDisplayActivityGoalCoastTime();
        this._initDisplayActivityGoalDistance();
      })
      .catch(err => {
        this._logService.logException(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }

  onBirthDateTap(args: EventData) {
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
          this._logService.logBreadCrumb(ProfileTabComponent.name,
            `User changed birthday: ${result.toDateString()}`
          );
          this._userService.updateDataProperty('dob', result);
          const dateFormatted = YYYY_MM_DD(new Date(result));
          this._logService.logBreadCrumb(ProfileTabComponent.name, `Birthday formatted: ${dateFormatted}`);
          KinveyUser.update({ dob: dateFormatted });
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onFirstNameTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'First Name pressed');
    this._setActiveDataBox(args);

    const firstName = this.user.data.first_name || '';

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.first-name'),
        description: '', // Do we really need a description for name?
        text: firstName
      }
    };

    this._bottomSheet.show(TextFieldSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._logService.logBreadCrumb(ProfileTabComponent.name, `first_name TextFieldSheetComponent result: ${result.data}`);
          const newFirstName = (result.data.text || '').replace(/[^A-Za-z]/g, '');
          this._saveFirstNameOnChange(newFirstName);
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._removeActiveDataBox();
      }
    );
  }

  onLastNameTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'Last Name pressed');
    this._setActiveDataBox(args);

    const lastName = this.user.data.last_name || '';

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.last-name'),
        description: '', // Do we really need a description for name?
        text: lastName
      }
    };

    this._bottomSheet.show(TextFieldSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._logService.logBreadCrumb(ProfileTabComponent.name, `last_name TextFieldSheetComponent result: ${result.data}`);
          const newLastName = (result.data.text || '').replace(/[^A-Za-z]/g, '');
          this._saveLastNameOnChange(newLastName);
        }
      },
      error => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'error', error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onGenderTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'User tapped Gender data box');
    this._setActiveDataBox(args);

    let primaryIndex;
    try {
      const userGender = this.user.data.gender;
      primaryIndex = this.genders.indexOf(userGender);
      if (primaryIndex < 0) primaryIndex = 0;
    } catch (err) {
      primaryIndex = 0;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.gender'),
        primaryItems: this.gendersTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };
    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._userService.updateDataProperty(
            'gender',
            this.genders[result.data.primaryIndex]
          );
          KinveyUser.update({ gender: this.genders[result.data.primaryIndex] });
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onWeightTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'User tapped Weight data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;
    let secondaryIndex = 0;
    let primaryItems;
    let secondaryItems;

    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.KILOGRAMS) {
      primaryItems = Array.from({ length: 280 }, (_, k) => k + 1 + '');
      secondaryItems = Array.from({ length: 9 }, (_, k) => '.' + k);
    } else {
      primaryItems = Array.from({ length: 600 }, (_, k) => k + 1 + '');
      secondaryItems = Array.from({ length: 10 }, (_, k) => '.' + k);
    }

    // Initialize primaryIndex and secondaryIndex from user.data.weight
    const indices = this._getWeightIndices();
    if (indices[0] > 0) {
      primaryIndex = parseFloat(primaryItems[indices[0]]);
      secondaryIndex = 10 * indices[1];
    }

    let text = '';
    if (primaryIndex === 0 && secondaryIndex === 0) {
      text = '0.0';
    } else {
      text += primaryItems[primaryIndex] || '0';
      text += secondaryItems[secondaryIndex] || '.0';
    }

    const _validateWeightFromText = function(text) {
      if (text || text !== '') {
        // Attempt to parse as float
        const newWeight = parseFloat(text);
        // If weight is negative, discard new value
        if (newWeight < 0.0) return;
        if (newWeight > 0 && newWeight <= 1400) {
          // round to the nearest 0.1
          return Math.round(newWeight * 10) / 10;
        }
      }
    };

    let suffix = this._translateService.instant('units.kg');
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
      suffix = this._translateService.instant('units.lbs');
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.weight'),
        description: this._translateService.instant('general.weight-guess'),
        text: text,
        suffix: suffix,
        keyboardType: 'number'
      }
    };

    this._bottomSheet.show(TextFieldSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          const newWeight = _validateWeightFromText(result.data.text);
          if (newWeight) {
            const primary = (newWeight + '').split('.')[0];
            const secondary = '0.' + (newWeight + '').split('.')[1];
            this._saveWeightOnChange(
              parseFloat(primary),
              parseFloat(secondary)
            );
          }
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onHeightTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'User tapped Height data box');
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
      primaryItems = Array.from(
        { length: 300 },
        (_, k) => k + 1 + ' ' + this._translateService.instant('units.cm')
      );
    } else {
      primaryItems = Array.from(
        { length: 8 },
        (_, k) => k + 1 + ' ' + this._translateService.instant('units.ft')
      );
      secondaryItems = Array.from(
        { length: 12 },
        (_, k) => k + ' ' + this._translateService.instant('units.in')
      );
    }

    // Initialize primaryIndex and secondaryIndex from user.data.height
    const indices = this._getHeightIndices();
    primaryIndex = parseInt(primaryItems[indices[0]]);
    if (listPickerNeedsSecondary) {
      secondaryIndex = parseInt(secondaryItems[indices[1]]);
      if (secondaryIndex === 12) {
        primaryIndex += 1;
        secondaryIndex = 0;
      }
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

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._saveHeightOnChange(
            parseFloat(primaryItems[result.data.primaryIndex]),
            parseFloat(secondaryItems[result.data.secondaryIndex])
          );
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onChairTypeTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'User tapped Chair Type data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;

    try {
      const userChairType = this.user.data.chair_type;
      primaryIndex = this.chairTypes.indexOf(userChairType);
      if (primaryIndex < 0) primaryIndex = 0;
    } catch (err) {
      primaryIndex = 0;
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('profile-tab.chair-type'),
        primaryItems: this.chairTypesTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._userService.updateDataProperty(
            'chair_type',
            this.chairTypes[result.data.primaryIndex] // index into CHAIR_TYPE enum
          );
          KinveyUser.update({
            chair_type: this.chairTypes[result.data.primaryIndex]
          });
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onChairMakeTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'User tapped Chair Make data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;

    try {
      const userChairMake = this.user.data.chair_make;
      primaryIndex = this.chairMakes.indexOf(userChairMake);
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

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._userService.updateDataProperty(
            'chair_make',
            this.chairMakes[result.data.primaryIndex] // index into CHAIR_MAKE enum
          );
          KinveyUser.update({
            chair_make: this.chairMakes[result.data.primaryIndex]
          });
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onControlConfigTap(args) {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'User tapped Control Configuration data box');
    this._setActiveDataBox(args);

    let primaryIndex = 0;

    try {
      const userConfiguration = this.user.data.control_configuration;
      primaryIndex = this.configurations.indexOf(userConfiguration);
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

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._userService.updateDataProperty(
            'control_configuration',
            this.configurations[result.data.primaryIndex]
          );
          this._logService.logBreadCrumb(ProfileTabComponent.name,
            `Configuration changed to: ${this.configurations[result.data.primaryIndex]}`
          );
          KinveyUser.update({
            control_configuration: this.configurations[result.data.primaryIndex]
          });
          appSettings.setString('Kinvey.User', JSON.stringify(this.user));
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
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

  onPushTrackerE2SerialNumberTap(_) {
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

  private _getWeightIndices() {
    let weight = this.user.data.weight;
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
      weight = kilogramsToPounds(weight);
    }
    const primaryIndex = Math.floor(weight);
    const secondaryIndex = parseFloat((weight % 1).toFixed(1));
    if (primaryIndex <= 0 && secondaryIndex <= 0) {
      return [0, 0];
    } else return [primaryIndex - 2, secondaryIndex];
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
      this.user.data.activity_goal_coast_time +
      ' ' +
      this._translateService.instant('units.s');
  }

  private _initDisplayActivityGoalDistance() {
    this.displayActivityGoalDistance =
      this.user.data.activity_goal_distance + '';
    if (this.user.data.distance_unit_preference === DISTANCE_UNITS.MILES) {
      this.displayActivityGoalDistance =
        (this.user.data.activity_goal_distance * 0.621371).toFixed(1) +
        ' ' +
        this._translateService.instant('units.mi');
    } else {
      this.displayActivityGoalDistance +=
        ' ' + this._translateService.instant('units.km');
    }
  }

  private _initDisplayGender() {
    this.displayGender = '';
    if (this.user && this.user.data && this.user.data.gender) {
      const englishValue = this.user.data.gender;
      const index = this.genders.indexOf(englishValue);
      this.displayGender = this.gendersTranslated[index];
    }
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
    if (this.user.data.chair_type && this.user.data.chair_type !== '') {
      const englishValue = this.user.data.chair_type;
      const index = this.chairTypes.indexOf(englishValue);
      this.displayChairType = this.chairTypesTranslated[index];
    } else this.displayChairType = '';
  }

  private _initDisplayChairMake() {
    if (!this.user || !this.user.data) this.displayChairMake = '';
    if (this.user.data.chair_make && this.user.data.chair_make !== '') {
      const englishValue = this.user.data.chair_make;
      const index = this.chairMakes.indexOf(englishValue);
      this.displayChairMake = this.chairMakesTranslated[index];
    } else this.displayChairMake = '';
  }

  private _initDisplayControlConfiguration() {
    this.displayControlConfiguration = '';
    if (this.user && this.user.data && this.user.data.control_configuration) {
      const englishValue = this.user.data.control_configuration;
      const index = this.configurations.indexOf(englishValue);
      this.displayControlConfiguration = this.configurationsTranslated[index];
    }
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
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
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
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
  }

  private _displayWeightInPounds(val: number) {
    if (!val) return 0 + ' ' + this._translateService.instant('units.lbs');
    else
      return val.toFixed(1) + ' ' + this._translateService.instant('units.lbs');
  }

  private _displayWeightInKilograms(val: number) {
    if (!val) return 0 + ' ' + this._translateService.instant('units.kg');
    else
      return val.toFixed(1) + ' ' + this._translateService.instant('units.kg');
  }

  private _displayHeightInFeetInches(feet: number, inches: number) {
    if (!feet || !inches) return '0\' 0"';
    else return `${Math.floor(feet).toFixed()}\' ${inches.toFixed()}\"`;
  }

  private _displayHeightInCentimeters(val: number) {
    if (!val) return 0 + ' ' + this._translateService.instant('units.cm');
    return val.toFixed() + ' ' + this._translateService.instant('units.cm');
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
        appSettings.setString('Kinvey.User', JSON.stringify(this.user));
      } else if (deviceType === 'smartdrive') {
        this._userService.updateDataProperty(
          'smartdrive_serial_number',
          serialNumber
        );
        KinveyUser.update({
          smartdrive_serial_number: this.user.data.smartdrive_serial_number
        });
        appSettings.setString('Kinvey.User', JSON.stringify(this.user));
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
    // this._logService.logBreadCrumb(ProfileTabComponent.name, `user id: ${id}`);
    // this._logService.logBreadCrumb(ProfileTabComponent.name, `user token: ${token}`);
    return `${id}:Kinvey ${token}`;
  }

  private async _connectCompanion() {
    // if we're Android we rely on WearOS Messaging, so we cannot manage connection state
    if (isAndroid) return true;
    // if we're iOS we have to actually find a companion
    let didConnect = false;
    try {
      if (!WearOsComms.hasCompanion()) {
        // find and save the companion
        const address = await WearOsComms.findAvailableCompanions(5);
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'saving new companion: ' + address);
        WearOsComms.saveCompanion(address);
      }
      // now connect
      await new Promise(async (resolve, reject) => {
        WearOsComms.registerConnectedCallback(resolve);
        await WearOsComms.connectCompanion();
      });
      didConnect = true;
    } catch (err) {
      this._logService.logException(err);
    }
    return didConnect;
  }

  private async _disconnectCompanion() {
    // if we're Android we rely on WearOS Messaging, so we cannot manage connection state
    if (isAndroid) return true;
    // if we're iOS we have to actually disconnect from the companion
    try {
      await WearOsComms.disconnectCompanion();
    } catch (err) {
      this._logService.logException(err);
    }
  }

  private async _sendData() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendData(this._getSerializedAuth());
      if (didSend) {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'SendData successful.');
      } else {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'SendData unsuccessful.');
      }
    } catch (error) {
      this._logService.logException(error);
    }
    return didSend;
  }

  private async _sendMessage() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendMessage('/app-message', this._getSerializedAuth());
      if (didSend) {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'SendMessage successful.');
      } else {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'SendMessage unsuccessful.');
      }
    } catch (error) {
      this._logService.logException(error);
    }
    return didSend;
  }
}
