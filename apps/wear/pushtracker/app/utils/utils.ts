import { Utils } from '@nativescript/core';
import { hasPermission } from 'nativescript-permissions';

declare const com: any;

export function getSerialNumber() {
  if (!hasPermission(android.Manifest.permission.READ_PHONE_STATE)) return null;
  return (android.os.Build as any).getSerial();
}

export function saveSerialNumber(sn: string) {
  // save it to datastore for service to use
  const prefix = com.permobil.pushtracker.Datastore.PREFIX;
  const sharedPreferences = Utils.android
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
  const sharedPreferences = Utils.android
    .getApplicationContext()
    .getSharedPreferences('prefs.db', 0);
  const savedSerial = sharedPreferences.getString(
    prefix + com.permobil.pushtracker.Datastore.WATCH_SERIAL_NUMBER_KEY,
    ''
  );
  return savedSerial;
}
