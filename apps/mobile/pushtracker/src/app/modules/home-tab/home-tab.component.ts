import { AfterViewInit, Component, OnInit, ViewContainerRef } from '@angular/core';
import { NavigationStart, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { Toasty } from 'nativescript-toasty';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { STORAGE_KEYS } from '~/app/enums';
import { LoggingService } from '../../services';
import { AppInfoComponent } from '../app-info/app-info.component';
import { Subscription } from 'rxjs';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Log, PushTrackerUser } from '@permobil/core';
import { PushTrackerUserService } from '../../services/pushtracker.user.service';
import { ActivityTabComponent } from '../activity-tab/activity-tab.component';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit, AfterViewInit {
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
  user: PushTrackerUser;

  private routeSub: Subscription; // subscription to route observer

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _router: Router,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef,
    private userService: PushTrackerUserService
  ) {
    this.getUser();
    this.refreshGoalData();
  }

  ngOnInit(): void {
    this.getUser();
    this._logService.logBreadCrumb(`HomeTabComponent OnInit`);
    this.infoItems = this._translateService.instant(
      'app-info-component.sections'
    );
  }

  getUser(): void {
    this.userService.user.subscribe(user => { this.user = user; this.refreshGoalData(); });
  }

  ngAfterViewInit() {
    // now listen for router events to refresh the page data
    this.routeSub = this._router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this._logService.logBreadCrumb(`Home-tab router subscribe ${event}`);
        this.refreshGoalData();
      }
    });
  }

  refreshGoalData() {
    // determine users distance value and get user activity goal for distance
    this.distanceCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.distanceCirclePercentageMaxValue = '/' + this.user.data.activity_goal_distance;

    // determine users coast-time value and get user activity goal for distance
    this.coastTimeCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.coastTimeCirclePercentageMaxValue = '/' + this.user.data.activity_goal_coast_time;

    this.distanceRemainingText = `0.4 ${this._translateService.instant(
      'home-tab.miles-to-go'
    )}`;
    this.pushCountData = `1514`;
    this.coastTimeData = `3.6`;
    this.distanceData = `2.75`;

    this.distanceChartData = null;
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

  onActivityTap() {
    console.log('activity button tapped');
    this._modalService
    .showModal(ActivityTabComponent, {
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
