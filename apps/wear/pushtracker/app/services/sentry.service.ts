import { Log } from '@permobil/core';
import { Injectable } from 'injection-js';
import { BreadCrumb, Level, MessageOptions, Sentry } from 'nativescript-sentry';

export enum LoggingCategory {
  Info = 'Info',
  Warning = 'Warning'
}

@Injectable()
export class SentryService {
  constructor() {
    Log.D('SentryService constructor...');
  }

  public logError(error) {
    Log.E(error);
    Sentry.captureException(error, {});
  }

  public logMessage(message: string, options: MessageOptions = {}) {
    Sentry.captureMessage(message, options);
  }

  public logBreadCrumb(
    message,
    category: LoggingCategory = LoggingCategory.Info,
    level: Level = Level.Info
  ) {
    console.log(
      '\n\n ***************************   BREADCRUMB   *********************************' +
        '\n\n' +
        message +
        '\n\n' +
        '***************************************************************************** \n\n'
    );

    const breadcrumb: BreadCrumb = {
      message,
      category,
      level
    };
    Sentry.captureBreadcrumb(breadcrumb);
  }
}
