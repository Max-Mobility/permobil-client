import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import {
  BottomSheetOptions,
  BottomSheetService
} from '@nativescript-community/ui-material-bottomsheet/angular';
import { ModalDialogService, RouterExtensions } from '@nativescript/angular';
import {
  ApplicationSettings as appSettings,
  Color,
  Dialogs,
  EventData,
  ImageSource,
  isAndroid,
  Label,
  Page,
  Screen,
  StackLayout,
  Utils
} from '@nativescript/core';
import {
  DateTimePicker,
  DateTimePickerStyle
} from '@nativescript/datetimepicker';
import { TranslateService } from '@ngx-translate/core';
import { subYears } from 'date-fns';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import * as LS from 'nativescript-localstorage';
import { Sentry } from 'nativescript-sentry';
import { Toasty } from 'nativescript-toasty';
import {
  ActivityGoalSettingComponent,
  DeviceSetupComponent,
  PrivacyPolicyComponent
} from '..';
import {
  APP_THEMES,
  CHAIR_MAKE,
  CHAIR_TYPE,
  CONFIGURATIONS,
  DISTANCE_UNITS,
  GENDERS,
  HEIGHT_UNITS,
  STORAGE_KEYS,
  WEIGHT_UNITS
} from '../../enums';
import { PushTrackerUser } from '../../models';
import {
  LoggingService,
  PushTrackerUserService,
  SettingsService,
  ThemeService
} from '../../services';
import {
  centimetersToFeetInches,
  convertToMilesIfUnitPreferenceIsMiles,
  enableDefaultTheme,
  feetInchesToCentimeters,
  kilogramsToPounds,
  milesToKilometers,
  poundsToKilograms,
  YYYY_MM_DD
} from '../../utils';
import { Ratings } from '../../utils/ratings-utils';
import {
  ListPickerSheetComponent,
  TextFieldSheetComponent
} from '../shared/components';

