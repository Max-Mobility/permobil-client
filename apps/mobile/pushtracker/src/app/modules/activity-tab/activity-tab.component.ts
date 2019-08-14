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
    public weekStart: Date;
    public weekEnd: Date;
    public monthStart: Date;
    public monthEnd: Date;
    public minDate: Date;
    public maxDate: Date;
    public monthViewStyle: CalendarMonthViewStyle;
    private _calendar: RadCalendar;

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
        this.loadActivity();
    }

    ngOnInit() {
        this._logService.logBreadCrumb(ActivityTabComponent.LOG_TAG + `ngOnInit`);
        this.infoItems = this._translateService.instant(
            'activity-tab-component.sections'
        );
    }

    async loadActivity() {
        const didLoad = await this._activityService.loadActivity(this.currentDayInView);
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
    }

    formatActivityForView(viewMode) {
        if (viewMode === 'Day') {
            const activity = this._activityService.activity;
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
                for (const i in range(0, 24)) {
                    if (records && j < records.length) {
                        while (j < records.length) {
                            const record = records[j];
                            const start_time = record.start_time;
                            const date = new Date(0); // The 0 there is the key, which sets the date to the epoch
                            date.setUTCMilliseconds(start_time);
                            const recordHour = date.getHours();
                            if (parseInt(i) === recordHour) {
                                // There's data in records for this hour
                                // Use it
                                result.push({ xAxis: date.getHours(), yAxis: record.push_count, Hour: date.getHours(), Date: date });
                                j = j + 1;
                            }
                            else {
                                result.push({ xAxis: parseInt(i), yAxis: 0, Hour: parseInt(i), Date: date });
                                break;
                            }
                        }
                    }
                    else {
                        result.push({ xAxis: parseInt(i), yAxis: 0, Hour: parseInt(i), Date: date });
                    }
                }
                result.unshift({ xAxis: ' ', yAxis: 0 });
                result.unshift({ xAxis: '  ', yAxis: 0 });
                result.unshift({ xAxis: '   ', yAxis: 0 });
                result.unshift({ xAxis: '    ', yAxis: 0 });
                result.push({ xAxis: '     ', yAxis: 0 });
                result.push({ xAxis: '      ', yAxis: 0 });
                result.push({ xAxis: '       ', yAxis: 0 });
                result.push({ xAxis: '        ', yAxis: 0 });
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
        this.loadActivity();
    }

    onNextDayTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
        this._updateWeekStartAndEnd();
        this._initDayChartTitle();
        this.loadActivity();
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
        this.loadActivity();
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
}
