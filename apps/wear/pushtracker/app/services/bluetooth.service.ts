import { Log } from '@permobil/core';
import { Injectable } from 'injection-js';
import { Bluetooth, BondState, ConnectionState, Device } from 'nativescript-bluetooth';
import 'reflect-metadata';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { isAndroid, isIOS } from 'tns-core-modules/platform';

declare const NSData: any;

@Injectable()
export class BluetoothService {
  // static members
  public static AppServiceUUID = '9358ac8f-6343-4a31-b4e0-4b13a2b45d86';

  // public members
  public enabled: boolean = false;
  public initialized: boolean = false;
  public advertising: boolean = false;

  // private members
  private _bluetooth: Bluetooth;
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
  }

  private onDeviceAclDisconnected(args: any): void {
    // Log.D(`acl disconnect!`);
    // TODO: should be only of type Peripheral
    const argdata = args.data;
    const device = argdata.device;
    Log.D(`${device.name}::${device.address} - disconnected`);
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
        break;
      case ConnectionState.disconnected:
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
      const tmp = new ArrayBuffer(20);
      value.getBytes(tmp);
      data = new Uint8Array(tmp);
    } else {
      data = new Uint8Array(value);
    }
  }

  private onCharacteristicReadRequest(args: any): void { }

  // service controls
  private deleteServices() {
    Log.D('deleting any existing services');
    this._bluetooth.clearServices();
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
      /*
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

        return c;
      });
      Log.D('Adding characteristics to service!');
      if (isAndroid) {
        characteristics.map(c => this.AppService.addCharacteristic(c));
      } else {
        this.AppService.characteristics = characteristics;
      }
      */
    } catch (ex) {
      Log.E(ex);
    }
  }
}
