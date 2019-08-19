import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
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
import { TrackballCustomContentData } from 'nativescript-ui-chart';


@Component({
    selector: 'configuration-tab',
    moduleId: module.id,
    templateUrl: './configuration-tab.component.html'
})
export class ConfigurationTabComponent implements OnInit {
    constructor(
        private _logService: LoggingService,
        private _activityService: ActivityService,
        private _translateService: TranslateService
    ) {}

    ngOnInit() {}

    onConfigurationSelection(event, selection) {
        if (selection === 'SmartDrive + E2') {
            console.log('SmartDrive + E2');
        }
        else if (selection === 'SmartDrive + PushTracker') {
            console.log('SmartDrive + PushTracker');
        }
        else if (selection === 'SmartDrive + SwitchControl') {
            console.log('SmartDrive + SwitchControl');
        }
    }
}