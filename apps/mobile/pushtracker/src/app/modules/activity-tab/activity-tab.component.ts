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
    getSource() {
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
        const dateFormat = function(hour: number) {
            switch (hour) {
                case 0:
                    return '12 AM';
                case 4:
                    return '4 AM';
                case 8:
                    return '8 AM';
                case 12:
                    return '12 PM';
                case 16:
                    return '4 PM';
                case 20:
                    return '8 PM';
                case 24:
                    return '12 AM ';
            }
            return '' + hour;
        };
        for (const i in range(0, 24)) {
            result.push({ Date: dateFormat(parseInt(i)), Amount: random() });
        }
        return result;
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
        this.activity = new ObservableArray(this._dataService.getSource());
        this._initChartTitle();
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
        if (args.oldIndex !== -1) {
            const newIndex = args.newIndex;
            if (newIndex === 0) {
                this.chartTitle = this.dayNames[date.getDay()] + ', ' + this.monthNames[date.getMonth()] + ' ' + date.getDate();
            } else if (newIndex === 1) {
                // Week
            } else if (newIndex === 2) {
                // Month
            }
        }
    }

    _initChartTitle() {
        const date = this.currentDayInView;
        this.chartTitle = this.dayNames[date.getDay()] + ', ' + this.monthNames[date.getMonth()] + ' ' + date.getDate();
    }

    onPreviousDayTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() - 1);
        this._initChartTitle();
        this.activity = new ObservableArray(this._dataService.getSource());
    }

    onNextDayTap(event) {
        this.currentDayInView.setDate(this.currentDayInView.getDate() + 1);
        this._initChartTitle();
        this.activity = new ObservableArray(this._dataService.getSource());
    }

}
