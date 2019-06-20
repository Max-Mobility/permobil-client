import { Common } from './animated-circle.common';
import { Color } from 'tns-core-modules/color';
export declare class AnimatedCircle extends Common {
    private _ios;
    private _label;
    private _text;
    constructor();
    createNativeView(): any;
    initNativeView(): void;
    onLayout(left: any, top: any, right: any, bottom: any): void;
    readonly ios: any;
    progress: number;
    rimColor: Color;
    barColor: Color;
    clockwise: boolean;
    rimWidth: number;
    startAngle: number;
    endAngle: number;
    text: string;
    textColor: string | UIColor;
    textSize: number;
}
