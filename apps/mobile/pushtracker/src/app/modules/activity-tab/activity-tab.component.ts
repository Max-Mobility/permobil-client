import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';
import { ActivityService } from '../../services/activity.service';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { Injectable } from '@angular/core';
import { CalendarMonthViewStyle, DayCellStyle, CalendarSelectionShape, CellStyle, RadCalendar, DateRange } from 'nativescript-ui-calendar';
import { Color } from 'tns-core-modules/color/color';
import { Button } from 'tns-core-modules/ui/button';
import { layout } from 'tns-core-modules/utils/utils';
import * as appSettings from 'tns-core-modules/application-settings';
import { APP_THEMES, STORAGE_KEYS } from '../../enums';
import { ChartGridLineAnnotation } from 'nativescript-ui-chart';

export class Activity {
    constructor(public timeStamp?: number, public Amount?: number) {
    }
}

@Injectable()
export class DataService {
    getSource(view: string) {
        if (view === 'Week') {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            const range = function (start, end) {
                return (new Array(end - start + 1)).fill(undefined).map((_, i) => i + start);
            };
            const result = [];
            const min = 0;
            const max = 50;
            const random = function () { return Math.random() * (+max - +min) + +min; };
            const dayNames: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (const i in range(0, 6)) {
                result.push({ xAxis: dayNames[parseInt(i)], yAxis: random(), Date: date });
            }
            result.unshift({ xAxis: ' ', yAxis: 0 });
            result.unshift({ xAxis: '  ', yAxis: 0 });
            result.push({ xAxis: '       ', yAxis: 0 });
            result.push({ xAxis: '        ', yAxis: 0 });
            return result;
        }
    }
}

@Component({
    selector: 'activity-tab',
    moduleId: module.id,
    templateUrl: 'activity-tab.component.html',
    providers: [DataService]
})
export class ActivityTabComponent implements OnInit {
    private static LOG_TAG = 'activity-tab.component ';
    infoItems;
    public tabSelectedIndex: number;
    public displayDay: string = this._translateService.instant('day');
    public displayWeek: string = this._translateService.instant('week');
    public displayMonth: string = this._translateService.instant('month');
    public activity: ObservableArray<any[]>;
    public maximumDateTimeValue: Date;
    public minimumDateTimevalue: Date;
    public chartTitle: string;
    public dayNames: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    public monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    public currentDayInView: Date;
    public dayChartLabel: string;
    public weekStart: Date;
    public weekEnd: Date;
    public monthStart: Date;
    public monthEnd: Date;
    public minDate: Date;
    public maxDate: Date;
    public monthViewStyle: CalendarMonthViewStyle;
    private _calendar: RadCalendar;
    private _dayViewTimeArray: number[] = [];
    private _dailyActivityCache = {};
    private dailyViewMode = 0; // 0 = Coast Time is plotted, 1 = Distance is plotted
    private savedTheme: string;
    private dailyActivityAnnotationValue: number = 0;

    // Colors
    private _colorWhite = new Color('White');
    private _colorBlack = new Color('Black');
    // Colors - Shades of Blue - Dark to Light
    private _colorCoolBlack = new Color('#072F5F');
    private _colorMediumPersianBlue = new Color('#1261a0');
    private _colorTuftsBlue = new Color('#3895D3');
    private _colorBlueJeans = new Color('#58CCED');

    constructor(
        private _logService: LoggingService,
        private _activityService: ActivityService,
        private _translateService: TranslateService,
        private _params: ModalDialogParams,
        private _dataService: DataService
    ) {
        this.currentDayInView = new Date();
        const year = this.currentDayInView.getFullYear();
        const month = this.currentDayInView.getMonth();
        const day = this.currentDayInView.getDate();
        this.minimumDateTimevalue = new Date(year, month, day, 0);
        this.maximumDateTimeValue = new Date(year, month, day, 23);
        this._initMonthViewStyle();
        this.loadDailyActivity();
        { // Initialize time array for day view
            const rangeStart = 0;
            const rangeEnd = 24;
            let rangeIterator = rangeStart;
            while (rangeIterator <= rangeEnd) {
                this._dayViewTimeArray.push(rangeIterator);
                rangeIterator += 0.5;
            }
        }
        this.savedTheme = appSettings.getString(STORAGE_KEYS.APP_THEME, APP_THEMES.DEFAULT);
    }

