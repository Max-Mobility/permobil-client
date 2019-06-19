import { Component } from '@angular/core';
import { EvaluationStatus, Trial } from '@maxmobility/core';
import { EvaluationService, LoggingService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import * as mustache from 'mustache';
import { RouterExtensions } from 'nativescript-angular/router';
import * as email from 'nativescript-email';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { alert, confirm } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'summary',
  moduleId: module.id,
  templateUrl: 'summary.component.html',
  styleUrls: ['summary.component.scss']
})
export class SummaryComponent {
  private static LOG_TAG = 'summary.component ';
  evaluation: any = null;

  trialName = '';

  difficulties = [
    {
      name: 'Flat',
      key: 'flat_difficulty',
      labelText: 'summary.difficulty-flat',
      sliderLabelText: 'summary.flat-surface-difficulty',
      unableText: 'summary.unable-flat',
      has: false,
      show: false,
      unable: false,
      unableKey: 'unableToCompleteFlat'
    },
    {
      name: 'Ramp/Incline',
      key: 'ramp_incline_difficulty',
      labelText: 'summary.difficulty-ramp-incline',
      sliderLabelText: 'summary.ramp-incline-difficulty',
      unableText: 'summary.unable-ramp-incline',
      has: false,
      show: false,
      unable: false,
      unableKey: 'unableToCompleteRampIncline'
    },
    {
      name: 'Other',
      key: 'other_difficulty',
      labelText: 'summary.difficulty-other',
      sliderLabelText: 'summary.other-surface-difficulty',
      unableText: 'summary.unable-other',
      has: false,
      show: false,
      unable: false,
      unableKey: 'unableToCompleteOther'
    }
  ];

  totalDistance = 0;
  totalPushesWith = 0;
  totalPushesWithout = 0;
  totalTimeWith = 0;
  totalTimeWithout = 0;
  totalCoastWith = 0;
  totalCoastWithout = 0;
  totalSpeedWith = 0;
  totalSpeedWithout = 0;
  totalCadenceWith = 0;
  totalCadenceWithout = 0;
  pushDiff = 0;
  coastDiff = 0;
  speedDiff = 0;
  cadenceThresh = 10; // pushes per minute
  lmnTemplate: string = this._translateService
    .instant('summary.lmnTemplate')
    .join('\n');

  constructor(
    private _page: Page,
    private _routerExtensions: RouterExtensions,
    private _evaluationService: EvaluationService,
    private _translateService: TranslateService,
    private _loggingService: LoggingService
  ) {
    this._loggingService.logBreadCrumb(
      SummaryComponent.LOG_TAG + `constructor.`
    );

    this._page.className = 'blue-gradient-down';

    this.evaluation = this._evaluationService.evaluation;
    if (this.evaluation) {
      // update difficulties
      this.difficulties.map(d => {
        d.has = this.evaluation[d.key] > 0;
      });

      this.evaluation.trials.map(t => {
        if (t.flat) {
          this.difficulties.filter(d => d.name === 'Flat')[0].show = true;
        }
        if (t.rampIncline) {
          this.difficulties.filter(
            d => d.name === 'Ramp/Incline'
          )[0].show = true;
        }
        if (t.other) {
          this.difficulties.filter(d => d.name === 'Other')[0].show = true;
        }
        this.totalPushesWith += t.with_pushes;
        this.totalPushesWithout += t.without_pushes;
        this.totalTimeWith += t.with_elapsed;
        this.totalTimeWithout += t.without_elapsed;
        this.totalDistance += t.distance;
      });
      this.totalCoastWith = this.totalPushesWith
        ? (this.totalTimeWith * 60) / this.totalPushesWith
        : 0;
      this.totalCoastWithout = this.totalPushesWithout
        ? (this.totalTimeWithout * 60) / this.totalPushesWithout
        : 0;
      this.totalCadenceWith = this.totalTimeWith
        ? this.totalPushesWith / this.totalTimeWith
        : 0;
      this.totalCadenceWithout = this.totalTimeWithout
        ? this.totalPushesWithout / this.totalTimeWithout
        : 0;
      this.totalSpeedWith =
        this.totalTimeWith && this.totalDistance
          ? this.totalDistance / 1609.0 / (this.totalTimeWith / 610.0)
          : 0.0;
      this.totalSpeedWithout =
        this.totalTimeWithout && this.totalDistance
          ? this.totalDistance / 1609.0 / (this.totalTimeWithout / 610.0)
          : 0.0;
      // pushes
      this.pushDiff =
        100 - (this.totalPushesWith / this.totalPushesWithout) * 100 || 0;
      // coast
      this.coastDiff = this.totalCoastWith / this.totalCoastWithout || 0;
      // speed
      this.speedDiff =
        (this.totalSpeedWithout &&
          this.totalSpeedWith / this.totalSpeedWithout) ||
        0;
    }
  }

