package com.permobil.pushtracker;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.Notification.Builder;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.ContentValues;
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
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;

import android.app.Notification.Builder;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.net.SocketTimeoutException;

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

import io.sentry.core.Breadcrumb;
import io.sentry.core.Sentry;
import com.permobil.pushtracker.DailyActivity;
import com.permobil.pushtracker.BootReceiver;

// TODO: communicate with the main app regarding when to start / stop tracking:
//        * heart rate
//        * GPS

public class ActivityService
        extends Service implements SensorEventListener,
        LocationListener {

    private static final String TAG = "PermobilActivityService";

    // for sending to the main app via intent
    public static final long SEND_DATA_PERIOD_MS = 10 * 1000;
    public static final long PUSH_DATA_PERIOD_MS = 1 * 60 * 1000;

    public String watchSerialNumber = null;

    private static final int NOTIFICATION_ID = 765;

    // rate at which we request sensor data updates
    private static final int SENSOR_RATE_HZ = 25;
    // microseconds between sensor data
    private static final int SENSOR_DELAY_US = 1000 * 1000 / SENSOR_RATE_HZ;
    // 3 minute between sensor updates in microseconds
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
    private Location mLastKnownLocation = null;
    private LocationManager mLocationManager;
    private SensorManager mSensorManager;
    private Sensor mLinearAcceleration;
    private Sensor mGravity;
    private Sensor mOffBodyDetect;

    // for sending data to the app and the backend
    private HandlerThread mHandlerThread;
    private Handler mHandler;
    private Runnable mSendTask;
    private Runnable mPushTask;

    private KinveyApiService mKinveyApiService;
    private String mKinveyAuthorization = null;

    public boolean isServiceRunning = false;

    // activity detection
    private boolean hasData = false;
    private float[] activityDetectorData = new float[ActivityDetector.InputSize];
    public boolean personIsActive = false;
    public boolean watchBeingWorn = false;
    private float pushSensitivity = 0.5f;
    private long lastCheckTimeMs = 0;
    private static long DATASTORE_CHECK_TIME_MS = 1000;
    // public boolean disableWearCheck = true;

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

        // create objects
        activityDetector = new ActivityDetector(this);
        db = new DatabaseHandler(this);
        datastore = new Datastore(this);
        mHandlerThread = new HandlerThread("com.permobil.pushtracker.thread");
        mHandlerThread.start();
        mHandler = new Handler(this.mHandlerThread.getLooper());
        // mHandler = new Handler();
        mSendTask = new Runnable() {
            @Override
            public void run() {
                try {
                    synchronized (currentActivity) {
                        Log.d(TAG, "Sending data to app...");
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
                    }
                } catch (Exception e) {
                    breadcrumb("Exception sending data: " + e.getMessage());
                    Sentry.captureException(e);
                    // post to the push runnable to try again
                    mHandler.removeCallbacks(mSendTask);
                    mHandler.postDelayed(mSendTask, SEND_DATA_PERIOD_MS);
                }
            }
        };
        mPushTask = new Runnable() {
            @Override
            public void run() {
                try {
                    PushDataToKinvey();
                } catch (Exception e) {
                    breadcrumb("Exception pushing data: " + e.getMessage());
                    Sentry.captureException(e);
                    // post to the push runnable to try again
                    mHandler.removeCallbacks(mPushTask);
                    mHandler.postDelayed(mPushTask, PUSH_DATA_PERIOD_MS);
                }
            }
        };

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
        // disableWearCheck = datastore.getDisableWearCheck();
        // make sure to set the serial number
        currentActivity.watch_serial_number = this.watchSerialNumber;

        // for keeping track of the days
        this.setupTimeReceiver();

        this.initSensors();
        this.registerAllSensors();

        // create the notification channels for the records
        this.createNotificationChannels();

    /*
    // Get the LocationManager so we can send last known location
    // with the record when saving to Kinvey
    mLocationManager = (LocationManager) getApplicationContext()
      .getSystemService(Context.LOCATION_SERVICE);
    */
        isServiceRunning = false;
        Log.d(TAG, "service created!");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        breadcrumb("onStartCommand()");
        breadcrumb("isServiceRunning: " + isServiceRunning);
        if (!isServiceRunning) {
            // Set the user in the current context.
            // Sentry.getContext().setUser(new UserBuilder().setId(userIdentifier).build());
            // breadcrumb("[intent - flags - startId]: " + intent + " - " + flags + " - " + startId);
            if (intent != null &&
                    Objects.requireNonNull(intent.getAction()).equals(Constants.ACTION_START_SERVICE)) {
                startServiceWithNotification();
            } else {
                stopMyService();
            }
        } else {
            // we got an intent to start but are already running - they're
            // asking us to synchronize data with the server
            breadcrumb("onStartCommand - service already running, sending data to server");
            mHandler.post(mPushTask);
        }

        // START_STICKY is used for services that are explicitly started
        // and stopped as needed
        return START_STICKY;
    }

    private void breadcrumb(String message) {
        Log.d(TAG, message);
        Breadcrumb bc = new Breadcrumb();
        bc.setMessage(message);
        Sentry.addBreadcrumb(bc);
    }

  private boolean hasPushWarningData() {
    // if we have a value and a date, we have data
    float v = datastore.getPushAverageValue();
    int n = datastore.getPushAverageNumberOfDays();
    Date d = datastore.getPushAverageDate();
    return v > 0.0f && n > 0;
  }

  private boolean hasCoastRecordData() {
    // if we have a value and a date, we have data
    float v = datastore.getCoastTimeRecordValue();
    Date d = datastore.getCoastTimeRecordDate();
    return v > 0.0f && d != null;
  }

  private void initializePushWarning() {
    // get all records from the db (no limit and NOT onlyUnsent)
    List<DailyActivity> activityList = db.getRecords(0, false);
    // determine the average number of pushes the user has done
    long totalPushCount = 0;
    int numDays = 0;
    int minPushesRequired = 100;
    for (DailyActivity activity : activityList) {
      int pushes = activity.push_count;
      if (pushes > minPushesRequired) {
        numDays += 1;
        totalPushCount += pushes;
      }
    }
    if (totalPushCount > 0 && numDays > 0) {
      // compute the average
      float averagePushCount = (float) totalPushCount / (float) numDays;
      // save that average and day number into the datastore
      datastore.setPushAverageValue(averagePushCount);
      datastore.setPushAverageNumberOfDays(numDays);
    }
  }

  private void initializeCoastRecord() {
    // get all records from the db (no limit and NOT onlyUnsent)
    List<DailyActivity> activityList = db.getRecords(0, false);
    // determine the max coast time the user has had (for a day with >
    // 200 pushes)
    float maxCoastTime = 0.0f;
    Date maxCoastDate = null;
    SimpleDateFormat fmt = new SimpleDateFormat("yyyy/MM/dd");
    int minPushesRequired = 200;
    for (DailyActivity activity : activityList) {
      float coastTime = activity.coast_time_avg;
      int pushes = activity.push_count;
      Date date = null;
      try {
        date = fmt.parse(activity.date);
      } catch (Exception e) {
      }
      if (coastTime > maxCoastTime && pushes > minPushesRequired) {
        // this is the new maximum
        maxCoastTime = coastTime;
        maxCoastDate = date;
      }
    }
    if (maxCoastTime > 0.0f && maxCoastDate != null) {
      // save that max coast time and date into the datastore
      datastore.setCoastTimeRecordValue(maxCoastTime);
      datastore.setCoastTimeRecordDate(maxCoastDate);
    }
  }

  private void checkPushWarningNotification() {
    boolean isInitialized = hasPushWarningData();
    if (!isInitialized) {
      initializePushWarning();
    }
    // get the average number of pushes the user has done
    float avgPushes = datastore.getPushAverageValue();
    float pushesToday = currentActivity.push_count;
    float warningValue = avgPushes * 1.25f;
    // make sure we have enough activity data
    long numDaysActivity = db.getTableRowCount();
    boolean hasEnoughActivity = numDaysActivity > 5;
    // make sure we haven't notified them already today
    Date lastNotifiedDate = datastore.getPushAverageDate();
    boolean hasBeenNotified = false;
    Date now = Calendar.getInstance().getTime();
    if (lastNotifiedDate != null) {
      hasBeenNotified = isSameDay(now, lastNotifiedDate);
    }
    /*
    Log.d(TAG, "pushesToday: " + pushesToday);
    Log.d(TAG, "avgPushes: " + avgPushes);
    Log.d(TAG, "warningValue: " + warningValue);
    Log.d(TAG, "lastNotifiedDate: " + lastNotifiedDate);
    Log.d(TAG, "hasBeenNotified: " + hasBeenNotified);
    */
    if (pushesToday > 1000.0f &&
        pushesToday > warningValue &&
        hasEnoughActivity) {
      // make sure we log that we notified them
      datastore.setPushAverageDate(now);
      if (!hasBeenNotified) {
        // notify them
        showPushWarningNotification();
      }
    }
  }

  // this gets called when it's a new day, so we will update the
  // average number of pushes by the currentActivity.push_count
  private void updatePushWarningData() {
    // get the number of days that was used to calculate the push
    // average last time
    int numDays = datastore.getPushAverageNumberOfDays();
    float pushesToday = currentActivity.push_count;
    float minimumPushesRequired = 1000.0f;
    if (pushesToday > minimumPushesRequired) {
      // we have enough pushes so we will update the average
      float pushAverage = datastore.getPushAverageValue();
      float pushTotal = pushAverage * numDays;
      // increment days and push total
      numDays += 1;
      pushTotal += pushesToday;
      // compute the new average
      pushAverage = pushTotal / numDays;
      // now save it back
      datastore.setPushAverageValue(pushAverage);
      datastore.setPushAverageNumberOfDays(numDays);
    }
  }

  private void checkCoastRecordNotification() {
    boolean isInitialized = hasCoastRecordData();
    if (!isInitialized) {
      initializeCoastRecord();
    }
    // check the max coast time (average)
    float coastToday = currentActivity.coast_time_avg;
    float coastRecordValue = datastore.getCoastTimeRecordValue();
    // have they pushed enough today?
    int pushesToday = currentActivity.push_count;
    int minPushesRequired = 200;
    boolean hasEnoughPushes = pushesToday > minPushesRequired;
    // have we already notified them?
    Date lastNotifiedDate = datastore.getCoastTimeRecordDate();
    boolean hasBeenNotified = false;
    Date now = Calendar.getInstance().getTime();
    if (lastNotifiedDate != null) {
      hasBeenNotified = isSameDay(now, lastNotifiedDate);
    }
    /*
    Log.d(TAG, "coastToday: " + coastToday);
    Log.d(TAG, "coastRecordValue: " + coastRecordValue);
    Log.d(TAG, "pushesToday: " + pushesToday);
    Log.d(TAG, "lastNotifiedDate: " + lastNotifiedDate);
    Log.d(TAG, "hasBeenNotified: " + hasBeenNotified);
    */
    if (hasEnoughPushes &&
        coastToday > coastRecordValue) {
      // update the value in the datastore
      datastore.setCoastTimeRecordValue(coastToday);
      datastore.setCoastTimeRecordDate(now);
      if (!hasBeenNotified) {
        // notify them
        showCoastTimeRecordNotification();
      }
    }
  }

  private void checkNotifications() {
    checkPushWarningNotification();
    checkCoastRecordNotification();
  }

  private boolean isSameDay(Date date1, Date date2) {
    SimpleDateFormat fmt = new SimpleDateFormat("yyyyMMdd");
    return fmt.format(date1).equals(fmt.format(date2));
  }

    private void loadFromDatabase() {
        // TODO: load from sqlite here
        long tableRowCount = db.getTableRowCount();
        synchronized (currentActivity) {
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
    }

    private void PushDataToKinvey() {
        breadcrumb("PushDataToKinvey()");
        // Check if the SQLite table has any records pending to be pushed
        long numUnsent = db.countUnsentEntries();
        if (numUnsent == 0) {
            // we have no data, simply return from this function
            return;
        }
        // make sure we have authorization before trying to send
        if (mKinveyAuthorization == null) {
            String token = datastore.getAuthorization();
            if (token == null || token.isEmpty()) {
                // we have still not gotten the token, so don't send anything
                // to the database
                breadcrumb("No authorization token provided for kinvey");
                return;
            }
            // we have gotten the token, save it so we can use it!
            mKinveyAuthorization = token;
        }
        // we have data to send - so send it!
        try {
            breadcrumb("Pushing Data");
            // get the oldest unsent record
            DatabaseHandler.Record r = db.getRecord(true);
            if (r != null && r.data != null) {
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
                            synchronized (currentActivity) {
                                if (item._id.equals(currentActivity._id)) {
                                    currentActivity.has_been_sent = true;
                                }
                            }
                        } else {
                            breadcrumb("send data not successful - " +
                                    response.code() + ": " +
                                    response.message());
                        }
                    }

                    @Override
                    public void onFailure(Call<DailyActivity> call, Throwable t) {
                        breadcrumb("Failed to send: " + t.getMessage());
                        // Sentry.capture(t);
                    }
                });
            } else {
                String message = "Attempt to push invalid data to kinvey! Record: " + r;
                breadcrumb(message);
            }
        } catch (Exception e) {
            breadcrumb("Unknown exception pushing to kinvey:" + e.getMessage());
            Sentry.captureException(e);
        }
    }

    void setupTimeReceiver() {
        if (this.timeReceiver != null) {
            this.unregisterReceiver(this.timeReceiver);
            this.timeReceiver = null;
        }
        this.timeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                synchronized (currentActivity) {
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
                        breadcrumb("timeReceiver::onReceive() - new day!");
                        // update the data we keep for the records
                        updatePushWarningData();
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
            }
        };
        // register time receiver
        breadcrumb("registering time receiver");
        IntentFilter timeFilter = new IntentFilter();
        timeFilter.addAction(Intent.ACTION_TIME_TICK);
        timeFilter.addAction(Intent.ACTION_TIMEZONE_CHANGED);
        this.registerReceiver(this.timeReceiver, timeFilter);
    }

    boolean handleDetection(ActivityDetector.Detection detection) {
        boolean hasNewActivity = false;
        // Log.d(TAG, "detection: " + detection);
        if (detection.confidence > 0) {
            hasNewActivity = true;
            // update push detection
            if (detection.activity == ActivityDetector.Detection.Activity.PUSH) {
                synchronized (currentActivity) {
                    currentActivity.onPush(detection);
                }
            }
        }
        return hasNewActivity;
    }

    private void registerAllSensors() {
        breadcrumb("registerAllSensors()");
        // register the body sensor so we get events when the user
        // wears the watch and takes it off
        this.registerBodySensor(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
        // turn on accelerometer sensing
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
        this.registerAccelerometer(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
        this.registerGravity(SENSOR_DELAY_US, SENSOR_REPORTING_LATENCY_US);
    }

    private void offWristCallback() {
        // turn off activity sensors
        unregisterAccelerometer();
        unregisterGravity();
        // turn off location sensing
        // mLocationManager.removeUpdates(this);
    }

    @Override
    public void onLocationChanged(Location location) {
        if (!watchBeingWorn) {
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
        // check to see if the user has updated any of their preferences
        // in the app
        long timeDiffMs = 0;
        long now = System.currentTimeMillis();
        timeDiffMs = now - lastCheckTimeMs;
        if (timeDiffMs > DATASTORE_CHECK_TIME_MS) {
            // disableWearCheck = datastore.getDisableWearCheck();
            // update push detection thresholds
            pushSensitivity = datastore.getPushSensitivity();
            activityDetector.setDetectionConfidencePercent(pushSensitivity);
            lastCheckTimeMs = now;
        }
        // handle event
        updateActivity(event);
        updateDetectorInputs(event);
        // detect activity
        if (canRunDetector()) {
            // reset flags for running detector
            hasData = false;
            // use the data to detect activities
            ActivityDetector.Detection detection =
                    activityDetector.detectActivity(activityDetectorData, event.timestamp);
            boolean hasNewActivity = handleDetection(detection);
            // reset the data
            clearDetectorInputs();
            if (hasNewActivity) {
                // remove all callbacks
                mHandler.removeCallbacksAndMessages(null);
                // post to the send runnable
                mHandler.postDelayed(mSendTask, SEND_DATA_PERIOD_MS);
                // post to the push runnable
                mHandler.postDelayed(mPushTask, PUSH_DATA_PERIOD_MS);
                // notify the user if they've achieved records / warnings
                checkNotifications();
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // TODO Auto-generated method stub
    }

    boolean canRunDetector() {
        return hasData; // && (watchBeingWorn || disableWearCheck);
    }

    void clearDetectorInputs() {
        for (int i = 0; i < ActivityDetector.InputSize; i++) {
            activityDetectorData[i] = 0;
        }
    }

    private long numGrav = 0;
    private long numAccl = 0;
    private static final long LOG_TIME_MS = 1000;
    private long lastLogTimeMs = 0;
    private List<float[]> mAccList = new ArrayList<float[]>();
    private List<float[]> mGravList = new ArrayList<float[]>();


    void updateDetectorInputs(SensorEvent event) {
        int sensorType = event.sensor.getType();
        float[] sensorValue = new float[3];
        if (event.values.length == 3) {
            sensorValue[0] = event.values[0];
            sensorValue[1] = event.values[1];
            sensorValue[2] = event.values[2];
        }
        if (sensorType == Sensor.TYPE_LINEAR_ACCELERATION) {
            numAccl++;
            mAccList.add(sensorValue);
        } else if (sensorType == Sensor.TYPE_GRAVITY) {
            numGrav++;
            mGravList.add(sensorValue);
        }

        if (mAccList.size() > 0 && mGravList.size() > 0) {
            for (int i = 0; i < 3; i++) {
                activityDetectorData[i + ActivityDetector.InputAcclOffset] = mAccList.get(0)[i];
                activityDetectorData[i + ActivityDetector.InputGravOffset] = mGravList.get(0)[i];
            }
            hasData = true;
            mAccList.remove(0);
            mGravList.remove(0);
        }

    }

    void updateActivity(SensorEvent event) {
        // check if the user is wearing the watch
        if (event.sensor.getType() == Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT) {
            // 1.0 => device is on body, 0.0 => device is off body
            watchBeingWorn = (event.values[0] != 0.0);
            if (watchBeingWorn) {
                // onWristCallback();
            } else {
                // offWristCallback();
            }
        }
    }

    private void initSensors() {
        breadcrumb("initSensors()");
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
        breadcrumb("unregisterDeviceSensors()");
        unregisterBodySensor();
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
        breadcrumb("registerAlarm()");
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
        am.setInexactRepeating(alarmType,
                startTime,
                interval,
                intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        breadcrumb("onDestroy()");

        try {
            // unregister time receiver
            if (this.timeReceiver != null) {
                this.unregisterReceiver(this.timeReceiver);
                this.timeReceiver = null;
            }

            // remove sensor listeners
            unregisterDeviceSensors();

            // remove location listener
            // mLocationManager.removeUpdates(this);

            // remove all callbacks from the handler
            mHandler.removeCallbacksAndMessages(null);
            mHandlerThread.quitSafely();
        } catch (Exception e) {
            Sentry.captureException(e);
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

  private void createNotificationChannels() {
    // Create the NotificationChannel, but only on API 26+ because
    // the NotificationChannel class is new and not in the support library
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      /*
      CharSequence name = getString(R.string.channel_name);
      String description = getString(R.string.channel_description);
      */
      String name = "com.permobil.pushtracker.record_notification_channel";
      String description = "Record Notifications";
      int importance = NotificationManager.IMPORTANCE_DEFAULT;
      String channelId = name;
      NotificationChannel channel = new NotificationChannel(channelId, name, importance);
      channel.setDescription(description);
      // Register the channel with the system; you can't change the importance
      // or other notification behaviors after this
      NotificationManager notificationManager = getSystemService(NotificationManager.class);
      notificationManager.createNotificationChannel(channel);
    }
  }

  private void showPushWarningNotification() {
    String channelId = "com.permobil.pushtracker.record_notification_channel";
    Builder notificationBuilder = new Builder(this, Constants.NOTIFICATION_CHANNEL)
      .setContentTitle("Push Warning")
      .setContentText("You pushed too much, don't push so much dude!")
      .setColor(0x006ea5)
      .setSmallIcon(R.drawable.ic_notification_icon)
      .setLargeIcon(Icon.createWithResource(this, R.drawable.ic_notification_icon))
      .setChannelId(channelId);

    /*
    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
      .setColor(0x006ea5)
      .setSmallIcon(R.drawable.ic_notification_icon)
      .setLargeIcon(Icon.createWithResource(this, R.drawable.ic_notification_icon))
      .setContentTitle("Push Warning")
      .setContentText("You pushed too much, don't push so much dude!")
      .setPriority(NotificationCompat.PRIORITY_DEFAULT);
    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
    // notificationId is a unique int for each notification that you must define
    notificationManager.notify(10001, builder.build());
    */

    NotificationManager notificationManager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    notificationManager.notify(20001, notificationBuilder.build());
  }

  private void showCoastTimeRecordNotification() {
    String channelId = "com.permobil.pushtracker.record_notification_channel";
    Builder notificationBuilder = new Builder(this, Constants.NOTIFICATION_CHANNEL)
      .setContentTitle("Coast Time Record")
      .setContentText("Great job, you've beaten your coast time record! Way to go dude!")
      .setColor(0x006ea5)
      .setSmallIcon(R.drawable.ic_notification_icon)
      .setLargeIcon(Icon.createWithResource(this, R.drawable.ic_notification_icon))
      .setChannelId(channelId);

    /*
    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
      .setColor(0x006ea5)
      .setSmallIcon(R.drawable.ic_notification_icon)
      .setLargeIcon(Icon.createWithResource(this, R.drawable.ic_notification_icon))
      .setContentTitle("Coast Time Record")
      .setContentText("Great job, you've beaten your coast time record! Way to go dude!")
      .setPriority(NotificationCompat.PRIORITY_DEFAULT);
    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
    // notificationId is a unique int for each notification that you must define
    notificationManager.notify(20001, builder.build());
    */

    NotificationManager notificationManager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    notificationManager.notify(20001, notificationBuilder.build());
  }

    private void startServiceWithNotification() {
        if (isServiceRunning) return;
        breadcrumb("startServiceWithNotification()");
        isServiceRunning = true;

        // register alarm to ensure service is always running
        registerAlarm();

        Intent notificationIntent = new Intent();
        notificationIntent.setClassName(
                getApplicationContext(),
                "com.permobil.pushtracker.MainActivity");

        // A string containing the action name
        notificationIntent.setAction(Constants.ACTION_START_SERVICE);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK); //  | Intent.FLAG_ACTIVITY_CLEAR_TASK
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
          String err = "NotificationManager was null. Unable to create the NotificationChannel to start the service with the notification.";
          Exception ex = new Exception(err);
          Sentry.captureException(ex);
        }

        String contentText = getString(R.string.foreground_service_notification);

        // create the notification builder
        Builder notificationBuilder = new Builder(this, Constants.NOTIFICATION_CHANNEL)
                .setTicker("Permobil")
                .setContentText(contentText)
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
        breadcrumb("started forground notification");
    }

    private void stopMyService() {
        stopForeground(true);
        stopSelf();
        isServiceRunning = false;
    }

}
