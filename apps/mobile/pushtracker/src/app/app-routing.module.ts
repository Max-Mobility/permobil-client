import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { AppInfoComponent } from './modules/app-info/app-info.component';
import { ForgotPasswordComponent } from './modules/forgot-password/forgot-password.component';
import { LoginComponent } from './modules/login/login.component';
import { SignUpComponent } from './modules/sign-up/sign-up.component';
import { ActivityTabComponent } from './modules/activity-tab/activity-tab.component';
// import { TabsComponent } from './modules/tabs/tabs.component';

export const COMPONENTS = [
  LoginComponent,
  SignUpComponent,
  ForgotPasswordComponent,
  AppInfoComponent,
  ActivityTabComponent
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
    loadChildren: './modules/tabs/tabs.module#TabsModule'
    /*
    component: TabsComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadChildren: './modules/home-tab/home-tab.module#HomeTabModule' },
      { path: 'journey', loadChildren: './modules/journey-tab/journey-tab.module#JourneyTabModule' },
      { path: 'profile', loadChildren: './modules/profile-tab/profile-tab.module#ProfileTabModule' }
    ]
    */
  }
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
