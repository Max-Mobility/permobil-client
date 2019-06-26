import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { HomeTabComponent } from './home-tab.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'home' },
      { path: 'home', component: HomeTabComponent }
    ]),
    TranslateModule
  ],
  declarations: [HomeTabComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeTabModule {}
