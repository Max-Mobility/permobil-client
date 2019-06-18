/// <reference path="../node_modules/tns-platform-declarations/android-23.d.ts" />

import * as application from 'tns-core-modules/application';
import * as utils from 'tns-core-modules/utils/utils';
import {
  BluetoothCommon,
  Central,
  CLog,
  CLogTypes,
  ConnectOptions,
  DisconnectOptions,
  MakeCharacteristicOptions,
  MakeServiceOptions,
  Peripheral,
  ReadOptions,
  StartAdvertisingOptions,
  StartNotifyingOptions,
  StartScanningOptions,
  StopNotifyingOptions,
  WriteOptions
} from '../common';
import { TNS_AdvertiseCallback } from './TNS_AdvertiseCallback';
import { TNS_BluetoothGattCallback } from './TNS_BluetoothGattCallback';
import { TNS_BluetoothGattServerCallback } from './TNS_BluetoothGattServerCallback';
import { TNS_BroadcastReceiver } from './TNS_BroadcastReceiver';
import { TNS_LeScanCallback } from './TNS_LeScanCallback';
import { TNS_ScanCallback } from './TNS_ScanCallback';

const ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;
const ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
const ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE = 224;

export function deviceToCentral(
  dev: android.bluetooth.BluetoothDevice
): Central {
  const uuids = [];
  const us = dev.getUuids();
  if (us) {
    for (let i = 0; i < us.length; i++) {
      uuids.push(us[i].toString());
    }
  }
  return {
    device: dev,
    UUIDs: uuids,
    address: dev.getAddress(),
    name: dev.getName(),
    RSSI: null,
    manufacturerId: null,
    manufacturerData: null
  };
}

export function deviceToPeripheral(
  dev: android.bluetooth.BluetoothDevice
): Peripheral {
  const uuid = dev.getUuids()[0].toString();
  return {
    device: dev,
    UUID: uuid,
    name: dev.getName(),
    RSSI: null,
    services: null, // TODO: fix
    manufacturerId: null,
    manufacturerData: null
  };
}

export { BondState, Central, ConnectionState, Peripheral } from '../common';

export class Bluetooth extends BluetoothCommon {
  // @link - https://developer.android.com/reference/android/content/Context.html#BLUETOOTH_SERVICE
  bluetoothManager: android.bluetooth.BluetoothManager = utils.ad
    .getApplicationContext()
    .getSystemService(android.content.Context.BLUETOOTH_SERVICE);
  adapter: android.bluetooth.BluetoothAdapter = this.bluetoothManager.getAdapter();
  gattServer: android.bluetooth.BluetoothGattServer;
  bluetoothGattServerCallback = new TNS_BluetoothGattServerCallback();
  bluetoothGattCallback = new TNS_BluetoothGattCallback();
  advertiseCallback = new TNS_AdvertiseCallback();

  // not initializing here, if the Android API is < 21  use LeScanCallback
  scanCallback: TNS_ScanCallback;
  LeScanCallback: TNS_LeScanCallback;
  broadcastReceiver: TNS_BroadcastReceiver;

  /**
   * Connections are stored as key-val pairs of UUID-Connection.
   * So something like this:
   * [{
   *   34343-2434-5454: {
   *     state: 'connected',
   *     discoveredState: '',
   *     operationConnect: someCallbackFunction
   *   },
   *   1323213-21321323: {
   *     ..
   *   }
   * }, ..]
   */
  connections = {};

  // Getter/Setters
  get enabled() {
    if (this.adapter !== null && this.adapter.isEnabled()) {
      return true;
    } else {
      return false;
    }
  }

  constructor() {
    super();
    CLog(CLogTypes.info, '*** Android Bluetooth Constructor ***');
    CLog(CLogTypes.info, 'this.bluetoothManager', this.bluetoothManager);
    CLog(CLogTypes.info, 'this.adapter', this.adapter);

    // android.os.Build.VERSION_CODES.LOLLIPOP
    if (android.os.Build.VERSION.SDK_INT >= 21) {
      this.scanCallback = new TNS_ScanCallback();
      this.scanCallback.onInit(new WeakRef(this));

      // peripheral advertising stuff
      this.bluetoothGattServerCallback.onInit(new WeakRef(this));
      this.advertiseCallback.onInit(new WeakRef(this));
      this.broadcastReceiver = new TNS_BroadcastReceiver();
      this.broadcastReceiver.onInit(new WeakRef(this));

      const deviceChangeIntent = new android.content.IntentFilter();
      deviceChangeIntent.addAction(
        android.bluetooth.BluetoothDevice.ACTION_BOND_STATE_CHANGED
      );
      deviceChangeIntent.addAction(
        android.bluetooth.BluetoothDevice.ACTION_NAME_CHANGED
      );
      deviceChangeIntent.addAction(
        android.bluetooth.BluetoothDevice.ACTION_UUID
      );
      deviceChangeIntent.addAction(
        android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED
      );
      // register the broadcast receiver
      utils.ad
        .getApplicationContext()
        .registerReceiver(this.broadcastReceiver, deviceChangeIntent);
    } else {
      this.LeScanCallback = new TNS_LeScanCallback();
      this.LeScanCallback.onInit(new WeakRef(this));
    }

    this.bluetoothGattCallback.onInit(new WeakRef(this));
  }

