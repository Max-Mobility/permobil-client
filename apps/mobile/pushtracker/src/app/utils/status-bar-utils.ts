/// <reference path="../../../node_modules/@nativescript/types-android/lib/android-23.d.ts" />

import {
  Application as TNSApplication,
  Color,
  Device,
  isAndroid
} from '@nativescript/core';

export function setLightStatusBar() {
  if (isAndroid && Device.sdkVersion >= '23') {
    const whiteColor = new Color('#fff');
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;
    const window = androidActivity.getWindow();

    if (window) window.setStatusBarColor(whiteColor.android);

    const decorView = window.getDecorView();
    decorView.setSystemUiVisibility(
      android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
    );
  }
}

export function clearLightStatusBar() {
  if (isAndroid && Device.sdkVersion >= '23') {
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;

    const window = androidActivity.getWindow();
    const decorView = window.getDecorView();

    const lastFlag = decorView.getSystemUiVisibility(); // get current flags
    // flags = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; // use XOR here for remove LIGHT_STATUS_BAR from flags
    if (lastFlag === 8192) decorView.setSystemUiVisibility(0);
  }
}

export function setDarkStatusBar() {
  if (isAndroid && Device.sdkVersion >= '23') {
    const blackColor = new Color('#202125');
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;
    const window = androidActivity.getWindow();

    if (window) window.setStatusBarColor(blackColor.android);
  }
}
