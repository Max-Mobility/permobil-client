import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';

const vm = new MainViewModel();

// Event handler for Page "navigatingTo" event attached in main-page.xml
export function navigatingTo(args: EventData) {
  const page = args.object as Page;
  page.bindingContext = vm;
}

export function onMainPageLoaded(args: EventData) {
  vm.onMainPageLoaded(args);
}

export function onAmbientTimeViewLoaded(args: EventData) {
  vm.onAmbientTimeViewLoaded(args);
}

export function onPowerAssistViewLoaded(args: EventData) {
  vm.onPowerAssistViewLoaded(args);
}
