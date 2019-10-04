import { Bluetooth } from 'nativescript-bluetooth';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { Common } from './wear-os-comms.common';

declare const com: any;

export class WearOsComms extends Common {
  // this will only be used for advertising the service if the watch's
  // paired phone is not running android
  private static _bluetooth: Bluetooth = null;
  private static _companionService: any = null;
  private static _onConnectedCallback: any = null;
  private static _onDisconnectedCallback: any = null;
  private static _onMessageReceivedCallback: any = null;
  private static _onDataReceivedCallback: any = null;

  private static _debugOutputEnabled = false;

  constructor() {
    super();
  }

  public static registerConnectedCallback(cb: any) {
    WearOsComms._onConnectedCallback = cb;
  }

  public static registerDisconnectedCallback(cb: any) {
    WearOsComms._onDisconnectedCallback = cb;
  }

  public static registerMessageCallback(cb: any) {
    WearOsComms._onMessageReceivedCallback = cb;
  }

  public static registerDataCallback(cb: any) {
    WearOsComms._onDataReceivedCallback = cb;
  }

  public static hasCompanion() {
    // TODO: try to determine if there is a wear os watch paired -
    // look through DataLayerService to determine if it's something we
    // can figure out
    return true;
  }

  public static findAvailableCompanions(timeout: number) {
    // do nothing
    return null;
  }

  public static findAvailableCompanion(timeout: number) {
    // do nothing
    return null;
  }

  public static saveCompanion(address: string) {
    // do nothing
  }

  public static clearCompanion() {
    // do nothing
  }

  public static connectCompanion(timeout: number = 10000) {
    // we don't do anything here but we should let people know that
    // we've "connected" in case they are waiting on the callback to
    // resolve / continue execution;
    WearOsComms._onConnectedCallback && WearOsComms._onConnectedCallback();
  }

  public static disconnectCompanion() {
    // we don't do anything here but we should let people know that
    // we've "disconnected" in case they are waiting on the callback to
    // resolve / continue execution;
    WearOsComms._onDisconnectedCallback && WearOsComms._onDisconnectedCallback();
  }

  public static setDebugOutput(enabled: boolean) {
    WearOsComms._debugOutputEnabled = enabled;
    if (WearOsComms._bluetooth)
      WearOsComms._bluetooth.debug = WearOsComms._debugOutputEnabled;
  }

  public static async advertiseAsCompanion() {
    try {
      let needToAdvertise = false;
      // check paired phone type to determine if we need to advertise
      // (e.g. if the phone is ios we need to use the bluetooth)

      WearOsComms.log('Determining phone type');
      const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType
        .getPhoneDeviceType(androidUtils.getApplicationContext());
      switch (phoneDeviceType) {
          // Paired to Android phone, use Play Store URI.
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
          break;

          // Paired to iPhone, use iTunes App Store URI
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
          needToAdvertise = true;
          break;

        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ERROR_UNKNOWN:
          WearOsComms.error('\tDEVICE_TYPE_ERROR_UNKNOWN');
          break;
      }

      if (needToAdvertise) {
        WearOsComms.log('Advertising since we are paired with an iPhone');
        // create the bluetooth object
        if (WearOsComms._bluetooth === null) {
          WearOsComms._bluetooth = new Bluetooth();
          WearOsComms._bluetooth.debug = WearOsComms._debugOutputEnabled;
          // make sure to clear out any old state
          await WearOsComms.stopAdvertisingAsCompanion();
          // start the server
          WearOsComms._bluetooth.startGattServer();
          // clear out any existing services
          WearOsComms.deleteService();
          // create service / characteristics
          WearOsComms.createService();
          // set up listeners for data receipt from the app
          WearOsComms.registerListeners();
          // advertise the added service
          await WearOsComms._bluetooth.startAdvertising({
            UUID: WearOsComms.ServiceUUID,
            settings: {
              connectable: true
            },
            data: {
              includeDeviceName: true
            }
          });
          // now add the service to the bluetooth
          WearOsComms._bluetooth.addService(WearOsComms._companionService);
        }
      }
    } catch (err) {
      WearOsComms.error('error advertising as companion:', err);
    }
  }

  public static async stopAdvertisingAsCompanion() {
    try {
      if (WearOsComms._bluetooth) {
        await WearOsComms._bluetooth.stopAdvertising();
        await WearOsComms.deleteService();
        await WearOsComms._bluetooth.stopGattServer();
      }
    } catch (err) {
      WearOsComms.error('error stopping advertising as companion:', err);
    }
  }

