import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { SignUpComponent } from './sign-up.component';

const routes: Routes = [{ path: '', component: SignUpComponent }];

@NgModule({
  imports: [
    NativeScriptRouterModule.forChild(routes),
    NativeScriptFormsModule,
    CommonModule,
    TranslateModule
  ],
  declarations: [SignUpComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class SignUpModule {}
