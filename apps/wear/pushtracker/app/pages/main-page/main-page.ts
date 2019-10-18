import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';

// Event handler for Page "navigatedTo" event attached in main-page.xml
export function onNavigatedTo(args: EventData) {
  const page = args.object as Page;
  const vm = new MainViewModel();

  page.bindingContext = vm;
  vm.onMainPageLoaded(args);
}
