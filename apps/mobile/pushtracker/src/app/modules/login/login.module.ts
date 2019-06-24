import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { LoginComponent } from './login.component';
const routes: Routes = [{ path: '', component: LoginComponent }];

@NgModule({
  imports: [
    NativeScriptRouterModule.forChild(routes),
    NativeScriptFormsModule,
    TranslateModule
  ],
  declarations: [LoginComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class LoginModule {}
