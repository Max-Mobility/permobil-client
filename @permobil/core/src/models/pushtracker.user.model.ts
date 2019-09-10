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
    chair_type: number; // ["Rigid" = 0, "Folding" = 1, "Pediatric" = 2]
    chair_make: number; // Check profile-tab.chair-makes for a full list
    // (1) smartdrive with switch control only, (2) smartdrive with pushtracker, or (3) smartdrive with pushtracker e2
    control_configuration: string;
    language: string;
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
    weight_unit_preference: number;
    height_unit_preference: number;
    distance_unit_preference: number;
    theme_preference: string;
    // serial number
    smartdrive_serial_number: string;
    pushtracker_serial_number: string;
  };
}
