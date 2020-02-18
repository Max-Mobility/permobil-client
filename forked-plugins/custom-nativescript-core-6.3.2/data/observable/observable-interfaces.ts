// Types
import { Observable } from "../observable";

export interface EventData {
    eventName: string;
    object: Observable;
}

export interface PropertyChangeData extends EventData {
    propertyName: string;
    value: any;
    oldValue?: any;
}