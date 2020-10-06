import { Color } from '@nativescript/core';
import { LocalNotifications } from '@nativescript/local-notifications';
import { L } from '@permobil/nativescript';
import {
  PushTrackerLocalNotifications,
  PushTrackerWearNotificationChannels
} from '@permobil/nativescript/src/enums';
import { Sentry } from 'nativescript-sentry';

export function scheduleRecurringNotifications() {
  try {
    const addPtNotificationTime = new Date();
    addPtNotificationTime.setDate(addPtNotificationTime.getDate());
    addPtNotificationTime.setHours(10);
    addPtNotificationTime.setMinutes(0);
    addPtNotificationTime.setMilliseconds(0);
    console.log(
      'addPtNotificationTime',
      addPtNotificationTime,
      addPtNotificationTime.toLocaleDateString()
    );

    const wcMaintenanceTime = new Date();
    wcMaintenanceTime.setDate(wcMaintenanceTime.getDate());
    wcMaintenanceTime.setHours(9);
    wcMaintenanceTime.setMinutes(0);
    wcMaintenanceTime.setMilliseconds(0);
    console.log(
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
        channel:
          PushTrackerWearNotificationChannels.PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL,
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
        channel:
          PushTrackerWearNotificationChannels.PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL,
        at: wcMaintenanceTime
      }
    ]);
  } catch (error) {
    Sentry.captureException(error);
    console.log('Error setting up recurring notifications for PT.W', error);
  }
}
