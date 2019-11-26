import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { ModalDialogService, NativeScriptCommonModule, NativeScriptFormsModule, NativeScriptHttpClientModule, NativeScriptModule } from '@nativescript/angular';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { PermobilCoreModule } from '@permobil/angular';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { NativeScriptDateTimePickerModule } from 'nativescript-datetimepicker/angular';
import { NativeScriptMaterialBottomSheetModule } from 'nativescript-material-bottomsheet/angular';
import { NgRippleModule } from 'nativescript-ng-ripple';
import { NativeScriptUICalendarModule } from 'nativescript-ui-calendar/angular';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';
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
    NativeScriptDateTimePickerModule,
    NativeScriptUICalendarModule,
    NativeScriptUIChartModule,
    NgRippleModule,
    SharedModule,
    PermobilCoreModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader
      }
    }),
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
export class AppModule { }
