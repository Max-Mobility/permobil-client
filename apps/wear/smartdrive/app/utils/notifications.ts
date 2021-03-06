import { ApplicationSettings, Color } from '@nativescript/core';
import { LocalNotifications } from '@nativescript/local-notifications';
import { Log } from '@permobil/core';
import { L } from '@permobil/nativescript';
import { addDays } from 'date-fns';
import { Sentry } from 'nativescript-sentry';
import { NOTIFICATION_KEYS, SmartDriveNotificationIDs } from '../enums';

export async function setupAllLocalNotifications() {
  scheduleRecurring();
  setupAccessMoreFeatures();
  setupOpenPtWear();
  setupCharging();
  setupScLight();
  setupAccelerateMoving();
  setupSwitchControlReminder();
}

/**
 * Sets up the notifications that are recurring based
 */
async function scheduleRecurring() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (ApplicationSettings.getBoolean(NOTIFICATION_KEYS.RECURRING) === true) {
      return;
    }

    const color = new Color('#0067a6');
    const smartDriveChannel = L('notifications.channels.smartdrive');
    const maintenanceChannel = L('notifications.channels.maintenance');

    const at = new Date();
    at.setHours(12);
    at.setMinutes(0);
    at.setMilliseconds(0);

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.TIRE_PRESSURE,
        title: `🔧 ${L('notifications.titles.tire-pressure')}`,
        body: L('notifications.add-pt-element'),
        channel: maintenanceChannel,
        icon: 'res://smartdrive_material_white_45',
        interval: 15, // fires every 15 days
        color,
        at
      },
      {
        id: SmartDriveNotificationIDs.SMARTDRIVE_ROLLER_CHECK,
        title: `🔧 ${L('notifications.titles.sd-roller-check')}`,
        body: L('notifications.sd-roller-check'),
        channel: maintenanceChannel,
        icon: 'res://ic_omniwheel_white',
        interval: 180, // fires every 180 days
        color,
        at
      },
      {
        id: SmartDriveNotificationIDs.SMARTDRIVE_CLAMP_CHECK,
        title: `🔧 ${L('notifications.titles.sd-clamp-check')}`,
        body: L('notifications.sd-clamp-check'),
        channel: maintenanceChannel,
        icon: 'res://smartdrive_material_white_45',
        interval: 30, // fires every 30 days
        color,
        at
      },
      {
        id: SmartDriveNotificationIDs.ROUTINE_MAINTENANCE,
        title: `💡 ${L('notifications.titles.routine-maintenance')}`,
        body: L('notifications.routine-maintenance'),
        channel: smartDriveChannel,
        icon: 'res://smartdrive_material_white_45',
        interval: 30, // fires every 30 days
        color,
        at
      }
    ]);

    Log.D('Recurring Notifications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.RECURRING, true);
  } catch (error) {
    Sentry.captureException(error);
    Log.E('Error setting up recurring notifications for SD.W', error);
  }
}

/**
 * Sets up the Open PT.W reminder notifications for 15 and 30 days from now.
 */
async function setupOpenPtWear() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (
      ApplicationSettings.getBoolean(NOTIFICATION_KEYS.OPEN_PT_WEAR) === true
    ) {
      return;
    }

    const title = L('notifications.titles.open-pt-wear');
    const body = L('notifications.open-pt-wear');
    const channel = L('notifications.channels.smartdrive');
    const icon = 'res://ic_pushtracker';
    const color = new Color('#0067a6');

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.OPEN_PT_WEAR + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 15)
      },
      {
        id: SmartDriveNotificationIDs.OPEN_PT_WEAR + 1002,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 30)
      }
    ]);

    Log.D('Open PT Wear Notifications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.OPEN_PT_WEAR, true);
  } catch (error) {
    Log.E(error);
    Sentry.captureException(error);
  }
}

async function setupAccessMoreFeatures() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (
      ApplicationSettings.getBoolean(NOTIFICATION_KEYS.ACCESS_MORE) === true
    ) {
      return;
    }

    const title = `💡 ${L('notifications.titles.access-more-features')}`;
    const body = L('notifications.access-more-features');
    const channel = L('notifications.channels.smartdrive');
    const icon = 'res://smartdrive_material_white_45';
    const color = new Color('#0067a6');

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.ACCESS_MORE + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 15)
      },
      {
        id: SmartDriveNotificationIDs.ACCESS_MORE + 1002,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 30)
      },
      {
        id: SmartDriveNotificationIDs.ACCESS_MORE + 1003,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 45)
      }
    ]);

    Log.D('Access More Features Notifications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.ACCESS_MORE, true);
  } catch (error) {
    Log.E(error);
    Sentry.captureException(error);
  }
}

/**
 * Sets up the Charging reminder notifications for 20, 30, 40 days from now.
 */
async function setupCharging() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (ApplicationSettings.getBoolean(NOTIFICATION_KEYS.CHARGING) === true) {
      return;
    }

    const title = `💡 ${L('notifications.titles.sd-e2-charging')}`;
    const body = L('notifications.sd-e2-charging');
    const channel = L('notifications.channels.smartdrive');
    const icon = 'res://smartdrive_material_white_45';
    const color = new Color('#0067a6');

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.SD_E2_CHARGING + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 20)
      },
      {
        id: SmartDriveNotificationIDs.SD_E2_CHARGING + 1002,
        title,
        body,
        channel,
        color,
        at: addDays(new Date().setHours(12), 30)
      },
      {
        id: SmartDriveNotificationIDs.SD_E2_CHARGING + 1003,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 40)
      }
    ]);

    Log.D('Charging Notifications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.CHARGING, true);
  } catch (error) {
    Log.E(error);
    Sentry.captureException(error);
  }
}

