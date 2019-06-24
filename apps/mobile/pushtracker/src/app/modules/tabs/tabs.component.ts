import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Log } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';

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
    private routerExtension: RouterExtensions,
    private activeRoute: ActivatedRoute
  ) {
    this.homeTabItem = {
      title: 'Home',
      iconSource: 'res://baseline_home_black_24'
    };
    this.journeyTabItem = {
      title: 'Journey',
      iconSource: 'res://baseline_location_on_black_24'
    };
    this.profileTabItem = {
      title: 'Profile',
      iconSource: 'res://baseline_perm_identity_black_24'
    };
  }

  ngOnInit() {
    this.routerExtension.navigate(
      [
        {
          outlets: {
            homeTab: ['home'],
            journeyTab: ['journey'],
            profileTab: ['profile']
          }
        }
      ],
      { relativeTo: this.activeRoute }
    );
  }

  tabViewIndexChange(event) {
    Log.D('TabView Index Change: ' + event.newIndex);
    if (event.newIndex === 0) {
      Log.D('HomeTab Active');
      this.homeTabItem = {
        title: 'Home',
        iconSource: 'res://icon'
      };
      this.journeyTabItem = {
        title: 'Journey',
        iconSource: 'res://baseline_location_on_black_24'
      };
      this.profileTabItem = {
        title: 'Profile',
        iconSource: 'res://baseline_perm_identity_black_24'
      };
    } else if (event.newIndex === 1) {
      Log.D('JourneyTab Active');
      this.homeTabItem = {
        title: 'Home',
        iconSource: 'res://baseline_home_black_24'
      };
      this.journeyTabItem = {
        title: 'Journey',
        iconSource: 'res://icon'
      };
      this.profileTabItem = {
        title: 'Profile',
        iconSource: 'res://baseline_perm_identity_black_24'
      };
    } else if (event.newIndex === 2) {
      Log.D('ProfileTab Active');
      this.homeTabItem = {
        title: 'Home',
        iconSource: 'res://baseline_home_black_24'
      };
      this.journeyTabItem = {
        title: 'Journey',
        iconSource: 'res://baseline_location_on_black_24'
      };
      this.profileTabItem = { title: 'Profile', iconSource: 'res://icon' };
    }
  }
}
