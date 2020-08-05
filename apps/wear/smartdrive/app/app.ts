import * as application from '@nativescript/core/application';
import * as AppSettings from '@nativescript/core/application-settings';
import { getDefaultLang, load, use } from '@permobil/nativescript';
import { Sentry } from 'nativescript-sentry';
import { DataKeys } from './enums';

console.time('App_Start_Time');

// load inital files
console.time('load language files');
// get the user set language file, if none, we load the device.language
const defaultLanguage = AppSettings.getString(
  DataKeys.APP_LANGUAGE_FILE,
  getDefaultLang()
);
console.log('the default language is', defaultLanguage);
load(defaultLanguage);
use(defaultLanguage);
console.timeEnd('load language files');

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
