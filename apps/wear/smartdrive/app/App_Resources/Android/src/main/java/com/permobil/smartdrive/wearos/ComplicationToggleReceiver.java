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
package com.permobil.smartdrive.wearos;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.support.wearable.complications.ProviderUpdateRequester;

/**
 * Simple {@link BroadcastReceiver} subclass for asynchronously incrementing an integer for any
 * complication id triggered via TapAction on complication. Also, provides static method to create a
 * {@link PendingIntent} that triggers this receiver.
 */
public class ComplicationToggleReceiver extends BroadcastReceiver {

  private static final String PREFIX = "com.permobil.smartdrive.wearos.";

  private static final String EXTRA_PROVIDER_COMPONENT =
    PREFIX + "provider.action.PROVIDER_COMPONENT";
  private static final String EXTRA_COMPLICATION_ID =
    PREFIX + "provider.action.COMPLICATION_ID";
  private static final String EXTRA_DATA_ID =
    PREFIX + "provider.action.DATA_ID";
  private static final String EXTRA_UNITS_ID =
    PREFIX + "provider.action.UNITS_ID";

  static final String COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY =
    PREFIX + "COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY";

  static final String APP_PREFERENCES_FILE_KEY =
    "prefs.db";

  @Override
  public void onReceive(Context context, Intent intent) {
    Bundle extras = intent.getExtras();
    ComponentName provider = extras.getParcelable(EXTRA_PROVIDER_COMPONENT);
    int complicationId = extras.getInt(EXTRA_COMPLICATION_ID);
    String dataId = extras.getString(EXTRA_DATA_ID);
    String unitsId = extras.getString(EXTRA_UNITS_ID, null);

    String preferenceKey = getPreferenceKey(provider, complicationId, dataId);
    SharedPreferences sharedPreferences =
      context.getSharedPreferences(COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY, 0);

    // now save the value to the shared preferences so the provider
    // service can read it
    SharedPreferences.Editor editor = sharedPreferences.edit();

    // preferences file for loading data from the app
    SharedPreferences appSharedPreferences =
      context.getSharedPreferences(APP_PREFERENCES_FILE_KEY, 0);

    // Now actually get the data to be shown and request an update for
    // the complication that has just been toggled.
    editor.putFloat(preferenceKey, appSharedPreferences.getFloat(dataId, 0.0f));

    if (unitsId) {
      editor.putString(preferenceKey, appSharedPreferences.getString(unitsId, "english"));
    }

    // now actually tell the editor to apply the changes
    editor.apply();

    ProviderUpdateRequester requester = new ProviderUpdateRequester(context, provider);
    requester.requestUpdate(complicationId);
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
    Intent intent = new Intent(context, ComplicationToggleReceiver.class);
    intent.putExtra(EXTRA_PROVIDER_COMPONENT, provider);
    intent.putExtra(EXTRA_COMPLICATION_ID, complicationId);
    intent.putExtra(EXTRA_DATA_ID, dataId);

    // Pass complicationId as the requestCode to ensure that different complications get
    // different intents.
    return PendingIntent.getBroadcast(
                                      context, complicationId, intent, PendingIntent.FLAG_UPDATE_CURRENT);
  }

  /**
   * Returns a pending intent, suitable for use as a tap intent, that causes a complication to be
   * toggled and updated.
   */
  static PendingIntent getToggleIntent(
                                       Context context,
                                       ComponentName provider,
                                       int complicationId,
                                       String dataId,
                                       String unitsId) {
    Intent intent = new Intent(context, ComplicationToggleReceiver.class);
    intent.putExtra(EXTRA_PROVIDER_COMPONENT, provider);
    intent.putExtra(EXTRA_COMPLICATION_ID, complicationId);
    intent.putExtra(EXTRA_DATA_ID, dataId);
    intent.putExtra(EXTRA_UNITS_ID, unitsId);

    // Pass complicationId as the requestCode to ensure that different complications get
    // different intents.
    return PendingIntent.getBroadcast(
                                      context, complicationId, intent, PendingIntent.FLAG_UPDATE_CURRENT);
  }

  /**
   * Returns the key for the shared preference used to hold the current state of a given
   * complication.
   */
  static String getPreferenceKey(ComponentName provider, int complicationId, String dataId) {
    return provider.getClassName() + complicationId + "." + dataId;
  }
}
