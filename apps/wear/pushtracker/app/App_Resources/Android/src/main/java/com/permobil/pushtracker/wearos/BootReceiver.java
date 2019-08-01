package com.permobil.pushtracker.wearos;

import android.app.AlarmManager;
import android.app.PendingIntent;
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
            // moving from old start service to alarm service
            AlarmManager scheduler = (AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
            PendingIntent scheduledIntent = PendingIntent.getService(context,
                                                                     0,
                                                                     i,
                                                                     PendingIntent.FLAG_UPDATE_CURRENT);
            scheduler.setInexactRepeating(AlarmManager.RTC_WAKEUP,
                                          System.currentTimeMillis(),
                                          15L * 1000L,
                                          scheduledIntent);
            /*
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.i(TAG, "Starting foreground ActivityService on boot");
                context.startForegroundService(i);
            } else {
                Log.i(TAG, "Starting ActivityService on boot");
                context.startService(i);
            }
            */
        }
    }
}
