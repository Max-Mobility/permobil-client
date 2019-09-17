import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptFormsModule,
    SharedModule,
    TranslateModule,
    NgRippleModule
  ],
  providers: [BarcodeScanner],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ProfileTabModule {}
