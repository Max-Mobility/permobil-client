import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { preventKeyboardFromShowing } from '@permobil/nativescript';
import { validate } from 'email-validator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { alert } from 'tns-core-modules/ui/dialogs';
import { AppResourceIcons, APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';

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
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    height: 0,
    height_unit_preference: 1,
    weight: 0,
    weight_unit_preference: 1,
    distance_unit_preference: 1,
    activity_goal_distance: 60,
    activity_goal_coast_time: 45
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
    private _translateService: TranslateService,
    private _zone: NgZone
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
    this._logService.logBreadCrumb('sign-up.component ngOnInit');
  }

  goBack() {
    this._router.back();
  }

  onFuckTap(args) {
    console.log('on fuck tap');
  }

  async onSubmitSignUp() {
    console.dir(this.user);
    // validate the email
    const isEmailValid = this._isEmailValid(this.user.username);
    if (!isEmailValid) {
      return;
    }
    const isPasswordValid = this._isPasswordValid(this.user.password);
    if (!isPasswordValid) {
      return;
    }
    // validate user form
    const isFirstNameValid = this._isFirstNameValid(this.user.first_name);
    if (!isFirstNameValid) {
      return;
    }
    const isLastNameValid = this._isLastNameValid(this.user.last_name);
    if (!isLastNameValid) {
      return;
    }
    const isBirthdayValid = this._isBirthdayValid(this.user.dob);
    if (!isBirthdayValid) {
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
    this.user.password = this.user.password.trim();
    this.user.dob = this.user.dob.trim();

    // TODO: need to show privacy / user agreement forms here - the
    //       user cannot create the account without reading and
    //       agreeing to both!
    // this._logService.logBreadCrumb(
    //   SignUpComponent.LOG_TAG +
    //     `onSubmitTap() creating new account: ${JSON.stringify(this.user)}`
    // );
    // // need to make sure the username is not already taken
    const userExists = await KinveyUser.exists(this.user.username);

    this._logService.logBreadCrumb(`KinveyUser.exists() result: ${userExists}`);
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
      }).then(() => {
        // Navigate to tabs home with clearHistory
        this._zone.run(() => {
          this._router.navigate(['/tabs/default'], {
            clearHistory: true
          });
        });
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

  private _isBirthdayValid(text: string): boolean {
    // validate the birthday
    if (!text) {
      this.birthdayError = this._translateService.instant(
        'sign-up.birthdate-required'
      );
      return false;
    }
    this.birthdayError = '';
    return true;
  }
}
