import 'reflect-metadata';
// this import should be first in order to load some required settings (like globals and reflect-metadata)
import { platformNativeScriptDynamic } from '@nativescript/angular';
/**
 * be sure to keep the above imports first
 */
import { enableProdMode } from '@angular/core';
import { isIOS } from '@nativescript/core';
import * as application from '@nativescript/core/application';
import * as appSettings from '@nativescript/core/application-settings';
import * as themes from 'nativescript-themes';
import { AppModule } from './app/app.module';
import { APP_THEMES, STORAGE_KEYS } from './app/enums';
import { Ratings } from './app/utils/ratings-utils';
require('nativescript-plugin-firebase'); // for configuring push notifications

// If built with env.uglify
declare const __UGLIFIED__;
if (typeof __UGLIFIED__ !== 'undefined' && __UGLIFIED__) {
  // need to configure the kinvey keys here for production to when we uglify for release builds, else use the kinvey dev environment
  enableProdMode();
}

// set the default app theme styles here
// later when settings is cofigured we'll store the user theme preference
// read their saved setting and then load the theme according to the user pref.
// themes.applyThemeCss(
//   require('./app/scss/theme-default.scss').toString(),
//   'theme-default.scss'
// );
const SAVED_THEME = appSettings.getString(
  STORAGE_KEYS.APP_THEME,
  APP_THEMES.DEFAULT
);
if (SAVED_THEME === APP_THEMES.DEFAULT) {
  themes.applyThemeCss(
    require('./app/scss/theme-default.scss').toString(),
    'theme-default.scss'
  );
} else if (SAVED_THEME === APP_THEMES.DARK) {
  themes.applyThemeCss(
    require('./app/scss/theme-dark.scss').toString(),
    'theme-dark.scss'
  );
}

if (isIOS) {
  class PushTrackerIOSDelegate extends UIResponder
    implements UIApplicationDelegate {
    public static ObjCProtocols = [UIApplicationDelegate];
    applicationDidBecomeActive(application: UIApplication): void {
      const ratings = new Ratings({
        id: 'PUSHTRACKER.RATER.COUNT',
        showOnCount: 100,
        title: '',
        text: '',
        androidPackageId: 'com.permobil.pushtracker',
        iTunesAppId: '1121427802'
      });
      console.log('Incrementing ratings counter');
      ratings.increment();
    }
  }
  application.ios.delegate = PushTrackerIOSDelegate;
}

// A traditional NativeScript application starts by initializing global objects,
// setting up global CSS rules, creating, and navigating to the main page.
// Angular applications need to take care of their own initialization:
// modules, components, directives, routes, DI providers.
// A NativeScript Angular app needs to make both paradigms work together,
// so we provide a wrapper platform object, platformNativeScriptDynamic,
// that sets up a NativeScript application and can bootstrap the Angular framework.
platformNativeScriptDynamic().bootstrapModule(AppModule);
