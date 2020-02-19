import { CSSType, EventData, View } from "../core/view";
import { CreateViewEventData, Placeholder as PlaceholderDefinition } from "../placeholder";

@CSSType("Placeholder")
export class Placeholder extends View implements PlaceholderDefinition {
    public static creatingViewEvent = "creatingView";

    public createNativeView() {
        const args = <CreateViewEventData>{ eventName: Placeholder.creatingViewEvent, object: this, view: undefined, context: this._context };
        this.notify(args);

        return <android.view.View>args.view;
    }
}
export interface Placeholder {
    on(eventNames: string, callback: (args: EventData) => void);
    on(event: "creatingView", callback: (args: CreateViewEventData) => void);
}
