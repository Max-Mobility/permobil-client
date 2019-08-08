import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptDateTimePickerModule } from 'nativescript-datetimepicker/angular';

import { ProfileSettingsComponent } from './profile-settings.component';
import { ProfileTabComponent } from './profile-tab.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptFormsModule,
    NativeScriptDateTimePickerModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'profile' },
      { path: 'profile', component: ProfileTabComponent },
      { path: 'profile-settings', component: ProfileSettingsComponent }
    ]),
    TranslateModule
  ],
  declarations: [ProfileTabComponent, ProfileSettingsComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ProfileTabModule { }
