import { Component, ViewChild, ElementRef } from '@angular/core';
import { Log } from '@permobil/core';
import { BottomSheetParams } from 'nativescript-material-bottomsheet/angular';
import * as appSettings from 'tns-core-modules/application-settings';
import { TextField } from 'tns-core-modules/ui/text-field';
import { APP_THEMES, STORAGE_KEYS } from '../../../../../enums';
import { isAndroid } from 'tns-core-modules/platform';

@Component({
  selector: 'textfield-sheet',
  moduleId: module.id,
  templateUrl: 'textfield-sheet.component.html'
})
export class TextFieldSheetComponent {
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
    this._params.closeCallback();
  }

  onTextChange(args) {
    // returnPress event will be triggered when user submits a value
    const textField: TextField = <TextField>args.object;
    // Gets or sets the input text.
    this.text = textField.text;
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
