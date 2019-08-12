package com.permobil.pushtracker.wearos;

import android.os.Build;
import android.os.SystemClock;

import com.google.api.client.util.Key;

import java.util.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import java.text.SimpleDateFormat;
import java.util.Calendar;

// Class defining how the activity data will be collected per day
public class DailyActivity {
  // individual record of activity with standard start time in 30
  // minute intervals
  public static class Record {
    @Key("start_time")
    public long start_time;
    @Key("push_count")
    public int push_count;
    @Key("coast_time_avg")
    public float coast_time_avg;
    @Key("heart_rate")
    public float heart_rate;
  };

  // we need to make our own id so that we can properly check if it's
  // been sent when sending
  @Key("_id")
  public String _id;

  // keep track of whether we've sent this to the server or not
  @Key("has_been_sent")
  public boolean has_been_sent;

  // since we will have multiple types in the DB (e.g. DailyActivity,
  // WeeklySummary, MonthlySummary, TrackedSession, etc.)
  @Key("data_type")
  public string data_type;

  // YYYY-MM-DD representation of date for which the activity was
  // recorded
  @Key("date")
  public String date;

  // start time for the day in Epoch Time - for easier querying from
  // the backend
  @Key("start_time")
  public long start_time;

  // total number of pushes
  @Key("push_count")
  public int push_count;

  // average coast time for all pushes
  @Key("coast_time_avg")
  public float coast_time_avg;

  // average coast time for all pushes
  @Key("heart_rate")
  public float heart_rate;

  // distance calculated from phone (if any)
  @Key("phone_distance")
  public float phone_distance;

  // distance calculated from watch (if any)
  @Key("watch_distance")
  public float watch_distance;

  // coast distance from smartdrive (if any)
  @Key("smartdrive_coast_distance")
  public float smartdrive_coast_distance;

  // drive distance from smartdrive (if any)
  @Key("smartdrive_drive_distance")
  public float smartdrive_drive_distance;

  // list of records of activity for the day
  @Key("records")
  public List<Record> records;

  public ActivityData() {
    SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd");
    Date now = Calendar.getInstance().getTime();
    String nowString = simpleDateFormat.format(now);
    this.date = nowString;
    this.push_count = 0;
    this.coast_time_avg = 0;
    this.heart_rate = 0;
    this.phone_distance = 0;
    this.watch_distance = 0;
    this.smartdrive_coast_distance = 0;
    this.smartdrive_drive_distance = 0;
    this.records = new ArrayList<>();
    this._id = UUID.randomUUID().toString();
    this.has_been_sent = false;
    this.data_type = "DailyActivity";
  }

  public ActivityData(String date,
                      int pushes,
                      float coast,
                      float heartRate,
                      float phoneDistance,
                      float watchDistance,
                      float coastDistance,
                      float driveDistance,
                      List<Record> records,
                      String uuid,
                      boolean hasBeenSent
                      ) {
    this.date = date;
    this.push_count = pushes;
    this.coast_time_avg = coast;
    this.heart_rate = heartRate;
    this.phone_distance = phoneDistance;
    this.watch_distance = watchDistance;
    this.smartdrive_coast_distance = coastDistance;
    this.smartdrive_drive_distance = driveDistance;
    this.records = records;
    this._id = uuid;
    this.has_been_sent = hasBeenSent;
    this.data_type = "DailyActivity";
  }

  /**
   * This function is responsible for managing the record list every
   * time activity data is updated.
   */
  public update(
                int pushes,
                float coast,
                float heartRate,
                float phoneDistance,
                float watchDistance,
                float coastDistance,
                float driveDistance
                ) {
  }
}
