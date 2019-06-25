import { HttpClientModule } from '@angular/common/http';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { PermobilCoreModule } from '@permobil/angular';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptHttpClientModule } from 'nativescript-angular/http-client';
import { ModalDialogService } from 'nativescript-angular/modal-dialog';
import { NativeScriptModule } from 'nativescript-angular/nativescript.module';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { DropDownModule } from 'nativescript-drop-down/angular';
import { NativeScriptUIListViewModule } from 'nativescript-ui-listview/angular';
import { YoutubePlayerModule } from 'nativescript-youtubeplayer/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './modules/shared/shared.module';
import { PrivacyPolicyComponent } from './privacy-policy';
import { PROVIDERS } from './services';
import { TNSTranslateLoader } from './utils';

export function createBarcodeScanner() {
  return new BarcodeScanner();
}

// factories
export function createTranslateLoader() {
  return new TNSTranslateLoader('/assets/i18n/');
}

@NgModule({
  bootstrap: [AppComponent],
  entryComponents: [PrivacyPolicyComponent],
  imports: [
    NativeScriptCommonModule,
    NativeScriptModule,
    NativeScriptHttpClientModule,
    NativeScriptUIListViewModule,
    NativeScriptCommonModule,
    NativeScriptFormsModule,
    NativeScriptRouterModule,
    NativeScriptUIListViewModule,
    SharedModule,
    PermobilCoreModule,
    AppRoutingModule,
    HttpClientModule,
    DropDownModule,
    YoutubePlayerModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader
      }
    })
  ],
  declarations: [AppComponent, PrivacyPolicyComponent],
  providers: [
    ...PROVIDERS,
    ModalDialogService,
    { provide: BarcodeScanner, useFactory: createBarcodeScanner }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AppModule {}