/**
 * Sets up the SwitchControl light indication notifiations for 20, 40 days from now.
 */
async function setupScLight() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (ApplicationSettings.getBoolean(NOTIFICATION_KEYS.SC_LIGHTS) === true) {
      return;
    }

    const title = `💡 ${L('notifications.titles.sc-light-indications')}`;
    const body = L('notifications.sc-light-indications');
    const channel = L('notifications.channels.smartdrive');
    const icon = 'res://switchcontrol_white';
    const color = new Color('#0067a6');

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.SC_LIGHT_INDICATIONS + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 20)
      },
      {
        id: SmartDriveNotificationIDs.SC_LIGHT_INDICATIONS + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 40)
      }
    ]);

    Log.D('SwitchControl Light Indications Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.SC_LIGHTS, true);
  } catch (error) {
    Log.E(error);
    Sentry.captureException(error);
  }
}

/**
 * Sets up the accelerate while moving notifications for 15, 30 days from now.
 */
async function setupAccelerateMoving() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (ApplicationSettings.getBoolean(NOTIFICATION_KEYS.ACCELERATE) === true) {
      return;
    }

    const title = `💡 ${L('notifications.titles.accelerate-while-moving')}`;
    const body = L('notifications.accelerate-while-moving');
    const channel = L('notifications.channels.smartdrive');
    const icon = 'res://smartdrive_material_white_45';
    const color = new Color('#0067a6');

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.ACCELERATE_WHILE_MOVING + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 15)
      },
      {
        id: SmartDriveNotificationIDs.ACCELERATE_WHILE_MOVING + 1002,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 30)
      }
    ]);

    Log.D('Accelerate While Moving Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.ACCELERATE, true);
  } catch (error) {
    Log.E(error);
    Sentry.captureException(error);
  }
}

/**
 * Sets up the switch control reminder notifications for 10, 30, 60 days from now.
 */
async function setupSwitchControlReminder() {
  try {
    // if we have already set these notifications then we're not going to do it again
    if (
      ApplicationSettings.getBoolean(NOTIFICATION_KEYS.SWITCH_CONTROL) === true
    ) {
      return;
    }

    const title = `💡${L(
      'notifications.titles.switch-control-reminder'
    )}` as string;
    const body = L('notifications.switch-control-reminder') as string;
    const channel = L('notifications.channels.smartdrive') as string;
    const icon = 'res://switchcontrol_white';
    const color = new Color('#0067a6');

    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.SWITCHCONTROL_REMINDER + 1001,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 10),
        actions: [
          {
            id: 'cancelTheseReminders',
            type: 'button',
            title: 'Cancel SwitchControl Reminders',
            launch: false
          }
        ]
      },
      {
        id: SmartDriveNotificationIDs.SWITCHCONTROL_REMINDER + 1002,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 30),
        actions: [
          {
            id: 'cancelTheseReminders',
            type: 'button',
            title: 'Cancel SwitchControl Reminders',
            launch: false
          }
        ]
      },
      {
        id: SmartDriveNotificationIDs.SWITCHCONTROL_REMINDER + 1003,
        title,
        body,
        channel,
        icon,
        color,
        at: addDays(new Date().setHours(12), 60)
      }
    ]);

    LocalNotifications.addOnMessageReceivedCallback(notification => {
      if (notification.title.toLowerCase() === title.toLowerCase()) {
        // need to cancel these notifications from occurring in the future
        LocalNotifications.cancel(
          SmartDriveNotificationIDs.SWITCHCONTROL_REMINDER + 1002
        );
        LocalNotifications.cancel(
          SmartDriveNotificationIDs.SWITCHCONTROL_REMINDER + 1003
        );
      }
    });

    Log.D('Switch Control Reminder Scheduled', notifications);
    // Save the boolean that we have setup these notifications so we do not continue to register them
    ApplicationSettings.setBoolean(NOTIFICATION_KEYS.SWITCH_CONTROL, true);
  } catch (error) {
    Log.E(error);
    Sentry.captureException(error);
  }
}

export async function dailyDistanceNotification() {
  try {
    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.DAILY_DISTANCE,
        title: `🏆 ${L('notifications.titles.daily-distance-record')}`,
        body: L('notifications.daily-distance-record'),
        channel: L('notifications.channels.personal-record'),
        icon: 'res://smartdrive_material_white_45',
        color: new Color('#0067a6')
      }
    ]);
    Log.D('Daily Distance Notification', notifications);
  } catch (error) {
    Log.E('Error dailyDistanceNotification', error);
    Sentry.captureException(error);
  }
}

export async function odometerRecordNotification(recordText: string) {
  try {
    const notifications = await LocalNotifications.schedule([
      {
        id: SmartDriveNotificationIDs.ODOMETER_RECORDS,
        title: `🏆 ${L('notifications.titles.odometer-records')}`,
        body: `${L(
          'notifications.odometer-records-part-one'
        )} ${recordText} ${L('notifications.odometer-records-part-two')}`,
        channel: L('notifications.channels.personal-record'),
        icon: 'res://ic_odometer_white',
        color: new Color('#0067a6')
      }
    ]);
    Log.D('Odometer Record Notification', notifications);
  } catch (error) {
    Log.E('Error odometerRecordNotification', error);
    Sentry.captureException(error);
  }
}
