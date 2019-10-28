import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';

export function onPageLoaded(args: EventData) {
  const page = args.object as Page;
  const vm = new MainViewModel();

  page.bindingContext = vm;
  vm.onMainPageLoaded(args);
}
