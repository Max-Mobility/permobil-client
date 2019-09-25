import { Bluetooth } from 'nativescript-bluetooth';
import { Common } from './wear-os-comms.common';

export class WearOsComms extends Common {
  private static _bluetooth: Bluetooth = new Bluetooth();

  // device address
  private static pairedCompanion: string = null;

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

  public static findAvailableCompanions(timeoutSeconds: number) {
    // scan for service and pass the resolve function argument to the
    // onCompanionDiscoveredCallback
    return new Promise(async (resolve, reject) => {
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
      const address = await WearOsComms.findAvailableCompanions(1) as string;
      if (address && address.length) {
        companion = address;
      }
    }
    return companion;
  }

  private static encodeData(d: any) {
    let encoded = '';
    if (d && d.length) {
      if ((typeof d) === 'string') {
        encoded = WearOsComms.encodeString(d);
      } else {
        for (let i = 0; i < d.length; i++) {
          encoded += '0x' + d.toString(16);
        }
      }
    }
    return encoded;
  }

  private static encodeString(s: string) {
    // convert to hexadecimal string
    let encoded = '';
    for (let i = 0; i < s.length; i++) {
      encoded += '0x' + s.charCodeAt(i);
    }
    return encoded;
  }

  private static async send(characteristic: string, encoded: string) {
    return new Promise(async (resolve, reject) => {
      try {
        // state variables
        let didSend = false;
        // get the companion
        const companion = await WearOsComms.getCompanion();
        // connect to the companion
        WearOsComms._bluetooth.connect({
          UUID: companion,
          onConnected: async (peripheral: any) => {
            // send the data to the companion
            await WearOsComms._bluetooth.write({
              peripheralUUID: companion,
              serviceUUID: WearOsComms.ServiceUUID,
              characteristicUUID: characteristic,
              value: encoded
            });
            // update the state variables
            didSend = true;
            // disconnect from the companion
            await WearOsComms._bluetooth.disconnect({
              UUID: companion
            });
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

  public static async sendMessage(channel: string, msg: string) {
    // convert message to hexadecimal
    const encoded = WearOsComms.encodeString(`${channel}/${msg}`);
    await WearOsComms.send(WearOsComms.MessageCharacteristicUUID, encoded);
  }

  public static async sendData(data: any) {
    // convert message to hexadecimal
    const encoded = WearOsComms.encodeData(data);
    await WearOsComms.send(WearOsComms.DataCharacteristicUUID, encoded);
  }
}
