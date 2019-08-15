package com.permobil.pushtracker.wearos;

import android.content.Context;
import android.content.SharedPreferences;

public class Datastore {
  public static final String PREF_NAME = "prefs.db";

  public static final String PREFIX = "com.permobil.pushtracker.wearos.";
  public static final String CURRENT_DATE_KEY = "current_date";
  public static final String CURRENT_PUSH_COUNT_KEY = "current_push_count";
  public static final String CURRENT_HEART_RATE_KEY = "current_heart_rate";
  public static final String CURRENT_COAST_KEY = "current_coast";
  public static final String CURRENT_TOTAL_COAST_KEY = "current_total_coast";
  public static final String CURRENT_DISTANCE_KEY = "current_distance";
  public static final String WATCH_SERIAL_NUMBER_KEY = "watch_serial_number";

  private SharedPreferences preferences;

  public Datastore(Context context) {
    preferences = context.getSharedPreferences(PREF_NAME, 0);
  }

  public String getDate() {
    return preferences.getString(PREFIX + CURRENT_DATE_KEY, "");
  }

  public void setDate(String date) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putString(PREFIX + CURRENT_DATE_KEY, date);
    editor.commit();
  }

  public int getPushes() {
    return preferences.getInt(PREFIX + CURRENT_PUSH_COUNT_KEY, 0);
  }

  public void setPushes(int pushes) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putInt(PREFIX + CURRENT_PUSH_COUNT_KEY, pushes);
    editor.commit();
  }

  public float getHeartRate() {
    return preferences.getFloat(PREFIX + CURRENT_HEART_RATE_KEY, 0.0f);
  }

  public void setHeartRate(float hr) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_HEART_RATE_KEY, hr);
    editor.commit();
  }

  public float getCoast() {
    return preferences.getFloat(PREFIX + CURRENT_COAST_KEY, 0.0f);
  }

  public void setCoast(float coastTime) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_COAST_KEY, coastTime);
    editor.commit();
  }

  public float getTotalCoast() {
    return preferences.getFloat(PREFIX + CURRENT_TOTAL_COAST_KEY, 0.0f);
  }

  public void setTotalCoast(float totalCoastTime) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_TOTAL_COAST_KEY, totalCoastTime);
    editor.commit();
  }

  public float getDistance() {
    return preferences.getFloat(PREFIX + CURRENT_DISTANCE_KEY, 0.0f);
  }

  public void setDistance(float distance) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putFloat(PREFIX + CURRENT_DISTANCE_KEY, distance);
    editor.commit();
  }

  public String getSerialNumber() {
    return preferences.getString(PREFIX + WATCH_SERIAL_NUMBER_KEY, "");
  }

  public void setSerialNumber(String serialNumber) {
    SharedPreferences.Editor editor = preferences.edit();
    editor.putString(PREFIX + WATCH_SERIAL_NUMBER_KEY, serialNumber);
    editor.commit();
  }
}
