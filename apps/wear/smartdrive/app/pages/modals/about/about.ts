import { Log } from '@permobil/core';
import { WearOsLayout } from 'nativescript-wear-os';
import { fromObject, Observable } from 'tns-core-modules/data/observable';
import { Page, ShowModalOptions, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { KinveyService } from '../../../services';
import { configureLayout, getSerialNumber } from '../../../utils';

let closeCallback;

// values for UI databinding via bindingContext
const data = {
  insetPadding: 0,
  chinSize: 0,
  watchSerialNumber: '---',
  appVersion: KinveyService.api_app_key,
  databaseId: '---',
  userName: '',
  userEmail: '',
  mcuVersion: '---',
  bleVersion: '---',
  sqliteService: undefined
};

export function onCloseTap(args) {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('about-page onShownModally');
  const page = args.object as Page;

  const kinveyService = args.context.kinveyService as KinveyService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  // get the device serial number
  data.watchSerialNumber = getSerialNumber() || '---';

  // set mcu and ble version
  data.mcuVersion = args.context.mcuVersion;
  data.bleVersion = args.context.bleVersion;

  // SqliteService
  data.sqliteService = args.context.sqliteService;

  // get the app version
  const ctx = androidUtils.getApplicationContext();
  const packageManager = ctx.getPackageManager();
  const packageInfo = packageManager.getPackageInfo(ctx.getPackageName(), 0);
  const versionName = packageInfo.versionName;
  data.appVersion = versionName;

  // get the database id
  data.databaseId = KinveyService.api_app_key;

  // set the pages bindingContext
  page.bindingContext = fromObject(data) as Observable;

  const wearOsLayout = page.getViewById('wearOsLayout') as WearOsLayout;
  const res = configureLayout(wearOsLayout);
  page.bindingContext.set('chinSize', res.chinSize);
  page.bindingContext.set('insetPadding', res.insetPadding);
  wearOsLayout.nativeView.setPadding(
    res.insetPadding,
    res.insetPadding,
    res.insetPadding,
    0
  );

  // get the user data and then update the bindingContext data
  // doing this after the bindingContext is set since it can take a second to fetch this data
  kinveyService.getUserData().then(userData => {
    Log.D('userInfo', userData);
    if (userData) {
      page.bindingContext.set(
        'userName',
        `${userData.first_name}\n${userData.last_name}`
      );
      page.bindingContext.set('userEmail', userData.username);
    }
  });
}

export function onShowErrorHistory(args) {
  const btn = args.object;
  const option: ShowModalOptions = {
    context: {
      insetPadding: data.insetPadding,
      chinSize: data.chinSize,
      sqliteService: data.sqliteService
    },
    closeCallback: () => {
      // we dont do anything with the about to return anything
    },
    animated: false,
    fullscreen: true
  };
  btn.showModal('pages/modals/error_history/error_history', option);
}
