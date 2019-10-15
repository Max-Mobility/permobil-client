import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { UpdatesViewModel } from './updates-view-model';

const vm = new UpdatesViewModel();

// Event handler for Page "navigatingTo" event attached in updates-page.xml
export function navigatingTo(args: EventData) {
  const page = args.object as Page;
  page.bindingContext = vm;
}

export function onUpdatesPageLoaded(args: EventData) {
  vm.onUpdatesPageLoaded(args);
}