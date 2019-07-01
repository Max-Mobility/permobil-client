import * as themes from 'nativescript-themes';
import * as appSettings from 'tns-core-modules/application-settings';
import { clearLightStatusBar, setDarkStatusBar, setLightStatusBar } from '.';
import { APP_THEMES, STORAGE_KEYS } from '../enums';

export function enableDarkTheme() {
  themes.applyThemeCss(
    require('../scss/theme-dark.scss').toString(),
    'theme-dark.scss'
  );
  clearLightStatusBar();
  setDarkStatusBar();
  appSettings.setString(STORAGE_KEYS.APP_THEME, APP_THEMES.DARK);
}

export function enableDefaultTheme() {
  themes.applyThemeCss(
    require('../scss/theme-default.scss').toString(),
    'theme-dark.scss'
  );
  setLightStatusBar();
  // save the theme to app settings so we can read/load it on app_start
  appSettings.setString(STORAGE_KEYS.APP_THEME, APP_THEMES.DEFAULT);
}
