import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { SharedModule } from '../shared/shared.module';
import { WirelessUpdatesComponent } from '../wireless-updates/wireless-updates.component';
import { ProfileTabComponent } from './profile-tab.component';

@NgModule({
  entryComponents: [WirelessUpdatesComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptFormsModule,
    NativeScriptRouterModule.forChild([
      { path: '', redirectTo: 'profile' },
      { path: 'profile', component: ProfileTabComponent }
    ]),
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  declarations: [ProfileTabComponent, WirelessUpdatesComponent],
  providers: [BarcodeScanner],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ProfileTabModule {}
