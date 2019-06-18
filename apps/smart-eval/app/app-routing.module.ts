import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthGuardService } from '@maxmobility/mobile';
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
  {
    path: 'home',
    loadChildren: './modules/home/home.module#HomeModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'ota',
    loadChildren: './modules/ota/ota.module#OTAModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'pairing',
    loadChildren: './modules/pairing/pairing.module#PairingModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'account',
    loadChildren: './modules/account/account.module#AccountModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'videos',
    loadChildren: './modules/videos/videos.module#VideosModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'video',
    loadChildren: './modules/video-page/video.module#VideoModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'search',
    loadChildren: './modules/search/search.module#SearchModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'training',
    loadChildren: './modules/training/training.module#TrainingModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'trial',
    loadChildren: './modules/trial/trial.module#TrialModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'evals',
    loadChildren: './modules/evals/evals.module#EvalsModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'eval-entry',
    loadChildren: './modules/eval-entry-view/eval-entry.module#EvalEntryModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'summary',
    loadChildren: './modules/summary/summary.module#SummaryModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'demos',
    loadChildren: './modules/demos/demos.module#DemosModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'demo-detail',
    loadChildren: './modules/demo-detail/demo-detail.module#DemoDetailModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'demo-requests',
    loadChildren:
      './modules/demo-requests/demo-requests.module#DemoRequestsModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'faq',
    loadChildren: './modules/faq/faq.module#FAQModule',
    canActivate: [AuthGuardService]
  },
  {
    path: 'settings',
    loadChildren: './modules/settings/settings.module#SettingsModule',
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {}
