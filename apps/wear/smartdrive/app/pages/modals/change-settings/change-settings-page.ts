import { Log } from '@permobil/core';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ChangeSettingsViewModel } from './change-settings-view-model';

let closeCallback;

export function onShownModally(args: ShownModallyData) {
  Log.D('change-settings-page onShownModally');
  const page = args.object as Page;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal
  // create an object to pass for binding data in the VM
  const data = {
    activeSettingToChange: args.context.activeSettingToChange,
    changeSettingKeyString: args.context.changeSettingKeyString,
    changeSettingKeyValue: args.context.changeSettingKeyValue,
    tempSettings: args.context.settings,
    tempSwitchControlSettings: args.context.switchControlSettings,
    disableWearCheck: args.context.disableWearCheck,
    closeCallback: closeCallback
  };

  page.bindingContext = new ChangeSettingsViewModel(page, data);
}

export function onCancelChangesTap() {
  closeCallback(false); // this will close the modal when user cancels
}
