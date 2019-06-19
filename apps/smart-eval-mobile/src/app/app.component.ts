import { Component } from '@angular/core';
import { User } from '@maxmobility/core';
import { LoggingService, UserService } from '@maxmobility/mobile';
import { SentryKeys } from '@maxmobility/private-keys';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { registerElement } from 'nativescript-angular/element-registry';
import { RouterExtensions } from 'nativescript-angular/router';
import { Carousel, CarouselItem } from 'nativescript-carousel';
import { Fab } from 'nativescript-floatingactionbutton';
import { Gif } from 'nativescript-gif';
import { MapboxView } from 'nativescript-mapbox';
import * as orientation from 'nativescript-orientation';
import { Sentry } from 'nativescript-sentry';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import * as application from 'tns-core-modules/application';
import { connectionType, startMonitoring, stopMonitoring } from 'tns-core-modules/connectivity';
import { APP_KEY, APP_SECRET } from './utils/kinvey-keys';

// Register Custom Elements for Angular
registerElement('Carousel', () => <any>Carousel);
registerElement('CarouselItem', () => <any>CarouselItem);
registerElement(
  'BarcodeScanner',
  () => require('nativescript-barcodescanner').BarcodeScannerView
);
registerElement('Gif', () => Gif);
registerElement('Mapbox', () => MapboxView);
registerElement('Fab', () => Fab);

@Component({
  selector: 'ns-app',
  template: '<page-router-outlet></page-router-outlet>'
})
export class AppComponent {
  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _userService: UserService,
    private _router: RouterExtensions
  ) {
    // init sentry - DNS key is in the SmartEvalKinvey package
    Sentry.init(SentryKeys.SENTRY_DSN);

    // REGISTER FOR PUSH NOTIFICATIONS
    if (UserService.hasRegistered === false) {
      this._userService
        ._registerForPushNotifications()
        .then((deviceToken: string) => {
          UserService.hasRegistered = true;
        })
        .catch(err => {
          this._logService.logException(err);
        });
    }

    // set the orientation to be portrait and don't allow orientation changes
    if (orientation.getOrientation() !== 'portrait') {
      // set the orientation to be portrait and don't allow orientation changes
      orientation.setOrientation('portrait');
    }
    orientation.disableRotation(); // may not need to call this - docs say 'set' calls this

    // Brad - sets the default language for ngx-translate
    // *** The value being set must match a translation .json file in assets/i18n/ or it will fail ***
    // wrapping this in try/catch due to https://github.com/PushTracker/EvalApp/issues/43
    try {
      this._translateService.setDefaultLang('en');
      this._translateService.addLangs(['en', 'es', 'de', 'fr', 'nl', 'zh']);
    } catch (error) {
      this._logService.logException(error);
    }

    // application level events
    application.on(
      application.uncaughtErrorEvent,
      (args: application.UnhandledErrorEventData) => {
        this._logService.logException(args.error);
        this._stopNetworkMonitoring();
      }
    );

    application.on(
      application.discardedErrorEvent,
      (args: application.DiscardedErrorEventData) => {
        console.log(args.error.name);
        console.log(args.error.message);
        console.log(args.error.stack);
        console.log(args.error.nativeError);
        //report the exception in your analytics solution here
        this._logService.logException(args.error);
      }
    );

    application.on(application.suspendEvent, () => {
      this._stopNetworkMonitoring();
    });

    application.on(application.exitEvent, () => {
      this._stopNetworkMonitoring();
    });

    application.on(
      application.resumeEvent,
      (args: application.ApplicationEventData) => {
        // when app resumes we need to start the network monitor
        this._startNetworkMonitor();

        // check if we have a current user logged in and set their language for translation
        // without this, the language would always load the default 'en' and not check the user's preference
        // see - https://github.com/PushTracker/EvalApp/issues/324
        const u = Kinvey.User.getActiveUser();
        if (u && (u.data as User).language) {
          this._translateService.setDefaultLang((u.data as User).language);
        } else {
          this._translateService.setDefaultLang('en');
        }

        if (orientation.getOrientation() !== 'portrait') {
          // set the orientation to be portrait and don't allow orientation changes
          orientation.setOrientation('portrait');
        }
        orientation.disableRotation(); // may not need to call this - docs say 'set' calls this
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

    // if user is logged in, go home, else go to login
    if (this._userService.user) {
      this._router.navigate(['/home']);
    } else {
      this._router.navigate(['/login']);
    }
  }

  private _startNetworkMonitor() {
    // start network monitoring
    startMonitoring(newConnectionType => {
      switch (newConnectionType) {
        case connectionType.none:
          // show a toast with network info
          new Toasty({
            text: this._translateService.instant('general.no-connection'),
            duration: ToastDuration.LONG,
            position: ToastPosition.CENTER
          }).show();
          break;
        case connectionType.wifi:
          return;
        case connectionType.mobile:
          return;
      }
    });
  }

  // Stop the monitoring
  private _stopNetworkMonitoring() {
    stopMonitoring();
  }
}
