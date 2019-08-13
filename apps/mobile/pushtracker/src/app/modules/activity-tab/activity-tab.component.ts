import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { LoggingService } from '../../services';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { Injectable } from '@angular/core';

export class Country {
    constructor(public Country?: string, public Amount?: number, public SecondVal?: number, public ThirdVal?: number, public Impact?: number, public Year?: number) {
    }
}

@Injectable()
export class DataService {
    getCategoricalSource(): Country[] {
        return [
            { Country: 'Germany', Amount: 15, SecondVal: 14, ThirdVal: 24, Impact: 0, Year: 0 },
            { Country: 'France', Amount: 13, SecondVal: 23, ThirdVal: 25, Impact: 0, Year: 0 },
            { Country: 'Bulgaria', Amount: 24, SecondVal: 17, ThirdVal: 23, Impact: 0, Year: 0 },
            { Country: 'Spain', Amount: 11, SecondVal: 19, ThirdVal: 24, Impact: 0, Year: 0 },
            { Country: 'USA', Amount: 18, SecondVal: 8, ThirdVal: 21, Impact: 0, Year: 0 }
        ];
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
    private _categoricalSource: ObservableArray<Country>;

    constructor(
        private _logService: LoggingService,
        private _translateService: TranslateService,
        private _params: ModalDialogParams,
        private _dataService: DataService
    ) {
        this.tabSelectedIndex = 0;
    }

    get categoricalSource(): ObservableArray<Country> {
        return this._categoricalSource;
    }

    ngOnInit() {
        this._logService.logBreadCrumb(ActivityTabComponent.LOG_TAG + `ngOnInit`);
        this.infoItems = this._translateService.instant(
            'activity-tab-component.sections'
        );
        this._categoricalSource = new ObservableArray(this._dataService.getCategoricalSource());
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
        if (args.oldIndex !== -1) {
            const newIndex = args.newIndex;
            if (newIndex === 0) {
                // Day
            } else if (newIndex === 1) {
                // Week
            } else if (newIndex === 2) {
                // Month
            }
        }
    }

}
