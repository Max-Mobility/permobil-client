import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { SharedModule } from '../shared/shared.module';
import { DemosComponent } from './demos.component';

const routes: Routes = [{ path: '', component: DemosComponent }];

@NgModule({
  imports: [
    NativeScriptRouterModule.forChild(routes),
    SharedModule,
    TranslateModule
  ],
  declarations: [DemosComponent],
  providers: [BarcodeScanner],
  schemas: [NO_ERRORS_SCHEMA]
})
export class DemosModule {}
