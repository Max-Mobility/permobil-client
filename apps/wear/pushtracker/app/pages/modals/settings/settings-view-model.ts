import {
  Observable,
  Page,
  Screen,
  ShowModalOptions,
  Utils,
  View
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { L, Prop } from '@permobil/nativescript';
import { WearOsLayout } from 'nativescript-wear-os';
import { PushTrackerKinveyService } from '../../../services';
import { sentryBreadCrumb } from '../../../utils';

export class SettingsViewModel extends Observable {
  @Prop() insetPadding = 0;
  @Prop() chinSize = 0;

  private _showingModal: boolean = false;

  constructor(
    page: Page,
    private _kinveyService: PushTrackerKinveyService,
    data
  ) {
    super();
    const wearOsLayout = (<unknown>(
      page.getViewById('wearOsLayout')
    )) as WearOsLayout;
    this._configureLayout(wearOsLayout);
  }

  onEditProfileTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing profile');
      return;
    }
    const profilePage = 'pages/modals/profile/profile';
    const btn = args.object as View;
    const options: ShowModalOptions = {
      context: {
        kinveyService: this._kinveyService
      },
      closeCallback: () => {
        this._showingModal = false;
        // we dont do anything with the about to return anything
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal(profilePage, options);
  }

  onChangeSettingsItemTap(args) {
    if (this._showingModal) {
      sentryBreadCrumb('already showing modal, not showing change settings');
      return;
    }
    const tappedId = args.object.id as string;
    Log.D('onChangeSettingsItemTap', tappedId);

    // copy the current settings into temporary store
    const activeSettingToChange = tappedId.toLowerCase();
    const translationKey = 'settings.' + activeSettingToChange + '.title';
    const changeSettingKeyString = L(translationKey);

    const changeSettingsPage = 'pages/modals/change-settings/change-settings';
    const btn = args.object as View;
    const option: ShowModalOptions = {
      context: {
        kinveyService: this._kinveyService,
        activeSettingToChange: activeSettingToChange,
        changeSettingKeyString: changeSettingKeyString
      },
      closeCallback: () => {
        this._showingModal = false;
        // we dont do anything with the about to return anything
      },
      animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
      fullscreen: true
    };
    this._showingModal = true;
    btn.showModal(changeSettingsPage, option);
  }

  private _configureLayout(layout: WearOsLayout) {
    // determine inset padding
    const androidConfig = Utils.android
      .getApplicationContext()
      .getResources()
      .getConfiguration();
    const isCircleWatch = androidConfig.isScreenRound();
    const screenWidth = Screen.mainScreen.widthPixels;
    const screenHeight = Screen.mainScreen.heightPixels;

    if (isCircleWatch) {
      this.insetPadding = Math.round(0.146467 * screenWidth);
      // if the height !== width then there is a chin!
      if (screenWidth !== screenHeight && screenWidth > screenHeight) {
        this.chinSize = screenWidth - screenHeight;
      }
    }
    (layout as any).nativeView.setPadding(
      this.insetPadding,
      this.insetPadding,
      this.insetPadding,
      0
    );
  }
}
