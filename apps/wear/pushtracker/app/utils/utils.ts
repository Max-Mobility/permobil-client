import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { Log } from '@permobil/core';
import { hasPermission } from 'nativescript-permissions';
import * as themes from 'nativescript-themes';
import { sentryBreadCrumb } from '.';

declare const com: any;

const ambientTheme = require('../scss/theme-ambient.scss').toString();
const defaultTheme = require('../scss/theme-default.scss').toString();
const retroTheme = require('../scss/theme-retro.scss').toString();

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

export function applyTheme(theme?: string) {
  // apply theme
  sentryBreadCrumb('applying theme');
  // hasAppliedTheme = true;
  try {
    // if (theme === 'ambient' || this.isAmbient) {
    if (theme === 'ambient') {
      themes.applyThemeCss(ambientTheme, 'theme-ambient.scss');
    } else {
      themes.applyThemeCss(defaultTheme, 'theme-default.scss');
    }
  } catch (err) {
    // Sentry.captureException(err);
    Log.E('apply theme error:', err);
  }
  sentryBreadCrumb('theme applied');
}
