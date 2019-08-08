export interface PtMobileUserData {
  gender: string;
  dob: string;
  // weight and height in metric
  weight: number; // kg
  height: number; // cm
  chair_type: string;
  language: string;
  phone_number: string;
  region: string;
  accessToken: string;
  profile_picture: string;
  // data protection
  has_agreed_to_user_agreement: boolean;
  has_read_privacy_policy: boolean;
  // activity goals
  activity_goal_coast_time: number;
  activity_goal_distance: number;
}

export enum UserTypes {
  'Admin',
  'EndUser'
}
