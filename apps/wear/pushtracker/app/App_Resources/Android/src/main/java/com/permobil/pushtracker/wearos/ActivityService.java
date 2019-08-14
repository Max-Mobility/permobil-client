package com.permobil.pushtracker.wearos;

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

import android.app.Notification.Builder;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.nio.MappedByteBuffer;
import java.nio.charset.StandardCharsets;
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
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory;
import retrofit2.converter.gson.GsonConverterFactory;

import io.sentry.Sentry;

import com.permobil.pushtracker.wearos.DailyActivity;

// TODO: communicate with the main app regarding when to start / stop tracking:
//        * heart rate
//        * GPS

public class ActivityService extends Service implements SensorEventListener, LocationListener {

  private static final String TAG = "PermobilActivityService";
  private static final int NOTIFICATION_ID = 765;
  private static final int SENSOR_RATE_HZ = 25;
  private static final int MAX_DATA_TO_PROCESS_PER_PERIOD = 10 * 60 * SENSOR_RATE_HZ;
  private static final int MAX_DATA_LIST_LENGTH = MAX_DATA_TO_PROCESS_PER_PERIOD * 10;
  private static final int PROCESSING_PERIOD_MS = 5 * 60 * 1000;
  private static final int SEND_TASK_PERIOD_MS = 1 * 60 * 1000;

  /**
   * SensorManager.SENSOR_DELAY_NORMAL:  ~ 200ms
   * SensorManager.SENSOR_DELAY_UI:      ~ 60ms
   * SensorManager.SENSOR_DELAY_GAME:    ~ 40ms
   * SensorManager.SENSOR_DELAY_FASTEST: ~ ??ms
   */
  // microseconds between sensor data
  private static final int SENSOR_DELAY_US_DEBUG = 1000 * 1000 / SENSOR_RATE_HZ;
  private static final int SENSOR_DELAY_US_RELEASE = 1000 * 1000 / SENSOR_RATE_HZ;
  // 1 minute between sensor updates in microseconds
  private static final int SENSOR_REPORTING_LATENCY_US = 5 * 60 * 1000 * 1000;

  // 25 meters / minute = 1.5 km / hr (~1 mph)
  private static final long LOCATION_LISTENER_MIN_TIME_MS = 5 * 60 * 1000;
  private static final float LOCATION_LISTENER_MIN_DISTANCE_M = 125;

  // distance in m under which we don't consider the device to have moved
  private static final float LOCATION_DISTANCE_THRESHOLD_M = LOCATION_LISTENER_MIN_DISTANCE_M;
  // speed in m/s under which we don't compute distance travelled
  private static final float LOCATION_SPEED_THRESHOLD_MIN_MPS = 0.4f; // ~= 0.9 miles per hour
  // speed in m/s over which we don't compute distance travelled
  private static final float LOCATION_SPEED_THRESHOLD_MAX_MPS = 4.0f; // ~= 9.0 miles per hour

  public boolean isDebuggable = false;

  private BroadcastReceiver timeReceiver = null;
  private BroadcastReceiver batteryReceiver = null;
  private Location mLastKnownLocation = null;
  private LocationManager mLocationManager;
  private SensorManager mSensorManager;
  private Sensor mLinearAcceleration;
  private Sensor mHeartRate;
  private Sensor mOffBodyDetect;

  private KinveyApiService mKinveyApiService;
  private String mKinveyAuthorization;

  private HandlerThread mHandlerThread;
  private Handler mHandler;
  private Runnable mSendTask;

  // for sending to the main app via intent
  private long _lastSendDataTimeMs = 0;
  public static final long SEND_DATA_INTERVAL_MS = 5000;

  // activity detection
  public boolean personIsActive = false;
  public boolean watchBeingWorn = false;
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
  public IBinder onBind(Intent intent) {
    // TODO: Return the communication channel to the service.
    throw new UnsupportedOperationException("Not yet implemented");
  }

