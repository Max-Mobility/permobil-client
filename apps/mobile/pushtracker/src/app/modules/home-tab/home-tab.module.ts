import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import {
  NativeScriptCommonModule,
  NativeScriptRouterModule
} from '@nativescript/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptUIChartModule,
    SharedModule,
    TranslateModule
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeTabModule {}
