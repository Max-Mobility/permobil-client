import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import {
  NativeScriptCommonModule,
  NativeScriptRouterModule
} from '@nativescript/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgRippleModule } from 'nativescript-ripple';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import {
  HomeTabComponent,
  JourneyTabComponent,
  ProfileTabComponent,
  TabsComponent
} from '..';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forChild([
      { path: 'default', component: TabsComponent }
    ]),
    NativeScriptUIChartModule,
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  exports: [SharedModule],
  declarations: [
    TabsComponent,
    ProfileTabComponent,
    JourneyTabComponent,
    HomeTabComponent
  ],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class TabsModule {}
