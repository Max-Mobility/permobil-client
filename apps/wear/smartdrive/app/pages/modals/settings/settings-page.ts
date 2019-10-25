import { EventData } from 'tns-core-modules/data/observable';
import { SettingsViewModel } from './settings-view-model';
import { screen } from 'tns-core-modules/platform';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { WearOsLayout } from 'nativescript-wear-os';
import { Log } from '@permobil/core';

const vm = new SettingsViewModel();
let closeCallback;
let wearOsLayout: WearOsLayout;
let page: Page;

export function onShownModally(args: ShownModallyData) {
  console.log('settings-page onShownModally');
  page = args.object as Page;
  closeCallback = args.closeCallback;
  vm.settingsService = args.context.settingsService;
  vm.settingsService.loadSettings();
  page.bindingContext = vm;
  wearOsLayout = page.getViewById('wearOsLayout');
  configureLayout(wearOsLayout);
}

export function onSettingsPageLoaded(args: EventData) {
  vm.onSettingsPageLoaded(args);
}

export function onCloseTap(args) {
  console.log('Closing settings modal');
  closeCallback();
}

function configureLayout(layout: WearOsLayout) {
  Log.D('customWOLInsetLoaded', layout);
  let insetPadding = 0;
  let chinSize = 0;

  // determine inset padding
  const androidConfig = androidUtils
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = screen.mainScreen.widthPixels;
  const screenHeight = screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      chinSize = screenWidth - screenHeight;
    }
  }
  layout.nativeView.setPadding(
    insetPadding,
    insetPadding,
    insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', insetPadding);
  page.bindingContext.set('chinSize', chinSize);
  page.bindingContext.set('onCloseTap', onCloseTap);
}
