import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import {
  NativeScriptRouterModule,
  NSEmptyOutletComponent
} from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { SharedModule } from '../shared/shared.module';
import { TabsComponent } from './tabs.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forChild([
      {
        path: 'default',
        component: TabsComponent,
        children: [
          {
            path: 'home',
            outlet: 'homeTab',
            component: NSEmptyOutletComponent,
            loadChildren: '../home-tab/home-tab.module#HomeTabModule'
          },
          {
            path: 'journey',
            outlet: 'journeyTab',
            component: NSEmptyOutletComponent,
            loadChildren: '../journey-tab/journey-tab.module#JourneyTabModule'
          },
          {
            path: 'profile',
            outlet: 'profileTab',
            component: NSEmptyOutletComponent,
            loadChildren: '../profile-tab/profile-tab.module#ProfileTabModule'
          }
        ]
      }
    ]),
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  exports: [SharedModule],
  declarations: [TabsComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class TabsModule {}
