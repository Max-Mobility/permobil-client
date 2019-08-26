import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { CalendarMonthViewStyle, CellStyle, DayCellStyle, RadCalendar } from 'nativescript-ui-calendar';
import * as appSettings from 'tns-core-modules/application-settings';
import { Color } from 'tns-core-modules/color';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { isAndroid } from 'tns-core-modules/platform';
import { Button } from 'tns-core-modules/ui/button';
import { SegmentedBarItem } from 'tns-core-modules/ui/segmented-bar';
import { layout } from 'tns-core-modules/utils/utils';
import { APP_THEMES, STORAGE_KEYS } from '~/app/enums';
import { ActivityService, LoggingService, PushTrackerUserService } from '../../services';
import { SmartDriveUsageService } from '~/app/services/smartdrive-usage.service';
import { PushTrackerUser } from '@permobil/core/src';

@Component({
  selector: 'activity-tab',
  moduleId: module.id,
  templateUrl: 'activity-tab.component.html'
})
export class ActivityTabComponent implements OnInit {
  user: PushTrackerUser;
  tabItems: SegmentedBarItem[];
  tabSelectedIndex: number;

  chartTitle: string;
  chartDescription: string;
  viewMode: ViewMode = ViewMode.COAST_TIME; // 0 = Coast Time is plotted, 1 = Push Count is plotted
  savedTheme: string;

  dailyActivity: ObservableArray<any[]>;

