import { Component } from '@angular/core';
import { LoggingService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'faq',
  moduleId: module.id,
  templateUrl: 'faq.component.html',
  styleUrls: ['faq.component.scss']
})
export class FAQComponent {
  private static LOG_TAG = 'faq.component ';
  faqs = this._translateService.instant('faqs');

  constructor(
    private _page: Page,
    private _translateService: TranslateService,
    private _logService: LoggingService
  ) {
    this._logService.logBreadCrumb(FAQComponent.LOG_TAG + `constructor.`);
    this._page.className = 'blue-gradient-down';
  }

  isIOS(): boolean {
    return isIOS;
  }

  isAndroid(): boolean {
    return isAndroid;
  }
}
