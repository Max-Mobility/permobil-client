import { NgModule, NO_ERRORS_SCHEMA, Optional, SkipSelf } from '@angular/core';
import { throwIfAlreadyLoaded } from '@maxmobility/helpers';
import { TranslateModule } from '@ngx-translate/core';
import * as TNSKinvey from 'kinvey-nativescript-sdk';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { LoadingIndicator } from 'nativescript-loading-indicator';
import { NativeScriptUIListViewModule } from 'nativescript-ui-listview/angular';
import { device } from 'tns-core-modules/platform';
import { PROVIDERS } from './services';

// factories
export function loadingIndicatorFactory() {
  return new LoadingIndicator();
}

export function platformLangFactory() {
  return device.language;
}

export function kinveyFactory() {
  return TNSKinvey;
}

const MODULES = [
  NativeScriptCommonModule,
  NativeScriptFormsModule,
  NativeScriptRouterModule,
  NativeScriptUIListViewModule,
  TranslateModule
];

@NgModule({
  imports: [...MODULES],
  declarations: [],
  exports: [...MODULES],
  providers: [...PROVIDERS],
  schemas: [NO_ERRORS_SCHEMA]
})
export class MobileCoreModule {
  constructor(
    @Optional()
    @SkipSelf()
    parentModule: MobileCoreModule
  ) {
    throwIfAlreadyLoaded(parentModule, 'MobileCoreModule');
  }
}
