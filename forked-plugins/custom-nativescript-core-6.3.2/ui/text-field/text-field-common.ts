import { booleanConverter, CSSType, EditableTextBase, Property } from "../editable-text-base";
import { TextField as TextFieldDefinition } from "../text-field";

export * from "../editable-text-base";

@CSSType("TextField")
export class TextFieldBase extends EditableTextBase implements TextFieldDefinition {
    public static returnPressEvent = "returnPress";
    public secure: boolean;
}

TextFieldBase.prototype.recycleNativeView = "auto";

export const secureProperty = new Property<TextFieldBase, boolean>({ name: "secure", defaultValue: false, valueConverter: booleanConverter });
secureProperty.register(TextFieldBase);
