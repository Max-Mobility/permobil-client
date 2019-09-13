import { AppInfoComponent } from './app-info/app-info.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { ProfileSettingsComponent } from './profile-settings/profile-settings.component';
import { SignUpComponent } from './sign-up/sign-up.component';
// import { SupportComponent } from './support/support.component';
import { UpdatesInfoComponent } from './updates-info/updates-info.component';

export const ENTRY_COMPONENTS = [
  ProfileSettingsComponent,
  AppInfoComponent,
  PrivacyPolicyComponent,
  // SupportComponent,
  UpdatesInfoComponent
];

export const COMPONENTS = [
  LoginComponent,
  SignUpComponent,
  ForgotPasswordComponent,
  AppInfoComponent,
  ProfileSettingsComponent,
  PrivacyPolicyComponent,
  // SupportComponent,
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

