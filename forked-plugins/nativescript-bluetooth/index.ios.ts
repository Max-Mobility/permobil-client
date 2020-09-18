/// <reference path="../../node_modules/@nativescript/types/node_modules/@nativescript/types-ios/index.d.ts" />

import { Device as nsDevice, Dialogs } from '@nativescript/core';
import {
    BluetoothCommon,
    ConnectionState,
    ConnectOptions,
    Device,
    MakeCharacteristicOptions,
    MakeServiceOptions,
    StartAdvertisingOptions,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions
} from './common';

declare var NSMakeRange; // not recognized by platform-declarations
declare var DataView; // not recognized by platform-declarations

// These are global for the entire Bluetooth class
let singleton: WeakRef<Bluetooth> = null;
const peripheralArray: any = NSMutableArray.new();

export function getDevice(dev: CBCentral | CBPeripheral): Device {
  const uuids = [];
  const uuid = dev.identifier && dev.identifier.UUIDString;
  if (uuid) {
    uuids.push(uuid);
  }
  const name = (dev as any).name || 'PushTracker'; // TODO: fix
  return {
    device: dev,
    UUIDs: uuids,
    address: uuid,
    name: name,
    RSSI: null,
    manufacturerId: null,
    manufacturerData: null
  };
}

export { BondState, ConnectionState, Device } from './common';

