import {
  Application,
  DiscardedErrorEventData,
  UnhandledErrorEventData
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { getDefaultLang, load, use } from '@permobil/nativescript';
import { Sentry } from 'nativescript-sentry';
import 'reflect-metadata';

console.time('App_Start_Time');

// get the user set language file, if none, we load the device.language
const defaultLanguage = getDefaultLang();
Log.D('The default language is ', defaultLanguage);
load(defaultLanguage);
use(defaultLanguage);

// setup application level events
Application.on(
  Application.uncaughtErrorEvent,
  (args?: UnhandledErrorEventData) => {
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

Application.on(
  Application.discardedErrorEvent,
  (args: DiscardedErrorEventData) => {
    Sentry.captureException(args.error, {
      tags: {
        type: 'discardedErrorEvent'
      }
    });
  }
);

console.timeEnd('App_Start_Time');

// start the app
Application.run({ moduleName: 'app-root' });
