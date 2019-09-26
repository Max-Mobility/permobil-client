import { Common } from './wear-os-comms.common';
export declare class WearOsComms extends Common {
  constructor();

  /**
   * Bi-directional
   */
  static sendMessage(channel: string, msg: string): Promise<unknown>;
  static sendData(data: any): Promise<unknown>;

  /**
   * For wearable devices
   */
  static advertiseAsCompanion();

  /**
   * For phones
   */
  static findAvailableCompanions();
  static hasCompanion();
  static saveCompanion(address: string);
}
