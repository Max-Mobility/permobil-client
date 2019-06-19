import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { PushTracker, SettingsService } from '@maxmobility/core';
import {
  BluetoothService,
  LoggingService,
  ProgressService
} from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { PageRoute } from 'nativescript-angular/router';
import { DropDown } from 'nativescript-drop-down';
import { Feedback } from 'nativescript-feedback';
import { Gif } from 'nativescript-gif';
import { SnackBar } from 'nativescript-snackbar';
import { switchMap } from 'rxjs/operators';
import { Subscription } from 'rxjs/Subscription';
import {
  ChangedData,
  ObservableArray
} from 'tns-core-modules/data/observable-array';
import { confirm } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'pairing',
  moduleId: module.id,
  templateUrl: 'pairing.component.html',
  styleUrls: ['pairing.component.scss']
})
export class PairingComponent implements OnInit {
  private static LOG_TAG = 'pairing.component ';
  @ViewChild('controlModeDropDown', { static: true })
  controlModeDropDown: ElementRef;
  @ViewChild('unitsDropDown', { static: true })
  unitsDropDown: ElementRef;

  @ViewChild('carousel', { static: true })
  carousel: ElementRef;

  selectedPage = 0;

  /**
   * Slides for carousel in UI
   */
  slides;

  settings: any = null;
  // Control modes are not translated
  ControlModeOptions = PushTracker.Settings.ControlMode.Options;
  // Have to use translations for Units
  UnitsOptions = PushTracker.Settings.Units.Translations.map(t =>
    this._translateService.instant(t)
  );
  pushSettings: any = null;

  private _feedback: Feedback;
  private _snackbar = new SnackBar();
  private routeSub: Subscription; // subscription to route observer

  constructor(
    private _page: Page,
    private _router: Router,
    private _pageRoute: PageRoute,
    private _zone: NgZone,
    private _settingsService: SettingsService,
    private _translateService: TranslateService,
    private _progressService: ProgressService,
    private _loggingService: LoggingService
  ) {
    this._page.className = 'blue-gradient-down';

    this.settings = this._settingsService.settings;
    this.pushSettings = this._settingsService.pushSettings;

    // update slides
    this.slides = this._translateService.instant('pairing');

    // figure out which slide we're going to
    this._pageRoute.activatedRoute
      .pipe(switchMap(activatedRoute => activatedRoute.queryParams))
      .forEach(params => {
        if (params.index) {
          this.selectedPage = params.index;
        }
      });

    this._feedback = new Feedback();

    this.unregister();
    // handle pushtracker pairing events for existing pushtrackers
    BluetoothService.PushTrackers.map(pt => {
      pt.on(PushTracker.pushtracker_paired_event, args => {
        this.pushTrackerPairingSuccess();
      });
      pt.on(PushTracker.pushtracker_connect_event, args => {
        if (pt.paired) {
          this.pushTrackerConnectionSuccess();
        }
      });
      // register for settings and push settings
      pt.on(
        PushTracker.pushtracker_settings_event,
        this.onPushTrackerSettings,
        this
      );
      // pt.on(PushTracker.pushtracker_push_settings_event, this.onPushTrackerPushSettings, this);
    });

    // listen for completely new pusthrackers (that we haven't seen before)
    BluetoothService.PushTrackers.on(
      ObservableArray.changeEvent,
      (args: ChangedData<number>) => {
        if (args.action === 'add') {
          const pt = BluetoothService.PushTrackers.getItem(
            BluetoothService.PushTrackers.length - 1
          );
          if (pt) {
            pt.on(PushTracker.pushtracker_paired_event, pairedArgs => {
              this.pushTrackerPairingSuccess();
            });
            pt.on(PushTracker.pushtracker_connect_event, arg => {
              if (pt.paired) {
                this.pushTrackerConnectionSuccess();
              }
            });
            // register for settings and push settings
            pt.on(
              PushTracker.pushtracker_settings_event,
              this.onPushTrackerSettings,
              this
            );
            // pt.on(PushTracker.pushtracker_push_settings_event, this.onPushTrackerPushSettings, this);
          }
        }
      }
    );
  }