  private static onCharacteristicWriteRequest(args: any) {
    const argdata = args.data;
    const characteristic = argdata.characteristic.getUuid().toString().toLowerCase();
    WearOsComms.log('onCharacteristicWriteRequest for', characteristic);
    const value = argdata.value;
    const device = argdata.device;
    if (characteristic === WearOsComms.MessageCharacteristicUUID.toLowerCase()) {
      const stringValue = WearOsComms.uintToString(argdata.value);
      WearOsComms.log('stringValue:', stringValue);
      const splits = stringValue.split(WearOsComms.MessageDelimeter);
      WearOsComms.log('splits:', splits);
      if (splits && splits.length > 1) {
        const path = splits[0];
        // recover original message in case it had any delimeters in it
        const message = splits.slice(1).join(WearOsComms.MessageDelimeter);
        WearOsComms._onMessageReceivedCallback &&
          WearOsComms._onMessageReceivedCallback({ path, message, device });
      } else {
        WearOsComms.error('invalid message received:', stringValue);
      }
    } else if (characteristic === WearOsComms.DataCharacteristicUUID.toLowerCase()) {
      WearOsComms._onDataReceivedCallback &&
        WearOsComms._onDataReceivedCallback({ data: value, device });
    } else {
      WearOsComms.error('Unknown characteristic written to:', characteristic);
    }
  }

  private static uintToString(uintArray: any) {
    var encodedString = String.fromCharCode.apply(null, uintArray),
    decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
  }

  private static registerListeners() {
    WearOsComms.unregisterListeners();
    WearOsComms._bluetooth.on(
      Bluetooth.characteristic_write_request_event,
      WearOsComms.onCharacteristicWriteRequest
    );
  }

  private static unregisterListeners() {
    WearOsComms._bluetooth.off(
      Bluetooth.characteristic_write_request_event
    );
  }

  private static deleteService() {
    WearOsComms._bluetooth.clearServices();
    WearOsComms._companionService = null;
  }

  private static createService() {
    if (WearOsComms._bluetooth.offersService(WearOsComms.ServiceUUID)) {
      WearOsComms.log(`Bluetooth already offers ${WearOsComms.ServiceUUID}`);
      return;
    }
    WearOsComms.log('making service');

    // make the service
    WearOsComms._companionService = WearOsComms._bluetooth.makeService({
      UUID: WearOsComms.ServiceUUID,
      primary: true
    });

    const descriptorUUIDs = ['2900', '2902'];

    // make the characteristics
    const characteristics = [
      WearOsComms.MessageCharacteristicUUID,
      WearOsComms.DataCharacteristicUUID,
    ].map(cuuid => {
      // WearOsComms.log('Making characteristic: ' + cuuid);
      //  defaults props are set READ/WRITE/NOTIFY, perms are set to READ/WRITE
      const c = WearOsComms._bluetooth.makeCharacteristic({
        UUID: cuuid
      });

      // WearOsComms.log('making descriptors');
      const descriptors = descriptorUUIDs.map(duuid => {
        //  defaults perms are set to READ/WRITE
        const d = WearOsComms._bluetooth.makeDescriptor({
          UUID: duuid
        });
        d.setValue(new Array<any>([0x00, 0x00]));
        // WearOsComms.log('Making descriptor: ' + duuid);
        return d;
      });

      descriptors.map(d => {
        c.addDescriptor(d);
      });

      c.setValue(
        0,
        (android.bluetooth as any).BluetoothGattCharacteristic.FORMAT_UINT8,
        0
      );
      c.setWriteType(
        (android.bluetooth as any).BluetoothGattCharacteristic
          .WRITE_TYPE_DEFAULT
      );

      return c;
    });
    WearOsComms.log('Adding characteristics to service!');
    characteristics.map(c => WearOsComms._companionService.addCharacteristic(c));
  }

  public static sendMessage(channel: string, msg: string) {
    return new Promise((resolve, reject) => {
      try {
        const r = new com.github.maxmobility.wearmessage.Message(
          androidUtils.getApplicationContext()
        );

        r.sendMessage(channel, msg);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  public static sendData(data: any) {
    return new Promise((resolve, reject) => {
      try {
        const l = new com.github.maxmobility.wearmessage.Data(
          androidUtils.getApplicationContext()
        );
        l.sendData(data);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  private static log(...args) {
    if (WearOsComms._debugOutputEnabled)
      console.log('[ WearOsComms ]', ...args);
  }

  private static error(...args) {
    console.error('[ WearOsComms ]', ...args);
  }
}
