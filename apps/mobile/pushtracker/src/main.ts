// this import should be first in order to load some required settings (like globals and reflect-metadata)
import { enableProdMode } from '@angular/core';
import { platformNativeScriptDynamic } from 'nativescript-angular/platform';
import 'reflect-metadata';
import { AppModule } from './app/app.module';
require('nativescript-plugin-firebase'); // for configuring push notifications

// If built with env.uglify
declare const __UGLIFIED__;
if (typeof __UGLIFIED__ !== 'undefined' && __UGLIFIED__) {
  // need to configure the kinvey keys here for production to when we uglify for release builds, else use the kinvey dev environment
  enableProdMode();
}

// A traditional NativeScript application starts by initializing global objects,
// setting up global CSS rules, creating, and navigating to the main page.
// Angular applications need to take care of their own initialization:
// modules, components, directives, routes, DI providers.
// A NativeScript Angular app needs to make both paradigms work together,
// so we provide a wrapper platform object, platformNativeScriptDynamic,
// that sets up a NativeScript application and can bootstrap the Angular framework.
platformNativeScriptDynamic()
  .bootstrapModule(AppModule);
