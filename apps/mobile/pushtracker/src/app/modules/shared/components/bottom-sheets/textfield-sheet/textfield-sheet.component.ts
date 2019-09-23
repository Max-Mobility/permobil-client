import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import * as appSettings from 'tns-core-modules/application-settings';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';
import { TextField } from 'tns-core-modules/ui/text-field/text-field';

@Component({
  selector: 'textfield-sheet',
  moduleId: module.id,
  templateUrl: 'textfield-sheet.component.html'
})
export class TextFieldSheetComponent {
  savedTheme;
  title: string;
  description: string;
  text: string = '';
  suffix: string = '';

  constructor(
    private _params: BottomSheetParams
  ) {
    const data = this._params.context;
    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.text = data.text;
      this.suffix = data.suffix;
    }

    // set the theme
    this.savedTheme = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

  closeSheet() {
    this._params.closeCallback();
  }

  onReturnPress(args) {
    // returnPress event will be triggered when user submits a value
    const textField: TextField = <TextField>args.object;
    // Gets or sets the input text.
    this.text = textField.text;
  }

  // When user selects the new data value we need to pass it back to the calling component.
  saveTextFieldValue() {
    this._params.closeCallback({
      data: {
        text: this.text
      }
    });
  }
}
