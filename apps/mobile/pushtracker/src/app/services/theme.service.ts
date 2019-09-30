import { Injectable } from '@angular/core';
import { APP_THEMES, STORAGE_KEYS } from '../enums';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { BehaviorSubject, Observable } from 'rxjs';
import * as appSettings from 'tns-core-modules/application-settings';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme: BehaviorSubject<string>;
  public theme: Observable<string>;

  constructor() {
    this._theme = new BehaviorSubject<string>(
      appSettings.getString(
        STORAGE_KEYS.APP_THEME,
        APP_THEMES.DEFAULT
    ));
    this.theme = this._theme.asObservable();
  }

  updateTheme(theme: string) {
    this._theme.next(theme);
  }
}
