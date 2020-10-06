import { Log } from '@permobil/core/src';
import { LocalNotifications } from '@nativescript/local-notifications';
import { L, SmartDriveNotificationIDs } from '@permobil/nativescript';
import { Color } from '@nativescript/core';
import { Sentry } from 'nativescript-sentry';

export function scheduleRecurringNotifications() {
  try {
    const tpNotificationTime = new Date();
    tpNotificationTime.setDate(2);
    tpNotificationTime.setHours(12);
    tpNotificationTime.setMinutes(0);
    tpNotificationTime.setMilliseconds(0);
    Log.D(
      'tpNotificationTime',
      tpNotificationTime,
      tpNotificationTime.toLocaleDateString()
    );

    const wcMaintenanceTime = new Date();
    wcMaintenanceTime.setDate(5);
    wcMaintenanceTime.setHours(12);
    wcMaintenanceTime.setMinutes(0);
    wcMaintenanceTime.setMilliseconds(0);
    Log.D(
      'wcMaintenanceTime',
      wcMaintenanceTime,
      wcMaintenanceTime.toLocaleDateString()
    );

    LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.TIRE_PRESSURE,
        title: L('notifications.titles.tire-pressure'),
        body: L('notifications.add-pt-element'),
        color: new Color('#0067a6'),
        icon: 'res://ic_omniwheel_white',
        interval: 'week', // fires every week
        channel: L('notifications.channels.maintenance'),
        at: tpNotificationTime
      },
      {
        id: SmartDriveNotificationIDs.SMARTDRIVE_ROLLER_CHECK,
        title: L('notifications.titles.sd-roller-check'),
        body: L('notifications.sd-roller-check'),
        color: new Color('#0067a6'),
        icon: 'res://ic_omniwheel_white',
        interval: 'month', // fires every month
        channel: L('notifications.channels.smartdrive'),
        at: wcMaintenanceTime
      }
    ]);
  } catch (error) {
    Sentry.captureException(error);
    Log.E('Error setting up recurring notifications for SD.W', error);
  }
}
