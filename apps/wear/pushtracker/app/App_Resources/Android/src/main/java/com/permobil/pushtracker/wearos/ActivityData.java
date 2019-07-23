package com.permobil.pushtracker.wearos;

import android.os.Build;
import android.os.SystemClock;

import com.google.api.client.util.Key;

import java.util.Date;
import java.util.List;
import java.util.UUID;

public class ActivityData {

  public static class HeartRate {
    public long t;
    public float hr;
  }

  public static class Location {
    public long t;
    public float lat;
    public float lon;
    public float spd;
    public float alt;
  }

  /**
   * Returns the seconds since Epoch
   */
  @Key("date")
  public String date;

  @Key("pushes")
  public int pushes;

  @Key("coast")
  public float coast;

  @Key("distance")
  public float distance;

  @Key("smartdrive_distance")
  public float smartdrive_distance;

  @Key("has_been_sent")
  public boolean has_been_sent;

  @Key("_id")
  public String _id;

  @Key("heart_rates")
  public List<HeartRate> heart_rates;

  @Key("locations")
  public List<Location> locations;

  @Key("user_identifier")
  public String user_identifier;

  public ActivityData() {
    // TODO: fix this to format the date properly
    this.date = ""; // System.currentTimeMillis() / 1000;
  }

  public ActivityData(String date,
                      int pushes,
                      float coast,
                      float distance,
                      float smartDriveDistance,
                      List<HeartRate> heartRates,
                      List<Location> locations,
                      String userId,
                      String uuid,
                      boolean hasBeenSent
                      ) {
    this.date = date;
    this.pushes = pushes;
    this.coast = coast;
    this.distance = distance;
    this.smartdrive_distance = smartDriveDistance;
    this.heart_rates = heartRates;
    this.locations = locations;
    this.user_identifier = userId;
    this._id = uuid;
    this.has_been_sent = hasBeenSent;
  }
}
