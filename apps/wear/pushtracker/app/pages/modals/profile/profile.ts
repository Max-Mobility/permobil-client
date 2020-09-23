import {
  fromObject,
  Page,
  Screen,
  ShowModalOptions,
  ShownModallyData,
  Utils,
  View
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';
import { WearOsLayout } from 'nativescript-wear-os';
import { PushTrackerKinveyService } from '../../../services';
import { sentryBreadCrumb } from '../../../utils';

let closeCallback;
let page: Page;
let wearOsLayout: WearOsLayout;
let kinveyService: PushTrackerKinveyService;
let disableWearCheck: boolean;
let _showingModal: boolean = false;

// values for UI databinding via bindingContext
const data = {
  insetPadding: 0,
  chinSize: 0
};

// Closes the modal
export function onCloseTap() {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('profile onShownModally');
  page = args.object as Page;
  kinveyService = args.context.kinveyService as PushTrackerKinveyService;
  disableWearCheck = args.context.disableWearCheck;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  page.bindingContext = fromObject(data);

  wearOsLayout = page.getViewById('wearOsLayout') as any;
  configureLayout(wearOsLayout);
}

export function onChangeSettingsItemTap(args) {
  if (_showingModal) {
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
      kinveyService,
      activeSettingToChange,
      changeSettingKeyString,
      disableWearCheck
    },
    closeCallback: () => {
      _showingModal = true;
      // we dont do anything with the about to return anything
    },
    animated: false, // might change this, but it seems quicker to display the modal without animation (might need to change core-modules modal animation style)
    fullscreen: true
  };
  _showingModal = false;
  btn.showModal(changeSettingsPage, option);
}

function configureLayout(layout: WearOsLayout) {
  // determine inset padding
  const androidConfig = Utils.android
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = Screen.mainScreen.widthPixels;
  const screenHeight = Screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    data.insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      data.chinSize = screenWidth - screenHeight;
    }
  }
  (layout as any).nativeView.setPadding(
    data.insetPadding,
    data.insetPadding,
    data.insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', data.insetPadding);
  page.bindingContext.set('chinSize', data.chinSize);
}
