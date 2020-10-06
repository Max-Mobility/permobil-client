import { Color } from '@nativescript/core';
import { LocalNotifications } from '@nativescript/local-notifications';
import { L } from '@permobil/nativescript';
import {
  PushTrackerLocalNotifications,
  PushTrackerWearNotificationChannels
} from '@permobil/nativescript/src/enums';
import { Sentry } from 'nativescript-sentry';
import { Log } from '@permobil/core/src';

export function scheduleRecurringNotifications() {
  try {
    const addPtNotificationTime = new Date();
    addPtNotificationTime.setDate(2);
    addPtNotificationTime.setHours(12);
    addPtNotificationTime.setMinutes(0);
    addPtNotificationTime.setMilliseconds(0);
    Log.D(
      'addPtNotificationTime',
      addPtNotificationTime,
      addPtNotificationTime.toLocaleDateString()
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
        id: PushTrackerLocalNotifications.ADD_PT_AS_ELEMENT_NOTIFICATION_ID,
        title: L('notifications.titles.add-pt-element'),
        body: L('notifications.add-pt-element'),
        color: new Color('#0067a6'),
        icon: 'res://ic_omniwheel_white',
        interval: 'week', // fires every week
        channel: L('notifications.channels.smartdrive'),
        at: addPtNotificationTime
      },
      {
        id:
          PushTrackerLocalNotifications.GENERAL_WC_MAINTENANCE_REMINDER_NOTIFICATION_ID,
        title: L('notifications.titles.wheelchair-maintenance'),
        body: L('notifications.wheelchair-maintenance'),
        color: new Color('#0067a6'),
        icon: 'res://ic_omniwheel_white',
        interval: 'month', // fires every month
        channel: L('notifications.channels.maintenance'),
        at: wcMaintenanceTime
      }
    ]);
  } catch (error) {
    Sentry.captureException(error);
    console.log('Error setting up recurring notifications for PT.W', error);
  }
}
