/// <reference path="../../../node_modules/tns-platform-declarations/ios.d.ts" />

import { Injectable } from '@angular/core';
import { isAndroid, isIOS, Observable, ObservableArray } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { fromObject } from '@nativescript/core/data/observable';
import { Log, Packet } from '@permobil/core';
import { Bluetooth, BondState, ConnectionState, Device } from 'nativescript-bluetooth';
import { check as checkPermission, request as requestPermission } from 'nativescript-perms';
import { STORAGE_KEYS } from '../enums';
import { PushTracker, SmartDrive } from '../models';
import { LoggingService } from './logging.service';

export enum PushTrackerState {
  unknown,
  paired,
  busy,
  disconnected,
  connected,
  ready
}

@Injectable()
export class BluetoothService extends Observable {
  // static members
  static AppServiceUUID = '9358ac8f-6343-4a31-b4e0-4b13a2b45d86';
  static PushTrackers = new ObservableArray<PushTracker>();
  static SmartDrives = new ObservableArray<SmartDrive>();
  static advertise_success = 'advertise_success';
  static advertise_error = 'advertise_error';
  static pushtracker_added = 'pushtracker_added';
  static pushtracker_connected = 'pushtracker_connected';
  static pushtracker_disconnected = 'pushtracker_disconnected';
  static smartdrive_connected = 'smartdrive_connected';
  static smartdrive_disconnected = 'smartdrive_disconnected';
  static pushtracker_status_changed = 'pushtracker_status_changed';
  static bluetooth_authorization_event = 'bluetooth_authorization_event';

  /**
   * Observable to monitor the push tracker connectivity status. The MaxActionBar uses this to display the correct icon.
   */
  static pushTrackerStatus: Observable = fromObject({
    state: PushTrackerState.unknown
  });
  static _backgroundOtaTask: number = isIOS ? UIBackgroundTaskInvalid : null;

  // members
  initialized = false;
  advertising = false;

  // private members
  private _bluetooth = new Bluetooth();
  private AppService: any = null;

