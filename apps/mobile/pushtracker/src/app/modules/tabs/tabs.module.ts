import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import {
  NativeScriptRouterModule,
  NSEmptyOutletComponent
} from 'nativescript-angular/router';
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
          }
        ]
      }
    ])
  ],
  declarations: [TabsComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class TabsModule {}
