import { Button as ButtonDefinition } from "../button";
import { booleanConverter, CSSType, TextBase } from "../text-base";

export * from "../text-base";

@CSSType("Button")
export abstract class ButtonBase extends TextBase implements ButtonDefinition {
    public static tapEvent = "tap";

    get textWrap(): boolean {
        return this.style.whiteSpace === "normal";
    }
    set textWrap(value: boolean) {
        if (typeof value === "string") {
            value = booleanConverter(value);
        }

        this.style.whiteSpace = value ? "normal" : "nowrap";
    }
}

ButtonBase.prototype.recycleNativeView = "auto";
