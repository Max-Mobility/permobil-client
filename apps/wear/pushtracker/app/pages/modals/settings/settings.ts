import { Log } from '@permobil/core';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { KinveyService } from '../../../services';
import { SettingsViewModel } from './settings-view-model';

let closeCallback;

// Closes the modal
export function onCloseTap() {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('settings onShownModally');
  const page = args.object as Page;
  const kinveyService = args.context.kinveyService as KinveyService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  const data = {
    disableWearCheck: args.context.disableWearCheck,
    closeCallback: args.context.closeCallback
  };

  page.bindingContext = new SettingsViewModel(page, kinveyService, data);
}
