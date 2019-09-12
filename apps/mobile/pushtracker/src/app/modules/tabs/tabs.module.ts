import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { ActivityGoalSettingComponent, ActivityTabComponent, ConfigurationTabComponent, HomeTabComponent, JourneyTabComponent, PrivacyPolicyComponent, ProfileSettingsComponent, ProfileTabComponent, SupportComponent, TabsComponent, UpdatesInfoComponent, WirelessUpdatesComponent } from '..';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  entryComponents: [
    ActivityGoalSettingComponent,
    ActivityTabComponent,
    ConfigurationTabComponent,
    PrivacyPolicyComponent,
    ProfileSettingsComponent,
    SupportComponent,
    UpdatesInfoComponent,
    WirelessUpdatesComponent
  ],
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
