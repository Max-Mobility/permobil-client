import { Sentry } from 'nativescript-sentry';
import * as application from 'tns-core-modules/application';

console.time('App_Start_Time');

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
