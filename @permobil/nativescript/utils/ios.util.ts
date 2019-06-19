import * as app from 'tns-core-modules/application';
import { isIOS } from 'tns-core-modules/platform';
import { Page } from 'tns-core-modules/ui/page';
import { ios as iosUtils } from 'tns-core-modules/utils/utils';

/**
 * Sets margins for the safe area on iOS devices with safeAreaInsets
 * @param page [Page] - The page instance.
 */
export function setMarginForIosSafeArea(page: Page) {
  if (isIOS && page.actionBarHidden) {
    const safeAreaInsets = getSafeAreaInsets() as UIEdgeInsets;
    if (safeAreaInsets) {
      page.marginBottom = -1 * safeAreaInsets.bottom;
      page.marginTop = -1 * safeAreaInsets.top;
    }
  }
}

export function getSafeAreaInsets():
  | undefined
  | {
      top: number;
      left: number;
      bottom: number;
      right: number;
    } {
  if (isIOS && app.ios.window.safeAreaInsets) {
    return app.ios.window.safeAreaInsets;
  } else {
    return undefined;
  }
}

export function isIosSimulator() {
  if (isIOS) {
    let isSimulator;

    const processInfo = iosUtils.getter(
      NSProcessInfo,
      NSProcessInfo.processInfo
    );
    const isMinIOS9 = processInfo.isOperatingSystemAtLeastVersion({
      majorVersion: 9,
      minorVersion: 0,
      patchVersion: 0
    });
    if (isMinIOS9) {
      const simDeviceName = processInfo.environment.objectForKey(
        'SIMULATOR_DEVICE_NAME'
      );
      isSimulator = simDeviceName !== null;
    } else {
      const currentDevice = iosUtils.getter(UIDevice, UIDevice.currentDevice);
      isSimulator = currentDevice.name.toLowerCase().indexOf('simulator') > -1;
    }

    return isSimulator;
  } else {
    return false;
  }
}
