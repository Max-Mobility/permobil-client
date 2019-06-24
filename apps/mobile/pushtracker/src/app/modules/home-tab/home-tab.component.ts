import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class HomeTabComponent implements OnInit {
  constructor(private _page: Page) {
    this._page.actionBarHidden = false;
  }

  ngOnInit(): void {
    Log.D('home-tab.component ngOnInit');
  }
}
