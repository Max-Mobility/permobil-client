import { ActivityComponent } from './activity';
import { ActivityGoalSettingComponent } from './activity-goal-setting';
import { AppInfoComponent } from './app-info';
import { ConfigurationComponent } from './configuration';
import { ForgotPasswordComponent } from './forgot-password';
import { LoginComponent } from './login';
import { PrivacyPolicyComponent } from './privacy-policy';
import { ProfileSettingsComponent } from './profile-settings';
import { SignUpComponent } from './sign-up';
import { SupportComponent } from './support';
import { UpdatesInfoComponent } from './updates-info';
import { WirelessUpdatesComponent } from './wireless-updates';

export const ENTRY_COMPONENTS = [
  ActivityGoalSettingComponent,
  AppInfoComponent,
  SupportComponent,
  ActivityComponent,
  ProfileSettingsComponent,
  PrivacyPolicyComponent,
  UpdatesInfoComponent,
  WirelessUpdatesComponent
];

export const COMPONENTS = [
  LoginComponent,
  SignUpComponent,
  ForgotPasswordComponent,
  ActivityComponent,
  ActivityGoalSettingComponent,
  SupportComponent,
  WirelessUpdatesComponent,
  AppInfoComponent,
  ProfileSettingsComponent,
  PrivacyPolicyComponent,
  ConfigurationComponent,
  UpdatesInfoComponent
];

export * from './activity';
export * from './activity-goal-setting';
export * from './app-info';
export * from './configuration';
export * from './forgot-password';
export * from './home-tab';
export * from './journey-tab';
export * from './login';
export * from './privacy-policy';
export * from './profile-settings';
export * from './profile-tab';
export * from './sign-up';
export * from './support';
export * from './tabs';
export * from './updates-info';
export * from './wireless-updates';

