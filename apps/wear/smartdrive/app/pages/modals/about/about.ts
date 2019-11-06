import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { WearOsLayout } from 'nativescript-wear-os';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { fromObject, Observable } from 'tns-core-modules/data/observable';
import { Page, ShowModalOptions, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { DataKeys } from '../../../enums';
import { SmartDriveException } from '../../../models';
import { KinveyService } from '../../../services';
import { configureLayout, getSerialNumber } from '../../../utils';

let closeCallback;
let kinveyService;

// values for UI databinding via bindingContext
const data = {
  insetPadding: 0,
  chinSize: 0,
  smartDriveSerialNumber: '---',
  watchSerialNumber: '---',
  appVersion: KinveyService.api_app_key,
  databaseId: '---',
  userName: '---',
  userEmail: '---',
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

  kinveyService = args.context.kinveyService as KinveyService;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  data.userName =
    (kinveyService.user && `${kinveyService.user.first_name}\n${kinveyService.user.last_name}`) ||
    '---';

  data.userEmail =
    (kinveyService.user && kinveyService.user.username) ||
    '---';

  // get the smartdrive serial number
  data.smartDriveSerialNumber =
    (kinveyService.user && kinveyService.user.smartdrive_serial_number) ||
    '---';

  // get the device serial number
  data.watchSerialNumber = getSerialNumber() || '---';

  // set mcu and ble version
  data.mcuVersion = args.context.mcuVersion || '---';
  data.bleVersion = args.context.bleVersion || '---';

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

  if (!kinveyService.user) {
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
        page.bindingContext.set('smartDriveSerialNumber', userData.smartdrive_serial_number);
      }
    });
  }
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

export async function onSDSerialNumberTap() {
  if (!kinveyService.user) {
    await alert({
      title: L('failures.title'),
      message: L('about.smartdrive-serial-number-info'),
      okButtonText: L('buttons.ok')
    });
  }
}

export async function onWatchSerialNumberTap() {
  // determine if we have shown the permissions request
  const hasShownRequest =
    appSettings.getBoolean(DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST) || false;
  const p = android.Manifest.permission.READ_PHONE_STATE;
  const needPermission =
    !hasPermission(p) &&
    (application.android.foregroundActivity.shouldShowRequestPermissionRationale(
      p
    ) ||
      !hasShownRequest);
  // update the has-shown-request
  appSettings.setBoolean(DataKeys.SHOULD_SHOW_PERMISSIONS_REQUEST, true);
  if (needPermission) {
    await alert({
      title: L('permissions-request.title'),
      message: L('permissions-reasons.phone-state'),
      okButtonText: L('buttons.ok')
    });
    try {
      await requestPermissions([p], () => { });
    } catch (permissionsObj) {
      // could not get the permission
    }
  } else {
    throw new SmartDriveException(L('failures.permissions'));
  }
  this._updateSerialNumber();
}
