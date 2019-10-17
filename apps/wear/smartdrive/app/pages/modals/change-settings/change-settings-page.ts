import { EventData } from 'tns-core-modules/data/observable';
import { ChangeSettingsViewModel } from './change-settings-view-model';
import { screen } from 'tns-core-modules/platform';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { SwipeDismissLayout, WearOsLayout } from 'nativescript-wear-os';
import { Log } from '@permobil/core';

const vm = new ChangeSettingsViewModel();
let closeCallback;
const wearOsLayout: WearOsLayout;
let page: Page;

export function onShownModally(args: ShownModallyData) {
  console.log('change-settings-page onShownModally');
  page = args.object as Page;
  closeCallback = args.closeCallback;
  vm.activeSettingToChange = args.context.activeSettingToChange;
  vm.changeSettingKeyString = args.context.changeSettingKeyString;
  vm.changeSettingKeyValue = args.context.changeSettingKeyValue;
  vm.disableWearCheck = args.context.disableWearCheck;
  vm.tempSettings.copy(args.context.settings);
  vm.tempSwitchControlSettings.copy(args.context.switchControlSettings);
  vm.updateSettingsChangeDisplay();

  page.bindingContext = vm;
  configureLayout();
}

export function onChangeSettingsPageLoaded(args: EventData) {
  vm.onChangeSettingsPageLoaded(args);
}

export function onCloseTap(args) {
  closeCallback(false, vm.tempSettings, vm.tempSwitchControlSettings, vm.disableWearCheck);
}

export function onConfirmTap(args) {
  closeCallback(true, vm.tempSettings, vm.tempSwitchControlSettings, vm.disableWearCheck);
}

function configureLayout() {
  Log.D('customWOLInsetLoaded');
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
  page.bindingContext.set('insetPadding', insetPadding);
  page.bindingContext.set('chinSize', chinSize);
}