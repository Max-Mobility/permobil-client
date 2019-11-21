import { Component, OnInit } from '@angular/core';
import { SentryKeys } from '@maxmobility/private-keys';
import { registerElement } from '@nativescript/angular/element-registry';
import { RouterExtensions } from '@nativescript/angular/router';
import { device } from '@nativescript/core/platform';
import * as application from '@nativescript/core/application';
import * as appSettings from '@nativescript/core/application-settings';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import * as Kinvey from 'kinvey-nativescript-sdk';
import { Sentry } from 'nativescript-sentry';
import { AppURL, handleOpenURL } from 'nativescript-urlhandler';
import { APP_LANGUAGES, APP_THEMES, STORAGE_KEYS } from './enums';
import { LoggingService } from './services';
import { applyTheme, APP_KEY, APP_SECRET, getFirstDayOfWeek, YYYY_MM_DD } from './utils';
import { Ratings } from './utils/ratings-utils';

registerElement(
  'AnimatedCircle',
  () => require('nativescript-animated-circle').AnimatedCircle
);
registerElement('LottieView', () => require('nativescript-lottie').LottieView);
registerElement(
  'BarcodeScanner',
  () => require('nativescript-barcodescanner').BarcodeScannerView
);
registerElement(
  'PreviousNextView',
  () => require('nativescript-iqkeyboardmanager').PreviousNextView
);
registerElement(
  'PullToRefresh',
  () => require('@nstudio/nativescript-pulltorefresh').PullToRefresh
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
    const ratings = new Ratings({
        id: 'PUSHTRACKER.RATER.COUNT',
        showOnCount: 100,
        title: this._translateService.instant('dialogs.ratings.title'),
        text: this._translateService.instant('dialogs.ratings.text'),
        agreeButtonText: this._translateService.instant('dialogs.ratings.agree'),
        remindButtonText: this._translateService.instant('dialogs.ratings.remind'),
        declineButtonText: this._translateService.instant('dialogs.ratings.decline'),
        androidPackageId: 'com.permobil.pushtracker',
        iTunesAppId: '1121427802'
    });
    ratings.increment();

    // Brad - sets the default language for ngx-translate
    // *** The value being set must match a translation .json file in assets/i18n/ or it will fail ***
    // wrapping this in try/catch due to https://github.com/PushTracker/EvalApp/issues/43
    try {
      const defaultLanguage = device.language.split('-')[0];
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

    // application level events
    application.on(
      application.uncaughtErrorEvent,
      (args: application.UnhandledErrorEventData) => {
        Log.E(args.eventName, args.error);
        this._logService.logException(args.error);
      }
    );

    application.on(
      application.discardedErrorEvent,
      (args: application.DiscardedErrorEventData) => {
        Log.E(args);
        // report the exception in your analytics solution here
        this._logService.logException(args.error);
      }
    );

    application.on(application.resumeEvent, (args) => {
      if (args.android) {
        console.log('Incrementing ratings counter');
        ratings.increment();
        // For iOS, we increment using an iOS delegate - see main.ts
      }
    });

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
      appSettings.setString('Kinvey.User', JSON.stringify(user));
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
    const CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    applyTheme(CURRENT_THEME);
  }
}
