import { Color } from '@nativescript/core';
import { Log } from '@permobil/core';
import { LocalNotifications } from 'nativescript-local-notifications';
import { Sentry } from 'nativescript-sentry';

export async function scheduleSmartDriveLocalNotifications() {
  const scheduledIds = await LocalNotifications.schedule([
    {
      id: SmartDriveLocalNotifications.TIRE_PRESSURE_NOTIFICATION_ID,
      title: 'Tire Pressure Reminder',
      body: 'It has been awhile, so you should check your tire pressure.',
      color: new Color('#0067a6'),
      ongoing: false, // Ongoing notifications cannot be dismissed by the user, not swipeable to close
      icon: 'res://ic_omniwheel_white',
      interval: 'minute', // fires every minute
      channel: NotificationChannels.SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL,
      at: new Date(new Date().getTime() + 10 * 1000) // 10 seconds from now
    }
  ]).catch(error => {
    Log.E(error);
    Sentry.captureException(error);
  });

  Log.D(`Scheduled the tire pressure local notification: ${scheduledIds}`);
}

/**
 * Cancels the tire pressure reminder notification
 */
export async function cancelTirePressureNotificationReminder() {
  const foundId = LocalNotifications.cancel(
    SmartDriveLocalNotifications.TIRE_PRESSURE_NOTIFICATION_ID
  ).catch(error => {
    Log.E('Error trying to cancel tire pressure reminder.', error);
    Sentry.captureException(error);
  });
  Log.D(`Cancelled tire pressure reminder: ${foundId}`);
}

/**
 * Cancels all reminder notifications
 */
export function cancelAllScheduledNotifications() {
  LocalNotifications.cancelAll();
}

/**
 * IDs for SmartDrive Notifications
 */
enum SmartDriveLocalNotifications {
  TIRE_PRESSURE_NOTIFICATION_ID = 111111,
  SMARTDRIVE_MAINTENANCE = 111112
}

/**
 * Channels for SmartDrive Notifications
 * Useful on Android 26+, not much of a need on WearOS as it is on mobile.
 */
enum NotificationChannels {
  SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL = 'SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL'
}
