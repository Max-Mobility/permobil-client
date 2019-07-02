import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';
import { LoggingService } from '../../services';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  coastTime: Array<string>;
  distance: Array<string>;
  gender: Array<string>;
  birthday: Array<string>;
  weight: Array<String>;
  height: Array<string>;
  chairInfo: Array<string>;
  name: string;
  email: string;

  constructor(private _logService: LoggingService) {
    this.coastTime = ['100', '200'];
    this.distance = ['3.0', '4.0'];
    this.gender = ['Male', 'Female'];
    this.birthday = ['290 AC', '291 AC'];
    this.weight = ['115 lb', '130 lb'];
    this.height = ['5\'1"', '5\'5"'];
    this.chairInfo = ['1', '2'];
    this.name = 'Bran Stark';
    this.email = 'email@permobil.com';
  }

  ngOnInit() {
    this._logService.logBreadCrumb('profile-tab.component ngOnInit');
  }

  onHelpTap() {
    Log.D('help action item tap');
  }

  onSettingsTap() {
    Log.D('setting action item tap');
  }
}
