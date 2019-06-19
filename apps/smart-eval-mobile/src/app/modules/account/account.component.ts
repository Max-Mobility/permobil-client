import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Demo, DidYouKnow, User, UserTypes } from '@maxmobility/core';
import { DemoService, FileService, LoggingService, UserService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import * as appversion from 'nativescript-appversion';
import * as camera from 'nativescript-camera';
import { SelectedIndexChangedEventData, ValueList } from 'nativescript-drop-down';
import * as email from 'nativescript-email';
import { ImageCropper, Result as ImageCropperResult } from 'nativescript-imagecropper';
import * as LS from 'nativescript-localstorage';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { Subscription } from 'rxjs/Subscription';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import * as http from 'tns-core-modules/http';
import { ImageAsset } from 'tns-core-modules/image-asset/image-asset';
import { fromBase64, ImageSource } from 'tns-core-modules/image-source/image-source';
import { isIOS } from 'tns-core-modules/platform';
import { alert, confirm, prompt } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import * as utils from 'tns-core-modules/utils/utils';
import { APP_KEY, HOST_URL } from '../../utils/kinvey-keys';

@Component({
  selector: 'account',
  moduleId: module.id,
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  private static LOG_TAG = 'account.component ';
  fsKeyPrefix = 'AccountComponent.';
  fsKeyProfilePicture = 'ProfilePicture';
  user: Kinvey.User & { data: User | any };

  /**
   * String to render the current version name and version code (builds).
   */
  appVersionData: string;

  didyouknow = new DidYouKnow();

  isAdminAccount = false;
  canBetaTest = false;

  /**
   * Languages for translation language dropdown
   */
  languages = new ValueList<string>(
    this._translateService.getLangs().map(l => {
      return {
        value: l,
        display: this._translateService.instant('languages.' + l)
      };
    })
  );
  selectedLanguageIndex = 0;
  selectedLanguageFlag = '';
  yes: string = this._translateService.instant('dialogs.yes');
  no: string = this._translateService.instant('dialogs.no');

  usertypes = new ValueList([
    { value: UserTypes.Admin, display: 'Admin' },
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

  private _imageCropper: ImageCropper;
  private _routeSub: Subscription; // subscription to route observer
  private _profileImageKey: string;

  constructor(
    private _userService: UserService,
    private _loggingService: LoggingService,
    private _routerExtensions: RouterExtensions,
    private router: Router,
    private _page: Page,
    private _translateService: TranslateService,
    private _fileService: FileService,
    private _zone: NgZone
  ) {
    this._page.enableSwipeBackNavigation = false;
    this._page.className = 'blue-gradient-down';

    this.user = Kinvey.User.getActiveUser();
    this._imageCropper = new ImageCropper();
    this._profileImageKey =
      this.fsKeyPrefix + this.user._id + '.' + this.fsKeyProfilePicture;

    // configure if they are an admin account
    const adminRegEx = /(william|ben|ken|guo)@max\-mobility.com/i;
    const isAdminEmail = adminRegEx.test(this.user.data.email);
    this.isAdminAccount =
      this.user.data.type === UserTypes.Admin || isAdminEmail;

    // configure if they can opt in for beta testing firmware - only
    // allowed for @permobil.com and @max-mobility.com email
    // addresses
    const emailRegEx = /[^@]+@(permobil.com|max\-mobility.com)/i;
    this.canBetaTest = emailRegEx.test(this.user.data.email);

    this.appVersionData = `${this._translateService.instant(
      'account.version'
    )}: ${appversion.getVersionNameSync()} ${this._translateService.instant(
      'account.build'
    )}: ${appversion.getVersionCodeSync()} \n${this._translateService.instant(
      'account.database'
    )}: ${APP_KEY}`;
  }

  ngOnInit() {
    this._loggingService.logBreadCrumb(AccountComponent.LOG_TAG + 'ngOnInit');

    // load profile picture
    this.loadProfilePicture();

    // set language data
    this.selectedLanguageIndex =
      this.languages.getIndex((this.user.data as any).language) || 0;

    // set language flag
    this.selectedLanguageFlag = this._mapLanguageToFlagAsset(
      this.languages.getValue(this.selectedLanguageIndex)
    );

    // set account type data
    this.selectedUserTypeIndex =
      this.usertypes.getIndex((this.user.data as any).type) || 0;

    // get translation files
    this._fileService.downloadTranslationFiles();
  }

  /**
   * User Type drodown changed
   * @param args
   */
  onUserTypeChanged(args: SelectedIndexChangedEventData) {
    const type = this.usertypes.getValue(args.newIndex) || 0;
    this.user.data.type = type;
  }

  saveProfilePicture(source: ImageSource) {
    try {
      const b64 = source.toBase64String('png');
      LS.setItem(this._profileImageKey, b64);
      const data = this.user.data as User;
      data.profile_picture = source;
    } catch (err) {
      this._loggingService.logException(err);
    }
  }

  loadProfilePicture() {
    try {
      const pic = LS.getItem(this._profileImageKey);
      if (pic) {
        const source = fromBase64(pic);
        (this.user.data as any).profile_picture = source;
      } else {
        (this.user.data as any).profile_picture = undefined;
      }
    } catch (err) {
      this._loggingService.logException(err);
    }
  }

  async onUpdateProfilePictureTap() {
    try {
      const result = await this.takePictureAndCrop();
      if (result && result.image !== null) {
        this.saveProfilePicture(result.image);
      } else {
        this._loggingService.logBreadCrumb(
          'No result returned from the image cropper.'
        );
      }
    } catch (error) {
      this._loggingService.logException(error);
    }
  }

  onLanguageChanged(args) {
    const newLanguage = this.languages.getValue(args.newIndex) || 'en';
    (this.user.data as any).language = newLanguage;
    this._translateService.use(newLanguage);
    // set the image for the language flag
    this.selectedLanguageFlag = this._mapLanguageToFlagAsset(newLanguage);
    // saving language to server because, it makes it look like a bug because the language switches
    // but we don't save the user selected language on backend, so when you come back in, it's using the server value
    // also on the current user object and not what they previously selected.
    // see -https://github.com/PushTracker/EvalApp/issues/324
    this._saveUserToKinvey();
  }

  onDrawerButtonTap() {
    if (this._routerExtensions.canGoBack()) {
      this._routerExtensions.back();
    } else {
      this._routerExtensions.navigate(['/home'], {
        transition: {
          name: 'slideBottom',
          duration: 350,
          curve: 'easeInOut'
        }
      });
    }
  }

  onSaveAccountTap() {
    confirm({
      title: this._translateService.instant('user.account-update'),
      message: this._translateService.instant('user.account-update-confirm'),
      okButtonText: this.yes,
      cancelButtonText: this.no
    }).then(result => {
      if (result) {
        this._saveUserToKinvey()
          .then(resp => {
            this._loggingService.logBreadCrumb(
              AccountComponent.LOG_TAG + `successfully updated profile.`
            );
            new Toasty({
              text: this._translateService.instant(
                'user.account-update-complete'
              ),
              duration: ToastDuration.SHORT,
              position: ToastPosition.CENTER
            }).show();
          })
          .catch(error => {
            this._loggingService.logException(error);
            alert({
              message: this._translateService.instant(
                'user.account-update-error'
              ),
              okButtonText: this._translateService.instant('dialogs.ok')
            });
          });
      }
    });
  }

  onChangePasswordTap() {
    confirm({
      title: this._translateService.instant('user.password-change'),
      message: this._translateService.instant('user.password-change-confirm'),
      okButtonText: this.yes,
      cancelButtonText: this.no
    });
  }

  onResetAccountTap() {
    confirm({
      title: this._translateService.instant('user.account-reset'),
      message: this._translateService.instant('user.account-reset-confirm'),
      okButtonText: this.yes,
      cancelButtonText: this.no
    });
  }

  /**
   * Confirm with user to sign out. If confirmed, sign out, then nav to login.
   */
  async onSignOutTap() {
    try {
      const result = await confirm({
        title: this._translateService.instant('user.sign-out'),
        message: this._translateService.instant('user.sign-out-confirm'),
        okButtonText: this.yes,
        cancelButtonText: this.no
      });
      if (result) {
        this._loggingService.logBreadCrumb(
          AccountComponent.LOG_TAG + `successfully signed out.`
        );

        DemoService.Demos = new ObservableArray<Demo>([]); // empty the current items

        this._zone.run(async () => {
          // go ahead and nav to login to keep UI moving without waiting
          this._routerExtensions.navigate(['/login'], {
            clearHistory: true
          });

          const logoutResult = await this._userService.logout();
        });
      }
    } catch (error) {
      // calling logout here manually incase something goes wrong ^^^
      Kinvey.User.logout();
      this._loggingService.logException(error);
    }
  }

  /**
   * Confirm with user to provide feedback.
   */
  async onFeedbackTap() {
    const confirmResult = await confirm({
      title: this._translateService.instant(
        'user.provide-feedback-confirm-title'
      ),
      message: this._translateService.instant(
        'user.provide-feedback-confirm-message'
      ),
      okButtonText: this.yes,
      cancelButtonText: this.no
    }).catch(e => {
      this._loggingService.logException(e);
    });

    if (confirmResult === false) {
      // user denied the confirmation
      return;
    }

    // check if device has email available
    const canEmail = await email.available().catch(e => {
      this._loggingService.logException(e);
    });

    if (!canEmail) {
      // email is available on device
      return;
    }

    email
      .compose({
        to: ['Feedback.SmartDrive@permobil.com'],
        subject: this._translateService.instant('user.feedback-email-subject'),
        body: '',
        cc: []
      })
      .then(result => {
        if (result) {
          // do nothing
        }
      })
      .catch(e => {
        this._loggingService.logException(e);
      });
  }

  onDebugMenuTap() {
    this._routerExtensions.navigate(['/settings']);
  }

  /**
   * Submits the value in the textview (didyouknow data value) to Kinvey endpoint
   * which sends out a push notification to users.
   */
  async submitDidYouKnow() {
    // prompt for the private key to make sure before sending
    const result = await prompt({
      message: 'Enter the private key?',
      cancelable: true,
      okButtonText: 'Enter',
      cancelButtonText: 'Cancel'
    });

    // if prompt text is empty just return
    if (!result.text) {
      return;
    }

    try {
      await Kinvey.DataStore.collection('DidYouKnow').save({
        all_users: this.didyouknow.all_users,
        creator_id: this._userService.user._id,
        text: this.didyouknow.text
      });

      // use the authtoken that is returned during a login for the endpoint auth
      const token = (this._userService.user._kmd as any).authtoken;
      const response = await http.request({
        method: 'POST',
        url: `${HOST_URL}/rpc/${APP_KEY}/custom/didyouknow`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Kinvey ${token}`
        },
        content: JSON.stringify({
          key: result.text,
          text: this.didyouknow.text,
          all_users: this.didyouknow.all_users
        })
      });

      // if error show alert with error from Kinvey endpoint
      if (response.statusCode !== 200) {
        this._loggingService.logException(
          new Error(response.content.toString())
        );
        const message = response.content.toJSON().debug
          ? `${response.content.toJSON().debug}`
          : 'Error sending data.';
        alert({
          message,
          okButtonText: 'Okay'
        });
      } else {
        alert({
          message: 'Request successful to save Did You Know',
          okButtonText: 'Okay'
        });
      }
    } catch (error) {
      this._loggingService.logException(error);
      alert(error);
    }
  }

  private takePictureAndCrop() {
    try {
      // check if device has camera
      if (!camera.isAvailable()) {
        return null;
      }

      // request camera permissions
      return camera
        .requestPermissions()
        .then(
          async () => {
            const imageAsset = (await camera.takePicture({
              width: 500,
              height: 500,
              keepAspectRatio: true,
              cameraFacing: 'front'
            })) as ImageAsset;

            const source = new ImageSource();

            const iSrc = await source.fromAsset(imageAsset);

            const result = (await this._imageCropper.show(iSrc, {
              width: 256,
              height: 256,
              lockSquare: true
            })) as ImageCropperResult;

            return result;
          },
          async error => {
            this._loggingService.logMessage(
              `Permission denied for camera ${error}`
            );
            if (isIOS) {
              confirm({
                title: this._translateService.instant(
                  'general.camera-permission'
                ),
                message: this._translateService.instant(
                  'general.no-camera-permission-ios-confirm'
                ),
                okButtonText: this._translateService.instant('dialogs.yes'),
                cancelButtonText: this._translateService.instant(
                  'dialogs.cancel'
                )
              }).then(result => {
                if (result) {
                  utils.ios
                    .getter(UIApplication, UIApplication.sharedApplication)
                    .openURL(
                      NSURL.URLWithString(UIApplicationOpenSettingsURLString)
                    );
                }
              });
            } else {
              alert({
                title: this._translateService.instant(
                  'general.camera-permission'
                ),
                message: this._translateService.instant(
                  'general.no-camera-permission-android'
                ),
                okButtonText: this._translateService.instant('dialogs.ok')
              });
            }

            return null;
          }
        )
        .catch(error => {
          // this should only happen if the user cancels the image capture
          return null;
        });
    } catch (error) {
      this._loggingService.logException(error);
      return null;
    }
  }

  private _saveUserToKinvey() {
    if (this.user.data) {
      const data = this.user.data;
      return this.user
        .update({
          email: data.email,
          language: data.language,
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          type: data.type
        })
        .catch(err => {
          this._loggingService.logException(err);
        });
    } else {
      return Promise.resolve();
    }
  }

  private _mapLanguageToFlagAsset(language: string) {
    switch (language) {
      case 'en':
        return '~/assets/images/flags/usa-flag.png';
      case 'es':
        return '~/assets/images/flags/spain-flag.png';
      case 'de':
        return '~/assets/images/flags/germany-flag.png';
      case 'fr':
        return '~/assets/images/flags/france-flag.png';
      case 'nl':
        return '~/assets/images/flags/netherlands-flag.png';
    }
  }
}
