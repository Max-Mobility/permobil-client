import { Log } from '@permobil/core';
import { Level, Sentry } from 'forked-plugins/ns-sentry';

export function sentryBreadCrumb(message: string) {
  Log.D(`Sentry breadcrumb`, message);
  Sentry.captureBreadcrumb({
    message,
    category: 'info',
    level: Level.Info
  });
}
