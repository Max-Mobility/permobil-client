import { Common } from './wear-os-comms.common';
export declare class WearOsComms extends Common {
  constructor();
  static sendMessage(channel: string, msg: string): Promise<unknown>;
  static sendData(data: any): Promise<unknown>;
}
