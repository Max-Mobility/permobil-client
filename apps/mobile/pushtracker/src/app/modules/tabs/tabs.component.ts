import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser} from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { Page } from 'tns-core-modules/ui/page';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { AppResourceIcons } from '../../enums';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: 'tabs-page',
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  public homeTabItem;
  public journeyTabItem;
  public profileTabItem;

  private _homeTabTitle = this._translateService.instant('home-tab.title');
  private _journeyTabTitle = this._translateService.instant(
    'journey-tab.title'
  );
  private _profileTabTitle = this._translateService.instant(
    'profile-tab.title'
  );

  constructor(
    private _translateService: TranslateService,
    private _routerExtension: RouterExtensions,
    private _activeRoute: ActivatedRoute,
    private _page: Page
  ) {
    // hide the actionbar on the root tabview
    this._page.actionBarHidden = true;

    this.homeTabItem = {
      title: this._homeTabTitle,
      iconSource: AppResourceIcons.HOME_ACTIVE
    };
    this.journeyTabItem = {
      title: this._journeyTabTitle,
      iconSource: AppResourceIcons.JOURNEY_INACTIVE
    };
    this.profileTabItem = {
      title: this._profileTabTitle,
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

  // onTabViewLoaded(args) {
  //   Log.D('TabView Loaded', args.object);
  // }

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
            title: this._homeTabTitle,
            iconSource: AppResourceIcons.HOME_ACTIVE
          };
          this.journeyTabItem = {
            title: this._journeyTabTitle,
            iconSource: AppResourceIcons.JOURNEY_INACTIVE
          };
          this.profileTabItem = {
            title: this._profileTabTitle,
            iconSource: AppResourceIcons.PROFILE_INACTIVE
          };
          break;
        case 1:
          Log.D('JourneyTab Active');
          this.homeTabItem = {
            title: this._homeTabTitle,
            iconSource: AppResourceIcons.HOME_INACTIVE
          };
          this.journeyTabItem = {
            title: this._journeyTabTitle,
            iconSource: AppResourceIcons.JOURNEY_ACTIVE
          };
          this.profileTabItem = {
            title: this._profileTabTitle,
            iconSource: AppResourceIcons.PROFILE_INACTIVE
          };
          break;
        case 2:
          Log.D('ProfileTab Active');
          this.homeTabItem = {
            title: this._homeTabTitle,
            iconSource: AppResourceIcons.HOME_INACTIVE
          };
          this.journeyTabItem = {
            title: this._journeyTabTitle,
            iconSource: AppResourceIcons.JOURNEY_INACTIVE
          };
          this.profileTabItem = {
            title: this._profileTabTitle,
            iconSource: AppResourceIcons.PROFILE_ACTIVE
          };
          break;
      }
    }
  }
}
