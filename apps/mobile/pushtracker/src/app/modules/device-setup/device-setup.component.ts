import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Page } from 'tns-core-modules/ui/page';
import { PushTrackerUserService } from '../../services';
import { CONFIGURATIONS } from '../../enums';
import * as appSettings from 'tns-core-modules/application-settings';
import { isAndroid, isIOS, screen } from 'tns-core-modules/platform';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'device-setup',
  moduleId: module.id,
  templateUrl: './device-setup.component.html'
})
export class DeviceSetupComponent implements OnInit {
  public CONFIGURATIONS = CONFIGURATIONS;
  private _user: PushTrackerUser;
  slides = [];
  slideIndex: number = 0;

  constructor(
    private _router: Router,
    private _userService: PushTrackerUserService,
    private _translateService: TranslateService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;
  }

  ngOnInit() {
    this._userService.user.subscribe(user => {
      this._user = user;
      if (
        !this.slides.length &&
        this._user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
      ) {
        // OG PushTracker configuration
        this.slides = this._translateService.instant(
          'device-setup.slides.pushtracker-with-smartdrive'
        );
      }
    });
  }

  isIOS(): boolean {
    return isIOS;
  }

  isAndroid(): boolean {
    return isAndroid;
  }

  isGif(value: string) {
    if (value.endsWith('.gif')) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Loaded event for the stacklayout that is the top part of the carousel slide
   * Setting the size based on the screen height to avoid stretching the gifs
   * @param args
   */
  onTopSlideLoaded(args) {
    args.object.height = screen.mainScreen.heightDIPs * 0.35;
  }

  /**
   * Loaded event for the Gifs in the carousel items
   * Setting the size based on the screen height to avoid stretching the gifs
   * @param args
   */
  onGifLoaded(args) {
    args.object.height = screen.mainScreen.heightDIPs * 0.35;
    args.object.width = screen.mainScreen.heightDIPs * 0.35;
  }

  onPreviousTap(args) {
    if (!this.slides) return;
    if (this.slideIndex > 0) this.slideIndex -= 1;
  }

  onNextTap(args) {
    if (!this.slides) return;
    this.slideIndex += 1;
  }

  onDoneTap(args) {
    this.onNextTap(args);
    if (this.slideIndex === this.slides.length) {
      // Done with device setup
      this._router.navigate(['/tabs/default']);
    }
  }
}
