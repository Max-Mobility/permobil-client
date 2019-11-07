import * as application from '@nativescript/core/application';
import { screen } from '@nativescript/core/platform';
import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { hasPermission } from 'nativescript-permissions';
import { WearOsLayout } from 'nativescript-wear-os';

declare const com: any;

export function isNetworkAvailable() {
  let isAvailable = false;
  const networkManager = application.android.context.getSystemService(
    android.content.Context.CONNECTIVITY_SERVICE
  );
  const networkInfo = networkManager.getActiveNetworkInfo();
  isAvailable = networkInfo !== null && networkInfo.isConnected();
  return isAvailable;
}

export function getSerialNumber() {
  if (!hasPermission(android.Manifest.permission.READ_PHONE_STATE)) return null;
  return android.os.Build.getSerial();
}

export function saveSerialNumber(sn: string) {
  // save it to datastore for service to use
  const prefix = com.permobil.pushtracker.Datastore.PREFIX;
  const sharedPreferences = androidUtils
    .getApplicationContext()
    .getSharedPreferences('prefs.db', 0);
  const editor = sharedPreferences.edit();
  editor.putString(
    prefix + com.permobil.pushtracker.Datastore.WATCH_SERIAL_NUMBER_KEY,
    sn
  );
  editor.commit();
}

export function loadSerialNumber() {
  const prefix = com.permobil.pushtracker.Datastore.PREFIX;
  const sharedPreferences = androidUtils
    .getApplicationContext()
    .getSharedPreferences('prefs.db', 0);
  const savedSerial = sharedPreferences.getString(
    prefix + com.permobil.pushtracker.Datastore.WATCH_SERIAL_NUMBER_KEY,
    ''
  );
  return savedSerial;
}

export function configureLayout(layout: WearOsLayout) {
  let insetPadding = 0;
  let chinSize = 0;

  // determine inset padding
  const androidConfig = androidUtils
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = screen.mainScreen.widthPixels;
  const screenHeight = screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      chinSize = screenWidth - screenHeight;
    }
  }

  return {
    insetPadding,
    chinSize
  };
}
