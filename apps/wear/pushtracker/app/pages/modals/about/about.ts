import { Page, ShownModallyData } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { fromObject } from '@nativescript/core/data/observable';
import { screen } from '@nativescript/core/platform';
import { alert } from '@nativescript/core/ui/dialogs';
import { ad as androidUtils } from '@nativescript/core/utils/utils';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { WearOsLayout } from 'nativescript-wear-os';
import { DataKeys } from '../../../enums';
import { PushTrackerKinveyService } from '../../../services';
import { getSerialNumber, saveSerialNumber } from '../../../utils';

let closeCallback;
let page: Page;
let wearOsLayout: WearOsLayout;
let kinveyService: PushTrackerKinveyService;

// values for UI databinding via bindingContext
const data = {
  insetPadding: 0,
  chinSize: 0,
  watchSerialNumber: '---',
  appVersion: PushTrackerKinveyService.api_app_key,
  databaseId: '---',
  userName: '---',
  userEmail: '---'
};

export function onCloseTap() {
  closeCallback();
}

export function onShownModally(args: ShownModallyData) {
  Log.D('about-page onShownModally');
  page = args.object as Page;

  kinveyService = args.context.kinveyService as PushTrackerKinveyService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  // get the device serial number
  data.watchSerialNumber = getSerialNumber() || '---';

  // get the app version
  const ctx = androidUtils.getApplicationContext();
  const packageManager = ctx.getPackageManager();
  const packageInfo = packageManager.getPackageInfo(ctx.getPackageName(), 0);
  const versionName = packageInfo.versionName;
  data.appVersion = versionName;

  // get the database id
  data.databaseId = PushTrackerKinveyService.api_app_key;

  Log.D('data', data);

  // set the pages bindingContext
  page.bindingContext = fromObject(data);

  wearOsLayout = page.getViewById('wearOsLayout');
  configureLayout(wearOsLayout);

  // load user name / email from appsettings
  const userName = appSettings.getString(DataKeys.USER_NAME, '---');
  const userEmail = appSettings.getString(DataKeys.USER_EMAIL, '---');
  // now set the binding context
  page.bindingContext.set('userName', userName);
  page.bindingContext.set('userEmail', userEmail);
}

export async function onSerialNumberTap(_: any) {
  Log.D('about-page onSerialNumberTap');
  const p = android.Manifest.permission.READ_PHONE_STATE;
  if (!hasPermission(p)) {
    await alert({
      title: L('permissions-request.title'),
      message: L('permissions-reasons.phone-state'),
      okButtonText: L('buttons.ok')
    });
    try {
      await requestPermissions([p], () => {});
      const watchSerialNumber = getSerialNumber();
      saveSerialNumber(watchSerialNumber);
      kinveyService.watch_serial_number = watchSerialNumber;
    } catch (err) {}
  } else {
  }
}

function configureLayout(layout: WearOsLayout) {
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
}
