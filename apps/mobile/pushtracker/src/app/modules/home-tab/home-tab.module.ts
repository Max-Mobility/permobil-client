import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { SharedModule } from '../shared/shared.module';
import { HomeTabComponent } from './home-tab.component';
import { ActivityTabComponent } from '../activity-tab/activity-tab.component';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';

@NgModule({
  entryComponents: [ActivityTabComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptUIChartModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'home' },
      { path: 'home', component: HomeTabComponent }
    ]),
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  declarations: [HomeTabComponent, ActivityTabComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeTabModule {}
