import { Bluetooth } from 'nativescript-bluetooth';
import { Common } from './wear-os-comms.common';

export class WearOsComms extends Common {
  private static _bluetooth: Bluetooth = new Bluetooth();
  constructor() {
    super();
  }

  public static sendMessage(channel: string, msg: string) {
    return new Promise((resolve, reject) => {
      try {
        // this._bluetooth.enable();
        // TODO: figure out how the bluetooth message send will work here
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  public static sendData(data: any) {
    return new Promise((resolve, reject) => {
      try {
        // TODO: figure out how the bluetooth data part send will work here
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
