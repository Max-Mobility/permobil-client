import { Component, NgZone, OnInit } from '@angular/core';
import { Evaluation, Trial } from '@maxmobility/core';
import { EvaluationService, LoggingService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import * as mustache from 'mustache';
import * as email from 'nativescript-email';
import { DateResponse, ModalDatetimepicker } from 'nativescript-modal-datetimepicker';
import { Toasty } from 'nativescript-toasty';
import { isIOS } from 'tns-core-modules/platform';
import { alert, confirm } from 'tns-core-modules/ui/dialogs/dialogs';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'evals',
  moduleId: module.id,
  templateUrl: 'evals.component.html',
  styleUrls: ['evals.component.scss']
})
export class EvalsComponent implements OnInit {
  private static LOG_TAG = 'evals.component ';

  /**
   * Evals array binded to the listview.
   */
  evals: Evaluation[] = [];

  /**
   * Boolean to track when the evals have loaded.
   * Used to hide the activity indicator in UI and show the list.
   */
  evalsLoaded = false;

  /**
   * Text of the action item button that will search or reset the list depending on state of data.
   */
  searchBtnText: string = this._translateService.instant('evals.search-btn');

  /**
   * State var to keep track if the data is from a search.
   */
  isSearchData = false;

  /*** LMN PROPS  ***/
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

  /*** LMN PROPS  ***/

  private _initialEvals: Evaluation[] = null;

  private _picker = new ModalDatetimepicker();
  private _datastore = Kinvey.DataStore.collection<Evaluation>('Evaluations');

  constructor(
    private _page: Page,
    private _zone: NgZone,
    private _evalService: EvaluationService,
    private _translateService: TranslateService,
    private _loggingService: LoggingService
  ) {
    this._page.className = 'blue-gradient-down';
  }

  async ngOnInit() {
    this._loggingService.logBreadCrumb(EvalsComponent.LOG_TAG + `ngOnInit`);

    // load the evaluations for this user
    try {
      const fetchedEvals = await this._evalService.loadEvaluations();
      const modifiedEvals = this._modifyEvalsData(fetchedEvals);
      this._initialEvals = modifiedEvals; // setting the initial evals so during searches we can default back to full list data
      this._zone.run(() => {
        this.evals = modifiedEvals;
        this.evalsLoaded = true;
      });
    } catch (error) {
      this.evalsLoaded = true;
      this._loggingService.logException(error);
      alert({
        message: this._translateService.instant('evals.evals-loading-error'),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
    }
  }

  async onSearchTap() {
    try {
      // check if we are resetting and exit after resetting the listview
      if (this.isSearchData === true) {
        this._zone.run(() => {
          this.evals = this._initialEvals;
          this.searchBtnText = this._translateService.instant(
            'evals.search-btn'
          );
          this.evalsLoaded = true; // make sure the UI reflects the data
          this.isSearchData = false; // reset so the UI reflects that its the original list data and not search data
        });
        return;
      }

      const dateResult = (await this._picker.pickDate({
        title: this._translateService.instant('evals.select-date'),
        theme: 'dark',
        maxDate: new Date(),
        is24HourView: false
      })) as DateResponse;

      const jsdate = new Date(
        dateResult.year,
        dateResult.month - 1,
        dateResult.day + 1
      );

      // now query Kinvey evals for only current logged in user for the date selected
      const query = new Kinvey.Query();
      query.equalTo('creator_id', Kinvey.User.getActiveUser()._id);
      query.lessThanOrEqualTo('_kmd.ect', jsdate.toISOString());
      query.descending('_kmd.ect');
      this._loggingService.logBreadCrumb(
        EvalsComponent.LOG_TAG + `onSearchTap() -- query: ${query}`
      );

      const stream = this._datastore.find(query);
      const data = await stream.toPromise();

      if (!data || data.length <= 0) {
        new Toasty({
          text: `${this._translateService.instant(
            'evals.no-evals-search-result'
          )} ${dateResult.month}/${dateResult.day}/${dateResult.year}`
        }).show();
        this._zone.run(() => {
          this.evals = this._initialEvals;
        });
        return;
      }

      if (data && data.length >= 1) {
        const modifiedEvals = this._modifyEvalsData(data);
        // assign the evals to bind to listview items
        this._zone.run(() => {
          this.evals = modifiedEvals;
          this.isSearchData = true;
          this.searchBtnText = this._translateService.instant(
            'evals.reset-btn'
          );
        });
      }
    } catch (error) {
      this._loggingService.logException(error);
    }
  }

  async onEmailBtnTap(evaluation: Evaluation) {
    const confirmResult = await confirm({
      title: this._translateService.instant('evals.confirm-lmn-email-title'),
      message: this._translateService.instant(
        'evals.confirm-lmn-email-message'
      ),
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

    // need to generate the LMN report with email app opening to send it out

    this._updateEvalForLmnReport(evaluation);

    const lmnBody = this._generateLMN(evaluation);
    this._loggingService.logBreadCrumb(
      EvalsComponent.LOG_TAG + `onEmailBtnTap() -- lmnBody: ${lmnBody}`
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
  }

  /**
   * Disabling the cell highlight tap on iOS
   * @param args
   */
  onItemLoading(args) {
    if (isIOS) {
      const cell = args.ios as UITableViewCell;
      cell.selectionStyle = UITableViewCellSelectionStyle.None;
    }
  }

  onEvalItemTap(event) {
    // do nothing yet
  }

  timeString(time: any) {
    return Trial.timeToString(time * 60);
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

  private _updateEvalForLmnReport(evaluation: Evaluation) {
    evaluation.trials.map(t => {
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

  private _generateLMN(evaluation: Evaluation): string {
    this._loggingService.logBreadCrumb(
      EvalsComponent.LOG_TAG + `_generateLMN().`
    );

    // const that = this;
    return mustache.render(this.lmnTemplate, {
      evaluation,
      trials: evaluation.trials,
      totalCadenceWithout: this.totalCadenceWithout.toFixed(1),
      pushDiff: this.pushDiff.toFixed(0),
      coastDiff: this.coastDiff.toFixed(1),
      speedDiff: this.speedDiff.toFixed(1),
      // tslint:disable-next-line:object-literal-shorthand
      toFixed: function() {
        let str = this.toFixed(2);
        if (!str.length) {
          str = '0';
        }
        return str;
      },
      round() {
        let str = this.toFixed(0);
        if (!str.length) {
          str = '0';
        }
        return str;
      },
      // tslint:disable-next-line:object-literal-shorthand
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

  private _modifyEvalsData(evalsArray: Evaluation[]) {
    // need to modify the number values to be truncated, after the loop we will bind the listview items
    evalsArray.forEach((e: Evaluation) => {
      e.trials.forEach((t: Trial) => {
        // truncate the number data here
        t.distance = this._truncateNumber(t.distance);
        t.acceleration = this._truncateNumber(t.acceleration);
        t.max_speed = this._truncateNumber(t.max_speed);
        t.with_pushes = this._truncateNumber(t.with_pushes);
        t.with_coast = this._truncateNumber(t.with_coast);
        t.with_elapsed = this._truncateNumber(t.with_elapsed);
        t.without_coast = this._truncateNumber(t.without_coast);
        t.without_pushes = this._truncateNumber(t.without_pushes);
        t.without_elapsed = this._truncateNumber(t.without_elapsed);
      });
    });

    return evalsArray;
  }

  private _truncateNumber(x: number): number {
    return parseFloat(x.toFixed(2));
  }
}
