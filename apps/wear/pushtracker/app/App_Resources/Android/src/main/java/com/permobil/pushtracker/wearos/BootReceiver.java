package com.permobil.pushtracker.wearos;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "Pushtracker::BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "onReceive()");
        if (intent.getAction().equalsIgnoreCase(Intent.ACTION_BOOT_COMPLETED)) {
            Intent i = new Intent(context, ActivityService.class);
            i.setAction(Constants.ACTION_START_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.i(TAG, "Starting foreground ActivityService on boot");
                context.startForegroundService(i);
            } else {
                Log.i(TAG, "Starting ActivityService on boot");
                context.startService(i);
            }
        }
    }
}
