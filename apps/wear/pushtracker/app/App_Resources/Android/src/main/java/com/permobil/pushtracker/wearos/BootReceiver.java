package com.permobil.pushtracker.wearos;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
  private static final String TAG = "Pushtracker::BootReceiver";
  public static final int REQUEST_CODE = 9001;
  public static final String ACTION = "com.permobil.pushtracker.wearos.alarm";

  @Override
  public void onReceive(Context context, Intent intent) {
    Log.i(TAG, "onReceive()");
    String action = intent.getAction();
    if (action != null && action.equalsIgnoreCase(Intent.ACTION_BOOT_COMPLETED)) {
      Log.i(TAG, "Starting ActivityService on boot");
    } else {
      Log.i(TAG, "Starting ActivityService from alarm");
    }
    Intent i = new Intent(context, ActivityService.class);
    i.setAction(Constants.ACTION_START_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(i);
    } else {
      context.startService(i);
    }
  }
}
