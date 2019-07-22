package com.permobil.pushtracker.wearos;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "AutoStart_BroadcastReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "AutoStart onReceive...");
        if (intent.getAction().equalsIgnoreCase(Intent.ACTION_BOOT_COMPLETED)) {
            Intent i = new Intent(context, ActivityService.class);
            i.setAction(Constants.ACTION_START_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.i(TAG, "Starting foreground service on boot");
                context.startForegroundService(i);
            } else {
                Log.i(TAG, "Starting service on boot");
                context.startService(i);
            }
        }
    }
}
