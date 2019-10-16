import { EventData } from 'tns-core-modules/data/observable';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { UpdatesViewModel } from './updates-view-model';

const vm = new UpdatesViewModel();
let closeCallback;

export function onShownModally(args: ShownModallyData) {
  console.log('updates-page onShownModally');
  const page = args.object as Page;
  closeCallback = args.closeCallback;
  page.bindingContext = vm;
}

export function onUpdatesPageLoaded(args: EventData) {
  vm.onUpdatesPageLoaded(args);
}

export function onCloseTap(args) {
  vm.stopUpdates('');
  closeCallback();
}