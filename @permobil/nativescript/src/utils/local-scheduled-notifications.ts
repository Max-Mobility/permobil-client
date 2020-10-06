import { LocalNotifications } from '@nativescript/local-notifications';
import {
  PushTrackerLocalNotifications,
  SmartDriveLocalNotifications
} from '../enums';

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
