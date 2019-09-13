import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { ActivityComponent } from '../activity/activity.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  entryComponents: [ActivityComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptUIChartModule,
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  declarations: [ActivityComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeTabModule {}
