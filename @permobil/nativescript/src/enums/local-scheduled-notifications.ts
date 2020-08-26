/**
 * IDs for SmartDrive Wear Notifications
 */
export enum SmartDriveLocalNotifications {
  TIRE_PRESSURE_NOTIFICATION_ID = 111111,
  SMARTDRIVE_MAINTENANCE_NOTIFICATION_ID = 111112
}

/**
 * IDs for PushTracker Wear Notifications
 */
export enum PushTrackerLocalNotifications {
  REPOSITIONING_NOTIFICATION_ID = 111111,
  PRESSURE_RELIEF_NOTIFICATION_ID = 111112
}

/**
 * Channels for SmartDrive Notifications
 * Useful on Android 26+ to set notification channels.
 */
export enum SmartDriveWearNotificationChannels {
  SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL = 'SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL'
}

/**
 * Channels for PushTracker Wear Notifications
 * Useful on Android 26+ to set notification channels.
 */
export enum PushTrackerWearNotificationChannels {
  PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL = 'PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL'
}
