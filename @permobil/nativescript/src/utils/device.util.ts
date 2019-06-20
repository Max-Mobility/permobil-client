import * as application from 'tns-core-modules/application';
import { isIOS } from 'tns-core-modules/platform';

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
