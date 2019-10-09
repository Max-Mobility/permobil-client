import { Bluetooth } from 'nativescript-bluetooth';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { Common } from './wear-os-comms.common';
import { ad } from 'tns-core-modules/utils/utils';
import * as appSettings from 'tns-core-modules/application-settings';
import { ResultReceiver } from './result-receiver.android';

declare const com: any;

export class WearOsComms extends Common {
  // device address
  private static pairedCompanion: string = null;

  // this will only be used for advertising the service if the watch's
  // paired phone is not running android
  private static _bluetooth: Bluetooth = null;
  private static _companionService: any = null;
  private static _onConnectedCallback: any = null;
  private static _onDisconnectedCallback: any = null;
  private static _onMessageReceivedCallback: any = null;
  private static _onDataReceivedCallback: any = null;
  private static _mResultReceiver = new ResultReceiver(new android.os.Handler());

  private static _playStorePrefix = 'market://details?id=';

  private static _debugOutputEnabled = false;

  public static RemoteCapability: string = null;

  // FOR STATE STORAGE:
  private static _nodesConnected: any = []; // all connected nodes
  private static _nodesWithApp: any = []; // all connected nodes with app

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

  private static onResultData(resultCode: number, resultData: android.os.Bundle) {
    WearOsComms.log('onResultData:', resultCode);
    if (
      resultCode === com.google.android.wearable.intent.RemoteIntent.RESULT_OK
    ) {
      WearOsComms.log('result ok!');
    } else if (
      resultCode ===
        com.google.android.wearable.intent.RemoteIntent.RESULT_FAILED
    ) {
      WearOsComms.log('result failed!');
    } else {
      WearOsComms.error('Unexpected result ' + resultCode);
    }
  }

