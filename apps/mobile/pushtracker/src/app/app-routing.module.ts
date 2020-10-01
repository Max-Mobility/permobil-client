import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from '@nativescript/angular';
import {
  ConfigurationComponent,
  DeviceSetupComponent,
  ForgotPasswordComponent,
  LoginComponent,
  SignUpComponent
} from './modules';
import { AuthGuardService } from './services';

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
    path: 'configuration',
    component: ConfigurationComponent
  },
  {
    path: 'device-setup',
    component: DeviceSetupComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'tabs',
    loadChildren: () =>
      import('./modules/tabs/tabs.module').then(m => m.TabsModule),
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {}
