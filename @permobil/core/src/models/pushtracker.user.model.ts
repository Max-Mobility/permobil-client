export interface PushTrackerUserData {
  /**
   * Kinvey Data
   */
  _socialIdentity?: object;
  username?: string;
  email?: string;

  /**
   * Our data
   */
  first_name: string;
  last_name: string;
  gender: string;
  dob: Date;
  // weight and height in metric
  weight: number; // kg
  height: number; // cm
  chair_type: string;
  chair_make: string;
  // (1) smartdrive with switch control only, (2) smartdrive with pushtracker, or (3) smartdrive with pushtracker e2
  control_configuration: string;
  phone: string;
  accessToken: string;
  profile_picture: string;
  // data protection
  has_agreed_to_user_agreement: boolean;
  has_read_privacy_policy: boolean;
  // activity goals
  activity_goal_coast_time: number;
  activity_goal_distance: number;
  // unit preference
  weight_unit_preference: string;
  height_unit_preference: string;
  distance_unit_preference: string;
  // Display preferences
  time_format_preference: string;
  language_preference: string;
  // serial number
  smartdrive_serial_number: string;
  pushtracker_serial_number: string;
}

export interface PushTrackerUser {
  readonly _id: string;
  readonly _acl: any;
  readonly _kmd: any;
  readonly authtoken: string;
  readonly _socialIdentity: object;
  readonly username: string;
  readonly email: string;

  data: {
    first_name: string;
    last_name: string;
    gender: string;
    dob: Date;
    // weight and height in metric
    weight: number; // kg
    height: number; // cm
    chair_type: string;
    chair_make: string;
    // (1) smartdrive with switch control only, (2) smartdrive with pushtracker, or (3) smartdrive with pushtracker e2
    control_configuration: string;
    phone: string;
    accessToken: string;
    profile_picture: string;
    // data protection
    has_agreed_to_user_agreement: boolean;
    has_read_privacy_policy: boolean;
    // activity goals
    activity_goal_coast_time: number;
    activity_goal_distance: number;
    // unit preference
    weight_unit_preference: string;
    height_unit_preference: string;
    distance_unit_preference: string;
    // Display preferences
    time_format_preference: string;
    language_preference: string;
    // serial number
    smartdrive_serial_number: string;
    pushtracker_serial_number: string;
  };
}
