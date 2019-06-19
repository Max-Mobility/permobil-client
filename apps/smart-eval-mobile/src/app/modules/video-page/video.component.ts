import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { LoggingService } from '@maxmobility/mobile';
import * as orientation from 'nativescript-orientation';
import { YoutubePlayer } from 'nativescript-youtubeplayer';
import { Subscription } from 'rxjs/Subscription';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'video',
  moduleId: module.id,
  templateUrl: 'video.component.html',
  styleUrls: ['video.component.scss']
})
export class VideoComponent implements OnInit {
  private static LOG_TAG = 'video.component ';
  title = String();
  desc = String();
  options = { rel: 1 };

  private routeSub: Subscription; // subscription to route observer

  constructor(
    private _page: Page,
    private router: Router,
    private route: ActivatedRoute,
    private _logService: LoggingService
  ) {
    this._page.className = 'blue-gradient-down';
  }

  ngOnInit() {
    this._logService.logBreadCrumb(VideoComponent.LOG_TAG + `ngOnInit`);

    // see https://github.com/NativeScript/nativescript-angular/issues/1049
    this.routeSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (orientation.getOrientation() !== 'portrait') {
          orientation.setOrientation('portrait');
        }
        orientation.disableRotation();
      }
    });
    // orientation.setOrientation('portrait');
    orientation.enableRotation();
  }

  /**
   * Set the video src when the player is loaded.
   * @param args
   */
  playerLoaded(args) {
    const player = args.object as YoutubePlayer;
    const query = this.route.snapshot.queryParams;

    // Set the title and video description from the queryParams of current route
    this.title = `${query.title}`;
    this.desc = `${query.desc}`;

    // Set the player src for the video
    player.src = `${query.url}`;

    this._logService.logBreadCrumb(
      VideoComponent.LOG_TAG + `playerLoaded() -- player.src: ${player.src}`
    );
  }
}
