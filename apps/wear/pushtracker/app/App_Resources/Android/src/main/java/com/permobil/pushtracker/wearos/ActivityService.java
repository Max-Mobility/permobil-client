package com.permobil.pushtracker.wearos;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
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
import android.support.v4.content.LocalBroadcastManager;

import com.permobil.pushtracker.MainActivity;

import java.nio.MappedByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Map;

import io.sentry.Sentry;

// TODO: save current daily activity in shared preferences / application settings
// TODO: save current activity into sqlite tables?
// TODO: communicate with the main app regarding when to start / stop tracking:
//        * heart rate
//        * GPS

public class ActivityService extends Service {

  private static final String TAG = "PermobilActivityService";
  private static final int NOTIFICATION_ID = 765;
  private static final long SENSOR_TASK_PERIOD_MS = 10 * 60 * 1000; // 10 minutes
  private static final int SENSOR_DELAY_DEBUG = 40 * 1000; // microseconds between sensor data
  private static final int SENSOR_DELAY_RELEASE = SensorManager.SENSOR_DELAY_NORMAL; // approx 200 ms between sensor data
  private static final int maxReportingLatency = 3 * 60 * 1000 * 1000; // 3 minutes between sensor updates in microseconds
  private static final long LOCATION_LISTENER_MIN_TIME_MS = 1 * 60 * 1000;
  private static final float LOCATION_LISTENER_MIN_DISTANCE_M = 25;

  private HandlerThread mHandlerThread;
  private Handler mHandler;
  private Runnable mSensorTask;
  private Location mLastKnownLocation;
  private LocationManager mLocationManager;
  private SensorEventListener mListener;
  private SensorManager mSensorManager;
  private Sensor mLinearAcceleration;
  private Sensor mHeartRate;
  private Sensor mOffBodyDetect;

  // activity detection
  public boolean personIsActive = false;
  public boolean watchBeingWorn = false;
  public boolean isServiceRunning = false;

  private ActivityDetector activityDetector;
  private DatabaseHandler databaseHandler;
  private Datastore datastore;

  public boolean isDebuggable = false;

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
    startServiceWithNotification();

