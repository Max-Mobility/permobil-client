import { Component, OnInit } from '@angular/core';
import { Log } from '@permobil/core';

@Component({
  selector: 'profile',
  moduleId: module.id,
  templateUrl: './profile-tab.component.html'
})
export class ProfileTabComponent implements OnInit {
  coastTime: Array<string>;
  distance:  Array<string>;
  gender: Array<string>;
  birthday: Array<string>;
  weight: Array<String>;
  height: Array<string>;
  chairInfo: Array<string>;
  name: string;
  email: string;

  constructor() {
    this.coastTime = ['100', '200'];
    this.distance = ['3.0', '4.0'];
    this.gender = ['Male', 'Female'];
    this.birthday = ['290 AC', '291 AC'];
    this.weight = ['115 lb', '130 lb'];
    this.height = ['5\'1\"', '5\'5\"'];
    this.chairInfo = ['1', '2'];
    this.name = 'Bran Stark';
    this.email = 'email@permobil.com';
  }

  ngOnInit(): void {
    Log.D('profile-tab.component ngOnInit');
  }
}
