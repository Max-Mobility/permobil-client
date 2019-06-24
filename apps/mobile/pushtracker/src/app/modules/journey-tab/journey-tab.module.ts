import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { JourneyDetailComponent } from './journey-detail.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'journey' },
      { path: 'journey/:id', component: JourneyDetailComponent }
    ])
  ],
  declarations: [JourneyDetailComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class JourneyTabModule {}
