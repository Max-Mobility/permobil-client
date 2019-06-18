import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  Evaluation,
  PushTracker,
  SettingsService,
  Trial
} from '@maxmobility/core';
import {
  BluetoothService,
  EvaluationService,
  LoggingService,
  ProgressService
} from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { RouterExtensions } from 'nativescript-angular/router';
import {
  DropDown,
  SelectedIndexChangedEventData
} from 'nativescript-drop-down';
import { Feedback } from 'nativescript-feedback';
import { SnackBar } from 'nativescript-snackbar';
import { isIOS } from 'tns-core-modules/platform';
import { View } from 'tns-core-modules/ui/core/view';
import { alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { Slider } from 'tns-core-modules/ui/slider';
import { Switch } from 'tns-core-modules/ui/switch';
import { TextField } from 'tns-core-modules/ui/text-field';

@Component({
  selector: 'trial',
  moduleId: module.id,
  templateUrl: 'trial.component.html',
  styleUrls: ['trial.component.scss']
})
export class TrialComponent implements OnInit {
  private static LOG_TAG = 'trial.component ';

  @ViewChild('startWith', { static: false })
  startWithView: ElementRef;
  @ViewChild('stopWith', { static: false })
  stopWithView: ElementRef;
  @ViewChild('cannotCompleteWith', { static: false })
  cannotCompleteWithView: ElementRef;
  @ViewChild('nextWith', { static: false })
  nextWithView: ElementRef;
  @ViewChild('startWithout', { static: false })
  startWithoutView: ElementRef;
  @ViewChild('stopWithout', { static: false })
  stopWithoutView: ElementRef;
  @ViewChild('cannotCompleteWithout', { static: false })
  cannotCompleteWithoutView: ElementRef;
  @ViewChild('nextWithout', { static: false })
  nextWithoutView: ElementRef;
  @ViewChild('carousel', { static: false })
  carousel: ElementRef;
  // for settings
  @ViewChild('controlModeDropDown', { static: false })
  controlModeDropDown: ElementRef;
  @ViewChild('unitsDropDown', { static: false })
  unitsDropDown: ElementRef;
  // displaying trial info
  distanceDisplay = '--';
  pushWithDisplay = '--';
  coastWithDisplay = '--';
  speedWithDisplay = '--';
  timeWithDisplay = '--';
  pushWithoutDisplay = '--';
  coastWithoutDisplay = '--';
  speedWithoutDisplay = '--';
  timeWithoutDisplay = '--';
  starting_trial: string = this._translateService.instant(
    'trial.starting-trial'
  );
  stopping_trial: string = this._translateService.instant(
    'trial.stopping-trial'
  );
  okbuttontxt: string = this._translateService.instant('dialogs.ok');
  failed_start_title: string = this._translateService.instant(
    'trial.errors.failed-start.title'
  );
  failed_start_message: string = this._translateService.instant(
    'trial.errors.failed-start.message'
  );
  failed_stop_title: string = this._translateService.instant(
    'trial.errors.failed-stop.title'
  );
  failed_stop_message: string = this._translateService.instant(
    'trial.errors.failed-stop.message'
  );
  trial = new Trial();

  settings: any = null;
  pushSettings: any = null;
  // Control modes are not translated
  ControlModeOptions = PushTracker.Settings.ControlMode.Options;
  // Have to use translations for Units
  UnitsOptions = PushTracker.Settings.Units.Translations.map(t =>
    this._translateService.instant(t)
  );

  private _trialTimeout = 15000; // 15 seconds
  private _feedback = new Feedback();
  private _snackbar = new SnackBar();

  private hasAddedToTrial = false;

  constructor(
    private _page: Page,
    private _routerExtensions: RouterExtensions,
    private _settingsService: SettingsService,
    private _progressService: ProgressService,
    private _evaluationService: EvaluationService,
    private _zone: NgZone,
    private _translateService: TranslateService,
    private _loggingService: LoggingService
  ) {
    this._page.className = 'blue-gradient-down';
    this.settings = this._settingsService.settings;
    this.pushSettings = this._settingsService.pushSettings;
    this.trial.setSettings(this.settings);

    this._loggingService.logBreadCrumb(
      TrialComponent.LOG_TAG +
        `constructor -- this.settings: ${JSON.stringify(
          this.settings
        )}, this.pushSettings: ${JSON.stringify(this.pushSettings)}`
    );
  }

  isIOS(): boolean {
    return isIOS;
  }

  ngOnInit() {
    this._hideview(this.stopWithView.nativeElement);
    this._hideview(this.cannotCompleteWithView.nativeElement);
    this._hideview(this.nextWithView.nativeElement);
    this._hideview(this.stopWithoutView.nativeElement);
    this._hideview(this.cannotCompleteWithoutView.nativeElement);
    this._hideview(this.nextWithoutView.nativeElement);
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

  goToNextSlide(event: any) {
    this.carousel.nativeElement.selectedPage++;
    this.carousel.nativeElement.refresh();
  }

  /**
   * Summary Button tap. Push the trial to the evaluation.trials array and navigate to summary component.
   */
  onSummaryTap(): void {
    // make sure we have an evaluation on the service since it defaults null
    if (!this._evaluationService.evaluation) {
      this._evaluationService.evaluation = new Evaluation();
      this.hasAddedToTrial = false;
    }

    if (!this.hasAddedToTrial) {
      this._evaluationService.evaluation.trials.push(this.trial);
      this.hasAddedToTrial = true;
    }

    this._routerExtensions.navigate(['/summary'], {
      transition: {
        name: 'slide'
      }
    });
  }

  onSettingsDropdownChanged(key: string, args: SelectedIndexChangedEventData) {
    const optionKey = key.substr(0, 1).toUpperCase() + key.substr(1);
    this.settings[key] = PushTracker.Settings[optionKey].Options[args.newIndex];
    this.trial.setSettings(this.settings);
  }

  onSettingsSliderChange(key: string, args: any) {
    // slider
    this.settings[key] = Math.floor((args.object as Slider).value) * 10;
    this.trial.setSettings(this.settings);
  }

  onSettingsSwitchChanged(key, args) {
    const xSwitch = args.object as Switch;
    this.settings[key] = xSwitch.checked;
    this.trial.setSettings(this.settings);
  }

  onPushSettingsSliderUpdate(key: string, args) {
    this.pushSettings[key] = Math.floor((args.object as Slider).value);
  }

  onPushSettingsChecked(key, args) {
    // slider
    const xSwitch = args.object as Switch;
    this.pushSettings[key] = xSwitch.checked;
  }

  onSwitchChecked(key, args) {
    const xSwitch = args.object as Switch;
    this.trial[key] = xSwitch.checked;
  }

  onTextChange(key, args) {
    const xTextfield = args.object as TextField;
    this.trial[key] = xTextfield.text;
  }

  /**
   * Starts a trial WITH a SmartDrive unit
   */
  onStartWithTrial() {
    const pushTracker = this._getOneConnectedPushTracker();
    if (pushTracker === null) {
      return;
    }

    this._loggingService.logBreadCrumb(
      TrialComponent.LOG_TAG +
        `onStartWithTrial() -- pushTracker: ${JSON.stringify(pushTracker)}`
    );

    // if pushtracker is not up to date don't start trial
    const x = this._checkPushTrackerVersion(pushTracker);
    if (x === false) {
      return;
    }

    if (!this.trial.startedWith && pushTracker) {
      // let user know we're doing something
      this._progressService.show(this.starting_trial);

      this._hideview(this.startWithView.nativeElement as View);

      let haveDailyInfo = false;
      let haveDistance = false;
      let startWithTimeoutID = null;

      // set up handlers
      const trialStartedHandler = () => {
        this._zone.run(() => {
          if (startWithTimeoutID) {
            clearTimeout(startWithTimeoutID);
          }
          this._progressService.hide();
          this.trial.with_start = new Date();
          pushTracker.off(
            PushTracker.pushtracker_distance_event,
            distanceHandler
          );
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this.trial.startedWith = true;
          this._animateViewIn(this.stopWithView.nativeElement as View);
          this._animateViewIn(this.cannotCompleteWithView
            .nativeElement as View);
        });
      };

      const trialStartWithFailed = err => {
        this._zone.run(() => {
          if (startWithTimeoutID) {
            clearTimeout(startWithTimeoutID);
          }
          this._progressService.hide();
          pushTracker.off(
            PushTracker.pushtracker_distance_event,
            distanceHandler
          );
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this._animateViewIn(this.startWithView.nativeElement as View);
          this._loggingService.logBreadCrumb(
            TrialComponent.LOG_TAG + `Couldn't start trial: ${err}`
          );
          alert({
            title: this.failed_start_title,
            message: this.failed_start_message + err,
            okButtonText: this.okbuttontxt
          });
        });
      };

      const dailyInfoHandler = data => {
        // get the data
        this.trial.with_pushes = data.data.pushesWithout + data.data.pushesWith;
        // record that we've gotten it
        haveDailyInfo = true;
        if (haveDailyInfo && haveDistance) {
          trialStartedHandler();
        }
      };

      const distanceHandler = data => {
        // get the data
        this.trial.distance = PushTracker.caseTicksToMeters(
          data.data.coastDistance
        );
        // record that we've gotten it
        haveDistance = this.trial.distance > 0;
        if (haveDailyInfo && haveDistance) {
          trialStartedHandler();
        } else if (!haveDistance) {
          // we've gotten an invalid distance
          trialStartWithFailed(
            this._translateService.instant(
              'trial.errors.pt-unknown-distance.message'
            )
          );
        }
      };

      const retry = (maxRetries, fn) => {
        return fn().catch(err => {
          this._loggingService.logException(err);
          if (maxRetries <= 0) {
            throw err;
          } else {
            this._loggingService.logBreadCrumb(
              TrialComponent.LOG_TAG + `Retrying: ${err}, ${maxRetries}`
            );
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

      const sendDistance = () => {
        return pushTracker.sendPacket('Command', 'DistanceRequest');
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
      // wait for push / coast data and distance:
      pushTracker.on(PushTracker.pushtracker_distance_event, distanceHandler);
      pushTracker.on(
        PushTracker.pushtracker_daily_info_event,
        dailyInfoHandler
      );

      // set timeout on trial starting
      startWithTimeoutID = setTimeout(() => {
        trialStartWithFailed(
          this._translateService.instant('trial.errors.timeout')
        );
      }, this._trialTimeout);

      // now actually try to send these data
      retry(3, sendSettings)
        .then(() => {
          return retry(3, sendPushSettings);
        })
        .then(() => {
          return retry(3, sendDistance);
        })
        .catch(trialStartWithFailed);
    }
  }

  onCannotCompleteWith() {
    this.trial.unableToCompleteWith = true;
    this.onStopWithTrial();
  }

  /**
   * Stops a Trial WITH a SmartDrive
   */
  onStopWithTrial() {
    const pushTracker = this._getOneConnectedPushTracker();
    if (pushTracker === null) {
      return;
    }

    this._loggingService.logBreadCrumb(
      TrialComponent.LOG_TAG +
        `onStopWithTrial() -- pushTracker: ${JSON.stringify(pushTracker)}`
    );

    if (!this.trial.finishedWith && pushTracker) {
      // let user know we're doing something
      this._progressService.show(this.stopping_trial);

      this.trial.with_end = new Date();
      let haveDailyInfo = false;
      let haveDistance = false;
      let stopWithTimeoutID = null;
      let meters = 0;

      // set up handlers
      const trialStoppedHandler = () => {
        this._zone.run(() => {
          if (stopWithTimeoutID) {
            clearTimeout(stopWithTimeoutID);
          }
          this.trial.finishedWith = true;
          // diff is in ms
          this.trial.with_elapsed =
            (this.trial.with_end.getTime() - this.trial.with_start.getTime()) /
            60000;
          this.trial.with_coast = this.trial.with_pushes
            ? (this.trial.with_elapsed * 60) / this.trial.with_pushes
            : 0;
          pushTracker.off(
            PushTracker.pushtracker_distance_event,
            distanceHandler
          );
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this._progressService.hide();
          this._hideview(<View>this.stopWithView.nativeElement);
          this._hideview(this.cannotCompleteWithView.nativeElement);
          // STORE
          this.trial.distance = meters;
          const ft = (meters * 5280.0) / 1609.0;
          if (this.settings.units === PushTracker.Settings.Units.English) {
            this.distanceDisplay = `${ft.toFixed(2)} ft`;
          } else {
            this.distanceDisplay = `${meters.toFixed(2)} m`;
          }
          this.pushWithDisplay = `${this.trial.with_pushes}`;
          this.coastWithDisplay = `${this.trial.with_coast.toFixed(2)} s`;
          const mph = meters / 1609.0 / (this.trial.with_elapsed / 60.0);
          const kph = meters / 1000.0 / (this.trial.with_elapsed / 60.0);
          if (this.settings.units === PushTracker.Settings.Units.English) {
            this.speedWithDisplay = `${mph.toFixed(2)} mph`;
          } else {
            this.speedWithDisplay = `${kph.toFixed(2)} kph`;
          }
          this.timeWithDisplay = Trial.timeToString(
            this.trial.with_elapsed * 60
          );
          this._animateViewIn(<View>this.nextWithView.nativeElement);
        });
      };

      const trialStopWithFailed = err => {
        this._zone.run(() => {
          this._loggingService.logException(err);
          if (stopWithTimeoutID) {
            clearTimeout(stopWithTimeoutID);
          }
          this._progressService.hide();
          pushTracker.off(
            PushTracker.pushtracker_distance_event,
            distanceHandler
          );
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this._loggingService.logBreadCrumb(
            TrialComponent.LOG_TAG + `Couldn't stop trial: ${err}`
          );
          alert({
            title: this.failed_stop_title,
            message: this.failed_stop_message + err,
            okButtonText: this.okbuttontxt
          });
        });
      };

      const dailyInfoHandler = data => {
        // get the data
        this.trial.with_pushes =
          data.data.pushesWithout +
          data.data.pushesWith -
          this.trial.with_pushes;
        // record that we've gotten it
        haveDailyInfo = true;
        if (haveDailyInfo && haveDistance) {
          trialStoppedHandler();
        }
      };

      const distanceHandler = data => {
        // get the data
        const current = PushTracker.caseTicksToMeters(data.data.coastDistance);
        meters = current - this.trial.distance;
        // record that we've gotten it
        haveDistance = meters > 0;
        if (haveDailyInfo && haveDistance) {
          // save the distance
          this.trial.distance = meters;
          trialStoppedHandler();
        } else if (!haveDistance) {
          trialStopWithFailed(
            this._translateService.instant(
              'trial.errors.pt-same-distance.message'
            )
          );
        }
      };

      const retry = (maxRetries, fn) => {
        return fn().catch(err => {
          this._loggingService.logException(err);
          if (maxRetries <= 0) {
            throw err;
          } else {
            this._loggingService.logBreadCrumb(
              TrialComponent.LOG_TAG + `Retrying: ${err}, ${maxRetries}`
            );
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

      const sendDistance = () => {
        return pushTracker.sendPacket('Command', 'DistanceRequest');
      };

      // wait for push / coast data and distance:
      pushTracker.on(PushTracker.pushtracker_distance_event, distanceHandler);
      pushTracker.on(
        PushTracker.pushtracker_daily_info_event,
        dailyInfoHandler
      );

      // set timeout on trial starting
      stopWithTimeoutID = setTimeout(() => {
        trialStopWithFailed('Timeout!');
      }, this._trialTimeout);

      // now actually send the distance command
      retry(3, sendDistance).catch(trialStopWithFailed);
    }
  }

  /**
   * Starts a Trial WITHOUT a SmartDrive
   */
  onStartWithoutTrial() {
    const pushTracker = this._getOneConnectedPushTracker();
    if (pushTracker === null) {
      return;
    }

    this._loggingService.logBreadCrumb(
      TrialComponent.LOG_TAG +
        `onStartWithoutTrial() -- pushTracker: ${pushTracker}`
    );

    // if pushtracker is not up to date don't start trial
    const x = this._checkPushTrackerVersion(pushTracker);
    if (x === false) {
      return;
    }

    if (!this.trial.startedWithout && pushTracker) {
      // let user know we're doing something
      this._progressService.show(this.starting_trial);

      this._hideview(this.startWithoutView.nativeElement as View);

      let startWithoutTimeoutID = null;

      // set up handlers
      const trialStartedHandler = () => {
        this._zone.run(() => {
          if (startWithoutTimeoutID) {
            clearTimeout(startWithoutTimeoutID);
          }
          this._progressService.hide();
          this.trial.startedWithout = true;
          this.trial.without_start = new Date();
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this._animateViewIn(<View>this.stopWithoutView.nativeElement);
          this._animateViewIn(this.cannotCompleteWithoutView
            .nativeElement as View);
        });
      };

      const trialStartWithoutFailed = err => {
        this._zone.run(() => {
          if (startWithoutTimeoutID) {
            clearTimeout(startWithoutTimeoutID);
          }
          this._progressService.hide();
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this._animateViewIn(<View>this.startWithoutView.nativeElement);
          alert({
            title: this.failed_start_title,
            message: this.failed_start_message + err,
            okButtonText: this.okbuttontxt
          });
        });
      };

      const dailyInfoHandler = data => {
        // get the data
        this.trial.without_pushes =
          data.data.pushesWithout + data.data.pushesWith;
        // record that we've gotten it
        trialStartedHandler();
      };

      // set timeout on trial starting
      startWithoutTimeoutID = setTimeout(() => {
        trialStartWithoutFailed(
          this._translateService.instant('trial.errors.timeout')
        );
      }, this._trialTimeout);
      pushTracker.on(
        PushTracker.pushtracker_daily_info_event,
        dailyInfoHandler
      );
    }
  }

  onCannotCompleteWithout() {
    this.trial.unableToCompleteWithout = true;
    this.onStopWithoutTrial();
  }

  /**
   * Stops a Trial WITHOUT a SmartDrive
   */
  onStopWithoutTrial() {
    const pushTracker = this._getOneConnectedPushTracker();
    if (pushTracker === null) {
      return;
    }

    this._loggingService.logBreadCrumb(
      TrialComponent.LOG_TAG +
        `onStopWithoutTrial() -- pushTracker: ${pushTracker}`
    );

    if (!this.trial.finishedWithout && pushTracker) {
      // let user know we're doing something
      this._progressService.show(this.stopping_trial);

      this.trial.without_end = new Date();
      let stopWithoutTimeoutID = null;

      // set up handlers
      const trialStoppedHandler = () => {
        this._zone.run(() => {
          if (stopWithoutTimeoutID) {
            clearTimeout(stopWithoutTimeoutID);
          }
          this.trial.finishedWithout = true;
          this.trial.without_elapsed =
            (this.trial.without_end.getTime() -
              this.trial.without_start.getTime()) /
            60000;
          this.trial.without_coast = this.trial.without_pushes
            ? (this.trial.without_elapsed * 60) / this.trial.without_pushes
            : 0;
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          this._progressService.hide();
          this._hideview(<View>this.stopWithoutView.nativeElement);
          this._hideview(this.cannotCompleteWithoutView.nativeElement);
          this.pushWithoutDisplay = `${this.trial.without_pushes}`;
          this.coastWithoutDisplay = `${this.trial.without_coast.toFixed(2)} s`;
          const mph =
            this.trial.distance / 1609.0 / (this.trial.without_elapsed / 60.0);
          const kph =
            this.trial.distance / 1000.0 / (this.trial.without_elapsed / 60.0);
          if (this.settings.units === PushTracker.Settings.Units.English) {
            this.speedWithoutDisplay = `${mph.toFixed(2)} mph`;
          } else {
            this.speedWithoutDisplay = `${kph.toFixed(2)} mph`;
          }
          this.timeWithoutDisplay = Trial.timeToString(
            this.trial.without_elapsed * 60
          );
          this._animateViewIn(<View>this.nextWithoutView.nativeElement);
        });
      };

      const trialStopWithoutFailed = err => {
        this._zone.run(() => {
          if (stopWithoutTimeoutID) {
            clearTimeout(stopWithoutTimeoutID);
          }
          this._progressService.hide();
          pushTracker.off(
            PushTracker.pushtracker_daily_info_event,
            dailyInfoHandler
          );
          alert({
            title: this.failed_stop_title,
            message: this.failed_stop_message + err,
            okButtonText: this.okbuttontxt
          });
        });
      };

      const dailyInfoHandler = data => {
        // get the data
        this.trial.without_pushes =
          data.data.pushesWithout +
          data.data.pushesWith -
          this.trial.without_pushes;
        // record that we've gotten it
        trialStoppedHandler();
      };

      // set timeout on trial starting
      stopWithoutTimeoutID = setTimeout(() => {
        trialStopWithoutFailed('Timeout!');
      }, this._trialTimeout);

      // wait for push / coast data and distance:
      pushTracker.on(
        PushTracker.pushtracker_daily_info_event,
        dailyInfoHandler
      );
    }
  }

  // onSliderUpdate(key, args) {
  //   this.trial[key] = Math.round(args.object.value) / 10;
  // }

  private _hideview(view: View) {
    view.opacity = 0;
    view.visibility = 'collapse';
  }

  private _animateViewIn(view: View) {
    view.visibility = 'visible';
    view.animate({
      opacity: 1,
      duration: 500
    });
  }

  /**
   * Helper method to check for a connected PushTracker from the BluetoothService.PushTrackers array.
   */
  private _getOneConnectedPushTracker() {
    const connectedPTs = BluetoothService.PushTrackers.filter(
      pt => pt.connected
    );

    // no pushtrackers are connected - will show snackbar alert
    if (connectedPTs.length <= 0) {
      // this._noPushTrackersConnectedAlert();

      this._snackbar
        .action({
          actionText: this._translateService.instant('buttons.more-info'),
          snackText: this._translateService.instant('trial.please-connect-pt'),
          hideDelay: 4000
        })
        .then(result => {
          this._loggingService.logBreadCrumb(
            TrialComponent.LOG_TAG +
              `_getOneConnectedPushTracker() -- action result: ${result}`
          );

          if (result.command === 'Action') {
            this._feedback.info({
              title: '',
              message: this._translateService.instant(
                'trial.connect_pushtracker_more_info'
              ),
              duration: 6000,
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

  private _checkPushTrackerVersion(pt: PushTracker) {
    // check the version here (must be >= 1.5)
    if (pt.version < 0x15) {
      alert({
        title: this._translateService.instant('trial.errors.pt-version.title'),
        message:
          this._translateService.instant('trial.errors.pt-version.message') +
          PushTracker.versionByteToString(pt.version),
        okButtonText: this.okbuttontxt
      });
      return false;
    } else if (pt.version === 0xff) {
      alert({
        title: this._translateService.instant(
          'trial.errors.pt-reconnect.title'
        ),
        message: this._translateService.instant(
          'trial.errors.pt-reconnect.message'
        ),
        okButtonText: this.okbuttontxt
      });
      return false;
    } else {
      return true;
    }
  }
}
