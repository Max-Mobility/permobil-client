import { Utils } from '@nativescript/core';

/**
 * Kills the current application activity and relaunches.
 */
export function restartAndroidApp() {
  Utils.setTimeout(() => {
    const ctx = Utils.android.getApplicationContext() as android.content.Context;
    const intent = ctx
      .getPackageManager()
      .getLaunchIntentForPackage(ctx.getPackageName());
    ctx.startActivity(
      android.content.Intent.makeRestartActivityTask(intent.getComponent())
    );

    java.lang.System.exit(0); // System finishes and automatically relaunches us.
  }, 100);
}
