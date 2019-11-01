import { Log } from '@permobil/core';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { SettingsService } from '../../../services';
import { SettingsViewModel } from './settings-view-model';

let closeCallback;

// Closes the modal
export function onCloseTap() {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('settings onShownModally');
  const page = args.object as Page;
  const settingsService = args.context.settingsService as SettingsService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  const data = {
    closeCallback: args.context.closeCallback
  };

  page.bindingContext = new SettingsViewModel(page, settingsService, data);
}