  @Override
  public void onCreate() {
    super.onCreate();
    Log.d(TAG, "ActivityService onCreate...");

    Log.d(TAG, "Initializing Sentry");
    Sentry.init(
                "https://5670a4108fb84bc6b2a8c427ab353472@sentry.io/1485857"
                );

    startServiceWithNotification();

    // set the debuggable flag
    // isDebuggable = (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE));

    // create objects
    activityDetector = new ActivityDetector(this);
    db = new DatabaseHandler(this);
    datastore = new Datastore(this);

    // initialize data
    loadFromDatabase();

    // start up for service
    this.mHandlerThread = new HandlerThread("com.permobil.pushtracker.wearos.thread");
    this.mHandlerThread.start();
    this.mHandler = new Handler(this.mHandlerThread.getLooper());

    this.mSendTask = new SendRunnable();

    // create the retrofit instance
    Retrofit retrofit = new Retrofit.Builder()
      .baseUrl(Constants.API_BASE)
      .addConverterFactory(GsonConverterFactory.create())
      .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
      .build();

    // create an instance of the KinveyApiService
    mKinveyApiService = retrofit.create(KinveyApiService.class);

    // save the authorization string needed for kinvey
    String authorizationToEncode = "pranav.kumar@permobil.com:test";
    byte[] data = authorizationToEncode.getBytes(StandardCharsets.UTF_8);
    mKinveyAuthorization = Base64.encodeToString(data, Base64.NO_WRAP);
    mKinveyAuthorization = "Basic " + mKinveyAuthorization;

    // Get the LocationManager so we can send last known location
    // with the record when saving to Kinvey
    mLocationManager = (LocationManager) getApplicationContext()
      .getSystemService(Context.LOCATION_SERVICE);
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
        int sensorDelayUs = isDebuggable ? SENSOR_DELAY_US_DEBUG : SENSOR_DELAY_US_RELEASE;
        // register the body sensor so we get events when the user
        // wears the watch and takes it off
        this.registerBodySensor(sensorDelayUs, SENSOR_REPORTING_LATENCY_US);
      } else {
        stopMyService();
      }
    }

    // START_STICKY is used for services that are explicitly started
    // and stopped as needed
    return START_STICKY;
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
  }

  private class SendRunnable implements Runnable {
    @Override
    public void run() {
      try {
        PushDataToKinvey();
      } catch (Exception e) {
        Sentry.capture(e);
        Log.e(TAG, "Exception in SendRunnable: " + e.getMessage());
      }
      if (isPlugged()) {
        // only continue sending if we're still plugged in
        mHandler.postDelayed(mSendTask, SEND_TASK_PERIOD_MS);
      }
    }
  }

  private void PushDataToKinvey() {
    // TODO: get X number of unsent data from sqlite storage
    // TODO:
    Log.d(TAG, "PushDataToKinvey()...");
    // Check if the SQLite table has any records pending to be pushed
    long numUnsent = db.countUnsentEntries();
    // Log.d(TAG, "Database size: " + db.getTableSizeBytes() + " bytes");
    if (numUnsent == 0) {
      Log.d(TAG, "No unsent data.");
    } else {
      try {
        // get the oldest unsent record
        DatabaseHandler.Record r = db.getRecord(true);
        Observable.just(RequestBody.create(okhttp3.MediaType.parse("application/json; charset=utf-8"), r.data))
          .flatMap(x -> mKinveyApiService.sendData(mKinveyAuthorization, x, r.id))
          .subscribeOn(Schedulers.io())
          .observeOn(AndroidSchedulers.mainThread())
          .unsubscribeOn(Schedulers.io())
          .subscribe(
                     item -> {
                       Log.d(TAG, "item sent: " + item._id);
                       // TODO: currently we don't delete any entries,
                       // do we want to change that?
                       // db.deleteRecord(item._id);

                       // update the has_been_sent field for that
                       // activity
                       db.markRecordAsSent(item._id);
                     },
                     error -> {
                       Log.e(TAG, "send data onError(): " + error);
                       Sentry.capture(error);
                     },
                     () -> {
                       Log.d(TAG, "onCompleted()");
                     });
      } catch (Exception e) {
        Log.e(TAG, "Exception pushing to kinvey:" + e.getMessage());
        Sentry.capture(e);
      }
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
          // send message to handler / runnable to send data
          mHandler.removeCallbacksAndMessages(null);
          mHandler.postDelayed(mSendTask, SEND_TASK_PERIOD_MS);
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
            // update the datastore - these are for the complication
            // providers and the pushtracker wear app
            datastore.setPushes(currentActivity.push_count);
            datastore.setCoast(currentActivity.coast_time_avg);
            datastore.setDistance(currentActivity.distance_watch);
            datastore.setHeartRate(currentActivity.heart_rate);
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
    if (detection.confidence != 0) {
      // update push detection
      if (detection.activity == ActivityDetector.Detection.Activity.PUSH) {
        this.currentActivity.onPush(detection);
      }
    }
  }

  private PendingIntent getAlarmIntent(int intentFlag) {
    Intent i = new Intent(getApplicationContext(), ActivityService.class);
    i.setAction(Constants.ACTION_START_SERVICE);
    PendingIntent scheduledIntent = PendingIntent.getService(getApplicationContext(),
                                                             0,
                                                             i,
                                                             intentFlag);
    return scheduledIntent;
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
      // remove handler tasks
      mHandler.removeCallbacksAndMessages(null);
      mHandlerThread.quitSafely();
    } catch (Exception e) {
      Sentry.capture(e);
      Log.e(TAG, "onDestroy() Exception: " + e);
    }

    isServiceRunning = false;
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
    // turn on accelerometer sensing
    int sensorDelayUs = isDebuggable ? SENSOR_DELAY_US_DEBUG : SENSOR_DELAY_US_RELEASE;
    registerAccelerometer(sensorDelayUs, SENSOR_REPORTING_LATENCY_US);
  }

  private void offWristCallback() {
    // turn off location sensing
    mLocationManager.removeUpdates(this);
    // turn off accelerometer sensing
    unregisterAccelerometer();
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

  @Override
  public void onSensorChanged(SensorEvent event) {
    // Log.d(TAG, "SensorChanged: " + event);
    updateActivity(event);
    int sensorType = event.sensor.getType();
    if (sensorType == Sensor.TYPE_LINEAR_ACCELERATION) {
      if (isDebuggable || watchBeingWorn) {
        // use the data to detect activities
        ActivityDetector.Detection detection =
          activityDetector.detectActivity(event.values, event.timestamp);
        handleDetection(detection);
        long now = System.currentTimeMillis();
        long timeDiffMs = now - _lastSendDataTimeMs;
        if (timeDiffMs > SEND_DATA_INTERVAL_MS) {
          // update data in datastore / shared preferences for use
          // with the complication providers and mobile app
          datastore.setPushes(currentActivity.push_count);
          datastore.setCoast(currentActivity.coast_time_avg);
          datastore.setDistance(currentActivity.distance_watch);
          datastore.setHeartRate(currentActivity.heart_rate);
          // update data in SQLite tables
          db.updateRecord(currentActivity);
          // send intent to main activity with updated data
          sendDataToActivity(currentActivity.push_count,
                             currentActivity.coast_time_avg,
                             currentActivity.distance_watch,
                             currentActivity.heart_rate);
          _lastSendDataTimeMs = now;
        }
      }
    } else if (sensorType == Sensor.TYPE_HEART_RATE) {
      // update the heart rate
      currentActivity.heart_rate = event.values[0];
      Log.d(TAG, "current heart rate: " + currentActivity.heart_rate);
      // TODO: save heart rate data as a series of data if the
      // user has asked us to track their heart rate through the
      // app (for some period of time)
    }
  }

  @Override
  public void onAccuracyChanged(Sensor sensor, int accuracy) {
    // TODO Auto-generated method stub
  }

  void updateActivity(SensorEvent event) {
    // check if the user is wearing the watch
    if (event.sensor.getType() == Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT) {
      // 1.0 => device is on body, 0.0 => device is off body
      watchBeingWorn = (event.values[0] != 0.0);
      if (watchBeingWorn || isDebuggable) {
        onWristCallback();
      } else {
        offWristCallback();
      }
    }
  }

  private void initSensors() {
    mSensorManager = (SensorManager) getApplicationContext().getSystemService(SENSOR_SERVICE);
  }

  private void registerHeartRate(int delay, int reportingLatency) {
    if (mSensorManager != null) {
      mHeartRate = mSensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE);
      if (mHeartRate != null)
        mSensorManager.registerListener(this, mHeartRate, delay, reportingLatency);
    }
  }

  private void unregisterHeartRate() {
    if (mSensorManager != null) {
      if (mHeartRate != null)
        mSensorManager.unregisterListener(this, mHeartRate);
    }
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
    // make sure we have the sensor manager for the device
    unregisterAccelerometer();
    unregisterBodySensor();
    unregisterHeartRate();
  }

  private void sendDataToActivity(int pushes, float coast, float distance, float heartRate) {
    Intent intent = new Intent(Constants.ACTIVITY_SERVICE_DATA_INTENT_KEY);
    // You can also include some extra data.
    intent.putExtra(Constants.ACTIVITY_SERVICE_PUSHES, pushes);
    intent.putExtra(Constants.ACTIVITY_SERVICE_COAST, coast);
    intent.putExtra(Constants.ACTIVITY_SERVICE_DISTANCE, distance);
    intent.putExtra(Constants.ACTIVITY_SERVICE_HEART_RATE, heartRate);
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
      .setSmallIcon(R.mipmap.ic_launcher_round)
      .setLargeIcon(Icon.createWithResource(this, R.mipmap.ic_launcher_round))
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
