export declare class Packet {
    static maxSize: number;
    private instance;
    static makeBoundData(bindingType: string, data: string): any;
    constructor(bytes?: any);
    initialize(bytes?: any): void;
    destroy(): void;
    toBuffer(): any;
    toString(): string;
    toUint8Array(): Uint8Array;
    makePacket(_type: any, subType: any, key: any, data: any): void;
    makeOTAPacket(device: string, startIndex: number, firmware: any): void;
    writableBuffer(): any;
    Type(newType?: any): any;
    SubType(newSubType?: any): any;
    data(key: string, value?: any): any;
    getPayload(): void;
    parse(): void;
    parseData(_: any): void;
    parseCommand(_: any): void;
    parseError(_: any): void;
    parseOTA(_: any): void;
}
export declare function bindingTypeToString(bindingType: any, bindingValue: any): any;
export declare function decimalToHex(d: any): string;
export declare function toString(data: any): string;
export declare function toUint8Array(data: any): Uint8Array;
export declare function makePacketData(_type: any, subtype: any, key: any, data: any): any;
export declare function bufferToHex(dataArray: any): any;
