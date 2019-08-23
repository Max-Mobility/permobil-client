import { Log, Packet } from '@permobil/core';
import { Injectable } from 'injection-js';
import { Bluetooth, BondState, ConnectionState, Device } from 'nativescript-bluetooth';
import 'reflect-metadata';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { PushTracker } from '../models/pushtracker';
import { SmartDrive } from '../models/smartdrive';

declare const NSData: any;

@Injectable()
export class BluetoothService {
  // static members
  public static AppServiceUUID = '9358ac8f-6343-4a31-b4e0-4b13a2b45d86';
  public static PushTrackers = new ObservableArray<PushTracker>();
  public static SmartDrives = new ObservableArray<SmartDrive>();

  // public members
  public enabled: boolean = false;
  public initialized: boolean = false;
  public advertising: boolean = false;

  // private members
  private _bluetooth: Bluetooth;
  private PushTrackerDataCharacteristic: any = null;
  private AppService: any = null;

  constructor() {
    Log.D('BluetoothService constructor...');

    this.enabled = false;
    this.initialized = false;
    this.advertising = false;
    this._bluetooth = new Bluetooth();
    // enabling `debug` will output console.logs from the bluetooth source code
    this._bluetooth.debug = false;
  }

  public setEventListeners() {
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

    /*
    this._bluetooth.on(Bluetooth.centralmanager_updated_state_event, args => {
      Log.D('centralmanager_updated_state_event');
    });
      */

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
      Bluetooth.bluetooth_advertise_failure_event,
      this.onAdvertiseFailure,
      this
    );
    this._bluetooth.on(
      Bluetooth.bluetooth_advertise_success_event,
      this.onAdvertiseSuccess,
      this
    );
  }

  public clearEventListeners() {
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
    this._bluetooth.off(Bluetooth.bluetooth_advertise_failure_event);
    this._bluetooth.off(Bluetooth.bluetooth_advertise_success_event);
  }

  public clearSmartDrives() {
    const connectedSDs = BluetoothService.SmartDrives.slice().filter(
      sd => sd.connected
    );
    BluetoothService.SmartDrives.splice(
      0,
      BluetoothService.SmartDrives.length,
      ...connectedSDs
    );
  }

  public clearPushTrackers() {
    BluetoothService.PushTrackers.splice(
      0,
      BluetoothService.PushTrackers.length
    );
  }

  public radioEnabled(): Promise<boolean> {
    return this._bluetooth.isBluetoothEnabled();
  }

  public available(): Promise<boolean> {
    return this.isActive();

    // return this._bluetooth.isBluetoothEnabled().then(enabled => {
    //   return enabled && this.isActive();
    // });
  }

  public isActive(): Promise<boolean> {
    return Promise.resolve(this.enabled && this.initialized); // && this._bluetooth.offersService(BluetoothService.AppServiceUUID);
  }

  public async initialize(): Promise<any> {
    this.enabled = false;
    this.initialized = false;

    this.clearEventListeners();
    this.setEventListeners();

    return this._bluetooth
      .requestCoarseLocationPermission()
      .then(() => {
        this.enabled = true;
        this.initialized = true;
      });
  }

  public async advertise(): Promise<any> {
    if (!this.enabled || !this.initialized) {
      return Promise.reject(
        'You must initialize the bluetooth service before advertising!'
      );
    }

    this.advertising = false;

    this._bluetooth.startGattServer();
    this.addServices();

    await this._bluetooth.startAdvertising({
      UUID: BluetoothService.AppServiceUUID,
      settings: {
        connectable: true
      },
      data: {
        includeDeviceName: true
      }
    });

    this._bluetooth.addService(this.AppService);

    this.advertising = true;

    return Promise.resolve();
  }

  public scanForSmartDrives(timeout: number = 4) {
    return new Promise((resolve, reject) => {
      this.clearSmartDrives();
      this._bluetooth
        .startScanning({
          serviceUUIDs: [SmartDrive.ServiceUUID],
          seconds: timeout
        })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public stopScanning(): Promise<any> {
    return this._bluetooth.stopScanning();
  }

  public connect(address: string, onConnected?: any, onDisconnected?: any) {
    return this._bluetooth.connect({
      UUID: address,
      onConnected: onConnected,
      onDisconnected: onDisconnected
    });
  }

  public disconnectAll(): Promise<any> {
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

  public disconnect(args: any): Promise<any> {
    return this._bluetooth.disconnect(args);
  }

  public discoverServices(opts: any) { }

  public discoverCharacteristics(opts: any) { }

  public startNotifying(opts: any) {
    return this._bluetooth.startNotifying(opts);
  }

  public stopNotifying(opts: any) {
    return this._bluetooth.stopNotifying(opts);
  }

  public requestConnectionPriority(address: string, priority: number) {
    return this._bluetooth.requestConnectionPriority(address, priority);
  }

  public readRssi(address: string) {
    return this._bluetooth.readRSSI(address);
  }

  public write(opts: any) {
    return this._bluetooth.write(opts);
  }

  public async stop(): Promise<any> {
    this.enabled = false;
    this.initialized = false;
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

  public restart(): Promise<any> {
    return this.stop()
      .then(() => {
        return this.advertise();
      })
      .catch(err => {
        this.enabled = false;
        this.initialized = false;
        Log.E('enable err', err);
      });
  }

  // private functions
  // event listeners
  private onAdvertiseFailure(args: any): void {
    Log.D(`Advertise failure: ${args.data.error}`);
  }

  private onAdvertiseSuccess(args: any): void {
    Log.D(`Advertise succeeded`);
  }

  private onBondStatusChange(args: any): void {
    const argdata = args.data;
    const dev = argdata.device as Device;
    const bondState = argdata.bondState;
    Log.D(`${dev.address} - bond state - ${bondState}`);
    switch (bondState) {
      case BondState.bonding:
        break;
      case BondState.bonded:
        if (isAndroid) {
          this._bluetooth.removeBond(dev.device);
        }
        const pt = this.getOrMakePushTracker(dev);
        pt.handlePaired();
        // this.feedback.success({
        //   title: 'Successfully Paired',
        //   message: `PushTracker ${pt.address} now paired`
        // });
        break;
      case BondState.none:
        break;
      default:
        break;
    }
  }

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
      const sd = this.getOrMakeSmartDrive(peripheral);
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
    /*
          const dev = args.data.device;
          Log.D('uuid:', args.data.uuids);
          if (!args.data.uuids) {
          Log.D('no uuid returned');
          return;
          }
          const newUUID = args.data.uuids[0].toString();
          Log.D(`${dev} - uuid change - ${newUUID || 'None'}`);
          if (this.isSmartDrive(dev)) {
          const address = dev.UUID;
          const sd = this.getOrMakeSmartDrive(address);
          } else if (this.isPushTracker(dev)) {
          const address = dev.getAddress();
          const pt = this.getOrMakePushTracker(address);
          }
        */
    // Log.D('finished uuid change');
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
    } else if (this.isPushTracker(device)) {
      const pt = this.getOrMakePushTracker(device);
      pt.handleDisconnect();
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
        // NOTE : need to figure out the iOS piece for this
        // since this is android method for the device - could
        // be something we move into the bluetooth layer

        // TODO: move this into the bluetooth layer!
        // device.fetchUuidsWithSdp();

        // TODO: use BluetoothGatt to get the service (by UUID 1800)

        // TODO: use the returned service to get the characteristic
        //       (by UUID 2a00)

        // TODO: use the returned characteristic to call
        //       'getStringValue()' to read the characteristic to get
        //       the name
        if (this.isPushTracker(device)) {
          const pt = this.getOrMakePushTracker(device);
          pt.handleConnect();
          this.notify(
            `${device.name || 'PushTracker'}::${device.address} connected`
          );
        } else if (this.isSmartDrive(device)) {
          const sd = this.getOrMakeSmartDrive(device);
          sd.handleConnect();
        }
        break;
      case ConnectionState.disconnected:
        if (this.isPushTracker(device)) {
          const pt = this.getOrMakePushTracker(device);
          pt.handleDisconnect();
          this.notify(
            `${device.name || 'PushTracker'}::${device.address} disconnected`
          );
        } else if (this.isSmartDrive(device)) {
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

  private onCharacteristicWriteRequest(args: any): void {
    // Log.D(`Got characteristic write request!`);
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

    if (this.isPushTracker(device)) {
      const pt = this.getOrMakePushTracker(device);
      pt.handlePacket(p);
    }
    Log.D(`${p.Type()}::${p.SubType()} ${p.toString()}`);
    p.destroy();
  }

  private onCharacteristicReadRequest(args: any): void { }

  // service controls
  private deleteServices() {
    Log.D('deleting any existing services');
    this._bluetooth.clearServices();
    PushTracker.DataCharacteristic = null;
  }

  private addServices(): void {
    try {
      if (this._bluetooth.offersService(BluetoothService.AppServiceUUID)) {
        Log.D(`Bluetooth already offers ${BluetoothService.AppServiceUUID}`);
        return;
      }
      Log.D('making service');

      // make the service
      this.AppService = this._bluetooth.makeService({
        UUID: BluetoothService.AppServiceUUID,
        primary: true
      });

      const descriptorUUIDs = ['2900', '2902'];

      // make the characteristics
      const characteristics = PushTracker.Characteristics.map(cuuid => {
        // Log.D('Making characteristic: ' + cuuid);
        //  defaults props are set READ/WRITE/NOTIFY, perms are set to READ/WRITE
        const c = this._bluetooth.makeCharacteristic({
          UUID: cuuid
        });

        if (isAndroid) {
          // Log.D('making descriptors');
          const descriptors = descriptorUUIDs.map(duuid => {
            //  defaults perms are set to READ/WRITE
            const d = this._bluetooth.makeDescriptor({
              UUID: duuid
            });

            d.setValue(new Array<any>([0x00, 0x00]));
            // Log.D('Making descriptor: ' + duuid);
            return d;
          });

          descriptors.map(d => {
            c.addDescriptor(d);
          });
        } else {
          // TODO: don't need ios impl apparrently?
        }

        if (isAndroid) {
          c.setValue(
            0,
            (android.bluetooth as any).BluetoothGattCharacteristic.FORMAT_UINT8,
            0
          );
          c.setWriteType(
            (android.bluetooth as any).BluetoothGattCharacteristic
              .WRITE_TYPE_DEFAULT
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
      Log.D('Adding characteristics to service!');
      if (isAndroid) {
        characteristics.map(c => this.AppService.addCharacteristic(c));
      } else {
        this.AppService.characteristics = characteristics;
      }
    } catch (ex) {
      Log.E(ex);
    }
  }

  public getOrMakePushTracker(device: any): PushTracker {
    let pt = BluetoothService.PushTrackers.filter(
      p => p.address === device.address
    )[0];
    // Log.D(`Found PT: ${pt}`);
    if (pt === null || pt === undefined) {
      pt = new PushTracker(this, { address: device.address });
      BluetoothService.PushTrackers.push(pt);
    }
    if (device.device) {
      pt.device = device.device;
    }
    // Log.D(`Found or made PT: ${pt}`);
    return pt;
  }

  public getOrMakeSmartDrive(device: any): SmartDrive {
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

  public disconnectPushTrackers(addresses: string[]) {
    addresses.map(addr => {
      this._bluetooth.cancelServerConnection(addr);
    });
  }

  public sendToPushTrackers(data: any, devices?: any): Promise<any> {
    let d = data;
    if (isIOS) {
      d = NSData.dataWithData(data);
      // Log.D(`Sending to Pushtracker: ${d}`);
    } else if (isAndroid) {
      const length = data.length || (data.size && data.size());
      const arr = Array.create('byte', length);
      for (let i = 0; i < length; i++) {
        arr[i] = data[i];
      }
      d = arr;
    }
    return this._bluetooth.notifyCentrals(
      d,
      PushTracker.DataCharacteristic,
      devices
    );
  }

  public getPushTracker(address: string) {
    return BluetoothService.PushTrackers.filter(p => p.address === address)[0];
  }

  public getSmartDrive(address: string) {
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

  private isPushTracker(dev: any): boolean {
    const UUIDs = (dev && dev.UUIDs) || [];
    const name = dev && dev.name;
    // Log.D(`isPushTracker - uuids: ${UUIDs}, name: ${name}`);
    const hasUUID = UUIDs.reduce(
      (a, e) => a || e.toUpperCase() === PushTracker.ServiceUUID.toUpperCase(),
      false
    );
    const isPT =
      (name && name.includes('PushTracker')) ||
      (name && name.includes('Bluegiga')) ||
      hasUUID;
    // Log.D(`isPT: ${isPT}`);
    return isPT;
  }

  private notify(text: string): void {
    Log.D('notify text', text);
    // this.snackbar.simple(text);
  }
}
