import { EventData, Page, ShownModallyData } from '@nativescript/core';
import { Log } from '@permobil/core';
import { UpdatesViewModel } from './updates-view-model';

let closeCallback;

export const updatesViewModel: UpdatesViewModel = new UpdatesViewModel();

export function onUpdateProgressCircleLoaded(args: EventData) {
  updatesViewModel.onUpdateProgressCircleLoaded(args);
}

export function onShownModally(args: ShownModallyData) {
  Log.D('updates-page.ts onShownModally');
  const page = args.object as Page;
  closeCallback = args.closeCallback;

  updatesViewModel.onUpdatesPageLoaded(
    args.context.bluetoothService,
    args.context.kinveyService,
    args.context.sqliteService,
    closeCallback
  );
  page.bindingContext = updatesViewModel;
}
