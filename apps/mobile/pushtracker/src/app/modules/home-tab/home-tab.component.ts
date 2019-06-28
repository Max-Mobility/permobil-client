import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import * as themes from 'nativescript-themes';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  distanceCirclePercentage: number;
  coastTimeCirclePercentage: number;
  distanceRemainingText: string;
  pushCountData: string;
  coastTimeData: string;
  distanceData: string;

  constructor(private _translateService: TranslateService) {
    this.distanceCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.coastTimeCirclePercentage = Math.floor(Math.random() * 100) + 1;
    this.distanceRemainingText = `0.4 ${this._translateService.instant(
      'home-tab.miles-to-go'
    )}`;
    this.pushCountData = `1514`;
    this.coastTimeData = `3.6`;
    this.distanceData = `2.75`;
  }

  ngOnInit(): void {
    Log.D('home-tab.component ngOnInit');
  }

  onInfoTap() {
    Log.D('info button tapped.');

    themes.applyThemeCss(
      require('../../scss/theme-dark.scss').toString(),
      'theme-dark.scss'
    );
  }
}
