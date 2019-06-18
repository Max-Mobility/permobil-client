export class LoggingUtil {
  static debug = true;
}

// tslint:disable-next-line:max-classes-per-file
export class LoggingService {
  /**
   * Will console.log() the error argument. If devmode is false then we capture
   * the exception with Sentry logging.
   * @param err
   */
  logException(exception: Error) {
    console.log(exception);

    // wire up to some service/api
  }

  logMessage(message: string) {
    console.log(message);
    // wire up to service/api
  }
}
