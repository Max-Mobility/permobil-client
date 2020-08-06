import * as application from '@nativescript/core/application';
import { Log } from '@permobil/core';
import { getDefaultLang, load, use } from '@permobil/nativescript';
import { Sentry } from 'nativescript-sentry';
import 'reflect-metadata';

console.time('App_Start_Time');

// get the user set language file, if none, we load the device.language
const defaultLanguage = getDefaultLang();
console.log('the default language is', defaultLanguage);
load(defaultLanguage);
use(defaultLanguage);

// setup application level events
application.on(
  application.uncaughtErrorEvent,
  (args?: application.UnhandledErrorEventData) => {
    if (args) {
      Sentry.captureException(args.error, {
        tags: {
          type: 'uncaughtErrorEvent'
        }
      });
    }
    Log.D('App uncaught error');
  }
);

application.on(
  application.discardedErrorEvent,
  (args: application.DiscardedErrorEventData) => {
    Sentry.captureException(args.error, {
      tags: {
        type: 'discardedErrorEvent'
      }
    });
  }
);

console.timeEnd('App_Start_Time');

// start the app
application.run({ moduleName: 'app-root' });
