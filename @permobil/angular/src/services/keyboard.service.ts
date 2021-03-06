import { Injectable } from '@angular/core';
import { Application, fromObject, isIOS, Observable } from '@nativescript/core';

@Injectable()
export class KeyboardService {
  private callBack: android.view.ViewTreeObserver.OnGlobalLayoutListener;
  private activity;
  private keyboardActive: boolean;
  events: Observable;

  constructor() {
    if (isIOS) {
      throw new Error(
        'Currently no implementation for iOS; should only be constructed for Android.'
      );
    }
    this.activity =
      Application.android.startActivity |
      Application.android.foregroundActivity;
    this.events = fromObject({});
  }

  start() {
    const rootView = this.activity.getWindow().getDecorView().getRootView();
    this.callBack = new android.view.ViewTreeObserver.OnGlobalLayoutListener({
      onGlobalLayout: (): void => {
        const rect = new android.graphics.Rect();
        rootView.getWindowVisibleDisplayFrame(rect);
        const screenHeight = rootView.getHeight();
        const keyboardHeight = screenHeight - (rect.bottom - rect.top);
        const orientation = this.activity.getResources().getConfiguration()
          .orientation;
        if (keyboardHeight > screenHeight / 3) {
          this.keyboardActive = true;
          this.notifyKeyboardHeightChanged(keyboardHeight, orientation);
        } else {
          if (this.keyboardActive) {
            this.notifyKeyboardHeightChanged(0, orientation);
            this.keyboardActive = false;
          }
        }
      }
    });
    rootView.getViewTreeObserver().addOnGlobalLayoutListener(this.callBack);
  }

  stop() {
    const rootView = this.activity.getWindow().getDecorView().getRootView();
    rootView.getViewTreeObserver().removeGlobalOnLayoutListener(this.callBack);
  }

  private notifyKeyboardHeightChanged(height, orientation) {
    this.events.notify({
      eventName: 'heightChanged',
      object: fromObject({
        height,
        orientation
      })
    });
  }
}
