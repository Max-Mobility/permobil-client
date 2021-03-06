import {
  Application as TNSApplication,
  ApplicationSettings,
  Color,
  Device,
  isAndroid,
  isIOS
} from '@nativescript/core';
import * as themes from 'nativescript-themes';
import { clearLightStatusBar, setDarkStatusBar, setLightStatusBar } from '.';
import { APP_THEMES, STORAGE_KEYS } from '../enums';

declare const IQKeyboardManager: any;

export function applyTheme(newTheme: string) {
  if (newTheme === APP_THEMES.DEFAULT) {
    enableDefaultTheme();
  } else if (newTheme === APP_THEMES.DARK) {
    enableDarkTheme();
  } else {
    // Do nothing
  }
}

export function enableDarkTheme() {
  themes.applyThemeCss(
    require('../scss/theme-dark.scss').default.toString(),
    'theme-dark.scss'
  );
  clearLightStatusBar();
  setDarkStatusBar();
  setDarkNavigationBar();

  // if running on iOS enable the dark mode for IQKeyboardManager
  if (isIOS && IQKeyboardManager) {
    const iqKeyboard = IQKeyboardManager.sharedManager();
    iqKeyboard.overrideKeyboardAppearance = true;
    iqKeyboard.keyboardAppearance = UIKeyboardAppearance.Dark;
  }

  // save the dark theme to app-settings
  ApplicationSettings.setString(STORAGE_KEYS.APP_THEME, APP_THEMES.DARK);
}

export function enableDefaultTheme() {
  themes.applyThemeCss(
    require('../scss/theme-default.scss').default.toString(),
    'theme-default.scss'
  );
  setLightStatusBar();

  // if running on iOS enable the dark mode for IQKeyboardManager
  if (isIOS && IQKeyboardManager) {
    const iqKeyboard = IQKeyboardManager.sharedManager();
    iqKeyboard.overrideKeyboardAppearance = true;
    iqKeyboard.keyboardAppearance = UIKeyboardAppearance.Light;
  }

  // save the theme to app settings so we can read/load it on app_start
  ApplicationSettings.setString(STORAGE_KEYS.APP_THEME, APP_THEMES.DEFAULT);
}

function setDarkNavigationBar() {
  if (isAndroid && Device.sdkVersion >= '23') {
    const darkColor = new Color('#000');
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;
    const window = androidActivity.getWindow();

    if (window) window.setNavigationBarColor(darkColor.android);
  }
}
