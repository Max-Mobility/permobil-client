import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { UpdatesViewModel } from './updates-view-model';

let closeCallback;

export function onShownModally(args: ShownModallyData) {
  const page = args.object as Page;
  closeCallback = args.closeCallback;

  page.bindingContext = new UpdatesViewModel(
    page,
    args.context.bluetoothService,
    args.context.kinveyService,
    args.context.sqliteService
  );
}

export function onCloseTap(args) {
  closeCallback();
}
