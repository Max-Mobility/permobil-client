import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { SharedModule } from '../shared/shared.module';
import { JourneyTabComponent } from './journey-tab.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'journey' },
      { path: 'journey', component: JourneyTabComponent }
    ]),
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  declarations: [JourneyTabComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class JourneyTabModule {}
