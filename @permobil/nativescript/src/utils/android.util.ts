import { setTimeout } from '@nativescript/core/timer';
import { ad as androidUtils } from '@nativescript/core/utils/utils';

/**
 * Kills the current application activity and relaunches.
 */
export function restartAndroidApp() {
  setTimeout(() => {
    const ctx = androidUtils.getApplicationContext() as android.content.Context;
    const intent = ctx
      .getPackageManager()
      .getLaunchIntentForPackage(ctx.getPackageName());
    ctx.startActivity(
      android.content.Intent.makeRestartActivityTask(intent.getComponent())
    );

    java.lang.System.exit(0); // System finishes and automatically relaunches us.
  }, 100);
}
