import { fromObject, Page, ShownModallyData } from '@nativescript/core';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';

// values for UI databinding via bindingContext
const data = {
  message: L('settings.scanning')
};

export async function onShownModally(args: ShownModallyData) {
  Log.D('scanning-page onShownModally');
  const page = args.object as Page;
  page.bindingContext = fromObject(data);

  if (args.context?.scanningText) {
    page.bindingContext.set('scanningText', args.context.scanningText);
  } else {
    page.bindingContext.set('scanningText', data.message);
  }
}
