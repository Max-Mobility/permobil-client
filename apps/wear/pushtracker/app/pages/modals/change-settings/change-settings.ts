import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';
import * as LS from 'nativescript-localstorage';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { EventData, fromObject } from 'tns-core-modules/data/observable';
import { alert } from 'tns-core-modules/ui/dialogs';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { DataKeys } from '../../../enums';
import { Profile } from '../../../namespaces';
import { KinveyService } from '../../../services';

declare const com: any;

let closeCallback;
let page: Page;
let kinveyService: KinveyService;
const tempSettings: Profile.Settings = new Profile.Settings();
const settings: Profile.Settings = new Profile.Settings();
let hasSentSettings;
let disableWearCheck;
let isBusy: boolean = false;
const busyText: string = L('busy.synchronizing');

// values for UI databinding via bindingContext
const data = {
  activeSettingToChange: '',
  changeSettingKeyString: '',
  changeSettingKeyValue: '',
  disableWearCheck: false
};

// Closes the modal
export function onCloseTap() {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('change-settings onShownModally');
  page = args.object as Page;
  // get the values sent in the modal context
  kinveyService = args.context.kinveyService as KinveyService;
  data.activeSettingToChange = args.context.activeSettingToChange;
  data.changeSettingKeyString = args.context.changeSettingKeyString;
  data.changeSettingKeyValue = args.context.changeSettingKeyValue;
  data.disableWearCheck = args.context.disableWearCheck;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  Log.D('change-settings data', data);
  page.bindingContext = fromObject(data);
}

export function onDecreaseSettingsTap() {
  console.log(data.activeSettingToChange);

  tempSettings.decrease(data.activeSettingToChange);
  if (data.activeSettingToChange === 'watchrequired') {
    disableWearCheck = !disableWearCheck;
  }
  updateSettingsChangeDisplay();
}

export function onIncreaseSettingsTap() {
  console.log(data.activeSettingToChange);

  tempSettings.increase(data.activeSettingToChange);
  if (data.activeSettingToChange === 'watchrequired') {
    disableWearCheck = !disableWearCheck;
  }
  updateSettingsChangeDisplay();
}

export function onCancelChangesTap() {
  Log.D('cancel changes and close the modal');
  closeCallback(); // this will close the modal when user cancels
  //   hideOffScreenLayout(changeSettingsLayout, { x: 500, y: 0 });
  //   previousLayout();
}

export function onConfirmChangesTap() {
  Log.D(
    'user confirmed changes, need to save the value and then close the modal'
  );

  // SAVE THE VALUE to local data for the setting user has selected
  settings.copy(tempSettings);
  saveSettings();
  sendSettings();
  //   // now update any display that needs settings:
  //   updateDisplay();

  closeCallback();
}

export function onSettingsInfoItemTap(args: EventData) {
  const messageKey = `settings.${data.activeSettingToChange}.description`;
  const message = `${data.changeSettingKeyString}:\n\n${L(messageKey)}`;
  alert({
    title: L('settings.information'),
    message,
    okButtonText: L('buttons.ok')
  });
}

function loadSettings() {
  settings.copy(LS.getItem('com.permobil.pushtracker.profile.settings'));
  hasSentSettings =
    appSettings.getBoolean(DataKeys.PROFILE_SETTINGS_DIRTY_FLAG) || false;

  const prefix = com.permobil.pushtracker.Datastore.PREFIX;
  const sharedPreferences = androidUtils
    .getApplicationContext()
    .getSharedPreferences('prefs.db', 0);
  disableWearCheck = sharedPreferences.getBoolean(
    prefix + com.permobil.pushtracker.Datastore.DISABLE_WEAR_CHECK_KEY,
    false
  );
}

