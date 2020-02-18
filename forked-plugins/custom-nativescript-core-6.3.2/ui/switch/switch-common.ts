import { Color } from "../../color";
import { booleanConverter, CSSType, Property, View } from "../core/view";
import { Switch as SwitchDefinition } from "../switch";

export * from "../core/view";

@CSSType("Switch")
export class SwitchBase extends View implements SwitchDefinition {
    public static checkedChangeEvent = "checkedChange";

    public checked: boolean;
    public offBackgroundColor: Color;

    _onCheckedPropertyChanged(newValue: boolean) {
        //
    }
}

SwitchBase.prototype.recycleNativeView = "auto";

function onCheckedPropertyChanged(switchBase: SwitchBase, oldValue: boolean, newValue: boolean) {
    switchBase._onCheckedPropertyChanged(newValue);
}

export const checkedProperty = new Property<SwitchBase, boolean>({ name: "checked", defaultValue: false, valueConverter: booleanConverter, valueChanged: onCheckedPropertyChanged });
checkedProperty.register(SwitchBase);

export const offBackgroundColorProperty = new Property<SwitchBase, Color>({ name: "offBackgroundColor", equalityComparer: Color.equals, valueConverter: (v) => new Color(v) });
offBackgroundColorProperty.register(SwitchBase);
