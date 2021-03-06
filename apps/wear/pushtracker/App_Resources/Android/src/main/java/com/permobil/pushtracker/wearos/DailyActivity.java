package com.permobil.pushtracker;

import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

import com.google.api.client.util.Key;

import java.util.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.ChronoField;

import java.text.SimpleDateFormat;
import java.util.Calendar;

// Class defining how the activity data will be collected per day
public class DailyActivity {
  private static final String TAG = "DailyActivity";

  // time helpers
  private static final long NANO_PER_SECOND = 1000L * 1000L * 1000L;
  private static final long MICRO_PER_SECOND = 1000L * 1000L;
  private static final long MILLI_PER_SECOND = 1000L;
  private static final long NANO_PER_MILLI = 1000L * 1000L;

  // Maximum amount of time allowed between pushes to be considered
  // when updating coast time. Value is in seconds.
  private static final float COAST_TIME_THRESHOLD = 30.0f;

  // Minimum number of pushes before we try updating the coast time
  // threshold
  private static final int COAST_THRESHOLD_UPDATE_MIN_PUSH_COUNT = 20;

  // Factor used to scale average coast time by to determine coast
  // time threshold
  private static final float COAST_THRESHOLD_FACTOR = 5.0f;

  // Minimum time for coast threshold setting (to keep it from getting
  // too small). Value is in seconds.
  private static final float MIN_COAST_TIME_THRESHOLD = 10.0f;

  private static final int RECORD_LENGTH_MINUTES = 30;
  private static final long RECORD_LENGTH_MS = RECORD_LENGTH_MINUTES * 60 * MILLI_PER_SECOND;

  // individual record of activity with standard start time in 30
  // minute intervals
  public static class Record {
    // these entries are the same as the ones in the parent class -
    // look at their comments for more info
    @Key("start_time")
    public long start_time;
    @Key("push_count")
    public int push_count;
    @Key("coast_time_count")
    public int coast_time_count;
    @Key("coast_time_total")
    public float coast_time_total;
    @Key("coast_time_avg")
    public float coast_time_avg;
    @Key("distance_watch")
    public float distance_watch;
    @Key("heart_rate")
    public float heart_rate;

    public Record() {
      // make the start time the time in milliseconds of the most
      // recent half-hour
      Instant now = Instant.now().truncatedTo(ChronoUnit.MINUTES);
      int modulo = now.atZone(ZoneOffset.UTC).getMinute() % RECORD_LENGTH_MINUTES;
      if (modulo > 0) {
        // if we're not on the 30 minute mark already, subtract
        // however many minutes it's been since the last half-hour
        now = now.plus(-modulo, ChronoUnit.MINUTES);
      }
      // now set the time
      this.start_time = now.toEpochMilli();
    }

    public Record(long start, int pushes, int coastTimeCount, float coastTimeTotal, float coastTimeAvg, float watchDist, float heartRate) {
      this.start_time = start;
      this.push_count = pushes;
      this.coast_time_count = coastTimeCount;
      this.coast_time_total = coastTimeTotal;
      this.coast_time_avg = coastTimeAvg;
      this.distance_watch = watchDist;
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

  // YYYY-MM-DD representation of date for which the activity was
  // recorded
  @Key("date")
  public String date;

  // start time for the day in Epoch Time - for easier querying from
  // the backend
  @Key("start_time")
  public long start_time;

  // serial number of watch from which this data came
  @Key("watch_serial_number")
  public String watch_serial_number;

  // total number of pushes
  @Key("push_count")
  public int push_count;

  // push count used for coast time - we should not count pushes on
  // the edge of intervals for coast time, so we only update this
  // counter when we update coast time total
  @Key("coast_time_count")
  public int coast_time_count;

  // total number of seconds of coasting
  @Key("coast_time_total")
  public float coast_time_total;

  // average coast time for all pushes
  @Key("coast_time_avg")
  public float coast_time_avg;

  // average coast time for all pushes
  @Key("heart_rate")
  public float heart_rate;

  // distance calculated from watch (if any)
  @Key("distance_watch")
  public float distance_watch;

  // list of records of activity for the day
  @Key("records")
  public List<Record> records;

  // private members for tracking data
  private ActivityDetector.Detection lastPush = null;

  public DailyActivity() {
    // set up the date to be yyyy-mm-dd string
    SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy/MM/dd");
    Date now = Calendar.getInstance().getTime();
    String nowString = simpleDateFormat.format(now);
    this.date = nowString;
    // now set up the start_time to be midnight of that day in epoch
    // time
    this.start_time = Instant.now().truncatedTo(ChronoUnit.DAYS).toEpochMilli();
    // now initialize the data
    this.watch_serial_number = "";
    this.push_count = 0;
    this.coast_time_count = 0;
    this.coast_time_total = 0;
    this.coast_time_avg = 0;
    this.heart_rate = 0;
    this.distance_watch = 0;
    this.records = new ArrayList<>();
    this._id = UUID.randomUUID().toString();
    this.has_been_sent = false;
  }

  /**
   * Returns the existing record (or makes a new one if needed) whose start is the
   * most half-hour increment.
   */
  private Record getRecord(long timeMs) {
    Record rec = null;
    int numRecords = records.size();
    if (numRecords > 0) {
      // determine if we need a new record
      Record lastRec = records.get(numRecords - 1);
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
    return rec;
  }

  /**
   * These functions are responsible for managing the record list every time
   * activity data is updated.
   */
  public void onPush(ActivityDetector.Detection detection) {
    if (detection.activity != ActivityDetector.Detection.Activity.PUSH) {
      return;
    }
    long detectionTimeMs = (new Date()).getTime() + (detection.time - SystemClock.elapsedRealtimeNanos()) / NANO_PER_MILLI;
    Record rec = getRecord(detectionTimeMs);
    // increment record's pushes
    rec.push_count += 1;
    // now increment the total pushes
    this.push_count += 1;
    // calculate coast_time_threshold
    float coastTimeThreshold = COAST_TIME_THRESHOLD;
    if (this.push_count >= COAST_THRESHOLD_UPDATE_MIN_PUSH_COUNT) {
      float coastTime = this.coast_time_avg * COAST_THRESHOLD_FACTOR;
      if (coastTime < MIN_COAST_TIME_THRESHOLD) {
        coastTimeThreshold = MIN_COAST_TIME_THRESHOLD;
      } else if (coastTime < COAST_TIME_THRESHOLD) {
        coastTimeThreshold = coastTime;
      }
    }
    // calculate coast time here
    if (lastPush != null) {
      long timeDiffNs = detection.time - lastPush.time;
      // Log.d(TAG, "time diff ns: " + timeDiffNs);
      float coastTime = timeDiffNs / (float) NANO_PER_SECOND;
      if (coastTime > 0 && coastTime < coastTimeThreshold) {
        // update record coast time
        rec.coast_time_total += coastTime;
        // update the total coast time
        this.coast_time_total += coastTime;
        // update record coast count
        rec.coast_time_count += 1;
        // update daily coast count
        this.coast_time_count += 1;
        // update record average coast time
        rec.coast_time_avg = rec.coast_time_total / rec.coast_time_count;
        // now compute the average coast time
        this.coast_time_avg = this.coast_time_total / this.coast_time_count;
      }
    }
    // update the last push
    lastPush = detection;
    // since we've updated the record, mark its has_been_sent field to
    // false
    this.has_been_sent = false;
  }
}
