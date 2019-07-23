import { Log } from '@permobil/core';
import * as utils from "tns-core-modules/utils/utils";
import * as timer from 'tns-core-modules/timer';

import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';

import { Level, Sentry } from 'nativescript-sentry';
import { ReflectiveInjector } from 'injection-js';
import { ActivityDetector } from '../models/activity-detector';
import { ActivityData, Profile } from '../namespaces';
import { SensorChangedEventData, SensorService, SERVICES, SqliteService } from './index';

@JavaProxy('com.permobil.pushtracker.wearos.ActivityService')
class ActivityService extends android.app.Service {

  private watchBeingWorn: boolean = false;
  private isDebuggable: boolean = false;
  private isServiceRunning: boolean = false;

  private activityDetector: ActivityDetector = null;
  private sensorService: SensorService = null;
  private sqliteService: SqliteService = null;
  private locationManager: android.location.LocationManager = null;

  private NOTIFICATION_ID: number = 765;
  private NOTIFICATION_CHANNEL: string = "com.permobil.pushtracker.wearos.notification_channel";
  private ACTION_START_SERVICE: string = "ACTION_START_SERVICE";
  private ACTIVITY_SERVICE_MESSAGE_INTENT_KEY: string = "ACTIVITY_SERVICE_MESSAGE_INTENT_KEY";
  private ACTIVITY_SERVICE_MESSAGE: string = "ACTIVITY_SERVICE_MESSAGE";
  private ACTIVITY_SERVICE_LOCAL_DB_RECORD_COUNT: string = "ACTIVITY_SERVICE_LOCAL_DB_RECORD_COUNT";

  private LOCATION_LISTENER_MIN_TIME_MS = 1 * 60 * 1000;
  private LOCATION_LISTENER_MIN_DISTANCE_M = 25;
  private lastKnownLocation: android.location.Location = null;

  private sensorConfig = [
    {
      "type": android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT,
      "delay": 40 * 1000, // in microseconds
      "interval": 1 * 60 * 1000 * 1000 // in microseconds
    },
    {
      "type": android.hardware.Sensor.TYPE_LINEAR_ACCELERATION,
      "delay": 40 * 1000, // in microseconds
      "interval": 1 * 60 * 1000 * 1000 // in microseconds
    },
    {
      "type": android.hardware.Sensor.TYPE_HEART_RATE,
      "delay": 10 * 1000 * 1000, // in microseconds
      "interval": 5 * 60 * 1000 * 1000 // in microseconds
    }
  ];

  private timerId: number;

  onBind(): android.os.IBinder {
    return null;
  }

  onCreate(): void {
    super.onCreate();

    this.startServiceWithNotification();
    // set the debuggable flag
    this.isDebuggable = (0 !== (
      this.getApplicationInfo().flags &
      android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE));

    this.sentryBreadCrumb('ActivityService - creating services');
    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this.sensorService = injector.get(SensorService);
    this.sqliteService = injector.get(SqliteService);
    this.sentryBreadCrumb('ActivityService - services created.');

    // initialize data storage for activity
    this.initSqliteTables();

    // Activity detection related code:
    this.sentryBreadCrumb('Configuring sensor service.');
    this.sensorService.on(
      SensorService.SensorChanged,
      this.handleSensorData.bind(this)
    );
    this.registerDeviceSensors();
    this.sentryBreadCrumb('Sensor Service configured.');

    this.sentryBreadCrumb('Creating new ActivityDetector');
    console.time('new_activity_detector');
    this.activityDetector = new ActivityDetector();
    console.timeEnd('new_activity_detector');
    this.sentryBreadCrumb('New ActivityDetector created.');

    this.sentryBreadCrumb('Enabling location listener');
    // Get the LocationManager so we can send last known location
    // with the record when saving to Kinvey
    try {
      const context = utils.ad.getApplicationContext()
      this.locationManager = context
        .getSystemService(android.content.Context.LOCATION_SERVICE);
      Log.D('locationManager', this.locationManager);
      this.locationManager.requestLocationUpdates(
        android.location.LocationManager.GPS_PROVIDER,
        this.LOCATION_LISTENER_MIN_TIME_MS,
        this.LOCATION_LISTENER_MIN_DISTANCE_M,
        this.locationListener
      );
      this.sentryBreadCrumb('Location listener enabled.');
    } catch (err) {
      Log.E('location manager requestLocationUpdates error:', err);
    }

    Log.D('ts service created!');

    this.isServiceRunning = false;

    if (!this.timerId) {
      this.timerId = timer.setInterval(() => {
        // Run this every 4 hrs
      }, (1000 * 60 * 60 * 4));
    }
  }

  onStartCommand(intent: android.content.Intent, flags: number, startId: number): number {
    Log.D('ts service started!');
    Log.D("onStartCommand()..." + intent + " - " + flags + " - " + startId);
    Log.D("isServiceRunning: " + this.isServiceRunning);
    if (!this.isServiceRunning) {
      // Set the user in the current context.
      // Sentry.getContext().setUser(new UserBuilder().setId(userIdentifier).build());
      if (intent != null &&
        java.util.Objects.requireNonNull(intent.getAction())
          .equals(this.ACTION_START_SERVICE)) {
        this.startServiceWithNotification();
      } else {
        this.stopMyService();
      }
    }

    // START_STICKY is used for services that are explicitly started
    // and stopped as needed
    return android.app.Service.START_STICKY;
  }

