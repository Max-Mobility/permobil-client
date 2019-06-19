import { Component, ElementRef, ViewChild } from '@angular/core';
import { Evaluation } from '@maxmobility/core';
import { EvaluationService, LoggingService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { DropDown } from 'nativescript-drop-down';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { confirm } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'eval-entry',
  moduleId: module.id,
  templateUrl: 'eval-entry.component.html',
  styleUrls: ['eval-entry.component.scss']
})
export class EvalEntryComponent {
  private static LOG_TAG = 'eval-entry.component ';

  @ViewChild('yearDropdown', { static: false })
  yearDropdown: ElementRef;
  @ViewChild('chairDropdown', { static: false })
  chairDropdown: ElementRef;
  @ViewChild('chairTypeDropdown', { static: false })
  chairTypeDropdown: ElementRef;
  hasPushingPain = false;
  hasPushingFatigue = false;
  impactsIndependence = false;
  years = this._translateService.instant('eval-entry.years-options');
  chair = this._translateService.instant('eval-entry.chair-options');
  chairType = this._translateService.instant('eval-entry.chair-type.options');

  evaluation: Evaluation;

  constructor(
    private _page: Page,
    private routerExtensions: RouterExtensions,
    private _evaluationService: EvaluationService,
    private _translateService: TranslateService,
    private _logService: LoggingService
  ) {
    this._logService.logBreadCrumb(EvalEntryComponent.LOG_TAG + `constructor.`);

    this._page.className = 'blue-gradient-down';
    // set the eval to the eval on the service
    this.evaluation = this._evaluationService.evaluation;
    this._logService.logBreadCrumb(
      EvalEntryComponent.LOG_TAG +
        `this.evaluation: ${JSON.stringify(this.evaluation)}`
    );

    // if the evaluation from the service is not null then ask the user if they want to continue or start new eval
    if (this.evaluation !== null) {
      setTimeout(() => {
        confirm({
          message: this._translateService.instant(
            'evals.incomplete-dialog.message'
          ),
          okButtonText: this._translateService.instant('dialogs.yes'),
          cancelButtonText: this._translateService.instant('dialogs.no')
        }).then(result => {
          if (result === true) {
            this._logService.logBreadCrumb(
              EvalEntryComponent.LOG_TAG +
                `continuing evaluation ${JSON.stringify(this.evaluation)}`
            );

            this.evaluation = this._evaluationService.evaluation;
            // we have the data on the `evaluation` on the service so just let it load
            // we have to check the toggles bc we have props here that set them false when the component loads ^^^
            this.hasPushingFatigue = this.evaluation.pushing_fatigue
              ? true
              : false;
            this.hasPushingPain = this.evaluation.pushing_pain ? true : false;
            this.impactsIndependence = this.evaluation.impact_on_independence
              ? true
              : false;

            // map the years string value to the dropdown UI Index value using indexOf
            const yearIndex = this.years.indexOf(this.evaluation.years);
            if (yearIndex !== -1) {
              (this.yearDropdown
                .nativeElement as DropDown).selectedIndex = yearIndex;
            }

            // map the chair string value to the dropdown UI Index value using indexOf
            const chairIndex = this.chair.indexOf(this.evaluation.chair);
            if (chairIndex !== -1) {
              (this.chairDropdown
                .nativeElement as DropDown).selectedIndex = chairIndex;
            }

            // map the chair type string value to the dropdown UI Index value using indexOf
            const chairTypeIndex = this.chairType.indexOf(
              this.evaluation.chairType
            );
            if (chairTypeIndex !== -1) {
              (this.chairTypeDropdown
                .nativeElement as DropDown).selectedIndex = chairTypeIndex;
            }
          } else {
            this._logService.logBreadCrumb(
              EvalEntryComponent.LOG_TAG +
                `user declined to continue the incomplete evaluation, creating new evaluation.`
            );
            // brad - don't like this approach 🤮
            this._evaluationService.evaluation = new Evaluation();
            this.evaluation = this._evaluationService.evaluation;
          }
        });
      }, 300);
    } else {
      this._evaluationService.evaluation = new Evaluation();
      // have to assign the new eval on the service to the eval member of this component
      this.evaluation = this._evaluationService.evaluation;
    }
  }

  get isIOS(): boolean {
    return isIOS;
  }

  get isAndroid(): boolean {
    return isAndroid;
  }

  onSliderUpdate(key, args) {
    this.evaluation[key] = args.object.value;
  }

  // button events
  onNext(): void {
    this.routerExtensions.navigate(['/training']);
  }

  // listPicker events
  selectedIndexChanged(key, args) {
    const newValue = this[key][args.newIndex];
    this.evaluation[key] = newValue;
  }

  onPushingPainChecked(args): void {
    this.hasPushingPain = args.value;
    if (!this.hasPushingPain) {
      this.evaluation.pushing_pain = 0;
    }
  }

  onPushingFatigueChecked(args) {
    this.hasPushingFatigue = args.value;
    if (!this.hasPushingFatigue) {
      this.evaluation.pushing_fatigue = 0;
    }
  }

  onIndependenceChecked(args): void {
    this.impactsIndependence = args.value;
    if (!this.impactsIndependence) {
      this.evaluation.impact_on_independence = 0;
    }
  }
}
