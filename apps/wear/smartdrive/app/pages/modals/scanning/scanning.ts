import { Observable, Page, ShownModallyData } from '@nativescript/core';
import { fromObject } from '@nativescript/core/data/observable';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';

// values for UI databinding via bindingContext
const data = {
  message: L('settings.scanning')
};

export async function onShownModally(args: ShownModallyData) {
  Log.D('scanning-page onShownModally');
  const page = args.object as Page;
  page.bindingContext = fromObject(data) as Observable;
  page.bindingContext.set('scanningText', data.message);
}
