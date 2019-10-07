import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingIndicator } from '@nstudio/nativescript-loading-indicator';
import { preventKeyboardFromShowing } from '@permobil/nativescript';
import { validate } from 'email-validator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import * as appSettings from 'tns-core-modules/application-settings';
import { device, isAndroid, isIOS } from 'tns-core-modules/platform';
import { alert } from 'tns-core-modules/ui/dialogs';
import { TextField } from 'tns-core-modules/ui/text-field';
import { AppResourceIcons, APP_THEMES, STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';

@Component({
  selector: 'forgot-password',
  moduleId: module.id,
  templateUrl: 'forgot-password.component.html'
})
export class ForgotPasswordComponent implements OnInit {
  @ViewChild('emailTextBox', { static: true })
  emailTextBox: ElementRef;

  androidBackIcon;
  userEmail = '';
  emailError = '';

  private _loadingIndicator = new LoadingIndicator();

  constructor(
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _translateService: TranslateService
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
    this._logService.logBreadCrumb(ForgotPasswordComponent.name, 'ngOnInit.');
  }

  goBack() {
    if (this._routerExtensions.canGoBack()) {
      this._routerExtensions.back();
    } else {
      this._routerExtensions.navigate(['/login'], {});
    }
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

  onSubmitTap() {
    // validate the email
    if (!this.userEmail) {
      this.emailError = this._translateService.instant(
        'general.email-required'
      );
      return;
    }
    // make sure it's a valid email
    const em = this.userEmail.trim();
    if (!validate(em)) {
      this.emailError =
        `"${em} "` + this._translateService.instant('general.email-error');
      return;
    }

    this.emailError = '';

    this._loadingIndicator.show({
      message: this._translateService.instant('general.submitting'),
      dimBackground: true
    });

    this.userEmail = this.userEmail.trim().toLowerCase();

    KinveyUser.resetPassword(this.userEmail)
      .then(_ => {
        this._loadingIndicator.hide();
        alert({
          title: this._translateService.instant('general.email-sent'),
          message: this._translateService.instant('general.check-email'),
          okButtonText: this._translateService.instant('general.ok')
        }).then(() => {
          this._routerExtensions.navigate(['/login'], {});
        })
        .catch(err => {
          this._logService.logException(err);
        });
      })
      .catch(err => {
        this._logService.logException(err);
        this._loadingIndicator.hide();
        alert({
          title: this._translateService.instant('general.error'),
          message: this._translateService.instant('general.account-error'),
          okButtonText: this._translateService.instant('dialogs.ok')
        });
      });
  }

  onEmailTextChange(value) {
    // make sure it's a valid email
    this.userEmail = value.trim();
    this.emailError = !validate(this.userEmail)
      ? `"${this.userEmail}" ` +
        this._translateService.instant('general.email-error')
      : '';
  }
}
