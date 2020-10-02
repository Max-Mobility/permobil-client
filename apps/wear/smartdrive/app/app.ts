import {
  Application,
  DiscardedErrorEventData,
  UnhandledErrorEventData
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { getDefaultLang, load, use } from '@permobil/nativescript';
import { Sentry } from 'nativescript-sentry';

console.time('App_Start_Time');

// get the user set language file, if none, we load the device.language
const defaultLanguage = getDefaultLang();
Log.D('The default language is ', defaultLanguage);
load(defaultLanguage);
use(defaultLanguage);

// setup application level events
Application.on(
  Application.uncaughtErrorEvent,
  (args: UnhandledErrorEventData) => {
    Sentry.captureException(new Error(JSON.stringify(args)), {
      tags: {
        type: 'uncaughtErrorEvent'
      }
    });
  }
);

Application.on(
  Application.discardedErrorEvent,
  (args: DiscardedErrorEventData) => {
    Sentry.captureException(new Error(JSON.stringify(args)), {
      tags: {
        type: 'discardedErrorEvent'
      }
    });
  }
);

console.timeEnd('App_Start_Time');

// start the app
Application.run({ moduleName: 'app-root' });