  /**
   * Note: appUri should be the package name
   */
  public static openAppInPlayStoreOnWatch(appUri: string) {
    WearOsComms.log('openAppInPlayStoreOnWatch()');
    WearOsComms._mResultReceiver.onReceiveFunction = WearOsComms.onResultData;

    const nodesWithoutApp = [];
    // get all connected nodes
    WearOsComms._nodesConnected.map(n => {
      // determine which ones have the app
      if (WearOsComms._nodesWithApp.indexOf(n) !== -1) {
        nodesWithoutApp.push(n);
      }
    });
    WearOsComms.log('Number of nodes without app: ' + nodesWithoutApp.length);
    // create the intent
    const intent =
      new android.content.Intent(android.content.Intent.ACTION_VIEW)
      .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
      .setData(android.net.Uri.parse(WearOsComms._playStorePrefix + appUri));
    // now iterate through the nodes without the app and open it in the play store
    nodesWithoutApp.map(n => {
      com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
        ad.getApplicationContext(),
        intent,
        WearOsComms._mResultReceiver,
        n.getId());
    });
  }

  /**
   * Note: appUri should be the package name (if the remote device is
   * android), or the full uri to the app store for the app if the
   * remote device is iOS)
   */
  public static openAppInStoreOnPhone(appUri: string) {
    WearOsComms.log('openAppInStoreOnPhone()');
    const androidUri = WearOsComms._playStorePrefix + appUri;
    const iosUri = appUri;
    try {
      WearOsComms._mResultReceiver.onReceiveFunction = WearOsComms.onResultData;

      const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType.getPhoneDeviceType(
        ad.getApplicationContext()
      );
      switch (phoneDeviceType) {
          // Paired to Android phone, use Play Store URI.
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
          WearOsComms.log('\tDEVICE_TYPE_ANDROID');
          // Create Remote Intent to open Play Store listing of app on remote device.
          const intentAndroid = new android.content.Intent(
            android.content.Intent.ACTION_VIEW
          )
            .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
            .setData(android.net.Uri.parse(androidUri));

          com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
            ad.getApplicationContext(),
            intentAndroid,
            WearOsComms._mResultReceiver
          );
          break;

          // Paired to iPhone, use iTunes App Store URI
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
          WearOsComms.log('\tDEVICE_TYPE_IOS');

          // Create Remote Intent to open App Store listing of app on iPhone.
          const intentIOS = new android.content.Intent(
            android.content.Intent.ACTION_VIEW
          )
            .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
            .setData(android.net.Uri.parse(iosUri));

          com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
            ad.getApplicationContext(),
            intentIOS,
            WearOsComms._mResultReceiver
          );
          break;

        case android.support.wearable.phone.PhoneDeviceType
            .DEVICE_TYPE_ERROR_UNKNOWN:
          WearOsComms.error('\tDEVICE_TYPE_ERROR_UNKNOWN');
          break;
      }
    } catch (err) {
      WearOsComms.error('Error opening on phone:', err);
    }
  }

  private static async findDevicesConnected(timeout: number) {
    return new Promise((resolve, reject) => {
      WearOsComms.log('findDevicesConnected()');
      const context = ad.getApplicationContext();
      const nodeTaskList = com.google.android.gms.wearable.Wearable
        .getNodeClient(context)
        .getConnectedNodes();
      let tid = null;
      if (timeout > 0) {
        tid = setTimeout(() => {
          reject(new Error('Timed out searching for connected devices'));
        }, timeout);
      }
      nodeTaskList.addOnCompleteListener(new com.google.android.gms.tasks.OnCompleteListener({
        onComplete: function(task: any) {
          if (tid !== null) clearTimeout(tid);
          if (task.isSuccessful()) {
            WearOsComms.log('Node request succeeded');
            WearOsComms._nodesConnected = task.getResult().toArray();
            resolve(task.getResult());
          } else {
            WearOsComms.error('Node request failed to return any results');
            reject(new Error('Could not find any wear devices!'));
          }
        }
      }));
    });
  }

  private static async findDeviceWithApp(appCapability: string) {
    return new Promise((resolve, reject) => {
      WearOsComms.log('findAllWearDevices()');
      const context = ad.getApplicationContext();
      const capabilityTaskList = com.google.android.gms.wearable.Wearable
        .getCapabilityClient(context)
        .getCapability(appCapability, com.google.android.gms.wearable.CapabilityClient.FILTER_ALL);
      capabilityTaskList.addOnCompleteListener(new com.google.android.gms.tasks.OnCompleteListener({
        onComplete: function(task: any) {
          if (task.isSuccessful()) {
            WearOsComms.log('Capability request succeeded');
            const capabilityInfo = task.getResult();
            const nodesWithApp = capabilityInfo.getNodes();
            WearOsComms.log('Capable Nodes:', nodesWithApp);
            WearOsComms._nodesWithApp = nodesWithApp.toArray();
            resolve(task.getResult());
          } else {
            WearOsComms.error('Capability request failed to return any results');
            reject(new Error('Could not find any wear devices!'));
          }
        }
      }));
    });
  }

  public static hasCompanion() {
    let hasCompanion =
      WearOsComms.pairedCompanion && WearOsComms.pairedCompanion.length && true;
    if (!hasCompanion) {
      try {
        // try to load from the file system
        WearOsComms.pairedCompanion = appSettings.getString(
          WearOsComms.APP_SETTINGS_COMPANION_KEY,
          ''
        );
        WearOsComms.log(
          'loaded companion from app settings:',
          WearOsComms.pairedCompanion
        );
        hasCompanion =
          WearOsComms.pairedCompanion &&
          WearOsComms.pairedCompanion.length &&
          true;
      } catch (err) {
        WearOsComms.error('could not load companion from app settings:', err);
      }
    }
    WearOsComms.log('hasCompanion:', hasCompanion);
    return hasCompanion;
  }

  public static async findAvailableCompanions(timeout: number) {
    // do nothing
    return null;
  }

  public static async findAvailableCompanion(timeout: number) {
    // do nothing
    return null;
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

  public static clearCompanion() {
    // do nothing
    WearOsComms.pairedCompanion = null;
    // save to the file system
    appSettings.setString(WearOsComms.APP_SETTINGS_COMPANION_KEY, '');
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
    WearOsComms._onDisconnectedCallback &&
      WearOsComms._onDisconnectedCallback();
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
      const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType.getPhoneDeviceType(
        androidUtils.getApplicationContext()
      );
      switch (phoneDeviceType) {
        // Paired to Android phone, use Play Store URI.
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
          break;

        // Paired to iPhone, use iTunes App Store URI
        case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
          needToAdvertise = true;
          break;

        case android.support.wearable.phone.PhoneDeviceType
          .DEVICE_TYPE_ERROR_UNKNOWN:
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
    const characteristic = argdata.characteristic
      .getUuid()
      .toString()
      .toLowerCase();
    WearOsComms.log('onCharacteristicWriteRequest for', characteristic);
    const value = argdata.value;
    const device = argdata.device;
    if (
      characteristic === WearOsComms.MessageCharacteristicUUID.toLowerCase()
    ) {
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
    } else if (
      characteristic === WearOsComms.DataCharacteristicUUID.toLowerCase()
    ) {
      WearOsComms._onDataReceivedCallback &&
        WearOsComms._onDataReceivedCallback({ data: value, device });
    } else {
      WearOsComms.error('Unknown characteristic written to:', characteristic);
    }
  }

  private static uintToString(uintArray: any) {
    const encodedString = String.fromCharCode.apply(null, uintArray);
    const decodedString = decodeURIComponent(escape(encodedString));
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
    WearOsComms._bluetooth.off(Bluetooth.characteristic_write_request_event);
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
      WearOsComms.DataCharacteristicUUID
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
    characteristics.map(c =>
      WearOsComms._companionService.addCharacteristic(c)
    );
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