  ngOnInit(): void {
    this._loggingService.logBreadCrumb(PairingComponent.LOG_TAG + `ngOnInit`);

    // see https://github.com/NativeScript/nativescript-angular/issues/1049
    this.routeSub = this._router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.unregister();
      }
    });

    this._page.on(Page.navigatingFromEvent, event => {
      this.unregister();
    });

    // update drop downs
    (this.unitsDropDown
      .nativeElement as DropDown).selectedIndex = this.UnitsOptions.indexOf(
      this.settings.units
    );
    (this.controlModeDropDown
      .nativeElement as DropDown).selectedIndex = this.ControlModeOptions.indexOf(
      this.settings.controlMode
    );
  }

  unregister(): void {
    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG + `unregister().`
    );

    BluetoothService.PushTrackers.off(ObservableArray.changeEvent);
    BluetoothService.PushTrackers.map(pt => {
      pt.off(PushTracker.pushtracker_paired_event);
      pt.off(PushTracker.pushtracker_connect_event);
      pt.off(PushTracker.pushtracker_settings_event);
      // pt.off(PushTracker.pushtracker_push_settings_event);
    });
  }

  // settings controls
  async onPushTrackerSettings(args: any) {
    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG + `onPushTrackerSettings().`
    );

    this._zone.run(() => {
      if (this.settings.diff(args.data.settings)) {
        // ask to copy the settings
        confirm({
          message: this._translateService.instant(
            'pushtracker.settings.copy-dialog.message'
          ),
          okButtonText: this._translateService.instant('dialogs.ok'),
          cancelButtonText: this._translateService.instant('dialogs.no')
        }).then(result => {
          this._loggingService.logBreadCrumb(
            PairingComponent.LOG_TAG +
              `onPushTrackerSettings() confirm result: ${result}`
          );

          if (result === true) {
            this.settings.copy(args.data.settings);
            // update drop downs
            const newUnitsIndex = this.UnitsOptions.indexOf(
              this.settings.units
            );
            (this.unitsDropDown
              .nativeElement as DropDown).selectedIndex = newUnitsIndex;
            const newControlIndex = this.ControlModeOptions.indexOf(
              this.settings.controlMode
            );
            (this.controlModeDropDown
              .nativeElement as DropDown).selectedIndex = newControlIndex;
          }
        });
      }
    });
  }
  async onPushTrackerPushSettings(args: any) {
    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG + `onPushTrackerPushSettings().`
    );

    this._zone.run(() => {
      if (this.pushSettings.diff(args.data.pushSettings)) {
        // ask to copy the settings
        confirm({
          message: this._translateService.instant(
            'pushtracker.push-settings.copy-dialog.message'
          ),
          okButtonText: this._translateService.instant('dialogs.ok'),
          cancelButtonText: this._translateService.instant('dialogs.no')
        }).then(result => {
          this._loggingService.logBreadCrumb(
            PairingComponent.LOG_TAG +
              `onPushTrackerPushSettings() confirm result: ${result}`
          );

          if (result === true) {
            this.pushSettings.copy(args.data.pushSettings);
          }
        });
      }
    });
  }

  onSettingsDropdown(key: string, args: any) {
    const optionKey = key.substr(0, 1).toUpperCase() + key.substr(1);
    this.settings[key] = PushTracker.Settings[optionKey].Options[args.newIndex];
  }

  onSettingsUpdate(key: string, args: any) {
    this.settings[key] = Math.floor(args.object.value) * 10;
  }

  onSettingsChecked(key, args) {
    this.settings[key] = args.value;
  }

  onPushSettingsUpdate(key: string, args: any) {
    this.pushSettings[key] = Math.floor(args.object.value);
  }

  onPushSettingsChecked(key, args) {
    this.pushSettings[key] = args.value;
  }

  onSaveSettings(args: any) {
    const pushTracker = this._getOneConnectedPushTracker();
    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG +
        `onSaveSettings() pushTracker: ${JSON.stringify(pushTracker)}`
    );

    if (pushTracker === null) {
      return;
    } else if (pushTracker.version < 0x16) {
      this._snackbar
        .action({
          actionText: this._translateService.instant('buttons.more-info'),
          snackText: this._translateService.instant(
            'pushtracker.push-settings.out-of-date-dialog.title'
          ),
          hideDelay: 4000
        })
        .then(result => {
          this._loggingService.logBreadCrumb(
            PairingComponent.LOG_TAG + `onSaveSettings() result: ${result}`
          );

          if (result.command === 'Action') {
            this._feedback.warning({
              title: '',
              message: this._translateService.instant(
                'pushtracker.push-settings.out-of-date-dialog.message'
              ),
              icon: 'warning',
              duration: 6000,
              // type: FeedbackType.Success, // no need to specify when using 'success' instead of 'show'
              onTap: () => {
                // do nothing
              }
            });
          }
        });
    }
    // let user know we're doing something
    this._progressService.show(
      this._translateService.instant('pushtracker.settings.saving')
    );
    const settingsSucceeded = () => {
      this._zone.run(() => {
        this._progressService.hide();
      });
    };
    const settingsFailed = err => {
      this._zone.run(() => {
        this._progressService.hide();
        this._loggingService.logBreadCrumb(`Couldn't save settings: ${err}`);
        alert({
          title: this._translateService.instant(
            'pushtracker.settings.save-dialogs.failed.title'
          ),
          message: `${this._translateService.instant(
            'pushtracker.settings.save-dialogs.failed.message'
          )} ${err}`,
          okButtonText: this._translateService.instant('dialogs.ok')
        });
      });
    };
    const retry = (maxRetries, fn) => {
      return fn().catch(err => {
        this._loggingService.logException(err);
        if (maxRetries <= 0) {
          throw err;
        } else {
          this._loggingService.logBreadCrumb(`Retrying: ${err}, ${maxRetries}`);
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              retry(maxRetries - 1, fn)
                .then(resolve)
                .catch(reject);
            }, 1000);
          });
        }
      });
    };
    const sendSettings = () => {
      return pushTracker.sendSettings(
        this.settings.controlMode,
        this.settings.units,
        this.settings.ezOn ? 0x01 : 0x00,
        this.settings.tapSensitivity / 100.0,
        this.settings.acceleration / 100.0,
        this.settings.maxSpeed / 100.0
      );
    };
    const sendPushSettings = () => {
      if (pushTracker.version >= 0x16) {
        return pushTracker.sendPushSettings(
          this.pushSettings.threshold,
          this.pushSettings.timeWindow,
          this.pushSettings.clearCounter
        );
      } else {
        return Promise.resolve();
      }
    };
    return retry(3, sendSettings)
      .then(() => {
        return retry(3, sendPushSettings);
      })
      .then(settingsSucceeded)
      .catch(settingsFailed);
  }

  // Connectivity Events
  pushTrackerPairingSuccess() {
    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG + `pushTrackerPairingSuccess()`
    );

    this._feedback.success({
      title: this._translateService.instant('dialogs.success'),
      message: this._translateService.instant('bluetooth.pairing-success'),
      duration: 4500,
      // type: FeedbackType.Success, // no need to specify when using 'success' instead of 'show'
      onTap: () => {
        // do nothing
      }
    });
  }

  pushTrackerConnectionSuccess() {
    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG + `pushTrackerConnectionSuccess()`
    );

    this._feedback.success({
      title: this._translateService.instant('dialogs.success'),
      message: this._translateService.instant('bluetooth.connection-success'),
      duration: 4500,
      // type: FeedbackType.Success, // no need to specify when using 'success' instead of 'show'
      onTap: () => {
        // do nothing
      }
    });
  }

  onGifTap(args) {
    const x = args.object as Gif;
    if (x.isPlaying()) {
      x.stop();
    } else {
      x.start();
    }
  }

  onCarouselLoad() {
    setTimeout(() => {
      this.carousel.nativeElement.selectedPage = this.selectedPage;
      this.carousel.nativeElement.refresh();
    }, 100);
  }

  /**
   * Helper method to check for a connected PushTracker from the BluetoothService.PushTrackers array.
   */
  private _getOneConnectedPushTracker() {
    const connectedPTs = BluetoothService.PushTrackers.filter(
      pt => pt.connected
    );

    this._loggingService.logBreadCrumb(
      PairingComponent.LOG_TAG +
        `_getOneConnectedPushTracker() connectedPTs: ${JSON.stringify(
          connectedPTs
        )}`
    );

    // no pushtrackers are connected - will show snackbar alert
    if (connectedPTs.length <= 0) {
      this._snackbar
        .action({
          actionText: this._translateService.instant('buttons.more-info'),
          snackText: this._translateService.instant('trial.please-connect-pt'),
          hideDelay: 4000
        })
        .then(result => {
          if (result.command === 'Action') {
            this._feedback.info({
              title: '',
              message: this._translateService.instant(
                'trial.connect_pushtracker_more_info'
              ),
              duration: 6000,
              // type: FeedbackType.Success, // no need to specify when using 'success' instead of 'show'
              onTap: () => {
                // do nothing
              }
            });
          }
        });

      return null;
    }

    // too many pushtrackers connected - don't know which to use!
    if (connectedPTs.length > 1) {
      this._snackbar.simple(
        this._translateService.instant('trial.errors.too-many-pts')
      );
      return null;
    }

    return connectedPTs[0];
  }
}