export class Bluetooth extends BluetoothCommon {
  private readonly _centralDelegate: CBCentralManagerDelegate = null;
  private readonly _centralPeripheralMgrDelegate: CBPeripheralManagerDelegate = null;
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
      console.warn(
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
        reject(ex);
      }
    });
  }

  startScanning(arg: StartScanningOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          console.warn(
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
        const advertisement = NSDictionary.dictionaryWithObjectsForKeys(
          // @ts-ignore
          [[uuid], 'data_service'],
          [CBAdvertisementDataServiceUUIDsKey, CBAdvertisementDataLocalNameKey]
        );

        // invokes the Peripheral Managers peripheralManagerDidStartAdvertising:error method
        // Brad - wrapping in timeout, without this the iOS API call will fail and trigger an API Misuse warning from iOS
        // due to the peripheralManager.state being unknown outside of this timeout
        setTimeout(() => {
          this._peripheralManager.startAdvertising(advertisement);
          console.info('Bluetooth.startAdvertising ---- started advertising');
          resolve();
        }, 750);
      } catch (error) {
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
        console.info(
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
        console.info(`Bluetooth.connect ---- ${args.UUID}`);
        const peripheral = this.findPeripheral(args.UUID);
        console.info(`Bluetooth.connect ---- peripheral found: ${peripheral}`);

        if (!peripheral) {
          reject(`Could not find peripheral with UUID: ${args.UUID}`);
        } else {
          console.warn(
            `Bluetooth.connect ---- Connecting to peripheral with UUID: ${args.UUID}`
          );
          this._connectCallbacks[args.UUID] = args.onConnected;
          this._disconnectCallbacks[args.UUID] = args.onDisconnected;
          this._centralManager.connectPeripheralOptions(peripheral, null);
          resolve();
        }
      } catch (ex) {
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
          console.info(
            `Bluetooth.disconnect ---- Disconnecting peripheral with UUID ${arg.UUID}`
          );
          // no need to send an error when already disconnected, but it's wise to check it
          if (peripheral.state !== CBPeripheralState.Disconnected) {
            this._centralManager.cancelPeripheralConnection(peripheral);
            peripheral.delegate = null;
            this.removePeripheral(peripheral);
          }
          resolve();
        }
      } catch (ex) {
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
          console.info(
            `Bluetooth.isConnected ---- checking connection with peripheral UUID: ${arg.UUID}`
          );
          resolve(peripheral.state === CBPeripheralState.Connected);
        }
      } catch (ex) {
        reject(ex);
      }
    });
  }

  findPeripheralsWithIdentifiers(UUIDs): CBPeripheral[] {
    const peripherals = [];
    const periArray = this._centralManager.retrievePeripheralsWithIdentifiers(
      UUIDs
    );
    for (let i = 0; i < periArray.count; i++) {
      const peripheral = periArray.objectAtIndex(i);
      peripherals.push(peripheral);
    }
    return peripherals;
  }

  findConnectedPeripheralsWithServices(services): CBPeripheral[] {
    const peripherals = [];
    const periArray = this._centralManager.retrieveConnectedPeripheralsWithServices(
      services
    );
    for (let i = 0; i < periArray.count; i++) {
      const peripheral = periArray.objectAtIndex(i);
      peripherals.push(peripheral);
    }
    return peripherals;
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
    const peripherals = this.findPeripheralsWithIdentifiers([UUID]);
    if (peripherals && peripherals.length === 1) {
      return peripherals[0];
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
          .delegate as TNS_CBPeripheralDelegate)._onReadPromise = resolve;
        wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
      } catch (ex) {
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
          .delegate as TNS_CBPeripheralDelegate)._onWritePromise = resolve;
        (wrapper.peripheral
          .delegate as TNS_CBPeripheralDelegate)._onWriteReject = reject;
        (wrapper.peripheral
          .delegate as TNS_CBPeripheralDelegate)._onWriteTimeout = setTimeout(
          () => {
            reject('Write timed out!');
          },
          arg.timeout || 10000
        );

        wrapper.peripheral.writeValueForCharacteristicType(
          valueEncoded,
          wrapper.characteristic,
          // CBCharacteristicWriteWithResponse
          CBCharacteristicWriteType.WithResponse
        );
      } catch (ex) {
        reject(ex);
      }
    });
  }

  writeWithoutResponse(arg) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.value) {
          reject(
            `You need to provide some data to write in the 'value' property`
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

        console.info(
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

        if (!wrapper) {
          // no need to reject, this has already been done in _getWrapper
          return;
        }

        const cb =
          args.onNotify ||
          function (result) {
            console.info(
              `Bluetooth.startNotifying ---- No 'onNotify' callback function specified for 'startNotifying()'`
            );
          };

        // TODO we could (should?) make this characteristic-specific
        (wrapper.peripheral
          .delegate as TNS_CBPeripheralDelegate)._onNotifyCallback = cb;
        wrapper.peripheral.setNotifyValueForCharacteristic(
          true,
          wrapper.characteristic
        );
        resolve();
      } catch (ex) {
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
      // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
      if (UUID.UUIDString === service.UUID.UUIDString) {
        console.info(
          `Bluetooth._findService ---- found service with UUID:  ${service.UUID}`
        );
        return service;
      }
    }
    // service not found on this peripheral
    return null;
  }

  private _findCharacteristic(UUID, service, property) {
    console.info(
      `Bluetooth._findCharacteristic ---- UUID: ${UUID}, service: ${service}, characteristics: ${service.characteristics}`
    );
    for (let i = 0; i < service.characteristics.count; i++) {
      const characteristic = service.characteristics.objectAtIndex(i);
      if (UUID.UUIDString === characteristic.UUID.UUIDString) {
        if (property && characteristic.properties) {
          if (property === property) {
            console.info(
              `Bluetooth._findCharacteristic ---- characteristic.found: ${characteristic.UUID}`
            );
            return characteristic;
          }
        } else {
          return characteristic;
        }
      }
    }
    // characteristic not found on this service
    console.warn('Bluetooth._findCharacteristic ---- characteristic NOT found');
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
        `Could not find service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`
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
        `Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`
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

@NativeClass()
class TNS_CBPeripheralDelegate
  extends NSObject
  implements CBPeripheralDelegate {
  static ObjCProtocols = [CBPeripheralDelegate];
  public _onWritePromise;
  public _onWriteReject;
  public _onWriteTimeout;
  public _onReadPromise;
  public _onReadReject;
  public _onReadTimeout;
  public _onNotifyCallback;
  private _servicesWithCharacteristics;
  private _services;
  private _owner: WeakRef<Bluetooth>;
  private _callback: (result?) => void;

  static new(): TNS_CBPeripheralDelegate {
    return <TNS_CBPeripheralDelegate>super.new();
  }

  initWithCallback(
    owner: WeakRef<Bluetooth>,
    callback: (result?) => void
  ): TNS_CBPeripheralDelegate {
    this._owner = owner;
    this._callback = callback;
    this._servicesWithCharacteristics = [];
    return this;
  }

  peripheralDidReadRSSIError(
    peripheral: CBPeripheral,
    RSSI: number,
    error: NSError
  ) {
    console.error(
      `CBPeripheralDelegateImpl.peripheralDidReadRSSIError ---- peripheral: ${peripheral}, rssi: ${RSSI}, error: ${error}`
    );
  }

  /**
   * Invoked when you discover the peripheral’s available services.
   * This method is invoked when your app calls the discoverServices(_:) method.
   * If the services of the peripheral are successfully discovered, you can access them through the peripheral’s services property.
   * If successful, the error parameter is nil.
   * If unsuccessful, the error parameter returns the cause of the failure.
   * @param peripheral [CBPeripheral] - The peripheral that the services belong to.
   * @param error [NSError] - If an error occurred, the cause of the failure.
   */
  peripheralDidDiscoverServices(peripheral: CBPeripheral, error?: NSError) {
    // map native services to a JS object
    this._services = [];
    if (peripheral.services.count === 0) {
      this._owner.get().disconnect({
        UUID: peripheral.identifier.UUIDString
      });
      return;
    }
    for (let i = 0; i < peripheral.services.count; i++) {
      const service = peripheral.services.objectAtIndex(i);
      this._services.push({
        UUID: service.UUID.UUIDString,
        name: service.UUID
      });
      // NOTE: discover all is slow
      peripheral.discoverCharacteristicsForService(null, service);
    }
  }

  /**
   * Invoked when you discover the included services of a specified service.
   * @param peripheral [CBPeripheral] - The peripheral providing this information.
   * @param service [CBService] - The CBService object containing the included service.
   * @param error [NSError] - If an error occurred, the cause of the failure.
   */
  peripheralDidDiscoverIncludedServicesForServiceError(
    peripheral: CBPeripheral,
    service: CBService,
    error?: NSError
  ) {
    console.error(
      `CBPeripheralDelegateImpl.peripheralDidDiscoverIncludedServicesForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`
    );
  }

  /**
   * Invoked when you discover the characteristics of a specified service.
   * @param peripheral [CBPeripheral] - The peripheral providing this information.
   * @param service [CBService] - The CBService object containing the included service.
   * @param error [NSError] - If an error occurred, the cause of the failure.
   */
  peripheralDidDiscoverCharacteristicsForServiceError(
    peripheral: CBPeripheral,
    service: CBService,
    error?: NSError
  ) {
    if (error) {
      // TODO invoke reject and stop processing
      return;
    }
    const characteristics = [];
    for (let i = 0; i < service.characteristics.count; i++) {
      const characteristic = service.characteristics.objectAtIndex(i);
      const result = {
        UUID: characteristic.UUID.UUIDString,
        name: characteristic.UUID,
        // see serviceAndCharacteristicInfo in CBPer+Ext of Cordova plugin
        value: characteristic.value
          ? characteristic.value.base64EncodedStringWithOptions(0)
          : null,
        properties: this._getProperties(characteristic),
        // descriptors: this._getDescriptors(characteristic), // TODO we're not currently discovering these
        isNotifying: characteristic.isNotifying
        // permissions: characteristic.permissions // prolly not too useful - don't think we need this for iOS (BradMartin)
      };
      characteristics.push(result);

      for (let j = 0; j < this._services.length; j++) {
        const s = this._services[j];
        if (s.UUID === service.UUID.UUIDString) {
          s.characteristics = characteristics;
          this._servicesWithCharacteristics.push(s);
          // the same service may be found multiple times, so make sure it's not added yet
          this._services.splice(j, 1);
          break;
        }
      }

      // Could add this one day: get details about the characteristic
      // peripheral.discoverDescriptorsForCharacteristic(characteristic);
    }

    if (this._services.length === 0) {
      if (this._callback) {
        this._callback({
          UUID: peripheral.identifier.UUIDString,
          name: peripheral.name,
          state: this._owner.get()._getState(peripheral.state),
          services: this._servicesWithCharacteristics
        });
        this._callback = null;
      }
    }
  }

  /**
   * Invoked when you discover the descriptors of a specified characteristic.
   * @param peripheral [CBPeripheral] - The peripheral providing this information.
   * @param characteristic [CBCharacteristic] - The characteristic that the characteristic descriptors belong to.
   * @param error [NSError] - If an error occurred, the cause of the failure.
   */
  peripheralDidDiscoverDescriptorsForCharacteristicError(
    peripheral: CBPeripheral,
    characteristic: CBCharacteristic,
    error?: NSError
  ) {
    // TODO extract details, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/ios/BluetoothLePlugin.m#L1844
    for (let i = 0; i < characteristic.descriptors.count; i++) {
      const descriptor = characteristic.descriptors.objectAtIndex(i);
    }

    // now let's see if we're ready to invoke the callback
    if (this._services.length === this._servicesWithCharacteristics.length) {
      if (this._callback) {
        this._callback({
          UUID: peripheral.identifier.UUIDString,
          name: peripheral.name,
          state: this._owner.get()._getState(peripheral.state),
          services: this._services
        });
        this._callback = null;
      }
    }
  }

  /**
   * Invoked when you retrieve a specified characteristic’s value, or when
   * the peripheral device notifies your app that the characteristic’s
   * value has changed.
   */
  peripheralDidUpdateValueForCharacteristicError(
    peripheral: CBPeripheral,
    characteristic: CBCharacteristic,
    error?: NSError
  ) {
    if (!characteristic) {
      console.warn(
        `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- No CBCharacteristic.`
      );
      return;
    }

    if (error !== null) {
      // TODO handle.. pass in sep callback?
      console.error(
        `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- ${error}`
      );
      return;
    }

    const result = {
      type: characteristic.isNotifying ? 'notification' : 'read',
      characteristicUUID: characteristic.UUID.UUIDString,
      valueRaw: characteristic.value,
      value: this._owner.get().toArrayBuffer(characteristic.value)
    };

    if (result.type === 'read') {
      if (this._onReadPromise) {
        this._onReadPromise(result);
      } else {
        console.warn('No _onReadPromise found!');
      }
    } else {
      if (this._onNotifyCallback) {
        this._onNotifyCallback(result);
      } else {
        console.warn('----- CALLBACK IS GONE -----');
      }
    }
  }

  /**
   * Invoked when you retrieve a specified characteristic descriptor’s value.
   */
  peripheralDidUpdateValueForDescriptorError(
    peripheral: CBPeripheral,
    descriptor: CBDescriptor,
    error?: NSError
  ) {
    console.error(
      `CBPeripheralDelegateImpl.peripheralDidUpdateValueForDescriptorError ---- peripheral: ${peripheral}, descriptor: ${descriptor}, error: ${error}`
    );
  }

  /**
   * Invoked when you write data to a characteristic’s value.
   */
  peripheralDidWriteValueForCharacteristicError(
    peripheral: CBPeripheral,
    characteristic: CBCharacteristic,
    error?: NSError
  ) {
    console.error(
      `CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`
    );
    if (this._onWriteTimeout) {
      clearTimeout(this._onWriteTimeout);
      this._onWriteTimeout = null;
    }
    if (error && this._onWriteReject) {
      this._onWriteReject(`Could not write - error: ${error}`);
    } else if (this._onWritePromise) {
      this._onWritePromise({
        characteristicUUID: characteristic.UUID.UUIDString
      });
    } else {
      console.warn(
        'CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- No _onWritePromise found!'
      );
    }
  }

  /**
   * Invoked when the peripheral receives a request to start or stop
   * providing notifications for a specified characteristic’s value.
   */
  peripheralDidUpdateNotificationStateForCharacteristicError(
    peripheral: CBPeripheral,
    characteristic: CBCharacteristic,
    error?: NSError
  ) {
    console.info(
      `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`
    );
    if (error) {
      console.error(
        `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- ${error}`
      );
    } else {
      if (characteristic.isNotifying) {
        console.info(
          `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification began on ${characteristic}`
        );
      } else {
        console.info(
          `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification stopped on  ${characteristic}, consider disconnecting`
        );
        // Bluetooth._manager.cancelPeripheralConnection(peripheral);
      }
    }
  }

  /**
   * IInvoked when you write data to a characteristic descriptor’s value.
   */
  peripheralDidWriteValueForDescriptorError(
    peripheral: CBPeripheral,
    descriptor: CBDescriptor,
    error?: NSError
  ) {
    console.error(
      `CBPeripheralDelegateImpl.peripheralDidWriteValueForDescriptorError ---- peripheral: ${peripheral}, descriptor: ${descriptor}, error: ${error}`
    );
  }

  private _getProperties(characteristic: CBCharacteristic) {
    const props = characteristic.properties;
    return {
      // broadcast: (props & CBCharacteristicPropertyBroadcast) === CBCharacteristicPropertyBroadcast,
      broadcast:
        (props & CBCharacteristicProperties.PropertyBroadcast) ===
        CBCharacteristicProperties.PropertyBroadcast,
      read:
        (props & CBCharacteristicProperties.PropertyRead) ===
        CBCharacteristicProperties.PropertyRead,
      broadcast2:
        (props & CBCharacteristicProperties.PropertyBroadcast) ===
        CBCharacteristicProperties.PropertyBroadcast,
      read2:
        (props & CBCharacteristicProperties.PropertyRead) ===
        CBCharacteristicProperties.PropertyRead,
      write:
        (props & CBCharacteristicProperties.PropertyWrite) ===
        CBCharacteristicProperties.PropertyWrite,
      writeWithoutResponse:
        (props & CBCharacteristicProperties.PropertyWriteWithoutResponse) ===
        CBCharacteristicProperties.PropertyWriteWithoutResponse,
      notify:
        (props & CBCharacteristicProperties.PropertyNotify) ===
        CBCharacteristicProperties.PropertyNotify,
      indicate:
        (props & CBCharacteristicProperties.PropertyIndicate) ===
        CBCharacteristicProperties.PropertyIndicate,
      authenticatedSignedWrites:
        (props &
          CBCharacteristicProperties.PropertyAuthenticatedSignedWrites) ===
        CBCharacteristicProperties.PropertyAuthenticatedSignedWrites,
      extendedProperties:
        (props & CBCharacteristicProperties.PropertyExtendedProperties) ===
        CBCharacteristicProperties.PropertyExtendedProperties,
      notifyEncryptionRequired:
        (props &
          CBCharacteristicProperties.PropertyNotifyEncryptionRequired) ===
        CBCharacteristicProperties.PropertyNotifyEncryptionRequired,
      indicateEncryptionRequired:
        (props &
          CBCharacteristicProperties.PropertyIndicateEncryptionRequired) ===
        CBCharacteristicProperties.PropertyIndicateEncryptionRequired
    };
  }

  private _getDescriptors(characteristic) {
    const descs = characteristic.descriptors;
    const descsJs = [];
    for (let i = 0; i < descs.count; i++) {
      const desc = descs.objectAtIndex(i);
      console.info(
        `CBPeripheralDelegateImpl._getDescriptors ---- descriptor value: ${desc.value}`
      );
      descsJs.push({
        UUID: desc.UUID.UUIDString,
        value: desc.value
      });
    }
    return descsJs;
  }
}

@NativeClass()
class CBCentralManagerDelegateImpl
  extends NSObject
  implements CBCentralManagerDelegate {
  static ObjCProtocols = [CBCentralManagerDelegate];

  private _owner: WeakRef<Bluetooth>;

  // private _callback: (result?) => void;

  static new(): CBCentralManagerDelegateImpl {
    return <CBCentralManagerDelegateImpl>super.new();
  }

  // public initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBCentralManagerDelegateImpl {
  //   this._owner = owner;
  //   CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.initWithCallback ---- this._owner: ${this._owner}`);
  //   this._callback = callback;
  //   return this;
  // }

  initWithOwner(owner: WeakRef<Bluetooth>): CBCentralManagerDelegateImpl {
    this._owner = owner;
    return this;
  }

  /**
   * Invoked when a connection is successfully created with a peripheral.
   * This method is invoked when a call to connect(_:options:) is successful.
   * You typically implement this method to set the peripheral’s delegate and to discover its services.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param peripheral [CBPeripheral] - The peripheral that has been connected to the system.
   */
  centralManagerDidConnectPeripheral(
    central: CBCentralManager,
    peripheral: CBPeripheral
  ) {
    console.info(
      `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: ${peripheral}`
    );

    const owner = this._owner.get();
    if (!owner) {
      console.error(
        '----- CBCentralManagerDelegateImpl didConnectPeripheral: error - no owner!'
      );
      return;
    }

    // find the peri in the array and attach the delegate to that
    const peri = owner.findPeripheral(peripheral.identifier.UUIDString);
    console.info(
      `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: cached perio: ${peri}`
    );

    const cb = owner._connectCallbacks[peripheral.identifier.UUIDString];
    const delegate = TNS_CBPeripheralDelegate.new().initWithCallback(
      this._owner,
      cb
    );
    CFRetain(delegate);
    peri.delegate = delegate;
    peri.discoverServices(null);
    const eventData = {
      device: peripheral,
      UUID: peripheral.identifier.UUIDString,
      name: peripheral.name,
      RSSI: null,
      state: owner._getState(peripheral.state),
      manufacturerId: null,
      manufacturerData: null
    };
    owner.sendEvent('peripheral_connected_event', eventData);
  }

  /**
   * Invoked when an existing connection with a peripheral is torn down.
   * This method is invoked when a peripheral connected via the connect(_:options:) method is disconnected.
   * If the disconnection was not initiated by cancelPeripheralConnection(_:), the cause is detailed in error.
   * After this method is called, no more methods are invoked on the peripheral device’s CBPeripheralDelegate object.
   * Note that when a peripheral is disconnected, all of its services, characteristics, and characteristic descriptors are invalidated.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param peripheral [CBPeripheral] - The peripheral that has been disconnected.
   * @param error? [NSError] - If an error occurred, the cause of the failure.
   */
  centralManagerDidDisconnectPeripheralError(
    central: CBCentralManager,
    peripheral: CBPeripheral,
    error?: NSError
  ) {
    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    // this event needs to be honored by the client as any action afterwards crashes the app
    const cb = owner._disconnectCallbacks[peripheral.identifier.UUIDString];
    if (cb) {
      cb({
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name
      });
    } else {
      console.warn(
        `***** centralManagerDidDisconnectPeripheralError() no disconnect callback found *****`
      );
    }
    owner.removePeripheral(peripheral);
    const eventData = {
      device: peripheral,
      UUID: peripheral.identifier.UUIDString,
      name: peripheral.name,
      RSSI: null,
      state: owner._getState(peripheral.state),
      manufacturerId: null,
      manufacturerData: null,
      error: error
    };
    owner.sendEvent('peripheral_disconnected_event', eventData);
  }

  /**
   * Invoked when the central manager fails to create a connection with a peripheral.
   * This method is invoked when a connection initiated via the connect(_:options:) method fails to complete.
   * Because connection attempts do not time out, a failed connection usually indicates a transient issue, in which case you may attempt to connect to the peripheral again.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param peripheral [CBPeripheral] - The peripheral that failed to connect.
   * @param error? [NSError] - The cause of the failure.
   */
  centralManagerDidFailToConnectPeripheralError(
    central: CBCentralManager,
    peripheral: CBPeripheral,
    error?: NSError
  ) {
    console.error(
      `CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----`,
      central,
      peripheral,
      error
    );

    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    const eventData = {
      device: peripheral,
      UUID: peripheral.identifier.UUIDString,
      name: peripheral.name,
      RSSI: null,
      state: owner._getState(peripheral.state),
      manufacturerId: null,
      manufacturerData: null,
      error: error
    };
    owner.sendEvent('peripheral_failed_to_connect_event', eventData);
  }

  /**
   * Invoked when the central manager discovers a peripheral while scanning.
   * The advertisement data can be accessed through the keys listed in Advertisement Data Retrieval Keys.
   * You must retain a local copy of the peripheral if any command is to be performed on it.
   * In use cases where it makes sense for your app to automatically connect to a peripheral that is located within a certain range, you can use RSSI data to determine the proximity of a discovered peripheral device.
   * @param central [CBCentralManager] - The central manager providing the update.
   * @param peripheral [CBPeripheral] - The discovered peripheral.
   * @param advData [NSDictionary<string, any>] - A dictionary containing any advertisement data.
   * @param RSSI [NSNumber] - The current received signal strength indicator (RSSI) of the peripheral, in decibels.
   */
  centralManagerDidDiscoverPeripheralAdvertisementDataRSSI(
    central: CBCentralManager,
    peripheral: CBPeripheral,
    advData: NSDictionary<string, any>,
    RSSI: number
  ) {
    console.info(
      `CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- ${peripheral.name} @ ${RSSI}`
    );

    const owner = this._owner.get();
    if (!owner) {
      return;
    }

    const peri = owner.findPeripheral(peripheral.identifier.UUIDString);
    if (!peri) {
      owner.addPeripheral(peripheral);
      let manufacturerId;
      let manufacturerData;
      if (advData.objectForKey(CBAdvertisementDataManufacturerDataKey)) {
        const manufacturerIdBuffer = this._owner
          .get()
          .toArrayBuffer(
            advData
              .objectForKey(CBAdvertisementDataManufacturerDataKey)
              .subdataWithRange(NSMakeRange(0, 2))
          );
        manufacturerId = new DataView(manufacturerIdBuffer, 0).getUint16(
          0,
          true
        );
        manufacturerData = this._owner
          .get()
          .toArrayBuffer(
            advData
              .objectForKey(CBAdvertisementDataManufacturerDataKey)
              .subdataWithRange(
                NSMakeRange(
                  2,
                  advData.objectForKey(CBAdvertisementDataManufacturerDataKey)
                    .length - 2
                )
              )
          );
      }

      const eventData = {
        device: peripheral,
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name,
        RSSI: RSSI,
        state: owner._getState(peripheral.state),
        manufacturerId: manufacturerId,
        manufacturerData: manufacturerData
      };

      owner.sendEvent(Bluetooth.device_discovered_event, eventData);
      if (owner._onDiscovered) {
        owner._onDiscovered(eventData);
      } else {
        console.warn(
          'CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- No onDiscovered callback specified'
        );
      }
    }
  }

  /**
   * Invoked when the central manager’s state is updated.
   * You implement this required method to ensure that Bluetooth low energy is supported and available to use on the central device.
   * You should issue commands to the central manager only when the state of the central manager is powered on, as indicated by the poweredOn constant.
   * A state with a value lower than poweredOn implies that scanning has stopped and that any connected peripherals have been disconnected.
   * If the state moves below poweredOff, all CBPeripheral objects obtained from this central manager become invalid and must be retrieved or discovered again.
   * For a complete list and discussion of the possible values representing the state of the central manager, see the CBCentralManagerState enumeration in CBCentralManager.
   * @param central [CBCentralManager] - The central manager providing this information.
   */
  centralManagerDidUpdateState(central: CBCentralManager) {
    if (central.state === CBManagerState.Unsupported) {
      console.warn(
        `CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.`
      );
    }

    const owner = this._owner.get();
    if (!owner) {
      return;
    }

    owner.sendEvent(Bluetooth.centralmanager_updated_state_event, {
      manager: central,
      state: central.state
    });

    let status;
    // checking the auth state of the Manager to emit the authorization event
    // so the app can know the auth/permission
    if (nsDevice.sdkVersion < '13.0') {
      const value = CBPeripheralManager.authorizationStatus();
      status = this._checkPeripheralManagerStatus(value);
    } else if (nsDevice.sdkVersion >= '13.0') {
      const value = central.authorization;
      status = this._checkCentralManagerStatus(value);
    }
    owner.sendEvent(Bluetooth.bluetooth_authorization_event, {
      status
    });
  }

  /**
   * Invoked when the central manager is about to be restored by the system.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param dict [NSDictionary<string, any>] - A dictionary containing information about the central manager that was preserved by the system at the time the app was terminated.
   * For the available keys to this dictionary, see Central Manager State Restoration Options.
   * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate/central_manager_state_restoration_options
   */
  centralManagerWillRestoreState(
    central: CBCentralManager,
    dict: NSDictionary<string, any>
  ) {
    console.info(
      `CBCentralManagerDelegateImpl.centralManagerWillRestoreState ---- central: ${central}, dict: ${dict}`
    );

    const owner = this._owner.get();
    if (!owner) {
      return;
    }

    // Get all restored Peripherals
    const peripheralArray = dict.objectForKey(
      CBCentralManagerRestoredStatePeripheralsKey
    );
    console.info('Restoring ', peripheralArray.count);
    for (let i = 0; i < peripheralArray.count; i++) {
      const peripheral = peripheralArray.objectAtIndex(i);
      owner.addPeripheral(peripheral);

      const eventData = {
        device: peripheral,
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name,
        RSSI: null,
        state: owner._getState(peripheral.state),
        manufacturerId: null,
        manufacturerData: null
      };

      owner.sendEvent(Bluetooth.device_discovered_event, eventData);
      if (owner._onDiscovered) {
        owner._onDiscovered(eventData);
      }
    }

    owner.sendEvent('centralmanager_restore_state_event', {
      manager: central,
      dict
    });
  }

  private _checkCentralManagerStatus(value: CBManagerAuthorization) {
    switch (value) {
      case CBManagerAuthorization.AllowedAlways:
        return 'authorized';
      case CBManagerAuthorization.Denied:
        return 'denied';
      case CBManagerAuthorization.Restricted:
        return 'restricted';
      default:
        return 'undetermined';
    }
  }

  private _checkPeripheralManagerStatus(
    value: CBPeripheralManagerAuthorizationStatus
  ) {
    switch (value) {
      case CBPeripheralManagerAuthorizationStatus.Authorized:
        return 'authorized';
      case CBPeripheralManagerAuthorizationStatus.Denied:
        return 'denied';
      case CBPeripheralManagerAuthorizationStatus.Restricted:
        return 'restricted';
      default:
        return 'undetermined';
    }
  }
}

@NativeClass()
class CBPeripheralManagerDelegateImpl
  extends NSObject
  implements CBPeripheralManagerDelegate {
  static ObjCProtocols = [CBPeripheralManagerDelegate];
  private _owner: WeakRef<Bluetooth>;
  private _central?: CBCentral;
  private _isConnected = false;
  private _otaInProgress = false;
  private _lastObservedPeripheralState?: CBManagerState;
  private _subscribedCharacteristics = new Set<CBUUID>();
  private _forceUpdate = false;
  private _isWakeSupportCheck = false;
  private _bandSupportsWake = false;
  private _isSendingTime = false;

  static new(): CBPeripheralManagerDelegateImpl {
    return <CBPeripheralManagerDelegateImpl>super.new();
  }

  initWithOwner(owner: WeakRef<Bluetooth>): CBPeripheralManagerDelegateImpl {
    this._owner = owner;
    return this;
  }

  initWithCallback(
    owner: WeakRef<Bluetooth>,
    callback: (result?) => void
  ): CBPeripheralManagerDelegateImpl {
    this._owner = owner;
    return this;
  }

  /**
   * Invoked when the peripheral manager's state is updated.
   * @param mgr [CBPeripheralManager] - The peripheral manager whose state has changed.
   */
  peripheralManagerDidUpdateState(mgr: CBPeripheralManager) {
    const owner = this._owner.get();
    if (!owner) {
      return;
    }

    this._lastObservedPeripheralState = mgr.state;

    const state = owner._getManagerStateString(mgr.state);

    owner.sendEvent(Bluetooth.peripheralmanager_update_state_event, {
      manager: mgr,
      state
    });

    if (nsDevice.sdkVersion < '13.0') {
      let status;
      const value = CBPeripheralManager.authorizationStatus();
      switch (value) {
        case CBPeripheralManagerAuthorizationStatus.Authorized:
          status = 'authorized';
          break;
        case CBPeripheralManagerAuthorizationStatus.Denied:
          status = 'denied';
          break;
        case CBPeripheralManagerAuthorizationStatus.Restricted:
          status = 'restricted';
          break;
        default:
          status = 'undetermined';
          break;
      }
      owner.sendEvent(Bluetooth.bluetooth_authorization_event, {
        status
      });
    }
  }

  /**
   * Invoked when the peripheral manager is about to be restored by the system.
   * @param peripheral [CBPeripheralManager] - The peripheral manager providing this information.
   * @param dict [NSDictionary<string, any>] - A dictionary containing information about the peripheral manager that was preserved by the system at the time the app was terminated. For the available keys to this dictionary.
   * @link - Peripheral Manager State Restoration Options @ https://developer.apple.com/documentation/corebluetooth/cbperipheralmanagerdelegate/peripheral_manager_state_restoration_options.
   */
  peripheralManagerWillRestoreState(
    peripheral: CBPeripheralManager,
    dict?: NSDictionary<string, any>
  ) {
    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    owner.sendEvent(Bluetooth.peripheralmanager_restore_state_event, {
      manager: peripheral,
      dict: dict
    });
  }

  /**
   * Invoked when you publish a service, and any of its associated characteristics and characteristic descriptors, to the local Generic Attribute Profile (GATT) database.
   * This method is invoked when your app calls the add(_:) method to publish a service to the local peripheral’s GATT database.
   * If the service is successfully published to the local database, the error parameter is nil.
   * If unsuccessful, the error parameter returns the cause of the failure.
   * @param peripheral [CBPeripheralManager] - The peripheral manager providing this information.
   * @param service [CBService] - The service that was added to the local GATT database.
   * @param error? [NSError] - If an error occurred, the cause of the failure.
   */
  peripheralManagerDidAddError(
    peripheral: CBPeripheralManager,
    service: CBService,
    error?: NSError
  ) {
    console.error(
      'CBPeripheralManagerDelegateImpl.peripheralManagerDidAddError ---- ',
      error
    );

    Dialogs.alert('Peripheral Manager Did Add Error');

    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    owner.sendEvent(Bluetooth.peripheralmanager_did_add_event, {
      manager: peripheral,
      service: service,
      error: error
    });
  }

  /**
   * Invoked when you start advertising the local peripheral device’s data.
   * @param peripheralMgr [CBPeripheralManager] - The peripheral manager providing this information.
   * @param error? [NSError] - If an error occurred, the cause of the failure.
   */
  peripheralManagerDidStartAdvertisingError(
    peripheralMgr: CBPeripheralManager,
    error?: NSError
  ) {
    console.error(
      'CBPeripheralManagerDelegateImpl.peripheralManagerDidStartAdvertisingError ----',
      error
    );
    const owner = this._owner.get();
    if (!owner) {
      return;
    }

    if (error) {
      console.error(
        'TODO: we may need to parse out the error value here for parity with Android.'
      );
      this._owner.get().sendEvent(Bluetooth.bluetooth_advertise_failure_event, {
        error: error
      });
      return;
    }

    this._owner.get().sendEvent(Bluetooth.bluetooth_advertise_success_event);
  }

  /**
   * Invoked when a remote central device subscribes to a characteristic’s value.
   * This method is invoked when a remote central device subscribes to the value of one of the local peripheral’s characteristics, by enabling notifications or indications on the characteristic’s value.
   * You should use the invocation of this method as a cue to start sending the subscribed central updates as the characteristic’s value changes.
   * To send updated characteristic values to subscribed centrals, use the updateValue(_:for:onSubscribedCentrals:) method of the CBPeripheralManager class.
   * @param peripheral [CBPeripheralManager] - The peripheral manager providing this information.
   * @param central [CBCentral] - The remote central device that subscribed to the characteristic’s value.
   * @param characteristic [CBCharacteristic] - The characteristic whose value has been subscribed to.
   */
  peripheralManagerCentralDidSubscribeToCharacteristic(
    peripheral: CBPeripheralManager,
    central: CBCentral,
    characteristic: CBCharacteristic
  ) {
    console.info(
      'CBPeripheralManagerDelegateImpl.peripheralManagerCentralDidSubscribeToCharacteristic ----',
      characteristic
    );

    let isNewCentral = false;

    const oldCentral = this._central;
    if (!oldCentral || !oldCentral.identifier) {
      // nothing
    }

    if (oldCentral && oldCentral.identifier && oldCentral === this._central) {
      if (oldCentral.identifier !== central.identifier) {
        isNewCentral = true;
      } else if (oldCentral !== central) {
        isNewCentral = true;
      }
    } else {
      isNewCentral = true;
    }

    if (isNewCentral) {
      this._central = central;
      this._subscribedCharacteristics = new Set<CBUUID>();
    }

    // set low connection latency
    peripheral.setDesiredConnectionLatencyForCentral(
      CBPeripheralManagerConnectionLatency.Low,
      central
    );

    this._isConnected = true;
    this._subscribedCharacteristics.add(characteristic.UUID);

    const owner = this._owner.get();
    if (!owner) {
      return;
    }

    // get return data for cross-platform use
    const connection_state = ConnectionState.connected;

    const dev = getDevice(central);
    dev.UUIDs = ['1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0'.toUpperCase()]; // hard code pt uuid for now

    owner.sendEvent(Bluetooth.server_connection_state_changed_event, {
      device: dev,
      manager: peripheral,
      central: central,
      connection_state
    });
  }

  /**
   * Invoked when a remote central device unsubscribes from a characteristic’s value.
   * This method is invoked when a remote central device unsubscribes from the value of one of the local peripheral’s characteristics, by disabling notifications or indications on the characteristic’s value.
   * You should use the invocation of this method as a cue to stop sending the subscribed central updates as the characteristic’s value changes.
   * @param peripheral [CBPeripheralManager] -The peripheral manager providing this information.
   * @param central [CBCentral] - The remote central device that subscribed to the characteristic’s value.
   * @param characteristic [CBCharacteristic] - The characteristic whose value has been unsubscribed from.
   */
  peripheralManagerCentralDidUnsubscribeFromCharacteristic(
    peripheral: CBPeripheralManager,
    central: CBCentral,
    characteristic: CBCharacteristic
  ) {
    console.info(
      'CBPeripheralManagerDelegateImpl.peripheralManagerCentralDidUnsubscribeFromCharacteristic ----',
      central,
      characteristic
    );

    this._subscribedCharacteristics.delete(characteristic.UUID);

    if (this._subscribedCharacteristics.size <= 0) {
      this._isConnected = false;
      // start advertising again ...?
    }

    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    /*
        owner.sendEvent(Bluetooth.peripheralmanager_unsubscribe_characteristic_event, {
            manager: peripheral,
            central: central,
            characteristic: characteristic
        });
        */

    // get return data for cross-platform use
    const connection_state = ConnectionState.disconnected;
    const dev = getDevice(central);
    dev.UUIDs = ['1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0'.toUpperCase()]; // hard code pt uuid for now

    owner.sendEvent(Bluetooth.server_connection_state_changed_event, {
      device: dev,
      manager: peripheral,
      central: central,
      connection_state
    });
  }

  /**
   * This method is invoked when your app calls the addService: method to publish a service to the local peripheral’s
   * GATT database. If the service is successfully published to the local database, the error parameter is nil.
   * If unsuccessful, the error parameter returns the cause of the failure.
   * @param peripheral - The peripheral manager providing this information.
   * @param service - The service that was added to the local GATT database.
   * @param error - If an error occurred, the cause of the failure.
   */
  peripheralManagerDidAddServiceError(
    peripheral: CBPeripheralManager,
    service: CBService,
    error: NSError
  ) {
    console.info(
      'CBPeripheralManagerDelegateImpl.peripheralManagerDidAddServiceError ----',
      peripheral,
      service,
      `error: ${error}`
    );
  }

  /**
   * Invoked when a local peripheral device is again ready to send characteristic value updates.
   * When a call to the updateValue(_:for:onSubscribedCentrals:) method fails because the underlying queue used to transmit the updated characteristic value is full, the peripheralManagerIsReady(toUpdateSubscribers:) method is invoked when more space in the transmit queue becomes available.
   * You can then implement this delegate method to resend the value.
   * @param peripheral [CBPeripheralManager] - The peripheral manager providing this information.
   */
  peripheralManagerIsReadyToUpdateSubscribers(peripheral: CBPeripheralManager) {
    console.info(
      'CBPeripheralManagerDelegateImpl.peripheralManagerIsReadyToUpdateSubscribers ----',
      peripheral
    );

    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    owner.sendEvent(
      Bluetooth.peripheralmanager_ready_update_subscribers_event,
      {
        manager: peripheral
      }
    );
  }

  /**
   * Invoked when a local peripheral device receives an Attribute Protocol (ATT) read request for a characteristic that has a dynamic value.
   * Each time this method is invoked, you call the respond(to:withResult:) method of the CBPeripheralManager class exactly once to respond to the read request.
   * @param peripheral [CBPeripheralManager] - The peripheral manager providing this information.
   * @param request [CBATTRequest] - A CBATTRequest object that represents a request to read a characteristic’s value.
   */
  peripheralManagerDidReceiveReadRequest(
    peripheral: CBPeripheralManager,
    request: CBATTRequest
  ) {
    console.info(
      'CBPeripheralManagerDelegateImpl.peripheralManagerDidReceiveReadRequest ----',
      peripheral,
      request
    );

    // set low connection latency
    peripheral.setDesiredConnectionLatencyForCentral(
      CBPeripheralManagerConnectionLatency.Low,
      request.central
    );

    peripheral.respondToRequestWithResult(request, CBATTError.Success);

    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    owner.sendEvent(Bluetooth.peripheralmanager_read_request_event, {
      manager: peripheral,
      request: request
    });

    // peripheral.respond(request, CBATTError.Success);
  }

  /**
   * Invoked when a local peripheral device receives an Attribute Protocol (ATT) write request for a characteristic that has a dynamic value.
   * In the same way that you respond to a read request, each time this method is invoked, you call the respond(to:withResult:) method of the CBPeripheralManager class exactly once.
   * If the requests parameter contains multiple requests, treat them as you would a single request—if any individual request cannot be fulfilled, you should not fulfill any of them.
   * Instead, call the respond(to:withResult:) method immediately, and provide a result that indicates the cause of the failure.
   * When you respond to a write request, note that the first parameter of the respond(to:withResult:) method expects a single CBATTRequest object, even though you received an array of them from the peripheralManager(_:didReceiveWrite:) method.
   * To respond properly, pass in the first request of the requests array.
   * @param peripheral [CBPeripheralManager] - The peripheral manager providing this information.
   * @param requests CBATTRequest[] - A list of one or more CBATTRequest objects, each representing a request to write the value of a characteristic.
   */
  peripheralManagerDidReceiveWriteRequests(
    peripheral: CBPeripheralManager,
    requests
  ) {
    console.info(
      'CBPeripheralManagerDelegateImpl.peripheralManagerDidReceiveWriteRequests ----',
      peripheral,
      requests
    );

    const owner = this._owner.get();
    if (!owner) {
      return;
    }
    owner.sendEvent(Bluetooth.peripheralmanager_write_request_event, {
      manager: peripheral,
      requests: requests
    });

    // per docs:
    /*
		In the same way that you respond to a read request, each time
		this method is invoked, you call the respond(to:withResult:)
		method of the CBPeripheralManager class exactly once. If the
		requests parameter contains multiple requests, treat them as
		you would a single request—if any individual request cannot be
		fulfilled, you should not fulfill any of them. Instead, call
		the respond(to:withResult:) method immediately, and provide a
		result that indicates the cause of the failure.

		When you respond to a write request, note that the first
		parameter of the respond(to:withResult:) method expects a
		single CBATTRequest object, even though you received an array
		of them from the peripheralManager(_:didReceiveWrite:)
		method. To respond properly, pass in the first request of the
		requests array.
	   */
    peripheral.respondToRequestWithResult(
      requests.objectAtIndex(0),
      CBATTError.Success
    );

    for (let i = 0; i < requests.count; i++) {
      const r = requests.objectAtIndex(i);

      // set low connection latency
      // peripheral.setDesiredConnectionLatencyForCentral(CBPeripheralManagerConnectionLatency.Low, r.central);

      const dev = getDevice(r.central);
      owner.sendEvent(Bluetooth.characteristic_write_request_event, {
        device: dev,
        manager: peripheral,
        requestId: i,
        characteristic: r.characteristic,
        preparedWrite: null,
        responseNeeded: false,
        offset: r.offset,
        value: r.value
      });
    }

    // peripheral.respond(requests[0], CBATTError.Success);
  }
}
