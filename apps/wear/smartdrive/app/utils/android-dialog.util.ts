import * as application from '@nativescript/core/application';

let result;

export function show(options) {
  return new Promise((resolve, reject) => {
    try {
      if (options) {
        const context = getContext();
        const alert = new android.app.AlertDialog.Builder(context);

        if (options.message) {
          alert.setMessage(options.message);
        }

        if (options.title) {
          alert.setTitle(options.title);
        }

        if (options.nativeView instanceof android.view.View) {
          alert.setView(options.nativeView);
        }

        if (options.cancelButtonText) {
          alert.setNegativeButton(
            options.cancelButtonText,
            new android.content.DialogInterface.OnClickListener({
              onClick: (dialog, id) => {
                dialog.cancel();
                resolve(false);
              }
            })
          );
        }

        if (options.neutralButtonText) {
          alert.setNeutralButton(
            options.neutralButtonText,
            new android.content.DialogInterface.OnClickListener({
              onClick: (dialog, id) => {
                dialog.cancel();
                resolve(undefined);
              }
            })
          );
        }

        if (options.okButtonText) {
          alert.setPositiveButton(
            options.okButtonText,
            new android.content.DialogInterface.OnClickListener({
              onClick: (dialog, id) => {
                dialog.cancel();
                resolve(true);
              }
            })
          );
        }

        result = { resolve: resolve, dialog: alert.show() };
      }
    } catch (ex) {
      reject(ex);
    }
  });
}

export function close() {
  if (result) {
    if (result.dialog instanceof android.app.AlertDialog) {
      result.dialog.cancel();
    }

    if (result.resolve instanceof Function) {
      result.resolve(true);
    }
    result = null;
  }
}

/**
 * The activity must be the Foreground or start activity; not the application context...
 */
function getContext() {
  if (application.android.foregroundActivity) {
    return application.android.foregroundActivity;
  }
  if (application.android.startActivity) {
    return application.android.startActivity;
  }
  if (application.android.context) {
    return application.android.context;
  }
}
