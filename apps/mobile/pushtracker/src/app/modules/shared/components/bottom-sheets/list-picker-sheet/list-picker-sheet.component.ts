import { Component } from '@angular/core';
import { BottomSheetParams } from '@nativescript-community/ui-material-bottomsheet/angular';
import { ApplicationSettings as appSettings } from '@nativescript/core';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';

@Component({
  selector: 'list-picker-sheet',
  moduleId: module.id,
  templateUrl: 'list-picker-sheet.component.html'
})
export class ListPickerSheetComponent {
  CURRENT_THEME: string;
  APP_THEMES = APP_THEMES;
  title: string;
  description: string;
  primaryItems: any[];
  secondaryItems?: any[];
  listPickerNeedsSecondary: boolean;
  primaryIndex: number;
  secondaryIndex?: number;

  constructor(private _params: BottomSheetParams) {
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

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
