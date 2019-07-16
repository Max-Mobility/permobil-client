import { EventData } from 'tns-core-modules/data/observable';
import { Page } from 'tns-core-modules/ui/page';
import { MainViewModel } from './main-view-model';

// Event handler for Page "navigatingTo" event attached in main-page.xml
export function navigatingTo(args: EventData) {
  const page = args.object as Page;
  page.bindingContext = new MainViewModel();
}

export function onMainPageLoaded(args: EventData) {
  // console.log('main-page.ts : onMainPageLoaded', args);
  const page = args.object as Page;
  page.bindingContext.onMainPageLoaded(args);
}
