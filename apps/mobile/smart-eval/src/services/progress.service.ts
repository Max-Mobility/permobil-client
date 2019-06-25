import { Injectable } from '@angular/core';
import { LoadingIndicator } from 'nativescript-loading-indicator';
import { isAndroid, isIOS } from 'tns-core-modules/platform';

/**
 * Reactive progress indicator
 */
@Injectable()
export class ProgressService {
  // reusable nativescript instance
  private _loader: LoadingIndicator;
  // default options
  private _defaultOptions: any = {
    android: {
      dimBackground: true,
      indeterminate: true,
      cancelable: false,
      progressStyle: 0
    },
    ios: {
      dimBackground: true
    }
  };

  constructor() {
    this._loader = new LoadingIndicator();
  }

  /**
   * Shows the loading indicator with the default options
   */
  show(message = 'Processing') {
    this._defaultOptions.message = '';
    if (isAndroid) {
      this._defaultOptions.message = message;
    } else if (isIOS) {
      this._defaultOptions.ios.details = message;
    }
    this._loader.show(this._defaultOptions);
  }

  /**
   * Hides the loading indicator
   */
  hide() {
    this._loader.hide();
  }
}
