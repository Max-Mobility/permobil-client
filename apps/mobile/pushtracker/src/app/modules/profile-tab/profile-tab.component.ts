import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    Log.D('profile-tab.component ngOnInit');
  }
}
