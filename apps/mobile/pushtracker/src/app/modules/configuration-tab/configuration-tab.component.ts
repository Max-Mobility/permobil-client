import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PushTrackerUserService } from '../../services';
import { Router } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';

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
        private userService: PushTrackerUserService
    ) { }

    ngOnInit() {
        this.userService.user.subscribe(user => {
            this._user = user;
        });
    }

    onConfigurationSelection(event, selection) {
        if (selection === 'SmartDrive + E2') {
            this._user.data.control_configuration = 'SmartDrive + E2';
        }
        else if (selection === 'SmartDrive + PushTracker') {
            this._user.data.control_configuration = 'SmartDrive + PushTracker';
        }
        else if (selection === 'SmartDrive + SwitchControl') {
            this._user.data.control_configuration = 'SmartDrive + SwitchControl';
        }
        this.userService.updateDataProperty('control_configuration', this._user.data.control_configuration);
        KinveyUser.update({ control_configuration: this._user.data.control_configuration });
        this._router.navigate(['/tabs/default']);
    }
}