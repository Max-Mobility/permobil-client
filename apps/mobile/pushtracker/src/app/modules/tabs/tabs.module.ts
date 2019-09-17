import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { ActivityComponent, ConfigurationComponent, HomeTabComponent, JourneyTabComponent, PrivacyPolicyComponent, ProfileSettingsComponent, ProfileTabComponent, TabsComponent, UpdatesInfoComponent, WirelessUpdatesComponent } from '..';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  entryComponents: [
    ActivityComponent,
    ConfigurationComponent,
    PrivacyPolicyComponent,
    ProfileSettingsComponent,
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
