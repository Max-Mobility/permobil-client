import { Injectable } from '@angular/core';
import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import { BreadCrumb, Level, MessageOptions, Sentry } from 'nativescript-sentry';

export class LoggingUtil {
  static debug = true;
}

export enum LoggingCategory {
  Info = 'Info',
  Warning = 'Warning'
}

@Injectable()
export class LoggingService {
  constructor() {}
  /**
   * Will log the error argument. If devmode is false then we capture
   * the exception with Sentry logging.
   * @param err
   */
  logException(exception: Error) {
    console.log(`****************** ERROR ****************** \n
    Message: ${exception.message} \n
    Stack: ${exception.stack}`);

    const user = KinveyUser.getActiveUser();
    if (user) {
      Sentry.setContextUser({
        email: user.email,
        id: user._id
      });
    }

    // if error type
    if (exception instanceof Error) {
      Sentry.captureException(exception, {});
    } else {
      Sentry.captureMessage(exception as any, {});
    }
  }

  logMessage(message: string, options: MessageOptions = {}) {
    const user = KinveyUser.getActiveUser();
    if (user) {
      Sentry.setContextUser({
        email: user.email,
        id: user._id
      });
    }
    Sentry.captureMessage(message, options);
  }

  logBreadCrumb(
    component,
    message,
    category: LoggingCategory = LoggingCategory.Info,
    level: Level = Level.Info
  ) {
    const breadcrumb: BreadCrumb = {
      message: '[' + component + '] ' + message,
      category: category,
      level: level
    };
    console.log('Sentry Breadcrumb: ', breadcrumb);
    console.log('---------------------------------------------------');

    Sentry.captureBreadcrumb(breadcrumb);
  }
}
