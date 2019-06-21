import {
  Common,
  spinBarColorProperty,
  rimColorProperty,
  barColorProperty
} from './animated-circle.common';
import { Color } from 'tns-core-modules/color';
import { View } from 'tns-core-modules/ui/core/view';

declare const at;

export class AnimatedCircle extends Common {
  private _android: any;
  // private _layout: android.widget.LinearLayout;

  private _layout: android.widget.RelativeLayout; // android.support.constraint.ConstraintLayout;
  private _androidViewId: number;
  private _childViews: Map<number, View>;
  private _progress: number;
  private _animateFrom: number;
  private _animationDuration = 1000;
  private _animated: boolean;
  private _maxValue = 100;
  private _barColor = new Color('#3D8FF4');
  private _barWidth: number;
  private _rimColor = new Color('#FF5722');
  private _rimWidth = 5;
  private _spinBarColor = new Color('green');
  private _startAngle: number;
  private _text = '';
  private _textColor = new Color('orange');
  private _textSize = 28 * 10;

  clockwise = true;
  fillColor: any;

  constructor() {
    super();
  }

  createNativeView() {
    this._android = new at.grabner.circleprogress.CircleProgressView(
      this._context,
      null
    );
    // Using a LinearLayout to add child items
    this._layout = new android.widget.RelativeLayout(this._context);
    if (!this._androidViewId) {
      this._androidViewId = android.view.View.generateViewId();
    }
    this._layout.setId(this._androidViewId);
    this._layout.setVerticalGravity(
      android.widget.RelativeLayout.CENTER_IN_PARENT
    );
    // this._layout.setOrientation(android.widget.LinearLayout.VERTICAL);
    this._layout.setGravity(android.view.Gravity.CENTER);
    this._layout.setLayoutParams(
      new android.view.ViewGroup.LayoutParams(
        android.view.ViewGroup.LayoutParams.FILL_PARENT,
        android.view.ViewGroup.LayoutParams.FILL_PARENT
      )
    );
    this._layout.addView(this._android);

    return this._layout;
  }

  initNativeView() {
    this._android.setAutoTextSize(false);
    this._android.setBarStrokeCap(android.graphics.Paint.Cap.ROUND);
    this._android.setTextMode(at.grabner.circleprogress.TextMode.TEXT);
    this._android.setShowTextWhileSpinning(true);
    this._android.setTextScale(1.1);
    this._android.setTextSize(300);
    this._android.setUnitVisible(false);
    this._updateAnimatedCircle();
  }

  public spin() {
    this.android.spin();
  }

  public stopSpinning() {
    this.android.stopSpinning();
  }

  public disposeNativeView() {
    super.disposeNativeView();
  }

  get _childrenCount(): number {
    return this.content ? 1 : 0;
  }
  _onContentChanged(oldView: View, newView: View) {
    //
  }
  _addChildFromBuilder(name: string, value: any) {
    if (value instanceof View) {
      this.content = value;
    }
  }
  public eachChildView(callback: (child: View) => boolean) {
    const content = this.content;
    if (content) {
      callback(content);
    }
  }

  onLoaded(): void {
    super.onLoaded();
    if (this._childViews && this._childViews.size) {
      this._childViews.forEach(value => {
        if (!value.parent) {
          this._addView(value);
          this._layout.addView(value.nativeView);
        }
      });
    }
    this._android.setOuterContourSize(0);
    this._android.setInnerContourSize(0);
  }

  get android() {
    return this._android;
  }

  set progress(value: number) {
    this._progress = Number(value);
    this._updateAnimatedCircle();
  }

  get progress(): number {
    return this._progress;
  }

  set animateFrom(value: number) {
    this._animateFrom = Number(value);
    this._updateAnimatedCircle();
  }

  get animateFrom(): number {
    return this._animateFrom;
  }

  set animationDuration(value: number) {
    this._animationDuration = Number(value);
    this._updateAnimatedCircle();
  }

  get animationDuration(): number {
    return this._animationDuration;
  }

