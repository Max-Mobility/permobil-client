import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { ActivityTabComponent } from './modules/activity-tab/activity-tab.component';
import { AppInfoComponent } from './modules/app-info/app-info.component';
import { ForgotPasswordComponent } from './modules/forgot-password/forgot-password.component';
import { LoginComponent } from './modules/login/login.component';
import { ProfileSettingsComponent } from './modules/profile-settings/profile-settings.component';
import { SignUpComponent } from './modules/sign-up/sign-up.component';
import { AuthGuardService } from './services';

export const COMPONENTS = [
  LoginComponent,
  SignUpComponent,
  ForgotPasswordComponent,
  AppInfoComponent,
  ActivityTabComponent,
  ProfileSettingsComponent
];

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'sign-up',
    component: SignUpComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'tabs',
    loadChildren: './modules/tabs/tabs.module#TabsModule',
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {}
