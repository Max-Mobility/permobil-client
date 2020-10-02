import { Component, EventEmitter, Input, Output } from '@angular/core';
import { registerElement } from '@nativescript/angular';
import {
  EventData,
  GridLayout,
  isAndroid,
  PropertyChangeData,
  StackLayout,
  TextField
} from '@nativescript/core';

@Component({
  selector: 'MaxTextBox',
  moduleId: module.id,
  templateUrl: 'max-text-box.component.html'
})
export class MaxTextBoxComponent extends TextField {
  @Input() text: string;
  @Input() label: string;
  @Input() error: string;
  @Input() isSecure = false;
  @Output() textChange = new EventEmitter<string>();
  @Output() textfieldLoadedEvent = new EventEmitter<EventData>();

  constructor() {
    super();
  }

  changeText(args: PropertyChangeData) {
    this.text = args.value;
    this.textChange.emit(this.text);
  }

  onReturnPress(args) {
    this.onBlurTF(args);
    this.dismissSoftInput();
  }

  textfieldLoaded(args: EventData) {
    if (isAndroid) {
      const tf = args.object as TextField;
      tf.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
    }
    this.textfieldLoadedEvent.emit(args);
  }

  setClassName(args, className: string) {
    const tf = args.object as TextField;
    const gl = tf.parent as GridLayout;
    const root = gl.parent as StackLayout;
    root.className = className;
  }

  onFocusTF(args) {
    this.setClassName(args, 'max-textbox-active');
  }

  onBlurTF(args) {
    this.setClassName(args, 'max-textbox');
  }
}

registerElement('MaxTextBox', () => {
  return require('@nativescript/core/ui/content-view').ContentView;
});