  constructor(private _logService: LoggingService) {
    super();

    // Checking app-settings to see if the user has paired a PT before
    const hasPairedToPT = appSettings.getBoolean(
      STORAGE_KEYS.HAS_PAIRED_TO_PUSHTRACKER,
      false
    );
    const state =
      hasPairedToPT === true
        ? PushTrackerState.paired
        : PushTrackerState.unknown;

    BluetoothService.pushTrackerStatus.set('state', state);

    // enabling `debug` will output console.logs from the bluetooth source code
    this._bluetooth.debug = false;

    this._logService.logBreadCrumb(BluetoothService.name, 'Constructor');

    // Remember when we started
    const start = new Date().getTime();
    this.initialize()
      .then(() => {
        // Remember when we finished
        const end = new Date().getTime();
        this._logService.logBreadCrumb(
          BluetoothService.name,
          `Bluetooth init took: ${(end - start).toFixed(2)}ms`
        );
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  static requestOtaBackgroundExecution() {
    if (isIOS) {
      if (this._backgroundOtaTask !== UIBackgroundTaskInvalid) {
        return;
      }

      this._backgroundOtaTask = UIApplication.sharedApplication.beginBackgroundTaskWithExpirationHandler(
        BluetoothService.stopOtaBackgroundExecution
      );
      return this._backgroundOtaTask;
    }
  }

  static stopOtaBackgroundExecution() {
    if (isIOS) {
      if (this._backgroundOtaTask === UIBackgroundTaskInvalid) {
        return;
      }

      UIApplication.sharedApplication.endBackgroundTask(
        this._backgroundOtaTask
      );
      this._backgroundOtaTask = UIBackgroundTaskInvalid;
    }
  }

  setEventListeners() {
    this.clearEventListeners();
    // setup event listeners
    this._bluetooth.on(
      Bluetooth.bond_status_change_event,
      this.onBondStatusChange,
      this
    );
    this._bluetooth.on(
      Bluetooth.peripheral_connected_event,
      this.onPeripheralConnected,
      this
    );
    this._bluetooth.on(
      Bluetooth.peripheral_disconnected_event,
      this.onPeripheralDisconnected,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_discovered_event,
      this.onDeviceDiscovered,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_name_change_event,
      this.onDeviceNameChange,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_uuid_change_event,
      this.onDeviceUuidChange,
      this
    );
    this._bluetooth.on(
      Bluetooth.device_acl_disconnected_event,
      this.onDeviceAclDisconnected,
      this
    );

    this._bluetooth.on(
      Bluetooth.server_connection_state_changed_event,
      this.onServerConnectionStateChanged,
      this
    );
    this._bluetooth.on(
      Bluetooth.characteristic_write_request_event,
      this.onCharacteristicWriteRequest,
      this
    );
    this._bluetooth.on(
      Bluetooth.characteristic_read_request_event,
      this.onCharacteristicReadRequest,
      this
    );
    this._bluetooth.on(
      Bluetooth.bluetooth_advertise_failure_event,
      this.onAdvertiseFailure,
      this
    );
    this._bluetooth.on(
      Bluetooth.bluetooth_advertise_success_event,
      this.onAdvertiseSuccess,
      this
    );

    // iOS ONLY event for SDK 13x+
    if (isIOS) {
      this._bluetooth.on(
        Bluetooth.bluetooth_authorization_event,
        this.onBluetoothAuthEvent,
        this
      );
    }
  }

  clearEventListeners() {
    // setup event listeners
    this._bluetooth.off(Bluetooth.bond_status_change_event);
    this._bluetooth.off(Bluetooth.peripheral_connected_event);
    this._bluetooth.off(Bluetooth.peripheral_disconnected_event);
    this._bluetooth.off(Bluetooth.device_discovered_event);
    this._bluetooth.off(Bluetooth.device_name_change_event);
    this._bluetooth.off(Bluetooth.device_uuid_change_event);
    this._bluetooth.off(Bluetooth.device_acl_disconnected_event);
    this._bluetooth.off(Bluetooth.server_connection_state_changed_event);
    this._bluetooth.off(Bluetooth.characteristic_write_request_event);
    this._bluetooth.off(Bluetooth.characteristic_read_request_event);
    this._bluetooth.off(Bluetooth.bluetooth_advertise_failure_event);
    this._bluetooth.off(Bluetooth.bluetooth_advertise_success_event);
    this._bluetooth.off(Bluetooth.centralmanager_updated_state_event);
    if (isIOS) {
      this._bluetooth.off(Bluetooth.bluetooth_authorization_event);
    }
  }

  clearSmartDrives() {
    const connectedSDs = BluetoothService.SmartDrives.slice().filter(
      sd => sd.connected
    );
    BluetoothService.SmartDrives.splice(
      0,
      BluetoothService.SmartDrives.length,
      ...connectedSDs
    );
  }

  clearPushTrackers() {
    BluetoothService.PushTrackers.splice(
      0,
      BluetoothService.PushTrackers.length
    );
  }

  /**
   * Check if bluetooth is enabled.
   */
  radioEnabled(): Promise<boolean> {
    return this._bluetooth.isBluetoothEnabled();
  }

  async initialize(): Promise<any> {
    this.initialized = false;
    this.advertising = false;

    this.clearEventListeners();
    this.setEventListeners();

    this.initialized = true;
  }

  async advertise() {
    if (this.advertising) {
      return; // we no longer return a boolean
    }
    this.advertising = true;

    // check to make sure that bluetooth is enabled, or this will
    // always fail and we don't need to show the error
    const result = await this._bluetooth.isBluetoothEnabled();

    if (result === false) {
      if (isAndroid) {
        try {
          await this._bluetooth.enable();
        } catch (err) {
          this.sendEvent(BluetoothService.advertise_error, { error: err });
          this._logService.logException(err);
          this.advertising = false;
          throw err;
        }
      } else if (isIOS) {
        // can't do anything about it on ios
        const err = new Error('Bluetooth not Enabled');
        this.sendEvent(BluetoothService.advertise_error, { error: err });
        this.advertising = false;
        throw err;
      }
    }

    this._bluetooth.startGattServer();

    // remove the services
    this.deleteServices();
    // now add them back
    this.addServices();

    try {
      await this._bluetooth
        .startAdvertising({
          UUID: BluetoothService.AppServiceUUID,
          settings: {
            connectable: true
          },
          data: {
            includeDeviceName: true
          }
        });
    } catch (err) {
      this.advertising = false;
      this.sendEvent(BluetoothService.advertise_error, { error: err });
      this._logService.logException(err);
      throw err;
    }

    this._bluetooth.addService(this.AppService);
    this.sendEvent(BluetoothService.advertise_success);
  }

  scanForAny(timeout: number = 4): Promise<any> {
    return this.scan([], timeout);
  }

  scanForSmartDrive(timeout: number = 4): Promise<any> {
    this.clearSmartDrives();
    return this.scan([SmartDrive.ServiceUUID], timeout);
  }

  scanForSmartDriveReturnOnFirst(timeout: number = 4): Promise<any> {
    this.clearSmartDrives();
    return new Promise(async (resolve, reject) => {
      try {
        await this._bluetooth.startScanning({
          serviceUUIDs: [SmartDrive.ServiceUUID],
          seconds: timeout,
          onDiscovered: (peripheral: any) => {
            // stop scanning
            this._bluetooth.stopScanning();
            // get what we need for SD
            const p = {
              rssi: peripheral.RSSI,
              device: peripheral.device,
              address: peripheral.UUID,
              name: peripheral.name
            };
            let sd = undefined;
            // determine if it's a SD and get it
            if (this.isSmartDrive(p)) {
              sd = this.getOrMakeSmartDrive(p);
            }
            // now resolve
            resolve(sd);
          }
        });
        resolve(undefined);
      } catch (err) {
        resolve(undefined);
      }
    });
  }

  // returns a promise that resolves when scanning completes
  scan(uuids: string[], timeout: number = 4): Promise<any> {
    return this._bluetooth.startScanning({
      serviceUUIDs: uuids,
      seconds: timeout
    });
  }

  stopScanning(): Promise<any> {
    return this._bluetooth.stopScanning();
  }

  connect(address: string, onConnected?: any, onDisconnected?: any) {
    return this._bluetooth.connect({
      UUID: address,
      onConnected: onConnected,
      onDisconnected: onDisconnected
    });
  }

  disconnectAll(): Promise<any> {
    // TODO: the android implementation of these functions don't
    //       work

    // TODO: update to be cross-platform
    return Promise.resolve();
    /*
          let tasks = [];
          const gattDevices = this._bluetooth.getConnectedDevices();
          const gattServerDevices = this._bluetooth.getServerConnectedDevices();
          if (gattDevices && gattDevices.length) {
          tasks = gattDevices.map(device => {
          return this._bluetooth.disconnect({ UUID: `${device}` });
          });
          }
          if (gattServerDevices && gattServerDevices.length) {
          tasks = gattServerDevices.map(device => {
          return this._bluetooth.cancelServerConnection(device);
          });
          }
          return Promise.all(tasks);
        */
  }

  disconnect(args: any): Promise<any> {
    return this._bluetooth.disconnect(args);
  }

  discoverServices(_: any) { }

  discoverCharacteristics(_: any) { }

  startNotifying(opts: any) {
    return this._bluetooth.startNotifying(opts);
  }

  stopNotifying(opts: any) {
    return this._bluetooth.stopNotifying(opts);
  }

  public async getIOSPermissions() {
    if (isIOS) {
      return await checkPermission('bluetooth');
    } else {
      throw new Error('Unsupported operation when not on iOS');
    }
  }

  public async hasPermissions() {
    let _has = false;
    if (isAndroid) {
      _has = await this._bluetooth.hasCoarseLocationPermission();
    } else if (isIOS) {
      const result = await checkPermission('bluetooth');
      _has = result === 'authorized';
    }
    this._logService.logBreadCrumb(BluetoothService.name, `_has: ${_has}`);
    return _has;
  }

  public async requestPermissions() {
    const _hasPerms = await this.hasPermissions();
    this._logService.logBreadCrumb(
      BluetoothService.name,
      `has perms: ${_hasPerms}`
    );
    if (isAndroid) {
      try {
        await this._bluetooth.requestCoarseLocationPermission();
        return true;
      } catch (err) {
        return false;
      }
    } else if (isIOS) {
      const status = await requestPermission('bluetooth');
      return (status === 'authorized');
    }
  }

  public requestConnectionPriority(address: string, priority: number) {
    return isAndroid
      ? this._bluetooth.requestConnectionPriority(address, priority)
      : false;
  }

  write(opts: any) {
    return this._bluetooth.write(opts);
  }

  async stop(): Promise<any> {
    this.initialized = false;
    this.advertising = false;
    // remove the services
    this.deleteServices();
    // stop the gatt server
    this._bluetooth.stopGattServer(); // TODO: android only for now
    // stop listening for events
    this.clearEventListeners();
    // disconnect
    // await this.disconnectAll(); // TODO: doesn't work right now
    // stop advertising
    this._bluetooth.stopAdvertising();
    return Promise.resolve();
  }

  async restart(): Promise<boolean> {
    try {
      await this.stop();
      await this.advertise();
      return true;
    } catch (err) {
      this.initialized = false;
      this.advertising = false;
      return false;
    }
  }

  // private functions
  // event listeners
  private onAdvertiseFailure(args: any): void {
    this._logService.logBreadCrumb(
      BluetoothService.name,
      'Failed to advertise',
      args ? args.data : null // avoid passing null into the NSDictionary for Sentry
    );
    // nothing
  }

  private onAdvertiseSuccess(_: any): void {
    this._logService.logBreadCrumb(
      BluetoothService.name,
      'Succeeded in advertising!'
    );
    // nothing
  }

  private onBluetoothAuthEvent(args: any) {
    Log.D('Bluetooth Auth Event', args.data);
    // make sure to relay the event so others listening for it will
    // receive it
    this.sendEvent(BluetoothService.bluetooth_authorization_event, args.data);
  }

  private onBondStatusChange(args: any): void {
    const argdata = args.data;
    const dev = argdata.device as Device;
    const bondState = argdata.bondState;
    switch (bondState) {
      case BondState.bonding:
        break;
      case BondState.bonded:
        if (isAndroid) {
          this._bluetooth.removeBond(dev.device);
        }
        const pt = this.getOrMakePushTracker(dev);
        pt.handlePaired();
        this.updatePushTrackerState();
        break;
      case BondState.none:
        break;
      default:
        break;
    }
  }

  private onDeviceDiscovered(args: any): void {
    const argdata = args.data;
    const peripheral = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    if (this.isSmartDrive(peripheral)) {
      this.getOrMakeSmartDrive(peripheral);
    }
  }

  private onDeviceNameChange(_: any): void { }

  private onDeviceUuidChange(_: any): void {
    // TODO: This function doesn't work (android BT impl returns null)
    /*
          const dev = args.data.device;
          if (!args.data.uuids) {
          return;
          }
          const newUUID = args.data.uuids[0].toString();
          if (this.isSmartDrive(dev)) {
          const address = dev.UUID;
          const sd = this.getOrMakeSmartDrive(address);
          } else if (this.isPushTracker(dev)) {
          const address = dev.getAddress();
          const pt = this.getOrMakePushTracker(address);
          }
        */
  }

  private onDeviceAclDisconnected(args: any): void {
    // TODO: should be only of type Peripheral
    const argdata = args.data;
    const device = argdata.device;
    if (this.isSmartDrive(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleDisconnect();
    } else if (this.isPushTracker(device)) {
      const pt = this.getOrMakePushTracker(device);
      pt.handleDisconnect();
      this.updatePushTrackerState();
    }
  }

  private onServerConnectionStateChanged(args: any): void {
    const argdata = args.data;
    const connection_state = argdata.connection_state;
    const device = argdata.device;

    switch (connection_state) {
      case ConnectionState.connected:
        if (this.isPushTracker(device)) {
          const pt = this.getOrMakePushTracker(device);
          if (!pt.connected) {
            this.sendEvent(BluetoothService.pushtracker_connected, {
              pushtracker: pt
            });
            pt.handleConnect();
            this.updatePushTrackerState();
          }
        } else if (this.isSmartDrive(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleConnect();
        }
        break;
      case ConnectionState.disconnected:
        if (this.isPushTracker(device)) {
          const pt = this.getOrMakePushTracker(device);
          pt.handleDisconnect();
          this.updatePushTrackerState();
          this.sendEvent(BluetoothService.pushtracker_disconnected, {
            pushtracker: pt
          });
          BluetoothService.stopOtaBackgroundExecution();
        } else if (this.isSmartDrive(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleDisconnect();
        }
        break;
      default:
        break;
    }
  }

  private onPeripheralConnected(args: any): void {
    const argdata = args.data;
    const device = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    if (device.address && this.isSmartDrive(device)) {
      // const sd = this.getOrMakeSmartDrive(device);
      // sd.handleConnect();
    }
    // TODO: this event is not emitted by the android part of the bluetooth library
  }

  private onPeripheralDisconnected(args: any): void {
    const argdata = args.data;
    const device = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    if (device.address && this.isSmartDrive(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleDisconnect();
    }
    // TODO: this event is not emitted by the android part of the bluetooth library
  }

  private onCharacteristicWriteRequest(args: any): void {
    const argdata = args.data;
    const value = argdata.value;
    const device = argdata.device;
    let data = null;
    if (isIOS) {
      const tmp = new ArrayBuffer(Packet.maxSize);
      value.getBytes(tmp);
      data = new Uint8Array(tmp);
    } else {
      data = new Uint8Array(value);
    }
    const p = new Packet();
    p.initialize(data);

    const pt = this.getOrMakePushTracker(device);
    if (!pt.connected) {
      pt.handleConnect();
      this.sendEvent(BluetoothService.pushtracker_connected, {
        pushtracker: pt
      });
    }
    pt.handlePacket(p);
    this.updatePushTrackerState();
    /*
      // TODO: we cannot get UUIDs or name, so we comment this out and
      // assume that the data is from a pt
    if (this.isPushTracker(device)) {
      const pt = this.getOrMakePushTracker(device);
      pt.handlePacket(p);
      this.updatePushTrackerState();
    }
    */
    p.destroy();
  }

  private onCharacteristicReadRequest(_: any): void { }

  // service controls
  private deleteServices() {
    this._bluetooth.clearServices();
    PushTracker.DataCharacteristic = null;
  }

  private addServices(): void {
    try {
      if (this._bluetooth.offersService(BluetoothService.AppServiceUUID)) {
        return;
      }

      // make the service
      this.AppService = this._bluetooth.makeService({
        UUID: BluetoothService.AppServiceUUID,
        primary: true
      });

      const descriptorUUIDs = ['2900', '2902'];

      // make the characteristics
      const characteristics = PushTracker.Characteristics.map(cuuid => {
        //  defaults props are set READ/WRITE/NOTIFY, perms are set to READ/WRITE
        const c = this._bluetooth.makeCharacteristic({
          UUID: cuuid
        });

        if (isAndroid) {
          const descriptors = descriptorUUIDs.map(duuid => {
            //  defaults perms are set to READ/WRITE
            const d = this._bluetooth.makeDescriptor({
              UUID: duuid
            });

            const value = Array.create('byte', 2);
            value[0] = 0x00;
            value[1] = 0x00;
            d.setValue(value);
            return d;
          });

          descriptors.forEach(d => {
            c.addDescriptor(d);
          });
        } else {
          // TODO: don't need ios impl apparrently?
        }

        if (isAndroid) {
          c.setValue(
            0,
            android.bluetooth.BluetoothGattCharacteristic.FORMAT_UINT8,
            0
          );
          c.setWriteType(
            android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
          );
        } else {
          // TODO: don't need ios impl apparrently?
        }

        // store the characteristic here
        if (cuuid === PushTracker.DataCharacteristicUUID) {
          PushTracker.DataCharacteristic = c;
        }

        return c;
      });
      if (isAndroid) {
        characteristics.forEach(c => this.AppService.addCharacteristic(c));
      } else {
        this.AppService.characteristics = characteristics;
      }
    } catch (ex) {
      // nothing
    }
  }

  private _mergePushTrackerState(
    s1: PushTrackerState,
    s2: PushTrackerState
  ): PushTrackerState {
    if (s1 === PushTrackerState.ready || s2 === PushTrackerState.ready) {
      return PushTrackerState.ready;
    } else if (
      s1 === PushTrackerState.connected ||
      s2 === PushTrackerState.connected
    ) {
      return PushTrackerState.connected;
    } else if (
      s1 === PushTrackerState.disconnected ||
      s2 === PushTrackerState.disconnected
    ) {
      return PushTrackerState.disconnected;
    } else if (
      s1 === PushTrackerState.paired ||
      s2 === PushTrackerState.paired
    ) {
      return PushTrackerState.paired;
    } else {
      return PushTrackerState.unknown;
    }
  }

  private updatePushTrackerState(): void {
    const hasPaired = appSettings.getBoolean(
      STORAGE_KEYS.HAS_PAIRED_TO_PUSHTRACKER,
      false
    );

    const defaultState = hasPaired
      ? PushTrackerState.disconnected
      : PushTrackerState.unknown;

    let state: PushTrackerState = BluetoothService.PushTrackers.reduce(
      (ptState, pt) => {
        if (pt && pt.connected) {
          if (pt.version !== 0xff) {
            state = <any>(
              this._mergePushTrackerState(ptState, PushTrackerState.ready)
            );
          } else {
            state = <any>(
              this._mergePushTrackerState(ptState, PushTrackerState.connected)
            );
          }
          // setting true so we know the user has connected to a PT previously
          appSettings.setBoolean(STORAGE_KEYS.HAS_PAIRED_TO_PUSHTRACKER, true);
        } else if (pt && pt.paired) {
          state = <any>(
            this._mergePushTrackerState(ptState, PushTrackerState.disconnected)
          );

          // setting true so we know the user has connected to a PT previously
          appSettings.setBoolean(STORAGE_KEYS.HAS_PAIRED_TO_PUSHTRACKER, true);
        } else {
          state = <any>(
            this._mergePushTrackerState(ptState, PushTrackerState.unknown)
          );
        }
        return state;
      },
      defaultState
    );

    BluetoothService.pushTrackerStatus.set('state', state);
    this.sendEvent(BluetoothService.pushtracker_status_changed, { state });
  }

  private getOrMakePushTracker(device: any): PushTracker {
    let pt = BluetoothService.PushTrackers.filter(
      p => p.address === device.address
    )[0];
    if (pt === null || pt === undefined) {
      pt = new PushTracker(this, { address: device.address });
      BluetoothService.PushTrackers.push(pt);
      this.sendEvent(BluetoothService.pushtracker_added, { pt });
    }
    if (device.device) {
      pt.device = device.device;
    }
    return pt;
  }

  private getOrMakeSmartDrive(device: any): SmartDrive {
    let sd = BluetoothService.SmartDrives.filter(
      (x: SmartDrive) => x.address === device.address
    )[0];
    if (sd === null || sd === undefined) {
      sd = new SmartDrive(this, { address: device.address });
      BluetoothService.SmartDrives.push(sd);
    }
    if (device.device) {
      sd.device = device.device;
    }
    if (device.rssi) {
      sd.rssi = device.rssi;
    }
    return sd;
  }

  disconnectPushTrackers(addresses: string[]) {
    addresses.forEach(addr => {
      this._bluetooth.cancelServerConnection(addr);
    });
  }

  sendToPushTrackers(data: any, devices?: any): Promise<any> {
    let d = data;
    if (isIOS) {
      d = NSData.dataWithData(data);
    } else if (isAndroid) {
      const length = data.length || (data.size && data.size());
      const arr = Array.create('byte', length);
      for (let i = 0; i < length; i++) {
        arr[i] = data[i];
      }
      d = arr;
    }
    // BluetoothService.pushTrackerStatus.set('state', PushTrackerState.busy);
    // this.sendEvent(BluetoothService.pushtracker_status_changed, { state: PushTrackerState.busy });
    return this._bluetooth.notifyCentrals(
      d,
      PushTracker.DataCharacteristic,
      devices
    );
    // .then((args) => {
    //   BluetoothService.pushTrackerStatus.set('state', PushTrackerState.connected);
    //   this.sendEvent(BluetoothService.pushtracker_status_changed, { state: PushTrackerState.connected });
    //   return args;
    // })
    // .catch((err) => {
    //   BluetoothService.pushTrackerStatus.set('state', PushTrackerState.disconnected);
    //   this.sendEvent(BluetoothService.pushtracker_status_changed, { state: PushTrackerState.disconnected });
    //   throw err;
    // });
  }

  getPushTracker(address: string) {
    return BluetoothService.PushTrackers.filter(p => p.address === address)[0];
  }

  getSmartDrive(address: string) {
    return BluetoothService.SmartDrives.filter(sd => sd.address === address)[0];
  }

  private isSmartDrive(dev: any): boolean {
    const name = dev && dev.name;
    const uuid = dev && dev.UUID;
    const hasUUID =
      uuid && uuid.toUpperCase() === SmartDrive.ServiceUUID.toUpperCase();
    const isSD = (name && name.includes('Smart Drive DU')) || hasUUID;
    return isSD;
  }

  private isPushTracker(dev: any): boolean {
    const UUIDs = (dev && dev.UUIDs) || [];
    const name = dev && dev.name;
    const isKnownDevice: boolean = !!this.getPushTracker(dev.address);
    const hasUUID = UUIDs.reduce(
      (a, e) => a || e.toUpperCase() === PushTracker.ServiceUUID.toUpperCase(),
      false
    );
    const isPT =
      (name && name.includes('PushTracker')) ||
      (name && name.includes('Bluegiga')) ||
      hasUUID ||
      isKnownDevice;
    return isPT;
  }

  /**
   * Notify events by name and optionally pass data
   */
  sendEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }
}
