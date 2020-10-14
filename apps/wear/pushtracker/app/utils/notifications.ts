import { ApplicationSettings, Color } from '@nativescript/core';
import { LocalNotifications } from '@nativescript/local-notifications';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';
import { addDays } from 'date-fns';
import { Sentry } from 'nativescript-sentry';
import { NotificationKeys, PushTrackerNotificationIDs } from '../enums';

export async function setupAllLocalNotifications() {
  scheduleWheelchairMaintenance();
  setupAddPtElement();
}

/**
 * Sets up the wheelchair maintenance notification to fire ever 30 days
 */
async function scheduleWheelchairMaintenance() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (
      ApplicationSettings.getBoolean(NotificationKeys.WC_MAINTENANCE) === true
    ) {
      return;
    }

    const color = new Color('#0067a6');
    const at = new Date();
    at.setHours(12);
    at.setMinutes(0);
    at.setMilliseconds(0);
    Log.D('notificationTime', at);

    const notifications = await LocalNotifications.schedule([
      {
        id: PushTrackerNotificationIDs.GENERAL_WC_MAINTENANCE_REMINDER,
        title: L('notifications.titles.wheelchair-maintenance'),
        body: L('notifications.wheelchair-maintenance'),
        channel: L('notifications.channels.maintenance'),
        icon: 'res://ic_notification_icon',
        interval: 30, // fires every 30 days
        color,
        at
      }
    ]);

    Log.D('Recurruing Notifications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NotificationKeys.WC_MAINTENANCE, true);
  } catch (error) {
    Sentry.captureException(error);
    Log.E('Error setting up recurring notifications for PT.W', error);
  }
}

/**
 * Sets up the add pushtracker element notifications to fire 7, 14, 21 days from now.
 */
async function setupAddPtElement() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (
      ApplicationSettings.getBoolean(NotificationKeys.ADD_PT_ELEMENT) === true
    ) {
      return;
    }

    const title = L('notifications.titles.add-pt-element');
    const body = L('notifications.add-pt-element');
    const channel = L('notifications.channels.smartdrive');
    const color = new Color('#0067a6');
    const icon = 'res://ic_notification_icon';

    const notifications = await LocalNotifications.schedule([
      {
        id: PushTrackerNotificationIDs.ADD_PT_AS_ELEMENT + 3001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setTime(12), 7)
      },
      {
        id: PushTrackerNotificationIDs.ADD_PT_AS_ELEMENT + 4001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setTime(12), 14)
      },
      {
        id: PushTrackerNotificationIDs.ADD_PT_AS_ELEMENT + 5001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setTime(12), 21)
      }
    ]);

    Log.D('Add PT Element Notifications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NotificationKeys.ADD_PT_ELEMENT, true);
  } catch (error) {
    Sentry.captureException(error);
    Log.E('Error setting up recurring notifications for PT.W', error);
  }
}
