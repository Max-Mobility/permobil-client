import { Component, OnInit } from '@angular/core';
import { PushTrackerKinveyKeys } from '@maxmobility/private-keys';
import { ModalDialogParams } from '@nativescript/angular';
import {
  Color,
  EventData,
  isAndroid,
  ObservableArray,
  SegmentedBar,
  SegmentedBarItem
} from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { layout } from '@nativescript/core/utils/utils';
import { TranslateService } from '@ngx-translate/core';
import { Query as KinveyQuery } from 'kinvey-nativescript-sdk';
import { PushTrackerUser } from '@permobil/core';
import { differenceInCalendarDays } from 'date-fns';
import debounce from 'lodash/debounce';
import {
  CalendarFontStyle,
  CalendarMonthViewStyle,
  CellStyle,
  DayCellStyle,
  RadCalendar
} from 'nativescript-ui-calendar';
import {
  APP_THEMES,
  CONFIGURATIONS,
  DISTANCE_UNITS,
  STORAGE_KEYS
} from '../../enums';
import { DeviceBase } from '../../models';
import { ActivityService, SmartDriveUsageService, LoggingService } from '../../services';
import {
  areDatesSame,
  convertToMilesIfUnitPreferenceIsMiles,
  getFirstDayOfWeek,
  YYYY_MM_DD
} from '../../utils';

enum TAB {
  DAY = 0,
  WEEK = 1,
  MONTH = 2
}

enum CHART_Y_AXIS {
  COAST_TIME = 0,
  PUSH_COUNT = 1,
  DISTANCE = 2
}

@Component({
  selector: 'activity',
  moduleId: module.id,
  templateUrl: 'activity.component.html'
})
export class ActivityComponent implements OnInit {
  public APP_THEMES = APP_THEMES;
  public CONFIGURATIONS = CONFIGURATIONS;
  public TAB = TAB;
  public CHART_Y_AXIS = CHART_Y_AXIS;
  user: PushTrackerUser;
  tabItems: SegmentedBarItem[];
  currentTab: TAB = TAB.DAY;

  chartTitle: string;
  chartDescription: string;
  chartYAxis: CHART_Y_AXIS = CHART_Y_AXIS.COAST_TIME; // 0 = Coast Time is plotted, 1 = Push Count is plotted
  CURRENT_THEME: string;

  dailyActivity: ObservableArray<any[]>;

  dayNames: string[] = [
    this._translateService.instant('days.sunday'),
    this._translateService.instant('days.monday'),
    this._translateService.instant('days.tuesday'),
    this._translateService.instant('days.wednesday'),
    this._translateService.instant('days.thursday'),
    this._translateService.instant('days.friday'),
    this._translateService.instant('days.saturday')
  ];

  monthNames: string[] = [
    this._translateService.instant('months.january'),
    this._translateService.instant('months.february'),
    this._translateService.instant('months.march'),
    this._translateService.instant('months.april'),
    this._translateService.instant('months.may'),
    this._translateService.instant('months.june'),
    this._translateService.instant('months.july'),
    this._translateService.instant('months.august'),
    this._translateService.instant('months.september'),
    this._translateService.instant('months.october'),
    this._translateService.instant('months.november'),
    this._translateService.instant('months.december')
  ];
  currentDayInView: Date;
  calendarSelectedDate: Date;
  calendarDisplayedDate: Date;
  // dayChartLabel: string;
  weekStart: Date;
  weekEnd: Date;

  // Month View (Calendar tab)
  minDate: Date;
  maxDate: Date;
  monthViewStyle: CalendarMonthViewStyle;
  dailyActivityAnnotationValue: number = 0.001;
  yAxisMax = 0;
  yAxisStep = 15;

  private _calendar: RadCalendar;
  private _dayViewTimeArray: number[] = [];

  // Member variabes for week view
  weeklyActivity: ObservableArray<any[]>;
  weeklyActivityAnnotationValue: number = 0.001;
  private _weeklyActivityCache = {};
  private _weeklyUsageCache = {};
  enableNextWeekButton = false;

  // Colors
  private _colorWhite = new Color('#fff');
  private _colorBlack = new Color('#000');
  private _colorBlackCss = new Color('#202125');
  private _colorGrey = new Color('#b1b1b1');
  private _colorDarkGrey = new Color('#727377');
  private _colorPermobilCousteau = new Color('#00c1d5');

  private distanceUnit: string;
  private _debouncedLoadDailyActivity: any = null;
  private _debouncedLoadWeeklyActivity: any = null;
  private MAX_COMMIT_INTERVAL_MS: number = 1 * 500;

  public static api_base = PushTrackerKinveyKeys.HOST_URL;
  public static api_app_key = PushTrackerKinveyKeys.DEV_KEY;
  public static api_app_secret = PushTrackerKinveyKeys.DEV_SECRET;
  private _weeklyActivityFromKinvey: any;
  private _dailyActivityFromKinvey: any;
  private _weeklyUsageFromKinvey: any;
  private _dailyUsageFromKinvey: any;

  constructor(
    private _activityService: ActivityService,
    private _usageService: SmartDriveUsageService,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    if (this._params.context.chartYAxis) {
      this.chartYAxis = this._params.context.chartYAxis;
    }
    this.getUser();

    // init the segmented bar items
    this.tabItems = [];
    [
      this._translateService.instant('activity-tab-component.day'),
      this._translateService.instant('activity-tab-component.week'),
      this._translateService.instant('activity-tab-component.month')
    ].forEach(element => {
      const sbi = new SegmentedBarItem();
      sbi.title = element;
      this.tabItems.push(sbi);
    });
    this.currentTab = this._params.context.currentTab;

    if (this._params.context.currentDayInView) {
      this.currentDayInView = new Date(this._params.context.currentDayInView);
    } else {
      this.currentDayInView = new Date();
    }
    this.calendarSelectedDate = new Date(this.currentDayInView);
    this.calendarDisplayedDate = new Date(this.currentDayInView);
    this._updateWeekStartAndEnd();

    // save the debounced loadDailyActivity function
    this._debouncedLoadDailyActivity = debounce(
      this._loadDailyActivity.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true, trailing: true }
    );
    this._debouncedLoadWeeklyActivity = debounce(
      this._loadWeeklyActivity.bind(this),
      this.MAX_COMMIT_INTERVAL_MS,
      { leading: true, trailing: true }
    );

    if (this.currentTab === TAB.DAY) {
      this._loadDailyActivity();
    } else if (this.currentTab === TAB.WEEK) {
      this._loadWeeklyActivity();
    }

