import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  ApplicationSettings as appSettings,
  isAndroid,
  TextField
} from '@nativescript/core';
import { setTimeout } from '@nativescript/core/timer';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';

declare const IQKeyboardManager: any;

@Component({
  selector: 'textfield-sheet',
  moduleId: module.id,
  templateUrl: 'textfield-sheet.component.html'
})
export class TextFieldSheetComponent {
  CURRENT_THEME: string;
  APP_THEMES = APP_THEMES;
  values: string[] = [];
  title: string = '';
  description: string = '';
  text: string = '';
  prefix: string = '';
  suffix: string = '';
  keyboardType;

  @ViewChild('textField', { static: false })
  textField: ElementRef;

  constructor(private _params: BottomSheetParams) {
    if (!isAndroid) {
      const iqKeyboard = IQKeyboardManager.sharedManager();
      iqKeyboard.enable = false;
    }

    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );

    const data = this._params.context;
    if (data) {
      this.title = data.title;
      this.description = data.description;
      this.text = data.text || '';
      this.prefix = data.prefix || '';
      this.suffix = data.suffix || '';
      this.keyboardType = data.keyboardType;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.textField) (this.textField.nativeElement as TextField).focus();
      // Move cursor to end of text field
      if (isAndroid) {
        android.text.Selection.setSelection(
          this.textField.nativeElement.android.getText(),
          this.textField.nativeElement.android.length()
        );
      }
    }, 100);
  }

  closeSheet() {
    if (!isAndroid) {
      const iqKeyboard = IQKeyboardManager.sharedManager();
      iqKeyboard.enable = true;
    }
    this._params.closeCallback();
  }

  onTextChange(args) {
    // returnPress event will be triggered when user submits a value
    const textField: TextField = <TextField>args.object;
    // Gets or sets the input text.
    this.text = textField.text;
  }

  onReturnPress(args) {
    this.onTextChange(args);
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
