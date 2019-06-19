import * as app from 'tns-core-modules/application';
import { isAndroid } from 'tns-core-modules/platform';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';

/**
 * Hide the device keyboard from screen when executed.
 * Good when submitting forms or any time with user interaction.
 */
export function hideKeyboard() {
  if (isAndroid) {
    try {
      const activity = app.android.foregroundActivity;
      const context = androidUtils.getApplicationContext();
      const inputManager = context.getSystemService(
        android.content.Context.INPUT_METHOD_SERVICE
      );
      inputManager.hideSoftInputFromWindow(
        activity.getCurrentFocus().getWindowToken(),
        android.view.inputmethod.InputMethodManager.HIDE_NOT_ALWAYS
      );
    } catch (err) {
      // nothing
    }
  }
}

/**
 * Prevent the soft keyboard from showing (Android only) on page load.
 */
export function preventKeyboardFromShowing() {
  if (isAndroid) {
    // prevent the soft keyboard from showing initially when textfields are present
    app.android.startActivity
      .getWindow()
      .setSoftInputMode(
        android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
      );
  }
}
