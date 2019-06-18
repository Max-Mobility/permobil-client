import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { throwIfAlreadyLoaded } from '@maxmobility/helpers';
import { NxModule } from '@nrwl/nx';
import { CORE_PROVIDERS } from './services';

export const BASE_PROVIDERS: any[] = [
  ...CORE_PROVIDERS,
  {
    provide: APP_BASE_HREF,
    useValue: '/'
  }
];

@NgModule({
  imports: [
    CommonModule,
    // !environment.production ? StoreDevtoolsModule.instrument() : [],
    // StoreRouterConnectingModule
    NxModule.forRoot()
  ]
})
export class MaxMobilityCoreModule {
  // configuredProviders: *required to configure WindowService and others per platform
  static forRoot(configuredProviders: any[]): ModuleWithProviders {
    return {
      ngModule: MaxMobilityCoreModule,
      providers: [...BASE_PROVIDERS, ...configuredProviders]
    };
  }

  constructor(
    @Optional()
    @SkipSelf()
    parentModule: MaxMobilityCoreModule
  ) {
    throwIfAlreadyLoaded(parentModule, 'CoreModule');
  }
}
