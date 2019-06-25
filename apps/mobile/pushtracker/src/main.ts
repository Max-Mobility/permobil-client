// this import should be first in order to load some required settings (like globals and reflect-metadata)
import { enableProdMode } from '@angular/core';
import { platformNativeScriptDynamic } from 'nativescript-angular/platform';
import * as themes from 'nativescript-themes';
import 'reflect-metadata';
import { AppModule } from './app/app.module';
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
themes.applyThemeCss(
  require('./app/scss/theme-default.scss').toString(),
  'theme-default.scss'
);

// A traditional NativeScript application starts by initializing global objects,
// setting up global CSS rules, creating, and navigating to the main page.
// Angular applications need to take care of their own initialization:
// modules, components, directives, routes, DI providers.
// A NativeScript Angular app needs to make both paradigms work together,
// so we provide a wrapper platform object, platformNativeScriptDynamic,
// that sets up a NativeScript application and can bootstrap the Angular framework.
platformNativeScriptDynamic().bootstrapModule(AppModule);
