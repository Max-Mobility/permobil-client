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
  private static final long MAX_ALLOWED_COAST_TIME_MS = 60 * 1000;
  // convert to ns
  private static final long COAST_TIME_THRESHOLD = MAX_ALLOWED_COAST_TIME_MS * 1000 * 1000;


  // individual record of activity with standard start time in 30
  // minute intervals
  public static class Record {
    @Key("start_time")
    public long start_time;
    @Key("push_count")
    public int push_count;
    @Key("coast_time_total");
    public float coast_time_total;
    @Key("coast_time_avg")
    public float coast_time_avg;
    @Key("phone_distance")
    public float phone_distance;
    @Key("watch_distance")
    public float watch_distance;
    @Key("smartdrive_coast_distance")
    public float smartdrive_coast_distance;
    @Key("smartdrive_drive_distance")
    public float smartdrive_drive_distance;
    @Key("heart_rate")
    public float heart_rate;

    public Record() {
      // make the start time the time in milliseconds of the most
      // recent half-hour
      Calendar calendar = Calendar.getInstance();
      // zero out the seconds / milliseconds
      calendar.set(Calendar.SECOND, 0);
      calendar.set(Calendar.MILLISECOND, 0);
      int modulo = calendar.get(Calendar.MINUTE) % 30;
      if (modulo > 0) {
        // if we're not on the 30 minute mark already, subtract
        // however many minutes it's been since the last half-hour
        calendar.add(Calendar.MINUTE, -modulo);
      }
      // now set the time
      this.start_time = calendar.getTime();
    }

    public Record(
                  long start,
                  int pushes,
                  float coastTimeTotal,
                  float coastTimeAvg,
                  float phoneDist,
                  float watchDist,
                  float sdCoastDist,
                  float sdDriveDist,
                  float heartRate
                  ) {
      this.start_time = start;
      this.push_count = pushes;
      this.coast_time_total = coastTimeTotal;
      this.coast_time_avg = coastTimeAvg;
      this.phone_distance = phoneDist;
      this.watch_distance = watchDist;
      this.smartdrive_coast_distance = sdCoastDist;
      this.smartdrive_drive_distance = sdDriveDist;
      this.heart_rate = heartRate;
    }
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

  @Key("coast_time_total");
  public float coast_time_total;

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

  // private members for tracking data
  private ActivityDetector.Detection lastPush = null;

  public ActivityData() {
    SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd");
    Date now = Calendar.getInstance().getTime();
    String nowString = simpleDateFormat.format(now);
    this.date = nowString;
    this.push_count = 0;
    this.coast_time_total = 0;
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
                      float coastTotal,
                      float coastAvg,
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
    this.coast_time_total = coastTotal;
    this.coast_time_avg = coastAvg;
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
   * Returns the existing record (or makes a new one if needed) whose
   * start is the most half-hour increment.
   */
  private Record getRecord(long timeMs) {
    int numRecords = records.size();
    if (numRecords > 0) {
      // determine if we need a new record
      Record lastRec = records[numRecords - 1];
      long timeDiffMs = timeMs - lastRec.start_time;
      if (timeDiffMs > RECORD_LENGTH_MS) {
        // time for a new record
        rec = new Record();
        // and append it
        records.add(rec);
      } else {
        // can just use this record
        rec = lastRec;
      }
    } else {
      // we have no records, make a new one
      rec = new Record();
      // and append it
      records.add(rec);
    }
  }

  /**
   * These functions are responsible for managing the record list
   * every time activity data is updated.
   */
  public void onPush(ActivityDetector.Detection detection) {
    if (detection.activity != ActivityDetector.Detection.Activity.PUSH) {
      return;
    }
    Record rec = getRecord( detection.time / (1000 * 1000) );
    // increment record's pushes
    rec.push_Count += 1;
    // now increment the total pushes
    this.push_count += 1;
    // calculate coast time here
    if (lastPush != null) {
      long timeDiffNs = detection.time - lastPush.time;
      if (timeDiffNs < COAST_TIME_THRESHOLD) {
        float coastTime = timeDiffNs / (1000.0f * 1000.0f * 1000.0f);
        // update record coast time
        rec.coast_time_total += coastTime;
        // update the total coast time
        this.coast_time_total += coastTime;
        // update record average coast time
        rec.coast_time_avg = rec.coast_time_total / rec.push_count;
        // now compute the average coast time
        this.coast_time_avg = this.coast_time_total / this.push_count;
      }
    }
    // update the last push
    lastPush = detection;
    // since we've updated the record, mark its has_been_sent field to
    // false
    this.has_been_sent = false;
  }
}
