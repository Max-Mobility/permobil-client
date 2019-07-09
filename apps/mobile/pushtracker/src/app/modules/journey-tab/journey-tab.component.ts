import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
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
  }

  onJourneyItemTap() {
    Log.D('journey item tap');
  }

  onRefreshTap() {
    Log.D('refresh tap');
  }

  closeJourneyDetailsLayout() {
    Log.D('close journey details');
  }
}
