import {
  ApplicationSettings,
  Dialogs,
  fromObject,
  Page,
  Screen,
  ShownModallyData,
  Utils
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { getDeviceSerialNumber, L } from '@permobil/nativescript';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { Sentry } from 'nativescript-sentry';
import { WearOsLayout } from 'nativescript-wear-os';
import { DataKeys } from '../../../enums';
import { PushTrackerKinveyService } from '../../../services';
import { saveSerialNumber } from '../../../utils';

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
  data.watchSerialNumber = getDeviceSerialNumber() || '---';

  // get the app version
  const ctx = Utils.android.getApplicationContext();
  const packageManager = ctx.getPackageManager();
  const packageInfo = packageManager.getPackageInfo(ctx.getPackageName(), 0);
  const versionName = packageInfo.versionName;
  data.appVersion = versionName;

  // get the database id
  data.databaseId = PushTrackerKinveyService.api_app_key;

  Log.D('data', data);

  // set the pages bindingContext
  page.bindingContext = fromObject(data);

  wearOsLayout = page.getViewById('wearOsLayout') as any;
  configureLayout(wearOsLayout);

  // load user name / email from appsettings
  const userName = ApplicationSettings.getString(DataKeys.USER_NAME, '---');
  const userEmail = ApplicationSettings.getString(DataKeys.USER_EMAIL, '---');
  // now set the binding context
  page.bindingContext.set('userName', userName);
  page.bindingContext.set('userEmail', userEmail);
}

export async function onSerialNumberTap(_: any) {
  Log.D('about-page onSerialNumberTap');
  const p = android.Manifest.permission.READ_PHONE_STATE;
  if (!hasPermission(p)) {
    await Dialogs.alert({
      title: L('permissions-request.title'),
      message: L('permissions-reasons.phone-state'),
      okButtonText: L('buttons.ok')
    });
    try {
      await requestPermissions([p], () => {});
      const watchSerialNumber = getDeviceSerialNumber();
      saveSerialNumber(watchSerialNumber);
      kinveyService.watch_serial_number = watchSerialNumber;
      // Set the Sentry Context Tags
      Sentry.setContextTags({
        watch_serial_number: watchSerialNumber
      });
    } catch (err) {}
  } else {
    Log.D('Already has permission.');
  }
}

function configureLayout(layout: WearOsLayout) {
  // determine inset padding
  const androidConfig = Utils.android
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = Screen.mainScreen.widthPixels;
  const screenHeight = Screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    data.insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      data.chinSize = screenWidth - screenHeight;
    }
  }
  (layout as any).nativeView.setPadding(
    data.insetPadding,
    data.insetPadding,
    data.insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', data.insetPadding);
  page.bindingContext.set('chinSize', data.chinSize);
}
