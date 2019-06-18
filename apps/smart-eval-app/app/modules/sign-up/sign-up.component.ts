import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { User, UserTypes } from '@maxmobility/core';
import { LoggingService, preventKeyboardFromShowing, ProgressService, UserService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { validate } from 'email-validator';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ModalDialogService } from 'nativescript-angular/directives/dialogs';
import { RouterExtensions } from 'nativescript-angular/router';
import { SelectedIndexChangedEventData, ValueList } from 'nativescript-drop-down';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { PrivacyPolicyComponent } from '../../privacy-policy';
import { setMarginForIosSafeArea } from '../../utils';

@Component({
  selector: 'eval-login',
  moduleId: module.id,
  templateUrl: 'sign-up.component.html',
  styleUrls: ['sign-up.component.scss']
})
export class SignUpComponent implements OnInit {
  private static LOG_TAG = 'sign-up.component ';
  user = new User();
  passwordError = '';
  emailError = '';
  firstNameError = '';
  lastNameError = '';

  // dropdown list of languages
  languages = new ValueList<string>(
    this._translateService.getLangs().map(l => {
      return {
        value: l,
        display: this._translateService.instant('languages.' + l)
      };
    })
  );
  selectedLanguageIndex = 0;

  usertypes = new ValueList([
    {
      value: UserTypes.Clinician,
      display: this._translateService.instant('sign-up.user-type-clinician')
    },
    {
      value: UserTypes.Representative,
      display: this._translateService.instant('sign-up.user-type-rep')
    },
    {
      value: UserTypes.EndUser,
      display: this._translateService.instant('sign-up.user-type-end-user')
    }
  ]);

  selectedUserTypeIndex = 0;

  ok: string = this._translateService.instant('dialogs.ok');

  _isPermobilEmailSigningUp = false;

  constructor(
    private _userService: UserService,
    private _logService: LoggingService,
    private _progressService: ProgressService,
    private _page: Page,
    private _router: RouterExtensions,
    private _translateService: TranslateService,
    private modal: ModalDialogService,
    private vcRef: ViewContainerRef
  ) {
    this._page.className = 'blue-gradient-down';
    preventKeyboardFromShowing();
  }

  ngOnInit() {
    this._logService.logBreadCrumb(SignUpComponent.LOG_TAG + `ngOnInit`);
    this._page.actionBarHidden = true;
    this._page.backgroundSpanUnderStatusBar = true;
    setMarginForIosSafeArea(this._page);
  }

  /**
   * User Language dropdown changed
   */
  onLanguageChanged(args: SelectedIndexChangedEventData) {
    const newLanguage = this.languages.getValue(args.newIndex) || 'en';
    this.user.language = newLanguage;
    this._translateService.use(newLanguage);
    this._logService.logBreadCrumb(
      SignUpComponent.LOG_TAG + `onLanguageChanged newLanguage: ${newLanguage}`
    );
  }

  /**
   * User Type drodown changed
   * @param args
   */
  onUserTypeChanged(args: SelectedIndexChangedEventData) {
    const type = this.usertypes.getValue(args.newIndex) || 0;
    this.user.type = type;

    if (this.user.email) {
      this._isEmailValid(this.user.email);
    }
  }

  async showModal(): Promise<any> {
    const options = {
      context: {
        user: this.user
      },
      fullscreen: true,
      viewContainerRef: this.vcRef
    };
    return this.modal.showModal(PrivacyPolicyComponent, options).then(res => {
      const hasCanceled = !res;
      if (res) {
        this.user.has_read_privacy_policy = res.has_read_privacy_policy;
        this.user.has_agreed_to_user_agreement =
          res.has_agreed_to_user_agreement;
        this.user.consent_to_research = res.consent_to_research;
        this.user.consent_to_product_development =
          res.consent_to_product_development;
      }
      const hasAgreed =
        this.user.has_read_privacy_policy &&
        this.user.has_agreed_to_user_agreement;
      return { hasAgreed, hasCanceled };
    });
  }

