
/**
 * IDs for SmartDrive Notifications
 */
export enum SmartDriveLocalNotifications {
    TIRE_PRESSURE_NOTIFICATION_ID = 111111,
    SMARTDRIVE_MAINTENANCE_NOTIFICATION_ID = 111112
  }
  
  export enum PushTrackerLocalNotifications {
    REPOSITIONING_NOTIFICATION_ID = 111111,
    PRESSURE_RELIEF_NOTIFICATION_ID = 111112
  }
  
  /**
   * Channels for SmartDrive Notifications
   * Useful on Android 26+, not much of a need on WearOS as it is on mobile.
   */
  export enum NotificationChannels {
    SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL = 'SMARTDRIVE_WEAR_NOTIFICATION_CHANNEL',
    PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL = 'PUSHTRACKER_WEAR_NOTIFICATION_CHANNEL'
  }
  