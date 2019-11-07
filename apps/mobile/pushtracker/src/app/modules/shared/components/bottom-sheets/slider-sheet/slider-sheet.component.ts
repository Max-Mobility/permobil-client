import { Component } from '@angular/core';
import * as appSettings from '@nativescript/core/application-settings';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';

@Component({
  selector: 'slider-sheet',
  moduleId: module.id,
  templateUrl: 'slider-sheet.component.html'
})
export class SliderSheetComponent {
  CURRENT_THEME: string;
  APP_THEMES = APP_THEMES;
  title: string;
  description: string;
  SLIDER_VALUE;

  constructor(private _params: BottomSheetParams) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    const data = this._params.context;

    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.SLIDER_VALUE = data.SLIDER_VALUE;
    }
  }

  onSliderValueChange(args: any) {
    this.SLIDER_VALUE = Math.floor(args.object.value);
  }

  closeSliderSettingDialog() {
    this._params.closeCallback();
  }

  // When user selects the new data value we need to pass it back to the calling component.
  saveSliderSettingValue() {
    this._params.closeCallback({
      data: {
        SLIDER_VALUE: this.SLIDER_VALUE
      }
    });
  }
}
