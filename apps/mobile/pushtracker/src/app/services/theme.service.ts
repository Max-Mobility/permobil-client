import { Injectable } from '@angular/core';
import * as appSettings from '@nativescript/core/application-settings';
import { BehaviorSubject, Observable } from 'rxjs';
import { APP_THEMES, STORAGE_KEYS } from '../enums';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme: BehaviorSubject<string>;
  public theme: Observable<string>;

  constructor() {
    this._theme = new BehaviorSubject<string>(
      appSettings.getString(STORAGE_KEYS.APP_THEME, APP_THEMES.DEFAULT)
    );
    this.theme = this._theme.asObservable();
  }

  updateTheme(theme: string) {
    this._theme.next(theme);
  }
}