  onDestroy(): void {
    Log.D('ts service destroyed!');
    super.onDestroy();
    timer.clearInterval(this.timerId);
  }

  /**
   * Data storage
   */
  initSqliteTables() {
    this.sentryBreadCrumb('Initializing SQLite...');
    console.time('SQLite_Init');
    // create / load tables for activity data
    const sqlitePromises = [
      this.sqliteService.makeTable(
        ActivityData.Info.TableName,
        ActivityData.Info.IdName,
        ActivityData.Info.Fields
      )
    ];
    return Promise.all(sqlitePromises)
      .then(() => {
        console.timeEnd('SQLite_Init');
        this.sentryBreadCrumb('SQLite has been initialized.');
      })
      .catch(err => {
        Sentry.captureException(err);
        Log.E('Could not make table:', err);
      });
  }


  /**
   * Location Data Handlers
   */
  private locationListener = new android.location.LocationListener({
    onLocationChanged: function(location: any) {
      Log.D("Activity.Service", "Got location: " + location);
      this.lastKnownLocation = location;
      // TODO: do we need to check if the user has been active here?
    },
    onProviderDisabled: function(provider: string) {
      // Log.D("Provider disabled: " + provider);
    },
    onProviderEnabled: function(provider: string) {
      // Log.D("Provider enabled: " + provider);
    },
    onStatusChanged: function(provider: string, status: number, extras: any) {
      // Log.D("onStatusChanged(): " + provider + " - " + status);
    }
  });

  /**
   * Sensor Data Handlers
   */
  handleSensorData(args: SensorChangedEventData) {
    // if we're using litedata for android sensor plugin option
    // the data structure is simplified to reduce redundant data
    const parsedData = args.data;

    if (
      parsedData.s === android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT
    ) {
      this.watchBeingWorn = (parsedData.d as any).state !== 0.0;
    }

    if (parsedData.s === android.hardware.Sensor.TYPE_LINEAR_ACCELERATION) {
      this.handleAccel(parsedData.d, parsedData.ts);
    }
  }

  handleAccel(acceleration: any, timestamp: number) {
    // now run the activity detector
    const detectedActivity = this.activityDetector.detectActivity(
      acceleration,
      timestamp
    );
  }

  /**
   * Sensor Management
   */
  registerDeviceSensors() {
    try {
      this.sensorConfig.map((config) => {
        this.sensorService.startDeviceSensor(
          config.type,
          config.delay,
          config.interval
        );
      });
    } catch (err) {
      Log.E('could not register sensors:', err);
      Sentry.captureException(err);
    }
  }

  disableAllSensors() {
    try {
      this.sensorService.stopAllDeviceSensors();
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error disabling the device sensors:', err);
    }
  }

  /**
   * Service management
   */
  private startServiceWithNotification() {
    if (this.isServiceRunning) return;
    this.isServiceRunning = true;

    //Intent notificationIntent = new Intent(getApplicationContext(), MainActivity.class);
    const notificationIntent = new android.content.Intent();
    notificationIntent.setClassName(
      application.android.context,
      "com.permobil.pushtracker.MainActivity"
    );
    // A string containing the action name
    notificationIntent.setAction(this.ACTION_START_SERVICE);
    notificationIntent.setFlags(
      android.content.Intent.FLAG_ACTIVITY_NEW_TASK |
      android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK
    );
    const contentPendingIntent = android.app.PendingIntent.getActivity(
      this,
      0,
      notificationIntent,
      0
    );

    // Bitmap icon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

    // create the notification channel
    const notificationManager = application.android.context.getSystemService(
      android.content.Context.NOTIFICATION_SERVICE
    );
    const channelId = this.NOTIFICATION_CHANNEL;
    const importance = android.app.NotificationManager.IMPORTANCE_HIGH;
    const notificationChannel = new android.app.NotificationChannel(
      channelId,
      this.NOTIFICATION_CHANNEL,
      importance
    );
    notificationChannel.enableLights(false);
    notificationChannel.enableVibration(false);
    if (notificationManager != null) {
      notificationManager.createNotificationChannel(notificationChannel);
    } else {
      this.sentryBreadCrumb("NotificationManager was null. Unable to create the NotificationChannel to start the service with the notification.");
    }

    // create the notification builder
    const notificationBuilder = new android.app.Notification.Builder(
      this,
      this.NOTIFICATION_CHANNEL
    )
      .setTicker("Permobil")
      .setContentText("Permobil PushTracker is analyzing your activity.")
      // .setSmallIcon(R.mipmap.ic_launcher_round)
      // .setLargeIcon(Bitmap.createScaledBitmap(icon, 128, 128, false))
      .setContentIntent(contentPendingIntent)
      .setOngoing(true)
      .setChannelId(channelId);

    // create the notification
    const notification = notificationBuilder.build();
    notification.flags =
      notification.flags |
      android.app.Notification.FLAG_ONGOING_EVENT |
      // NO_CLEAR makes the notification stay when the user performs a
      // "delete all" command
      android.app.Notification.FLAG_NO_CLEAR;
    application.android.context.startForeground(this.NOTIFICATION_ID, notification);
  }

  private stopMyService() {
    application.android.context.stopForeground(true);
    this.stopSelf();
    this.isServiceRunning = false;
  }

  private sentryBreadCrumb(message: string) {
    Log.D(message);
    Sentry.captureBreadcrumb({
      message,
      category: 'info',
      level: Level.Info
    });
  }
}
