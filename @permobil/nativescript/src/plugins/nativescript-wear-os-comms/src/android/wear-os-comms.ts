import * as appSettings from '@nativescript/core/application-settings';
import { ad, ad as androidUtils } from '@nativescript/core/utils/utils';
import { Bluetooth } from 'nativescript-bluetooth';
import { ResultReceiver } from './ResultReceiver';
import { Common } from '../wear-os-comms.common';

@JavaProxy('com.permobil.WearOsComms.CapabilityListener')
@Interfaces([
  com.google.android.gms.wearable.CapabilityClient.OnCapabilityChangedListener
])
class CapabilityListener extends androidx.fragment.app.FragmentActivity
  implements
  com.google.android.gms.wearable.CapabilityClient
    .OnCapabilityChangedListener {
  public callback: any = null;
  constructor() {
    super();
  }

  public onCapabilityChanged(
    capabilityInfo: com.google.android.gms.wearable.CapabilityInfo
  ) {
    this.callback && this.callback(capabilityInfo);
  }
}

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
  private static _mResultReceiver = new ResultReceiver(
    new android.os.Handler()
  );

  private static _playStorePrefix = 'market://details?id=';

  private static _debugOutputEnabled = false;

  public static RemoteCapability: string = null;
  private static _mCapabilityListener = new CapabilityListener();

  // FOR STATE STORAGE:
  private static _cancelCallback: any = null;
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

  private static onResultData(
    resultCode: number,
    resultData: android.os.Bundle
  ) {
    WearOsComms.log('onResultData:', resultCode);
    if (
      resultCode === com.google.android.wearable.intent.RemoteIntent.RESULT_OK
    ) {
      WearOsComms.log('result ok!');
    } else if (
      resultCode ===
      com.google.android.wearable.intent.RemoteIntent.RESULT_FAILED
    ) {
      WearOsComms.error('result failed!');
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
      if (WearOsComms._nodesWithApp.indexOf(n) === -1) {
        // nodes with app did not contain this node, so push!
        nodesWithoutApp.push(n);
      }
    });
    WearOsComms.log('Number of nodes without app: ' + nodesWithoutApp.length);
    if (nodesWithoutApp.length === 0) {
      WearOsComms.error('No nodes found without app!');
    }
    // create the intent
    const intent = new android.content.Intent(
      android.content.Intent.ACTION_VIEW
    )
      .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
      .setData(android.net.Uri.parse(WearOsComms._playStorePrefix + appUri));
    // now iterate through the nodes without the app and open it in the play store
    nodesWithoutApp.map(n => {
      com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
        ad.getApplicationContext(),
        intent,
        WearOsComms._mResultReceiver,
        n.getId()
      );
    });
  }

  public static phoneIsIos() {
    let isIos = false;
    const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType.getPhoneDeviceType(
      ad.getApplicationContext()
    );
    switch (phoneDeviceType) {
      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
        break;
      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
        isIos = true;
        break;
      case android.support.wearable.phone.PhoneDeviceType
        .DEVICE_TYPE_ERROR_UNKNOWN:
        WearOsComms.error('\tDEVICE_TYPE_ERROR_UNKNOWN');
        break;
    }
    return isIos;
  }

  public static phoneIsAndroid() {
    let isAndroid = false;
    const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType.getPhoneDeviceType(
      ad.getApplicationContext()
    );
    switch (phoneDeviceType) {
      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
        isAndroid = true;
        break;
      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
        break;
      case android.support.wearable.phone.PhoneDeviceType
        .DEVICE_TYPE_ERROR_UNKNOWN:
        WearOsComms.error('\tDEVICE_TYPE_ERROR_UNKNOWN');
        break;
    }
    return isAndroid;
  }

  public static sendUriToPhone(uri: string) {
    // Create Remote Intent to open app on remote device.
    const intent = new android.content.Intent(
      android.content.Intent.ACTION_VIEW
    )
      .addCategory(android.content.Intent.CATEGORY_BROWSABLE)
      .setData(android.net.Uri.parse(uri));

    com.google.android.wearable.intent.RemoteIntent.startRemoteActivity(
      ad.getApplicationContext(),
      intent,
      WearOsComms._mResultReceiver
    );
  }

  public static openAppInStoreOnPhone(
    androidPackageName: string,
    iosAppStoreUri: string
  ) {
    WearOsComms.log('openAppInStoreOnPhone()');
    const androidUri = WearOsComms._playStorePrefix + androidPackageName;
    const iosUri = iosAppStoreUri;
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

  public static async initWatch(
    watchCapability?: string,
    phoneCapability?: string
  ) {
    if (WearOsComms.phoneIsAndroid()) {
      try {
        // this should always throw, we're just keeping the code here
        // for now. it will throw because you cannot remove
        // capabilities which haven't been added, and you can't add
        // capabilities which are in the manifest
        if (watchCapability) {
          await WearOsComms.removeCapability(watchCapability);
          await WearOsComms.advertiseCapability(watchCapability);
        }
        if (phoneCapability) {
          await WearOsComms.listenForCapability(phoneCapability);
        }
      } catch (err) {
        WearOsComms.error('initWatch error:', err);
      }
    } else {
      await WearOsComms.advertiseAsCompanion();
    }
  }

  public static async stopWatch() {
    if (WearOsComms.phoneIsIos()) {
      await WearOsComms.stopAdvertisingAsCompanion();
    } else {
      // TODO: should we remove the capability?
    }
  }

  public static async initPhone(
    watchCapability?: string,
    phoneCapability?: string
  ) {
    try {
      if (phoneCapability) {
        await WearOsComms.removeCapability(phoneCapability);
        await WearOsComms.advertiseCapability(phoneCapability);
      }
      if (watchCapability) {
        await WearOsComms.listenForCapability(watchCapability);
      }
    } catch (err) {
      WearOsComms.error('initPhone error:', err);
    }
  }

  public static async stopPhone() {
    // TODO: should we remove the capability?
  }

  private static async removeCapability(appCapability: string) {
    await new Promise((resolve, reject) => {
      WearOsComms.log('removeCapability()');
      const context = ad.getApplicationContext();
      const capabilityTask = com.google.android.gms.wearable.Wearable.getCapabilityClient(
        context
      ).removeLocalCapability(appCapability);
      capabilityTask.addOnCompleteListener(
        new com.google.android.gms.tasks.OnCompleteListener({
          onComplete: function(task: any) {
            if (task.isSuccessful()) {
              WearOsComms.log('Remove Capability request succeeded');
              resolve();
            } else {
              WearOsComms.error('Remove Capability request failed');
              reject(new Error('Could not remove capability:' + appCapability));
            }
          }
        })
      );
    });
    return;
  }

  private static async advertiseCapability(appCapability: string) {
    await new Promise((resolve, reject) => {
      WearOsComms.log('advertiseCapability()');
      const context = ad.getApplicationContext();
      const capabilityTask = com.google.android.gms.wearable.Wearable.getCapabilityClient(
        context
      ).addLocalCapability(appCapability);
      capabilityTask.addOnCompleteListener(
        new com.google.android.gms.tasks.OnCompleteListener({
          onComplete: function(task: any) {
            if (task.isSuccessful()) {
              WearOsComms.log('Add Capability request succeeded');
              resolve();
            } else {
              WearOsComms.error('Add Capability request failed');
              reject(new Error('Could not add capability:' + appCapability));
            }
          }
        })
      );
    });
    return;
  }

  private static onCapabilityChanged(
    capabilityInfo: com.google.android.gms.wearable.CapabilityInfo
  ) {
    // update the nodes that have the app
    const nodeArray = capabilityInfo.getNodes().toArray();
    WearOsComms.log('Capable Nodes:', nodeArray);
    WearOsComms._nodesWithApp = [];
    for (let i = 0; i < nodeArray.length; i++) {
      WearOsComms._nodesWithApp.push(nodeArray[i]);
    }
    // update the list of connected devices
    WearOsComms.findDevicesConnected();
  }

  private static async listenForCapability(appCapability: string) {
    const context = ad.getApplicationContext();
    const capabilityClient = com.google.android.gms.wearable.Wearable.getCapabilityClient(
      context
    );
    // make sure we set up the callback so we can update our data
    WearOsComms._mCapabilityListener.callback = WearOsComms.onCapabilityChanged;
    // remove any listeners we may have had
    capabilityClient.removeListener(
      WearOsComms._mCapabilityListener,
      appCapability
    );
    // register our capabilitylistener
    capabilityClient.addListener(
      WearOsComms._mCapabilityListener,
      appCapability
    );
  }

  private static async findDevicesConnected(timeout?: number): Promise<any[]> {
    const devices = await new Promise((resolve, reject) => {
      WearOsComms.log('findDevicesConnected()');
      const context = ad.getApplicationContext();
      const nodeTaskList = com.google.android.gms.wearable.Wearable.getNodeClient(
        context
      ).getConnectedNodes();
      let tid = null;
      const resolveEarly = () => {
        WearOsComms._nodesConnected = [];
        resolve([]);
      };
      WearOsComms._cancelCallback = resolveEarly;
      if (timeout !== undefined && timeout > 0) {
        tid = setTimeout(resolveEarly, timeout);
      }
      nodeTaskList.addOnCompleteListener(
        new com.google.android.gms.tasks.OnCompleteListener({
          onComplete: function(task: any) {
            if (tid !== null) clearTimeout(tid);
            if (task.isSuccessful()) {
              WearOsComms.log('Node request succeeded');
              const nodeArray = task.getResult().toArray();
              WearOsComms._nodesConnected = [];
              for (let i = 0; i < nodeArray.length; i++) {
                WearOsComms._nodesConnected.push(nodeArray[i]);
              }
              resolve(WearOsComms._nodesConnected);
            } else {
              WearOsComms.error('Node request failed to return any results');
              WearOsComms._nodesConnected = [];
              resolve([]);
              // reject(new Error('Could not find any wear devices!'));
            }
          }
        })
      );
    });
    return devices as any[];
  }

  private static async findDevicesWithApp(
    appCapability: string
  ): Promise<any[]> {
    const devices = await new Promise((resolve, reject) => {
      WearOsComms.log('findDevicesConnected()');
      const context = ad.getApplicationContext();
      const capabilityTaskList = com.google.android.gms.wearable.Wearable.getCapabilityClient(
        context
      ).getCapability(
        appCapability,
        com.google.android.gms.wearable.CapabilityClient.FILTER_ALL
      );
      capabilityTaskList.addOnCompleteListener(
        new com.google.android.gms.tasks.OnCompleteListener({
          onComplete: function(task: any) {
            if (task.isSuccessful()) {
              WearOsComms.log('Capability request succeeded');
              const capabilityInfo = task.getResult();
              const nodeArray = capabilityInfo.getNodes().toArray();
              WearOsComms.log('Capable Nodes:', nodeArray);
              WearOsComms._nodesWithApp = [];
              for (let i = 0; i < nodeArray.length; i++) {
                WearOsComms._nodesWithApp.push(nodeArray[i]);
              }
              resolve(WearOsComms._nodesWithApp);
            } else {
              WearOsComms.error(
                'Capability request failed to return any results'
              );
              WearOsComms._nodesWithApp = [];
              resolve([]);
              // reject(new Error('Could not find any wear devices!'));
            }
          }
        })
      );
    });
    return devices as any[];
  }

  public static async sendMessage(channel: string, msg: string) {
    const didSend = await new Promise(async (resolve, reject) => {
      try {
        const context = androidUtils.getApplicationContext();
        const nodes = await WearOsComms.findDevicesConnected();
        if (nodes.length === 0) {
          reject(new Error('No devices connected!'));
          return;
        }
        const messageClient = com.google.android.gms.wearable.Wearable.getMessageClient(
          context
        );
        const promises = nodes.map(node => {
          return new Promise((resolve, reject) => {
            try {
              const data = new java.lang.String(msg).getBytes();
              const sendMessageTask = messageClient.sendMessage(
                node.getId(),
                channel,
                data
              );
              sendMessageTask.addOnCompleteListener(
                new com.google.android.gms.tasks.OnCompleteListener({
                  onComplete: function(task: any) {
                    if (task.isSuccessful()) {
                      resolve(true);
                    } else {
                      resolve(false);
                    }
                  }
                })
              );
            } catch (err) {
              reject(err);
            }
          });
        });
        const allResolved = await Promise.all(promises);
        const allSucceeded = allResolved.reduce((all, one) => {
          return all && one;
        }, true);
        resolve(allSucceeded);
      } catch (error) {
        reject(error);
      }
    });
    return didSend;
  }

  public static async sendData(data: any) {
    const didSend = await new Promise(async (resolve, reject) => {
      try {
        WearOsComms.log('Data to be sent:', data);
        const context = androidUtils.getApplicationContext();
        const dataMap = com.google.android.gms.wearable.PutDataMapRequest.create(
          WearOsComms.DATA_PATH
        );
        // TODO: what about non-string data?
        dataMap.getDataMap().putString(WearOsComms.DATA_KEY, data);
        dataMap
          .getDataMap()
          .putLong(WearOsComms.TIME_KEY, new Date().getTime());
        const request = dataMap.asPutDataRequest();
        request.setUrgent();

        const dataClient = com.google.android.gms.wearable.Wearable.getDataClient(
          context
        );
        const dataItemTask = dataClient.putDataItem(request);
        dataItemTask.addOnCompleteListener(
          new com.google.android.gms.tasks.OnCompleteListener({
            onComplete: function(task: any) {
              if (task.isSuccessful()) {
                resolve(true);
              } else {
                resolve(false);
              }
            }
          })
        );
      } catch (error) {
        reject(error);
      }
    });
    return didSend;
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

  public static async cancelOperations() {
    WearOsComms._cancelCallback && WearOsComms._cancelCallback();
    WearOsComms._cancelCallback = null;
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

  private static async advertiseAsCompanion() {
    try {
      if (WearOsComms.phoneIsIos()) {
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

  private static async stopAdvertisingAsCompanion() {
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

  private static log(...args) {
    if (WearOsComms._debugOutputEnabled)
      console.log('[ WearOsComms ]', ...args);
  }

  private static error(...args) {
    console.error('[ WearOsComms ]', ...args);
  }
}
