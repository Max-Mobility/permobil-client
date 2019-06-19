import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';

const routes: Routes = [{ path: '', component: ForgotPasswordComponent }];

@NgModule({
  imports: [
    NativeScriptRouterModule.forChild(routes),
    NativeScriptCommonModule,
    NativeScriptFormsModule,
    TranslateModule
  ],
  declarations: [ForgotPasswordComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ForgotPasswordModule {}
