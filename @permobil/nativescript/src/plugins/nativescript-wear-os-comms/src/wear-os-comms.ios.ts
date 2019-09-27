import { Bluetooth } from 'nativescript-bluetooth';
import { Common } from './wear-os-comms.common';

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

  public static saveCompanion(address: string) {
    if (address !== null) {
      WearOsComms.pairedCompanion = address;
    }
  }

  public static hasCompanion() {
    return WearOsComms.pairedCompanion !== null;
  }

  public static async connectCompanion() {
    if (!WearOsComms.hasCompanion()) return;
    const companion = await WearOsComms.getCompanion();
    try {
      // connect to the companion
      await WearOsComms._bluetooth.connect({
        UUID: companion,
        onConnected: WearOsComms.onConnected,
        onDisconnected: WearOsComms.onDisconnected
      });
    } catch (err) {
      console.error('[WearOsComms] connect companion error:', err);
      WearOsComms.disconnectCompanion();
    }
  }

  public static async disconnectCompanion() {
    if (!WearOsComms.hasCompanion()) return;
    const companion = await WearOsComms.getCompanion();
    try {
      await WearOsComms._bluetooth.disconnect({
        UUID: companion
      });
    } catch (err) {
      console.error('[WearOsComms] disconnect companion error:', err);
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
        await WearOsComms._bluetooth.startScanning({
          serviceUUIDs: [ WearOsComms.ServiceUUID ],
          seconds: timeoutSeconds,
          onDiscovered: (peripheral: any) => {
            console.log('found peripheral', peripheral);
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

  /**
   * Private helper methods:
   */

  private static async onConnected(args: any) {
    try {
      console.log('[WearOsComms] onConnected');
      // start notifying so we can send / receive data
      await WearOsComms.startNotifying();
      // now let people know
      WearOsComms._onConnectedCallback && WearOsComms._onConnectedCallback();
    } catch (err) {
      console.error('[WearOsComms] onConnected error:', err);
      await WearOsComms.disconnectCompanion();
    }
  }

  private static async onDisconnected(args: any) {
    try {
      console.log('[WearOsComms] onDisconnected');
      // stop notifying
      await WearOsComms.stopNotifying();
      // now let people know
      WearOsComms._onDisconnectedCallback && WearOsComms._onDisconnectedCallback();
    } catch (err) {
      console.error('[WearOsComms] onDisconnected error:', err);
    }
  }

  private static async onNotify(args: any) {
    try {
      console.log('[WearOsComms] onNotify:', args);
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
          console.error('invalid message received:', stringValue);
        }
      } else if (characteristic === WearOsComms.DataCharacteristicUUID) {
        const data = new Uint8Array(value);
        WearOsComms._onDataReceivedCallback &&
          WearOsComms._onDataReceivedCallback({ data, device });
      } else {
        throw new Error('unkown characteristic notified!');
      }
    } catch (err) {
      console.error('[WearOsComms] onNotify error:', err);
    }
  }

  private static async startNotifying() {
    if (!WearOsComms.hasCompanion()) return;
    const companion = await WearOsComms.getCompanion();
    console.log('[WearOsComms] startNotifying');
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
    console.log('[WearOsComms] stopNotifying');
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
      console.error('[WearOsComms] stopNotifying error:', err);
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
    console.log('encoded: "' + encoded + '"');
    return encoded;
  }

  private static stringToUint(s: string) {
    const encoded = unescape(encodeURIComponent(s));
    const charList = encoded.split('');
    const uintArray = [];
    for (let i = 0; i < charList.length; i++) {
      uintArray.push(charList[i].charCodeAt(0));
    }
    console.log('stringToUint:', uintArray);
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
    console.log('encoded: "' + encoded + '"');
    return encoded;
    */
  }

  private static async write(address: string, characteristic: string, value: any) {
    let didWrite = false;
    try {
      console.log('[WearOsComms] sending\n',
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
      console.error('[WearOsComms] error writing', err);
    }
    return didWrite;
  }
}
