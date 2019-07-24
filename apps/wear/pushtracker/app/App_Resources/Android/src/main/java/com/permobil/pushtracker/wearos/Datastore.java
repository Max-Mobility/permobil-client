package com.permobil.pushtracker.wearos;

import android.content.Context;
import android.content.SharedPreferences;

public class Datastore {
  private static final String PREF_NAME = "prefs.db";

  private static final String PREFIX = "com.permobil.pushtracker.wearos.";
  private static final String CURRENT_PUSH_COUNT_KEY = "current_push_count";
  private static final String CURRENT_HEART_RATE_KEY = "current_heart_rate";
  private static final String CURRENT_COAST_KEY = "current_coast";
  private static final String CURRENT_DISTANCE_KEY = "current_distance";

  private SharedPreferences preferences;

  public Datastore(Context context) {
    preferences = context.getSharedPreferences(PREF_NAME, 0);
  }

  public void setPushes(int pushes) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putInt(PREFIX + CURRENT_PUSH_COUNT_KEY, pushes);
    editor.commit();
  }

  public void setHeartRate(float hr) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_HEART_RATE_KEY, hr);
    editor.commit();
  }

  public void setCoast(float coastTime) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_COAST_KEY, coastTime);
    editor.commit();
  }

  public void setDistance(float distance) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_DISTANCE_KEY, distance);
    editor.commit();
  }
}
