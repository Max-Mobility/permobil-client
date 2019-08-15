import { Component, EventEmitter, Input, Output } from '@angular/core';
import { registerElement } from 'nativescript-angular/element-registry';
import { PropertyChangeData } from 'tns-core-modules/data/observable';
import { isAndroid } from 'tns-core-modules/platform';
import { ContentView } from 'tns-core-modules/ui/content-view';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { TextField } from 'tns-core-modules/ui/text-field';

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

  textfieldLoaded(args) {
    if (isAndroid) {
      const tf = args.object as TextField;
      tf.android.setBackgroundColor(android.graphics.Color.TRANSPARENT);
    }
  }

  onFocusTF(args) {
    const tf = args.object as TextField;
    const gl = tf.parent as GridLayout;
    const root = gl.parent as StackLayout;
    root.className = 'max-textbox-active';
  }

  onBlurTF(args) {
    const tf = args.object as TextField;
    const gl = tf.parent as GridLayout;
    const root = gl.parent as StackLayout;
    root.className = 'max-textbox';
  }
}

registerElement('MaxTextBox', () => {
  return ContentView;
});
