import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
// import { PlayerDetailComponent } from './player-detail.component';
// import { PlayerComponent } from './players.component';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule
    // NativeScriptRouterModule.forChild([
    //   { path: '', redirectTo: 'players' },
    //   { path: 'players', component: PlayerComponent },
    //   { path: 'player/:id', component: PlayerDetailComponent }
    // ])
  ],
  // declarations: [PlayerComponent, PlayerDetailComponent],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeTabModule {}
