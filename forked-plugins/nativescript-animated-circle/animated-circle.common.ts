import { ContentView } from 'tns-core-modules/ui/content-view';
import { Color } from 'tns-core-modules/color';
import {
  View,
  Style,
  CssProperty,
  InheritedCssProperty
} from 'tns-core-modules/ui/core/view';

export const rimColorProperty = new InheritedCssProperty<Style, Color>({
  name: 'rimColor',
  cssName: 'rim-color',
  equalityComparer: Color.equals,
  valueConverter: value => new Color(value)
});
export const barColorProperty = new InheritedCssProperty<Style, Color>({
  name: 'barColor',
  cssName: 'bar-color',
  equalityComparer: Color.equals,
  valueConverter: value => new Color(value)
});

export class Common extends ContentView {
  constructor() {
    super();
  }
}
// register after class definition or we'll get an exception according
// to
// https://docs.nativescript.org/core-concepts/properties#registering-the-property

// augmenting style definitino so it includes rimColor and barColor
declare module 'tns-core-modules/ui/styling/style' {
  interface Style {
    rimColor: Color;
    barColor: Color;
  }
}
// defines 'rimColor' property on Style class
rimColorProperty.register(Style);
// defines 'barColor' property on Style class
barColorProperty.register(Style);