function updateSettingsChangeDisplay() {
  let translationKey = '';
  let value = null;
  switch (data.activeSettingToChange) {
    case 'coastgoal':
      data.changeSettingKeyValue =
        tempSettings.coastGoal.toFixed(1) + ' ' + L('settings.coastgoal.units');
      break;
    case 'distancegoal':
      value = tempSettings.distanceGoal;
      if (tempSettings.units === 'metric') {
        value *= 1.609;
      }
      data.changeSettingKeyValue = value.toFixed(1) + ' ';
      translationKey = 'settings.distancegoal.units.' + tempSettings.units;
      data.changeSettingKeyValue += L(translationKey);
      break;
    case 'height':
      data.changeSettingKeyValue = tempSettings.getHeightDisplay();
      break;
    case 'units':
      translationKey =
        'settings.units.values.' + tempSettings.units.toLowerCase();
      data.changeSettingKeyValue = L(translationKey);
      return;
    case 'weight':
      value = tempSettings.weight;
      if (tempSettings.units === 'english') {
        value *= 2.20462;
      }
      data.changeSettingKeyValue = Math.round(value) + ' ';
      translationKey = 'settings.weight.units.' + tempSettings.units;
      data.changeSettingKeyValue += L(translationKey);
      break;
    case 'watchrequired':
      if (disableWearCheck) {
        data.changeSettingKeyValue = L(
          'settings.watchrequired.values.disabled'
        );
      } else {
        data.changeSettingKeyValue = L('settings.watchrequired.values.enabled');
      }
      break;
    default:
      break;
  }
}

function saveSettings() {
  const prefix = com.permobil.pushtracker.Datastore.PREFIX;
  const sharedPreferences = androidUtils
    .getApplicationContext()
    .getSharedPreferences('prefs.db', 0) as android.content.SharedPreferences;
  const editor = sharedPreferences.edit() as android.content.SharedPreferences.Editor;
  editor.putBoolean(
    prefix + com.permobil.pushtracker.Datastore.DISABLE_WEAR_CHECK_KEY,
    disableWearCheck
  );
  editor.apply();
  appSettings.setBoolean(DataKeys.PROFILE_SETTINGS_DIRTY_FLAG, hasSentSettings);
  LS.setItemObject(
    'com.permobil.pushtracker.profile.settings',
    settings.toObj()
  );
}

async function sendSettings() {
  // make sure kinvey service is initialized
  if (kinveyService === undefined) {
    alert({
      title: L('failures.title'),
      message: L('failures.not-fully-initialized'),
      okButtonText: L('buttons.ok')
    });
    /*
   showConfirmation(
     android.support.wearable.activity.ConfirmationActivity.FAILURE_ANIMATION,
     L('failures.not-fully-initialized')
   );
   */
    return;
  }
  // make sure the kinvey service has authentication (or get it)
  if (!kinveyService.hasAuth()) {
    const validAuth = await updateAuthorization();
    if (!validAuth) {
      alert({
        title: L('failures.title'),
        message: L('failures.not-connected-to-mobile'),
        okButtonText: L('buttons.ok')
      });
      /*
     showConfirmation(
       android.support.wearable.activity.ConfirmationActivity.FAILURE_ANIMATION,
       L('failures.not-connected-to-mobile')
     );
     */
      return;
    }
  }
  try {
    isBusy = true;
    // TODO: waiting on the resolution of this to not have to get
    // the user data again
    // https://support.kinvey.com/support/tickets/6897
    Log.D('requesting user data');
    // now request user data
    const userData = (await kinveyService.getUserData()) as any;
    const values = settings.toUser();
    Object.keys(values).map(k => {
      userData[k] = values[k];
    });
    // don't want to do anything to these
    delete userData._acl;
    delete userData._kmd;

    const response = await kinveyService.updateUser(userData);
    const statusCode = response && response.statusCode;
    if (statusCode !== 200) {
      throw response;
    }
    isBusy = false;
    showConfirmation(
      android.support.wearable.activity.ConfirmationActivity.SUCCESS_ANIMATION
    );
  } catch (err) {
    isBusy = false;
    Log.E('could not save to database:', err);
    alert({
      title: L('failures.title'),
      message: L('failures.could-not-update-profile') + `:\n\n${err}`,
      okButtonText: L('buttons.ok')
    });
    /*
   showConfirmation(
     android.support.wearable.activity.ConfirmationActivity.FAILURE_ANIMATION,
     L('failures.could-not-update-profile') + `: ${err}`
   );
   */
  }
}

/**
 * END FOR COMMUNICATIONS WITH PHONE
 */

async function showConfirmation(animationType: number, message?: string) {
  const intent = new android.content.Intent(
    androidUtils.getApplicationContext(),
    android.support.wearable.activity.ConfirmationActivity.class
  );
  intent.putExtra(
    android.support.wearable.activity.ConfirmationActivity.EXTRA_ANIMATION_TYPE,
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
async function updateAuthorization() {
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
  const validAuth = await this.kinveyService.setAuth(authorization, userId);
  return validAuth;
}
