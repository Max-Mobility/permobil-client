import { Color } from '@nativescript/core';
import { LocalNotifications } from '@nativescript/local-notifications';
import {
  PushTrackerLocalNotifications,
  PushTrackerWearNotificationChannels,
  SmartDriveLocalNotifications,
  SmartDriveWearNotificationChannels
} from '../enums';

export function scheduleSmartDriveLocalNotifications() {
  LocalNotifications.schedule([
    {
      id: SmartDriveLocalNotifications.TIRE_PRESSURE_NOTIFICATION_ID,
      title: 'Tire Pressure Reminder',
      body: 'It has been awhile, so you should check your tire pressure.',
      color: new Color('#0067a6'),
      ongoing: false, // Ongoing notifications cannot be dismissed by the user, not swipeable to close
      icon: 'res://ic_omniwheel_white',
      interval: 'minute', // fires every minute
      channel:
        SmartDriveWearNotificationChannels.SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL,
      at: new Date(new Date().getTime() + 10 * 1000) // 10 seconds from now
    },
    {
      id: SmartDriveLocalNotifications.SMARTDRIVE_MAINTENANCE_NOTIFICATION_ID,
      title: 'Maintenance Reminder',
      body: 'Be sure to always perform routine maintenance.',
      color: new Color('#0067a6'),
      ongoing: false, // Ongoing notifications cannot be dismissed by the user, not swipeable to close
      icon: 'res://ic_omniwheel_white',
      interval: 'hour', // fires every minute
      channel:
        SmartDriveWearNotificationChannels.SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL,
      at: new Date(new Date().getTime() + 10 * 2000) // 20 seconds from now
    }
  ]);
}

export function cancelScheduledNotification(
  notificationID: SmartDriveLocalNotifications | PushTrackerLocalNotifications
) {
  return LocalNotifications.cancel(notificationID);
}

/**
 * Cancels all reminder notifications
 */
export function cancelAllScheduledNotifications() {
  LocalNotifications.cancelAll();
}
