import { View } from 'tns-core-modules/ui/core/view';
import { ad } from 'tns-core-modules/utils/utils';
import { hasPermission } from 'nativescript-permissions';

declare const com: any;

export function getSerialNumber() {
  if (!hasPermission(android.Manifest.permission.READ_PHONE_STATE))
    return null;
  return android.os.Build.getSerial();
}

export function saveSerialNumber(sn: string) {
  // save it to datastore for service to use
  const prefix = com.permobil.pushtracker.Datastore.PREFIX;
  const sharedPreferences = ad
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
  const sharedPreferences = ad
    .getApplicationContext()
    .getSharedPreferences('prefs.db', 0);
  const savedSerial = sharedPreferences.getString(
    prefix + com.permobil.pushtracker.Datastore.WATCH_SERIAL_NUMBER_KEY,
    ''
  );
  return savedSerial;
}

export function hideOffScreenLayout(
  view: View,
  position: { x: number; y: number }
) {
  return new Promise((resolve, reject) => {
    if (view) {
      view.visibility = 'collapse';
      view
        .animate({
          target: view,
          duration: 300,
          translate: {
            x: position.x,
            y: position.y
          }
        })
        .then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

export function showOffScreenLayout(view: View) {
  return new Promise((resolve, reject) => {
    if (view) {
      view.visibility = 'visible';
      view
        .animate({
          target: view,
          duration: 300,
          translate: {
            x: 0,
            y: 0
          }
        })
        .then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}
