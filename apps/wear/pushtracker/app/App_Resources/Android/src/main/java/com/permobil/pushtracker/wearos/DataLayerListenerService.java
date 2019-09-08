/*
 * Copyright (C) 2014 The Android Open Source Project
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

import android.content.Intent;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;

/** Listens to DataItems and Messages from the local node. */
public class DataLayerListenerService extends WearableListenerService {

  private static final String TAG = "DataLayerService";

  private static final String START_ACTIVITY_PATH = "/activity";
  private static final String DATA_ITEM_RECEIVED_PATH = "/data-item-received";

  public static final String APP_DATA_PATH = "/app-data";
  public static final String APP_DATA_KEY = "app-data";
  public static final String WEAR_DATA_PATH = "/wear-data";
  public static final String WEAR_DATA_KEY = "wear-data";

  private Datastore datastore;

  @Override
  public void onCreate() {
    super.onCreate();
    Log.d(TAG, "onCreate()");
    datastore = new Datastore(this);
  }

  private void startService() {
    Intent i = new Intent(getApplicationContext(), ActivityService.class);
    i.setAction(Constants.ACTION_START_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(i);
    } else {
      startService(i);
    }
  }

  private void openApp(String packageName) {
    Intent i = new Intent();
    i.setClassName(getApplicationContext(), packageName);
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    startActivity(i);
  }

  @Override
  public void onDataChanged(DataEventBuffer dataEvents) {
    Log.d(TAG, "onDataChanged: " + dataEvents);

    /*
    Log.d(TAG, "Starting Service from app data!");
    startService();
    Log.d(TAG, "Opening wear app from app data!");
    openApp("com.permobil.pushtracker.MainActivity");
    */
  }

  @Override
  public void onMessageReceived(MessageEvent messageEvent) {
    Log.d(TAG, "onMessageReceived: " + messageEvent);
    Log.d(TAG, "Message Path: " + messageEvent.getData().toString());
    String message = new String(messageEvent.getData());
    Log.d(TAG, "Message: " + message);

    String token = "";
    String userId = "";
    // get authorization (parse into token / user id from string or
    // depending on path) - right now we're just parsing a string of
    // the form: "${auth token}:${user id}", but we should send them
    // to different paths in case the auth token can have ':' in it...
    String[] parts = message.split(":", 0);
    if (parts.length != 2) {
      Log.e(TAG, "Error, bad auth received!");
      return;
    }
    token = parts[0];
    userId = parts[1];
    Log.d(TAG, "Got auth: '" + token + "' and user id: '" + userId + "'");

    // Log.d(TAG, "Starting Service from app message!");
    // startService();

    Log.d(TAG, "Opening com.permobil.pushtracker.MainActivity from app message!");
    openApp("com.permobil.pushtracker.MainActivity");

    // Log.d(TAG, "Opening com.permobil.smartdrive.wearos.MainActivity from app message!");
    // openApp("com.permobil.smartdrive.wearos.MainActivity");

    // write token to content provider for smartdrive wear
    ContentValues tokenValue = new ContentValues();
    tokenValue.put("data", token);
    getContentResolver()
      .insert(com.permobil.pushtracker.SmartDriveUsageProvider.AUTHORIZATION_URI, tokenValue);

    // write token to app settings for pushtracker wear
    datastore.setAuthorization(token);

    // write user id to content provider for smartdrive wear
    ContentValues userValue = new ContentValues();
    userValue.put("data", userId);
    getContentResolver()
      .insert(com.permobil.pushtracker.SmartDriveUsageProvider.USER_ID_URI, userValue);

    // write user id to app settings for pushtracker wear
    datastore.setUserId(userId);
  }
}
