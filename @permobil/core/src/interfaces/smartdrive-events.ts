/**
 * All of the events for SmartDrive that can be emitted and listened to.
 */
export interface ISmartDriveEvents {
  smartdrive_disconnect_event: string;
  smartdrive_connect_event: string;
  smartdrive_ble_version_event: string;
  smartdrive_mcu_version_event: string;
  smartdrive_ota_timeout_event: string;
  smartdrive_ota_progress_event: string;
  smartdrive_ota_version_event: string;
  smartdrive_ota_complete_event: string;
  smartdrive_ota_failure_event: string;
}
