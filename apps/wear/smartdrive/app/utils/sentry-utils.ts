import { Log } from '@permobil/core';
import { Level, Sentry } from 'nativescript-sentry';

export function sentryBreadCrumb(message: string) {
  Log.D(`Sentry BreadCrumb:`, message);
  Sentry.captureBreadcrumb({
    message,
    category: 'info',
    level: Level.Info
  });
}