    // set the debuggable flag
    isDebuggable = (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE));

    // create objects
    activityDetector = new ActivityDetector(this);
    databaseHandler = new DatabaseHandler(this);
    datastore = new Datastore(this);

    // start up for service
    this.mHandlerThread = new HandlerThread("com.permobil.pushtracker.wearos.thread");
    this.mHandlerThread.start();
    this.mHandler = new Handler(this.mHandlerThread.getLooper());

    this.mSensorTask = new SensorRunnable();

    // Get the LocationManager so we can send last known location
    // with the record when saving to Kinvey
    mLocationManager = (LocationManager) getApplicationContext()
      .getSystemService(Context.LOCATION_SERVICE);
    LocationListener mLocationListener = new LocationListener();
    mLocationManager.requestLocationUpdates(
                                            LocationManager.GPS_PROVIDER,
                                            LOCATION_LISTENER_MIN_TIME_MS,
                                            LOCATION_LISTENER_MIN_DISTANCE_M,
                                            mLocationListener
                                            );
    isServiceRunning = false;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    Log.d(TAG, "onStartCommand()..." + intent + " - " + flags + " - " + startId);
    Log.d(TAG, "isServiceRunning: " + isServiceRunning);
    if (!isServiceRunning) {
      // Set the user in the current context.
      // Sentry.getContext().setUser(new UserBuilder().setId(userIdentifier).build());

      if (intent != null &&
          Objects.requireNonNull(intent.getAction()).equals(Constants.ACTION_START_SERVICE)) {
        startServiceWithNotification();

        Log.d(TAG, "starting service!");

        int sensorDelay = isDebuggable ? SENSOR_DELAY_DEBUG : SENSOR_DELAY_RELEASE;
        boolean didRegisterSensors = this._registerDeviceSensors(sensorDelay, maxReportingLatency);
        Log.d(TAG, "Did register Sensors: " + didRegisterSensors);

        mHandler.removeCallbacksAndMessages(null);
        mHandler.post(mSensorTask);
      } else {
        stopMyService();
      }
    }

    // START_STICKY is used for services that are explicitly started
    // and stopped as needed
    return START_STICKY;
  }

  private class SensorRunnable implements Runnable {
    @Override
    public void run() {
      try {
        _ProcessSensorData();
      } catch (Exception e) {
        Sentry.capture(e);
        Log.e(TAG, "Exception in SensorRunnable: " + e.getMessage());
      }
      mHandler.postDelayed(mSensorTask, SENSOR_TASK_PERIOD_MS);
    }
  }

  private void _ProcessSensorData() {
    Log.d(TAG, "_ProcessSensorData()...");
    // adding an empty check to avoid pushing the initial service
    // starting records with no sensor_data since the intervals
    // haven't clocked at that time
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()...");
    super.onDestroy();

    // remove sensor listeners
    _unregisterDeviceSensors();

    // remove handler tasks
    mHandler.removeCallbacksAndMessages(null);
    mHandlerThread.quitSafely();

    isServiceRunning = false;
  }

  private class LocationListener implements android.location.LocationListener {
    @Override
    public void onLocationChanged(Location location) {
      Log.d(TAG, "Got location: " + location);
      double lat = location.getLatitude();
      double lon = location.getLongitude();
      long time = location.getTime();
      mLastKnownLocation = location;
      // TODO: save location data somewhere
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
  }

  public class SensorListener implements SensorEventListener {
    @Override
    public void onSensorChanged(SensorEvent event) {
      if (mListener != null) {
        ArrayList<Float> dataList = new ArrayList<>();
        for (float f : event.values) {
          dataList.add(f);
        }
        updateActivity(event);
        if (event.sensor.getType() == Sensor.TYPE_LINEAR_ACCELERATION) {
          if (watchBeingWorn) {
            // TODO: use the data to detect activities here!
            ActivityDetector.Detection detection =
              activityDetector.detectActivity(event.values, event.timestamp);
            // TODO: record the activities somewhere
          }
        }
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
      }
    }
  }

  private void _unregisterDeviceSensors() {
    // make sure we have the sensor manager for the device
    if (mSensorManager != null && mListener != null) {
      if (mLinearAcceleration != null)
        mSensorManager.unregisterListener(mListener, mLinearAcceleration);
      if (mHeartRate != null)
        mSensorManager.unregisterListener(mListener, mHeartRate);
      if (mOffBodyDetect != null)
        mSensorManager.unregisterListener(mListener, mOffBodyDetect);
    } else {
      Log.e(TAG, "Sensor Manager was not found, so sensor service is unable to unregister sensor listener events.");
    }
  }

  private boolean _registerDeviceSensors(int delay, int reportingLatency) {
    mSensorManager = (SensorManager) getApplicationContext().getSystemService(SENSOR_SERVICE);
    // make sure we have the sensor manager for the device
    if (mSensorManager != null) {
      Log.d(TAG, "Creating sensor listener...");
      mListener = new SensorListener();

      // register all the sensors we want to track data for
      mLinearAcceleration = mSensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
      if (mLinearAcceleration != null)
        mSensorManager.registerListener(mListener, mLinearAcceleration, delay, reportingLatency);

      mHeartRate = mSensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE);
      if (mHeartRate != null)
        mSensorManager.registerListener(mListener, mHeartRate, delay, reportingLatency);

      mOffBodyDetect = mSensorManager.getDefaultSensor(Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT);
      if (mOffBodyDetect != null)
        mSensorManager.registerListener(mListener, mOffBodyDetect, delay, reportingLatency);
    } else {
      Log.e(TAG, "Sensor Manager was not found, so sensor service is unable to register sensor listener events.");
    }

    return true;
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

    Intent notificationIntent = new Intent(
                                           getApplicationContext(),
                                           MainActivity.class
                                           );

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
      // .setLargeIcon(Bitmap.createScaledBitmap(icon, 128, 128, false))
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
