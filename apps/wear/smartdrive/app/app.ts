import * as application from '@nativescript/core/application';
import { getDefaultLang, load, use } from '@permobil/nativescript';
import { Sentry } from 'forked-plugins/ns-sentry';

console.time('App_Start_Time');

// load inital files
console.time('load language files');
load(getDefaultLang());
use(getDefaultLang());
console.timeEnd('load language files');

// setup application level events
application.on(
  application.uncaughtErrorEvent,
  (args: application.UnhandledErrorEventData) => {
    Sentry.captureException(args.error, {
      tags: {
        type: 'uncaughtErrorEvent'
      }
    });
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
