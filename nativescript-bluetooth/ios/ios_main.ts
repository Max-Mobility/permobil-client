/// <reference path="../node_modules/tns-platform-declarations/ios.d.ts" />

declare var NSMakeRange;

import {
  BluetoothCommon,
  Central,
  CLog,
  CLogTypes,
  ConnectOptions,
  MakeCharacteristicOptions,
  MakeServiceOptions,
  Peripheral,
  StartAdvertisingOptions,
  StartNotifyingOptions,
  StartScanningOptions,
  StopNotifyingOptions
} from '../common';
import { CBCentralManagerDelegateImpl } from './CBCentralManagerDelegateImpl';
import { CBPeripheralDelegateImpl } from './CBPeripheralDelegateImpl';
import { CBPeripheralManagerDelegateImpl } from './CBPeripheralManagerDelegateImpl';

// These are global for the entire Bluetooth class
let singleton: WeakRef<Bluetooth> = null;
const peripheralArray: any = NSMutableArray.new();

export function deviceToCentral(dev: CBCentral): Central {
  return {
    device: dev,
    UUIDs: [], // TODO: fix
    address: dev.identifier.UUIDString,
    name: (dev as any).name || 'PushTracker', // TODO: fix
    RSSI: null,
    manufacturerId: null,
    manufacturerData: null
  };
}

export function deviceToPeripheral(dev: CBPeripheral): Peripheral {
  return {
    device: dev,
    UUID: dev.identifier.UUIDString,
    name: null, // TODO: fix
    RSSI: null,
    services: null, // TODO: fix
    manufacturerId: null,
    manufacturerData: null
  };
}

export { BondState, Central, ConnectionState, Peripheral } from '../common';

export class Bluetooth extends BluetoothCommon {
  private readonly _centralDelegate: CBCentralManagerDelegate = null;
  private readonly _centralPeripheralMgrDelegate: CBPeripheralManagerDelegateImpl = null;
  private readonly _centralManager: CBCentralManager = null;
  private readonly _peripheralManager: CBPeripheralManager = null;

  private _data_service: CBMutableService;
  _connectCallbacks = {};
  _disconnectCallbacks = {};
  _onDiscovered = null;

  // private _centralDelegate = CBCentralManagerDelegateImpl.new().initWithCallback(new WeakRef(this), obj => {
  //   CLog(CLogTypes.info, `---- centralDelegate ---- obj: ${obj}`);
  // });
  // private _centralPeripheralMgrDelegate = CBPeripheralManagerDelegateImpl.new().init();
  // private _centralManager = CBCentralManager.alloc().initWithDelegateQueue(this._centralDelegate, null);
  // public _peripheralManager = CBPeripheralManager.new().initWithDelegateQueue(this._centralPeripheralMgrDelegate, null);

  // private _data_service: CBMutableService;
  // public _peripheralArray = null;
  // public _connectCallbacks = {};
  // public _disconnectCallbacks = {};
  // public _onDiscovered = null;

  constructor(options?: any) {
    super();

    const weakref = new WeakRef(this);

    // Old behavior was to return basically a singleton object, events were shared
    if (singleton) {
      if (!options || options.singleton !== false) {
        const ref = singleton.get();
        if (ref) {
          return ref;
        }
      }
    } else {
      singleton = weakref;
    }

    const centralKeys = [],
      centralValues = [];
    const peripheralKeys = [],
      peripheralValues = [];

    this._centralPeripheralMgrDelegate = CBPeripheralManagerDelegateImpl.new().initWithOwner(
      weakref
    );
    this._centralDelegate = CBCentralManagerDelegateImpl.new().initWithOwner(
      weakref
    );

    if (options) {
      if (options.centralPreservation) {
        centralValues.push(options.centralPreservation);
        centralKeys.push(CBCentralManagerOptionRestoreIdentifierKey);
      }
      if (options.peripheralPreservation) {
        peripheralValues.push(options.peripheralPreservation);
        peripheralKeys.push(CBPeripheralManagerOptionRestoreIdentifierKey);
      }
    }

    if (centralKeys.length > 0) {
      const _cmoptions = NSDictionary.dictionaryWithObjectsForKeys(
        <any>centralValues,
        <any>centralKeys
      );
      this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(
        this._centralDelegate,
        null,
        <any>_cmoptions
      );
    } else {
      this._centralManager = CBCentralManager.alloc().initWithDelegateQueue(
        this._centralDelegate,
        null
      );
    }

    if (peripheralKeys.length > 0) {
      const _poptions = NSDictionary.dictionaryWithObjectsForKeys(
        <any>peripheralValues,
        <any>peripheralKeys
      );

      this._peripheralManager = CBPeripheralManager.new().initWithDelegateQueueOptions(
        this._centralPeripheralMgrDelegate,
        null,
        <any>_poptions
      );
    } else {
      this._peripheralManager = CBPeripheralManager.new().initWithDelegateQueue(
        this._centralPeripheralMgrDelegate,
        null
      );
    }

    CLog(CLogTypes.info, '*** iOS Bluetooth Constructor ***');
    CLog(CLogTypes.info, `this._centralManager: ${this._centralManager}`);
    CLog(CLogTypes.info, `this._peripheralManager: ${this._peripheralManager}`);
  }

