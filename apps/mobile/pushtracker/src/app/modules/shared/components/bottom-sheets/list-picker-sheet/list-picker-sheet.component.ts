import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import * as appSettings from 'tns-core-modules/application-settings';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';

@Component({
  selector: 'list-picker-sheet',
  moduleId: module.id,
  templateUrl: 'list-picker-sheet.component.html'
})
export class ListPickerSheetComponent {
  savedTheme;
  title: string;
  description: string;
  primaryItems: any[];
  secondaryItems?: any[];
  listPickerNeedsSecondary: boolean;
  primaryIndex: number;
  secondaryIndex?: number;

  constructor(
    private _translateService: TranslateService,
    private _params: BottomSheetParams
  ) {
    console.log('params', this._params);

    const data = this._params.context;

    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.primaryItems = data.primaryItems;
      this.primaryIndex = data.primaryIndex;
      this.listPickerNeedsSecondary = data.listPickerNeedsSecondary;
    }
    // set the theme
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

  //   close() {
  //     this._params.closeCallback({
  //       has_agreed_to_user_agreement: this.has_agreed_to_user_agreement,
  //       has_read_privacy_policy: this.has_read_privacy_policy,
  //       consent_to_product_development: this.consent_to_product_development,
  //       consent_to_research: this.consent_to_research
  //     });
  //   }

  primaryIndexChanged(picker) {
    this.primaryIndex = picker.selectedIndex;
  }

  secondaryIndexChanged(picker) {
    this.secondaryIndex = picker.selectedIndex;
  }

  closeSheet() {
    this._params.closeCallback();
  }

  // When user selects the new data value we need to pass it back to the calling component.
  saveListPickerValue() {
    this._params.closeCallback({
      data: {
        primaryIndex: this.primaryIndex,
        secondaryIndex: this.secondaryIndex
      }
    });
  }
}
