import { ContentView } from 'tns-core-modules/ui/content-view';
import { Color } from 'tns-core-modules/color';
import { Style, InheritedCssProperty } from 'tns-core-modules/ui/core/view';
export declare const rimColorProperty: InheritedCssProperty<Style, Color>;
export declare const barColorProperty: InheritedCssProperty<Style, Color>;
export declare class Common extends ContentView {
  constructor();
}
declare module 'tns-core-modules/ui/styling/style' {
  interface Style {
    rimColor: Color;
    barColor: Color;
  }
}
