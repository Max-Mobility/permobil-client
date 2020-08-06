import { isIOS } from '@nativescript/core';
import * as application from '@nativescript/core/application';
import { hasPermission } from 'nativescript-permissions';

/**
 * Adds margin-bottom to the page. Is not super elegant but works for now.
 * Once NS 4.0 releases and we upgrade this will not be needed as the page/frame
 * will be defaulted to use the safe area insets for iOS.
 */
export function addBottomSafeAreaForIOS(): void {
  if (isIOS && application.ios.window.safeAreaInsets) {
    const bottomSafeArea: number = application.ios.window.safeAreaInsets.bottom;
    if (bottomSafeArea > 0) {
      application.addCss(`
              Page { margin-bottom: ${bottomSafeArea} !important }
          `);
    }
  }
}

export function getDeviceSerialNumber() {
  if (isIOS) {
    return UIDevice.currentDevice.identifierForVendor.UUIDString;
  } else {
    if (!hasPermission(android.Manifest.permission.READ_PHONE_STATE)) {
      return null;
    }
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      return (android.os.Build as any).getSerial();
    } else {
      return android.os.Build.SERIAL;
    }
  }
}
