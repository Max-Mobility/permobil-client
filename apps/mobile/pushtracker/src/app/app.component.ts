import { Component, OnInit } from '@angular/core';
import * as Kinvey from '@bradmartin/kinvey-nativescript-sdk';
import { AppURL, handleOpenURL } from '@bradmartin/nativescript-urlhandler';
import { SentryKeys } from '@maxmobility/private-keys';
import { registerElement, RouterExtensions } from '@nativescript/angular';
import {
  AndroidApplication,
  Application,
  ApplicationSettings,
  Device,
  DiscardedErrorEventData,
  isAndroid,
  UnhandledErrorEventData
} from '@nativescript/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { APP_KEY, APP_SECRET } from '@permobil/nativescript';
import { APP_LANGUAGES, APP_THEMES, STORAGE_KEYS } from './enums';
import { LoggingService } from './services';
import { applyTheme } from './utils';
import { Ratings } from './utils/ratings-utils';
import { Sentry } from 'nativescript-sentry';

registerElement('LottieView', () => require('nativescript-lottie').LottieView);
registerElement(
  'BarcodeScanner',
  () => require('nativescript-barcodescanner').BarcodeScannerView
);
registerElement(
  'PreviousNextView',
  () => require('@nativescript/iqkeyboardmanager').PreviousNextView
);
registerElement(
  'PullToRefresh',
  () => require('@nstudio/nativescript-pulltorefresh').PullToRefresh
);
registerElement(
  'HTMLLabel',
  () => require('@nativescript-community/ui-label').Label
);

@Component({
  selector: 'ns-app',
  template: '<page-router-outlet></page-router-outlet>'
})
export class AppComponent implements OnInit {
  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _router: RouterExtensions
  ) {
    // init sentry - DNS key is in the SmartEvalKinvey package
    Sentry.init(SentryKeys.PUSHTRACKER_MOBILE_DSN);

    // Brad - sets the default language for ngx-translate
    // *** The value being set must match a translation .json file in assets/i18n/ or it will fail ***
    // wrapping this in try/catch due to https://github.com/PushTracker/EvalApp/issues/43
    try {
      const defaultLanguage = Device.language.split('-')[0];
      this._logService.logBreadCrumb(
        AppComponent.name,
        'Setting default language to ' + defaultLanguage
      );
      this._translateService.setDefaultLang(defaultLanguage);
    } catch (error) {
      this._logService.logBreadCrumb(
        AppComponent.name,
        'Caught error, setting langauge to ' + APP_LANGUAGES.English
      );
      this._translateService.setDefaultLang(APP_LANGUAGES.English);
      Log.E(error);
      this._logService.logException(error);
    }

    try {
      // add all the languages
      this._translateService.addLangs(
        Object.keys(APP_LANGUAGES).map(key => APP_LANGUAGES[key])
      );
    } catch (error) {
      Log.E(error);
      this._logService.logException(error);
    }

    // unregister for events
    Application.off(Application.uncaughtErrorEvent);
    Application.off(Application.discardedErrorEvent);

    // application level events
    Application.on(
      Application.uncaughtErrorEvent,
      (args: UnhandledErrorEventData) => {
        Log.E(args.eventName, args.error);
        this._logService.logException(args.error);
      }
    );

    Application.on(
      Application.discardedErrorEvent,
      (args: DiscardedErrorEventData) => {
        Log.E(args);
        // report the exception in your analytics solution here
        this._logService.logException(args.error);
      }
    );

    if (isAndroid) {
      Application.android.off(AndroidApplication.activityResumedEvent);
      Application.android.on(AndroidApplication.activityResumedEvent, function (
        args
      ) {
        const ratings = new Ratings({
          id: 'PUSHTRACKER.RATER.COUNT',
          showOnCount: 100,
          title: '',
          text: '',
          androidPackageId: 'com.permobil.pushtracker',
          iTunesAppId: '1121427802'
        });
        console.log('Incrementing ratings counter activityResumedEvent');
        ratings.increment();
      });
    }

    Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });
    Kinvey.ping()
      .then(() => {
        // nothing useful here - Kinvey SDK is working
      })
      .catch(err => {
        this._logService.logException(err);
      });

    // if user is logged in, go to default tabs route, else go to login
    const user = <PushTrackerUser>(<any>Kinvey.User.getActiveUser());
    if (user) {
      ApplicationSettings.setString('Kinvey.User', JSON.stringify(user));
      this._router.navigate(['/tabs/default']);
    } else {
      this._router.navigate(['/login']);
    }
  }

  ngOnInit() {
    handleOpenURL((appURL: AppURL) => {
      // TODO: we should send the authorization to the watch here - we
      // were (probably) opened because the watch requested it
      console.log('Got the following appURL', appURL);
    });
    const CURRENT_THEME = ApplicationSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    applyTheme(CURRENT_THEME);
  }
}
