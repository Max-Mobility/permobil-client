import { Component, NgZone, OnInit } from '@angular/core';
import { LoggingService, preventKeyboardFromShowing, ProgressService, UserService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { validate } from 'email-validator';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { Button } from 'tns-core-modules/ui/button';
import { alert } from 'tns-core-modules/ui/dialogs';
import { EventData, Page } from 'tns-core-modules/ui/page';
import { TextField } from 'tns-core-modules/ui/text-field';
import { isIosSimulator, setMarginForIosSafeArea } from '../../utils';

declare const com;

@Component({
  selector: 'login',
  moduleId: module.id,
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss']
})
export class LoginComponent implements OnInit {
  private static LOG_TAG = 'login.component ';

  user = { email: '', password: '' };
  passwordError = '';
  emailError = '';

  constructor(
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _userService: UserService,
    private _progressService: ProgressService,
    private _page: Page,
    private _translateService: TranslateService,
    private _zone: NgZone
  ) {
    this._page.className = 'blue-gradient-down';
    preventKeyboardFromShowing();
  }

  ngOnInit() {
    this._page.actionBarHidden = true;
    this._page.backgroundSpanUnderStatusBar = true;
    setMarginForIosSafeArea(this._page);
    // if we get to the login page, no user should be logged in
    Kinvey.User.logout();
  }

  async onSubmitTap() {
    try {
      // validate the email
      const isEmailValid = this._isEmailValid(this.user.email);
      if (!isEmailValid) {
        return;
      }

      const isPasswordValid = this._isPasswordValid(this.user.password);
      if (!isPasswordValid) {
        return;
      }

      this._progressService.show(
        this._translateService.instant('user.signing-in')
      );

      this._logService.logBreadCrumb(
        LoginComponent.LOG_TAG +
          `Signing in ${this.user.email} - ${this.user.password}`
      );

      // login with Kinvey
      await Kinvey.User.login(
        this.user.email.trim(),
        this.user.password.trim()
      );
      this._progressService.hide();

      // should have active user at this point and ask to register push notifications
      if (Kinvey.User.getActiveUser()) {
        // if on android or not on iOS Simulator register the device for push
        if (isAndroid || (isIOS && !isIosSimulator())) {
          await this._userService._registerForPushNotifications();
        }
      }

      this._zone.run(() => {
        this._routerExtensions.navigate(['/home'], {
          clearHistory: true
        });
      });
    } catch (error) {
      this._logService.logBreadCrumb(
        LoginComponent.LOG_TAG + `Error attempting to sign in: ${error}`
      );
      this._progressService.hide();

      // handle the situation when an active user is still detected by Kinvey
      // call Kinvey logout to remove the active user, then call the login function again
      // see: https://sentry.io/share/issue/aa1a10751f2c4c3d8be076f481546ad8/
      if (error.toString().includes('ActiveUserError')) {
        Kinvey.User.logout();
        this.onSubmitTap();
        this._logService.logBreadCrumb(
          LoginComponent.LOG_TAG +
            `Logged out the active user and restarted the login submit function.`
        );
        return;
      }

      // parse the exceptions from kinvey sign up
      let errorMessage = this._translateService.instant('user.sign-in-error-1');
      if (error.toString().includes('InvalidCredentialsError')) {
        errorMessage = this._translateService.instant('user.sign-in-error-2');
        // we don't need to send this exception to Kinvey, just extra noise
        // Brad - changing this to show a Toast to not block user and not logging the exception
        // see: https://sentry.io/share/issue/d48735572d9641678348f451a9d00e78/
        new Toasty(
          {text: errorMessage,
          duration: ToastDuration.SHORT,
          position: ToastPosition.CENTER}
        ).show();
      } else {
        alert({
          title: this._translateService.instant('user.error'),
          message: errorMessage,
          okButtonText: this._translateService.instant('dialogs.ok')
        });
        this._logService.logException(error);
      }
    }
  }

  navToForgotPassword() {
    this._routerExtensions.navigate(['/forgot-password'], {
      transition: {
        name: 'slideLeft'
      }
    });
  }

  onEmailTextChange(args) {
    this.user.email = args.value;
    this._isEmailValid(this.user.email);
  }

  navToSignUp() {
    this._routerExtensions.navigate(['/sign-up'], {
      transition: {
        name: 'slideLeft'
      }
    });
  }

  onEmailTextFieldLoaded(args: EventData) {
    if (isAndroid) {
      const tf = (args.object as TextField).android as android.widget.EditText;
      tf.setId(com.permobil.smarteval.R.id.login_email_textfield);
    } else if (isIOS) {
      const btn = (args.object as Button).ios as UIButton;
      btn.tag = 542561567;
    }
  }

  onPasswordTextFieldLoaded(args: EventData) {
    if (isAndroid) {
      const tf = (args.object as TextField).android as android.widget.EditText;
      tf.setId(com.permobil.smarteval.R.id.login_password_textfield);
    } else if (isIOS) {
      const btn = (args.object as Button).ios as UIButton;
      btn.tag = 542561573;
    }
  }

  onSubmitButtonLoaded(args: EventData) {
    if (isAndroid) {
      const btn = (args.object as Button).android as android.widget.Button;
      btn.setId(com.permobil.smarteval.R.id.login_submit_button);
    } else if (isIOS) {
      const btn = (args.object as Button).ios as UIButton;
      btn.tag = 542561588;
    }
  }

  private _isEmailValid(text: string): boolean {
    // validate the email
    if (!text) {
      this.emailError = this._translateService.instant('user.email-required');
      return false;
    }
    // make sure it's a valid email
    const email = text.trim();
    if (!validate(email)) {
      this.emailError = `"${email}" ${this._translateService.instant(
        'user.email-error'
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
        'user.password-error'
      );
      return false;
    }
    this.passwordError = '';
    return true;
  }
}
