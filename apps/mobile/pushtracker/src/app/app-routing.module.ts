import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from 'nativescript-angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: './modules/login/login.module#LoginModule'
  },
  {
    path: 'sign-up',
    loadChildren: './modules/sign-up/sign-up.module#SignUpModule'
  },
  {
    path: 'forgot-password',
    loadChildren:
      './modules/forgot-password/forgot-password.module#ForgotPasswordModule'
  },
  { path: 'tabs', loadChildren: './modules/tabs/tabs.module#TabsModule' }
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {}
