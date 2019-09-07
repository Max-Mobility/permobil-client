package com.permobil.pushtracker;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.location.LocationListener;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;

import android.app.Notification.Builder;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.nio.MappedByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Map;

import java.text.SimpleDateFormat;

import io.reactivex.Observable;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.schedulers.Schedulers;
import okhttp3.RequestBody;
import retrofit2.Retrofit;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory;
import retrofit2.converter.gson.GsonConverterFactory;

import io.sentry.Sentry;

import com.permobil.pushtracker.DailyActivity;

// TODO: receive kinvey authentication from DataLayerListenerService

// TODO: communicate with the main app regarding when to start / stop tracking:
//        * heart rate
//        * GPS

public class ActivityService
  extends WearableListenerService implements SensorEventListener,
                                             LocationListener {

  private static final String TAG = "PermobilActivityService";

  private static final String START_ACTIVITY_PATH = "/activity";
  private static final String DATA_ITEM_RECEIVED_PATH = "/data-item-received";

  public static final String APP_DATA_PATH = "/app-data";
  public static final String APP_DATA_KEY = "app-data";
  public static final String WEAR_DATA_PATH = "/wear-data";
  public static final String WEAR_DATA_KEY = "wear-data";

  private long _lastPushDataTimeMs = 0;
  private static final int PUSH_TASK_PERIOD_MS = 1 * 60 * 1000;

  public boolean isDebuggable = false;

  public String watchSerialNumber = null;

  private static final int NOTIFICATION_ID = 765;

  // rate at which we request sensor data updates
  private static final int SENSOR_RATE_HZ = 25;
  // microseconds between sensor data
  private static final int SENSOR_DELAY_US = 1000 * 1000 / SENSOR_RATE_HZ;
  // 1 minute between sensor updates in microseconds
  private static final int SENSOR_REPORTING_LATENCY_US = 3 * 60 * 1000 * 1000;

  // 25 meters / minute = 1.5 km / hr (~1 mph)
  private static final long LOCATION_LISTENER_MIN_TIME_MS = 5 * 60 * 1000;
  private static final float LOCATION_LISTENER_MIN_DISTANCE_M = 125;
  // distance in m under which we don't consider the device to have moved
  private static final float LOCATION_DISTANCE_THRESHOLD_M = LOCATION_LISTENER_MIN_DISTANCE_M;
  // speed in m/s under which we don't compute distance travelled
  private static final float LOCATION_SPEED_THRESHOLD_MIN_MPS = 0.4f; // ~= 0.9 miles per hour
  // speed in m/s over which we don't compute distance travelled
  private static final float LOCATION_SPEED_THRESHOLD_MAX_MPS = 4.0f; // ~= 9.0 miles per hour

  private BroadcastReceiver timeReceiver = null;
  private BroadcastReceiver batteryReceiver = null;
  private Location mLastKnownLocation = null;
  private LocationManager mLocationManager;
  private SensorManager mSensorManager;
  private Sensor mLinearAcceleration;
  private Sensor mGravity;
  private Sensor mGyroscope;
  private Sensor mOffBodyDetect;

  private KinveyApiService mKinveyApiService;
  private String mKinveyAuthorization = null;

  // for sending to the main app via intent
  private long _lastSendDataTimeMs = 0;
  public static final long SEND_DATA_INTERVAL_MS = 5000;

  // activity detection
  public boolean personIsActive = false;
  public boolean watchBeingWorn = false;
  public boolean disableWearCheck = false;
  public boolean isServiceRunning = false;

  // activity data
  DailyActivity currentActivity = new DailyActivity();

  // helper objects
  private ActivityDetector activityDetector;
  private DatabaseHandler db;
  private Datastore datastore;

  public ActivityService() {
  }

  @Override
  public void onCreate() {
    super.onCreate();
    Log.d(TAG, "ActivityService onCreate...");

    Log.d(TAG, "Initializing Sentry");
    Sentry.init(
                "https://5670a4108fb84bc6b2a8c427ab353472@sentry.io/1485857"
                );

    // set the debuggable flag
    // isDebuggable = (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE));

    // create objects
    activityDetector = new ActivityDetector(this);
    db = new DatabaseHandler(this);
    datastore = new Datastore(this);

    // initialize data
    loadFromDatabase();

    // create the retrofit instance
    Retrofit retrofit = new Retrofit.Builder()
      .baseUrl(Constants.API_BASE)
      .addConverterFactory(GsonConverterFactory.create())
      .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
      .build();

    // create an instance of the KinveyApiService
    mKinveyApiService = retrofit.create(KinveyApiService.class);

    // get the serial number from the data store
    watchSerialNumber = datastore.getSerialNumber();
    disableWearCheck = datastore.getDisableWearCheck();
    // make sure to set the serial number
    currentActivity.watch_serial_number = this.watchSerialNumber;

    /*
    // Get the LocationManager so we can send last known location
    // with the record when saving to Kinvey
    mLocationManager = (LocationManager) getApplicationContext()
      .getSystemService(Context.LOCATION_SERVICE);
    */
    isServiceRunning = false;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    Log.d(TAG, "onStartCommand()");
    Log.d(TAG, "isServiceRunning: " + isServiceRunning);
    if (!isServiceRunning) {
      // Set the user in the current context.
      // Sentry.getContext().setUser(new UserBuilder().setId(userIdentifier).build());
      Log.d(TAG, "[intent - flags - startId]: " + intent + " - " + flags + " - " + startId);
      if (intent != null &&
          Objects.requireNonNull(intent.getAction()).equals(Constants.ACTION_START_SERVICE)) {
        startServiceWithNotification();

        // for keeping track of the days
        this.setupTimeReceiver();

        // for getting notified when we're on the charger (to send data)
        this.setupBatteryReceiver();

        Log.d(TAG, "starting service!");

        this.initSensors();
        this.registerAllSensors();

      } else {
        stopMyService();
      }
    }

    // START_STICKY is used for services that are explicitly started
    // and stopped as needed
    return START_STICKY;
  }

  @Override
  public void onDataChanged(DataEventBuffer dataEvents) {
    Log.d(TAG, "onDataChanged: " + dataEvents);
  }

  @Override
  public void onMessageReceived(MessageEvent event) {
    Log.d(TAG, "onMessageReceived: " + event);
    Log.d(TAG, "Message Path: " + event.getData().toString());
    Log.d(TAG, "Message: " + new String(event.getData()));
  }

  private void loadFromDatabase() {
    // TODO: load from sqlite here
    long tableRowCount = db.getTableRowCount();
    if (tableRowCount == 0) {
      // make new DailyActivity
      currentActivity = new DailyActivity();
      // go ahead and write it to db
      db.addRecord(currentActivity);
    } else {
      // get latest record
      DailyActivity dailyActivity = db.getMostRecent(false);
      SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy/MM/dd");
      // get current date
      Date now = Calendar.getInstance().getTime();
      String nowString = simpleDateFormat.format(now);
      if (dailyActivity.date.equals(nowString)) {
        // use the one we found
        currentActivity = dailyActivity;
      } else {
        // make new DailyActivity
        currentActivity = new DailyActivity();
        // go ahead and write it to db
        db.addRecord(currentActivity);
      }
    }
    // make sure to set the serial number
    currentActivity.watch_serial_number = this.watchSerialNumber;
  }

  private void PushDataToKinvey() {
    Log.d(TAG, "PushDataToKinvey()");
    // Check if the SQLite table has any records pending to be pushed
    long numUnsent = db.countUnsentEntries();
    if (numUnsent == 0 || mKinveyAuthorization == null) {
      return;
    }
    // we have data to send - so send it!
    try {
      Log.d(TAG, "Pushing Data");
      // get the oldest unsent record
      DatabaseHandler.Record r = db.getRecord(true);
      RequestBody body =
        RequestBody.create(okhttp3.MediaType.parse("application/json; charset=utf-8"), r.data);
      Call<DailyActivity> serviceCall = mKinveyApiService.sendData(
                                                                   mKinveyAuthorization,
                                                                   body,
                                                                   r.id
                                                                   );
      serviceCall.enqueue(new Callback<DailyActivity>() {
          @Override
          public void onResponse(Call<DailyActivity> call, Response<DailyActivity> response) {
            if (response.isSuccessful()) {
              DailyActivity item = response.body();
              Log.d(TAG, "item sent: " + item._id);
              // TODO: currently we don't delete any entries,
              // do we want to change that?
              // db.deleteRecord(item._id);

              // update the has_been_sent field for that
              // activity
              db.markRecordAsSent(item._id);
              if (item._id.equals(currentActivity._id)) {
                currentActivity.has_been_sent = true;
              }
            } else {
              Log.e(TAG, "send data not successful - " +
                    response.code() + ": " +
                    response.message());
            }
          }
          @Override
          public void onFailure(Call<DailyActivity> call, Throwable t) {
            Log.e(TAG, "Failed to send: " + t.getMessage());
            Sentry.capture(t);
          }
        });
    } catch (Exception e) {
      Log.e(TAG, "Exception pushing to kinvey:" + e.getMessage());
      Sentry.capture(e);
    }
  }

  public boolean isPlugged() {
    Context context = getApplicationContext();
    boolean isPlugged;
    Intent intent = context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    int plugged = 0;
    if (intent != null) {
      plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
    }
    isPlugged = plugged == BatteryManager.BATTERY_PLUGGED_AC || plugged == BatteryManager.BATTERY_PLUGGED_USB;
    isPlugged = isPlugged || plugged == BatteryManager.BATTERY_PLUGGED_WIRELESS;
    return isPlugged;
  }

  void setupBatteryReceiver() {
    if (this.batteryReceiver != null) {
      this.unregisterReceiver(this.batteryReceiver);
      this.batteryReceiver = null;
    }
    this.batteryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
          // Log.d(TAG, "BatteryReceiver::onReceive()");
          int plugged = 0;
          if (intent != null) {
            plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
          }
          boolean isPlugged =
            plugged == BatteryManager.BATTERY_PLUGGED_AC ||
            plugged == BatteryManager.BATTERY_PLUGGED_USB ||
            plugged == BatteryManager.BATTERY_PLUGGED_WIRELESS;
        }
      };
    // register battery receiver
    Log.d(TAG, "registering battery receiver");
    IntentFilter batteryFilter = new IntentFilter();
    batteryFilter.addAction(Intent.ACTION_BATTERY_CHANGED);
    this.registerReceiver(this.batteryReceiver, batteryFilter);
  }

  void setupTimeReceiver() {
    if (this.timeReceiver != null) {
      this.unregisterReceiver(this.timeReceiver);
      this.timeReceiver = null;
    }
    this.timeReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
          // Log.d(TAG, "TimeReceiver::onReceive()");
          // get the date from the datastore
          String currentDate = currentActivity.date;
          SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy/MM/dd");
          // get current date
          Date now = Calendar.getInstance().getTime();
          String nowString = simpleDateFormat.format(now);
          boolean sameDate = currentDate.equals(nowString);
          // Log.d(TAG, "Checking '" + nowString + "' == '" + currentDate +"': " + sameDate);
          // determine if it's a new day
          if (!sameDate) {
            // reset values to zero
            currentActivity = new DailyActivity();
            // make sure to set the serial number
            currentActivity.watch_serial_number = watchSerialNumber;
            // update the datastore - these are for the complication
            // providers and the pushtracker wear app
            datastore.setData(currentActivity.push_count,
                              currentActivity.coast_time_avg,
                              currentActivity.distance_watch);
            // go ahead and write it to db
            db.addRecord(currentActivity);
          }
        }
      };
    // register time receiver
    Log.d(TAG, "registering time receiver");
    IntentFilter timeFilter = new IntentFilter();
    timeFilter.addAction(Intent.ACTION_TIME_TICK);
    timeFilter.addAction(Intent.ACTION_TIMEZONE_CHANGED);
    this.registerReceiver(this.timeReceiver, timeFilter);
  }

  void handleDetection(ActivityDetector.Detection detection) {
    // Log.d(TAG, "detection: " + detection);
    if (detection.confidence > 0) {
      hasNewActivity = true;
      // update push detection
      if (detection.activity == ActivityDetector.Detection.Activity.PUSH) {
        currentActivity.onPush(detection);
      }
    }
  }

  private void registerAllSensors() {
    // register the body sensor so we get events when the user
    // wears the watch and takes it off
    this.registerBodySensor(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
    // turn on accelerometer sensing
    // this.registerGyroscope(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
    this.registerAccelerometer(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
    this.registerGravity(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
  }

  private void onWristCallback() {
    /*
    // turn on location sensing
    // according to the docs: "it is more difficult for location
    // providers to save power using the minDistance parameter, so
    // minTime should be the primary tool to conserving battery life."
    mLocationManager.requestLocationUpdates(
                                            LocationManager.GPS_PROVIDER,
                                            LOCATION_LISTENER_MIN_TIME_MS,
                                            0, // LOCATION_LISTENER_MIN_DISTANCE_M,
                                            this
                                            );
    */
    // this.registerGyroscope(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
    this.registerAccelerometer(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
    this.registerGravity(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
  }

  private void offWristCallback() {
    // turn off activity sensors
    // unregisterGyroscope();
    unregisterAccelerometer();
    unregisterGravity();
    // turn off location sensing
    // mLocationManager.removeUpdates(this);
  }

  @Override
  public void onLocationChanged(Location location) {
    if (!watchBeingWorn && !isDebuggable) {
      // don't do any range computation if the watch isn't being
      // worn
      return;
    }
    Log.d(TAG, "Got location: " + location);
    double lat = location.getLatitude();
    double lon = location.getLongitude();
    long time = location.getTime();
    long elapsedRealTimeNs = location.getElapsedRealtimeNanos();
    // update the distance
    if (mLastKnownLocation != null && mLastKnownLocation != location) {
      /*
       * speed: m/s
       *
       * location accuracy: 68% confidence radius (m)
       *
       * speed accuracy: 68% confidence 1-side range above & below
       * the estimated speed
       */
      // location data
      float currentSpeed = location.getSpeed();
      float currentLocationAccuracy = location.getAccuracy();
      float currentSpeedAccuracy = location.getSpeedAccuracyMetersPerSecond();
      float previousSpeed = mLastKnownLocation.getSpeed();
      float previousLocationAccuracy = mLastKnownLocation.getAccuracy();
      float previousSpeedAccuracy = mLastKnownLocation.getSpeedAccuracyMetersPerSecond();
      // compute our own speed using the locations and time (not as
      // accurate as the provided speeds)
      long timeDiffNs = elapsedRealTimeNs - mLastKnownLocation.getElapsedRealtimeNanos();
      float timeDiffSeconds = timeDiffNs / 1000000000.0f;
      float distance = mLastKnownLocation.distanceTo(location);
      float computedSpeed = distance / timeDiffSeconds;
      // compute minimum / maximum speeds based on confidences
      float currentMinSpeed = currentSpeed - currentSpeedAccuracy;
      float currentMaxSpeed = currentSpeed + currentSpeedAccuracy;
      float previousMinSpeed = previousSpeed - previousSpeedAccuracy;
      float previousMaxSpeed = previousSpeed + previousSpeedAccuracy;
      // determine validity of speeds
      boolean newSpeedValid =
        (currentSpeed <= LOCATION_SPEED_THRESHOLD_MAX_MPS) &&
        (currentSpeed >= LOCATION_SPEED_THRESHOLD_MIN_MPS) &&
        location.hasSpeed();
      boolean oldSpeedValid =
        (previousSpeed <= LOCATION_SPEED_THRESHOLD_MAX_MPS) &&
        (previousSpeed >= LOCATION_SPEED_THRESHOLD_MIN_MPS) &&
        mLastKnownLocation.hasSpeed();
      boolean computedSpeedValid =
        (computedSpeed <= LOCATION_SPEED_THRESHOLD_MAX_MPS) &&
        (computedSpeed >= LOCATION_SPEED_THRESHOLD_MIN_MPS);
      // determine validity of location based on difference - must
      // be actually moving, not just an update within the same
      // confidence threshold
      boolean newLocationIsFromMovement =
        distance >= LOCATION_DISTANCE_THRESHOLD_M &&
        (computedSpeedValid || newSpeedValid);
      // if we have valid speed, accumulate more distance
      if (newLocationIsFromMovement) {
        currentActivity.distance_watch += distance;
      }
    }
    // update the stored location for distance computation
    mLastKnownLocation = location;
    // TODO: save location data as a series of data if the user has
    // asked us to track their location through the app (for some
    // period of time)
  }

  @Override
  public void onProviderDisabled(String provider) {
    Log.d(TAG, "Provider disabled: " + provider);
  }

  @Override
  public void onProviderEnabled(String provider) {
    Log.d(TAG, "Provider enabled: " + provider);
  }

  @Override
  public void onStatusChanged(String provider, int status, Bundle extras) {
    Log.d(TAG, "onStatusChanged(): " + provider + " - " + status);
  }

  private boolean hasNewActivity = false;
  private boolean hasGyro = false;
  private boolean hasAccl = false;
  private boolean hasGrav = false;
  private float[] activityDetectorData = new float[ActivityDetector.InputSize];
  private long lastCheckTimeMs = 0;
  private static long WEAR_CHECK_TIME_MS = 1000;

  @Override
  public void onSensorChanged(SensorEvent event) {
    // Log.d(TAG, "SensorChanged: " + event);
    long timeDiffMs = 0;
    long now = System.currentTimeMillis();
    // check to see if the user wants to disable wear check
    timeDiffMs = now - lastCheckTimeMs;
    if (timeDiffMs > WEAR_CHECK_TIME_MS) {
      disableWearCheck = datastore.getDisableWearCheck();
      lastCheckTimeMs = now;
    }
    // handle event
    updateActivity(event);
    updateDetectorInputs(event);
    // detect activity
    if (canRunDetector()) {
      // reset flags for running detector
      hasGyro = false;
      hasGrav = false;
      hasAccl = false;
      // use the data to detect activities
      ActivityDetector.Detection detection =
        activityDetector.detectActivity(activityDetectorData, event.timestamp);
      handleDetection(detection);
      // reset the data
      clearDetectorInputs();
      // do we need to send data to the app?
      timeDiffMs = now - _lastSendDataTimeMs;
      if (timeDiffMs > SEND_DATA_INTERVAL_MS && hasNewActivity) {
        // reset flag
        hasNewActivity = false;
        // update data in datastore / shared preferences for use
        // with the complication providers and mobile app
        datastore.setData(currentActivity.push_count,
                          currentActivity.coast_time_avg,
                          currentActivity.distance_watch);
        // update data in SQLite tables
        db.updateRecord(currentActivity);
        // send intent to main activity with updated data
        sendDataToActivity(currentActivity.push_count,
                           currentActivity.coast_time_avg,
                           currentActivity.distance_watch);
        _lastSendDataTimeMs = now;
      }
    }
    // do we need to send data to the backend?
    timeDiffMs = now - _lastPushDataTimeMs;
    if (timeDiffMs > PUSH_TASK_PERIOD_MS) {
      try {
        PushDataToKinvey();
      } catch (Exception e) {
        Sentry.capture(e);
        Log.e(TAG, "Exception pushing data: " + e.getMessage());
      }
      _lastPushDataTimeMs = now;
    }
  }

  @Override
  public void onAccuracyChanged(Sensor sensor, int accuracy) {
    // TODO Auto-generated method stub
  }

  boolean canRunDetector() {
    return hasAccl && hasGrav && // hasGyro &&
      (watchBeingWorn || disableWearCheck);
  }

  void clearDetectorInputs() {
    for (int i=0; i<ActivityDetector.InputSize; i++) {
      activityDetectorData[i] = 0;
    }
  }

  private long numGrav = 0;
  private long numGyro = 0;
  private long numAccl = 0;
  private static final long LOG_TIME_MS = 1000;
  private long lastLogTimeMs = 0;
  void updateDetectorInputs(SensorEvent event) {
    int sensorType = event.sensor.getType();

    /*
    long now = System.currentTimeMillis();
    long timeDiffMs = now - lastLogTimeMs;
    if (timeDiffMs > LOG_TIME_MS) {
      long[] numArray = {numGyro, numAccl, numGrav};
      Log.d(TAG, "numArray: " + Arrays.toString(numArray));
      lastLogTimeMs = now;
    }
    */

    if (sensorType == Sensor.TYPE_GYROSCOPE) {
      numGyro++;
      hasGyro = true;
      for (int i=0; i<3; i++) {
        activityDetectorData[i + ActivityDetector.InputGyroOffset] = event.values[i];
      }
    } else if (sensorType == Sensor.TYPE_LINEAR_ACCELERATION) {
      numAccl++;
      hasAccl = true;
      for (int i=0; i<3; i++) {
        activityDetectorData[i + ActivityDetector.InputAcclOffset] = event.values[i];
      }
    } else if (sensorType == Sensor.TYPE_GRAVITY) {
      numGrav++;
      hasGrav = true;
      for (int i=0; i<3; i++) {
        activityDetectorData[i + ActivityDetector.InputGravOffset] = event.values[i];
      }
    }
  }

  void updateActivity(SensorEvent event) {
    // check if the user is wearing the watch
    if (event.sensor.getType() == Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT) {
      // 1.0 => device is on body, 0.0 => device is off body
      watchBeingWorn = (event.values[0] != 0.0);
      if (watchBeingWorn || isDebuggable) {
        // onWristCallback();
      } else {
        // offWristCallback();
      }
    }
  }

  private void initSensors() {
    mSensorManager = (SensorManager) getApplicationContext().getSystemService(SENSOR_SERVICE);
  }

  private void registerAccelerometer(int delay, int reportingLatency) {
    if (mSensorManager != null) {
      mLinearAcceleration = mSensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
      if (mLinearAcceleration != null)
        mSensorManager.registerListener(this, mLinearAcceleration, delay, reportingLatency);
    }
  }

  private void unregisterAccelerometer() {
    if (mSensorManager != null) {
      if (mLinearAcceleration != null)
        mSensorManager.unregisterListener(this, mLinearAcceleration);
    }
  }

  private void registerGravity(int delay, int reportingLatency) {
    if (mSensorManager != null) {
      mGravity = mSensorManager.getDefaultSensor(Sensor.TYPE_GRAVITY);
      if (mGravity != null)
        mSensorManager.registerListener(this, mGravity, delay, reportingLatency);
    }
  }

  private void unregisterGravity() {
    if (mSensorManager != null) {
      if (mGravity != null)
        mSensorManager.unregisterListener(this, mGravity);
    }
  }

  private void registerGyroscope(int delay, int reportingLatency) {
    if (mSensorManager != null) {
      mGyroscope = mSensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
      if (mGyroscope != null)
        mSensorManager.registerListener(this, mGyroscope, delay, reportingLatency);
    }
  }

  private void unregisterGyroscope() {
    if (mSensorManager != null) {
      if (mGyroscope != null)
        mSensorManager.unregisterListener(this, mGyroscope);
    }
  }

  private void registerBodySensor(int delay, int reportingLatency) {
    if (mSensorManager != null) {
      mOffBodyDetect = mSensorManager.getDefaultSensor(Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT);
      if (mOffBodyDetect != null)
        mSensorManager.registerListener(this, mOffBodyDetect, delay, reportingLatency);
    }
  }

  private void unregisterBodySensor() {
    if (mSensorManager != null) {
      if (mOffBodyDetect != null)
        mSensorManager.unregisterListener(this, mOffBodyDetect);
    }
  }

  private void unregisterDeviceSensors() {
    unregisterBodySensor();
    // unregisterGyroscope();
    unregisterAccelerometer();
    unregisterGravity();
  }

  private PendingIntent getAlarmIntent(int intentFlag) {
    Intent i = new Intent(getApplicationContext(), BootReceiver.class);
    PendingIntent scheduledIntent = PendingIntent.getBroadcast(getApplicationContext(),
                                                               BootReceiver.REQUEST_CODE,
                                                               i,
                                                               intentFlag);
    return scheduledIntent;
  }

  private void registerAlarm() {
    // create calendar object to set the start time (for use with RTC
    // alarm type)
    Calendar calendar = Calendar.getInstance();
    calendar.set(Calendar.HOUR_OF_DAY, 0); // Midnight
    calendar.set(Calendar.MINUTE, 0);
    calendar.set(Calendar.SECOND, 0);
    // long startTime = calendar.getTimeInMillis();
    long startTime = System.currentTimeMillis();
    // how frequently do we want this to repeat?
    long interval = AlarmManager.INTERVAL_HALF_HOUR;
    int alarmType = AlarmManager.RTC;
    // register alarm to start the service repeatedly
    PendingIntent intent = getAlarmIntent(PendingIntent.FLAG_UPDATE_CURRENT);
    AlarmManager am = (AlarmManager) getApplicationContext()
      .getSystemService(Context.ALARM_SERVICE);
    am.setRepeating(alarmType,
                    startTime,
                    interval,
                    intent);
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()...");
    super.onDestroy();

    try {
      // unregister time receiver
      if (this.timeReceiver != null) {
        this.unregisterReceiver(this.timeReceiver);
        this.timeReceiver = null;
      }
      // unregister battery receiver
      if (this.batteryReceiver != null) {
        this.unregisterReceiver(this.batteryReceiver);
        this.batteryReceiver = null;
      }
      // remove sensor listeners
      unregisterDeviceSensors();
      // remove location listener
      // mLocationManager.removeUpdates(this);
    } catch (Exception e) {
      Sentry.capture(e);
      Log.e(TAG, "onDestroy() Exception: " + e);
    }

    isServiceRunning = false;
  }

  private void sendDataToActivity(int pushes, float coast, float distance) {
    Intent intent = new Intent(Constants.ACTIVITY_SERVICE_DATA_INTENT_KEY);
    // You can also include some extra data.
    intent.putExtra(Constants.ACTIVITY_SERVICE_PUSHES, pushes);
    intent.putExtra(Constants.ACTIVITY_SERVICE_COAST, coast);
    intent.putExtra(Constants.ACTIVITY_SERVICE_DISTANCE, distance);
    LocalBroadcastManager.getInstance(getApplicationContext()).sendBroadcast(intent);
  }

  private void sendMessageToActivity(String msg, String extraKey) {
    Intent intent = new Intent(Constants.ACTIVITY_SERVICE_MESSAGE_INTENT_KEY);
    // You can also include some extra data.
    intent.putExtra(extraKey, msg);
    LocalBroadcastManager.getInstance(getApplicationContext()).sendBroadcast(intent);
  }

  private void startServiceWithNotification() {
    if (isServiceRunning) return;
    isServiceRunning = true;

    // register alarm to ensure service is always running
    registerAlarm();

    Intent notificationIntent = new Intent();
    notificationIntent.setClassName(
                                    getApplicationContext(),
                                    "com.permobil.pushtracker.MainActivity");

    // A string containing the action name
    notificationIntent.setAction(Constants.ACTION_START_SERVICE);
    notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, 0);

    // Bitmap icon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

    // create the notification channel
    NotificationManager notificationManager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    String channelId = Constants.NOTIFICATION_CHANNEL;
    int importance = NotificationManager.IMPORTANCE_HIGH;
    NotificationChannel notificationChannel =
      new NotificationChannel(channelId, Constants.NOTIFICATION_CHANNEL, importance);
    notificationChannel.enableLights(false);
    notificationChannel.enableVibration(false);
    if (notificationManager != null) {
      notificationManager.createNotificationChannel(notificationChannel);
    } else {
      Sentry.capture("NotificationManager was null. Unable to create the NotificationChannel to start the service with the notification.");
    }

    // create the notification builder
    Builder notificationBuilder = new Builder(this, Constants.NOTIFICATION_CHANNEL)
      .setTicker("Permobil")
      .setContentText("Permobil PushTracker is analyzing your activity.")
      .setColor(0x006ea5)
      .setSmallIcon(R.drawable.ic_notification_icon)
      .setLargeIcon(Icon.createWithResource(this, R.drawable.ic_notification_icon))
      .setContentIntent(contentPendingIntent)
      .setOngoing(true)
      .setChannelId(channelId);

    // create the notification
    Notification notification = notificationBuilder.build();
    notification.flags =
      notification.flags |
      Notification.FLAG_ONGOING_EVENT |
      // NO_CLEAR makes the notification stay when the user performs a
      // "delete all" command
      Notification.FLAG_NO_CLEAR;
    startForeground(NOTIFICATION_ID, notification);
  }

  private void stopMyService() {
    stopForeground(true);
    stopSelf();
    isServiceRunning = false;
  }

}
