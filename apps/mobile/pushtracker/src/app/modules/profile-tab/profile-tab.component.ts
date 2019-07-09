import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import * as appSettings from 'tns-core-modules/application-settings';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { Page } from 'tns-core-modules/ui/page';
import { STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  @ViewChild('activityGoalsDialog', { static: false })
  activityGoalsDialog: ElementRef;
  coastTime: Array<string>;
  distance: Array<string>;
  gender: Array<string>;
  birthday: Array<string>;
  weight: Array<String>;
  height: Array<string>;
  chairInfo: Array<string>;
  name: string;
  email: string;
  USER_GENDER: string;
  USER_BIRTHDAY: string;
  USER_WEIGHT: string;
  USER_HEIGHT: string;
  USER_CHAIR_INFO: string;

  COAST_TIME_ACTIVITY_GOAL; // user defined coast-time activity goal
  DISTANCE_ACTIVITY_GOAL; // user defined distance activity goal

  /**
   * Title to display to user when they're changing their activity goals
   * Depending which value the user tapped we show the translation for the goal (distance, coast-time)
   */
  configTitle: string;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;

    this.coastTime = ['100', '200'];
    this.distance = ['3.0', '4.0'];
    this.gender = ['Male', 'Female'];
    this.birthday = ['290 AC', '291 AC'];
    this.weight = ['115 lb', '130 lb'];
    this.height = ['5\'1"', '5\'5"'];
    this.chairInfo = ['1', '2'];
    this.name = 'Bran Stark';
    this.email = 'email@permobil.com';

    this.USER_GENDER = 'Male';
    this.USER_BIRTHDAY = '04/01/1980';
    this.USER_WEIGHT = '190 lbs';
    this.USER_HEIGHT = '5 ft 10 in';
    this.USER_CHAIR_INFO = 'TiLite';

    this.COAST_TIME_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL,
      60
    );
    this.DISTANCE_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL,
      100
    );

    this.configTitle = this._translateService.instant('general.coast-time');
  }

  ngOnInit() {
    this._logService.logBreadCrumb('profile-tab.component ngOnInit');
  }

  onHelpTap() {
    Log.D('help action item tap');
  }

  async onSettingsTap() {
    Log.D('setting action item tap');
  }

  async onActivityGoalTap(args, configValue: string) {
    Log.D('user tapped config = ', configValue, args.object);
    this.configTitle = this._translateService.instant(`general.${configValue}`);
    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    await cfl.animate({
      duration: 300,
      opacity: 1,
      curve: AnimationCurve.easeOut,
      translate: {
        x: 0,
        y: 0
      }
    });
  }

  async closeActivityGoalsDialog() {
    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    await cfl
      .animate({
        duration: 300,
        opacity: 0,
        curve: AnimationCurve.easeOut,
        translate: {
          x: 0,
          y: 900
        }
      })
      .catch(err => {
        Log.E('shit something is wrong with the animation.');
      });
  }

  incrementConfigValue() {
    Log.D('increment the config value');
  }
  decrementConfigValue() {
    Log.D('decrement the config value');
  }

  onSetGoalBtnTap() {
    // need to save the data value using application-settings and the STORAGE_KEYS enum
    // and close the dialog which can re-use the function that the close btn uses
    this.closeActivityGoalsDialog();
  }
}
