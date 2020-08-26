import { Color } from '@nativescript/core';
import { LocalNotifications } from 'nativescript-local-notifications';

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
      channel: NotificationChannels.SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL,
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
      channel: NotificationChannels.SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL,
      at: new Date(new Date().getTime() + 10 * 2000) // 20 seconds from now
    }
  ]);
}

export function schedulePushTrackerLocalNotifications() {
  LocalNotifications.schedule([
    {
      id: PushTrackerLocalNotifications.PRESSURE_RELIEF_NOTIFICATION_ID,
      title: 'Pressure Relief',
      body: 'Good pressure relief :).',
      color: new Color('#0067a6'),
      ongoing: false, // Ongoing notifications cannot be dismissed by the user, not swipeable to close
      icon: 'res://ic_omniwheel_white',
      interval: 'minute', // fires every minute
      channel: NotificationChannels.PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL,
      at: new Date(new Date().getTime() + 10 * 1000) // 10 seconds from now
    },
    {
      id: PushTrackerLocalNotifications.REPOSITIONING_NOTIFICATION_ID,
      title: 'Reposition Reminder',
      body: 'Always reposition yourself ❤️.',
      color: new Color('#0067a6'),
      ongoing: false, // Ongoing notifications cannot be dismissed by the user, not swipeable to close
      icon: 'res://ic_omniwheel_white',
      interval: 'hour', // fires every minute
      channel: NotificationChannels.PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL,
      at: new Date(new Date().getTime() + 10 * 2000) // 20 seconds from now
    }
  ]);
}

/**
 * Cancels the tire pressure reminder notification
 */
export function cancelTirePressureNotificationReminder() {
  LocalNotifications.cancel(
    SmartDriveLocalNotifications.TIRE_PRESSURE_NOTIFICATION_ID
  );
}

export function cancelSmartDriveMaintenanceReminder() {
  LocalNotifications.cancel(
    SmartDriveLocalNotifications.SMARTDRIVE_MAINTENANCE_NOTIFICATION_ID
  );
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
  SMARTDRIVE_MAINTENANCE_NOTIFICATION_ID = 111112
}

enum PushTrackerLocalNotifications {
  REPOSITIONING_NOTIFICATION_ID = 111111,
  PRESSURE_RELIEF_NOTIFICATION_ID = 111112
}

/**
 * Channels for SmartDrive Notifications
 * Useful on Android 26+, not much of a need on WearOS as it is on mobile.
 */
enum NotificationChannels {
  SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL = 'SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL',
  PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL = 'PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL'
}
