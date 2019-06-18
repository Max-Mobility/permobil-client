import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'videos',
  moduleId: module.id,
  templateUrl: 'videos.component.html',
  styleUrls: ['videos.component.scss']
})
export class VideosComponent {
  videos = this._translateService.instant('videos');

  constructor(
    private _page: Page,
    private _routerExtensions: RouterExtensions,
    private _translateService: TranslateService
  ) {
    this._page.className = 'blue-gradient-down';
  }

  isIOS(): boolean {
    return isIOS;
  }

  isAndroid(): boolean {
    return isAndroid;
  }

  onItemTap(args) {
    const item = this.videos[args.index];
    const url = item.Url;
    const route = item.Route;
    const title = item.Title;
    const desc = item.Description;

    this._routerExtensions.navigate([route], {
      transition: {
        name: ''
      },
      queryParams: {
        url,
        desc,
        title
      }
    });
  }
}
