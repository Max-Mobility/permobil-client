import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import {
  NativeScriptCommonModule,
  NativeScriptFormsModule,
  NativeScriptRouterModule
} from '@nativescript/angular';
import { TranslateModule } from '@ngx-translate/core';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptFormsModule,
    SharedModule,
    TranslateModule
  ],
  providers: [BarcodeScanner],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ProfileTabModule {}
