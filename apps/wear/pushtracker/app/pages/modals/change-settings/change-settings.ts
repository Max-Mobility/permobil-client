import { Log } from '@permobil/core';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { KinveyService } from '../../../services';
import { ChangeSettingsViewModel } from './change-settings-view-model';

let closeCallback: Function;

// Closes the modal
export function onCloseTap() {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('change-settings onShownModally');
  const page = args.object as Page;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  // get the values sent in the modal context
  const kinveyService = args.context.kinveyService as KinveyService;
  // create an object to pass for binding data in the VM
  const data = {
    activeSettingToChange: args.context.activeSettingToChange,
    changeSettingKeyString: args.context.changeSettingKeyString,
    disableWearCheck: args.context.disableWearCheck,
    closeCallback: closeCallback
  };

  page.bindingContext = new ChangeSettingsViewModel(page, kinveyService, data);
}

export function onCancelChangesTap() {
  closeCallback(); // this will close the modal when user cancels
}
