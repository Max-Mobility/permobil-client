import { Log } from '@permobil/core';

import * as timer from 'tns-core-modules/timer';

import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';

import { Level, Sentry } from 'nativescript-sentry';
import { ReflectiveInjector } from 'injection-js';
import { ActivityDetector } from '../models/activity-detector';
import { SensorChangedEventData, SensorService, SERVICES } from './index';

@JavaProxy('com.permobil.pushtracker.wearos.ActivityService')
class ActivityService extends android.app.Service {

  private watchBeingWorn: boolean = false;

  private activityDetector: ActivityDetector = null;
  private sensorService: SensorService = null;
  private locationManager: android.location.LocationManager = null;

  private SENSOR_DELAY_US: number = 40 * 1000;
  private MAX_REPORTING_INTERVAL_US: number = 1 * 60 * 1000; // 5 minutes
  private LOCATION_LISTENER_MIN_TIME_MS = 1 * 60 * 1000;
  private LOCATION_LISTENER_MIN_DISTANCE_M = 25;

  private timerId: number;

  onBind(): android.os.IBinder {
    return null;
  }

  onCreate(): void {
    super.onCreate();

    this.sentryBreadCrumb('ActivityService - creating sensor service');
    const injector = ReflectiveInjector.resolveAndCreate([...SERVICES]);
    this.sensorService = injector.get(SensorService);
    this.sentryBreadCrumb('ActivityService - sensor service created.');

    // Activity detection related code:
    this.sensorService.on(
      SensorService.SensorChanged,
      this.handleSensorData.bind(this)
    );
    this.sentryBreadCrumb('Creating new ActivityDetector');
    console.time('new_activity_detector');
    this.activityDetector = new ActivityDetector();
    console.timeEnd('new_activity_detector');
    this.sentryBreadCrumb('New ActivityDetector created.');

    this.sentryBreadCrumb('Enabling body sensor.');
    this.enableBodySensor();
    this.sentryBreadCrumb('Body sensor enabled.');

    this.sentryBreadCrumb('Enabling location listener');


    // Get the LocationManager so we can send last known location
    // with the record when saving to Kinvey
    this.locationManager = application.android.context
      .getSystemService(android.content.Context.LOCATION_SERVICE);
    this.locationManager.requestLocationUpdates(
      android.location.LocationManager.GPS_PROVIDER,
      this.LOCATION_LISTENER_MIN_TIME_MS,
      this.LOCATION_LISTENER_MIN_DISTANCE_M,
      this.locationListener
    );
    this.sentryBreadCrumb('Location listener enabled.');

    Log.D('ts service created!');

    if (!this.timerId) {
      this.timerId = timer.setInterval(() => {
        // Run this every 4 hrs
      }, (1000 * 60 * 60 * 4));
    }
  }

  onStartCommand(intent: android.content.Intent, flags: number, startId: number): number {
    Log.D('ts service started!');
    return android.app.Service.START_STICKY;
  }

  onDestroy(): void {
    Log.D('ts service destroyed!');
    super.onDestroy();
    timer.clearInterval(this.timerId);
  }

  /**
   * Location Data Handlers
   */
  private locationListener = new android.location.LocationListener({
    onLocationChanged: function(location: any) {
      // Log.D(TAG, "Got location: " + location);
      this.lastKnownLocation = location;
      // TODO: do we need to check if the user has been active here?
    },
    onProviderDisabled: function(provider: string) {
      // Log.D(TAG, "Provider disabled: " + provider);
    },
    onProviderEnabled: function(provider: string) {
      // Log.D(TAG, "Provider enabled: " + provider);
    },
    onStatusChanged: function(provider: string, status: number, extras: any) {
      // Log.D(TAG, "onStatusChanged(): " + provider + " - " + status);
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
  enableBodySensor() {
    try {
      this.sensorService.startDeviceSensor(
        android.hardware.Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT,
        this.SENSOR_DELAY_US,
        this.MAX_REPORTING_INTERVAL_US
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error starting the body sensor', err);
    }
  }

  enableTapSensor() {
    try {
      this.sensorService.startDeviceSensor(
        android.hardware.Sensor.TYPE_LINEAR_ACCELERATION,
        this.SENSOR_DELAY_US,
        this.MAX_REPORTING_INTERVAL_US
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error starting the tap sensor', err);
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

  disableTapSensor() {
    try {
      this.sensorService.stopDeviceSensor(
        android.hardware.Sensor.TYPE_LINEAR_ACCELERATION
      );
    } catch (err) {
      Sentry.captureException(err);
      // Log.E('Error disabling the device sensors:', err);
    }
  }

  private sentryBreadCrumb(message: string) {
    Sentry.captureBreadcrumb({
      message,
      category: 'info',
      level: Level.Info
    });
  }
}
