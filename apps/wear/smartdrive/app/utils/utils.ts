import * as application from '@nativescript/core/application';
import { screen } from '@nativescript/core/platform';
import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { hasPermission } from 'nativescript-permissions';
import { WearOsLayout } from 'nativescript-wear-os';

declare const com: any;

export function isNetworkAvailable(minBandwidthKbps?: number) {
  let isAvailable = false;
  const networkManager = application.android.context.getSystemService(
    android.content.Context.CONNECTIVITY_SERVICE
  );
  const activeNetwork = networkManager.getActiveNetwork();
  const networkInfo = networkManager.getNetworkInfo(activeNetwork);
  isAvailable = networkInfo !== null && networkInfo.isConnected();
  if (minBandwidthKbps) {
    const wifiManager = application.android.context.getSystemService(
      android.content.Context.WIFI_SERVICE
    );
    const wifiInfo = wifiManager.getConnectionInfo();
    const currentNetworkSpeedMbps = wifiInfo.getLinkSpeed();
    isAvailable =
      isAvailable && currentNetworkSpeedMbps * 1024 >= minBandwidthKbps;
    /* keeping this here in case we decide to move back to it
    const networkCapabilities = networkManager.getNetworkCapabilities(activeNetwork);
    const downloadKbps = networkCapabilities.getLinkDownstreamBandwidthKbps();
    console.log('signalStrength', networkCapabilities.getSignalStrength());
    console.log('uploadKbps', networkCapabilities.getLinkUpstreamBandwidthKbps());
    console.log('downloadKbps', downloadKbps);
    isAvailable = isAvailable && downloadKbps >= minBandwidthKbps;
    */
  }
  return isAvailable;
}

/**
 * Get the network info.
 *
 * @param context The Context.
 * @return The active NetworkInfo.
 */
export function getActiveNetworkInfo(
  context: android.content.Context
): android.net.NetworkInfo {
  let networkInfo = null;
  const cm = context.getSystemService(
    android.content.Context.CONNECTIVITY_SERVICE
  );
  if (cm != null) {
    const activeNetwork = cm.getActiveNetwork();
    networkInfo = cm.getNetworkInfo(activeNetwork);
  }
  return networkInfo;
}

/**
 * Get active network.
 *
 * @param context The Context.
 * @return The active NetworkInfo.
 */
export function getActiveNetwork(
  context: android.content.Context
): android.net.Network {
  let networkInfo = null;
  const cm = context.getSystemService(
    android.content.Context.CONNECTIVITY_SERVICE
  ) as android.net.ConnectivityManager;
  if (cm !== null) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
      networkInfo = cm.getActiveNetwork();
    }
  }
  return networkInfo;
}

/**
 * Check if there is any connectivity at all to a specific network.
 *
 * @param context The Context.
 * @return @code{true} if we are connected to a network, false otherwise.
 */
export function isActiveNetworkConnected(
  context: android.content.Context
): boolean {
  let isConnected = false;
  if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
    const connectivityManager = context.getSystemService(
      android.content.Context.CONNECTIVITY_SERVICE
    ) as android.net.ConnectivityManager;
    const network = getActiveNetwork(context) as android.net.Network;
    if (network != null) {
      const networkCapabilities = connectivityManager.getNetworkCapabilities(
        network
      ) as android.net.NetworkCapabilities;
      if (networkCapabilities != null) {
        if (
          networkCapabilities.hasCapability(
            android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET
          )
        ) {
          isConnected = true;
        }
      }
    }
  } else {
    const info = getActiveNetworkInfo(context) as android.net.NetworkInfo;
    // Works on emulator and devices.
    // Note the use of isAvailable() - without this, isConnected() can
    // return true when Wifi is disabled.
    // http://stackoverflow.com/a/2937915
    isConnected = info !== null && info.isAvailable() && info.isConnected();
  }
  return isConnected;
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

/**************************************************************************************
 * Original code:
 *  (c) 2016, Vladimir Enchev
 *
 * Maintained code:
 *   (c) 2019, nStudio, llc
 *
 * Licensed under the Apache license
 *
 * Any questions please feel free to put a issue up on github
 * nanderson@nstudio.io
 * Version 1.0.0 - Android
 *************************************************************************************/

/* global require */

const appModule = require('@nativescript/core/application');

let result;

exports.show = function(options) {
  return new Promise(function(resolve, reject) {
    try {
      if (options) {
        const context = exports.getContext();
        const alert = new android.app.AlertDialog.Builder(context);

        if (options.message) {
          alert.setMessage(options.message);
        }

        if (options.title) {
          alert.setTitle(options.title);
        }

        if (options.nativeView instanceof android.view.View) {
          alert.setView(options.nativeView);
        }

        if (options.cancelButtonText) {
          alert.setNegativeButton(
            options.cancelButtonText,
            new android.content.DialogInterface.OnClickListener({
              onClick: function(dialog, id) {
                dialog.cancel();
                resolve(false);
              }
            })
          );
        }

        if (options.neutralButtonText) {
          alert.setNeutralButton(
            options.neutralButtonText,
            new android.content.DialogInterface.OnClickListener({
              onClick: function(dialog, id) {
                dialog.cancel();
                resolve(undefined);
              }
            })
          );
        }

        if (options.okButtonText) {
          alert.setPositiveButton(
            options.okButtonText,
            new android.content.DialogInterface.OnClickListener({
              onClick: function(dialog, id) {
                dialog.cancel();
                resolve(true);
              }
            })
          );
        }

        result = { resolve: resolve, dialog: alert.show() };
      }
    } catch (ex) {
      reject(ex);
    }
  });
};

exports.close = function() {
  if (result) {
    if (result.dialog instanceof android.app.AlertDialog) {
      result.dialog.cancel();
    }

    if (result.resolve instanceof Function) {
      result.resolve(true);
    }
    result = null;
  }
};

/**
 * getContext
 * The activity must be the Foreground or start activity; not the application context...
 */
exports.getContext = function() {
  if (appModule.android.foregroundActivity) {
    return appModule.android.foregroundActivity;
  }
  if (appModule.android.startActivity) {
    return appModule.android.startActivity;
  }
  /** for older versions of TNS **/
  if (appModule.android.currentContext) {
    return appModule.android.currentContext;
  }
};
