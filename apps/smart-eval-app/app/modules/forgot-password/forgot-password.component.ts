import { Component, OnInit } from '@angular/core';
import {
  LoggingService,
  preventKeyboardFromShowing,
  ProgressService,
  UserService
} from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { validate } from 'email-validator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import { PropertyChangeData } from 'tns-core-modules/data/observable';
import { alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { setMarginForIosSafeArea } from '../../utils';

@Component({
  selector: 'forgot-password',
  moduleId: module.id,
  templateUrl: 'forgot-password.component.html',
  styleUrls: ['forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  private static LOG_TAG = 'forgot-password.component ';
  email = '';
  emailError = '';

  constructor(
    private _routerExtensions: RouterExtensions,
    private _logService: LoggingService,
    private _progressService: ProgressService,
    private _userService: UserService,
    private _page: Page,
    private _translateService: TranslateService
  ) {
    this._page.className = 'blue-gradient-down';
    preventKeyboardFromShowing();
  }

  ngOnInit(): void {
    this._logService.logBreadCrumb(
      ForgotPasswordComponent.LOG_TAG + `ngOnInit`
    );
    this._page.actionBarHidden = true;
    this._page.backgroundSpanUnderStatusBar = true;
    setMarginForIosSafeArea(this._page);
  }

  goBack() {
    if (this._routerExtensions.canGoBack()) {
      this._routerExtensions.back();
    } else {
      this._routerExtensions.navigate(['/login'], {
        transition: {
          name: 'slideRight'
        }
      });
    }
  }

  onSubmitTap() {
    // validate the email
    if (!this.email) {
      this.emailError = this._translateService.instant('user.email-required');
      return;
    }
    // make sure it's a valid email
    const em = this.email.trim();
    if (!validate(em)) {
      this.emailError =
        `"${em} "` + this._translateService.instant('user.email-error');
      return;
    }

    this.emailError = '';

    this._progressService.show(
      this._translateService.instant('user.submitting')
    );

    KinveyUser.resetPassword(this.email)
      .then(resp => {
        this._progressService.hide();
        alert({
          title: this._translateService.instant('user.email-sent'),
          message: this._translateService.instant('user.check-email'),
          okButtonText: this._translateService.instant('dialogs.ok')
        }).then(() => {
          this._routerExtensions.navigate(['/login'], {
            transition: {
              name: 'slideRight'
            }
          });
        });
      })
      .catch(err => {
        this._logService.logException(err);
        this._progressService.hide();
        alert({
          title: this._translateService.instant('user.error'),
          message: this._translateService.instant('user.account-error'),
          okButtonText: this._translateService.instant('dialogs.ok')
        });
      });
  }

  onEmailTextChange(args: PropertyChangeData) {
    // make sure it's a valid email
    const em = this.email.trim();
    this.emailError = !validate(em)
      ? `"${em}" ` + this._translateService.instant('user.email-error')
      : '';
  }

  navToLogin() {
    this._routerExtensions.navigate(['/login'], {
      transition: {
        name: 'slideRight'
      }
    });
  }
}
