import { Level, Sentry } from 'nativescript-sentry';
import { Log } from '@permobil/core';

export function sentryBreadCrumb(message: string) {
  Log.D(`Sentry breadcrumb`, message);
  Sentry.captureBreadcrumb({
    message,
    category: 'info',
    level: Level.Info
  });
}
