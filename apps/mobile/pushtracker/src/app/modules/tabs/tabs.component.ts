import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { Page } from 'tns-core-modules/ui/page';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { AppResourceIcons } from '../../enums';

@Component({
  moduleId: module.id,
  selector: 'tabs',
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  public homeTabItem;
  public journeyTabItem;
  public profileTabItem;
  constructor(
    private _translateService: TranslateService,
    private _routerExtension: RouterExtensions,
    private _activeRoute: ActivatedRoute,
    private _page: Page
  ) {
    // hide the actionbar on the root tabview
    this._page.actionBarHidden = true;

    this.homeTabItem = {
      title: 'Home',
      iconSource: AppResourceIcons.HOME_ACTIVE
    };
    this.journeyTabItem = {
      title: 'Journey',
      iconSource: AppResourceIcons.JOURNEY_INACTIVE
    };
    this.profileTabItem = {
      title: 'Profile',
      iconSource: AppResourceIcons.PROFILE_INACTIVE
    };
  }

  ngOnInit() {
    this._routerExtension.navigate(
      [
        {
          outlets: {
            homeTab: ['home'],
            journeyTab: ['journey'],
            profileTab: ['profile']
          }
        }
      ],
      { relativeTo: this._activeRoute }
    );
  }

  /**
   * Executes when the tabview item index is changed. Usually in response to user interaction changing which tab they are viewing.
   * Update the icon for the visual indicator which tab is active.
   * @param args [SelectedIndexChangedEventData]
   */
  tabViewIndexChange(args: SelectedIndexChangedEventData) {
    if (args.newIndex >= 0) {
      switch (args.newIndex) {
        case 0:
          Log.D('HomeTab Active');
          this.homeTabItem = {
            title: 'Home',
            iconSource: AppResourceIcons.HOME_ACTIVE
          };
          this.journeyTabItem = {
            title: 'Journey',
            iconSource: AppResourceIcons.JOURNEY_INACTIVE
          };
          this.profileTabItem = {
            title: 'Profile',
            iconSource: AppResourceIcons.PROFILE_INACTIVE
          };
          break;
        case 1:
          Log.D('JourneyTab Active');
          this.homeTabItem = {
            title: 'Home',
            iconSource: AppResourceIcons.HOME_INACTIVE
          };
          this.journeyTabItem = {
            title: 'Journey',
            iconSource: AppResourceIcons.JOURNEY_ACTIVE
          };
          this.profileTabItem = {
            title: 'Profile',
            iconSource: AppResourceIcons.PROFILE_INACTIVE
          };
          break;
        case 2:
          Log.D('ProfileTab Active');
          this.homeTabItem = {
            title: 'Home',
            iconSource: AppResourceIcons.HOME_INACTIVE
          };
          this.journeyTabItem = {
            title: 'Journey',
            iconSource: AppResourceIcons.JOURNEY_INACTIVE
          };
          this.profileTabItem = {
            title: 'Profile',
            iconSource: AppResourceIcons.PROFILE_ACTIVE
          };
          break;
      }
    }
  }
}
