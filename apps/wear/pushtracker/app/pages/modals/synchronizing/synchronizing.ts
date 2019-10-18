import { Log } from '@permobil/core';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { L } from '@permobil/nativescript';
import { fromObject, Observable } from 'tns-core-modules/data/observable';

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
