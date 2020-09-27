import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ModalDialogService,
  NativeScriptCommonModule,
  NativeScriptFormsModule,
  NativeScriptRouterModule
} from '@nativescript/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgRippleModule } from 'nativescript-ripple';
import {
  ListPickerSheetComponent,
  SHARED_COMPONENTS,
  SliderSheetComponent,
  TextFieldSheetComponent
} from './components';

const SHARED_MODULES = [
  NativeScriptCommonModule,
  NativeScriptFormsModule,
  NativeScriptRouterModule,
  NgRippleModule,
  TranslateModule
];

@NgModule({
  imports: [...SHARED_MODULES],
  entryComponents: [
    ListPickerSheetComponent,
    TextFieldSheetComponent,
    SliderSheetComponent
  ],
  declarations: [...SHARED_COMPONENTS],
  providers: [ModalDialogService],
  exports: [...SHARED_MODULES, ...SHARED_COMPONENTS],
  schemas: [NO_ERRORS_SCHEMA]
})
export class SharedModule {}