    ngOnInit() {
        this._logService.logBreadCrumb(ActivityTabComponent.LOG_TAG + `ngOnInit`);
        this.infoItems = this._translateService.instant(
            'activity-tab-component.sections'
        );
    }

    async loadDailyActivity() {
        let didLoad = false;
        // Check if data is available in daily activity cache first
        if (!(this.currentDayInView.toUTCString() in this._dailyActivityCache)) {
            didLoad = await this._activityService.loadDailyActivity(this.currentDayInView);
            if (didLoad) {
                this.activity = new ObservableArray(this.formatActivityForView('Day'));
                this._initDayChartTitle();
                const date = this.currentDayInView;
                const sunday = this._getFirstDayOfWeek(date);
                this.weekStart = sunday;
                this.weekEnd = this.weekStart;
                this.weekEnd.setDate(this.weekEnd.getDate() + 6);
                this.minDate = new Date('01/01/1999');
                this.maxDate = new Date('01/01/2099');
            }
            else {
                this.activity = new ObservableArray(this.formatActivityForView('Day'));
            }
            // Cache activity by day so we can easily pull it up next time
            this._dailyActivityCache[this.currentDayInView.toUTCString()] = {
                chartData: this.activity, dailyActivity: this._activityService.dailyActivity
            };
            this._updateDailyActivityAnnotationValue();
        }
        else {
            // We have the data cached. Pull it up
            didLoad = true;
            const cache = this._dailyActivityCache[this.currentDayInView.toUTCString()];
            this.activity = cache.chartData;
            if (this.dailyViewMode === 0) {
                // coast time
                this.dayChartLabel = '› ' + (cache.dailyActivity.coast_time_avg || 0).toFixed(1) + ' s';
            }
            else {
                // push count
                this.dayChartLabel = '› ' + (cache.dailyActivity.push_count || 0) + ' pushes';
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
    }

    async loadWeeklyActivity() {
        const didLoad = await this._activityService.loadWeeklyActivity(this.weekStart, this.weekEnd);
        if (didLoad) {
            // this.activity = new ObservableArray(this.formatActivityForView('Day'));
            // this._initDayChartTitle();
            // const date = this.currentDayInView;
            // const sunday = this._getFirstDayOfWeek(date);
            // this.weekStart = sunday;
            // this.weekEnd = this.weekStart;
            // this.weekEnd.setDate(this.weekEnd.getDate() + 6);
            // this.minDate = new Date('01/01/1999');
            // this.maxDate = new Date('01/01/2099');
        }
        else {
            this.activity = new ObservableArray(this.formatActivityForView('Day'));
        }
    }

    formatActivityForView(viewMode) {
        if (viewMode === 'Day') {
            const activity = this._activityService.dailyActivity;
            if (this.dailyViewMode === 0) {
                // coast time
                this.dayChartLabel = '› ' + (activity.coast_time_avg || 0).toFixed(1) + ' s';
            }
            else {
                // push count
                this.dayChartLabel = '› ' + (activity.push_count || 0) + ' pushes';
            }
            if (activity) {
                const result = [];
                const date = new Date();
                const year = date.getFullYear();
                const month = date.getMonth();
                const day = date.getDate();
                const range = function (start, end) {
                    return (new Array(end - start + 1)).fill(undefined).map((_, i) => i + start);
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
                                result.push({ xAxis: timePoint, coastTime: record.coast_time_avg || 0, pushCount: record.push_count || 0 });
                                j += 1;
                                continue;
                            }
                            else {
                                result.push({ xAxis: timePoint, coastTime: 0, pushCount: 0 });
                                break;
                            }
                        }
                    }
                    else {
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
        }
    }

    onShownModally(args) {
        Log.D('activity-tab.component modal shown');
    }

    closeModal(event) {
        Log.D('activity-tab.component modal closed');
        this._params.closeCallback('some value');
    }

    // displaying the old and new TabView selectedIndex
    onSelectedIndexChanged(args: SelectedIndexChangedEventData) {
        const date = this.currentDayInView;
        const sunday = this._getFirstDayOfWeek(date);
        if (args.oldIndex !== -1) {
            const newIndex = args.newIndex;
            if (newIndex === 0) {
                this.chartTitle = this.dayNames[date.getDay()] + ', ' + this.monthNames[date.getMonth()] + ' ' + date.getDate();
                this.activity = new ObservableArray(this.formatActivityForView('Day'));
            } else if (newIndex === 1) {
                this._initWeekChartTitle();
                this.loadWeeklyActivity();
                this.activity = new ObservableArray(this._dataService.getSource('Week'));
            } else if (newIndex === 2) {
                this._initMonthChartTitle();
            }
        }
    }

    _isCurrentDayInViewToday() {
        const today = new Date();
        return this.currentDayInView.getDate() === today.getDate() &&
            this.currentDayInView.getMonth() === today.getMonth() &&
            this.currentDayInView.getFullYear() === today.getFullYear();
    }

    _isNextDayButtonEnabled() {
        return !(this._isCurrentDayInViewToday());
    }

    _initDayChartTitle() {
        const date = this.currentDayInView;
        this.chartTitle = this.dayNames[date.getDay()] + ', ' + this.monthNames[date.getMonth()] + ' ' + date.getDate();
    }

    _areDaysSame(first: Date, second: Date) {
        return first.getFullYear() === second.getFullYear() &&
            first.getMonth() === second.getMonth() &&
            first.getDate() === second.getDate();
    }

    _getFirstDayOfWeek(date) {
        date = new Date(date);
        const day = date.getDay();
        if (day === 0) return date; // Sunday is the first day of the week
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
    }

    _initWeekChartTitle() {
        const date = this.currentDayInView;
        this.weekStart = this._getFirstDayOfWeek(date);
        this.weekEnd = this._getFirstDayOfWeek(date);
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
        this.chartTitle = this.monthNames[date.getMonth()] + ' ' + this.weekStart.getDate() + ' — ' + this.weekEnd.getDate();
    }

    _updateWeekStartAndEnd() {
        const date = this.currentDayInView;
        this.weekStart = this._getFirstDayOfWeek(date);
        this.weekEnd = this._getFirstDayOfWeek(date);
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    }

    onPreviousDayTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() - 1);
        this._updateWeekStartAndEnd();
        this._initDayChartTitle();
        this.loadDailyActivity();
    }

    onNextDayTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
        this._updateWeekStartAndEnd();
        this._initDayChartTitle();
        this.loadDailyActivity();
    }

    _updateForwardButtonClassName(event) {
        // If the next day button is not enabled, change the class of the button to gray it out
        const button = event.object as Button;
        if (!this._isNextDayButtonEnabled()) {
            button.className = 'forward-btn-disabled';
        }
        else {
            button.className = 'forward-btn';
        }
    }

    onPreviousWeekTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() - 7);
        this._initWeekChartTitle();
        this.activity = new ObservableArray(this._dataService.getSource('Week'));
    }

    onNextWeekTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 7);
        this._initWeekChartTitle();
        this.activity = new ObservableArray(this._dataService.getSource('Week'));
    }

    onWeekPointSelected(event) {
        const pointIndex = event.pointIndex;
        this.currentDayInView.setDate(this.weekStart.getDate() + pointIndex - 2);
        this.loadDailyActivity();
        this.tabSelectedIndex = 0;
    }

    _initMonthViewStyle() {
        this.monthViewStyle = new CalendarMonthViewStyle();
        this.monthViewStyle.showTitle = false;

        // Today cell style
        const todayCellStyle = new DayCellStyle();
        todayCellStyle.cellBorderColor = this._colorWhite;
        todayCellStyle.cellTextSize = 12;
        todayCellStyle.cellTextColor = new Color('#0067a6');
        this.monthViewStyle.todayCellStyle = todayCellStyle;

        // Day cell style
        const dayCellStyle = new DayCellStyle();
        dayCellStyle.cellBackgroundColor = this._colorWhite;
        dayCellStyle.cellBorderColor = this._colorWhite;
        this.monthViewStyle.dayCellStyle = dayCellStyle;

        // Selected cell style
        const selectedDayCellStyle = new DayCellStyle();
        selectedDayCellStyle.cellBackgroundColor = new Color('#8dd5e3');
        selectedDayCellStyle.cellTextColor = this._colorWhite;
        this.monthViewStyle.selectedDayCellStyle = selectedDayCellStyle;
    }

    _initMonthChartTitle() {
        const date = this.currentDayInView;
        this.chartTitle = this.monthNames[date.getMonth()] + ' ' + date.getFullYear();
    }

    onPreviousMonthTap(event) {
        this.currentDayInView.setMonth(this.currentDayInView.getMonth() - 1);
        this._calendar.navigateBack();
        this._initMonthChartTitle();
    }

    onNextMonthTap(event) {
        const now = this.currentDayInView;
        this.currentDayInView.setMonth(this.currentDayInView.getMonth() + 1);
        this._calendar.navigateForward();
        this._initMonthChartTitle();
    }

    onCalendarLoaded(args) {
        const calendar = <RadCalendar>args.object;
        // Increasing the height of dayNameCells in RadCalendar
        // https://stackoverflow.com/questions/56720589/increasing-the-height-of-daynamecells-in-radcalendar
        if (calendar.android) {
            calendar.android.setDayNamesHeight(layout.toDevicePixels(40));
        } else {
            calendar.ios.presenter.style.dayNameCellHeight = 40;
        }
        this._calendar = calendar;
        const telCalendar = calendar.nativeView; // com.telerik.widget.calendar.RadCalendarView
        const gestureManager = telCalendar.getGestureManager(); // com.telerik.widget.calendar.CalendarGestureManager
        gestureManager.setDoubleTapToChangeDisplayMode(false);
        gestureManager.setPinchCloseToChangeDisplayMode(false);
        gestureManager.setPinchOpenToChangeDisplayMode(false);
        gestureManager.setSwipeDownToChangeDisplayMode(false);
        gestureManager.setSwipeUpToChangeDisplayMode(false);
        gestureManager.suspendScroll();
    }

    onCalendarDateSelected(args) {
        const date: Date = args.date;
        this.currentDayInView.setMonth(date.getMonth());
        this.currentDayInView.setDate(date.getDate());
        this.tabSelectedIndex = 0;
    }

    _updateDayChartLabel() {
        if (!(this.currentDayInView.toUTCString() in this._dailyActivityCache)) {
            // No cache
            const activity = this._activityService.dailyActivity;
            if (this.dailyViewMode === 0) {
                // coast time
                this.dayChartLabel = '› ' + (activity.coast_time_avg || 0).toFixed(1) + ' s';
            }
            else {
                // push count
                this.dayChartLabel = '› ' + (activity.push_count || 0) + ' pushes';
            }
        }
        else {
            // We are showing cached data
            const cache = this._dailyActivityCache[this.currentDayInView.toUTCString()];
            this.activity = cache.chartData;
            if (this.dailyViewMode === 0) {
                // coast time
                this.dayChartLabel = '› ' + (cache.dailyActivity.coast_time_avg || 0).toFixed(1) + ' s';
            }
            else {
                // push count
                this.dayChartLabel = '› ' + (cache.dailyActivity.push_count || 0) + ' pushes';
            }
        }
    }

    onDailyActivityCoastTimeButtonTap(event) {
        this.dailyViewMode = 0;
        this._updateDayChartLabel();
        this._updateDailyActivityAnnotationValue();
    }

    onDailyActivityDistanceButtonTap(event) {
        this.dailyViewMode = 1;
        this._updateDayChartLabel();
        this._updateDailyActivityAnnotationValue();
    }

    _updateDailyActivityAnnotationValue() {
        if (!(this.currentDayInView.toUTCString() in this._dailyActivityCache)) {
            // No cache
            const activity = this._activityService.dailyActivity;
            if (this.dailyViewMode === 0) {
                // coast time
                this.dailyActivityAnnotationValue = (activity ? activity.coast_time_avg || 0 : 0);
            }
            else {
                // push count
                const records = activity.records;
                let pushCountTotal = 0;
                for (const i in records) {
                    const record = records[i];
                    pushCountTotal += record.push_count;
                }
                this.dailyActivityAnnotationValue = parseInt((pushCountTotal / records.length).toFixed(1)) || 0;
            }
        }
        else {
            // We are showing cached data
            const cache = this._dailyActivityCache[this.currentDayInView.toUTCString()];
            if (this.dailyViewMode === 0) {
                // coast time
                this.dailyActivityAnnotationValue = (cache ? cache.dailyActivity.coast_time_avg || 0 : 0);
            }
            else {
                // push count
                const records = cache.dailyActivity.records;
                let pushCountTotal = 0;
                for (const i in records) {
                    const record = records[i];
                    pushCountTotal += record.push_count;
                }
                this.dailyActivityAnnotationValue = parseInt((pushCountTotal / records.length).toFixed(1)) || 0;
            }
        }
    }
}
