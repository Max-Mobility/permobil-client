import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { UpdatesViewModel } from './updates-view-model';

let closeCallback;

let updatesViewModel: UpdatesViewModel = new UpdatesViewModel();

export function onShownModally(args: ShownModallyData) {
  const page = args.object as Page;
  closeCallback = args.closeCallback;

  updatesViewModel.onUpdatesPageLoaded(
    page,
    args.context.bluetoothService,
    args.context.kinveyService,
    args.context.sqliteService,
    closeCallback
  );
  page.bindingContext = updatesViewModel;
}
