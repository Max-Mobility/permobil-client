import { EventData, Observable, Page, ShowModalOptions } from '@nativescript/core';
import * as application from '@nativescript/core/application';
import * as appSettings from '@nativescript/core/application-settings';
import { alert } from '@nativescript/core/ui/dialogs';
import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { Log } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import * as LS from 'nativescript-localstorage';
import { DataKeys } from '../../../enums';
import { Profile } from '../../../namespaces';
import { KinveyService } from '../../../services';
import { sentryBreadCrumb } from '../../../utils';

declare const com: any;

export class ChangeSettingsViewModel extends Observable {
  @Prop() activeSettingToChange;
  @Prop() changeSettingKeyString;
  @Prop() changeSettingKeyValue;

  // for showing busy status
  private _synchronizingModal: string =
    'pages/modals/synchronizing/synchronizing';
  private _synchronizingView;

  private _showingModal: boolean = false;

  private _disableWearCheck = false;
  private _closeCallback;
  private _hasSentSettings = false;
  private _settings = new Profile.Settings();

  constructor(
    private _mainPage: Page,
    private _kinveyService: KinveyService,
    data
  ) {
    super();
    this.loadSettings();

    this.activeSettingToChange = data.activeSettingToChange;
    this.changeSettingKeyString = data.changeSettingKeyString;
    this.changeSettingKeyValue = data.changeSettingKeyValue;
    this._closeCallback = data.closeCallback;

    this.updateSettingsChangeDisplay();
  }

  onDecreaseSettingsTap() {
    this._settings.decrease(this.activeSettingToChange);
    if (this.activeSettingToChange === 'watchrequired') {
      this._disableWearCheck = !this._disableWearCheck;
    }
    this.updateSettingsChangeDisplay();
  }

  onIncreaseSettingsTap() {
    this._settings.increase(this.activeSettingToChange);
    if (this.activeSettingToChange === 'watchrequired') {
      this._disableWearCheck = !this._disableWearCheck;
    }
    this.updateSettingsChangeDisplay();
  }

  onConfirmChangesTap() {
    // SAVE THE VALUE to local data for the setting user has selected
    this.saveSettings();
    this.sendSettings();
    //   // now update any display that needs settings:
    //   updateDisplay();

    this._closeCallback();
  }

  onSettingsInfoItemTap(args: EventData) {
    const messageKey = `settings.${this.activeSettingToChange}.description`;
    const message = `${this.changeSettingKeyString}:\n\n${L(messageKey)}`;
    alert({
      title: L('settings.information'),
      message,
      okButtonText: L('buttons.ok')
    });
  }

