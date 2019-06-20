import { Observable } from 'tns-core-modules/data/observable';
export declare class KeyboardService {
    private callBack;
    private activity;
    private keyboardActive;
    events: Observable;
    constructor();
    start(): void;
    stop(): void;
    private notifyKeyboardHeightChanged;
}