  async onSubmitTap() {
    // validate user form
    const isFirstNameValid = this._isFirstNameValid(this.user.first_name);
    if (!isFirstNameValid) {
      return;
    }

    const isLastNameValid = this._isLastNameValid(this.user.last_name);
    if (!isLastNameValid) {
      return;
    }

    // validate the email
    const isEmailValid = this._isEmailValid(this.user.email);
    if (!isEmailValid) {
      return;
    }

    const isPasswordValid = this._isPasswordValid(this.user.password);
    if (!isPasswordValid) {
      return;
    }

    const result = await this.showModal();
    if (result.hasCanceled) {
      return;
    }
    if (!result.hasAgreed) {
      return alert({
        title: this._translateService.instant('user.accept.accept-error.title'),
        message: this._translateService.instant(
          'user.accept.accept-error.message'
        ),
        okButtonText: this.ok
      });
    }

    // trim all the strings on user object
    this.user.first_name = this.user.first_name.trim();
    this.user.last_name = this.user.last_name.trim();
    this.user.email = this.user.email.trim();
    this.user.password = this.user.password.trim();
    this.user.phone_number = this.user.phone_number.trim();
    this.user.username = this.user.email.toLowerCase().trim();

    // TODO: need to show privacy / user agreement forms here - the
    //       user cannot create the account without reading and
    //       agreeing to both!

    this._progressService.show(
      this._translateService.instant('user.account-creating')
    );

    this._logService.logBreadCrumb(
      SignUpComponent.LOG_TAG +
        `onSubmitTap() creating new account: ${JSON.stringify(this.user)}`
    );

    // need to make sure the username is not already taken
    KinveyUser.exists(this.user.username)
      .then(async res => {
        this._logService.logBreadCrumb(
          SignUpComponent.LOG_TAG + `KinveyUser.exists() res: ${res}`
        );

        // if username is taken tell user and exit so they can correct
        if (res === true) {
          new Toasty({
            text: this._translateService.instant('sign-up.user-exists'),
            duration: ToastDuration.SHORT,
            position: ToastPosition.CENTER
          }).show();
          this._progressService.hide();
          return;
        }

        // now create the account
        try {
          const user = await KinveyUser.signup(this.user);
          this._progressService.hide();
          alert({
            title: this._translateService.instant('user.success'),
            message:
              this._translateService.instant('user.sign-up-success') +
              ` ${user.email}`,
            okButtonText: this.ok
          }).then(() => {
            this._router.navigate(['/home'], { clearHistory: true });
          });
        } catch (err) {
          console.log('ERR', err);
          this._progressService.hide();
          this._logService.logException(err);
          alert({
            title: this._translateService.instant('user.error'),
            message: this._translateService.instant('user.sign-up-error') + err,
            okButtonText: this.ok
          });
        }
      })
      .catch(err => {
        this._progressService.hide();
        this._logService.logException(err);
        alert({
          title: this._translateService.instant('user.error'),
          message: this._translateService.instant('user.sign-up-error') + err,
          okButtonText: this.ok
        });
      });
  }

  onReturnPress(args) {
    // nothing
  }

  onEmailTextChange(args) {
    this.user.email = args.value;
    this._isEmailValid(this.user.email);
  }

  navToLogin() {
    this._router.navigate(['/login'], {
      transition: {
        name: 'slideRight'
      }
    });
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

    // check if it's a permobil email and set the flag indicating so
    const emailRegEx = /@permobil.com$/i;
    const isPermobilEmail = emailRegEx.test(email);
    if (isPermobilEmail) {
      // if we have permobil email set true for checking during other events
      this._isPermobilEmailSigningUp = true;
    } else {
      if (this.user.type === UserTypes.Representative) {
        this.emailError = this._translateService.instant(
          'sign-up.not-permobil-email-error'
        );
        return false;
      }
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

  private _isFirstNameValid(text: string): boolean {
    // validate the password
    if (!text) {
      this.firstNameError = this._translateService.instant(
        'user.first-name-error'
      );
      return false;
    }
    this.firstNameError = '';
    return true;
  }

  private _isLastNameValid(text: string): boolean {
    // validate the password
    if (!text) {
      this.lastNameError = this._translateService.instant(
        'user.last-name-error'
      );
      return false;
    }
    this.lastNameError = '';
    return true;
  }
}
