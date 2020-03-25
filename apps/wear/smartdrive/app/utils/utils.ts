import * as application from '@nativescript/core/application';
import { screen } from '@nativescript/core/platform';
import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { hasPermission } from 'nativescript-permissions';
import { WearOsLayout } from 'nativescript-wear-os';

declare const com: any;

export function _isActivityThis(activity: any) {
  return `${activity}`.includes(application.android.packageName);
}

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
    isAvailable = isAvailable && (currentNetworkSpeedMbps * 1024) >= minBandwidthKbps;
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