    {
      // Initialize time array for day view
      const rangeStart = 0;
      const rangeEnd = 24;
      let rangeIterator = rangeStart;
      while (rangeIterator <= rangeEnd) {
        this._dayViewTimeArray.push(rangeIterator);
        rangeIterator += 0.5;
      }
    }

    this._initMonthViewStyle();
  }

  async refreshPlots(args) {
    const pullRefresh = args.object;

    // actually synchronize with the server
    try {
      await this._activityService.refreshWeekly();
    } catch (err) {
    }
    try {
      await this._usageService.refreshWeekly();
    } catch (err) {
    }

    this.onSelectedIndexChanged({
      object: { selectedIndex: this.currentTab },
      options: { forcePullFromDatabase: true }
    })
      .then(() => {
        pullRefresh.refreshing = false;
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  ngOnInit() {
    this._logService.logBreadCrumb(ActivityComponent.name, 'OnInit');
  }

  getUser() {
    this.user = this._params.context.user;
    this.distanceUnit =
      this.user.data.distance_unit_preference === DISTANCE_UNITS.KILOMETERS
        ? ' ' + this._translateService.instant('units.km')
        : ' ' + this._translateService.instant('units.mi');
  }

  /**
   * Closes the component when opened from the modal service
   */
  closeModal() {
    this._params.closeCallback();
  }

  segmentedBarLoaded(args: EventData) {
    if (isAndroid) {
      // wrapping in try/catch to prevent crashing for something non-critical to app
      try {
        const tabHost = (args.object as SegmentedBar)
          .android as android.widget.TabHost;
        const t = tabHost.getTabWidget();

        for (let i = 0; i < t.getChildCount(); i++) {
          const tv = t
            .getChildAt(i)
            .findViewById(android.R.id.title) as android.widget.TextView;
          tv.setAllCaps(false);
        }
      } catch (error) {
        this._logService.logException(error);
      }
    }
  }

  // displaying the old and new TabView selectedIndex
  async onSelectedIndexChanged(args) {
    const date = this.currentDayInView;
    this.currentTab = args.object.selectedIndex;
    const forcePullFromDatabase =
      (args.options ? args.options.forcePullFromDatabase : false) || false;
    if (this.currentTab === TAB.DAY) {
      this.chartTitle =
        this.dayNames[date.getDay()] +
        ', ' +
        this.monthNames[date.getMonth()] +
        ' ' +
        date.getDate();
      this._initDayChartTitle();
      this._debouncedLoadDailyActivity(forcePullFromDatabase);
    } else if (this.currentTab === TAB.WEEK) {
      this._initWeekChartTitle();
      this._debouncedLoadWeeklyActivity(forcePullFromDatabase);
    } else if (this.currentTab === TAB.MONTH) {
      this._initMonthChartTitle();
    }
  }

  async onPreviousTap() {
    if (this.currentTab === TAB.DAY) {
      // day
      this.currentDayInView.setDate(this.currentDayInView.getDate() - 1);
      this._updateWeekStartAndEnd();
      this._initDayChartTitle();
      this._debouncedLoadDailyActivity();
    } else if (this.currentTab === TAB.WEEK) {
      // week
      this.currentDayInView.setDate(this.currentDayInView.getDate() - 7);
      this.currentDayInView = getFirstDayOfWeek(this.currentDayInView);
      this._updateWeekStartAndEnd();
      this._initWeekChartTitle();
      this._debouncedLoadWeeklyActivity();
    } else if (this.currentTab === TAB.MONTH) {
      // month
      this.currentDayInView.setMonth(this.currentDayInView.getMonth() - 1);
      this._updateWeekStartAndEnd();
      this._calendar.navigateBack();
      this._initMonthChartTitle();
    }
  }

  async onNextTap() {
    if (this.currentTab === TAB.DAY) {
      // day
      if (this.isNextDayButtonEnabled()) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
        this._updateWeekStartAndEnd();
        this._initDayChartTitle();
        this._debouncedLoadDailyActivity();
      }
    } else if (this.currentTab === TAB.WEEK) {
      // week
      if (this.isNextWeekButtonEnabled()) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 7);
        if (this.currentDayInView > new Date())
          this.currentDayInView = new Date();
        this.currentDayInView = getFirstDayOfWeek(this.currentDayInView);
        this._updateWeekStartAndEnd();
        this._initWeekChartTitle();
        this._debouncedLoadWeeklyActivity();
      }
    } else if (this.currentTab === TAB.MONTH) {
      // month
      if (this.isNextMonthButtonEnabled()) {
        this.currentDayInView.setMonth(this.currentDayInView.getMonth() + 1);
        this._updateWeekStartAndEnd();
        this._calendar.navigateForward();
        this._initMonthChartTitle();
      }
    }
  }

  async onCoastTimeTap() {
    this.chartYAxis = CHART_Y_AXIS.COAST_TIME; // set view mode to coast_time

    if (this.currentTab === TAB.DAY) {
      // day
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
      this._debouncedLoadDailyActivity();
    } else if (this.currentTab === TAB.WEEK) {
      // week
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
      this._debouncedLoadWeeklyActivity();
    }
  }

  async onPushCountTap() {
    this.chartYAxis = CHART_Y_AXIS.PUSH_COUNT; // set view mode for push count

    if (this.currentTab === TAB.DAY) {
      // day
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
      this._debouncedLoadDailyActivity();
    } else if (this.currentTab === TAB.WEEK) {
      // week
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
      this._debouncedLoadWeeklyActivity();
    }
  }

  async onDistanceTap() {
    this.chartYAxis = CHART_Y_AXIS.DISTANCE; // set view mode for distance

    if (this.currentTab === TAB.DAY) {
      // day
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
      this._debouncedLoadDailyActivity();
    } else if (this.currentTab === TAB.WEEK) {
      // week
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
      this._debouncedLoadWeeklyActivity();
    }
  }

  async onWeekPointSelected(event) {
    if (
      this.user.data.control_configuration !==
      CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
    ) {
      const selectedDate = new Date(this.weekStart);
      this.currentDayInView = new Date(selectedDate);
      this.currentDayInView.setDate(
        selectedDate.getDate() + event.pointIndex - 1
      );
      this._debouncedLoadDailyActivity();
      this.currentTab = TAB.DAY;
    }
  }

  async onCalendarLoaded(args) {
    this._logService.logBreadCrumb(ActivityComponent.name, 'Calendar Loaded');
    const calendar = args.object as any; // RadCalendar (using any bc the types might be incorrect with 6.2 throwing TSC warnings)
    // Increasing the height of dayNameCells in RadCalendar
    // https://stackoverflow.com/questions/56720589/increasing-the-height-of-daynamecells-in-radcalendar
    if (isAndroid) {
      calendar.android.setDayNamesHeight(layout.toDevicePixels(40));
    } else {
      calendar.ios.presenter.style.dayNameCellHeight = 40;
    }
    this._calendar = calendar;
    const telCalendar = calendar.nativeView; // com.telerik.widget.calendar.RadCalendarView

    if (telCalendar && isAndroid) {
      const gestureManager = telCalendar.getGestureManager(); // com.telerik.widget.calendar.CalendarGestureManager
      gestureManager.setDoubleTapToChangeDisplayMode(false);
      gestureManager.setPinchCloseToChangeDisplayMode(false);
      gestureManager.setPinchOpenToChangeDisplayMode(false);
      gestureManager.setSwipeDownToChangeDisplayMode(false);
      gestureManager.setSwipeUpToChangeDisplayMode(false);
      gestureManager.suspendScroll();
    }
  }

  async onCalendarDateSelected(args) {
    if (this.currentTab !== TAB.MONTH) return;
    if (
      this.user.data.control_configuration ===
      CONFIGURATIONS.PUSHTRACKER_E2_WITH_SMARTDRIVE
    ) {
      const date: Date = args.date;
      if (date <= new Date()) {
        // If selected date is in the past or if it's today, switch to day view
        this.currentDayInView.setMonth(date.getMonth());
        this.currentDayInView.setDate(date.getDate());
        this.currentTab = TAB.DAY;
      }
    } else if (
      this.user.data.control_configuration ===
      CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
    ) {
      const date: Date = args.date;
      if (date <= new Date()) {
        // If selected date is in the past or if it's today, switch to week view
        this.weekStart = getFirstDayOfWeek(date);
        this.weekEnd = new Date(this.weekStart);
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
        this.currentDayInView.setMonth(date.getMonth());
        this.currentDayInView.setDate(date.getDate());
        this.currentTab = TAB.WEEK;
      }
    }
  }

  private async _loadDailyActivity(forcePullFromDatabase: boolean = false) {
    // load weekly activity
    const date = this.currentDayInView;
    this.weekStart = getFirstDayOfWeek(date);
    this.weekEnd = new Date(this.weekStart);
    this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    this.minDate = new Date('01/01/1999');
    this.maxDate = new Date('01/01/2099');
    // Get the weekly summary for the current week
    // Find the dailyactivity for the currentDayInView from the weekly summary
    // Cache and visualize
    this._loadWeeklyActivity(forcePullFromDatabase)
      .then(() => {
        // If the start fo the week is 0th element in an array of size 7, what is the index of date?
        const getIndex = function(date1, date2) {
          // date1 = Week start, date2 = current date
          const index = differenceInCalendarDays(date2, date1);
          return index;
        };

        let weeklyActivity = null;
        if (this.chartYAxis === CHART_Y_AXIS.DISTANCE)
          weeklyActivity = this._weeklyUsageCache[this.weekStart.toUTCString()]
            .weeklyActivity;
        else
          weeklyActivity = this._weeklyActivityCache[
            this.weekStart.toUTCString()
          ].weeklyActivity;

        let days = [null, null, null, null, null, null, null];
        if (weeklyActivity) days = weeklyActivity.days;

        if (days) {
          if (this.chartYAxis === CHART_Y_AXIS.DISTANCE)
            this._dailyUsageFromKinvey =
              days[getIndex(new Date(this.weekStart), this.currentDayInView)];
          else
            this._dailyActivityFromKinvey =
              days[getIndex(new Date(this.weekStart), this.currentDayInView)];
        } else {
          if (this.chartYAxis === CHART_Y_AXIS.DISTANCE)
            this._dailyUsageFromKinvey = {
              distance_smartdrive_drive: 0,
              distance_smartdrive_coast: 0,
              distance_smartdrive_drive_start: 0,
              distance_smartdrive_coast_start: 0
            };
          else
            this._dailyActivityFromKinvey = {
              push_count: 0,
              coast_time_avg: 0
            };
        }

        this._formatActivityForView(0)
          .then(result => {
            this.dailyActivity = new ObservableArray(result);
            if (this.chartYAxis !== CHART_Y_AXIS.DISTANCE) {
              if (this._dailyActivityFromKinvey) {
                // format chart description for chartYAxis
                if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
                  this.chartDescription =
                    (this._dailyActivityFromKinvey.coast_time_avg || 0).toFixed(
                      1
                    ) +
                    ' ' +
                    this._translateService.instant('units.s');
                } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
                  this.chartDescription =
                    (this._dailyActivityFromKinvey.push_count || 0) +
                    ' ' +
                    this._translateService.instant('units.pushes');
                }
              } else {
                // format chart description for chartYAxis
                if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
                  this.chartDescription =
                    (0).toFixed(1) +
                    ' ' +
                    this._translateService.instant('units.s');
                } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
                  this.chartDescription =
                    0 + ' ' + this._translateService.instant('units.pushes');
                }
              }
            } else {
              if (this._dailyUsageFromKinvey) {
                this.chartDescription =
                  (
                    convertToMilesIfUnitPreferenceIsMiles(
                      DeviceBase.caseTicksToKilometers(
                        this._dailyUsageFromKinvey.distance_smartdrive_coast -
                        this._dailyUsageFromKinvey
                          .distance_smartdrive_coast_start
                      ),
                      this.user.data.distance_unit_preference
                    ) || 0
                  ).toFixed(1) + this.distanceUnit;
              } else {
                this.chartDescription = '0 ' + this.distanceUnit;
              }
            }

            this._initDayChartTitle();
            this._updateDailyActivityAnnotationValue();
            this._calculateDailyActivityYAxisMax();
            this._updateWeekStartAndEnd();
          })
          .catch(err => {
            this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to format activity for view when loading daily activity');
            // this._logService.logException(err);
          });
      })
      .catch(err => {
        this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to load daily activity');
        // this._logService.logException(err);
      });
  }

  private _calculateDailyActivityYAxisMax() {
    this.yAxisMax = 0;
    this.yAxisStep = 15;
    if (this.dailyActivity) {
      let i = 0;
      while (i < this.dailyActivity.length) {
        const activity = this.dailyActivity.getItem(i);
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          if (activity['coastTime'] > this.yAxisMax)
            this.yAxisMax = activity['coastTime'];
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          if (activity['pushCount'] > this.yAxisMax)
            this.yAxisMax = activity['pushCount'];
        } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
          if (activity['coastDistance'] > this.yAxisMax)
            this.yAxisMax = activity['coastDistance'];
        }
        i++;
      }
    }
    this.yAxisMax = this.yAxisMax + 0.1 * this.yAxisMax;
    if (this.yAxisMax > 1.0) this.yAxisMax = Math.ceil(this.yAxisMax / 5) * 5;
    // round to the nearest multiple of 5
    else if (this.yAxisMax === 0) this.yAxisMax = 1.0;
    else if (this.yAxisMax <= 1.0) this.yAxisMax = 1.0;
    this.yAxisStep = this.yAxisMax / 5.0;
  }

  async loadWeeklyActivityFromKinvey(weekStartDate: Date) {
    this._logService.logBreadCrumb(
      ActivityComponent.name,
      'Loading weekly activity from Kinvey'
    );

    let result = [];
    if (!this.user) return result;

    const date = YYYY_MM_DD(weekStartDate);

    const query = new KinveyQuery();
    query.equalTo('date', date);
    query.descending('_kmd.lmt');
    query.limit = 1;
    return this._activityService.getWeeklyActivityWithQuery(query)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._weeklyActivityFromKinvey = result; // cache
          this._logService.logBreadCrumb(
            ActivityComponent.name,
            'loadWeeklyActivityFromKinvey | Loaded weekly usage'
          );
          return Promise.resolve(result);
        }
        this._logService.logBreadCrumb(
          ActivityComponent.name,
          'loadWeeklyActivityFromKinvey | No data for this week yet'
        );
        this._weeklyActivityFromKinvey = [];
        return Promise.resolve(this._weeklyActivityFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to load weekly activity');
        // this._logService.logException(err);
        return Promise.reject([]);
      });
  }

  async loadSmartDriveUsageFromKinvey(weekStartDate: Date) {
    this._logService.logBreadCrumb(
      ActivityComponent.name,
      'Loading weekly usage from Kinvey'
    );
    let result = [];
    if (!this.user) return result;

    const date = YYYY_MM_DD(weekStartDate);

    const query = new KinveyQuery();
    query.equalTo('date', date);
    query.descending('_kmd.lmt');
    query.limit = 1;
    return this._usageService.getWeeklyActivityWithQuery(query)
      .then(data => {
        if (data && data.length) {
          result = data[0];
          this._weeklyUsageFromKinvey = result; // cache
          this._logService.logBreadCrumb(
            ActivityComponent.name,
            'loadSmartDriveUsageFromKinvey | Loaded weekly usage'
          );
          return Promise.resolve(result);
        }
        this._logService.logBreadCrumb(
          ActivityComponent.name,
          'loadSmartDriveUsageFromKinvey | No data for this week yet'
        );
        this._weeklyUsageFromKinvey = [];
        return Promise.resolve(this._weeklyUsageFromKinvey);
      })
      .catch(err => {
        this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to load weekly smartdrive usage');
        // this._logService.logException(err);
        return Promise.reject([]);
      });
  }

  private async _loadWeeklyActivity(forcePullFromDatabase: boolean = false) {
    // Check if data is available in daily activity cache first
    const cacheAvailable =
      (this.chartYAxis === CHART_Y_AXIS.DISTANCE &&
        this.weekStart.toUTCString() in this._weeklyUsageCache) ||
      ((this.chartYAxis === CHART_Y_AXIS.COAST_TIME ||
        this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) &&
        this.weekStart.toUTCString() in this._weeklyActivityCache);
    if (!cacheAvailable || forcePullFromDatabase) {
      if (this.chartYAxis === CHART_Y_AXIS.DISTANCE)
        return this.loadSmartDriveUsageFromKinvey(this.weekStart)
          .then(_ => {
            return this._formatActivityForView(1)
              .then(result => {
                this.weeklyActivity = new ObservableArray(result);
                if (this.currentTab === TAB.WEEK) {
                  this._initWeekChartTitle();
                  this.weekStart = new Date(this._weeklyUsageFromKinvey.date);
                  this.weekEnd = new Date(this.weekStart);
                  this.weekEnd.setDate(this.weekEnd.getDate() + 6);
                  this.minDate = new Date('01/01/1999');
                  this.maxDate = new Date('01/01/2099');
                }
                this._weeklyUsageCache[this.weekStart.toUTCString()] = {
                  chartData: this.weeklyActivity,
                  weeklyActivity: this._weeklyUsageFromKinvey
                };
                this._updateWeeklyActivityAnnotationValue();
                if (this.currentTab === TAB.WEEK)
                  this._calculateWeeklyActivityYAxisMax();
                this._updateWeekStartAndEnd();
                return true;
              })
              .catch(err => {
                this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to format weekly activity for view');
                // this._logService.logException(err);
                return false;
              });
          })
          .catch(err => {
            this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to load smartdrive usage from kinvey');
            // this._logService.logException(err);
            return false;
          });
      else
        return this.loadWeeklyActivityFromKinvey(this.weekStart)
          .then(_ => {
            return this._formatActivityForView(1)
              .then(async result => {
                this.weeklyActivity = new ObservableArray(result);
                if (this.currentTab === TAB.WEEK) {
                  this._initWeekChartTitle();
                  this.weekStart = new Date(
                    this._weeklyActivityFromKinvey.date
                  );
                  this.weekEnd = new Date(this.weekStart);
                  this.weekEnd.setDate(this.weekEnd.getDate() + 6);
                  this.minDate = new Date('01/01/1999');
                  this.maxDate = new Date('01/01/2099');
                }
                this._weeklyActivityCache[this.weekStart.toUTCString()] = {
                  chartData: this.weeklyActivity,
                  weeklyActivity: this._weeklyActivityFromKinvey
                };
                this._updateWeeklyActivityAnnotationValue();
                if (this.currentTab === TAB.WEEK)
                  this._calculateWeeklyActivityYAxisMax();
                this._updateWeekStartAndEnd();
                return true;
              })
              .catch(err => {
                this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to format weekly activity');
                // this._logService.logException(err);
                return false;
              });
          })
          .catch(err => {
            this._logService.logBreadCrumb(ActivityComponent.name, 'Failed to load weekly activity from kinvey');
            // this._logService.logException(err);
            return false;
          });
    } else {
      // We have the data cached. Pull it up
      this._logService.logBreadCrumb(
        ActivityComponent.name,
        'Using local cache instead of pulling from database'
      );
      let cache = null;
      if (this.chartYAxis === CHART_Y_AXIS.DISTANCE)
        cache = this._weeklyUsageCache[this.weekStart.toUTCString()];
      else cache = this._weeklyActivityCache[this.weekStart.toUTCString()];

      this.weeklyActivity = cache.chartData;

      if (this.currentTab === TAB.WEEK) {
        // format the chart description label based on chartYAxis
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          this.chartDescription =
            (cache.weeklyActivity.coast_time_avg || 0).toFixed(1) +
            ' ' +
            this._translateService.instant('units.s');
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          this.chartDescription =
            (cache.weeklyActivity.push_count || 0) +
            ' ' +
            this._translateService.instant('units.pushes');
        } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
          this.chartDescription =
            (
              convertToMilesIfUnitPreferenceIsMiles(
                DeviceBase.caseTicksToKilometers(
                  cache.weeklyActivity.distance_smartdrive_coast -
                  cache.weeklyActivity.distance_smartdrive_coast_start
                ),
                this.user.data.distance_unit_preference
              ) || 0
            ).toFixed(1) + this.distanceUnit;
        }

        this._initWeekChartTitle();
        this.weekStart = new Date(cache.weeklyActivity.date);
        this.weekEnd = new Date(this.weekStart);
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
        this.minDate = new Date('01/01/1999');
        this.maxDate = new Date('01/01/2099');
        this._updateWeeklyActivityAnnotationValue();
      }
    }
    if (this.currentTab === TAB.WEEK) this._calculateWeeklyActivityYAxisMax();
    this._updateWeekStartAndEnd();
  }

  private _calculateWeeklyActivityYAxisMax() {
    this.yAxisMax = 0;
    this.yAxisStep = 0;
    if (this.weeklyActivity) {
      let i = 0;
      while (i < this.weeklyActivity.length) {
        const activity = this.weeklyActivity.getItem(i);
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          if (activity['coastTime'] > this.yAxisMax)
            this.yAxisMax = activity['coastTime'];
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          if (activity['pushCount'] > this.yAxisMax)
            this.yAxisMax = activity['pushCount'];
        } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
          if (activity['coastDistance'] > this.yAxisMax)
            this.yAxisMax = activity['coastDistance'];
        }
        i++;
      }
    }
    this.yAxisMax = this.yAxisMax + 0.1 * this.yAxisMax;
    if (this.yAxisMax > 1.0) this.yAxisMax = Math.ceil(this.yAxisMax / 5) * 5;
    // round to the nearest multiple of 5
    else if (this.yAxisMax === 0) this.yAxisMax = 1.0;
    else if (this.yAxisMax <= 1.0) this.yAxisMax = 1.0;
    this.yAxisStep = this.yAxisMax / 5;
  }

  private async _formatActivityForView(index: number) {
    if (index === 0) {
      const activity =
        this.chartYAxis === CHART_Y_AXIS.DISTANCE
          ? this._dailyUsageFromKinvey
          : this._dailyActivityFromKinvey;

      if (activity && activity.records) {
        // format the chart description based on chartYAxis
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          this.chartDescription =
            (activity.coast_time_avg || 0).toFixed(1) +
            ' ' +
            this._translateService.instant('units.s');
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          this.chartDescription =
            (activity.push_count || 0) +
            ' ' +
            this._translateService.instant('units.pushes');
        } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
          this.chartDescription =
            (
              convertToMilesIfUnitPreferenceIsMiles(
                DeviceBase.caseTicksToKilometers(
                  activity.distance_smartdrive_coast -
                  activity.distance_smartdrive_coast_start
                ),
                this.user.data.distance_unit_preference
              ) || 0
            ).toFixed(1) + this.distanceUnit;
        }

        const result = [];
        const records = activity.records;

        let j = 0;
        for (const i in this._dayViewTimeArray) {
          const timePoint = this._dayViewTimeArray[i];
          if (records && j < records.length) {
            while (j < records.length) {
              const record = records[j];
              const start_time = record.start_time;
              const date = new Date(0); // The 0 there is the key, which sets the date to the epoch
              date.setUTCMilliseconds(start_time);
              const recordHour = date.getHours();
              const recordMinutes = date.getMinutes();
              let recordTimePoint = recordHour;
              if (recordMinutes !== 0) {
                recordTimePoint += 0.5;
              }
              if (timePoint === recordTimePoint) {
                let coastDistanceStart = 0;
                let driveDistanceStart = 0;
                if (j === 0) {
                  coastDistanceStart = activity.distance_smartdrive_coast_start;
                  driveDistanceStart = activity.distance_smartdrive_drive_start;
                } else {
                  coastDistanceStart = records[j - 1].distance_smartdrive_coast;
                  driveDistanceStart = records[j - 1].distance_smartdrive_drive;
                }

                // Check if coast distance is negative
                // https://github.com/Max-Mobility/permobil-client/issues/266
                // Distance records in DB show as zero - leading to negative distance
                let coastDistance = convertToMilesIfUnitPreferenceIsMiles(
                  DeviceBase.caseTicksToKilometers(
                    record.distance_smartdrive_coast - coastDistanceStart
                  ),
                  this.user.data.distance_unit_preference
                );
                if (coastDistance < 0.0) coastDistance = 0.0;

                let driveDistance = convertToMilesIfUnitPreferenceIsMiles(
                  DeviceBase.motorTicksToKilometers(
                    record.distance_smartdrive_drive - driveDistanceStart
                  ),
                  this.user.data.distance_unit_preference
                );
                if (driveDistance < 0.0) driveDistance = 0.0;

                result.push({
                  xAxis: timePoint,
                  coastTime: record.coast_time_avg || 0,
                  pushCount: record.push_count || 0,
                  driveDistance: driveDistance || 0,
                  coastDistance: coastDistance || 0
                });
                j += 1;
                continue;
              } else {
                result.push({
                  xAxis: timePoint,
                  coastTime: 0,
                  pushCount: 0,
                  driveDistance: 0,
                  coastDistance: 0
                });
                break;
              }
            }
          } else {
            result.push({
              xAxis: timePoint,
              coastTime: 0,
              pushCount: 0,
              driveDistance: 0,
              coastDistance: 0
            });
          }
        }
        result.unshift({
          xAxis: ' ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.unshift({
          xAxis: '  ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.unshift({
          xAxis: '   ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.unshift({
          xAxis: '    ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '     ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '      ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '       ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '        ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        return result;
      } else {
        const result = [];
        for (const i in this._dayViewTimeArray) {
          const timePoint = this._dayViewTimeArray[i];
          result.push({
            xAxis: timePoint,
            coastTime: 0,
            pushCount: 0,
            driveDistance: 0,
            coastDistance: 0
          });
        }
        result.unshift({
          xAxis: ' ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.unshift({
          xAxis: '  ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.unshift({
          xAxis: '   ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.unshift({
          xAxis: '    ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '     ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '      ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '       ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '        ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        return result;
      }
    } else if (index === 1) {
      const activity =
        this.chartYAxis === CHART_Y_AXIS.DISTANCE
          ? this._weeklyUsageFromKinvey
          : this._weeklyActivityFromKinvey;

      // format chart description
      if (activity) {
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          this.chartDescription =
            (activity.coast_time_avg || 0).toFixed(1) +
            ' ' +
            this._translateService.instant('units.s');
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          this.chartDescription =
            (activity.push_count || 0) +
            ' ' +
            this._translateService.instant('units.pushes');
        } else {
          this.chartDescription =
            (
              convertToMilesIfUnitPreferenceIsMiles(
                DeviceBase.caseTicksToKilometers(
                  activity.distance_smartdrive_coast -
                  activity.distance_smartdrive_coast_start
                ),
                this.user.data.distance_unit_preference
              ) || 0
            ).toFixed(1) + this.distanceUnit;
        }
      } else {
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          this.chartDescription =
            '0' + ' ' + this._translateService.instant('units.s');
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          this.chartDescription =
            '0' + ' ' + this._translateService.instant('units.pushes');
        } else {
          this.chartDescription = '0.0' + this.distanceUnit;
        }
      }

      if (activity && activity.days) {
        const result = [];
        const date = new Date(activity.date);
        const weekViewDayArray = [];
        const currentDay = date;
        let i = 0;
        while (i < 7) {
          weekViewDayArray.push(new Date(currentDay));
          currentDay.setDate(currentDay.getDate() + 1);
          i = i + 1;
        }
        const days = activity.days;
        const dayNames: string[] = [
          this._translateService.instant('days-abbreviated.sunday'),
          this._translateService.instant('days-abbreviated.monday'),
          this._translateService.instant('days-abbreviated.tuesday'),
          this._translateService.instant('days-abbreviated.wednesday'),
          this._translateService.instant('days-abbreviated.thursday'),
          this._translateService.instant('days-abbreviated.friday'),
          this._translateService.instant('days-abbreviated.saturday')
        ];
        for (const i in weekViewDayArray) {
          const dayInWeek = weekViewDayArray[i];
          const dailyActivity = days[i];
          if (dailyActivity) {
            // We have daily activity for this day

            // Check if coast distance is negative
            // https://github.com/Max-Mobility/permobil-client/issues/426
            // Smartdrive changed during the week - so the distance
            // reported can go negative
            let driveDistance =
              convertToMilesIfUnitPreferenceIsMiles(
                DeviceBase.motorTicksToKilometers(
                  dailyActivity.distance_smartdrive_drive -
                  dailyActivity.distance_smartdrive_drive_start
                ),
                this.user.data.distance_unit_preference
              ) || 0;
            if (driveDistance < 0.0) driveDistance = 0.0;
            let coastDistance =
              convertToMilesIfUnitPreferenceIsMiles(
                DeviceBase.caseTicksToKilometers(
                  dailyActivity.distance_smartdrive_coast -
                  dailyActivity.distance_smartdrive_coast_start
                ),
                this.user.data.distance_unit_preference
              ) || 0;
            if (coastDistance < 0.0) coastDistance = 0.0;
            // now push the data
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastTime: dailyActivity.coast_time_avg || 0,
              pushCount: dailyActivity.push_count || 0,
              driveDistance: driveDistance,
              coastDistance: coastDistance,
              date: dayInWeek
            });
          } else {
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastTime: 0,
              pushCount: 0,
              driveDistance: 0,
              coastDistance: 0,
              date: dayInWeek
            });
          }
        }
        result.unshift({
          xAxis: '    ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '     ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        return result;
      } else {
        const result = [];
        const dayNames: string[] = [
          this._translateService.instant('days-abbreviated.sunday'),
          this._translateService.instant('days-abbreviated.monday'),
          this._translateService.instant('days-abbreviated.tuesday'),
          this._translateService.instant('days-abbreviated.wednesday'),
          this._translateService.instant('days-abbreviated.thursday'),
          this._translateService.instant('days-abbreviated.friday'),
          this._translateService.instant('days-abbreviated.saturday')
        ];
        for (const i in dayNames) {
          result.push({
            xAxis: dayNames[parseInt(i)],
            coastTime: 0,
            pushCount: 0,
            driveDistance: 0,
            coastDistance: 0
          });
        }
        result.unshift({
          xAxis: '    ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        result.push({
          xAxis: '     ',
          coastTime: 0,
          pushCount: 0,
          driveDistance: 0,
          coastDistance: 0
        });
        return result;
      }
    }
  }

  private _isCurrentDayInViewToday() {
    const today = new Date();
    return (
      this.currentDayInView.getDate() === today.getDate() &&
      this.currentDayInView.getMonth() === today.getMonth() &&
      this.currentDayInView.getFullYear() === today.getFullYear()
    );
  }

  isNextDayButtonEnabled() {
    return !this._isCurrentDayInViewToday();
  }

  private _isCurrentDayInViewThisWeek() {
    const today = new Date();
    const thisWeek = getFirstDayOfWeek(today);
    return areDatesSame(thisWeek, this.weekStart);
  }

  isNextWeekButtonEnabled() {
    return !this._isCurrentDayInViewThisWeek();
  }

  isNextMonthButtonEnabled() {
    const today = new Date();
    const month = today.getMonth();
    const currentWeekStart = getFirstDayOfWeek(this.currentDayInView);
    const currentMonth = currentWeekStart.getMonth();
    return (
      currentWeekStart.getFullYear() < today.getFullYear() ||
      (currentWeekStart.getFullYear() === today.getFullYear() &&
        currentMonth < month)
    );
  }

  private async _initDayChartTitle() {
    const date = this.currentDayInView;
    this.chartTitle =
      this.dayNames[date.getDay()] +
      ', ' +
      this.monthNames[date.getMonth()] +
      ' ' +
      date.getDate();
  }

  private async _initWeekChartTitle() {
    const date = this.currentDayInView;
    this.weekStart = getFirstDayOfWeek(date);
    this.weekEnd = getFirstDayOfWeek(date);
    this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    const weekStartMonth = this.weekStart.getMonth();
    const weekEndMonth = this.weekEnd.getMonth();
    this.chartTitle =
      this.monthNames[weekStartMonth] +
      ' ' +
      this.weekStart.getDate() +
      ' — ' +
      (weekStartMonth !== weekEndMonth
        ? this.monthNames[weekEndMonth] + ' '
        : '') +
      this.weekEnd.getDate();
  }

  private _updateWeekStartAndEnd() {
    const date = this.currentDayInView;
    this.weekStart = getFirstDayOfWeek(date);
    this.weekEnd = getFirstDayOfWeek(date);
    this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    this.enableNextWeekButton = !this._isCurrentDayInViewThisWeek();
  }

  private async _initMonthViewStyle() {
    const pageColor =
      this.CURRENT_THEME === APP_THEMES.DARK
        ? this._colorBlackCss
        : this._colorWhite;
    const textColor =
      this.CURRENT_THEME === APP_THEMES.DARK
        ? this._colorWhite
        : this._colorBlack;

    this.monthViewStyle = new CalendarMonthViewStyle();
    this.monthViewStyle.showTitle = false;
    this.monthViewStyle.showWeekNumbers = false;
    this.monthViewStyle.showDayNames = true;
    this.monthViewStyle.backgroundColor = pageColor;

    // Today cell style
    const todayCellStyle = new DayCellStyle();
    // make the border / text blue to make it easy to find today
    todayCellStyle.cellBorderColor = this._colorPermobilCousteau;
    // todayCellStyle.cellTextSize = 18;
    todayCellStyle.cellTextColor = this._colorPermobilCousteau;
    this.monthViewStyle.todayCellStyle = todayCellStyle;

    // Day cell style
    const dayCellStyle = new DayCellStyle();
    dayCellStyle.cellBackgroundColor = pageColor;
    dayCellStyle.cellBorderColor = pageColor;
    dayCellStyle.cellTextColor = textColor;
    this.monthViewStyle.dayCellStyle = dayCellStyle;

    // Weekend cell style
    const weekendCellStyle = new DayCellStyle();
    weekendCellStyle.cellBorderColor = pageColor;
    this.monthViewStyle.weekendCellStyle = weekendCellStyle;

    // Selected cell style
    const selectedDayCellStyle = new DayCellStyle();
    selectedDayCellStyle.cellTextSize = 20;
    selectedDayCellStyle.cellBackgroundColor = pageColor;
    // selectedDayCellStyle.cellBorderColor = pageColor;
    selectedDayCellStyle.cellTextColor = this._colorPermobilCousteau;
    selectedDayCellStyle.cellTextFontStyle = CalendarFontStyle.Bold;
    this.monthViewStyle.selectedDayCellStyle = selectedDayCellStyle;

    // Week number cell style
    const weekNumberCellStyle = new CellStyle();
    weekNumberCellStyle.cellTextColor = textColor;
    weekNumberCellStyle.cellBorderColor = this._colorWhite;
    this.monthViewStyle.weekNumberCellStyle = weekNumberCellStyle;

    // Day name cell style
    const dayNameCellStyle = new CellStyle();
    dayNameCellStyle.cellBackgroundColor = pageColor;
    dayNameCellStyle.cellBorderColor = pageColor;
    dayNameCellStyle.cellTextColor = textColor;
    this.monthViewStyle.dayNameCellStyle = dayNameCellStyle;
  }

  private async _initMonthChartTitle() {
    const date = this.currentDayInView;
    this.chartTitle =
      this.monthNames[date.getMonth()] + ' ' + date.getFullYear();
  }

  private async _updateDayChartLabel() {
    let activity;
    if (this.chartYAxis !== CHART_Y_AXIS.DISTANCE) {
      activity = this._dailyActivityFromKinvey;
    } else {
      activity = this._dailyUsageFromKinvey;
    }

    if (activity) {
      // format chart description for chartYAxis
      if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) +
          ' ' +
          this._translateService.instant('units.s');
      } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
        this.chartDescription =
          (activity.push_count || 0) +
          ' ' +
          this._translateService.instant('units.pushes');
      } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
        this.chartDescription =
          (
            convertToMilesIfUnitPreferenceIsMiles(
              DeviceBase.caseTicksToKilometers(
                activity.distance_smartdrive_coast -
                activity.distance_smartdrive_coast_start
              ),
              this.user.data.distance_unit_preference
            ) || 0
          ).toFixed(1) + this.distanceUnit;
      }
    } else {
      // format chart description for chartYAxis
      if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
        this.chartDescription =
          (0).toFixed(1) + ' ' + this._translateService.instant('units.s');
      } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
        this.chartDescription =
          0 + ' ' + this._translateService.instant('units.pushes');
      } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
        this.chartDescription = (0).toFixed(1) + this.distanceUnit;
      }
    }
  }

  private async _updateDailyActivityAnnotationValue() {
    let activity;
    if (this.chartYAxis !== CHART_Y_AXIS.DISTANCE) {
      activity = this._dailyActivityFromKinvey;
    } else {
      activity = this._dailyUsageFromKinvey;
    }
    if (activity) {
      if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
        // coast time
        this.dailyActivityAnnotationValue = activity.coast_time_avg || 0;
      } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
        // push count
        const records = activity.records || [];
        let pushCountTotal = 0;
        for (const i in records) {
          const record = records[i];
          pushCountTotal += record.push_count;
        }
        this.dailyActivityAnnotationValue =
          parseInt((pushCountTotal / records.length).toFixed(1)) || 0;
      } else if (this.chartYAxis === CHART_Y_AXIS.DISTANCE) {
        this.dailyActivityAnnotationValue =
          convertToMilesIfUnitPreferenceIsMiles(
            DeviceBase.caseTicksToKilometers(
              activity.distance_smartdrive_coast -
              activity.distance_smartdrive_coast_start
            ),
            this.user.data.distance_unit_preference
          ) || 0;
        if (activity.records && activity.records.length)
          this.dailyActivityAnnotationValue /= activity.records.length;
      }
    } else this.dailyActivityAnnotationValue = 0;
  }

  private async _updateWeekChartLabel() {
    if (this.chartYAxis !== CHART_Y_AXIS.DISTANCE) {
      if (!(this.weekStart.toUTCString() in this._weeklyActivityCache)) {
        // No cache
        const activity = this._weeklyActivityFromKinvey;

        // format chart description for chartYAxis
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          this.chartDescription =
            (activity.coast_time_avg || 0).toFixed(1) +
            ' ' +
            this._translateService.instant('units.s');
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          this.chartDescription =
            (activity.push_count || 0) +
            ' ' +
            this._translateService.instant('units.pushes');
        }
      } else {
        // We are showing cached data
        const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
        this.weeklyActivity = cache.chartData;

        // format chart description for chartYAxis
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          this.chartDescription =
            (cache.weeklyActivity.coast_time_avg || 0).toFixed(1) +
            ' ' +
            this._translateService.instant('units.s');
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          this.chartDescription =
            (cache.weeklyActivity.push_count || 0) +
            ' ' +
            this._translateService.instant('units.pushes');
        }
      }
    } else {
      if (!(this.weekStart.toUTCString() in this._weeklyUsageCache)) {
        const activity = this._weeklyUsageFromKinvey;
        if (
          activity &&
          activity.distance_smartdrive_coast &&
          activity.distance_smartdrive_coast_start
        ) {
          this.chartDescription =
            (
              convertToMilesIfUnitPreferenceIsMiles(
                DeviceBase.caseTicksToKilometers(
                  activity.distance_smartdrive_coast -
                  activity.distance_smartdrive_coast_start
                ),
                this.user.data.distance_unit_preference
              ) || 0
            ).toFixed(1) + this.distanceUnit;
        } else {
          this.chartDescription = '0.0' + this.distanceUnit;
        }
      } else {
        // We are showing cached data
        const cache = this._weeklyUsageCache[this.weekStart.toUTCString()];
        this.weeklyActivity = cache.chartData;
        this.chartDescription =
          (
            convertToMilesIfUnitPreferenceIsMiles(
              DeviceBase.caseTicksToKilometers(
                cache.weeklyActivity.distance_smartdrive_coast -
                cache.weeklyActivity.distance_smartdrive_coast_start
              ),
              this.user.data.distance_unit_preference
            ) || 0
          ).toFixed(1) + this.distanceUnit;
      }
    }
  }

  private async _updateWeeklyActivityAnnotationValue() {
    if (this.chartYAxis !== CHART_Y_AXIS.DISTANCE) {
      if (!(this.weekStart.toUTCString() in this._weeklyActivityCache)) {
        // No cache
        const activity = this._weeklyActivityFromKinvey;
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          // coast time
          this.weeklyActivityAnnotationValue = activity
            ? activity.coast_time_avg || 0
            : 0;
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          // push count
          let numDaysOfActivity = 0;
          if (activity && activity.days) {
            for (const i in activity.days) {
              if (activity.days[i]) {
                if (activity.days[i].push_count > 0) {
                  // At least one push on this day. Include it
                  numDaysOfActivity += 1;
                }
              }
            }
          }
          if (numDaysOfActivity === 0) numDaysOfActivity = 1;
          this.weeklyActivityAnnotationValue =
            parseInt((activity.push_count / numDaysOfActivity).toFixed(1)) || 0;
        }
      } else {
        // We are showing cached data
        const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
        if (this.chartYAxis === CHART_Y_AXIS.COAST_TIME) {
          // coast time
          this.weeklyActivityAnnotationValue = cache
            ? cache.weeklyActivity.coast_time_avg || 0
            : 0;
        } else if (this.chartYAxis === CHART_Y_AXIS.PUSH_COUNT) {
          // push count
          let numDaysOfActivity = 0;
          if (cache.weeklyActivity && cache.weeklyActivity.days) {
            for (const i in cache.weeklyActivity.days) {
              if (cache.weeklyActivity.days[i]) {
                if (cache.weeklyActivity.days[i].push_count > 0) {
                  // At least one push on this day. Include it
                  numDaysOfActivity += 1;
                }
              }
            }
          }
          if (numDaysOfActivity === 0) numDaysOfActivity = 1;
          this.weeklyActivityAnnotationValue =
            parseInt(
              (cache.weeklyActivity.push_count / numDaysOfActivity).toFixed(1)
            ) || 0;
        }
      }
    } else {
      if (!(this.weekStart.toUTCString() in this._weeklyUsageCache)) {
        const activity = this._weeklyUsageFromKinvey;
        if (
          activity &&
          activity.distance_smartdrive_coast &&
          activity.distance_smartdrive_coast_start
        ) {
          this.weeklyActivityAnnotationValue =
            convertToMilesIfUnitPreferenceIsMiles(
              DeviceBase.caseTicksToKilometers(
                activity.distance_smartdrive_coast -
                activity.distance_smartdrive_coast_start
              ),
              this.user.data.distance_unit_preference
            ) || 0;
        } else {
          this.weeklyActivityAnnotationValue = 0;
        }
        let numDaysOfActivity = 0;
        if (activity && activity.days) {
          for (const i in activity.days) {
            if (activity.days[i]) {
              if (activity.days[i].records && activity.days[i].records.length) {
                // There at least one record for this day. Include it.
                numDaysOfActivity += 1;
              }
            }
          }
        }
        if (numDaysOfActivity === 0) numDaysOfActivity = 1;
        this.weeklyActivityAnnotationValue /= numDaysOfActivity;
      } else {
        // We are showing cached data
        const cache = this._weeklyUsageCache[this.weekStart.toUTCString()];
        this.weeklyActivity = cache.chartData;
        this.weeklyActivityAnnotationValue =
          convertToMilesIfUnitPreferenceIsMiles(
            DeviceBase.caseTicksToKilometers(
              cache.weeklyActivity.distance_smartdrive_coast -
              cache.weeklyActivity.distance_smartdrive_coast_start
            ),
            this.user.data.distance_unit_preference
          ) || 0;
        let numDaysOfActivity = 0;
        if (cache.weeklyActivity && cache.weeklyActivity.days) {
          for (const i in cache.weeklyActivity.days) {
            if (cache.weeklyActivity.days[i]) {
              if (
                cache.weeklyActivity.days[i].records &&
                cache.weeklyActivity.days[i].records.length
              ) {
                // There at least one record for this day. Include it.
                numDaysOfActivity += 1;
              }
            }
          }
        }
        if (numDaysOfActivity === 0) numDaysOfActivity = 1;
        this.weeklyActivityAnnotationValue /= numDaysOfActivity;
      }
    }
  }
}
