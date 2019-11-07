import { Observable, Page, ShownModallyData } from '@nativescript/core';
import { fromObject } from '@nativescript/core/data/observable';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';

// values for UI databinding via bindingContext
const data = {
  message: L('busy.synchronizing')
};

export async function onShownModally(args: ShownModallyData) {
  Log.D('synchronizing-page onShownModally');
  const page = args.object as Page;
  page.bindingContext = fromObject(data) as Observable;
  page.bindingContext.set('busyText', data.message);
}
