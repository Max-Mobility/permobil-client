﻿import { CSSType, Property, View } from "../core/view";
import { HtmlView as HtmlViewDefinition } from "../html-view";

export * from "../core/view";

@CSSType("HtmlView")
export class HtmlViewBase extends View implements HtmlViewDefinition {
    public html: string;
}

HtmlViewBase.prototype.recycleNativeView = "auto";

// TODO: Can we use Label.ios optimization for affectsLayout???
export const htmlProperty = new Property<HtmlViewBase, string>({ name: "html", defaultValue: "", affectsLayout: true });
htmlProperty.register(HtmlViewBase);