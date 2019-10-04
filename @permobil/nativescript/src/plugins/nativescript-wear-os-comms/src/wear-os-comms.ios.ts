import { Bluetooth } from 'nativescript-bluetooth';
import { Common } from './wear-os-comms.common';

import * as appSettings from 'tns-core-modules/application-settings';

export class WearOsComms extends Common {
  private static _bluetooth: Bluetooth = new Bluetooth();

  // device address
  private static pairedCompanion: string = null;

  // callbacks for when the wear os device sends us data
  private static _onConnectedCallback: any = null;
  private static _onDisconnectedCallback: any = null;
  private static _onMessageReceivedCallback: any = null;
  private static _onDataReceivedCallback: any = null;

  private static _debugOutputEnabled = false;

  constructor() {
    super();
  }

  public static setDebugOutput(enabled: boolean) {
    WearOsComms._debugOutputEnabled = enabled;
    WearOsComms._bluetooth.debug = WearOsComms._debugOutputEnabled;
  }

  public static registerMessageCallback(cb: any) {
    WearOsComms._onMessageReceivedCallback = cb;
  }

  public static registerDataCallback(cb: any) {
    WearOsComms._onDataReceivedCallback = cb;
  }

  public static registerConnectedCallback(cb: any) {
    WearOsComms._onConnectedCallback = cb;
  }

  public static registerDisconnectedCallback(cb: any) {
    WearOsComms._onDisconnectedCallback = cb;
  }

  public static clearCompanion() {
    WearOsComms.pairedCompanion = null;
    // save to the file system
    appSettings.setString(
      WearOsComms.APP_SETTINGS_COMPANION_KEY,
      ''
    );
  }

  public static saveCompanion(address: string) {
    if (address && address.length) {
      WearOsComms.pairedCompanion = address;
      // save to the file system
      appSettings.setString(
        WearOsComms.APP_SETTINGS_COMPANION_KEY,
        WearOsComms.pairedCompanion
      );
    } else {
      WearOsComms.clearCompanion();
    }
  }

  public static hasCompanion() {
    let hasCompanion = WearOsComms.pairedCompanion && WearOsComms.pairedCompanion.length && true;
    if (!hasCompanion) {
      try {
        // try to load from the file system
        WearOsComms.pairedCompanion = appSettings.getString(
          WearOsComms.APP_SETTINGS_COMPANION_KEY,
          ''
        );
        WearOsComms.log('loaded companion from app settings:', WearOsComms.pairedCompanion);
        hasCompanion = WearOsComms.pairedCompanion && WearOsComms.pairedCompanion.length && true;
      } catch (err) {
        WearOsComms.error('could not load companion from app settings:', err);
      }
    }
    WearOsComms.log('hasCompanion:', hasCompanion);
    return hasCompanion;
  }

  public static async connectCompanion(timeout: number = 10000) {
    if (!WearOsComms.hasCompanion()) return false;
    const savedAddress = await WearOsComms.getCompanion();
    // connect to the companion
    const didConnect = await new Promise(async (resolve, reject) => {
      const companion = await WearOsComms.scanForCompanion(savedAddress, 5) as any;
      if (companion === null) {
        reject(new Error(`could not find companion: ${savedAddress}`));
        return;
      }
      WearOsComms.log('found previously saved companion:', companion);
      const tid = setTimeout(() => {
        WearOsComms.error('timeout connecting to:', companion);
        reject(new Error('Connect timeout!'));
      }, timeout);
      WearOsComms.log('connecting to:', companion);
      await WearOsComms._bluetooth.connect({
        UUID: companion.identifier.UUIDString,
        onConnected: () => {
          clearTimeout(tid);
          WearOsComms.onConnected();
          resolve(true);
        },
        onDisconnected: () => {
          // WearOsComms.onDisconnected();
          clearTimeout(tid);
          // reject(new Error('Could not connect - disconnected event fired'));
        }
      }).catch((err) => {
        clearTimeout(tid);
        reject(err);
      });
    });
    return didConnect;
  }

  public static async disconnectCompanion() {
    if (!WearOsComms.hasCompanion()) return;
    const companion = await WearOsComms.getCompanion();
    try {
      // await WearOsComms.stopNotifying();
      await WearOsComms._bluetooth.disconnect({
        UUID: companion
      });
    } catch (err) {
      WearOsComms.error('disconnect companion error:', err);
    }
  }

  public static async sendMessage(channel: string, msg: string) {
    if (!WearOsComms.hasCompanion()) throw new Error('cannot sendMessage: no companion');
    const companion = await WearOsComms.getCompanion();
    // convert message to hexadecimal
    const encoded = WearOsComms.encodeString(`${channel}${WearOsComms.MessageDelimeter}${msg}`);
    const didWrite = await WearOsComms.write(companion, WearOsComms.MessageCharacteristicUUID, encoded);
    return didWrite;
  }

