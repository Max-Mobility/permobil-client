export enum STORAGE_KEYS {
  'CURRENT_USER' = 'CURRENT_USER',
  'TOKEN' = 'TOKEN',
  'HAS_PAIRED_TO_PUSHTRACKER' = 'HAS_PAIRED_TO_PUSHTRACKER',
  'SHOULD_SHOW_BLE_PERMISSION_REQUEST' = 'SHOULD_SHOW_BLE_PERMISSION_REQUEST',

  /**
   * This key is used to store the Device.Settings (SmartDrive
   * Settings) object.
   */
  'DEVICE_SETTINGS' = 'DEVICE_SETTINGS',

  /**
   * This key is used to store the Device.SwitchControlSettings
   * (SmartDrive Switch Control Settings) object.
   */
  'DEVICE_SWITCH_CONTROL_SETTINGS' = 'DEVICE_SWITCH_CONTROL_SETTINGS',

  /**
   * This key is used to store the user selected style theme.
   */
  'APP_THEME' = 'APP_THEME',

  /**
   * Key to get/set the user set COAST_TIME_ACTIVITY value for their profile.
   */
  'COAST_TIME_ACTIVITY_GOAL' = 'COAST_TIME_ACTIVITY_GOAL',

  /**
   * The Default Value for the Coast Time Activity Goal if user has not set their own.
   */
  'COAST_TIME_ACTIVITY_GOAL_DEFAULT_VALUE' = 60,

  /**
   * Key to get/set the user set DISTANCE value for their profile.
   */
  'DISTANCE_ACTIVITY_GOAL' = 'DISTANCE_ACTIVITY_GOAL',

  /**
   * The Default Value for the Distance Activity Goal if user has not set their own.
   */
  'DISTANCE_ACTIVITY_GOAL_DEFAULT_VALUE' = 100
}
