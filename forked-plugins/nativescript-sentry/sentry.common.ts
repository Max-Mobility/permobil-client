export enum Level {
  Fatal = 'fatal',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug'
}

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  data?: object;
}

export interface BreadCrumb {
  message: string;
  category: string;
  level: Level;
}

export interface MessageOptions {
  level?: Level;

  /**
   * Object of additional Key/value pairs which generate breakdowns charts and search filters.
   */
  tags?: object;

  /**
   * Object of unstructured data which is stored with events.
   */
  extra?: object;
}

export interface ExceptionOptions {
  /**
   * Object of additional Key/value pairs which generate breakdowns charts and search filters in Sentry.
   */
  tags?: object;

  /**
   * Object of unstructured data which is stored with events.
   */
  extra?: object;
}
