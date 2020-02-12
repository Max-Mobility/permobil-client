import { Page, ShownModallyData } from '@nativescript/core';
import { Log } from '@permobil/core';
import { ChangeSettingsViewModel } from './change-settings-view-model';

let closeCallback: any = null;

export function onShownModally(args: ShownModallyData) {
  Log.D('change-settings-page onShownModally');
  const page = args.object as Page;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal
  page.bindingContext = new ChangeSettingsViewModel(
    page,
    args.context,
    closeCallback
  );
}

export function onCancelChangesTap() {
  closeCallback(false); // this will close the modal when user cancels
}