  public static async sendData(data: any) {
    if (!WearOsComms.hasCompanion()) throw new Error('cannot sendMessage: no companion');
    const companion = await WearOsComms.getCompanion();
    // convert message to hexadecimal
    const encoded = WearOsComms.encodeData(data);
    const didWrite = await WearOsComms.write(companion, WearOsComms.DataCharacteristicUUID, encoded);
    return didWrite;
  }

  public static findAvailableCompanions(timeoutSeconds: number) {
    // scan for service and pass the resolve function argument to the
    // onCompanionDiscoveredCallback
    return new Promise(async (resolve, reject) => {
      try {
        const companions = [];
        await WearOsComms._bluetooth.startScanning({
          serviceUUIDs: [ WearOsComms.ServiceUUID ],
          seconds: timeoutSeconds,
          onDiscovered: (peripheral: any) => {
            WearOsComms.log('found peripheral', peripheral);
            companions.push(peripheral.device);
          },
          skipPermissionCheck: false
        });
        // resolve here if we've gotten through scanning and have not
        // found any devices through the callback
        resolve(companions);
      } catch (err) {
        WearOsComms.error('findAvailableCompanions error:', err);
        // resolve with no devices found
        resolve(null);
      }
    });
  }

  public static findAvailableCompanion(timeoutSeconds: number) {
    // scan for service and pass the resolve function argument to the
    // onCompanionDiscoveredCallback
    return new Promise(async (resolve, reject) => {
      try {
        await WearOsComms._bluetooth.startScanning({
          serviceUUIDs: [ WearOsComms.ServiceUUID ],
          seconds: timeoutSeconds,
          onDiscovered: (peripheral: any) => {
            WearOsComms.log('found peripheral', peripheral);
            WearOsComms._bluetooth.stopScanning();
            resolve(peripheral.device);
          },
          skipPermissionCheck: false
        });
        // resolve here if we've gotten through scanning and have not
        // found any devices through the callback
        resolve(null);
      } catch (err) {
        WearOsComms.error('findAvailableCompanion error:', err);
        // resolve with no devices found
        resolve(null);
      }
    });
  }

  private static scanForCompanion(companionUUID: string, timeoutSeconds: number): any {
    // scan for service and pass the resolve function argument to the
    // onCompanionDiscoveredCallback
    return new Promise(async (resolve, reject) => {
      try {
        await WearOsComms._bluetooth.startScanning({
          serviceUUIDs: [ WearOsComms.ServiceUUID ],
          seconds: timeoutSeconds,
          onDiscovered: (peripheral: any) => {
            WearOsComms.log('scan for companion found peripheral', peripheral);
            if (peripheral.UUID === companionUUID) {
              WearOsComms.log('found saved peripheral', peripheral);
              WearOsComms._bluetooth.stopScanning();
              resolve(peripheral.device);
            }
          },
          skipPermissionCheck: false
        });
        // resolve here if we've gotten through scanning and have not
        // found any devices through the callback
        resolve(null);
      } catch (err) {
        WearOsComms.error('findAvailableCompanion error:', err);
        // resolve with no devices found
        resolve(null);
      }
    });
  }

  /**
   * Private helper methods:
   */

  private static async onConnected() {
    try {
      WearOsComms.log('onConnected');
      // start notifying so we can send / receive data
      await WearOsComms.startNotifying();
      // now let people know
      WearOsComms._onConnectedCallback && WearOsComms._onConnectedCallback();
    } catch (err) {
      WearOsComms.error('onConnected error:', err);
      await WearOsComms.disconnectCompanion();
    }
  }

  private static async onDisconnected() {
    try {
      WearOsComms.log('onDisconnected');
      // now let people know
      WearOsComms._onDisconnectedCallback && WearOsComms._onDisconnectedCallback();
    } catch (err) {
      WearOsComms.error('onDisconnected error:', err);
    }
  }

