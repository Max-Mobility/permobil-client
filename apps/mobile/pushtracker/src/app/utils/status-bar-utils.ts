/// <reference path="../../../node_modules/tns-platform-declarations/android/android-platform-23.d.ts" />

import { Log } from '@permobil/core';
import * as TNSApplication from 'tns-core-modules/application';
import { Color } from 'tns-core-modules/color';
import { device, isAndroid } from 'tns-core-modules/platform';

export function setLightStatusBar() {
  if (isAndroid && device.sdkVersion >= '23') {
    const whiteColor = new Color('#fff');
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;
    const window = androidActivity.getWindow() as android.view.Window;

    if (window) window.setStatusBarColor(whiteColor.android);

    const decorView = window.getDecorView();
    decorView.setSystemUiVisibility(
      android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
    );
  }
}

export function clearLightStatusBar() {
  if (isAndroid && device.sdkVersion >= '23') {
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;

    const window = androidActivity.getWindow();
    const decorView = window.getDecorView();

    const lastFlag = decorView.getSystemUiVisibility(); // get current flags
    Log.D('LAST UI FLAG', lastFlag);
    // flags = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; // use XOR here for remove LIGHT_STATUS_BAR from flags
    if (lastFlag === 8192) decorView.setSystemUiVisibility(0);
  }
}

export function setDarkStatusBar() {
  if (isAndroid && device.sdkVersion >= '23') {
    const blackColor = new Color('#000');
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;
    const window = androidActivity.getWindow();

    if (window) window.setStatusBarColor(blackColor.android);
  }
}
