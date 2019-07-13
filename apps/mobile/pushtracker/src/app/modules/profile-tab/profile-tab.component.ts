import { Component, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import * as appSettings from 'tns-core-modules/application-settings';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout/stack-layout';
import { Page } from 'tns-core-modules/ui/page';
import { STORAGE_KEYS } from '../../enums';
import { LoggingService } from '../../services';
import { ProfileSettingsComponent} from '../profile-settings/profile-settings.component';
import { Toasty } from 'nativescript-toasty';
import { Color } from 'tns-core-modules/color';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';

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
   * Object to use for activityGoalsDialog
   */
  activity_goals_dialog_data: {
    /**
     * The STORAGE_KEYS enum value for the ACTIVITY_GOALS config the user selected.
     */
    config_key: string;
    /**
     * Value to display to user when they're changing their activity goals
     * Depending which value the user tapped we show the translation for the goal (distance, coast-time)
     */
    config_value: any;
    /**
     * Title to display to user when they're changing their activity goals
     * Depending which value the user tapped we show the translation for the goal (distance, coast-time)
     */
    config_title: string;
  };

  /**
   * The user selected activity goal layout. Used to keep track of which UI layout was selected to apply/remove CSS classes.
   */
  activeDataBox: StackLayout;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private _modalService: ModalDialogService,
    private _vcRef: ViewContainerRef
  ) {
    // appSettings.clear();

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

    this.activity_goals_dialog_data = {
      config_key: null,
      config_value: null,
      config_title: null
    };
  }

  ngOnInit() {
    this._logService.logBreadCrumb('profile-tab.component ngOnInit');
  }

  onHelpTap() {
    Log.D('help action item tap');
  }

  async onSettingsTap() {
    Log.D('setting action item tap');
    this._modalService
    .showModal(ProfileSettingsComponent, {
      context: {},
      fullscreen: true,
      viewContainerRef: this._vcRef
    })
    .catch(err => {
     // this._logService.logException(err);
      new Toasty({
        text:
          'An unexpectect error occurred. If this continues please let us know.',
        textColor: new Color('#fff000')
      });
    });
  }

  async onActivityGoalTap(
    args,
    configTitle: string,
    configKey: string,
    configValue
  ) {
    Log.D('user tapped config = ', configTitle, args.object);
    const stack = args.object as StackLayout;
    stack.className = 'data-box-active';
    this.activeDataBox = stack; // set the activeDataBox so that we can remove the applied css class when the selection is made by the user

    // setting the dialog data so we know what we are changing
    this.activity_goals_dialog_data.config_key = configKey;
    this.activity_goals_dialog_data.config_value = configValue;
    this.activity_goals_dialog_data.config_title = this._translateService.instant(
      `general.${configTitle}`
    );

    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    cfl
      .animate({
        duration: 300,
        opacity: 1,
        curve: AnimationCurve.easeOut,
        translate: {
          x: 0,
          y: 0
        }
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  async closeActivityGoalsDialog() {
    // remove the active data box class from the previously selected box
    this.activeDataBox.className = 'data-box';
    const cfl = this.activityGoalsDialog.nativeElement as GridLayout;
    cfl.animate({
      duration: 300,
      opacity: 0,
      curve: AnimationCurve.easeOut,
      translate: {
        x: 0,
        y: 900
      }
    });
  }

  incrementConfigValue() {
    Log.D('Increment the config value');
    this.activity_goals_dialog_data.config_value =
      this.activity_goals_dialog_data.config_value + 5;
  }

  decrementConfigValue() {
    Log.D('Decrement the config value');
    this.activity_goals_dialog_data.config_value =
      this.activity_goals_dialog_data.config_value - 5;
  }

  onSetGoalBtnTap() {
    this._logService.logBreadCrumb(
      'User set activity goals: ' +
        this.activity_goals_dialog_data.config_key +
        ' ' +
        this.activity_goals_dialog_data.config_value
    );
    // Save the Activity Goals value
    appSettings.setNumber(
      this.activity_goals_dialog_data.config_key,
      this.activity_goals_dialog_data.config_value
    );

    this.COAST_TIME_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.COAST_TIME_ACTIVITY_GOAL
    );
    this.DISTANCE_ACTIVITY_GOAL = appSettings.getNumber(
      STORAGE_KEYS.DISTANCE_ACTIVITY_GOAL
    );

    // close the dialog which can re-use the function that the close btn uses
    this.closeActivityGoalsDialog();
  }
}
