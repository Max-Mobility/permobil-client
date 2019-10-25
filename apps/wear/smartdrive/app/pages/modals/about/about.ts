import { Log } from '@permobil/core';
import { WearOsLayout } from 'nativescript-wear-os';
import { fromObject, Observable } from 'tns-core-modules/data/observable';
import { screen } from 'tns-core-modules/platform';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { KinveyService, SqliteService } from '../../../services';
import {
  getSerialNumber,
  saveSerialNumber,
} from '../../../utils';
import { ShowModalOptions } from 'tns-core-modules/ui/page/page';
import { ObservableArray } from 'tns-core-modules/data/observable-array';

let closeCallback;
let page: Page;
let wearOsLayout: WearOsLayout;

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

export function onShowErrorHistory(args) {
  const errorHistoryPage = 'pages/modals/error_history/error_history';
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
  btn.showModal(errorHistoryPage, option);
}

export async function onShownModally(args: ShownModallyData) {
  Log.D('about-page onShownModally');
  page = args.object as Page;

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

  Log.D('data', data);

  // set the pages bindingContext
  page.bindingContext = fromObject(data) as Observable;

  wearOsLayout = page.getViewById('wearOsLayout');
  configureLayout(wearOsLayout);

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

function configureLayout(layout: WearOsLayout) {
  Log.D('customWOLInsetLoaded', layout);

  // determine inset padding
  const androidConfig = androidUtils
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = screen.mainScreen.widthPixels;
  const screenHeight = screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    data.insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      data.chinSize = screenWidth - screenHeight;
    }
  }
  layout.nativeView.setPadding(
    data.insetPadding,
    data.insetPadding,
    data.insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', data.insetPadding);
  page.bindingContext.set('chinSize', data.chinSize);
  page.bindingContext.set('onCloseTap', onCloseTap);
}
