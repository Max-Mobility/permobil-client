import * as themes from 'nativescript-themes';
import * as TNSApplication from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { device, isAndroid, isIOS } from 'tns-core-modules/platform';
import { clearLightStatusBar, setDarkStatusBar, setLightStatusBar } from '.';
import { APP_THEMES, STORAGE_KEYS } from '../enums';

declare const IQKeyboardManager: any;

export function enableDarkTheme() {
  themes.applyThemeCss(
    require('../scss/theme-dark.scss').toString(),
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
  appSettings.setString(STORAGE_KEYS.APP_THEME, APP_THEMES.DARK);
}

export function enableDefaultTheme() {
  themes.applyThemeCss(
    require('../scss/theme-default.scss').toString(),
    'theme-default.scss'
  );
  setLightStatusBar();
  // setLightNavigationBar();

  // if running on iOS enable the dark mode for IQKeyboardManager
  if (isIOS && IQKeyboardManager) {
    const iqKeyboard = IQKeyboardManager.sharedManager();
    iqKeyboard.overrideKeyboardAppearance = true;
    iqKeyboard.keyboardAppearance = UIKeyboardAppearance.Light;
  }

  // save the theme to app settings so we can read/load it on app_start
  appSettings.setString(STORAGE_KEYS.APP_THEME, APP_THEMES.DEFAULT);
}

// function setLightNavigationBar() {
//   if (isAndroid && device.sdkVersion >= '26') {
//     const whiteColor = new Color('#fff');
//     const androidActivity: android.app.Activity =
//       TNSApplication.android.startActivity ||
//       TNSApplication.android.foregroundActivity;
//     const window = androidActivity.getWindow();

//     // if (window) window.setNavigationBarColor(whiteColor.android);
//     const decorView = window.getDecorView();
//     decorView.setSystemUiVisibility(
//       android.view.View.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS |
//         android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
//     );
//   }
// }

function setDarkNavigationBar() {
  if (isAndroid && device.sdkVersion >= '23') {
    const darkColor = new Color('#000');
    const androidActivity: android.app.Activity =
      TNSApplication.android.startActivity ||
      TNSApplication.android.foregroundActivity;
    const window = androidActivity.getWindow() as android.view.Window;

    if (window) window.setNavigationBarColor(darkColor.android);
  }
}
