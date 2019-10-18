import { Level, Sentry } from 'nativescript-sentry';

export function sentryBreadCrumb(message: string) {
  Sentry.captureBreadcrumb({
    message,
    category: 'info',
    level: Level.Info
  });
}
