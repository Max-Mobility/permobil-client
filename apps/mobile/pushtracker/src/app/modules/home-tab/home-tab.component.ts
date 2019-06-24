import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';

@Component({
  selector: 'home-tab',
  moduleId: module.id,
  templateUrl: './home-tab.component.html'
})
export class PlayerComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    Log.D('home-tab.component ngOnInit');
  }
}
