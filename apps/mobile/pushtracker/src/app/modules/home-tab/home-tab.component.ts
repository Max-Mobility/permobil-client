import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { STORAGE_KEYS } from '~/app/enums';
import { LoggingService } from '../../services';
import { AppInfoComponent } from '../app-info/app-info.component';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  distanceCirclePercentage: number;
  distanceCirclePercentageMaxValue;
  coastTimeCirclePercentage: number;
  coastTimeCirclePercentageMaxValue;
  distanceRemainingText: string;
  pushCountData: string;
  coastTimeData: string;
  distanceData: string;
  distanceChartData;
  infoItems;

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    // determine users distance value and get user activity goal for distance
    this.distanceCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.distanceCirclePercentageMaxValue =
      '/' +
      appSettings.getNumber(
        STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL,
        STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE
      );

    // determine users coast-time value and get user activity goal for distance
    this.coastTimeCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.coastTimeCirclePercentageMaxValue =
      '/' +
      appSettings.getNumber(
        STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL,
        STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE
      );

    this.distanceRemainingText = `0.4 ${this._translateService.instant(
      'home-tab.miles-to-go'
    )}`;
    this.pushCountData = `1514`;
    this.coastTimeData = `3.6`;
    this.distanceData = `2.75`;

    this.distanceChartData = null;
  }

  ngOnInit(): void {
    this._logService.logBreadCrumb(`HomeTabComponent OnInit`);
    this.infoItems = this._translateService.instant(
      'app-info-component.sections'
    );
  }

  onInfoTap() {
    console.log('info button tapped');

    this._modalService
      .showModal(AppInfoComponent, {
        context: {},
        fullscreen: true,
        viewContainerRef: this._vcRef
      })
      .catch(err => {
        this._logService.logException(err);
        new Toasty({
          text:
            'An unexpected error occurred. If this continues please let us know.',
          textColor: new Color('#fff000')
        });
      });
  }
}
