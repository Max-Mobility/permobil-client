import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptMaterialBottomSheetModule } from '@nativescript-community/ui-material-bottomsheet/angular';
import {
  ModalDialogService,
  NativeScriptCommonModule,
  NativeScriptFormsModule,
  NativeScriptHttpClientModule,
  NativeScriptModule
} from '@nativescript/angular';
import { NativeScriptAnimatedCircleModule } from '@nativescript/animated-circle/angular';
import { NativeScriptDateTimePickerModule } from '@nativescript/datetimepicker/angular';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { PermobilCoreModule } from '@permobil/angular';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { NativeScriptUICalendarModule } from 'nativescript-ui-calendar/angular';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
import { NgRippleModule } from 'nativescript-ripple/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { COMPONENTS, ENTRY_COMPONENTS } from './modules';
import { SharedModule } from './modules/shared/shared.module';
import { PROVIDERS } from './services';
import { TNSTranslateLoader } from './utils';

export function createBarcodeScanner() {
  return new BarcodeScanner();
}

// factories
export function createTranslateLoader() {
  return new TNSTranslateLoader();
}

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptModule,
    NativeScriptHttpClientModule,
    NativeScriptFormsModule,
    NativeScriptAnimatedCircleModule,
    NativeScriptDateTimePickerModule,
    NativeScriptUICalendarModule,
    NativeScriptUIChartModule,
    SharedModule,
    PermobilCoreModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader
      }
    }),
    NgRippleModule,
    // This will call the install method and inject a global service called BottomSheetService
    NativeScriptMaterialBottomSheetModule.forRoot()
  ],
  exports: [SharedModule],
  declarations: [AppComponent, ...COMPONENTS],
  entryComponents: [...ENTRY_COMPONENTS],
  providers: [
    ...PROVIDERS,
    ModalDialogService,
    { provide: BarcodeScanner, useFactory: createBarcodeScanner }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
/*
Pass your application module to the bootstrapModule function located in main.ts to start your app
*/
export class AppModule {}
