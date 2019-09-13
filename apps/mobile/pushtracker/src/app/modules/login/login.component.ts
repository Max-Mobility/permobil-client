import { Component, NgZone, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { Log } from '@permobil/core';
import { preventKeyboardFromShowing } from '@permobil/nativescript';
import { validate } from 'email-validator';
import * as Kinvey from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { device, isAndroid, isIOS } from 'tns-core-modules/platform';
import { Page } from 'tns-core-modules/ui/page';
import { TextField } from 'tns-core-modules/ui/text-field';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService, PushTrackerUserService } from '../../services';
import { enableDarkTheme, enableDefaultTheme } from '../../utils';

@Component({
  selector: 'login',
  moduleId: module.id,
  templateUrl: 'login.component.html'
})
export class LoginComponent implements OnInit {
  user = { email: '', password: '' };
  passwordError = '';
  emailError = '';

  private _loadingIndicator = new LoadingIndicator();

  constructor(
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _page: Page,
    private _translateService: TranslateService,
    private _zone: NgZone,
    private _userService: PushTrackerUserService
  ) {
    this._page.actionBarHidden = true;
    preventKeyboardFromShowing();
  }

  ngOnInit() {
    this._logService.logBreadCrumb('LoginComponent ngOnInit');
    // if we get to the login page, no user should be logged in
    Kinvey.User.logout();
  }

  navToForgotPassword() {
    this._routerExtensions.navigate(['/forgot-password'], {});
  }

  navToSignUp() {
    this._routerExtensions.navigate(['/sign-up'], {});
  }

  async onSubmitLogin() {
    console.dir(this.user);
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

      this._loadingIndicator.show({
        message: this._translateService.instant('general.signing-in'),
        dimBackground: true
      });

      this._logService.logBreadCrumb(
        `Signing in ${this.user.email} - ${this.user.password}`
      );

      const user = await Kinvey.User.login(
        this.user.email.trim().toLowerCase(),
        this.user.password.trim()
      );

      Log.D(`Logged in user`, user);
      appSettings.setString(
        STORAGE_KEYS.APP_THEME,
        user.data['theme_preference'] || APP_THEMES.DEFAULT
      );

      user.data['theme_preference'] === APP_THEMES.DEFAULT
      ? enableDefaultTheme()
      : enableDarkTheme();

      this._loadingIndicator.hide();

      // Navigate to tabs home with clearHistory
      this._userService.reset();
      this._zone.run(() => {
        this._routerExtensions.navigate(['/tabs/default'], {
          clearHistory: true
        });
      });
    } catch (error) {
      this._loadingIndicator.hide();
      // handle the errors (mainly for kinvey exceptions so we can inform user what happened with log in)

      if (error.toString().includes('ActiveUserError')) {
        Kinvey.User.logout();
        this._logService.logBreadCrumb(
          `Logged out the active user and restarted the login submit function.`
        );
        this.onSubmitLogin();
        return;
      } else if (error.toString().includes('InvalidCredentialsError')) {
        new Toasty({
          text: this._translateService.instant('general.sign-in-error-2'),
          duration: ToastDuration.SHORT,
          position: ToastPosition.CENTER
        }).show();
      } else {
        alert({
          title: this._translateService.instant('general.error'),
          message: this._translateService.instant('general.sign-in-error-1'),
          okButtonText: this._translateService.instant('general.ok')
        });
        this._logService.logException(error);
      }
    }

    // try {

    //   // should have active user at this point and ask to register push notifications
    //   if (Kinvey.User.getActiveUser()) {
    //     // if on android or not on iOS Simulator register the device for push
    //     if (isAndroid || (isIOS && !isIosSimulator())) {
    //       await this._registerForPushNotifications();
    //     }
    //   }

    //   // handle the situation when an active user is still detected by Kinvey
    //   // call Kinvey logout to remove the active user, then call the login function again
    //   // see: https://sentry.io/share/issue/aa1a10751f2c4c3d8be076f481546ad8/
    //   if (error.toString().includes('ActiveUserError')) {
    //     Kinvey.User.logout();
    //     this._logService.logBreadCrumb(
    //       LoginComponent.LOG_TAG +
    //         `Logged out the active user and restarted the login submit function.`
    //     );
    //     return;
    //   }

    //   // parse the exceptions from kinvey sign up
    //   let errorMessage = this._translateService.instant('user.sign-in-error-1');
    //   if (error.toString().includes('InvalidCredentialsError')) {
    //     errorMessage = this._translateService.instant('user.sign-in-error-2');
    //     // we don't need to send this exception to Kinvey, just extra noise
    //     // Brad - changing this to show a Toast to not block user and not logging the exception
    //     // see: https://sentry.io/share/issue/d48735572d9641678348f451a9d00e78/
    //     new Toasty({
    //       text: errorMessage,
    //       duration: ToastDuration.SHORT,
    //       position: ToastPosition.CENTER
    //     }).show();
    //   } else {
    //     alert({
    //       title: this._translateService.instant('user.error'),
    //       message: errorMessage,
    //       okButtonText: this._translateService.instant('dialogs.ok')
    //     });
    //     this._logService.logException(error);
    //   }
    // }
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

  onEmailTextChange(value) {
    this.user.email = value;
    this._isEmailValid(this.user.email);
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
        'general.email-error'
      )}`;
      return false;
    }

    this.emailError = '';
    return true;
  }

  private _isPasswordValid(text: string): boolean {
    console.log('pw', this.user.password);
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
}
