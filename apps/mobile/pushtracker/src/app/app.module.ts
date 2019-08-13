import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { PermobilCoreModule } from '@permobil/angular';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptHttpClientModule } from 'nativescript-angular/http-client';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { NativeScriptModule } from 'nativescript-angular/nativescript.module';
import { NativeScriptDateTimePickerModule } from 'nativescript-datetimepicker/angular';
import { DropDownModule } from 'nativescript-drop-down/angular';
import { NativeScriptUIListViewModule } from 'nativescript-ui-listview/angular';
import { AppRoutingModule, COMPONENTS } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppInfoComponent } from './modules/app-info/app-info.component';
import { SharedModule } from './modules/shared/shared.module';
import { PROVIDERS } from './services';
import { TNSTranslateLoader } from './utils';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { ActivityTabComponent } from './modules/activity-tab/activity-tab.component';
import { NativeScriptUIChartModule } from 'nativescript-ui-chart/angular';

export function createBarcodeScanner() {
  return new BarcodeScanner();
}

// factories
export function createTranslateLoader() {
  return new TNSTranslateLoader('/app/assets/i18n/');
}

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptModule,
    NativeScriptHttpClientModule,
    NativeScriptUIListViewModule,
    NativeScriptCommonModule,
    NativeScriptFormsModule,
    NativeScriptUIListViewModule,
    NativeScriptDateTimePickerModule,
    NativeScriptUIChartModule,
    // // This will call the install method and inject a global service called BottomSheetService
    // NativeScriptMaterialBottomSheetModule.forRoot(),
    SharedModule,
    PermobilCoreModule,
    AppRoutingModule,
    DropDownModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader
      }
    })
  ],
  declarations: [AppComponent, ...COMPONENTS],
  entryComponents: [AppInfoComponent, ActivityTabComponent],
  providers: [...PROVIDERS, ModalDialogService,
    { provide: BarcodeScanner, useFactory: createBarcodeScanner }],
  schemas: [NO_ERRORS_SCHEMA]
})
/*
Pass your application module to the bootstrapModule function located in main.ts to start your app
*/
export class AppModule {}
