import { EventData, Page } from '@nativescript/core';
import { MainViewModel } from './main-view-model';

// Event handler for Page "navigatedTo" event attached in main-page.xml
export function onNavigatingTo(args: EventData) {
  const page = args.object as Page;
  const vm = new MainViewModel();

  page.bindingContext = vm;
  vm.onMainPageLoaded(args);
}
