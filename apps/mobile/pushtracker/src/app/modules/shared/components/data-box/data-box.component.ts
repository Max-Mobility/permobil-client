import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { subYears } from 'date-fns';
import { registerElement } from 'nativescript-angular/element-registry';
import {
  DateTimePicker,
  DateTimePickerStyle
} from 'nativescript-datetimepicker';
import { ContentView } from 'tns-core-modules/ui/content-view';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { TextField } from 'tns-core-modules/ui/text-field';
import { LoggingService } from '../../../../services';

@Component({
  selector: 'DataBox',
  moduleId: module.id,
  templateUrl: 'data-box.component.html',
  providers: [DatePipe]
})
export class DataBoxComponent extends TextField {
  @Input() dataValue: string;
  @Input() label: string;
  @Input() error: string;
  @Input() isDatePicker: boolean = false;
  @Output() dataValueChange = new EventEmitter<string | number>();
  @Output() tapEvent = new EventEmitter();

  constructor(
    private _translateService: TranslateService,
    private _logService: LoggingService
  ) {
    super();
  }

  onDataBoxTap(event) {
    if (this.isDatePicker === true) {
      this._showDatePicker(event);
    } else {
      this.tapEvent.emit();
    }
  }

  onFocusTF(args) {
    const tf = args.object as TextField;
    const gl = tf.parent as GridLayout;
    const root = gl.parent as StackLayout;
    root.className = 'data-box-active';
  }

  onBlurTF(args) {
    const tf = args.object as TextField;
    const gl = tf.parent as GridLayout;
    const root = gl.parent as StackLayout;
    root.className = 'data-box';
  }

  private _showDatePicker(args) {
    // return new Promise((resolve, reject) => {
    (args.object as StackLayout).className = 'data-box-active';

    const dateTimePickerStyle = DateTimePickerStyle.create(
      args.object as StackLayout
    );

    DateTimePicker.pickDate(
      {
        context: (args.object as StackLayout)._context,
        date: subYears(new Date(), 18),
        minDate: subYears(new Date(), 110),
        maxDate: new Date(),
        title: this._translateService.instant('general.birthday'),
        okButtonText: this._translateService.instant('general.ok'),
        cancelButtonText: this._translateService.instant('general.cancel'),
        locale: this._translateService.getDefaultLang()
      },
      dateTimePickerStyle
    )
      .then(result => {
        (args.object as StackLayout).className = 'data-box';

        if (result) {
          const date = new Date(result);
          const month = date.getUTCMonth() + 1;
          const day = date.getUTCDate();
          const year = date.getUTCFullYear();
          const dateFormatted = month + '/' + day + '/' + year;
          Log.D('Birthday formatted', dateFormatted);
          this.dataValue = dateFormatted; // set the formatted date to the Input()
          this.dataValueChange.emit(this.dataValue); // emit the updated Input value to the parent component
        }
      })
      .catch(err => {
        this._logService.logException(err);
        (args.object as StackLayout).className = 'data-box';
      });
    // });
  }

  private _showListPicker(args) {
    (args.object as StackLayout).className = 'data-box-active';
  }
}

registerElement('DataBox', () => {
  return ContentView;
});
