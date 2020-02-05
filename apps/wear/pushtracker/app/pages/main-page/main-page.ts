import { EventData, Page } from '@nativescript/core';
import { MainViewModel } from './main-view-model';

const vm = new MainViewModel();

// Event handler for Page "navigatedTo" event attached in main-page.xml
export function onNavigatedTo(args: EventData) {
  const page = args.object as Page;

  page.bindingContext = vm;
  vm.onMainPageLoaded(args);
}
