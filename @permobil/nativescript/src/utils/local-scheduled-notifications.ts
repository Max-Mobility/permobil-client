import { LocalNotifications } from '@nativescript/local-notifications';
import {
  PushTrackerNotificationIDs,
  SmartDriveNotificationIDs
} from '../enums';

export function cancelScheduledNotification(
  notificationID: SmartDriveNotificationIDs | PushTrackerNotificationIDs
) {
  return LocalNotifications.cancel(notificationID);
}

/**
 * Cancels all reminder notifications
 */
export function cancelAllScheduledNotifications() {
  return LocalNotifications.cancelAll();
}
