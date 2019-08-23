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

@Component({
  selector: 'activity-tab',
  moduleId: module.id,
  templateUrl: 'activity-tab.component.html'
})
export class ActivityTabComponent implements OnInit {
  tabItems: SegmentedBarItem[];
  tabSelectedIndex: number;

  chartTitle: string;
  chartDescription: string;
  viewMode: ViewMode = ViewMode.COAST_TIME; // 0 = Coast Time is plotted, 1 = Distance is plotted
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
  private _dailyActivityCache = {};

  // Member variabes for week view
  weeklyActivity: ObservableArray<any[]>;
  weeklyActivityAnnotationValue: number = 0;
  private _weeklyActivityCache = {};

  // Colors
  private _colorWhite = new Color('#fff');
  private _colorBlack = new Color('#000');
  private _colorDarkGrey = new Color('#727377');

  constructor(
    private _logService: LoggingService,
    private _activityService: ActivityService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams,
    private userService: PushTrackerUserService
  ) {
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
      this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
      this._updateWeekStartAndEnd();
      this._initDayChartTitle();
      this._loadDailyActivity();
    } else if (this.tabSelectedIndex === 1) {
      // week
      this.currentDayInView.setDate(this.currentDayInView.getDate() + 7);
      this._initWeekChartTitle();
      this._loadWeeklyActivity();
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
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
    } else if (this.tabSelectedIndex === 1) {
      // week
      this._updateWeekChartLabel();
      this._updateWeeklyActivityAnnotationValue();
      this._calculateWeeklyActivityYAxisMax();
    }
  }

  onDistanceTap() {
    this.viewMode = ViewMode.DISTANCE; // set view mode for distance

    if (this.tabSelectedIndex === 0) {
      // day
      this._updateDayChartLabel();
      this._updateDailyActivityAnnotationValue();
      this._calculateDailyActivityYAxisMax();
    } else if (this.tabSelectedIndex === 1) {
      // week
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
    this.currentDayInView.setMonth(date.getMonth());
    this.currentDayInView.setDate(date.getDate());
    this.tabSelectedIndex = 0;
  }

  private async _loadDailyActivity() {
    let didLoad = false;
    // Check if data is available in daily activity cache first
    if (!(this.currentDayInView.toUTCString() in this._dailyActivityCache)) {
      didLoad = await this._activityService.loadDailyActivity(
        this.currentDayInView
      );
      if (didLoad) {
        this.dailyActivity = new ObservableArray(this._formatActivityForView());
        this._initDayChartTitle();
        const date = this.currentDayInView;
        this.weekStart = this._getFirstDayOfWeek(date);
        this.weekEnd = this.weekStart;
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
        this.minDate = new Date('01/01/1999');
        this.maxDate = new Date('01/01/2099');
      } else {
        this.dailyActivity = new ObservableArray(this._formatActivityForView());
      }
      // Cache activity by day so we can easily pull it up next time
      this._dailyActivityCache[this.currentDayInView.toUTCString()] = {
        chartData: this.dailyActivity,
        dailyActivity: this._activityService.dailyActivity
      };
      this._updateDailyActivityAnnotationValue();
    } else {
      // We have the data cached. Pull it up
      didLoad = true;
      const cache = this._dailyActivityCache[
        this.currentDayInView.toUTCString()
      ];
      this.dailyActivity = cache.chartData;

      // format chart description for viewMode
      if ((this.viewMode === ViewMode.COAST_TIME)) {
        this.chartDescription =
          (cache.dailyActivity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription =
          (cache.dailyActivity.push_count || 0) + ' pushes';
      }

      this._initDayChartTitle();
      const date = this.currentDayInView;
      const sunday = this._getFirstDayOfWeek(date);
      this.weekStart = sunday;
      this.weekEnd = this.weekStart;
      this.weekEnd.setDate(this.weekEnd.getDate() + 6);
      this.minDate = new Date('01/01/1999');
      this.maxDate = new Date('01/01/2099');
      this._updateDailyActivityAnnotationValue();
    }
    this._calculateDailyActivityYAxisMax();
  }

  private _calculateDailyActivityYAxisMax() {
    this.yAxisMax = 0;
    this.yAxisStep = 15;
    let i = 4;
    while (i < 53) {
      const activity = this.dailyActivity.getItem(i);
      if (this.viewMode === ViewMode.COAST_TIME) {
        if (activity['coastTime'] > this.yAxisMax)
          this.yAxisMax = activity['coastTime'];
      } else {
        if (activity['pushCount'] > this.yAxisMax)
          this.yAxisMax = activity['pushCount'];
      }
      i++;
    }
    this.yAxisMax = parseInt((this.yAxisMax + 0.1 * this.yAxisMax).toFixed());
    if (this.yAxisMax === 0) this.yAxisMax = 30;
    if (this.yAxisMax < this.yAxisStep)
      this.yAxisStep = parseInt((this.yAxisMax / 2.0).toFixed());
  }

  private async _loadWeeklyActivity() {
    let didLoad = false;
    // Check if data is available in daily activity cache first
    if (!(this.weekStart.toUTCString() in this._weeklyActivityCache)) {
      didLoad = await this._activityService.loadWeeklyActivity(this.weekStart);
      if (didLoad) {
        this.weeklyActivity = new ObservableArray(
          this._formatActivityForView()
        );
        this._initWeekChartTitle();
        this.weekStart = new Date(this._activityService.weeklyActivity.date);
        this.weekEnd = new Date(this.weekStart);
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
        this.minDate = new Date('01/01/1999');
        this.maxDate = new Date('01/01/2099');
      } else {
        this.weeklyActivity = new ObservableArray(
          this._formatActivityForView()
        );
      }
      // Cache activity by day so we can easily pull it up next time
      this._weeklyActivityCache[this.weekStart.toUTCString()] = {
        chartData: this.weeklyActivity,
        weeklyActivity: this._activityService.weeklyActivity
      };
      this._updateWeeklyActivityAnnotationValue();
    } else {
      // We have the data cached. Pull it up
      didLoad = true;
      const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
      this.weeklyActivity = cache.chartData;

      // format the chart description label based on viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (cache.weeklyActivity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription =
          (cache.weeklyActivity.push_count || 0) + ' pushes';
      }

      this._initWeekChartTitle();
      this.weekStart = new Date(cache.weeklyActivity.date);
      this.weekEnd = new Date(this.weekStart);
      this.weekEnd.setDate(this.weekEnd.getDate() + 6);
      this.minDate = new Date('01/01/1999');
      this.maxDate = new Date('01/01/2099');
      this._updateWeeklyActivityAnnotationValue();
    }
    this._calculateWeeklyActivityYAxisMax();
  }

  private _calculateWeeklyActivityYAxisMax() {
    this.yAxisMax = 0;
    this.yAxisStep = 0;
    let i = 2;
    while (i < 9) {
      const activity = this.weeklyActivity.getItem(i);
      if (this.viewMode === ViewMode.COAST_TIME) {
        if (activity['coastTime'] > this.yAxisMax)
          this.yAxisMax = activity['coastTime'];
      } else {
        if (activity['pushCount'] > this.yAxisMax)
          this.yAxisMax = activity['pushCount'];
      }
      i++;
    }
    this.yAxisMax = parseInt((this.yAxisMax + 0.1 * this.yAxisMax).toFixed());
    if (this.yAxisMax === 0) this.yAxisMax = 12;
    this.yAxisStep = parseInt((this.yAxisMax / 4).toFixed());
  }

  private _formatActivityForView() {
    if (this.tabSelectedIndex === 0) {
      const activity = this._activityService.dailyActivity;

      // format the chart description based on viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      }

      if (activity && activity.records) {
        const result = [];
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const range = function(start, end) {
          return new Array(end - start + 1)
            .fill(undefined)
            .map((_, i) => i + start);
        };
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
                result.push({
                  xAxis: timePoint,
                  coastTime: record.coast_time_avg || 0,
                  pushCount: record.push_count || 0
                });
                j += 1;
                continue;
              } else {
                result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0 });
                break;
              }
            }
          } else {
            result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0 });
          }
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '   ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '    ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '     ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '      ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '       ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        return result;
      }
      else {
        const result = [];
        for (const i in this._dayViewTimeArray) {
          const timePoint = this._dayViewTimeArray[i];
          result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0});
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '   ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '    ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '     ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '      ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '       ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        return result;
      }
    } else if (this.tabSelectedIndex === 1) {
      const activity = this._activityService.weeklyActivity;

      // format chart description
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      }

      if (activity && activity.days) {
        const result = [];
        const date = new Date(activity.date);
        const range = function(start, end) {
          return new Array(end - start + 1)
            .fill(undefined)
            .map((_, i) => i + start);
        };
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
              date: dayInWeek
            });
          }
          else {
            result.push({
              xAxis: dayNames[parseInt(i)],
              coastTime: 0,
              pushCount: 0,
              date: dayInWeek
            });
          }
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
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
            pushCount: 0
          });
        }
        result.unshift({ xAxis: ' ', coastTime: 0, pushCount: 0 });
        result.unshift({ xAxis: '  ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
        result.push({ xAxis: '        ', coastTime: 0, pushCount: 0 });
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

  private _isNextDayButtonEnabled() {
    return !this._isCurrentDayInViewToday();
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

  private _updateForwardButtonClassName(event) {
    // If the next day button is not enabled, change the class of the button to gray it out
    const button = event.object as Button;
    if (!this._isNextDayButtonEnabled()) {
      button.className = 'next-btn-disabled';
    } else {
      button.className = 'next-btn';
    }
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
    if (!(this.currentDayInView.toUTCString() in this._dailyActivityCache)) {
      // No cache
      const activity = this._activityService.dailyActivity;

      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      }
    } else {
      // We are showing cached data
      const cache = this._dailyActivityCache[
        this.currentDayInView.toUTCString()
      ];
      this.dailyActivity = cache.chartData;

      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (cache.dailyActivity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription =
          (cache.dailyActivity.push_count || 0) + ' pushes';
      }
    }
  }

  private _updateDailyActivityAnnotationValue() {
    if (!(this.currentDayInView.toUTCString() in this._dailyActivityCache)) {
      // No cache
      const activity = this._activityService.dailyActivity;
      if (this.viewMode === ViewMode.COAST_TIME) {
        // coast time
        this.dailyActivityAnnotationValue = activity
          ? activity.coast_time_avg || 0
          : 0;
      } else {
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
    } else {
      // We are showing cached data
      const cache = this._dailyActivityCache[
        this.currentDayInView.toUTCString()
      ];
      if (this.viewMode === ViewMode.COAST_TIME) {
        // coast_time
        this.dailyActivityAnnotationValue = cache
          ? cache.dailyActivity.coast_time_avg || 0
          : 0;
      } else {
        // push_count
        const records = cache.dailyActivity.records || [];
        let pushCountTotal = 0;
        for (const i in records) {
          const record = records[i];
          pushCountTotal += record.push_count;
        }
        this.dailyActivityAnnotationValue =
          parseInt((pushCountTotal / records.length).toFixed(1)) || 0;
      }
    }
  }

  private _updateWeekChartLabel() {
    if (!(this.weekStart.toUTCString() in this._weeklyActivityCache)) {
      // No cache
      const activity = this._activityService.weeklyActivity;

      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (activity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription = (activity.push_count || 0) + ' pushes';
      }
    } else {
      // We are showing cached data
      const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
      this.weeklyActivity = cache.chartData;

      // format chart description for viewMode
      if (this.viewMode === ViewMode.COAST_TIME) {
        this.chartDescription =
          (cache.weeklyActivity.coast_time_avg || 0).toFixed(1) + ' s';
      } else {
        this.chartDescription =
          (cache.weeklyActivity.push_count || 0) + ' pushes';
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
      } else {
        // push count
        this.weeklyActivityAnnotationValue =
          parseInt((activity.push_count / 7).toFixed(1)) || 0;
      }
    } else {
      // We are showing cached data
      const cache = this._weeklyActivityCache[this.weekStart.toUTCString()];
      if (this.viewMode === ViewMode.COAST_TIME) {
        // coast time
        this.weeklyActivityAnnotationValue = cache
          ? cache.weeklyActivity.coast_time_avg || 0
          : 0;
      } else {
        // push count
        this.weeklyActivityAnnotationValue =
          parseInt((cache.weeklyActivity.push_count / 7).toFixed(1)) || 0;
      }
    }
  }
}

enum ViewMode {
  'COAST_TIME',
  'DISTANCE'
}
