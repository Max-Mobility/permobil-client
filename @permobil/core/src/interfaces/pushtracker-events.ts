/**
 * All of the events for PushTracker that can be emitted and listened
 * to.
 */
export interface IPushTrackerEvents {
  pushtracker_disconnect_event: string;
  pushtracker_connect_event: string;
  pushtracker_version_event: string;
  pushtracker_error_event: string;
  pushtracker_distance_event: string;
  pushtracker_settings_event: string;
  pushtracker_daily_info_event: string;
  pushtracker_awake_event: string;
  pushtracker_ota_timeout_event: string;
  pushtracker_ota_progress_event: string;
  pushtracker_ota_version_event: string;
  pushtracker_ota_complete_event: string;
  pushtracker_ota_failure_event: string;
}