  // Getters/Setters

  get enabled(): boolean {
    const state = this._centralManager.state;
    if (state === CBManagerState.PoweredOn) {
      return true;
    } else {
      return false;
    }
  }

  removePeripheral(peripheral) {
    const foundAt = peripheralArray.indexOfObject(peripheral);
    peripheralArray.removeObject(foundAt);
  }

  addPeripheral(peripheral) {
    peripheralArray.addObject(peripheral);
  }

  _getState(state: CBPeripheralState) {
    if (state === CBPeripheralState.Connecting) {
      return 'connecting';
    } else if (state === CBPeripheralState.Connected) {
      return 'connected';
    } else if (state === CBPeripheralState.Disconnected) {
      return 'disconnected';
    } else {
      CLog(
        CLogTypes.warning,
        `Bluetooth._getState ---- Unexpected state, returning 'disconnected' for state of ${state}`
      );
      return 'disconnected';
    }
  }

  isBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const isEnabled = this._isEnabled();
        resolve(isEnabled);
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.isBluetoothEnabled ---- ${ex}`);
        reject(ex);
      }
    });
  }

  startScanning(arg: StartScanningOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          CLog(
            CLogTypes.info,
            `Bluetooth.startScanning ---- Bluetooth is not enabled.`
          );
          reject('Bluetooth is not enabled.');
          return;
        }

        // this._peripheralArray = NSMutableArray.new();
        this._onDiscovered = arg.onDiscovered;
        const serviceUUIDs = arg.serviceUUIDs || [];

        // let services: NSArray<CBUUID>;
        const services = [];
        for (const s in serviceUUIDs) {
          if (s) {
            services.push(CBUUID.UUIDWithString(serviceUUIDs[s]));
          }
        }

        // Clear array to restart scanning
        peripheralArray.removeAllObjects();

        // TODO: check on the services as any casting
        this._centralManager.scanForPeripheralsWithServicesOptions(
          services as any,
          null
        );
        if (arg.seconds) {
          setTimeout(() => {
            // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
            this._centralManager.stopScan();
            resolve();
          }, arg.seconds * 1000);
        } else {
          resolve();
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.startScanning ---- ${ex}`);
        reject(ex);
      }
    });
  }

  toArrayBuffer(value) {
    if (value === null) {
      return null;
    }

    // value is of ObjC type: NSData
    const b = value.base64EncodedStringWithOptions(0);
    return this.base64ToArrayBuffer(b);
  }

  removeBond(device) {
    /*
    try {
  let m = device.getClass();
  const tmp = Array.create("java.lang.Class", 0);
  m = m.getMethod("removeBond", tmp);
  const removed = m.invoke(device, null);

  return removed;
    }
    catch (ex) {
  CLog(ex);
    }
    */
  }

  fetchUuidsWithSdp(device) {
    /*
    try {
  let m = device.getClass();
  const tmp = Array.create("java.lang.Class", 0);
  m = m.getMethod("fetchUuidsWithSdp", tmp);
  const worked = m.invoke(device, null);

  return worked;
    }
    catch (ex) {
  CLog(ex);
    }
    */
  }

  stopGattServer() {
    return;
  }

  startGattServer() {
    // TODO: see if there is more to this but from the doc https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager
    // it appears as long as the CBPeripheralManager has been initialized, that is for managing the GATT DB.
    return;
  }

  setDiscoverable() {
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  getAdvertiser() {
    // return adapter.getBluetoothAdvertiser();
    return null;
  }

  makeService(opts: MakeServiceOptions) {
    const primary = opts && opts.primary === true ? true : false;
    const uuid = CBUUID.UUIDWithString(opts.UUID);
    const service = CBMutableService.alloc().initWithTypePrimary(uuid, primary);
    return service;
  }

  makeCharacteristic(opts: MakeCharacteristicOptions) {
    const uuid = CBUUID.UUIDWithString(opts.UUID);

    // let props;
    // if (opts && opts.properties) {
    //   props = this._mapCharacteristicProps(opts.properties);
    // }

    const props =
      (opts && opts.properties) ||
      CBCharacteristicProperties.PropertyRead |
        CBCharacteristicProperties.PropertyWrite |
        CBCharacteristicProperties.PropertyNotify;

    const permissions =
      (opts && opts.permissions) ||
      CBAttributePermissions.Writeable | CBAttributePermissions.Readable;

    // create characterstic
    const characteristic = CBMutableCharacteristic.alloc().initWithTypePropertiesValuePermissions(
      uuid,
      props,
      null,
      permissions
    );

    return characteristic;
  }

  makeDescriptor(options) {
    const uuid = this._stringToUuid(options.UUID);
    // const perms = (opts && opts.perms) ||
    const descriptor = CBMutableDescriptor.alloc().init();
    const d = CBDescriptor.alloc().init();
    // return new android.bluetooth.BluetoothGattDescriptor(uuid, perms);
    return null;
  }

  /**
   * https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/1393255-addservice
   */
  addService(service) {
    if (service && this._peripheralManager) {
      // create a CBMutableService - https://developer.apple.com/documentation/corebluetooth/cbmutableservice?language=objc
      this._peripheralManager.addService(service);
    }
  }

  getServerService(uuidString) {
    // TODO: figure out how to query services from the peripheral
    //       manager or other BT subsystem
    return null;
  }

  offersService(uuidString) {
    return this.getServerService(uuidString) !== null;
  }

  clearServices() {
    this._peripheralManager.removeAllServices();
  }

  cancelServerConnection(device) {
    // TODO: figure out if this is possible on ios
  }

  /**
   * https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/1393281-updatevalue?changes=_2&language=objc
   */
  notifyCentrals(value: any, characteristic: any, centrals: any) {
    return new Promise((resolve, reject) => {
      let resendTimeoutID = null;
      let readyToUpdate = null;
      let timeoutID = null;
      let didUpdate = false;
      // send data function
      const sendUpdate = () => {
        // register in case notification fails
        this.on(
          Bluetooth.peripheralmanager_ready_update_subscribers_event,
          readyToUpdate
        );
        // try to send data to central
        didUpdate = this._peripheralManager.updateValueForCharacteristicOnSubscribedCentrals(
          value,
          characteristic,
          centrals
        );
        if (didUpdate) {
          // clear the timeout
          if (timeoutID) {
            clearTimeout(timeoutID);
          }
          // unregister since the notification didn't fail
          this.off(Bluetooth.peripheralmanager_ready_update_subscribers_event);
          // return
          resolve(true);
        }
      };
      // handle when the notification fails
      readyToUpdate = args => {
        this.off(
          Bluetooth.peripheralmanager_ready_update_subscribers_event,
          readyToUpdate
        );
        if (resendTimeoutID) {
          clearTimeout(resendTimeoutID);
        }
        resendTimeoutID = setTimeout(sendUpdate, 10);
      };
      // handle when we've timed out
      timeoutID = setTimeout(() => {
        // unregister since we're no longer trying anymore
        this.off(
          Bluetooth.peripheralmanager_ready_update_subscribers_event,
          readyToUpdate
        );
        // clear the resend timer so that we don't keep trying to send
        if (resendTimeoutID) {
          clearTimeout(resendTimeoutID);
        }
        // return
        reject('Notify Timeout!');
      }, 1000);
      // now actually send it
      sendUpdate();
    });
  }

  /**
   * Get connected devices for this specific profile.
   * Return the set of devices which are in state STATE_CONNECTED
   * Requires the BLUETOOTH permission.
   * @returns - List of Bluetooth devices. The list will be empty on error.
   */
  getConnectedDevices() {
    return peripheralArray;
  }

  getServerConnectedDevices() {
    if (peripheralArray) {
      return peripheralArray;
    }
  }

  getServerConnectedDeviceState(device) {
    // TODO: figure out if we can query centrals that are connected
    //       or their state
  }

  getServerConnectedDevicesMatchingState(state) {
    // TODO: figure out if we can query attached cdntrals
  }

  /**
   * https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/1393252-startadvertising?language=objc
   */
  startAdvertising(args: StartAdvertisingOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._peripheralManager) {
          reject('Bluetooth not properly initialized!');
          return;
        }

        if (this._peripheralManager.isAdvertising) {
          this._peripheralManager.stopAdvertising();
        }

        const uuid = CBUUID.UUIDWithString(args.UUID);

        CLog(
          CLogTypes.info,
          `Bluetooth.startAdvertising ---- creating advertisement`
        );
        const advertisement = NSDictionary.dictionaryWithObjectsForKeys(
          // @ts-ignore
          [[uuid], 'data_service'],
          [CBAdvertisementDataServiceUUIDsKey, CBAdvertisementDataLocalNameKey]
        );

        // invokes the Peripheral Managers peripheralManagerDidStartAdvertising:error method
        // Brad - wrapping in timeout, without this the iOS API call will fail and trigger an API Misuse warning from iOS
        // due to the peripheralManager.state being unknown outside of this timeout
        CLog(
          CLogTypes.info,
          `peripheral manager state ${this._getManagerStateString(
            this._peripheralManager.state
          )}`
        );
        setTimeout(() => {
          this._peripheralManager.startAdvertising(advertisement);
          CLog(
            CLogTypes.info,
            'Bluetooth.startAdvertising ---- started advertising'
          );

          resolve();
        }, 750);
      } catch (error) {
        CLog(CLogTypes.error, `Bluetooth.startAdvertising ---- ${error}`);
        reject(error);
      }
    });
  }

  /**
   * https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/1393275-stopadvertising?language=objc
   */
  stopAdvertising() {
    return new Promise((resolve, reject) => {
      if (!this._peripheralManager) {
        reject('Bluetooth not properly initialized.');
        return;
      }

      if (this._peripheralManager.isAdvertising) {
        CLog(CLogTypes.info, 'Peripheral manager is advertising.');
        this._peripheralManager.stopAdvertising();
      }

      // always resolve
      resolve();
    });
  }

  isPeripheralModeSupported() {
    return new Promise((resolve, reject) => {
      try {
        const newPM = CBPeripheralManager.new().initWithDelegateQueue(
          null,
          null
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.isPeripheralModeSupported ---- new CBPeripheralManager ${newPM}`
        );
        if (!newPM) {
          reject(false);
        } else {
          resolve(true);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  /* * * * * * END BLUETOOTH PERIPHERAL CODE  * * * * */

  enable() {
    return new Promise((resolve, reject) => {
      CLog(CLogTypes.info, 'Bluetooth.enable ---- Not possible on iOS');
      reject(
        'Not possible - you may want to choose to not call this function on iOS.'
      );
    });
  }

  /**
   * Disabled Bluetooth on iOS is only available via a private API which will get any app rejected.
   * So the plugin is not going to be exposing such functionality.
   */
  disable() {
    return new Promise((resolve, reject) => {
      CLog(
        CLogTypes.info,
        'Disabling bluetooth on iOS is not possible via the public CoreBluetooth API.'
      );
      resolve();
    });
  }

  stopScanning(arg?) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled.');
          return;
        }
        this._centralManager.stopScan();
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.stopScanning ---- ${ex}`);
        reject(ex);
      }
    });
  }

  // note that this doesn't make much sense without scanning first
  connect(args: ConnectOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled.');
          return;
        }
        if (!args.UUID) {
          reject('No UUID was passed');
          return;
        }
        CLog(CLogTypes.info, `Bluetooth.connect ---- ${args.UUID}`);
        const peripheral = this.findPeripheral(args.UUID);
        CLog(
          CLogTypes.info,
          `Bluetooth.connect ---- peripheral found: ${peripheral}`
        );

        if (!peripheral) {
          reject(`Could not find peripheral with UUID: ${args.UUID}`);
        } else {
          CLog(
            CLogTypes.info,
            `Bluetooth.connect ---- Connecting to peripheral with UUID: ${
              args.UUID
            }`
          );
          this._connectCallbacks[args.UUID] = args.onConnected;
          this._disconnectCallbacks[args.UUID] = args.onDisconnected;
          this._centralManager.connectPeripheralOptions(peripheral, null);
          resolve();
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.connect ---- ${ex}`);
        reject(ex);
      }
    });
  }

  disconnect(arg) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled');
          return;
        }
        if (!arg.UUID) {
          reject('No UUID was passed');
          return;
        }
        const peripheral = this.findPeripheral(arg.UUID);
        if (!peripheral) {
          reject('Could not find peripheral with UUID ' + arg.UUID);
        } else {
          CLog(
            CLogTypes.info,
            `Bluetooth.disconnect ---- Disconnecting peripheral with UUID ${
              arg.UUID
            }`
          );
          // no need to send an error when already disconnected, but it's wise to check it
          if (peripheral.state !== CBPeripheralState.Disconnected) {
            this._centralManager.cancelPeripheralConnection(peripheral);
            peripheral.delegate = null;
            // TODO remove from the peripheralArray as well
          }
          resolve();
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.disconnect ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  isConnected(arg) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled');
          return;
        }
        if (!arg.UUID) {
          reject('No UUID was passed');
          return;
        }
        const peripheral = this.findPeripheral(arg.UUID);
        if (peripheral === null) {
          reject('Could not find peripheral with UUID ' + arg.UUID);
        } else {
          CLog(
            CLogTypes.info,
            `Bluetooth.isConnected ---- checking connection with peripheral UUID: ${
              arg.UUID
            }`
          );
          resolve(peripheral.state === CBPeripheralState.Connected);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.isConnected ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  findPeripheral(UUID): CBPeripheral {
    // for (let i = 0; i < this._peripheralArray.count; i++) {
    //   const peripheral = this._peripheralArray.objectAtIndex(i);
    //   if (UUID === peripheral.identifier.UUIDString) {
    //     return peripheral;
    //   }
    // }
    for (let i = 0; i < peripheralArray.count; i++) {
      const peripheral = peripheralArray.objectAtIndex(i);
      if (UUID === peripheral.identifier.UUIDString) {
        return peripheral;
      }
    }
    return null;
  }

  read(arg) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(
          arg,
          CBCharacteristicProperties.PropertyRead,
          reject
        );
        if (!wrapper) {
          // no need to reject, this has already been done in _getWrapper()
          return;
        }

        // TODO we could (should?) make this characteristic-specific
        (wrapper.peripheral
          .delegate as CBPeripheralDelegateImpl)._onReadPromise = resolve;
        wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.read ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  write(arg) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.value) {
          reject(
            `You need to provide some data to write in the 'value' property.`
          );
          return;
        }
        const wrapper = this._getWrapper(
          arg,
          CBCharacteristicProperties.PropertyWrite,
          reject
        );
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const valueEncoded = this._encodeValue(arg.value);
        if (valueEncoded === null) {
          reject('Invalid value: ' + arg.value);
          return;
        }

        // the promise will be resolved from 'didWriteValueForCharacteristic',
        // but we should make this characteristic-specific (see .read)
        (wrapper.peripheral
          .delegate as CBPeripheralDelegateImpl)._onWritePromise = resolve;
        (wrapper.peripheral
          .delegate as CBPeripheralDelegateImpl)._onWriteReject = reject;
        (wrapper.peripheral
          .delegate as CBPeripheralDelegateImpl)._onWriteTimeout = setTimeout(
          () => {
            reject('Write timed out!');
          },
          10000
        );

        wrapper.peripheral.writeValueForCharacteristicType(
          valueEncoded,
          wrapper.characteristic,
          // CBCharacteristicWriteWithResponse
          CBCharacteristicWriteType.WithResponse
        );
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.write ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  writeWithoutResponse(arg) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.value) {
          reject(
            "You need to provide some data to write in the 'value' property"
          );
          return;
        }
        const wrapper = this._getWrapper(
          arg,
          CBCharacteristicProperties.PropertyWriteWithoutResponse,
          reject
        );
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const valueEncoded = this._encodeValue(arg.value);

        CLog(
          CLogTypes.info,
          'Bluetooth.writeWithoutResponse ---- Attempting to write (encoded): ' +
            valueEncoded
        );

        wrapper.peripheral.writeValueForCharacteristicType(
          valueEncoded,
          wrapper.characteristic,
          CBCharacteristicWriteType.WithoutResponse
        );

        resolve();
      } catch (ex) {
        CLog(
          CLogTypes.error,
          `Bluetooth.writeWithoutResponse ---- error: ${ex}`
        );
        reject(ex);
      }
    });
  }

  startNotifying(args: StartNotifyingOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(
          args,
          CBCharacteristicProperties.PropertyNotify,
          reject
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.startNotifying ---- wrapper: ${wrapper}`
        );

        if (!wrapper) {
          // no need to reject, this has already been done in _getWrapper
          return;
        }

        const cb =
          args.onNotify ||
          function(result) {
            CLog(
              CLogTypes.info,
              `Bluetooth.startNotifying ---- No 'onNotify' callback function specified for 'startNotifying()'`
            );
          };

        // TODO we could (should?) make this characteristic-specific
        (wrapper.peripheral
          .delegate as CBPeripheralDelegateImpl)._onNotifyCallback = cb;
        wrapper.peripheral.setNotifyValueForCharacteristic(
          true,
          wrapper.characteristic
        );
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.startNotifying ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  stopNotifying(args: StopNotifyingOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(
          args,
          CBCharacteristicProperties.PropertyNotify,
          reject
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.stopNotifying ---- wrapper: ${wrapper}`
        );

        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        const peripheral = this.findPeripheral(args.peripheralUUID);
        // peripheral.delegate = null;
        peripheral.setNotifyValueForCharacteristic(
          false,
          wrapper.characteristic
        );
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.stopNotifying ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  private _mapCharacteristicProps(props) {
    // check the properties/permissions
    const result = null;
    if (props) {
      props.forEach(v => {
        if (v === 0) {
          props += CBCharacteristicProperties.PropertyWrite;
        }
        if (v === 1) {
          props += CBCharacteristicProperties.PropertyRead;
        }
        if (v === 2) {
          props += CBCharacteristicProperties.PropertyNotify;
        }
      });
    }
  }

  private _isEnabled() {
    const state = this._centralManager.state;
    CLog(
      CLogTypes.info,
      `Bluetooth._isEnabled ---- this._centralManager.state: ${
        this._centralManager.state
      }`
    );
    return state === CBManagerState.PoweredOn;
  }

  private _stringToUuid(uuidStr) {
    if (uuidStr.length === 4) {
      uuidStr = `0000${uuidStr}-0000-1000-8000-00805f9b34fb`;
    }
    return CFUUIDCreateFromString(null, uuidStr);
  }

  private _findService(UUID, peripheral) {
    for (let i = 0; i < peripheral.services.count; i++) {
      const service = peripheral.services.objectAtIndex(i);
      // CLog("--- service.UUID: " + service.UUID);
      // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
      if (UUID.UUIDString === service.UUID.UUIDString) {
        CLog(
          CLogTypes.info,
          `Bluetooth._findService ---- found service with UUID:  ${
            service.UUID
          }`
        );
        return service;
      }
    }
    // service not found on this peripheral
    return null;
  }

  private _findCharacteristic(UUID, service, property) {
    CLog(
      CLogTypes.info,
      `Bluetooth._findCharacteristic ---- UUID: ${UUID}, service: ${service}, characteristics: ${
        service.characteristics
      }`
    );
    // CLog("--- _findCharacteristic characteristics.count: " + service.characteristics.count);
    for (let i = 0; i < service.characteristics.count; i++) {
      const characteristic = service.characteristics.objectAtIndex(i);
      // CLog("--- characteristic.UUID: " + characteristic.UUID);
      if (UUID.UUIDString === characteristic.UUID.UUIDString) {
        // if (property) {
        //   if ((characteristic.properties & property) === property) {
        if (property && characteristic.properties) {
          if (property === property) {
            CLog(
              CLogTypes.info,
              `Bluetooth._findCharacteristic ---- characteristic.found: ${
                characteristic.UUID
              }`
            );
            return characteristic;
          }
        } else {
          return characteristic;
        }
      }
    }
    // characteristic not found on this service
    CLog(
      CLogTypes.warning,
      'Bluetooth._findCharacteristic ---- characteristic NOT found'
    );
    return null;
  }

  private _getWrapper(
    arg,
    property: CBCharacteristicProperties,
    reject
  ): {
    peripheral: CBPeripheral;
    service: CBService;
    characteristic: CBCharacteristic;
  } {
    if (!this._isEnabled()) {
      reject('Bluetooth is not enabled');
      return;
    }
    if (!arg.peripheralUUID) {
      reject('No peripheralUUID was passed');
      return null;
    }
    if (!arg.serviceUUID) {
      reject('No serviceUUID was passed');
      return null;
    }
    if (!arg.characteristicUUID) {
      reject('No characteristicUUID was passed');
      return null;
    }

    const peripheral = this.findPeripheral(arg.peripheralUUID);
    if (!peripheral) {
      reject('Could not find peripheral with UUID ' + arg.peripheralUUID);
      return null;
    }

    if (peripheral.state !== CBPeripheralState.Connected) {
      reject('The peripheral is disconnected');
      return null;
    }

    const serviceUUID = CBUUID.UUIDWithString(arg.serviceUUID);
    const service = this._findService(serviceUUID, peripheral);
    if (!service) {
      reject(
        `Could not find service with UUID ${
          arg.serviceUUID
        } on peripheral with UUID ${arg.peripheralUUID}`
      );
      return null;
    }

    const characteristicUUID = CBUUID.UUIDWithString(arg.characteristicUUID);
    let characteristic = this._findCharacteristic(
      characteristicUUID,
      service,
      property
    );

    // Special handling for INDICATE. If charateristic with notify is not found, check for indicate.
    // if (property === CBCharacteristicPropertyNotify && !characteristic) {
    if (
      property === CBCharacteristicProperties.PropertyNotify &&
      !characteristic
    ) {
      characteristic = this._findCharacteristic(
        characteristicUUID,
        service,
        CBCharacteristicProperties.PropertyIndicate
      );
      // characteristic = this._findCharacteristic(characteristicUUID, service, CBCharacteristicProperties.PropertyIndicate PropertyIndicate);
    }

    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    if (!characteristic) {
      characteristic = this._findCharacteristic(
        characteristicUUID,
        service,
        null
      );
    }

    if (!characteristic) {
      reject(
        `Could not find characteristic with UUID ${
          arg.characteristicUUID
        } on service with UUID ${arg.serviceUUID} on peripheral with UUID ${
          arg.peripheralUUID
        }`
      );
      return null;
    }

    // with that all being checked, let's return a wrapper object containing all the stuff we found here
    return {
      peripheral: peripheral,
      service: service,
      characteristic: characteristic
    };
  }

  /**
   * Value must be a Uint8Array or Uint16Array or
   * a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
   */
  private _encodeValue(value) {
    // if it's not a string assume it's a UintXArray
    if (typeof value !== 'string') {
      return value.buffer;
    }
    const parts = value.split(',');
    if (parts[0].indexOf('x') === -1) {
      return null;
    }
    let result;
    if (parts[0].length === 4) {
      // eg. 0x01
      result = new Uint8Array(parts.length);
    } else {
      // assuming eg. 0x007F
      result = new Uint16Array(parts.length);
    }
    for (let i = 0; i < parts.length; i++) {
      result[i] = parts[i];
    }
    return result.buffer;
  }

  _getManagerStateString(state: CBManagerState): string {
    let result: string;
    switch (state) {
      case CBManagerState.Unknown: // 0
        result = 'unknown';
        break;
      case CBManagerState.PoweredOn: // 5
        result = 'on';
        break;
      case CBManagerState.PoweredOff: // 4
        result = 'off';
        break;
      case CBManagerState.Resetting: // 1
        result = 'resetting';
        break;
      case CBManagerState.Unauthorized: // 3
        result = 'resetting';
        break;
      case CBManagerState.Unsupported: // 2
        result = 'resetting';
        break;
      default:
        result = 'WTF state is the manager?!?';
    }

    return result;
  }
}
