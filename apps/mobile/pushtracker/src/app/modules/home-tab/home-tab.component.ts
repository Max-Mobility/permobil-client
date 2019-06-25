import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';
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

  constructor(private _page: Page) {
    this._page.actionBarHidden = false;
    this.distanceCirclePercentage = 85;
    this.coastTimeCirclePercentage = 68;
    this.milesToGoText = '0.4 miles to go';
  }

  ngOnInit(): void {
    Log.D('home-tab.component ngOnInit');
  }
}
