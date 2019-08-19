import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PushTrackerUserService } from '../../services';
import { Router } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Page } from 'ui/page';

@Component({
    selector: 'configuration-tab',
    moduleId: module.id,
    templateUrl: './configuration-tab.component.html'
})
export class ConfigurationTabComponent implements OnInit {
    private _user: PushTrackerUser;

    constructor(
        private _translateService: TranslateService,
        private _router: Router,
        private userService: PushTrackerUserService,
        private page: Page
    ) {
        page.actionBarHidden = true;
    }

    ngOnInit() {
        this.userService.user.subscribe(user => {
            this._user = user;
        });
    }

    onConfigurationSelection(event, selection) {
        this._user.data.control_configuration = selection;
        this.userService.updateDataProperty('control_configuration', this._user.data.control_configuration);
        KinveyUser.update({ control_configuration: this._user.data.control_configuration });
        this._router.navigate(['/tabs/default']);
    }
}