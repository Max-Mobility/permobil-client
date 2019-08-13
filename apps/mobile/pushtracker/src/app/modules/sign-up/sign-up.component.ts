import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { Log } from '@permobil/core';
import {
  hideKeyboard,
  preventKeyboardFromShowing
} from '@permobil/nativescript';
import { subYears } from 'date-fns';
import { validate } from 'email-validator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import {
  DateTimePicker,
  DateTimePickerStyle
} from 'nativescript-datetimepicker';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { isAndroid } from 'tns-core-modules/platform';
import { alert } from 'tns-core-modules/ui/dialogs';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { TextField } from 'tns-core-modules/ui/text-field';
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

  user = { username: '', password: '', first_name: '', last_name: '', dob: '' };

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

  textfieldLoaded(args) {
    if (isAndroid) {
      const tf = args.object as TextField;
      tf.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
    }
  }

  onBirthdayTap(args) {
    // ugly hack for now to just force clear the active styles
    this.onBlurTF(0);
    this.onBlurTF(1);
    this.onBlurTF(2);
    this.onBlurTF(3);
    (args.object as StackLayout).className = 'textbox-active';

    const dateTimePickerStyle = DateTimePickerStyle.create(
      args.object as StackLayout
    );

    DateTimePicker.pickDate(
      {
        context: (args.object as StackLayout)._context,
        date: subYears(new Date(), 18),
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
        (args.object as StackLayout).className = 'textbox';

        if (result) {
          const date = new Date(result);
          const month = date.getUTCMonth() + 1;
          const day = date.getUTCDate();
          const year = date.getUTCFullYear();
          const dateFormatted = month + '/' + day + '/' + year;
          Log.D('Birthday formatted', dateFormatted);
          this.user.dob = dateFormatted;
        }
      })
      .catch(err => {
        this._logService.logException(err);
        (args.object as StackLayout).className = 'textbox';
      });
  }

  onFocusTF(args, index: number) {
    if (index === 0) {
      (this.emailTextBox.nativeElement as StackLayout).className =
        'textbox-active';
    } else if (index === 1) {
      (this.passwordTextBox.nativeElement as StackLayout).className =
        'textbox-active';
    } else if (index === 2) {
      (this.firstNameTextBox.nativeElement as StackLayout).className =
        'textbox-active';
    } else if (index === 3) {
      (this.lastNameTextBox.nativeElement as StackLayout).className =
        'textbox-active';
    }
  }

  onBlurTF(index: number) {
    hideKeyboard();

    if (index === 0) {
      (this.emailTextBox.nativeElement as StackLayout).className = 'textbox';
    } else if (index === 1) {
      (this.passwordTextBox.nativeElement as StackLayout).className = 'textbox';
    } else if (index === 2) {
      (this.firstNameTextBox.nativeElement as StackLayout).className =
        'textbox';
    } else if (index === 3) {
      (this.lastNameTextBox.nativeElement as StackLayout).className = 'textbox';
    }
  }

  async onSubmitSignUp() {
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
      message: this._translateService.instant('sign-up.creating-account')
    });

    // trim all the strings on user object
    this.user.first_name = this.user.first_name.trim();
    this.user.last_name = this.user.last_name.trim();
    this.user.username = this.user.username.trim();
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

  onEmailTextChange(args) {
    this.user.username = args.value;
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
