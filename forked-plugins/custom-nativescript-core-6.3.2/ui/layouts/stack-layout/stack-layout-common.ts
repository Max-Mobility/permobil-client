import { CSSType, isIOS, LayoutBase, makeParser, makeValidator, Property } from "../layout-base";
import { Orientation, StackLayout as StackLayoutDefinition } from "../stack-layout";

export * from "../layout-base";

@CSSType("StackLayout")
export class StackLayoutBase extends LayoutBase implements StackLayoutDefinition {
    public orientation: Orientation;
}

StackLayoutBase.prototype.recycleNativeView = "auto";

const converter = makeParser<Orientation>(makeValidator("horizontal", "vertical"));

export const orientationProperty = new Property<StackLayoutBase, Orientation>({ name: "orientation", defaultValue: "vertical", affectsLayout: isIOS, valueConverter: converter });
orientationProperty.register(StackLayoutBase);
