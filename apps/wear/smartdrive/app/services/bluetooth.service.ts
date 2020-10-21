import { ObservableArray } from '@nativescript/core';
import { Log } from '@permobil/core';
import { Injectable } from 'injection-js';
import { Bluetooth, ConnectionState } from 'nativescript-bluetooth';
import 'reflect-metadata';
import { SmartDrive } from '../models/smartdrive';

@Injectable()
export class BluetoothService {
  // static members
  static SmartDrives = new ObservableArray<SmartDrive>();

  // members
  enabled: boolean = false;
  initialized: boolean = false;

  // private members
  private _bluetooth: Bluetooth;

  constructor() {
    Log.D('BluetoothService constructor...');

    this.enabled = false;
    this.initialized = false;
    this._bluetooth = new Bluetooth();
    // enabling `debug` will output console.logs from the bluetooth source code
    this._bluetooth.debug = false;
  }

  setEventListeners() {
    this.clearEventListeners();
    // setup event listeners
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
  }

  clearEventListeners() {
    // setup event listeners
    this._bluetooth.off(Bluetooth.peripheral_connected_event);
    this._bluetooth.off(Bluetooth.peripheral_disconnected_event);
    this._bluetooth.off(Bluetooth.device_discovered_event);
    this._bluetooth.off(Bluetooth.device_name_change_event);
    this._bluetooth.off(Bluetooth.device_uuid_change_event);
    this._bluetooth.off(Bluetooth.device_acl_disconnected_event);
    this._bluetooth.off(Bluetooth.server_connection_state_changed_event);
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

  async enableRadio() {
    const didEnable = await this._bluetooth.enable();
    return didEnable;
  }

  async radioEnabled() {
    const _enabled = await this._bluetooth.isBluetoothEnabled();
    return _enabled;
  }

  async available() {
    return this.isActive();
  }

  isActive(): Promise<boolean> {
    return Promise.resolve(this.enabled && this.initialized);
  }

  async initialize() {
    if (!this.enabled || !this.initialized) {
      this.clearEventListeners();
      this.setEventListeners();
      this.enabled = true;
      this.initialized = true;
    }
  }

  async scanForSmartDrives(timeout: number = 4) {
    this.clearSmartDrives();
    const result = await this._bluetooth.startScanning({
      serviceUUIDs: [SmartDrive.ServiceUUID],
      seconds: timeout
    });
    return result;
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
          Log.D(`Disconnecting from all devices: ${gattDevices}, ${gattServerDevices}`);
          if (gattDevices && gattDevices.length) {
          tasks = gattDevices.map(device => {
          Log.D(`disconnecting from ${device}`);
          return this._bluetooth.disconnect({ UUID: `${device}` });
          });
          }
          if (gattServerDevices && gattServerDevices.length) {
          tasks = gattServerDevices.map(device => {
          Log.D(`disconnecting from ${device}`);
          return this._bluetooth.cancelServerConnection(device);
          });
          }
          return Promise.all(tasks);
        */
  }

  disconnect(args: any): Promise<any> {
    return this._bluetooth.disconnect(args);
  }

  discoverServices(opts: any) {}

  discoverCharacteristics(opts: any) {}

  startNotifying(opts: any) {
    return this._bluetooth.startNotifying(opts);
  }

  stopNotifying(opts: any) {
    return this._bluetooth.stopNotifying(opts);
  }

  requestConnectionPriority(address: string, priority: number) {
    return this._bluetooth.requestConnectionPriority(address, priority);
  }

  readRssi(address: string) {
    return this._bluetooth.readRSSI(address);
  }

  write(opts: any) {
    return this._bluetooth.write(opts);
  }

  async stop() {
    this.enabled = false;
    this.initialized = false;
    // stop listening for events
    this.clearEventListeners();
  }

  async restart() {
    await this.stop();
    await this.initialize();
  }

  // private functions
  // event listeners
  private onDeviceDiscovered(args: any): void {
    // Log.D('device discovered!');
    const argdata = args.data;
    const peripheral = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    Log.D(`${peripheral.name}::${peripheral.address} - discovered`);
    if (this.isSmartDrive(peripheral)) {
      this.getOrMakeSmartDrive(peripheral);
    }
  }

  private onDeviceNameChange(args: any): void {
    // Log.D(`name change!`);
    const argdata = args.data;
    const dev = argdata.device;
    const name = argdata.name;
    Log.D(`${dev.address} - name change - ${name || 'None'}`);
  }

  private onDeviceUuidChange(args: any): void {
    Log.D(`uuid change!`);
    // TODO: This function doesn't work (android BT impl returns null)
  }

  private onDeviceAclDisconnected(args: any): void {
    // Log.D(`acl disconnect!`);
    // TODO: should be only of type Peripheral
    const argdata = args.data;
    const device = argdata.device;
    Log.D(`${device.name}::${device.address} - disconnected`);
    if (this.isSmartDrive(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleDisconnect();
    }
    // Log.D('finished acl disconnect');
  }

  private onServerConnectionStateChanged(args: any): void {
    // Log.D(`server connection state change`);
    const argdata = args.data;
    const connection_state = argdata.connection_state;
    const device = argdata.device;
    Log.D(
      `state change - ${device.name}::${device.address} - ${connection_state}`
    );
    switch (connection_state) {
      case ConnectionState.connected:
        if (this.isSmartDrive(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleConnect();
        }
        break;
      case ConnectionState.disconnected:
        if (this.isSmartDrive(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleDisconnect();
        }
        break;
      default:
        break;
    }
    // Log.D(`finished server connection state change!`);
  }

  private onPeripheralConnected(args: any): void {
    // Log.D('peripheral connected!');
    const argdata = args.data;
    const device = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    Log.D(`peripheral connected - ${device.name}::${device.address}`);
    if (device.address && this.isSmartDrive(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      // sd.handleConnect();
    }
    // TODO: this event is not emitted by the android part of the bluetooth library
    // Log.D('finished peripheral connected!');
  }

  private onPeripheralDisconnected(args: any): void {
    // Log.D('peripheral disconnected!');
    const argdata = args.data;
    const device = {
      rssi: argdata.RSSI,
      device: argdata.device,
      address: argdata.UUID,
      name: argdata.name
    };
    Log.D(`peripheral disconnected - ${device.name}::${device.address}`);
    if (device.address && this.isSmartDrive(device)) {
      const sd = this.getOrMakeSmartDrive(device);
      sd.handleDisconnect();
    }
    // TODO: this event is not emitted by the android part of the bluetooth library
    // Log.D('finished peripheral disconnected!');
  }

  getOrMakeSmartDrive(device: any): SmartDrive {
    let sd = BluetoothService.SmartDrives.filter(
      (x: SmartDrive) => x.address === device.address
    )[0];
    // Log.D(`Found SD: ${sd}`);
    if (sd === null || sd === undefined) {
      sd = new SmartDrive(this, { address: device.address });
      Log.D(
        'pushing new SmartDrive to the service array of smartdrives',
        sd.address
      );
      BluetoothService.SmartDrives.push(sd);
    }
    // Log.D(`Found or made SD: ${sd}`);
    if (device.device) {
      sd.device = device.device;
    }
    if (device.rssi) {
      sd.rssi = device.rssi;
    }
    return sd;
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
    // Log.D(`isSD: ${isSD}`);
    return isSD;
  }
}
