export interface PtMobileUserData {
  gender: string;
  dob: string;
  weight: number;
  height: number;
  chair_type: string;
  language: string;
  phone_number: string;
  region: string;
  accessToken: string;
  profile_picture: string;
  // data protection
  has_agreed_to_user_agreement: boolean;
  has_read_privacy_policy: boolean;
}

export enum UserTypes {
  'Admin',
  'EndUser'
}
