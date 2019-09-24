import { Bluetooth } from 'nativescript-bluetooth';
import { Common } from './wear-os-comms.common';

export class WearOsComms extends Common {
  private static _bluetooth: Bluetooth = new Bluetooth();

  // device address
  private static pairedCompanion: string = null;

  private static ServiceUUID: string = "";

  constructor() {
    super();
  }

  public static saveCompanion(address: string) {
    if (address !== null) {
      WearOsComms.pairedCompanion = address;
    }
  }

  public static hasCompanion() {
    return WearOsComms.pairedCompanion !== null;
  }

  public static async findAvailableCompanions(timeoutSeconds: number) {
    // scan for service and pass the resolve function argument to the
    // onCompanionDiscoveredCallback
    const promise = await new Promise(async (resolve, reject) => {
      try {
        await WearOsComms._bluetooth.startScanning({
          serviceUUIDs: [ WearOsComms.ServiceUUID ],
          seconds: timeoutSeconds,
          onDiscovered: (peripheral: any) => {
            WearOsComms._bluetooth.stopScanning();
            resolve(peripheral.UUID);
          },
          skipPermissionCheck: false
        });
        // resolve here if we've gotten through scanning and have not
        // found any devices through the callback
        resolve(null);
      } catch (err) {
        console.error('findAvailableCompanions error:', err);
        // resolve with no devices found
        resolve(null);
      }
    });
  }

  private static async getCompanion() {
    let companion = null;
    if (WearOsComms.hasCompanion()) {
      companion = WearOsComms.pairedCompanion;
    } else {
      // scan for the right services
      const address = await WearOsComms.findAvailableCompanions(1);
      if (address && address.length) {
        companion = address;
      }
    }
    return companion;
  }

  public static async sendMessage(channel: string, msg: string) {
    return new Promise(async (resolve, reject) => {
      try {
        // state variables
        let didSend = false;
        // get the companion
        const companion = await WearOsComms.getCompanion();
        // connect to the companion
        WearOsComms._bluetooth.connect({
          UUID: companion,
          onConnected: (peripheral: any) => {
            // TODO: send the data to the companion
            // TODO: disconnect from the companion
          },
          onDisconnected: (peripheral: any) => {
            if (didSend) {
              resolve();
            } else {
              reject('failed to send');
            }
          }
        });
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
