/*
 * Copyright (C) 2017 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.permobil.pushtracker;

import android.app.ActivityManager;
import android.app.ActivityManager.RunningServiceInfo;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.support.wearable.complications.ProviderUpdateRequester;
import android.util.Log;

import java.util.List;

import com.permobil.pushtracker.Datastore;

/**
 * Simple {@link BroadcastReceiver} subclass for asynchronously incrementing an integer for any
 * complication id triggered via TapAction on complication. Also, provides static method to create a
 * {@link PendingIntent} that triggers this receiver.
 */
public class ComplicationToggleReceiver extends BroadcastReceiver {

  private static final String PREFIX = "com.permobil.pushtracker.";

  private static final String EXTRA_PROVIDER_COMPONENT =
    PREFIX + "provider.action.PROVIDER_COMPONENT";
  private static final String EXTRA_COMPLICATION_ID =
    PREFIX + "provider.action.COMPLICATION_ID";
  private static final String EXTRA_DATA_ID =
    PREFIX + "provider.action.DATA_ID";

  static final String APP_PREFERENCES_FILE_KEY =
    "prefs.db";

  @Override
  public void onReceive(Context context, Intent intent) {
    Bundle extras = intent.getExtras();
    ComponentName provider = extras.getParcelable(EXTRA_PROVIDER_COMPONENT);
    int complicationId = extras.getInt(EXTRA_COMPLICATION_ID);
    ProviderUpdateRequester requester = new ProviderUpdateRequester(context, provider);
    requester.requestUpdate(complicationId);
  }

  public static boolean isServiceRunning(Context context,Class<? extends Service> serviceClass){
    final ActivityManager activityManager = (ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
    final List<RunningServiceInfo> services = activityManager.getRunningServices(Integer.MAX_VALUE);

    for (RunningServiceInfo runningServiceInfo : services) {
      Log.d("ComplicationToggleReceiver", String.format("Service:%s", runningServiceInfo.service.getClassName()));
      if (runningServiceInfo.service.getClassName().equals(serviceClass.getName())){
        return true;
      }
    }
    return false;
  }

  /**
   * Returns a pending intent, suitable for use as a tap intent, that causes a complication to be
   * toggled and updated.
   */
  static PendingIntent getToggleIntent(
                                       Context context,
                                       ComponentName provider,
                                       int complicationId,
                                       String dataId) {
    boolean isServiceRunning = isServiceRunning(context, ActivityService.class);
    Log.w("ComplicationToggleReceiver", "getToggleIntent() isServiceRunning: " +
          isServiceRunning);

    Intent intent;
    if (!isServiceRunning) {
      // if the service is not running, we open the app to make sure
      // the user can allow the permissions and such
      intent = new Intent();
      intent.setClassName(
                          context,
                          "com.permobil.pushtracker.MainActivity");
      // A string containing the action name
      intent.setAction(Constants.ACTION_START_SERVICE);
      intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      // Pass complicationId as the requestCode to ensure that
      // different complications get different intents.
      return PendingIntent.getActivity(context,
                                       complicationId,
                                       intent,
                                       PendingIntent.FLAG_UPDATE_CURRENT);
    } else {
      // else the service is already running, just try to update the
      // complication
      intent = new Intent(context, ComplicationToggleReceiver.class);
      intent.putExtra(EXTRA_PROVIDER_COMPONENT, provider);
      intent.putExtra(EXTRA_COMPLICATION_ID, complicationId);
      // Pass complicationId as the requestCode to ensure that different
      // complications get different intents.
      return PendingIntent.getBroadcast(context,
                                        complicationId,
                                        intent,
                                        PendingIntent.FLAG_UPDATE_CURRENT);
    }
  }
}
