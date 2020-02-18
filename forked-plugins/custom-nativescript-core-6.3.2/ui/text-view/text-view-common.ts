import { EditableTextBase } from "../editable-text-base";
import { Property } from "../text-base";
import { TextView as TextViewDefinition } from "../text-view";

export class TextViewBase extends EditableTextBase implements TextViewDefinition {
  public maxLines: number;
}

export const maxLinesProperty = new Property<EditableTextBase, number>({ name: "maxLines", valueConverter: parseInt });
maxLinesProperty.register(EditableTextBase);
