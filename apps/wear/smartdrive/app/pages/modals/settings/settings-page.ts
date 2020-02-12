import { Page, ShownModallyData } from '@nativescript/core';
import { Log } from '@permobil/core';
import { SettingsService, SmartDriveKinveyService } from '../../../services';
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
  const sdKinveyService = args.context
    .sdKinveyService as SmartDriveKinveyService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  const data = {
    closeCallback: args.context.closeCallback
  };

  page.bindingContext = new SettingsViewModel(
    page,
    settingsService,
    data,
    sdKinveyService
  );
}
