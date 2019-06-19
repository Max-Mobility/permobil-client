import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { SharedModule } from '../shared/shared.module';
import { SearchComponent } from './search.component';

const routes: Routes = [{ path: '', component: SearchComponent }];

@NgModule({
  imports: [NativeScriptRouterModule.forChild(routes), SharedModule],
  declarations: [SearchComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class SearchModule {}
