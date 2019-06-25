import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';

@Component({
  selector: 'journey',
  moduleId: module.id,
  templateUrl: './journey-tab.component.html'
})
export class JourneyTabComponent implements OnInit {
  distancePercentage;
  coastPercentage;
  constructor() {}

  ngOnInit(): void {
    Log.D('journey-tab.component ngOnInit');
  }
}