  set animated(value: boolean) {
    this._animated = Boolean(value);
    this._updateAnimatedCircle();
  }

  get animated(): boolean {
    return this._animated;
  }

  set maxValue(value: number) {
    this._maxValue = Number(value);
    this._updateAnimatedCircle();
  }

  get maxValue(): number {
    return this._maxValue;
  }

  get rimColor(): Color {
    return this._rimColor;
  }
  set rimColor(value: Color) {
    this._rimColor = value;
    this._updateAnimatedCircle();
  }
  get barColor(): Color {
    return this._barColor;
  }
  set barColor(value: Color) {
    this._barColor = value;
    this._updateAnimatedCircle();
  }
  set spinBarColor(value: any) {
    this._spinBarColor = value;
    this._updateAnimatedCircle();
  }
  get spinBarColor() {
    return this._spinBarColor;
  }

  [rimColorProperty.setNative](value: any) {
    this._rimColor = value;
    this._updateAnimatedCircle();
  }

  [rimColorProperty.getDefault]() {
    return this._rimColor;
  }

  [barColorProperty.setNative](value: any) {
    this._barColor = value;
    this._updateAnimatedCircle();
  }

  [barColorProperty.getDefault]() {
    return this._barColor;
  }

  [spinBarColorProperty.setNative](value: any) {
    this._spinBarColor = value;
    this._updateAnimatedCircle();
  }

  [spinBarColorProperty.getDefault]() {
    return this._spinBarColor;
  }

  set rimWidth(value: number) {
    this._rimWidth = Number(value);
    this._updateAnimatedCircle();
  }

  get rimWidth() {
    return this._rimWidth;
  }

  set startAngle(value: number) {
    this._startAngle = Number(value);
    this._updateAnimatedCircle();
  }

  get startAngle() {
    return this._startAngle;
  }

  set barWidth(value: number) {
    this._barWidth = Number(value);
    this._updateAnimatedCircle();
  }

  get barWidth() {
    return this._barWidth;
  }

  set text(value: string) {
    this._text = value;
    this._updateAnimatedCircle();
  }

  get text() {
    return this.android.getText();
  }

  set textColor(value: string) {
    this._textColor = new Color(value);
    this._updateAnimatedCircle();
  }

  set textSize(value: number) {
    this._textSize = value * 10;
    this._updateAnimatedCircle();
  }

  get textSize() {
    return this.android.getTextSize();
  }

  private _updateAnimatedCircle(): void {
    if (this.android) {
      this.android.setText(this._text);
      this.android.setTextColor(this._textColor.argb);
      this.android.setTextSize(this._textSize);
      if (this.animated) {
        if (this.animateFrom) {
          this.android.setValueAnimated(
            this.animateFrom,
            this.progress,
            this.animationDuration
          );
        } else {
          if (!this._animationDuration) {
            this.android.setValueAnimated(this.progress);
          } else {
            this.android.setValueAnimated(
              this.progress,
              this.animationDuration
            );
          }
        }
      } else {
        this.android.setValue(this.progress);
      }
      this.android.setMaxValue(this.maxValue);
      if (this.rimColor) {
        this.android.setRimColor(this.rimColor.argb);
      }
      if (this.spinBarColor) {
        this.android.setSpinBarColor(this.spinBarColor.argb);
      }
      if (this.startAngle) {
        this.android.setStartAngle(this.startAngle);
      }
      if (this.barWidth) {
        this.android.setBarWidth(this.barWidth);
      } else {
        if (this.rimWidth) {
          this.android.setBarWidth(this.rimWidth);
        }
      }
      if (this.rimWidth) {
        this.android.setRimWidth(this.rimWidth);
      }
      if (this.barColor) {
        this.android.setBarColor([this.barColor.argb]);
      }
      if (this.fillColor) {
        this.android.setFillCircleColor(new Color(this.fillColor).argb);
      }

      this.android.setDirection(
        this.clockwise
          ? at.grabner.circleprogress.Direction.CW
          : at.grabner.circleprogress.Direction.CCW
      );
    }
  }
}
