import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { JourneyDetailComponent } from './journey-detail.component';
import { JourneyTabComponent } from './journey-tab.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'journey' },
      { path: 'journey', component: JourneyTabComponent },
      { path: 'journey/:id', component: JourneyDetailComponent }
    ]),
    TranslateModule
  ],
  declarations: [JourneyTabComponent, JourneyDetailComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class JourneyTabModule {}