  dayNames: string[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  monthNames: string[] = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  currentDayInView: Date;
  // dayChartLabel: string;
  weekStart: Date;
  weekEnd: Date;

  // Month View (Calendar tab)
  minDate: Date;
  maxDate: Date;
  monthViewStyle: CalendarMonthViewStyle;
  dailyActivityAnnotationValue: number = 0;
  yAxisMax = 0;
  yAxisStep = 15;

  private _calendar: RadCalendar;
  private _dayViewTimeArray: number[] = [];
  private _dailyActivityCache = {}; // cache for coast time and push count

  // Member variabes for week view
  weeklyActivity: ObservableArray<any[]>;
  weeklyActivityAnnotationValue: number = 0;
  private _weeklyActivityCache = {};
  private _weeklyUsageCache = {};

  // Colors
  private _colorWhite = new Color('#fff');
  private _colorBlack = new Color('#000');
  private _colorDarkGrey = new Color('#727377');

  constructor(
    private _logService: LoggingService,
    private _activityService: ActivityService,
    private _usageService: SmartDriveUsageService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams,
    private userService: PushTrackerUserService
  ) {
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
    this.tabSelectedIndex = 0; // default to the first tab (Day)

    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    this.currentDayInView = new Date();

    this._loadDailyActivity();

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

  ngOnInit() {
    this._logService.logBreadCrumb('activity-tab.component OnInit');
    this.userService.user.subscribe(user => {
      this.savedTheme = user.data.theme_preference;
    });
  }

  getUser() {
    this.userService.user.subscribe(user => {
      this.user = user;
    });
  }

  /**
   * Closes the component when opened from the modal service
   */
  closeModal() {
    this._params.closeCallback();
  }

  // displaying the old and new TabView selectedIndex
  onSelectedIndexChanged(args) {
    const date = this.currentDayInView;
    this.tabSelectedIndex = args.object.selectedIndex;
    if (this.tabSelectedIndex === 0) {
      this.chartTitle =
        this.dayNames[date.getDay()] +
        ', ' +
        this.monthNames[date.getMonth()] +
        ' ' +
        date.getDate();
      this._initDayChartTitle();
      this._loadDailyActivity();
    } else if (this.tabSelectedIndex === 1) {
      this._initWeekChartTitle();
      this._loadWeeklyActivity();
    } else if (this.tabSelectedIndex === 2) {
      this._initMonthChartTitle();
    }
  }

  onPreviousTap() {
    if (this.tabSelectedIndex === 0) {
      // day
      this.currentDayInView.setDate(this.currentDayInView.getDate() - 1);
      this._updateWeekStartAndEnd();
      this._initDayChartTitle();
      this._loadDailyActivity();
    } else if (this.tabSelectedIndex === 1) {
      // week
      this.currentDayInView.setDate(this.currentDayInView.getDate() - 7);
      this._initWeekChartTitle();
      this._loadWeeklyActivity();
    } else if (this.tabSelectedIndex === 2) {
      // month
      this.currentDayInView.setMonth(this.currentDayInView.getMonth() - 1);
      this._calendar.navigateBack();
      this._initMonthChartTitle();
    }
  }

  onNextTap() {
    if (this.tabSelectedIndex === 0) {
      // day
      if (this.isNextDayButtonEnabled()) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
        this._updateWeekStartAndEnd();
        this._initDayChartTitle();
        this._loadDailyActivity();
      }
    } else if (this.tabSelectedIndex === 1) {
      // week
      if (this.isNextWeekButtonEnabled()) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 7);
        this._initWeekChartTitle();
        this._loadWeeklyActivity();
      }
    } else if (this.tabSelectedIndex === 2) {
      // month
      this.currentDayInView.setMonth(this.currentDayInView.getMonth() + 1);
      this._calendar.navigateForward();
      this._initMonthChartTitle();
    }
  }

  onCoastTimeTap() {
    this.viewMode = ViewMode.COAST_TIME; // set view mode to coast_time

    if (this.tabSelectedIndex === 0) {
      // day
      this._loadDailyActivity();
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
    } else if (this.tabSelectedIndex === 1) {
      // week
      this._loadWeeklyActivity();
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
    }
  }

  onPushCountTap() {
    this.viewMode = ViewMode.PUSH_COUNT; // set view mode for push count

    if (this.tabSelectedIndex === 0) {
      // day
      this._loadDailyActivity();
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
    } else if (this.tabSelectedIndex === 1) {
      // week
      this._loadWeeklyActivity();
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
    }
  }

  onDistanceTap() {
    this.viewMode = ViewMode.DISTANCE; // set view mode for distance

    if (this.tabSelectedIndex === 0) {
      // day
      this._loadDailyActivity();
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
    } else if (this.tabSelectedIndex === 1) {
      // week
      this._loadWeeklyActivity();
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
    }
  }

  onWeekPointSelected(event) {
    const selectedDate = new Date(this.weekStart);
    this.currentDayInView.setDate(
      selectedDate.getDate() + event.pointIndex - 2
    );
    this._loadDailyActivity();
    this.tabSelectedIndex = 0;
  }

  onCalendarLoaded(args) {
    const calendar = args.object as RadCalendar;
    // Increasing the height of dayNameCells in RadCalendar
    // https://stackoverflow.com/questions/56720589/increasing-the-height-of-daynamecells-in-radcalendar
    if (calendar.android) {
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

  onCalendarDateSelected(args) {
    const date: Date = args.date;
    if (date <= new Date()) { // If selected date is in the past or if it's today, switch to day view
      this.currentDayInView.setMonth(date.getMonth());
      this.currentDayInView.setDate(date.getDate());
      this.tabSelectedIndex = 0;
    }
  }

  private async _loadDailyActivity() {
    // load weekly activity
    const date = this.currentDayInView;
    this.weekStart = this._getFirstDayOfWeek(date);
    this.weekEnd = new Date(this.weekStart);
    this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    this.minDate = new Date('01/01/1999');
    this.maxDate = new Date('01/01/2099');
    // Get the weekly summary for the current week
    // Find the dailyactivity for the currentDayInView from the weekly summary
    // Cache and visualize
    this._loadWeeklyActivity().then(() => {
      // If the start fo the week is 0th element in an array of size 7, what is the index of date?
      const getIndex = function (date1, date2) { // date1 = Week start, date2 = current date
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
      };

      let weeklyActivity = null;

      if (this.viewMode === ViewMode.DISTANCE)
        weeklyActivity = this._weeklyUsageCache[this.weekStart.toUTCString()].weeklyActivity;
      else
        weeklyActivity = this._weeklyActivityCache[this.weekStart.toUTCString()].weeklyActivity;

      const days = weeklyActivity.days;

      if (this.viewMode === ViewMode.DISTANCE)
        this._usageService.dailyActivity = days[getIndex(new Date(this.weekStart), this.currentDayInView)];
      else
        this._activityService.dailyActivity = days[getIndex(new Date(this.weekStart), this.currentDayInView)];

      this.dailyActivity = new ObservableArray(this._formatActivityForView(0));

      if (this.viewMode !== ViewMode.DISTANCE) {
        if (this._activityService.dailyActivity) {
          // format chart description for viewMode
          if ((this.viewMode === ViewMode.COAST_TIME)) {
            this.chartDescription = (this._activityService.dailyActivity.coast_time_avg || 0).toFixed(1) + ' s';
          } else if ((this.viewMode === ViewMode.PUSH_COUNT)) {
            this.chartDescription = (this._activityService.dailyActivity.push_count || 0) + ' pushes';
          }
        }
        else {
          // format chart description for viewMode
          if ((this.viewMode === ViewMode.COAST_TIME)) {
            this.chartDescription = (0).toFixed(1) + ' s';
          } else if ((this.viewMode === ViewMode.PUSH_COUNT)) {
            this.chartDescription = (0) + ' pushes';
          }
        }
      }
      else {
        if (this._usageService.dailyActivity) {
          this.chartDescription = '<insert_distance> <insert_unit>';
        }
        else {
          this.chartDescription = '<insert_distance> <insert_unit>';
        }
      }

      this._initDayChartTitle();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
    });
  }

  private _calculateDailyActivityYAxisMax() {
    this.yAxisMax = 0;
    this.yAxisStep = 15;
    if (this.dailyActivity) {
      let i = 4;
      while (i < 53) {
        const activity = this.dailyActivity.getItem(i);
        if (this.viewMode === ViewMode.COAST_TIME) {
          if (activity['coastTime'] > this.yAxisMax)
            this.yAxisMax = activity['coastTime'];
        } else if (this.viewMode === ViewMode.PUSH_COUNT) {
          if (activity['pushCount'] > this.yAxisMax)
            this.yAxisMax = activity['pushCount'];
        } else if (this.viewMode === ViewMode.DISTANCE) {
          if (activity['coastDistance'] > this.yAxisMax)
            this.yAxisMax = activity['coastDistance'];
        }
        i++;
      }
    }
    this.yAxisMax = parseInt((this.yAxisMax + 0.1 * this.yAxisMax).toFixed());
    if (this.yAxisMax === 0) this.yAxisMax = 30;
    if (this.yAxisMax < this.yAxisStep)
      this.yAxisStep = parseInt((this.yAxisMax / 2.0).toFixed());
  }

  private async _loadWeeklyActivity() {
    let didLoad = false;
    // Check if data is available in daily activity cache first
    const cacheAvailable = (this.viewMode === ViewMode.DISTANCE && (this.weekStart.toUTCString() in this._weeklyUsageCache)) ||
      ((this.viewMode === ViewMode.COAST_TIME || this.viewMode === ViewMode.PUSH_COUNT) && (this.weekStart.toUTCString() in this._weeklyActivityCache));
    if (!cacheAvailable) {
      if (this.viewMode === ViewMode.DISTANCE)
        didLoad = await this._usageService.loadWeeklyActivity(this.weekStart);
      else
        didLoad = await this._activityService.loadWeeklyActivity(this.weekStart);
      if (didLoad) {
        this.weeklyActivity = new ObservableArray(
          this._formatActivityForView(1)
        );

        if (this.tabSelectedIndex === 1) {
          this._initWeekChartTitle();
          this.weekStart = new Date(this._activityService.weeklyActivity.date);
          this.weekEnd = new Date(this.weekStart);
          this.weekEnd.setDate(this.weekEnd.getDate() + 6);
          this.minDate = new Date('01/01/1999');
          this.maxDate = new Date('01/01/2099');
        }
      } else {
        this.weeklyActivity = new ObservableArray(
          this._formatActivityForView(1)
        );
      }
      if (this.viewMode === ViewMode.DISTANCE) {
        this._weeklyUsageCache[this.weekStart.toUTCString()] = {
          chartData: this.weeklyActivity,
          weeklyActivity: this._usageService.weeklyActivity
        };
      }
      else {
        this._weeklyActivityCache[this.weekStart.toUTCString()] = {
          chartData: this.weeklyActivity,
          weeklyActivity: this._activityService.weeklyActivity
        };
      }
      this._updateWeeklyActivityAnnotationValue();
    } else {
      // We have the data cached. Pull it up
      didLoad = true;
      let cache = null;
      if (this.viewMode === ViewMode.DISTANCE)
        cache = this._weeklyUsageCache[this.weekStart.toUTCString()];
      else
        cache = this._weeklyActivityCache[this.weekStart.toUTCString()];

      this.weeklyActivity = cache.chartData;

      if (this.tabSelectedIndex === 1) {
        // format the chart description label based on viewMode
        if (this.viewMode === ViewMode.COAST_TIME) {
          this.chartDescription =
            (cache.weeklyActivity.coast_time_avg || 0).toFixed(1) + ' s';
        } else if (this.viewMode === ViewMode.PUSH_COUNT) {
          this.chartDescription =
            (cache.weeklyActivity.push_count || 0) + ' pushes';
        } else if (this.viewMode === ViewMode.DISTANCE) {
          this.chartDescription = '<insert_distance> <insert_unit>';
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
    if (this.tabSelectedIndex === 1)
      this._calculateWeeklyActivityYAxisMax();
  }

  private _calculateWeeklyActivityYAxisMax() {
    this.yAxisMax = 0;
    this.yAxisStep = 0;
    if (this.weeklyActivity) {
      let i = 2;
      while (i < 9) {
        const activity = this.weeklyActivity.getItem(i);
        if (this.viewMode === ViewMode.COAST_TIME) {
          if (activity['coastTime'] > this.yAxisMax)
            this.yAxisMax = activity['coastTime'];
        } else if (this.viewMode === ViewMode.PUSH_COUNT) {
          if (activity['pushCount'] > this.yAxisMax)
            this.yAxisMax = activity['pushCount'];
        } else if (this.viewMode === ViewMode.DISTANCE) {
          // TODO: calculate Y Axis max
        }
        i++;
      }
    }
    this.yAxisMax = parseInt((this.yAxisMax + 0.1 * this.yAxisMax).toFixed());
    if (this.yAxisMax === 0) this.yAxisMax = 12;
    this.yAxisStep = parseInt((this.yAxisMax / 4).toFixed());
  }

  private _formatActivityForView(index: number) {
    if (index === 0) {
      const activity = (this.viewMode === ViewMode.DISTANCE ? this._usageService.dailyActivity : this._activityService.dailyActivity);

      if (activity && activity.records) {

        // format the chart description based on viewMode
        if (this.viewMode === ViewMode.COAST_TIME) {
          this.chartDescription =
            (activity.coast_time_avg || 0).toFixed(1) + ' s';
        } else if (this.viewMode === ViewMode.PUSH_COUNT) {
          this.chartDescription = (activity.push_count || 0) + ' pushes';
        } else if (this.viewMode === ViewMode.DISTANCE) {
          this.chartDescription = '<insert_distance> <insert_unit>';
        }

        const result = [];
        const date = new Date();
        const records = activity.records;

        let j = 0;
        for (const i in this._dayViewTimeArray) {
          const timePoint = this._dayViewTimeArray[i];
          if (records && j < records.length) {
            while (j < records.length) {
              const record = records[j];
              if (this.viewMode === ViewMode.DISTANCE) console.log(record);
              const start_time = record.start_time;
              const date = new Date(0); // The 0 there is the key, which sets the date to the epoch
              date.setUTCMilliseconds(start_time);
              const recordHour = date.getHours();
              const recordMinutes = date.getMinutes();
              let recordTimePoint = recordHour;
              if (recordMinutes !== 0) {
                recordTimePoint += 0.5;
              }
              if (this.viewMode === ViewMode.DISTANCE) console.log(timePoint, recordTimePoint);
              if (timePoint === recordTimePoint) {
                result.push({
                  xAxis: timePoint,
                  coastTime: record.coast_time_avg || 0,
                  pushCount: record.push_count || 0,
                  driveDistance: this._updateDistanceUnit(this._motorTicksToMiles(record.distance_smartdrive_drive - record.distance_smartdrive_drive_start)) || 0,
                  coastDistance: this._updateDistanceUnit(this._caseTicksToMiles(record.distance_smartdrive_coast - record.distance_smartdrive_coast_start)) || 0
                });
                if (this.viewMode === ViewMode.DISTANCE) console.log('Appended to result', result[result.length - 1]);
                j += 1;
                continue;
              } else {
                result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
                break;
              }
            }
          } else {
            result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
          }
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '   ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '    ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '     ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '      ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '       ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        return result;
      }
      else {
        const result = [];
        for (const i in this._dayViewTimeArray) {
          const timePoint = this._dayViewTimeArray[i];
          result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '   ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '    ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '     ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '      ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '       ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        return result;
      }
    } else if (index === 1) {
      const activity = (this.viewMode === ViewMode.DISTANCE ? this._usageService.weeklyActivity : this._activityService.weeklyActivity);

      // format chart description
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      } else {
        this.chartDescription = '<insert_distance> <insert_unit>';
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
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
        ];
        for (const i in weekViewDayArray) {
          const dayInWeek = weekViewDayArray[i];
          const dailyActivity = days[i];
          if (dailyActivity) {
            // We have daily activity for this day
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastTime: dailyActivity.coast_time_avg || 0,
              pushCount: dailyActivity.push_count || 0,
              driveDistance: this._updateDistanceUnit(this._motorTicksToMiles(dailyActivity.distance_smartdrive_drive - dailyActivity.distance_smartdrive_drive_start)) || 0,
              coastDistance: this._updateDistanceUnit(this._caseTicksToMiles(dailyActivity.distance_smartdrive_coast - dailyActivity.distance_smartdrive_coast_start)) || 0,
              date: dayInWeek
            });
          }
          else {
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
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        return result;
      }
      else {
        const result = [];
        const dayNames: string[] = [
          'Sun',
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat'
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
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0, driveDistance: 0, coastDistance: 0 });
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
    const thisWeek = this._getFirstDayOfWeek(today);
    return this._areDaysSame(thisWeek, this.weekStart);
  }

  isNextWeekButtonEnabled() {
    return !this._isCurrentDayInViewThisWeek();
  }

  isNextMonthButtonEnabled() {
    const today = new Date();
    const month = today.getMonth();
    const currentWeekStart = this._getFirstDayOfWeek(this.currentDayInView);
    const currentMonth = currentWeekStart.getMonth();
    return (currentWeekStart.getFullYear() <= today.getFullYear() && currentMonth < month);
  }

  private _initDayChartTitle() {
    const date = this.currentDayInView;
    this.chartTitle =
      this.dayNames[date.getDay()] +
      ', ' +
      this.monthNames[date.getMonth()] +
      ' ' +
      date.getDate();
  }

  private _areDaysSame(first: Date, second: Date) {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  private _getFirstDayOfWeek(date) {
    date = new Date(date);
    const day = date.getDay();
    if (day === 0) return date; // Sunday is the first day of the week
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  private _initWeekChartTitle() {
    const date = this.currentDayInView;
    this.weekStart = this._getFirstDayOfWeek(date);
    this.weekEnd = this._getFirstDayOfWeek(date);
    this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    this.chartTitle =
      this.monthNames[date.getMonth()] +
      ' ' +
      this.weekStart.getDate() +
      ' — ' +
      this.weekEnd.getDate();
  }

  private _updateWeekStartAndEnd() {
    const date = this.currentDayInView;
    this.weekStart = this._getFirstDayOfWeek(date);
    this.weekEnd = this._getFirstDayOfWeek(date);
    this.weekEnd.setDate(this.weekEnd.getDate() + 6);
  }

  private _initMonthViewStyle() {
    this.monthViewStyle = new CalendarMonthViewStyle();
    this.monthViewStyle.showTitle = false;
    this.monthViewStyle.showWeekNumbers = false;
    this.monthViewStyle.showDayNames = true;
    this.monthViewStyle.backgroundColor =
      this.savedTheme === 'DARK' ? this._colorBlack : this._colorWhite;

    // Today cell style
    const todayCellStyle = new DayCellStyle();
    todayCellStyle.cellBorderColor =
      this.savedTheme === 'DARK' ? new Color('#00c1d5') : this._colorWhite;
    todayCellStyle.cellTextSize = 12;
    todayCellStyle.cellTextColor = new Color('#00c1d5');
    this.monthViewStyle.todayCellStyle = todayCellStyle;

    // Day cell style
    const dayCellStyle = new DayCellStyle();
    dayCellStyle.cellBackgroundColor =
      this.savedTheme === 'DARK' ? this._colorBlack : this._colorWhite;
    dayCellStyle.cellBorderColor =
      this.savedTheme === 'DARK' ? this._colorDarkGrey : this._colorWhite;
    this.monthViewStyle.dayCellStyle = dayCellStyle;

    // Weekend cell style
    const weekendCellStyle = new DayCellStyle();
    weekendCellStyle.cellBorderColor =
      this.savedTheme === 'DARK' ? this._colorDarkGrey : this._colorWhite;
    this.monthViewStyle.weekendCellStyle = weekendCellStyle;

    // Selected cell style
    const selectedDayCellStyle = new DayCellStyle();
    selectedDayCellStyle.cellBackgroundColor = new Color('#00c1d5');
    selectedDayCellStyle.cellTextColor = this._colorWhite;
    this.monthViewStyle.selectedDayCellStyle = selectedDayCellStyle;

    // Week number cell style
    const weekNumberCellStyle = new CellStyle();
    weekNumberCellStyle.cellTextColor =
      this.savedTheme === 'DARK' ? this._colorWhite : this._colorBlack;
    weekNumberCellStyle.cellBorderColor = this._colorWhite;
    this.monthViewStyle.weekNumberCellStyle = weekNumberCellStyle;

    // Day name cell style
    const dayNameCellStyle = new CellStyle();
    dayNameCellStyle.cellBackgroundColor =
      this.savedTheme === 'DARK' ? this._colorBlack : this._colorWhite;
    dayNameCellStyle.cellTextColor =
      this.savedTheme === 'DARK' ? this._colorWhite : this._colorBlack;
    dayNameCellStyle.cellBorderColor =
      this.savedTheme === 'DARK' ? this._colorDarkGrey : this._colorWhite;
    this.monthViewStyle.dayNameCellStyle = dayNameCellStyle;
  }

  private _initMonthChartTitle() {
    const date = this.currentDayInView;
    this.chartTitle =
      this.monthNames[date.getMonth()] + ' ' + date.getFullYear();
  }

  private _updateDayChartLabel() {
    const activity = this._activityService.dailyActivity;

    if (activity) {
      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      } else if (this.viewMode === ViewMode.DISTANCE) {
        this.chartDescription = '<insert_distance> <insert_unit>';
      }
    }
    else {
      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (0).toFixed(1) + ' s';
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        this.chartDescription = (0) + ' pushes';
      } else if (this.viewMode === ViewMode.DISTANCE) {
        this.chartDescription = '<insert_distance> <insert_unit>';
      }
    }
  }

  private _updateDailyActivityAnnotationValue() {
    const activity = this._activityService.dailyActivity;
    if (activity) {
      if (this.viewMode === ViewMode.COAST_TIME) {
        // coast time
        this.dailyActivityAnnotationValue = activity.coast_time_avg || 0;
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        // push count
        const records = activity.records || [];
        let pushCountTotal = 0;
        for (const i in records) {
          const record = records[i];
          pushCountTotal += record.push_count;
        }
        this.dailyActivityAnnotationValue =
          parseInt((pushCountTotal / records.length).toFixed(1)) || 0;
      }
      else if (this.viewMode === ViewMode.DISTANCE) {
        this.dailyActivityAnnotationValue = 0;
      }
    }
    else
      this.dailyActivityAnnotationValue = 0;
  }

  private _updateWeekChartLabel() {
    if (!(this.weekStart.toUTCString() in this._weeklyActivityCache)) {
      // No cache
      const activity = this._activityService.weeklyActivity;

      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      } else if (this.viewMode === ViewMode.DISTANCE) {
        this.chartDescription = '<insert_distance> <insert_unit>';
      }
    } else {
      // We are showing cached data
      const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
      this.weeklyActivity = cache.chartData;

      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (cache.weeklyActivity.coast_time_avg || 0).toFixed(1) + ' s';
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        this.chartDescription =
          (cache.weeklyActivity.push_count || 0) + ' pushes';
      } else if (this.viewMode === ViewMode.DISTANCE) {
        this.chartDescription = '<insert_distance> <insert_unit>';
      }
    }
  }

  private _updateWeeklyActivityAnnotationValue() {
    if (!(this.weekStart.toUTCString() in this._weeklyActivityCache)) {
      // No cache
      const activity = this._activityService.weeklyActivity;
      if (this.viewMode === ViewMode.COAST_TIME) {
        // coast time
        this.weeklyActivityAnnotationValue = activity
          ? activity.coast_time_avg || 0
          : 0;
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        // push count
        this.weeklyActivityAnnotationValue =
          parseInt((activity.push_count / 7).toFixed(1)) || 0;
      } else if (this.viewMode === ViewMode.DISTANCE) {
        // distance
        this.weeklyActivityAnnotationValue = 0;
      }
    } else {
      // We are showing cached data
      const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
      if (this.viewMode === ViewMode.COAST_TIME) {
        // coast time
        this.weeklyActivityAnnotationValue = cache
          ? cache.weeklyActivity.coast_time_avg || 0
          : 0;
      } else if (this.viewMode === ViewMode.PUSH_COUNT) {
        // push count
        this.weeklyActivityAnnotationValue =
          parseInt((cache.weeklyActivity.push_count / 7).toFixed(1)) || 0;
      } else if (this.viewMode === ViewMode.DISTANCE) {
        // distance
        this.weeklyActivityAnnotationValue = 0;
      }
    }
  }

  _motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  _caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  _milesToKilometers(miles: number) {
    return miles * 1.60934;
  }

  _updateDistanceUnit(distance: number) {
    if (this.user.data.distance_unit_preference === 0) {
      return this._milesToKilometers(distance);
    }
    return distance;
  }
}

enum ViewMode {
  'COAST_TIME',
  'PUSH_COUNT',
  'DISTANCE'
}
