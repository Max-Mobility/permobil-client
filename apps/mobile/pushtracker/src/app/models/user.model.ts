import { User as KinveyUser } from 'kinvey-nativescript-sdk';

export class User extends KinveyUser {
  constructor() {
    super();
  }

  first_name = '';
  last_name = '';
  email = '';
  gender = '';
  dob = '';
  weight;
  height;
  chair_info;
  language = '';
  phone_number = '';
  region = '';
  accessToken = '';
  password = '';
  profile_picture: any;
  // data protection
  has_agreed_to_user_agreement = false;
  has_read_privacy_policy = false;
}

export enum UserTypes {
  'Admin',
  'EndUser'
}
