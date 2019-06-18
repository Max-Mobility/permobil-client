import { Injectable } from '@angular/core';
import { Sentry, BreadCrumb, Level, MessageOptions } from 'nativescript-sentry';
import { UserService } from './user.service';

export class LoggingUtil {
  static debug = true;
}

export enum LoggingCategory {
  Info = 'Info',
  Warning = 'Warning'
}

@Injectable()
export class LoggingService {
  constructor(private _userService: UserService) {}
  /**
   * Will log the error argument. If devmode is false then we capture
   * the exception with Sentry logging.
   * @param err
   */
  logException(exception: Error) {
    if (this._userService && this._userService.user) {
      Sentry.setContextUser({
        email: this._userService.user.email,
        id: this._userService.user._id
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
    if (this._userService && this._userService.user) {
      Sentry.setContextUser({
        email: this._userService.user.email,
        id: this._userService.user._id
      });
    }
    Sentry.captureMessage(message, options);
  }

  logBreadCrumb(
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
