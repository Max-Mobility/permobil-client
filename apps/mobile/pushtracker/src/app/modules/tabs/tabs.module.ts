import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { HomeTabComponent, JourneyTabComponent, ProfileTabComponent, TabsComponent } from '..';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  // entryComponents: [
  //   ActivityComponent,
  //   ConfigurationComponent,
  //   PrivacyPolicyComponent,
  //   ProfileSettingsComponent,
  //   ActivityGoalSettingComponent,
  //   SupportComponent,
  //   UpdatesInfoComponent,
  //   WirelessUpdatesComponent
  // ],
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
