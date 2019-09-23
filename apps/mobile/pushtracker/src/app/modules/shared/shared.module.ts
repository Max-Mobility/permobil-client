import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUIListViewModule } from 'nativescript-ui-listview/angular';
import { ListPickerSheetComponent, TextFieldSheetComponent, SHARED_COMPONENTS } from './components';

const SHARED_MODULES = [
  NativeScriptCommonModule,
  NativeScriptFormsModule,
  NativeScriptRouterModule,
  NativeScriptUIListViewModule,
  NgRippleModule,
  TranslateModule
];

@NgModule({
  imports: [...SHARED_MODULES],
  entryComponents: [ListPickerSheetComponent, TextFieldSheetComponent],
  declarations: [...SHARED_COMPONENTS],
  providers: [ModalDialogService],
  exports: [...SHARED_MODULES, ...SHARED_COMPONENTS],
  schemas: [NO_ERRORS_SCHEMA]
})
export class SharedModule {}
