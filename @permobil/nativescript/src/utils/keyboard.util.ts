import { Application, isAndroid, Utils } from '@nativescript/core';

/**
 * Hide the device keyboard from screen when executed.
 * Good when submitting forms or any time with user interaction.
 */
export function hideKeyboard() {
  if (isAndroid) {
    try {
      const activity = Application.android.foregroundActivity;
      const context = Utils.ad.getApplicationContext();
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
    Application.android.startActivity
      .getWindow()
      .setSoftInputMode(
        android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
      );
  }
}
