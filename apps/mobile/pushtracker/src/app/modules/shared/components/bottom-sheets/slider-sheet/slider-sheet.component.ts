import { Component } from '@angular/core';
import { Log } from '@permobil/core';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import * as appSettings from 'tns-core-modules/application-settings';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';

@Component({
  selector: 'slider-sheet',
  moduleId: module.id,
  templateUrl: 'slider-sheet.component.html'
})
export class SliderSheetComponent {
  savedTheme;
  title: string;
  description: string;
  SLIDER_VALUE;

  constructor(private _params: BottomSheetParams) {
    Log.D('Slider bottom sheet params', this._params);

    const data = this._params.context;

    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.SLIDER_VALUE = data.SLIDER_VALUE;
    }
    // set the theme
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

  onSliderValueChange(args: any) {
    this.SLIDER_VALUE = Math.floor(args.object.value);
  }

  //   close() {
  //     this._params.closeCallback({
  //       has_agreed_to_user_agreement: this.has_agreed_to_user_agreement,
  //       has_read_privacy_policy: this.has_read_privacy_policy,
  //       consent_to_product_development: this.consent_to_product_development,
  //       consent_to_research: this.consent_to_research
  //     });
  //   }

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
