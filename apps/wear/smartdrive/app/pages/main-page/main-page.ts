import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';

export function navigatedTo(args: EventData) {
  console.log('navigated to');
  const page = args.object as Page;
  page.bindingContext = new MainViewModel();
}
