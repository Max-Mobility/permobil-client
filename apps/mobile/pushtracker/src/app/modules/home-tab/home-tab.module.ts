import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { ActivityTabComponent } from '../activity-tab/activity-tab.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  entryComponents: [ActivityTabComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptUIChartModule,
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  declarations: [ActivityTabComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeTabModule {}