  private static async onNotify(args: any) {
    try {
      WearOsComms.log('onNotify:', args);
      const characteristic = args.characteristic;
      const value = args.value;
      const device = args.device;
      if (characteristic === WearOsComms.MessageCharacteristicUUID) {
        const stringValue = String.fromCharCode.apply(null, value);
        const splits = stringValue.split(WearOsComms.MessageDelimeter);
        if (splits && splits.length > 1) {
          const path = splits[0];
          // recover original message in case it had delimeters in it
          const message = splits.slice(1).join(WearOsComms.MessageDelimeter);
          WearOsComms._onMessageReceivedCallback &&
            WearOsComms._onMessageReceivedCallback({ path, message, device });
        } else {
          WearOsComms.error('invalid message received:', stringValue);
        }
      } else if (characteristic === WearOsComms.DataCharacteristicUUID) {
        const data = new Uint8Array(value);
        WearOsComms._onDataReceivedCallback &&
          WearOsComms._onDataReceivedCallback({ data, device });
      } else {
        throw new Error('unkown characteristic notified!');
      }
    } catch (err) {
      WearOsComms.error('onNotify error:', err);
    }
  }

  private static async startNotifying() {
    if (!WearOsComms.hasCompanion()) return;
    const companion = await WearOsComms.getCompanion();
    WearOsComms.log('startNotifying');
    await WearOsComms._bluetooth.startNotifying({
      peripheralUUID: companion,
      serviceUUID: WearOsComms.ServiceUUID,
      characteristicUUID: WearOsComms.MessageCharacteristicUUID,
      onNotify: WearOsComms.onNotify
    });
    await WearOsComms._bluetooth.startNotifying({
      peripheralUUID: companion,
      serviceUUID: WearOsComms.ServiceUUID,
      characteristicUUID: WearOsComms.DataCharacteristicUUID,
      onNotify: WearOsComms.onNotify
    });
  }

  private static async stopNotifying() {
    try {
      if (!WearOsComms.hasCompanion()) return;
      const companion = await WearOsComms.getCompanion();
      WearOsComms.log('stopNotifying');
      await WearOsComms._bluetooth.stopNotifying({
        peripheralUUID: companion,
        serviceUUID: WearOsComms.ServiceUUID,
        characteristicUUID: WearOsComms.MessageCharacteristicUUID
      });
      await WearOsComms._bluetooth.stopNotifying({
        peripheralUUID: companion,
        serviceUUID: WearOsComms.ServiceUUID,
        characteristicUUID: WearOsComms.DataCharacteristicUUID
      });
    } catch (err) {
      WearOsComms.error('stopNotifying error:', err);
    }
  }

  private static async getCompanion() {
    let companion = null;
    if (WearOsComms.hasCompanion()) {
      companion = WearOsComms.pairedCompanion;
    } else {
      // scan for the right services
      const address = await WearOsComms.findAvailableCompanions(10) as string;
      if (address && address.length) {
        companion = address;
      }
    }
    return companion;
  }

  private static encodeData(d: any) {
    let encoded = null;
    if (d && d.length) {
      if ((typeof d) === 'string') {
        encoded = WearOsComms.encodeString(d);
      } else {
        encoded = '';
        for (let i = 0; i < d.length; i++) {
          encoded += '0x' + d.toString(16) + ',';
        }
        if (encoded.endsWith(',')) {
          // remove the last ','
          encoded = encoded.slice(0, -1);
        }
      }
    }
    WearOsComms.log('encoded: "' + encoded + '"');
    return encoded;
  }

  private static stringToUint(s: string) {
    const encoded = unescape(encodeURIComponent(s));
    const charList = encoded.split('');
    const uintArray = [];
    for (let i = 0; i < charList.length; i++) {
      uintArray.push(charList[i].charCodeAt(0));
    }
    WearOsComms.log('stringToUint:', uintArray);
    return new Uint8Array(uintArray);
  }

  private static encodeString(s: string) {
    return WearOsComms.stringToUint(s);
    /*
    // convert to hexadecimal string
    let encoded = '';
    for (let i = 0; i < s.length; i++) {
    encoded += '0x' + s.charCodeAt(i) + ',';
    }
    if (encoded.endsWith(',')) {
    // remove the last ','
    encoded = encoded.slice(0, -1);
    }
    WearOsComms.log('encoded: "' + encoded + '"');
    return encoded;
    */
  }

  private static async write(address: string, characteristic: string, value: any) {
    let didWrite = false;
    try {
      WearOsComms.log('sending\n',
                      '\taddress:', address,
                      '\tcharacteristic:', characteristic,
                      '\tvalue:', value
                     );
      // send the data to the companion
      await WearOsComms._bluetooth.write({
        peripheralUUID: address,
        serviceUUID: WearOsComms.ServiceUUID,
        characteristicUUID: characteristic,
        value: value
      });
      didWrite = true;
    } catch (err) {
      WearOsComms.error('error writing', err);
    }
    return didWrite;
  }

  private static log(...args) {
    if (WearOsComms._debugOutputEnabled)
      console.log('[ WearOsComms ]', ...args);
  }

  private static error(...args) {
    console.error('[ WearOsComms ]', ...args);
  }
}
