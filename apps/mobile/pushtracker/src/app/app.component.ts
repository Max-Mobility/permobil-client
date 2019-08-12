import { Component, OnInit } from '@angular/core';
import { SentryKeys } from '@maxmobility/private-keys';
import { TranslateService } from '@ngx-translate/core';
import { Fab } from '@nstudio/nativescript-floatingactionbutton';
import { Log } from '@permobil/core';
import * as Kinvey from 'kinvey-nativescript-sdk';
import { registerElement } from 'nativescript-angular/element-registry';
import { RouterExtensions } from 'nativescript-angular/router';
import { AnimatedCircle } from 'nativescript-animated-circle';
import { Gif } from 'nativescript-gif';
import { LottieView } from 'nativescript-lottie';
import { Sentry } from 'nativescript-sentry';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { APP_THEMES, STORAGE_KEYS } from './enums';
import { LoggingService } from './services';
import { enableDarkTheme, enableDefaultTheme } from './utils';
import { APP_KEY, APP_SECRET } from './utils/kinvey-keys';
import { BarcodeScanner } from 'nativescript-barcodescanner';

registerElement('Gif', () => Gif);
registerElement('Fab', () => Fab);
registerElement('AnimatedCircle', () => AnimatedCircle);
registerElement('LottieView', () => LottieView);
registerElement(
  'BarcodeScanner',
  () => require('nativescript-barcodescanner').BarcodeScannerView
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
    console.time('AppComponent_Constructor');
    // init sentry - DNS key is in the SmartEvalKinvey package
    Sentry.init(SentryKeys.PUSHTRACKER_MOBILE_DSN);

    // Brad - sets the default language for ngx-translate
    // *** The value being set must match a translation .json file in assets/i18n/ or it will fail ***
    // wrapping this in try/catch due to https://github.com/PushTracker/EvalApp/issues/43
    try {
      this._translateService.setDefaultLang('en');
      this._translateService.addLangs([
        'en',
        'es',
        'de',
        'fr',
        'ja',
        'ko',
        'nl',
        'ru',
        'sv',
        'zh-CN'
      ]);
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

    Kinvey.init({ appKey: `${APP_KEY}`, appSecret: `${APP_SECRET}` });
    Kinvey.ping()
      .then(() => {
        // nothing useful here - Kinvey SDK is working
      })
      .catch(err => {
        this._logService.logException(err);
      });

    // if user is logged in, go to default tabs route, else go to login
    if (Kinvey.User.getActiveUser()) {
      this._router.navigate(['/tabs/default']);
    } else {
      this._router.navigate(['/login']);
    }

    console.timeEnd('AppComponent_Constructor');
  }

  ngOnInit() {
    Log.D(`app.component OnInit`);
    const savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    if (savedTheme === APP_THEMES.DEFAULT) {
      enableDefaultTheme();
    } else if (savedTheme === APP_THEMES.DARK) {
      enableDarkTheme();
    }
  }
}
