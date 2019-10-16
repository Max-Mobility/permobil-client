import { EventData } from 'tns-core-modules/data/observable';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { UpdatesViewModel } from './updates-view-model';

const vm = new UpdatesViewModel();

export function onShownModally(args: ShownModallyData) {
  console.log('updates-page onShownModally');
  let page = args.object as Page;
  page.bindingContext = vm;
}

export function onUpdatesPageLoaded(args: EventData) {
  vm.onUpdatesPageLoaded(args);
}