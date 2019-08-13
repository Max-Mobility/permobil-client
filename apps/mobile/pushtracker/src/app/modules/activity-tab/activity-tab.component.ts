import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { Injectable } from '@angular/core';

export class Activity {
    constructor(public timeStamp?: number, public Amount?: number) {
    }
}

@Injectable()
export class DataService {
    getSource(view: string) {
        if (view === 'Day') {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            const range = function(start, end) {
                return (new Array(end - start + 1)).fill(undefined).map((_, i) => i + start);
            };
            const result = [];
            const  min = 0;
            const max = 50;
            const random = function() { return Math.random() * (+max - +min) + +min; };
            for (const i in range(0, 24)) {
                result.push({ xAxis: parseInt(i), yAxis: random(), Hour: parseInt(i), Date: date });
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
        else if (view === 'Week') {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            const range = function(start, end) {
                return (new Array(end - start + 1)).fill(undefined).map((_, i) => i + start);
            };
            const result = [];
            const  min = 0;
            const max = 50;
            const random = function() { return Math.random() * (+max - +min) + +min; };
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
    public activity: ObservableArray<Activity>;
    public maximumDateTimeValue: Date;
    public minimumDateTimevalue: Date;
    public chartTitle: string;
    public dayNames: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    public monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
    public currentDayInView: Date;
    public weekStart: Date;
    public weekEnd: Date;

    constructor(
        private _logService: LoggingService,
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
    }

    ngOnInit() {
        this._logService.logBreadCrumb(ActivityTabComponent.LOG_TAG + `ngOnInit`);
        this.infoItems = this._translateService.instant(
            'activity-tab-component.sections'
        );
        this.activity = new ObservableArray(this._dataService.getSource('Day'));
        this._initDayChartTitle();
        const date = this.currentDayInView;
        const sunday = this._getFirstDayOfWeek(date);
        this.weekStart = sunday;
        this.weekEnd = this.weekStart;
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
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
                this.activity = new ObservableArray(this._dataService.getSource('Day'));
            } else if (newIndex === 1) {
                this._initWeekChartTitle();
                this.activity = new ObservableArray(this._dataService.getSource('Week'));
            } else if (newIndex === 2) {
                // Month
            }
        }
    }

    _initDayChartTitle() {
        const date = this.currentDayInView;
        this.chartTitle = this.dayNames[date.getDay()] + ', ' + this.monthNames[date.getMonth()] + ' ' + date.getDate();
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
        this.activity = new ObservableArray(this._dataService.getSource('Day'));
    }

    onNextDayTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
        this._updateWeekStartAndEnd();
        this._initDayChartTitle();
        this.activity = new ObservableArray(this._dataService.getSource('Day'));
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
        this.tabSelectedIndex = 0;
    }

}
