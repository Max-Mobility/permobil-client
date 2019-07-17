import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ItemEventData } from 'tns-core-modules/ui/list-view';
import { Page } from 'tns-core-modules/ui/page';
import { LoggingService } from '../../services';

@Component({
  selector: 'journey',
  moduleId: module.id,
  templateUrl: './journey-tab.component.html'
})
export class JourneyTabComponent implements OnInit {
  journeyItems;
  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;
  }

  ngOnInit(): void {
    this._logService.logBreadCrumb('journey-tab.component ngOnInit');

    // this.journeyItems = [
    //   {
    //     date: new Date(),
    //     coast_time: 40,
    //     distance: 1.3,
    //     description: 'Morning roll',
    //     duration: 48
    //   },
    //   {
    //     date: '2019-07-09T17:48:55.391Z',
    //     coast_time: 20,
    //     distance: 0.3,
    //     description: 'Afternoon roll',
    //     duration: 10
    //   },
    //   {
    //     date: '2019-07-05T17:48:55.391Z',
    //     coast_time: 80,
    //     distance: 2.5,
    //     description: 'Evening roll',
    //     duration: 80
    //   },
    //   {
    //     date: '2019-07-04T17:48:55.391Z',
    //     coast_time: 40,
    //     distance: 4.5,
    //     description: 'Morning roll',
    //     duration: 120
    //   }
    // ];
  }

  onJourneyItemTap(args: ItemEventData) {
    Log.D('journey item tap', args.index);
  }

  onRefreshTap() {
    Log.D('refresh tap');
  }

  closeJourneyDetailsLayout() {
    Log.D('close journey details');
  }
}