  private loadSettings() {
    const savedSettings = LS.getItem(
      'com.permobil.pushtracker.profile.settings'
    );
    this._settings.copy(savedSettings);
    this._hasSentSettings =
      appSettings.getBoolean(DataKeys.PROFILE_SETTINGS_DIRTY_FLAG) || false;

    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = androidUtils
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0);
    this._disableWearCheck = sharedPreferences.getBoolean(
      prefix + com.permobil.pushtracker.Datastore.DISABLE_WEAR_CHECK_KEY,
      false
    );
  }

  private updateSettingsChangeDisplay() {
    let translationKey = '';
    let value = null;
    switch (this.activeSettingToChange) {
      case 'coastgoal':
        this.changeSettingKeyValue =
          this._settings.coastGoal.toFixed(1) +
          ' ' +
          L('settings.coastgoal.units');
        break;
      case 'distancegoal':
        value = this._settings.distanceGoal;
        if (this._settings.units === 'metric') {
          value *= 1.609;
        }
        this.changeSettingKeyValue = value.toFixed(1) + ' ';
        translationKey = 'settings.distancegoal.units.' + this._settings.units;
        this.changeSettingKeyValue += L(translationKey);
        break;
      case 'height':
        this.changeSettingKeyValue = this._settings.getHeightDisplay();
        break;
      case 'units':
        translationKey =
          'settings.units.values.' + this._settings.units.toLowerCase();
        this.changeSettingKeyValue = L(translationKey);
        return;
      case 'weight':
        value = this._settings.weight;
        if (this._settings.units === 'english') {
          value *= 2.20462;
        }
        this.changeSettingKeyValue = Math.round(value) + ' ';
        translationKey = 'settings.weight.units.' + this._settings.units;
        this.changeSettingKeyValue += L(translationKey);
        break;
      case 'watchrequired':
        if (this._disableWearCheck) {
          this.changeSettingKeyValue = L(
            'settings.watchrequired.values.disabled'
          );
        } else {
          this.changeSettingKeyValue = L(
            'settings.watchrequired.values.enabled'
          );
        }
        break;
      default:
        break;
    }
  }

  private saveSettings() {
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = androidUtils
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0) as android.content.SharedPreferences;
    const editor = sharedPreferences.edit() as android.content.SharedPreferences.Editor;
    editor.putBoolean(
      prefix + com.permobil.pushtracker.Datastore.DISABLE_WEAR_CHECK_KEY,
      this._disableWearCheck
    );
    editor.apply();
    appSettings.setBoolean(DataKeys.PROFILE_SETTINGS_DIRTY_FLAG, false);
    LS.setItemObject(
      'com.permobil.pushtracker.profile.settings',
      this._settings.toObj()
    );
  }

  showSynchronizing() {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing synchronizing');
      return;
    }
    const option: ShowModalOptions = {
      context: {},
      closeCallback: () => {
        this._showingModal = false;
        // we dont do anything with the about to return anything
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    this._synchronizingView = this._mainPage.showModal(
      this._synchronizingModal,
      option
    );
  }

  hideSynchronizing() {
    this._synchronizingView.closeModal();
    this._showingModal = false;
  }

  private async sendSettings() {
    console.time('sendSettings');

    // make sure kinvey service is initialized
    if (this._kinveyService === undefined) {
      alert({
        title: L('failures.title'),
        message: L('failures.not-fully-initialized'),
        okButtonText: L('buttons.ok')
      });
      return;
    }
    // make sure the kinvey service has authentication (or get it)
    if (!this._kinveyService.hasAuth()) {
      const validAuth = await this.updateAuthorization();
      if (!validAuth) {
        alert({
          title: L('failures.title'),
          message: L('failures.no-auth-for-saving'),
          okButtonText: L('buttons.ok')
        });
        return;
      }
    }
    try {
      this.showSynchronizing();
      // TODO: waiting on the resolution of this to not have to get
      // the user data again
      // https://support.kinvey.com/support/tickets/6897
      Log.D('requesting user data');
      // now request user data
      const userData = (await this._kinveyService.getUserData()) as any;
      const values = this._settings.toUser();
      Object.keys(values).map(k => {
        userData[k] = values[k];
      });
      // don't want to do anything to these
      delete userData._acl;
      delete userData._kmd;

      await this._kinveyService.updateUser(userData);
      this.hideSynchronizing();
      this.showConfirmation(
        android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
      );
    } catch (err) {
      this.hideSynchronizing();
      Log.E('could not save to database:', err);
      alert({
        title: L('failures.title'),
        message: L('failures.could-not-update-profile') + `:\n\n${err}`,
        okButtonText: L('buttons.ok')
      });
    }

    console.timeEnd('sendSettings');
  }

  /**
   * END FOR COMMUNICATIONS WITH PHONE
   */

  private async showConfirmation(animationType: number, message?: string) {
    const intent = new android.content.Intent(
      androidUtils.getApplicationContext(),
      android.support.wearable.activity.ConfirmationActivity.class
    );
    intent.putExtra(
      android.support.wearable.activity.ConfirmationActivity
        .EXTRA_ANIMATION_TYPE,
      animationType
    );
    if (message !== undefined) {
      intent.putExtra(
        android.support.wearable.activity.ConfirmationActivity.EXTRA_MESSAGE,
        message
      );
    }
    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NO_ANIMATION);
    application.android.foregroundActivity.startActivity(intent);
    application.android.foregroundActivity.overridePendingTransition(0, 0);
  }

  /**
   * Network Functions
   */
  private async updateAuthorization() {
    // check the content provider here to see if the user has
    // sync-ed up with the pushtracker mobile app
    let authorization = null;
    let userId = null;
    const prefix = com.permobil.pushtracker.Datastore.PREFIX;
    const sharedPreferences = androidUtils
      .getApplicationContext()
      .getSharedPreferences('prefs.db', 0) as android.content.SharedPreferences;

    const savedToken = sharedPreferences.getString(
      prefix + com.permobil.pushtracker.Datastore.AUTHORIZATION_KEY,
      ''
    );
    const savedUserId = sharedPreferences.getString(
      prefix + com.permobil.pushtracker.Datastore.USER_ID_KEY,
      ''
    );
    if (savedToken && savedToken.length && savedUserId && savedUserId.length) {
      authorization = savedToken;
      userId = savedUserId;
    }

    if (authorization === null || userId === null) {
      // if the user has not configured this app with the PushTracker
      // Mobile app
      Log.D('No authorization found in app settings!');
      try {
        const contentResolver = androidUtils
          .getApplicationContext()
          .getContentResolver();
        const authCursor = contentResolver.query(
          com.permobil.pushtracker.DatabaseHandler.AUTHORIZATION_URI,
          null,
          null,
          null,
          null
        );
        if (authCursor && authCursor.moveToFirst()) {
          // there is data
          const token = authCursor.getString(
            com.permobil.pushtracker.DatabaseHandler.DATA_INDEX
          );
          authCursor.close();
          Log.D('Got token:', token);
          if (token !== null && token.length) {
            // we have a valid token
            authorization = token;
          }
        } else {
          Log.E('Could not get authCursor to move to first:', authCursor);
        }
        const idCursor = contentResolver.query(
          com.permobil.pushtracker.DatabaseHandler.USER_ID_URI,
          null,
          null,
          null,
          null
        );
        if (idCursor && idCursor.moveToFirst()) {
          // there is data
          const uid = idCursor.getString(
            com.permobil.pushtracker.DatabaseHandler.DATA_INDEX
          );
          idCursor.close();
          Log.D('Got uid:', uid);
          if (uid !== null && uid.length) {
            // we have a valid token
            userId = uid;
          }
        } else {
          Log.E('Could not get idCursor to move to first:', idCursor);
        }
      } catch (err) {
        Log.E('error getting auth:', err);
      }
    }
    if (authorization === null || userId === null) {
      Log.D('No authorization found in anywhere!');
      return false;
    }
    // now set the authorization and see if it's valid
    const validAuth = await this._kinveyService.setAuth(authorization, userId);
    return validAuth;
  }
}