  coarseLocationPermissionGranted() {
    let hasPermission =
      android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M;
    if (!hasPermission) {
      const ctx = this._getContext();
      CLog(CLogTypes.info, `app context ${ctx}`);

      hasPermission =
        android.content.pm.PackageManager.PERMISSION_GRANTED ===
        (android.support.v4.content.ContextCompat as any).checkSelfPermission(
          ctx,
          android.Manifest.permission.ACCESS_COARSE_LOCATION
        );
    }
    CLog(
      CLogTypes.info,
      'Bluetooth.coarseLocationPermissionGranted ---- ACCESS_COARSE_LOCATION permission granted?',
      hasPermission
    );
    return hasPermission;
  }

  requestCoarseLocationPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // grab the permission dialog result
      application.android.on(
        application.AndroidApplication.activityRequestPermissionsEvent,
        (args: application.AndroidActivityRequestPermissionsEventData) => {
          for (let i = 0; i < args.permissions.length; i++) {
            if (
              args.grantResults[i] ===
              android.content.pm.PackageManager.PERMISSION_DENIED
            ) {
              reject('Permission denied');
              return;
            }
          }
          resolve();
        }
      );

      const activity = this._getActivity();

      // invoke the permission dialog
      (android.support.v4.app.ActivityCompat as any).requestPermissions(
        activity,
        [android.Manifest.permission.ACCESS_COARSE_LOCATION],
        ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE
      );
    });
  }

  /**
   * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.html#enable()
   * Turn on the local Bluetooth adapter—do not use without explicit user action to turn on Bluetooth.
   * This powers on the underlying Bluetooth hardware, and starts all Bluetooth system services.
   */
  enable(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // activityResult event
        const onBluetoothEnableResult = (
          args: application.AndroidActivityResultEventData
        ) => {
          CLog(
            CLogTypes.info,
            'Bluetooth.onBluetoothEnableResult ---',
            `requestCode: ${args.requestCode}, result: ${args.resultCode}`
          );

          if (
            args.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE
          ) {
            try {
              // remove the event listener
              application.android.off(
                application.AndroidApplication.activityResultEvent,
                onBluetoothEnableResult
              );

              // RESULT_OK = -1
              if (args.resultCode === android.app.Activity.RESULT_OK) {
                this.sendEvent(Bluetooth.bluetooth_enabled_event);
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (ex) {
              CLog(CLogTypes.error, ex);
              application.android.off(
                application.AndroidApplication.activityResultEvent,
                onBluetoothEnableResult
              );
              this.sendEvent(
                Bluetooth.error_event,
                { error: ex },
                `Bluetooth.enable ---- error: ${ex}`
              );
              reject(ex);
              return;
            }
          } else {
            application.android.off(
              application.AndroidApplication.activityResultEvent,
              onBluetoothEnableResult
            );
            resolve(false);
            return;
          }
        };

        // set the onBluetoothEnableResult for the intent
        application.android.on(
          application.AndroidApplication.activityResultEvent,
          onBluetoothEnableResult
        );

        // create the intent to start the bluetooth enable request
        const intent = new android.content.Intent(
          android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE
        );
        const activity =
          application.android.foregroundActivity ||
          application.android.startActivity;
        activity.startActivityForResult(
          intent,
          ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE
        );
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.enable: ${ex}`);
        reject(ex);
        this.sendEvent(
          Bluetooth.error_event,
          { error: ex },
          'Error enabling bluetooth.'
        );
      }
    });
  }

  /**
   * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.html#disable()
   * Turn off the local Bluetooth adapter—do not use without explicit user action to turn off Bluetooth.
   * This gracefully shuts down all Bluetooth connections, stops Bluetooth system services, and powers down the underlying Bluetooth hardware.
   */
  disable() {
    return new Promise((resolve, reject) => {
      this.adapter.disable();
      resolve();
    });
  }

  isBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        resolve(this._isEnabled());
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.isBluetoothEnabled: ${ex}`);
        reject(ex);
      }
    });
  }

  startScanning(arg: StartScanningOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled');
          return;
        }

        const onPermissionGranted = () => {
          this.connections = {};

          const serviceUUIDs = arg.serviceUUIDs || [];
          const uuids = [];
          for (const s in serviceUUIDs) {
            if (s) {
              uuids.push(this.stringToUuid(serviceUUIDs[s]));
            }
          }

          // if less than Android21 (Lollipop)
          if (
            android.os.Build.VERSION.SDK_INT <
            android.os.Build.VERSION_CODES.LOLLIPOP
          ) {
            const didStart =
              uuids.length === 0
                ? this.adapter.startLeScan(this.LeScanCallback)
                : this.adapter.startLeScan(uuids, this.LeScanCallback);
            CLog(
              CLogTypes.info,
              `Bluetooth.startScanning ---- didStart scanning: ${didStart}`
            );

            if (!didStart) {
              // TODO error msg, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L758
              reject("Scanning didn't start");
              return;
            }
          } else {
            let scanFilters = null as java.util.ArrayList<any>;
            if (uuids.length > 0) {
              scanFilters = new java.util.ArrayList();
              for (const u in uuids) {
                if (u) {
                  const theUuid = uuids[u];
                  const scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
                  scanFilterBuilder.setServiceUuid(
                    new android.os.ParcelUuid(theUuid)
                  );
                  scanFilters.add(scanFilterBuilder.build());
                }
              }
            }

            // ga hier verder: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L775
            const scanSettings = new android.bluetooth.le.ScanSettings.Builder();
            scanSettings.setReportDelay(0);

            const scanMode =
              (arg.android && arg.android.scanMode) ||
              android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY;
            scanSettings.setScanMode(scanMode);

            // if >= Android23 (Marshmallow)
            if (
              android.os.Build.VERSION.SDK_INT >=
              android.os.Build.VERSION_CODES.M
            ) {
              const matchMode =
                (arg.android && arg.android.matchMode) ||
                android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
              scanSettings.setMatchMode(matchMode);

              const matchNum =
                (arg.android && arg.android.matchNum) ||
                android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
              scanSettings.setNumOfMatches(matchNum);

              const callbackType =
                (arg.android && arg.android.callbackType) ||
                android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
              scanSettings.setCallbackType(callbackType);
            }

            this.adapter
              .getBluetoothLeScanner()
              .startScan(scanFilters, scanSettings.build(), this.scanCallback);
          }

          // TODO: enable this for back compat if people don't like using the event listener approach
          // onDiscovered = arg.onDiscovered;

          if (arg.seconds) {
            setTimeout(() => {
              // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
              // if < Android21 (Lollipop)
              if (
                android.os.Build.VERSION.SDK_INT <
                android.os.Build.VERSION_CODES.LOLLIPOP
              ) {
                this.adapter.stopLeScan(this.LeScanCallback);
              } else {
                this.adapter
                  .getBluetoothLeScanner()
                  .stopScan(this.scanCallback);
              }
              resolve();
            }, arg.seconds * 1000);
          } else {
            resolve();
          }
        };

        if (
          arg.skipPermissionCheck !== true &&
          !this.coarseLocationPermissionGranted()
        ) {
          CLog(
            CLogTypes.info,
            'Bluetooth.startScanning ---- Coarse Location Permission not granted on Android device, will request permission.'
          );
          // request the permission and on resolve we'll recall this method with the same args provided
          this.requestCoarseLocationPermission().then(() => {
            this.startScanning(arg);
          });
        } else {
          onPermissionGranted();
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.startScanning ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  stopScanning() {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled');
          return;
        }

        // if less than Android21(Lollipop)
        if (
          android.os.Build.VERSION.SDK_INT <
          android.os.Build.VERSION_CODES.LOLLIPOP
        ) {
          this.adapter.stopLeScan(this.LeScanCallback);
        } else {
          this.adapter.getBluetoothLeScanner().stopScan(this.scanCallback);
        }
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.stopScanning: ${ex}`);
        reject(ex);
      }
    });
  }

  // note that this doesn't make much sense without scanning first
  connect(arg: ConnectOptions) {
    return new Promise((resolve, reject) => {
      try {
        // or macaddress..
        if (!arg.UUID) {
          reject('No UUID was passed');
          return;
        }
        const bluetoothDevice = this.adapter.getRemoteDevice(arg.UUID);
        if (bluetoothDevice === null) {
          reject('Could not find peripheral with UUID ' + arg.UUID);
        } else {
          CLog(
            CLogTypes.info,
            `Bluetooth.connect ---- Connecting to peripheral with UUID: ${
              arg.UUID
            }`
          );

          let gatt;

          // if less than Android23(Marshmallow)
          if (
            android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M
          ) {
            gatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              this.bluetoothGattCallback
            );
          } else {
            gatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              this.bluetoothGattCallback,
              android.bluetooth.BluetoothDevice.TRANSPORT_LE // 2
            );
          }

          this.connections[arg.UUID] = {
            state: 'connecting',
            onConnected: arg.onConnected,
            onDisconnected: arg.onDisconnected,
            device: gatt // TODO rename device to gatt?
          };
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.connect ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  disconnect(arg: DisconnectOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.UUID) {
          reject('No UUID was passed');
          return;
        }
        const connection = this.connections[arg.UUID];
        CLog(
          CLogTypes.info,
          `Bluetooth.disconnect ---- connection: ${connection}`
        );
        if (!connection) {
          reject("Peripheral wasn't connected");
          return;
        }

        this.gattDisconnect(connection.device);
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.disconnect ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  read(arg: ReadOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const gatt = wrapper.gatt;
        CLog(CLogTypes.info, `Bluetooth.read ---- gatt: ${gatt}`);
        const bluetoothGattService = wrapper.bluetoothGattService;
        CLog(
          CLogTypes.info,
          `Bluetooth.read ---- bluetoothGattService: ${bluetoothGattService}`
        );
        const characteristicUUID = this.stringToUuid(arg.characteristicUUID);
        CLog(
          CLogTypes.info,
          `Bluetooth.read ---- characteristicUUID: ${characteristicUUID}`
        );

        const bluetoothGattCharacteristic = this._findCharacteristicOfType(
          bluetoothGattService,
          characteristicUUID,
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.read ---- bluetoothGattCharacteristic: ${bluetoothGattCharacteristic}`
        );

        if (!bluetoothGattCharacteristic) {
          reject(
            `Could not find characteristic with UUID ${
              arg.characteristicUUID
            } on service with UUID ${arg.serviceUUID} on peripheral with UUID ${
              arg.peripheralUUID
            }`
          );
          return;
        }

        const stateObject = this.connections[arg.peripheralUUID];
        stateObject.onReadPromise = resolve;
        if (!gatt.readCharacteristic(bluetoothGattCharacteristic)) {
          reject(
            'Failed to set client characteristic read for ' + characteristicUUID
          );
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.read ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  write(arg: WriteOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.value) {
          reject(
            "You need to provide some data to write in the 'value' property"
          );
          return;
        }
        const wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        const characteristic = this._findCharacteristicOfType(
          wrapper.bluetoothGattService,
          this.stringToUuid(arg.characteristicUUID),
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.write ---- characteristic: ${characteristic}`
        );

        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${
              arg.characteristicUUID
            } on service with UUID ${arg.serviceUUID} on peripheral with UUID ${
              arg.peripheralUUID
            }`
          );
          return;
        }

        const val = this.encodeValue(arg.value);
        if (val === null) {
          reject('Invalid value: ' + arg.value);
          return;
        }

        characteristic.setValue(val);
        characteristic.setWriteType(
          android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        );

        this.connections[arg.peripheralUUID].onWritePromise = resolve;
        if (!wrapper.gatt.writeCharacteristic(characteristic)) {
          reject(`Failed to write to characteristic ${arg.characteristicUUID}`);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.write ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  writeWithoutResponse(arg: WriteOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.value) {
          reject(
            "You need to provide some data to write in the 'value' property"
          );
          return;
        }
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const characteristic = this._findCharacteristicOfType(
          wrapper.bluetoothGattService,
          this.stringToUuid(arg.characteristicUUID),
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.writeWithoutResponse ---- characteristic: ${characteristic}`
        );
        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${
              arg.characteristicUUID
            } on service with UUID ${arg.serviceUUID} on peripheral with UUID ${
              arg.peripheralUUID
            }`
          );
          return;
        }

        const val = this.encodeValue(arg.value);
        CLog(
          CLogTypes.info,
          `Bluetooth.writeWithoutResponse ---- encodedValue: ${val}`
        );
        if (!val) {
          reject(`Invalid value: ${arg.value}`);
          return;
        }

        characteristic.setValue(val);
        characteristic.setWriteType(
          android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        );

        if (wrapper.gatt.writeCharacteristic(characteristic)) {
          resolve();
        } else {
          reject(`Failed to write to characteristic ${arg.characteristicUUID}`);
        }
      } catch (ex) {
        CLog(
          CLogTypes.error,
          `Bluetooth.writeWithoutResponse ---- error: ${ex}`
        );
        reject(ex);
      }
    });
  }

  startNotifying(arg: StartNotifyingOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const gatt = wrapper.gatt;
        const bluetoothGattService = wrapper.bluetoothGattService;
        const characteristicUUID = this.stringToUuid(arg.characteristicUUID);

        const characteristic = this._findNotifyCharacteristic(
          bluetoothGattService,
          characteristicUUID
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.startNotifying ---- characteristic: ${characteristic}`
        );
        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${
              arg.characteristicUUID
            } on service with UUID ${arg.serviceUUID} on peripheral with UUID ${
              arg.peripheralUUID
            }`
          );
          return;
        }

        if (!gatt.setCharacteristicNotification(characteristic, true)) {
          reject(
            `Failed to register notification for characteristic ${
              arg.characteristicUUID
            }`
          );
          return;
        }

        const clientCharacteristicConfigId = this.stringToUuid('2902');
        let bluetoothGattDescriptor = characteristic.getDescriptor(
          clientCharacteristicConfigId
        ) as android.bluetooth.BluetoothGattDescriptor;
        if (!bluetoothGattDescriptor) {
          bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(
            clientCharacteristicConfigId,
            android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE
          );
          characteristic.addDescriptor(bluetoothGattDescriptor);
          CLog(
            CLogTypes.info,
            `Bluetooth.startNotifying ---- descriptor: ${bluetoothGattDescriptor}`
          );
          //Any creation error will trigger the global catch. Ok.
        }

        // prefer notify over indicate
        if (
          (characteristic.getProperties() &
            android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !==
          0
        ) {
          bluetoothGattDescriptor.setValue(
            android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
          );
        } else if (
          (characteristic.getProperties() &
            android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !==
          0
        ) {
          bluetoothGattDescriptor.setValue(
            android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
          );
        } else {
          reject(
            `Characteristic ${characteristicUUID} does not have NOTIFY or INDICATE property set.`
          );
          return;
        }

        if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
          const cb =
            arg.onNotify ||
            function(result) {
              CLog(
                CLogTypes.warning,
                "No 'onNotify' callback function specified for 'startNotifying'"
              );
            };
          const stateObject = this.connections[arg.peripheralUUID];
          stateObject.onNotifyCallback = cb;
          CLog(CLogTypes.info, '--- notifying');
          resolve();
        } else {
          reject(
            `Failed to set client characteristic notification for ${characteristicUUID}`
          );
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.startNotifying ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  // TODO lot of reuse between this and .startNotifying
  stopNotifying(arg: StopNotifyingOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const gatt = wrapper.gatt;
        const gattService = wrapper.bluetoothGattService;
        const characteristicUUID = this.stringToUuid(arg.characteristicUUID);

        const characteristic = this._findNotifyCharacteristic(
          gattService,
          characteristicUUID
        );
        CLog(
          CLogTypes.info,
          `Bluetooth.stopNotifying ---- service characteristic: ${characteristic}`
        );

        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${
              arg.characteristicUUID
            } on service with UUID ${arg.serviceUUID} on peripheral with UUID ${
              arg.peripheralUUID
            }`
          );
          return;
        }

        const stateObject = this.connections[arg.peripheralUUID];
        stateObject.onNotifyCallback = null;

        if (gatt.setCharacteristicNotification(characteristic, false)) {
          resolve();
        } else {
          reject(
            'Failed to remove client characteristic notification for ' +
              characteristicUUID
          );
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.stopNotifying: ${ex}`);
        reject(ex);
      }
    });
  }

  /* * * * * *  BLUETOOTH PERIPHERAL CODE * * * * * * */
  getAdapter() {
    return this.adapter;
  }

  removeBond(device) {
    try {
      let m = device.getClass();
      const tmp = Array.create('java.lang.Class', 0);
      m = m.getMethod('removeBond', tmp);
      const removed = m.invoke(device, null);
      CLog(CLogTypes.info, 'Removed bond');
      return removed;
    } catch (ex) {
      CLog(CLogTypes.error, `Bluetooth.removeBond ---- error: ${ex}`);
    }
  }

  /**
   * Perform a service discovery on the remote device to get the UUIDs supported.
   */
  fetchUuidsWithSdp(device) {
    try {
      let m = device.getClass();
      const tmp = Array.create('java.lang.Class', 0);
      m = m.getMethod('fetchUuidsWithSdp', tmp);
      const worked = m.invoke(device, null);
      return worked;
    } catch (ex) {
      CLog(CLogTypes.error, `Bluetooth.fetchUuidsWithSdp ---- error: ${ex}`);
    }
  }

  /**
   * Close the GATT server instance.
   */
  stopGattServer() {
    if (this.gattServer) {
      this.gattServer.close();
    }
    this.gattServer = null;
  }

  /**
   * Open a GATT Server The callback is used to deliver results to Caller, such as connection status as well as the results of any other GATT server operations.
   * The method returns a BluetoothGattServer instance. You can use BluetoothGattServer to conduct GATT server operations.
   */
  startGattServer() {
    // if >= Android18 (JellyBean)
    // if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
    if (
      android.os.Build.VERSION.SDK_INT >=
      android.os.Build.VERSION_CODES.JELLY_BEAN_MR2
    ) {
      this.gattServer = this.bluetoothManager.openGattServer(
        utils.ad.getApplicationContext(),
        this.bluetoothGattServerCallback
      );
    }
  }

  /**
   * Send a notification or indication that a local characteristic has been updated.
   * A notification or indication is sent to the remote device to signal that the characteristic has been updated.
   * This function should be invoked for every client that requests notifications/indications by writing to the "Client Configuration" descriptor for the given characteristic.
   * https://developer.android.com/reference/android/bluetooth/BluetoothGattServer.html#notifyCharacteristicChanged(android.bluetooth.BluetoothDevice,%20android.bluetooth.BluetoothGattCharacteristic,%20boolean)
   */
  notifyCentrals(
    value: any,
    characteristic: android.bluetooth.BluetoothGattCharacteristic,
    devices: any
  ) {
    const didSetValue = characteristic && characteristic.setValue(value);
    if (didSetValue) {
      const notify = dev => {
        return new Promise((resolve, reject) => {
          let timeoutID;

          // handle when the notification is sent
          const notificationSent = args => {
            const argdata = args.data;
            const device = argdata.device;
            const status = argdata.status;
            if (device.address === dev) {
              clearTimeout(timeoutID);
              this.off(Bluetooth.notification_sent_event, notificationSent);
              if (status) {
                // GATT_SUCCESS is 0x00
                reject(`notify status error: ${status}`);
              } else {
                resolve();
              }
            }
          };

          timeoutID = setTimeout(() => {
            this.off(Bluetooth.notification_sent_event, notificationSent);
            reject('notify timeout!');
          }, 10000);

          // register for when notification is sent
          this.on(Bluetooth.notification_sent_event, notificationSent);

          // tell it to send the notification
          if (dev && characteristic) {
            this.gattServer.notifyCharacteristicChanged(
              dev,
              characteristic,
              true
            );
          } else {
            reject('Device or characteristic closed unexpectedly!');
          }
        });
      };

      // return the promise chain from last element
      return devices.reduce(function(chain, item) {
        // bind item to first argument of function handle, replace `null` context as necessary
        return chain.then(notify.bind(null, item));
        // start chain with promise of first item
      }, notify(devices.shift()));
    } else {
      return Promise.reject(`Couldn't set value on ${characteristic}`);
    }
  }

  /**
   * Show a system activity that requests discoverable mode. This activity will also request the user to turn on Bluetooth if it is not currently enabled.
   * TODO: finish implementing, not actually firing right now.
   */
  setDiscoverable() {
    return new Promise((resolve, reject) => {
      try {
        const intent = new android.content.Intent(
          android.bluetooth.BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE
        );
        application.android.foregroundActivity.startActivityForResult(
          intent,
          ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE
        );
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.setDiscoverable ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  getAdvertiser() {
    if (this.adapter.isMultipleAdvertisementSupported()) {
      if (
        android.os.Build.VERSION.SDK_INT >=
        android.os.Build.VERSION_CODES.LOLLIPOP
      ) {
        return this.adapter.getBluetoothLeAdvertiser();
      }
    }
  }

  makeService(opts: MakeServiceOptions) {
    const suuid = this.stringToUuid(opts.UUID);
    const serviceType =
      opts && opts.primary === true
        ? android.bluetooth.BluetoothGattService.SERVICE_TYPE_PRIMARY
        : android.bluetooth.BluetoothGattService.SERVICE_TYPE_SECONDARY;
    return new android.bluetooth.BluetoothGattService(suuid, serviceType);
  }

  makeCharacteristic(opts: MakeCharacteristicOptions) {
    const cuuid = this.stringToUuid(opts.UUID);
    const props =
      (opts && opts.properties) ||
      android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ |
        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE |
        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY;
    const permissions =
      (opts && opts.permissions) ||
      android.bluetooth.BluetoothGattCharacteristic.PERMISSION_WRITE |
        android.bluetooth.BluetoothGattCharacteristic.PERMISSION_READ;
    return new android.bluetooth.BluetoothGattCharacteristic(
      cuuid,
      props,
      permissions
    );
  }

  makeDescriptor(opts) {
    const uuid = this.stringToUuid(opts.UUID);
    const perms =
      (opts && opts.permissions) ||
      android.bluetooth.BluetoothGattDescriptor.PERMISSION_READ |
        android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE;
    return new android.bluetooth.BluetoothGattDescriptor(uuid, perms);
  }

  addService(service) {
    if (service && this.gattServer) {
      this.gattServer.addService(service);
    }
  }

  getServerService(uuidString) {
    if (this.gattServer) {
      const pUuid = this.stringToUuid(uuidString);
      const services = this.gattServer.getServices();
      const service = this.gattServer.getService(pUuid);
      if (service) {
        CLog(
          CLogTypes.info,
          `Bluetooth.getServerService ---- getService: ${service} - ${service.getUuid()}`
        );
      } else {
        CLog(
          CLogTypes.info,
          `Bluetooth.getServerService ---- getService: ${uuidString} - not found!`
        );
      }
      return service;
    }
    return null;
  }

  offersService(uuidString) {
    return this.getServerService(uuidString) !== null;
  }

  clearServices() {
    if (this.gattServer) {
      this.gattServer.clearServices();
    }
  }

  cancelServerConnection(device) {
    if (this.gattServer && device) {
      CLog(
        CLogTypes.info,
        `Bluetooth.cancelServerConnection ---- device: ${device}`
      );
      this.gattServer.cancelConnection(device);
    }
  }

  /**
   * Get connected devices for this specific profile.
   * Return the set of devices which are in state STATE_CONNECTED
   * Requires the BLUETOOTH permission.
   * @returns - List of Bluetooth devices. The list will be empty on error.
   */
  getConnectedDevices() {
    return this.bluetoothManager.getConnectedDevices(
      android.bluetooth.BluetoothProfile.GATT
    );
  }

  /**
   * Get the current connection state of the profile.
   * @param device [android.bluetooth.BluetoothDevice] - Remote bluetooth device.
   */
  getConnectedDeviceState(device: android.bluetooth.BluetoothDevice) {
    if (device) {
      return this.bluetoothManager.getConnectionState(
        device,
        android.bluetooth.BluetoothProfile.GATT
      );
    }
  }

  /**
   * Get a list of devices that match any of the given connection states.
   * @param states - Array of states. States can be one of:
   * android.bluetooth.BluetoothProfile.STATE_CONNECTED,
   * android.bluetooth.BluetoothProfile.STATE_CONNECTING,
   * android.bluetooth.BluetoothProfile.STATE_DISCONNECTED,
   * android.bluetooth.BluetoothProfile.STATE_DISCONNECTING,
   * @link - https://developer.android.com/reference/android/bluetooth/BluetoothManager.html#getDevicesMatchingConnectionStates(int,%20int[])
   */
  getConnectedDevicesMatchingState(states) {
    if (states) {
      return this.bluetoothManager.getDevicesMatchingConnectionStates(
        android.bluetooth.BluetoothProfile.GATT,
        [states]
      );
    }
  }

  /**
   * Get connected devices for this specific profile.
   * Return the set of devices which are in state STATE_CONNECTED
   * Requires the BLUETOOTH permission.
   * @returns - List of Bluetooth devices. The list will be empty on error.
   */
  getServerConnectedDevices() {
    return this.bluetoothManager.getConnectedDevices(
      android.bluetooth.BluetoothProfile.GATT_SERVER
    );
  }

  /**
   * Get the current connection state of the profile.
   * @param device [android.bluetooth.BluetoothDevice] - Remote bluetooth device.
   */
  getServerConnectedDeviceState(device: android.bluetooth.BluetoothDevice) {
    if (device) {
      return this.bluetoothManager.getConnectionState(
        device,
        android.bluetooth.BluetoothProfile.GATT_SERVER
      );
    }
  }

  /**
   * Get a list of devices that match any of the given connection states.
   * @param states - Array of states. States can be one of:
   * android.bluetooth.BluetoothProfile.STATE_CONNECTED,
   * android.bluetooth.BluetoothProfile.STATE_CONNECTING,
   * android.bluetooth.BluetoothProfile.STATE_DISCONNECTED,
   * android.bluetooth.BluetoothProfile.STATE_DISCONNECTING,
   * @link - https://developer.android.com/reference/android/bluetooth/BluetoothManager.html#getDevicesMatchingConnectionStates(int,%20int[])
   */
  getServerConnectedDevicesMatchingState(states) {
    if (states) {
      return this.bluetoothManager.getDevicesMatchingConnectionStates(
        android.bluetooth.BluetoothProfile.GATT_SERVER,
        [states]
      );
    }
  }

  startAdvertising(opts: StartAdvertisingOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.adapter) {
          // TODO: should we create a new adapter here by default and not reject???
          reject('Bluetooth not properly initialized!');
          return;
        }

        const adv = this.getAdvertiser();
        CLog(
          CLogTypes.info,
          `Bluetooth.startAdvertising ---- advertiser: ${adv}`
        );

        if (adv === null || !this.adapter.isMultipleAdvertisementSupported()) {
          reject(
            'Adapter is turned off or doesnt support bluetooth advertisement'
          );
          return;
        } else {
          const settings = opts.settings;
          const _s = new android.bluetooth.le.AdvertiseSettings.Builder()
            .setAdvertiseMode(
              (settings && settings.advertiseMode) ||
                android.bluetooth.le.AdvertiseSettings
                  .ADVERTISE_MODE_LOW_LATENCY
            )
            .setTxPowerLevel(
              (settings && settings.txPowerLevel) ||
                android.bluetooth.le.AdvertiseSettings.ADVERTISE_TX_POWER_HIGH
            )
            .setConnectable((settings && settings.connectable) || false)
            .build();

          const pUuid = android.os.ParcelUuid.fromString(
            opts.UUID
          ) as android.os.ParcelUuid;

          const data = opts.data;
          const _d = new android.bluetooth.le.AdvertiseData.Builder()
            .addServiceUuid(pUuid)
            .build();

          const _scanResult = new android.bluetooth.le.AdvertiseData.Builder()
            .setIncludeDeviceName((data && data.includeDeviceName) || true)
            .build();

          adv.startAdvertising(_s, _d, _scanResult, this.advertiseCallback);
          CLog(
            CLogTypes.info,
            'Bluetooth.startAdvertising ---- started advertising'
          );

          resolve();
        }
      } catch (err) {
        this.sendEvent(
          Bluetooth.error_event,
          { error: err },
          'Error with Bluetooth.startAdvertising()'
        );
        reject(err);
      }
    });
  }

  stopAdvertising() {
    return new Promise((resolve, reject) => {
      if (!this.adapter) {
        reject('Bluetooth not properly initialized!');
        return;
      }

      const adv = this.getAdvertiser();
      CLog(CLogTypes.info, `Bluetooth.stopAdvertising ---- advertiser: ${adv}`);

      if (adv === null || !this.adapter.isMultipleAdvertisementSupported()) {
        reject(
          'Adapter is turned off or doesnt support bluetooth advertisement'
        );
        return;
      } else {
        CLog(
          CLogTypes.info,
          'Bluetooth.stopAdvertising ---- bluetooth stopping advertising!'
        );
        adv.stopAdvertising(this.advertiseCallback);
        resolve();
      }
    });
  }

  isPeripheralModeSupported() {
    return new Promise((resolve, reject) => {
      resolve(
        this.adapter.isMultipleAdvertisementSupported() &&
          this.adapter.isOffloadedFilteringSupported() &&
          this.adapter.isOffloadedScanBatchingSupported()
      );
    });
  }
  /* * * * * * END BLUETOOTHcd PERIPHERAL CODE  * * * * */

  gattDisconnect(gatt: android.bluetooth.BluetoothGatt) {
    if (gatt !== null) {
      const device = gatt.getDevice() as android.bluetooth.BluetoothDevice;
      CLog(CLogTypes.info, `Bluetooth.gattDisconnect ---- device: ${device}`);
      const stateObject = this.connections[device.getAddress()];
      CLog(
        CLogTypes.info,
        `Bluetooth.gattDisconnect ---- invoking disconnect callback`
      );
      if (stateObject && stateObject.onDisconnected) {
        stateObject.onDisconnected({
          UUID: device.getAddress(),
          name: device.getName()
        });
      } else {
        CLog(
          CLogTypes.info,
          'Bluetooth.gattDisconnect ---- no disconnect callback found'
        );
      }
      this.connections[device.getAddress()] = null;
      // Close this Bluetooth GATT client.
      CLog(CLogTypes.info, 'Bluetooth.gattDisconnect ---- Closing GATT client');
      gatt.disconnect();
      gatt.close();
    }
  }

  // Java UUID -> JS
  uuidToString(uuid) {
    const uuidStr = uuid.toString();
    const pattern = java.util.regex.Pattern.compile(
      '0000(.{4})-0000-1000-8000-00805f9b34fb',
      2
    );
    const matcher = pattern.matcher(uuidStr);
    return matcher.matches() ? matcher.group(1) : uuidStr;
  }

  // val must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
  encodeValue(val) {
    let parts = val;
    // if it's not a string assume it's a byte array already
    if (typeof val === 'string') {
      parts = val.split(',');

      if (parts[0].indexOf('x') === -1) {
        return null;
      }
    }

    const result = Array.create('byte', parts.length);

    for (let i = 0; i < parts.length; i++) {
      result[i] = parts[i];
    }
    return result;
  }

  decodeValue(value) {
    if (value === null) {
      return null;
    }

    // value is of Java type: byte[]
    const b = android.util.Base64.encodeToString(
      value,
      android.util.Base64.NO_WRAP
    );
    return this.base64ToArrayBuffer(b);
  }

  // JS UUID -> Java
  stringToUuid(uuidStr) {
    if (uuidStr.length === 4) {
      uuidStr = '0000' + uuidStr + '-0000-1000-8000-00805f9b34fb';
    }
    return java.util.UUID.fromString(uuidStr);
  }

  extractManufacturerRawData(scanRecord) {
    let offset = 0;
    while (offset < scanRecord.length - 2) {
      const len = scanRecord[offset++] & 0xff;
      if (len === 0) {
        break;
      }

      const type = scanRecord[offset++] & 0xff;
      switch (type) {
        case 0xff: // Manufacturer Specific Data
          return this.decodeValue(
            java.util.Arrays.copyOfRange(scanRecord, offset, offset + len - 1)
          );
        default:
          offset += len - 1;
          break;
      }
    }
  }

  // This guards against peripherals reusing char UUID's. We prefer notify.
  private _findNotifyCharacteristic(bluetoothGattService, characteristicUUID) {
    // Check for Notify first
    const characteristics = bluetoothGattService.getCharacteristics();
    for (let i = 0; i < characteristics.size(); i++) {
      const c = characteristics.get(i);
      if (
        (c.getProperties() &
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !==
          0 &&
        characteristicUUID.equals(c.getUuid())
      ) {
        return c;
      }
    }

    // If there wasn't a Notify Characteristic, check for Indicate
    for (let j = 0; j < characteristics.size(); j++) {
      const ch = characteristics.get(j);
      if (
        (ch.getProperties() &
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !==
          0 &&
        characteristicUUID.equals(ch.getUuid())
      ) {
        return ch;
      }
    }

    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    return bluetoothGattService.getCharacteristic(characteristicUUID);
  }

  // This guards against peripherals reusing char UUID's.
  private _findCharacteristicOfType(
    bluetoothGattService: android.bluetooth.BluetoothGattService,
    characteristicUUID,
    charType
  ) {
    // Returns a list of characteristics included in this service.
    const characteristics = bluetoothGattService.getCharacteristics();
    for (let i = 0; i < characteristics.size(); i++) {
      const c = characteristics.get(
        i
      ) as android.bluetooth.BluetoothGattCharacteristic;
      if (
        (c.getProperties() & charType) !== 0 &&
        characteristicUUID.equals(c.getUuid())
      ) {
        return c;
      }
    }
    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    return bluetoothGattService.getCharacteristic(characteristicUUID);
  }

  private _getWrapper(arg, reject) {
    if (!this._isEnabled()) {
      reject('Bluetooth is not enabled');
      return;
    }
    if (!arg.peripheralUUID) {
      reject('No peripheralUUID was passed');
      return;
    }
    if (!arg.serviceUUID) {
      reject('No serviceUUID was passed');
      return;
    }
    if (!arg.characteristicUUID) {
      reject('No characteristicUUID was passed');
      return;
    }

    const serviceUUID = this.stringToUuid(arg.serviceUUID);

    const stateObject = this.connections[arg.peripheralUUID];
    if (!stateObject) {
      reject('The peripheral is disconnected');
      return;
    }

    const gatt = stateObject.device;
    const bluetoothGattService = gatt.getService(serviceUUID);

    if (!bluetoothGattService) {
      reject(
        `Could not find service with UUID ${
          arg.serviceUUID
        } on peripheral with UUID ${arg.peripheralUUID}`
      );
      return;
    }

    // with that all being checked, let's return a wrapper object containing all the stuff we found here
    return {
      gatt: gatt,
      bluetoothGattService: bluetoothGattService
    };
  }

  private _isEnabled() {
    return this.adapter !== null && this.adapter.isEnabled();
  }

  private _getContext() {
    //noinspection JSUnresolvedVariable,JSUnresolvedFunction
    const ctx = java.lang.Class.forName('android.app.AppGlobals')
      .getMethod('getInitialApplication', null)
      .invoke(null, null);
    if (ctx) {
      return ctx;
    }

    //noinspection JSUnresolvedVariable,JSUnresolvedFunction
    return java.lang.Class.forName('android.app.ActivityThread')
      .getMethod('currentApplication', null)
      .invoke(null, null);
  }

  private _getActivity() {
    const activity =
      application.android.foregroundActivity ||
      application.android.startActivity;
    if (activity === null) {
      // Throw this off into the future since an activity is not available....
      setTimeout(() => {
        this._getActivity();
      }, 250);
      return;
    } else {
      return activity;
    }
  }
}
