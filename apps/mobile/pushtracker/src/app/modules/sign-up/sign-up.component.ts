import { Component, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { preventKeyboardFromShowing } from '@permobil/nativescript';
import { validate } from 'email-validator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { RouterExtensions } from 'nativescript-angular/router';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { device, isAndroid, isIOS } from 'tns-core-modules/platform';
import { alert } from 'tns-core-modules/ui/dialogs';
import { TextField } from 'tns-core-modules/ui/text-field';
import { AppResourceIcons, APP_THEMES, STORAGE_KEYS,
  DISTANCE_UNITS, HEIGHT_UNITS, WEIGHT_UNITS, CHAIR_MAKE, CHAIR_TYPE, TIME_FORMAT } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';
import { PrivacyPolicyComponent } from '..';
import { PushTrackerUser } from '@permobil/core';
import * as Kinvey from 'kinvey-nativescript-sdk';
import { APP_KEY, APP_SECRET } from '../../utils/kinvey-keys';

@Component({
  selector: 'sign-up',
  moduleId: module.id,
  templateUrl: 'sign-up.component.html'
})
export class SignUpComponent implements OnInit {
  @ViewChild('emailTextBox', { static: true })
  emailTextBox: ElementRef;

  @ViewChild('passwordTextBox', { static: true })
  passwordTextBox: ElementRef;

  @ViewChild('firstNameTextBox', { static: true })
  firstNameTextBox: ElementRef;

  @ViewChild('lastNameTextBox', { static: true })
  lastNameTextBox: ElementRef;

  @ViewChild('birthdayTextBox', { static: true })
  birthdayTextBox: ElementRef;

  user = {
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    dob: '',
    gender: '',
    height: 0,
    height_unit_preference: HEIGHT_UNITS.FEET_AND_INCHES,
    weight: 0,
    weight_unit_preference: WEIGHT_UNITS.POUNDS,
    distance_unit_preference: DISTANCE_UNITS.MILES,
    time_format_preference: TIME_FORMAT.AM_PM,
    activity_goal_distance: 5,
    activity_goal_coast_time: 5,
    has_agreed_to_user_agreement: false,
    has_read_privacy_policy: false,
    consent_to_product_development: false,
    consent_to_research: false,
    chair_type: CHAIR_TYPE.RIGID,
    chair_make: CHAIR_MAKE.COLOURS,
    smartdrive_serial_number: '',
    pushtracker_serial_number: ''
  };

  passwordError = '';
  emailError = '';
  firstNameError = '';
  lastNameError = '';
  birthdayError = '';

  androidBackIcon: string;

  private _loadingIndicator = new LoadingIndicator();

  constructor(
    private _logService: LoggingService,
    private _router: RouterExtensions,
    private _modalService: ModalDialogService,
    private _translateService: TranslateService,
    private _vcRef: ViewContainerRef,
    private _userService: PushTrackerUserService
  ) {
    preventKeyboardFromShowing();

    const currentTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.androidBackIcon =
      currentTheme === APP_THEMES.DEFAULT
        ? AppResourceIcons.BLACK_BACK_NAV
        : AppResourceIcons.WHITE_BACK_NAV;
  }

  ngOnInit() {
    this._logService.logBreadCrumb(SignUpComponent.name, 'ngOnInit');
  }

  goBack() {
    this._router.back();
  }

  onEmailTextFieldLoaded(args) {
    if (isIOS) {
      const uiTF = (args.object as TextField).ios as UITextField;
      uiTF.textContentType = UITextContentTypeEmailAddress;
    } else if (isAndroid && device.sdkVersion >= '26') {
      const et = (args.object as TextField).android as any; // android.widget.EditText
      et.setAutofillHints([
        (android.view.View as any).AUTOFILL_HINT_EMAIL_ADDRESS
      ]);
      et.setImportantForAutofill(
        (android.view.View as any).IMPORTANT_FOR_AUTOFILL_YES
      );
    }
  }

  onPasswordTextFieldLoaded(args) {
    if (isIOS) {
      const uiTF = (args.object as TextField).ios as UITextField;
      uiTF.textContentType = UITextContentTypePassword;
    } else if (isAndroid && device.sdkVersion >= '26') {
      const et = (args.object as TextField).android as any; // android.widget.EditText
      et.setAutofillHints([(android.view.View as any).AUTOFILL_HINT_PASSWORD]);
      et.setImportantForAutofill(
        (android.view.View as any).IMPORTANT_FOR_AUTOFILL_YES
      );
    }
  }

  onFirstNameTextFieldLoaded(args) {
    if (isIOS) {
      const uiTF = (args.object as TextField).ios as UITextField;
      uiTF.textContentType = UITextContentTypeGivenName;
    }
  }

  onLastNameTextFieldLoaded(args) {
    if (isIOS) {
      const uiTF = (args.object as TextField).ios as UITextField;
      uiTF.textContentType = UITextContentTypeFamilyName;
    }
  }

  async onSubmitSignUp() {
    console.dir(this.user);
    // validate the email
    const isEmailValid = this._isEmailValid(
      this.user.username.trim().toLowerCase()
    );
    if (!isEmailValid) {
      return;
    }
    const isPasswordValid = this._isPasswordValid(this.user.password);
    if (!isPasswordValid) {
      return;
    }
    // validate user form
    const isFirstNameValid = this._isFirstNameValid(
      this.user.first_name.trim()
    );
    if (!isFirstNameValid) {
      return;
    }
    const isLastNameValid = this._isLastNameValid(this.user.last_name.trim());
    if (!isLastNameValid) {
      return;
    }

    let has_agreed_to_user_agreement = false;
    let has_read_privacy_policy = false;
    let consent_to_product_development = false;
    let consent_to_research = false;
    try {
      const result = await this._modalService
        .showModal(PrivacyPolicyComponent, {
          context: { data: {} },
          fullscreen: true,
          animated: true,
          viewContainerRef: this._vcRef
        });
      if (result !== undefined) {
        has_agreed_to_user_agreement = result.has_agreed_to_user_agreement || false;
        has_read_privacy_policy = result.has_read_privacy_policy || false;
        consent_to_product_development = result.consent_to_product_development || false;
        consent_to_research = result.consent_to_research || false;
      }
    } catch (err) {
      this._logService.logException(err);
      return;
    }

    if (!has_agreed_to_user_agreement || !has_read_privacy_policy) {
      new Toasty({
        text: this._translateService.instant('sign-up.must-agree-and-read'),
        duration: ToastDuration.LONG,
        position: ToastPosition.CENTER
      }).show();
      return;
    }

    this._loadingIndicator.show({
      message: this._translateService.instant('sign-up.creating-account'),
      dimBackground: true
    });

    // trim all the strings on user object
    this.user.first_name = this.user.first_name.trim();
    this.user.last_name = this.user.last_name.trim();
    this.user.username = this.user.username.trim().toLowerCase();
    this.user.email = this.user.username;
    this.user.password = this.user.password.trim();
    this.user.has_agreed_to_user_agreement = has_agreed_to_user_agreement;
    this.user.has_read_privacy_policy = has_read_privacy_policy;
    this.user.consent_to_product_development = consent_to_product_development;
    this.user.consent_to_research = consent_to_research;

    // // need to make sure the username is not already taken
    const userExists = await KinveyUser.exists(this.user.username);

    this._logService.logBreadCrumb(SignUpComponent.name, `KinveyUser.exists() result: ${userExists}`);
    // if username is taken tell user and exit so they can correct
    if (userExists === true) {
      this._loadingIndicator.hide();
      new Toasty({
        text: this._translateService.instant('sign-up.user-exists'),
        duration: ToastDuration.SHORT,
        position: ToastPosition.CENTER
      }).show();
      return;
    }

    // now create the account
    try {
      const user = await KinveyUser.signup(this.user);
      this._loadingIndicator.hide();
      alert({
        title: this._translateService.instant('general.success'),
        message:
          this._translateService.instant('sign-up.sign-up-success') +
          ` ${user.username}`,
        okButtonText: this._translateService.instant('general.ok')
      }).then(async () => {

        Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });
        Kinvey.ping()
          .then(() => {
            // Kinvey SDK is working
            // Navigate to tabs home with clearHistory
            this._userService.initializeUser(<PushTrackerUser>((<any>KinveyUser.getActiveUser())));
            this._router.navigate(['configuration'], {
              clearHistory: true
            });
          })
          .catch(err => {
            this._logService.logException(err);
          });
      })
      .catch(err => {
        this._logService.logException(err);
      });
    } catch (err) {
      this._loadingIndicator.hide();
      this._logService.logException(err);
      alert({
        title: this._translateService.instant('general.error'),
        message: this._translateService.instant('sign-up.sign-up-error') + err,
        okButtonText: this._translateService.instant('general.ok')
      });
    }
  }

  onEmailTextChange(value) {
    this.user.username = value;
    this._isEmailValid(this.user.username);
  }

  private _isEmailValid(text: string): boolean {
    // validate the email
    if (!text) {
      this.emailError = this._translateService.instant(
        'general.email-required'
      );
      return false;
    }

    // make sure it's a valid email
    const email = text.trim();
    if (!validate(email)) {
      this.emailError = `"${email}" ${this._translateService.instant(
        'general.email-invalid'
      )}`;
      return false;
    }

    this.emailError = '';
    return true;
  }

  private _isPasswordValid(text: string): boolean {
    // validate the password
    if (!text) {
      this.passwordError = this._translateService.instant(
        'general.password-required'
      );
      return false;
    }
    this.passwordError = '';
    return true;
  }

  private _isFirstNameValid(text: string): boolean {
    // validate the firstname
    if (!text) {
      this.firstNameError = this._translateService.instant(
        'sign-up.first-name-required'
      );
      return false;
    }
    this.firstNameError = '';
    return true;
  }

  private _isLastNameValid(text: string): boolean {
    // validate the lastname
    if (!text) {
      this.lastNameError = this._translateService.instant(
        'sign-up.last-name-required'
      );
      return false;
    }
    this.lastNameError = '';
    return true;
  }
}