@Component({
  selector: 'profile-tab',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent {
  APP_THEMES = APP_THEMES;
  CONFIGURATIONS = CONFIGURATIONS;
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
  displayControlConfigurationImage: ImageSource;

  genders: Array<string> = [];
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

  CURRENT_THEME: string = appSettings.getString(
    STORAGE_KEYS.APP_THEME,
    APP_THEMES.DEFAULT
  );

  constructor(
    private _settingsService: SettingsService,
    private _userService: PushTrackerUserService,
    private _themeService: ThemeService,
    private _zone: NgZone,
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private _modalService: ModalDialogService,
    private _bottomSheet: BottomSheetService,
    private _vcRef: ViewContainerRef
  ) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._themeService.theme.subscribe(theme => {
      this.CURRENT_THEME = theme;
      // Update the displayed control configuration icon on theme change
      this._initDisplayControlConfiguration();
    });

    // register for units update events
    this._userService.on(
      PushTrackerUserService.units_change_event,
      this.onUserUpdateUnits,
      this
    );
  }

  async onProfileTabLoaded() {
    this._logService.logBreadCrumb(ProfileTabComponent.name, 'Loaded');
    this._page.actionBarHidden = true;
    this.screenHeight = Screen.mainScreen.heightDIPs;
    this._barcodeScanner = new BarcodeScanner();

    this.user = KinveyUser.getActiveUser() as PushTrackerUser;
    try {
      await this.user.me();
    } catch (err) {
      this._logService.logBreadCrumb(
        ProfileTabComponent.name,
        'Failed to refresh user from kinvey'
      );
    }

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

    this.updateUserDisplay();
    this.showRateMeDialog();
  }

  showRateMeDialog() {
    const ratings = new Ratings({
      id: 'PUSHTRACKER.RATER.COUNT',
      showOnCount: 100,
      title: this._translateService.instant('dialogs.ratings.title'),
      text: this._translateService.instant('dialogs.ratings.text'),
      agreeButtonText: this._translateService.instant('dialogs.ratings.agree'),
      remindButtonText: this._translateService.instant(
        'dialogs.ratings.remind'
      ),
      declineButtonText: this._translateService.instant(
        'dialogs.ratings.decline'
      ),
      androidPackageId: 'com.permobil.pushtracker',
      iTunesAppId: '1121427802'
    });
    ratings.init();
    ratings.prompt();
  }

  getTranslationKeyForGenders(key) {
    if (GENDERS[key] === GENDERS.MALE) return 'profile-tab.gender.male';
    else if (GENDERS[key] === GENDERS.FEMALE)
      return 'profile-tab.gender.female';
    else if (GENDERS[key] === GENDERS.NON_BINARY)
      return 'profile-tab.gender.non-binary';
    else if (GENDERS[key] === GENDERS.PREFER_NOT_TO_SAY)
      return 'profile-tab.gender.prefer-not-to-say';
    else return 'profile-tab.gender.other';
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

  onAvatarTap() {
    const signOut = this._translateService.instant('general.sign-out');
    Dialogs.action({
      title: '',
      cancelButtonText: this._translateService.instant('general.cancel'),
      actions: [signOut]
    })
      .then(result => {
        if (
          !result ||
          result === this._translateService.instant('general.cancel')
        ) {
          return;
        }

        if (result === signOut) {
          this._zone.run(async () => {
            this.user.logout();
            // clean up local storage
            LS.clear();
            // Clean up appSettings key-value pairs
            appSettings.clear();
            // Reset the settings service
            this._settingsService.reset();
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
          this.updateUser(result);
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  private _saveFirstNameOnChange(newFirstName: string) {
    this.updateUser({ first_name: newFirstName });
  }

  private _saveLastNameOnChange(newLastName: string) {
    this.updateUser({ last_name: newLastName });
  }

  async onActivityGoalTap(
    args: EventData,
    config_title: string,
    config_description: string,
    key: string
  ) {
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      `User tapped config = ${config_title} ${args.object}`
    );
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
        this._logService.logBreadCrumb(
          ProfileTabComponent.name,
          `Activity setting result: ${result}`
        );
        if (result !== value) {
          if (key === STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL) {
            this.updateUser({
              activity_goal_coast_time: result
            });
          } else if (key === STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL) {
            if (
              this.user.data.distance_unit_preference === DISTANCE_UNITS.MILES
            ) {
              // user input is in miles, convert to km before saving in
              // DB
              result = milesToKilometers(result);
            }
            this.updateUser({
              activity_goal_distance: result
            });
          }
        }
        this._removeActiveDataBox();
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

    const dateTimePickerStyle = DateTimePickerStyle.create(args.object as any);

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
            ProfileTabComponent.name,
            `User changed birthday: ${result.toDateString()}`
          );
          const dateFormatted = YYYY_MM_DD(new Date(result));
          // TODO: not using result?
          const didUpdate = this.updateUser({ dob: dateFormatted });
          if (didUpdate) {
            this._logService.logBreadCrumb(
              ProfileTabComponent.name,
              `Birthday formatted: ${dateFormatted}`
            );
          }
        }
      })
      .catch(err => {
        this._removeActiveDataBox();
        this._logService.logException(err);
      });
  }

  onFirstNameTap(args) {
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'First Name pressed'
    );
    this._setActiveDataBox(args);

    const firstName = this.user.data.first_name || '';

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.first-name'),
        description: this._translateService.instant(
          'general.first-name-description'
        ),
        text: firstName
      }
    };

    this._bottomSheet.show(TextFieldSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._logService.logBreadCrumb(
            ProfileTabComponent.name,
            `first_name TextFieldSheetComponent result: ${result.data}`
          );
          const newFirstName = (result.data.text || '').replace(
            /[^A-Za-z]/g,
            ''
          );
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
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'Last Name pressed'
    );
    this._setActiveDataBox(args);

    const lastName = this.user.data.last_name || '';

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant('general.last-name'),
        description: this._translateService.instant(
          'general.last-name-description'
        ),
        text: lastName
      }
    };

    this._bottomSheet.show(TextFieldSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._logService.logBreadCrumb(
            ProfileTabComponent.name,
            `last_name TextFieldSheetComponent result: ${result.data}`
          );
          const newLastName = (result.data.text || '').replace(
            /[^A-Za-z]/g,
            ''
          );
          this._saveLastNameOnChange(newLastName);
        }
      },
      error => {
        this._logService.logBreadCrumb(
          ProfileTabComponent.name,
          'error',
          error
        );
      },
      () => {
        this._logService.logBreadCrumb(ProfileTabComponent.name, 'completed');
        this._removeActiveDataBox();
      }
    );
  }

  onGenderTap(args) {
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'User tapped Gender data box'
    );
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
        description: this._translateService.instant(
          'general.gender-description'
        ),
        primaryItems: this.gendersTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };
    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this.updateUser({ gender: this.genders[result.data.primaryIndex] });
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
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'User tapped Weight data box'
    );
    this._setActiveDataBox(args);

    let weight = this.user.data.weight;
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
      weight = kilogramsToPounds(weight);
    }

    let text = '';
    if (weight > 0) {
      text = weight.toFixed(1);
    }

    const _validateWeightFromText = (value: string) => {
      if (value || value !== '') {
        // Attempt to parse as float
        const newWeight = parseFloat(value);
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
        description: this._translateService.instant(
          'general.weight-description'
        ),
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
            this._saveWeightOnChange(newWeight);
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
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'User tapped Height data box'
    );
    this._setActiveDataBox(args);

    const listPickerNeedsSecondary =
      this.user.data.height_unit_preference === HEIGHT_UNITS.FEET_AND_INCHES;

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
        description: this._translateService.instant(
          'general.height-description'
        ),
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
          if (listPickerNeedsSecondary) {
            this._saveHeightOnChange(
              parseFloat(primaryItems[result.data.primaryIndex]),
              parseFloat(secondaryItems[result.data.secondaryIndex])
            );
          } else {
            this._saveHeightOnChange(
              parseFloat(primaryItems[result.data.primaryIndex])
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

  onChairTypeTap(args) {
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'User tapped Chair Type data box'
    );
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
        description: this._translateService.instant(
          'profile-tab.chair-type-description'
        ),
        primaryItems: this.chairTypesTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this.updateUser({
            chair_type: this.chairTypes[result.data.primaryIndex]
          });
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
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'User tapped Chair Make data box'
    );
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
        description: this._translateService.instant(
          'profile-tab.chair-make-description'
        ),
        primaryItems: this.chairMakesTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this.updateUser({
            chair_make: this.chairMakes[result.data.primaryIndex]
          });
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
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'User tapped Control Configuration data box'
    );
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
        description: this._translateService.instant(
          'profile-tab.control-configuration-description'
        ),
        primaryItems: this.configurationsTranslated,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet.show(ListPickerSheetComponent, options).subscribe(
      async result => {
        if (result && result.data) {
          const newConfig = this.configurations[result.data.primaryIndex];
          if (this.user.data.control_configuration !== newConfig) {
            const didUpdate = await this.updateUser({
              control_configuration: newConfig
            });
            if (didUpdate) {
              this._logService.logBreadCrumb(
                ProfileTabComponent.name,
                `Configuration changed to: ${newConfig}`
              );
              this._userService.emitEvent(
                PushTrackerUserService.configuration_change_event,
                { control_configuration: newConfig }
              );
            }
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

  onDeviceSetupTap(args) {
    this._modalService
      .showModal(DeviceSetupComponent, {
        context: { modal: true },
        fullscreen: true,
        animated: true,
        viewContainerRef: this._vcRef
      })
      .then(() => {})
      .catch(err => {
        this._logService.logException(err);
      });
  }

  onLabelLoaded(args: EventData) {
    const label = args.object as Label;
    if (isAndroid) {
      // make sure label is centered vertically! - look at
      // https://developer.android.com/reference/android/view/Gravity.html#CENTER_VERTICAL
      // for other constants
      label.android.setGravity(16);
    }
  }

  onEditSerialNumber(deviceName) {
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      'Edit ' + deviceName + ' serial number pressed'
    );

    const validDevices =
      deviceName === 'pushtracker'
        ? ['pushtracker', 'wristband']
        : ['smartdrive'];

    let serialNumber = '';
    let title = '';
    let description = '';
    if (deviceName === 'smartdrive') {
      serialNumber = this.user.data.smartdrive_serial_number || '';
      title = this._translateService.instant(
        'profile-tab.smartdrive-serial-number'
      );
      description = this._translateService.instant(
        'profile-tab.smartdrive-serial-number-description'
      );
    } else {
      serialNumber = this.user.data.pushtracker_serial_number || '';
      title = this._translateService.instant(
        'profile-tab.pushtracker-serial-number'
      );
      description = this._translateService.instant(
        'profile-tab.pushtracker-serial-number-description'
      );
    }

    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: title,
        description: description,
        text: serialNumber
      }
    };

    this._bottomSheet.show(TextFieldSheetComponent, options).subscribe(
      result => {
        if (result && result.data) {
          this._logService.logBreadCrumb(
            ProfileTabComponent.name,
            `Serial number TextFieldSheetComponent result: ${result.data.text}`
          );
          this._handleSerial(result.data.text, validDevices);
        }
      },
      error => {
        this._logService.logException(error);
      },
      () => {}
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
    Dialogs.alert({
      title: this._translateService.instant(
        'profile-tab.pushtracker-e2-serial-number-dialog-title'
      ),
      message: this._translateService.instant(
        'profile-tab.pushtracker-e2-serial-number-dialog-message'
      ),
      okButtonText: this._translateService.instant('profile-tab.ok')
    });
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

  private async updateUser(update: any) {
    let didUpdate = false;
    try {
      await this.user.update(update);
      didUpdate = true;
    } catch (err) {
      this._logService.logBreadCrumb(
        ProfileTabComponent.name,
        'Could not update the user - ' + err
      );
      Utils.setTimeout(() => {
        Dialogs.alert({
          title: this._translateService.instant(
            'profile-tab.network-error.title'
          ),
          message: this._translateService.instant(
            'profile-tab.network-error.message'
          ),
          okButtonText: this._translateService.instant('profile-tab.ok')
        });
      }, 1000);
    }
    appSettings.setString('Kinvey.User', JSON.stringify(this.user));
    // now actually update the rendering
    this.updateUserDisplay();
    return didUpdate;
  }

  private onUserUpdateUnits(args: any) {
    const data = args.data;
    Object.entries(data).forEach(([key, value]) => {
      this._logService.logBreadCrumb(
        ProfileTabComponent.name,
        `Registered user changed units: ${key}: ${value}`
      );
      this.user.data[key] = value;
    });
    this.updateUserDisplay();
  }

  private updateUserDisplay() {
    this._zone.run(() => {
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

  private _initDisplayActivityGoalCoastTime() {
    this.displayActivityGoalCoastTime =
      this.user.data.activity_goal_coast_time.toFixed(1) +
      ' ' +
      this._translateService.instant('units.s');
  }

  private _initDisplayActivityGoalDistance() {
    this.displayActivityGoalDistance =
      this.user.data.activity_goal_distance.toFixed(1) + '';
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
    if (this.user.data.weight === 0) {
      this.displayWeight = '';
    } else {
      this.displayWeight = this._displayWeightInKilograms(
        this.user.data.weight
      );
      // convert from metric weight (as stored in Kinvey) to user preferred unit
      if (this.user.data.weight_unit_preference === WEIGHT_UNITS.POUNDS) {
        this.displayWeight = this._displayWeightInPounds(
          kilogramsToPounds(this.user.data.weight)
        );
      }
      if (!this.displayWeight) this.displayWeight = '';
    }
  }

  private _initDisplayHeight() {
    if (this.user.data.height === 0) {
      this.displayHeight = '';
    } else {
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
  }

  private _initDisplayChairType() {
    this.displayChairType = '';
    if (this.user.data.chair_type && this.user.data.chair_type !== '') {
      const englishValue = this.user.data.chair_type;
      const index = this.chairTypes.indexOf(englishValue);
      this.displayChairType = this.chairTypesTranslated[index];
    }
  }

  private _initDisplayChairMake() {
    this.displayChairMake = '';
    if (this.user.data.chair_make && this.user.data.chair_make !== '') {
      const englishValue = this.user.data.chair_make;
      const index = this.chairMakes.indexOf(englishValue);
      this.displayChairMake = this.chairMakesTranslated[index];
    }
  }

  private _initDisplayControlConfiguration() {
    this.displayControlConfiguration = '';
    if (this.user && this.user.data && this.user.data.control_configuration) {
      const englishValue = this.user.data.control_configuration;
      const index = this.configurations.indexOf(englishValue);
      this.displayControlConfiguration = this.configurationsTranslated[index];
      this.displayControlConfigurationImage = this._getControlConfigurationImage(
        englishValue
      );
    }
  }

  private _getControlConfigurationImage(configuration) {
    let result = '';
    if (configuration === CONFIGURATIONS.SWITCHCONTROL_WITH_SMARTDRIVE) {
      result = 'switchcontrol';
    } else if (configuration === CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE) {
      result = 'og_band';
    } else if (
      configuration === CONFIGURATIONS.PUSHTRACKER_E2_WITH_SMARTDRIVE
    ) {
      result = 'pte2';
    }
    if (this.CURRENT_THEME === APP_THEMES.DEFAULT) {
      result += '_black';
    } else {
      result += '_white';
    }
    return ImageSource.fromResourceSync(result);
  }

  private _saveWeightOnChange(weight: number) {
    if (this.user.data.weight_unit_preference === WEIGHT_UNITS.KILOGRAMS) {
      const didUpdate = this.updateUser({
        weight: weight // user's preferred unit is Kg. Save as is
      });
      if (didUpdate) {
        this.displayWeight = this._displayWeightInKilograms(weight);
      }
    } else {
      // User's preferred unit is lbs
      // Database stores all weight measures in metric
      // Convert to Kg and then store in database
      const didUpdate = this.updateUser({
        weight: poundsToKilograms(weight)
      });
      if (didUpdate) {
        this.displayWeight = this._displayWeightInPounds(weight);
      }
    }
  }

  private _saveHeightOnChange(primaryValue: number, secondaryValue?: number) {
    if (this.user.data.height_unit_preference === HEIGHT_UNITS.CENTIMETERS) {
      // User's preference matches the database preference - Metric
      // Save height as is
      const didUpdate = this.updateUser({ height: primaryValue });
      if (didUpdate) {
        this.displayHeight = this._displayHeightInCentimeters(primaryValue);
      }
    } else {
      // User's preference is Ft and inches
      // Database wants height in Centimeters
      // Convert and save
      const didUpdate = this.updateUser({
        height: feetInchesToCentimeters(primaryValue, secondaryValue)
      });
      if (didUpdate) {
        this.displayHeight = this._displayHeightInFeetInches(
          primaryValue,
          secondaryValue
        );
      }
    }
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

  private _showBadSerialAlert(text: string, forDevices: string[]) {
    this._logService.logBreadCrumb(
      ProfileTabComponent.name,
      `Wrong device entered/scanned --- text: ${text}, forDevices: ${forDevices}`
    );
    Utils.setTimeout(() => {
      let message = '';
      let title = '';
      if (forDevices.includes('smartdrive')) {
        title = this._translateService.instant(
          'profile-tab.smartdrive-serial-number'
        );
        message = this._translateService.instant(
          'profile-tab.bad-smartdrive-serial-message'
        );
      } else {
        title = this._translateService.instant(
          'profile-tab.pushtracker-serial-number'
        );
        message = this._translateService.instant(
          'profile-tab.bad-pushtracker-serial-message'
        );
      }
      Dialogs.alert({
        title: title,
        message: message,
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    }, 1000);
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
      const valid = isFinite(value) && isFinite(Number(text));
      isSmartDrive = !isPushTracker && !isWristband && valid && value > 0;

      if (isPushTracker) {
        deviceType = 'pushtracker';
      } else if (isWristband) {
        deviceType = 'wristband';
      } else if (isSmartDrive) {
        deviceType = 'smartdrive';
      } else {
        this._showBadSerialAlert(text, forDevices);
        return;
      }
      // check the type
      if (
        forDevices &&
        forDevices.length &&
        forDevices.indexOf(deviceType) === -1
      ) {
        this._showBadSerialAlert(text, forDevices);
        return;
      }

      // now set the serial number
      if (deviceType === 'pushtracker' || deviceType === 'wristband') {
        this.updateUser({
          pushtracker_serial_number: serialNumber
        });

        // Set the Sentry Context Tags
        Sentry.setContextTags({
          pushtracker_serial_number: serialNumber
        });
      } else if (deviceType === 'smartdrive') {
        this.updateUser({
          smartdrive_serial_number: serialNumber
        });
        // Set the Sentry Context Tags
        Sentry.setContextTags({
          smartdrive_serial_number: serialNumber
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
