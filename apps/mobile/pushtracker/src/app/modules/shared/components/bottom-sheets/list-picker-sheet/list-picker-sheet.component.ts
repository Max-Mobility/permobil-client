import { Component } from '@angular/core';
import { Log } from '@permobil/core';
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

  constructor(private _params: BottomSheetParams) {
    const data = this._params.context;
    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.primaryItems = data.primaryItems;
      this.primaryIndex = data.primaryIndex;
      this.secondaryItems = data.secondaryItems;
      this.secondaryIndex = data.secondaryIndex;
      this.listPickerNeedsSecondary = data.listPickerNeedsSecondary
        ? data.listPickerNeedsSecondary
        : false;
    }
    // set the theme
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

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
