import { Application, isIOS, Page } from '@nativescript/core';

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
  if (isIOS && Application.ios.window.safeAreaInsets) {
    return Application.ios.window.safeAreaInsets;
  } else {
    return undefined;
  }
}

export function isIosSimulator() {
  if (isIOS) {
    let isSimulator;

    const isMinIOS9 = NSProcessInfo.processInfo.isOperatingSystemAtLeastVersion(
      {
        majorVersion: 9,
        minorVersion: 0,
        patchVersion: 0
      }
    );
    if (isMinIOS9) {
      const simDeviceName = NSProcessInfo.processInfo.environment.objectForKey(
        'SIMULATOR_DEVICE_NAME'
      );
      isSimulator = simDeviceName !== null;
    } else {
      const currentDevice = UIDevice.currentDevice;
      isSimulator = currentDevice.name.toLowerCase().indexOf('simulator') > -1;
    }

    return isSimulator;
  } else {
    return false;
  }
}
