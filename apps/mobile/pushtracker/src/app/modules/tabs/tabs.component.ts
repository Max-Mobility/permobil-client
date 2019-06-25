import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';

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
    private _activeRoute: ActivatedRoute
  ) {
    this.homeTabItem = {
      title: 'Home',
      iconSource: 'res://home_active'
    };
    this.journeyTabItem = {
      title: 'Journey',
      iconSource: 'res://journey_inactive'
    };
    this.profileTabItem = {
      title: 'Profile',
      iconSource: 'res://profile_inactive'
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
    if (args.newIndex) {
      switch (args.newIndex) {
        case 0:
          Log.D('HomeTab Active');
          this.homeTabItem = {
            title: 'Home',
            iconSource: 'res://home_active'
          };
          this.journeyTabItem = {
            title: 'Journey',
            iconSource: 'res://journey_inactive'
          };
          this.profileTabItem = {
            title: 'Profile',
            iconSource: 'res://profile_inactive'
          };
          break;
        case 1:
          Log.D('JourneyTab Active');
          this.homeTabItem = {
            title: 'Home',
            iconSource: 'res://home_inactive'
          };
          this.journeyTabItem = {
            title: 'Journey',
            iconSource: 'res://journey_active'
          };
          this.profileTabItem = {
            title: 'Profile',
            iconSource: 'res://profile_inactive'
          };
          break;
        case 2:
          Log.D('ProfileTab Active');
          this.homeTabItem = {
            title: 'Home',
            iconSource: 'res://home_inactive'
          };
          this.journeyTabItem = {
            title: 'Journey',
            iconSource: 'res://journey_inactive'
          };
          this.profileTabItem = {
            title: 'Profile',
            iconSource: 'res://profile_active'
          };
          break;
      }
    }
  }
}
