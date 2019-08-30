import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { Subscription } from 'rxjs';
import * as appSettings from 'tns-core-modules/application-settings';
import { ItemEventData } from 'tns-core-modules/ui/list-view';
import { Page } from 'tns-core-modules/ui/page';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { ActivityService, LoggingService, PushTrackerUserService, SmartDriveUsageService } from '../../services';

@Component({
  selector: 'journey',
  moduleId: module.id,
  templateUrl: './journey-tab.component.html'
})
export class JourneyTabComponent {
  journeyItems;
  savedTheme: string;
  user: PushTrackerUser;

  private _today: Date;
  private _weekStart: Date;
  private _weekEnd: Date;
  private _pushtrackerActivity: any;
  private _smartDriveUsage: any;
  private _userSubscription$: Subscription;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _page: Page,
    private userService: PushTrackerUserService,
    private _smartDriveUsageService: SmartDriveUsageService,
    private _pushtrackerActivityService: ActivityService
  ) {}

  onJourneyTabLoaded() {
    this._logService.logBreadCrumb('JourneyTabComponent loaded');

    this._page.actionBarHidden = true;
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
    this._today = new Date();
    const sunday = this._getFirstDayOfWeek(this._today);
    this._weekStart = sunday;
    this._weekEnd = new Date(this._weekStart);
    this._weekEnd.setDate(this._weekEnd.getDate() + 6);

    this._userSubscription$ = this.userService.user.subscribe(user => {
      this.user = user;

      this._loadWeeklyPushtrackerActivity();
      this._loadWeeklySmartDriveUsage();

      this.journeyItems = [
        {
          date: new Date(),
          coast_time: 40,
          distance: 1.3,
          description: 'Morning roll',
          duration: 48
        },
        {
          date: '2019-07-09T17:48:55.391Z',
          coast_time: 20,
          distance: 0.3,
          description: 'Afternoon roll',
          duration: 10
        },
        {
          date: '2019-07-05T17:48:55.391Z',
          coast_time: 80,
          distance: 2.5,
          description: 'Evening roll',
          duration: 80
        },
        {
          date: '2019-07-04T17:48:55.391Z',
          coast_time: 40,
          distance: 4.5,
          description: 'Morning roll',
          duration: 120
        }
      ];
    });
  }

  onJourneyTabUnloaded() {
    Log.D('JourneyTabComponent unloaded');
    this._userSubscription$.unsubscribe();
  }

  refreshPage(args) {
    const pullRefresh = args.object;
    // Do something here
    pullRefresh.refreshing = false;
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

  private _getFirstDayOfWeek(date) {
    date = new Date(date);
    const day = date.getDay();
    if (day === 0) return date; // Sunday is the first day of the week
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  // If the start fo the week is 0th element in an array of size 7, what is the index of date?
  private _getIndex(date1, date2) {
    // date1 = Week start, date2 = current date
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  private async _loadWeeklyPushtrackerActivity() {
    const didLoad = await this._pushtrackerActivityService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      const index = this._getIndex(this._weekStart, this._today);
      this._pushtrackerActivity = this._pushtrackerActivityService.weeklyActivity.days[
        index
      ];
      if (!this._pushtrackerActivity) {
        // No activity for today
      } else {
        // There's activity for today. Update journey list with coast_time/push_count info
      }
    }
  }

  private async _loadWeeklySmartDriveUsage() {
    const didLoad = await this._smartDriveUsageService.loadWeeklyActivity(
      this._weekStart
    );
    if (didLoad) {
      const index = this._getIndex(this._weekStart, this._today);
      this._smartDriveUsage = this._smartDriveUsageService.weeklyActivity.days[
        index
      ];
      if (!this._smartDriveUsage) {
        // No usage information for today
      } else {
        // There's usage information for today. Update journey list with distance info
      }
    }
  }
}
