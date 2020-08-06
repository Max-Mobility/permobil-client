import * as application from '@nativescript/core/application';
import { Log } from '@permobil/core/src';
import { getDefaultLang, load, use } from '@permobil/nativescript';
import { Sentry } from 'nativescript-sentry';

console.time('App_Start_Time');

// get the user set language file, if none, we load the device.language
const defaultLanguage = getDefaultLang();
Log.D('The default language is ', defaultLanguage);
load(defaultLanguage);
use(defaultLanguage);

// setup application level events
application.on(
  application.uncaughtErrorEvent,
  (args: application.UnhandledErrorEventData) => {
    Sentry.captureException(new Error(JSON.stringify(args)), {
      tags: {
        type: 'uncaughtErrorEvent'
      }
    });
  }
);

application.on(
  application.discardedErrorEvent,
  (args: application.DiscardedErrorEventData) => {
    Sentry.captureException(new Error(JSON.stringify(args)), {
      tags: {
        type: 'discardedErrorEvent'
      }
    });
  }
);

console.timeEnd('App_Start_Time');

// start the app
application.run({ moduleName: 'app-root' });