  isIOS(): boolean {
    return isIOS;
  }

  isAndroid(): boolean {
    return isAndroid;
  }

  evalIsMax(key, val): boolean {
    return Math.round(this.evaluation[key]) >= val;
  }

  pushComparison(): string {
    if (this.pushDiff > 0) {
      return this._translateService.instant('summary.fewer');
    } else {
      return this._translateService.instant('summary.more');
    }
  }

  coastComparison(): string {
    if (this.coastDiff > 1.0) {
      return this._translateService.instant('summary.higher');
    } else {
      return this._translateService.instant('summary.lower');
    }
  }

  speedComparison(): string {
    if (this.speedDiff > 1.0) {
      return this._translateService.instant('summary.higher');
    } else {
      return this._translateService.instant('summary.lower');
    }
  }

  generateLMN(): string {
    // const that = this;
    return mustache.render(this.lmnTemplate, {
      evaluation: this.evaluation,
      trials: this.evaluation.trials,
      totalCadenceWithout: this.totalCadenceWithout.toFixed(1),
      pushDiff: this.pushDiff.toFixed(0),
      coastDiff: this.coastDiff.toFixed(1),
      speedDiff: this.speedDiff.toFixed(1),
      toFixed: function() {
        let str = this.toFixed(2);
        if (!str.length) {
          str = '0';
        }
        return str;
      },
      round: function() {
        let str = this.toFixed(0);
        if (!str.length) {
          str = '0';
        }
        return str;
      },
      toTimeString: function() {
        return Trial.timeToString(this * 60);
      },
      pushComparison: () => {
        return this.pushComparison();
      },
      coastComparison: () => {
        return this.coastComparison();
      },
      speedComparison: () => {
        return this.speedComparison();
      },
      showCadence: this.totalCadenceWithout > this.cadenceThresh
    });
  }

  // button events
  async onComplete() {
    const confirmResult = await confirm({
      title: this._translateService.instant('summary.complete'),
      message: this._translateService.instant('summary.confirm'),
      okButtonText: this._translateService.instant('dialogs.yes'),
      cancelButtonText: this._translateService.instant('dialogs.no')
    });

    if (!confirmResult) {
      return;
    }

    // send email to user
    const isAvailable = await email.available();
    if (!isAvailable) {
      return;
    }

    const lmnBody = this.generateLMN();
    this._loggingService.logBreadCrumb(
      SummaryComponent.LOG_TAG +
        `onComplete() -- lmnBody: ${JSON.stringify(lmnBody)}`
    );

    email
      .compose({
        to: [],
        subject: this._translateService.instant('summary.email-subject'),
        body: lmnBody,
        cc: []
      })
      .then(result => {
        if (result) {
          // do nothing
        }
      })
      .catch(error => {
        this._loggingService.logException(error);
        console.error(error);
      });

    // Brad - if user is here saving the eval it should be complete
    // we can add better tracking to check for specific values
    // this is quick and dirty to confirm reusing the method with status value
    // related: https://github.com/PushTracker/EvalApp/issues/190
    this.evaluation.status = EvaluationStatus.Complete;
    this.evaluation.creator_id = Kinvey.User.getActiveUser()._id;

    this._evaluationService
      .save()
      .then(() => {
        // now go back to dashboard
        this._routerExtensions.navigate(['/home'], {
          // clearHistory: true,
          transition: {
            name: 'fade'
          }
        });
      })
      .catch(err => {
        alert({
          title: this._translateService.instant(
            'summary.errors.save-failed.title'
          ),
          message:
            this._translateService.instant(
              'summary.errors.save-failed.message'
            ) + err,
          okButtonText: this._translateService.instant('dialogs.ok')
        });
        // now go back to dashboard
        this._routerExtensions.navigate(['/home'], {
          // clearHistory: true,
          transition: {
            name: 'fade'
          }
        });
      });
  }

  onDifficultyChecked(diff: any, args): void {
    diff.has = args.value;
    if (!diff.has) {
      this.evaluation[diff.key] = 0;
    }
  }

  onUnableChecked(diff: any, args): void {
    diff.unable = args.value;
    this.evaluation[diff.unableKey] = diff.unable;
  }

  onSliderUpdate(key, args) {
    this.evaluation[key] = args.object.value;
  }

  onBack(): void {
    this._routerExtensions.navigate(['/trial'], {
      transition: {
        name: 'slideRight'
      }
    });
  }
}
