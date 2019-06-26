import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import * as themes from 'nativescript-themes';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  distanceCirclePercentage: number;
  coastTimeCirclePercentage: number;
  milesToGoText: string;

  constructor(
    private _page: Page,
    private _translateService: TranslateService
  ) {
    this.distanceCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.coastTimeCirclePercentage = 68;
    this.milesToGoText = `0.4 ${this._translateService.instant(
      'home-tab.miles-to-go'
    )}`;
  }

  ngOnInit(): void {
    Log.D('home-tab.component ngOnInit');
  }

  onInfoTap() {
    Log.D('info button tapped.');

    // themes.applyThemeCss(
    //   require('../../scss/theme-dark.scss').toString(),
    //   'theme-dark.scss'
    // );

    themes.applyThemeCss(
      require('../../scss/theme-default.scss').toString(),
      'theme-default.scss'
    );
  }
}
