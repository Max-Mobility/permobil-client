import { Log } from '@permobil/core';
import { WearOsLayout } from 'nativescript-wear-os';
import { fromObject } from 'tns-core-modules/data/observable';
import { screen } from 'tns-core-modules/platform';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { KinveyService } from '../../../services';

let closeCallback;
let page: Page;
let wearOsLayout: WearOsLayout;
let kinveyService: KinveyService;

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
  kinveyService = args.context.kinveyService as KinveyService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  page.bindingContext = fromObject(data);

  wearOsLayout = page.getViewById('wearOsLayout');
  configureLayout(wearOsLayout);
}

export function onChangeSettingsItemTap(args) {
  const tappedId = args.object.id as string;
  Log.D('onChangeSettingsItemTap', tappedId);

  // // copy the current settings into temporary store
  // this.tempSettings.copy(this.settings);
  // this.activeSettingToChange = tappedId.toLowerCase();
  // const translationKey = 'settings.' + this.activeSettingToChange + '.title';
  // this.changeSettingKeyString = L(translationKey);
  // this.updateSettingsChangeDisplay();

  // showOffScreenLayout(this.changeSettingsLayout).then(() => {
  //   // TODO: this is a hack to force the layout to update for
  //   // showing the auto-size text view
  //   const prevVal = this.changeSettingKeyValue;
  //   this.changeSettingKeyValue = '  ';
  //   this.changeSettingKeyValue = prevVal;
  // });
  // this.enableLayout('changeSettings');
}

function configureLayout(layout: WearOsLayout) {
  // determine inset padding
  const androidConfig = androidUtils
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = screen.mainScreen.widthPixels;
  const screenHeight = screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    data.insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      data.chinSize = screenWidth - screenHeight;
    }
  }
  layout.nativeView.setPadding(
    data.insetPadding,
    data.insetPadding,
    data.insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', data.insetPadding);
  page.bindingContext.set('chinSize', data.chinSize);
}
