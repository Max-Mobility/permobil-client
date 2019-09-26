import { Common } from './wear-os-comms.common';
export declare class WearOsComms extends Common {
  constructor();

  /**
   * Bi-directional
   */
  static sendMessage(channel: string, msg: string): Promise<unknown>;
  static sendData(data: any): Promise<unknown>;

  static registerConnectedCallback(cb: any): void;
  static registerDisconnectedCallback(cb: any): void;
  static registerMessageCallback(cb: any): void;
  static registerDataCallback(cb: any): void;

  /**
   * For wearable devices
   */
  static advertiseAsCompanion();

  /**
   * For phones
   */
  static findAvailableCompanions(timeoutSeconds: number): Promise<string>;
  static hasCompanion(): boolean;
  static saveCompanion(address: string);
  static connectCompanion();
  static disconnectCompanion();
}
