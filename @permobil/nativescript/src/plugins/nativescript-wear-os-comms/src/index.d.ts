import { Common } from './wear-os-comms.common';
export declare class WearOsComms extends Common {
  constructor();

  static setDebugOutput(enabled: boolean): void;

  /**
   * Bi-directional
   */
  static sendMessage(channel: string, msg: string): Promise<boolean>;
  static sendData(data: any): Promise<boolean>;

  static registerConnectedCallback(cb: any): void;
  static registerDisconnectedCallback(cb: any): void;
  static registerMessageCallback(cb: any): void;
  static registerDataCallback(cb: any): void;

  // android only
  static findDevicesConnected(timeout?: number): Promise<any>;
  static findDevicesWithApp(appCapability: string): Promise<any>;

  /**
   * For wearable devices
   */
  static advertiseAsCompanion();
  static stopAdvertisingAsCompanion();
  static openAppInStoreOnPhone(appUri: string);

  /**
   * For phones
   */
  static findAvailableCompanion(timeoutSeconds: number): Promise<any>;
  static findAvailableCompanions(timeoutSeconds: number): Promise<any[]>;
  static hasCompanion(): boolean;
  static clearCompanion();
  static saveCompanion(address: string);
  static connectCompanion(timeout: number = 10000);
  static disconnectCompanion();
  // android only
  static openAppInPlayStoreOnWatch(appUri: string);
}
