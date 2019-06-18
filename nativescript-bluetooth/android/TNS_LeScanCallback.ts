import { CLog, CLogTypes } from '../common';
import { Bluetooth } from './android_main';

/**
 * Callback interface used to deliver LE scan results.
 * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.LeScanCallback.html
 */
@JavaProxy('com.nativescript.TNS_LeScanCallback')
// tslint:disable-next-line:class-name
export class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter
  .LeScanCallback {
  private _owner: WeakRef<Bluetooth>;

  constructor() {
    super({
      /**
       * Callback reporting an LE device found during a device scan initiated by the startLeScan(BluetoothAdapter.LeScanCallback) function.
       * @param device [android.bluetooth.BluetoothDevice] - Identifies the remote device
       * @param rssi [number] - The RSSI value for the remote device as reported by the Bluetooth hardware. 0 if no RSSI value is available.
       * @param scanRecord [byte[]] - The content of the advertisement record offered by the remote device.
       */
      onLeScan(
        device: android.bluetooth.BluetoothDevice,
        rssi: number,
        scanRecord
      ) {
        CLog(
          CLogTypes.info,
          `---- TNS_LeScanCallback.onLeScan ---- device: ${device}, rssi: ${rssi}, scanRecord: ${scanRecord}`
        );

        const stateObject = this._owner.get().connections[device.getAddress()];
        if (!stateObject) {
          this._owner.get().connections[device.getAddress()] = {
            state: 'disconnected'
          };

          let manufacturerId;
          let manufacturerData;
          const manufacturerDataRaw = this._owner
            .get()
            .extractManufacturerRawData(scanRecord);
          CLog(
            CLogTypes.info,
            `---- TNS_LeScanCallback.onLeScan ---- manufacturerDataRaw: ${manufacturerDataRaw}`
          );
          if (manufacturerDataRaw) {
            manufacturerId = new DataView(manufacturerDataRaw, 0).getUint16(
              0,
              true
            );
            CLog(
              CLogTypes.info,
              `---- TNS_LeScanCallback.onLeScan ---- manufacturerId: ${manufacturerId}`
            );
            manufacturerData = manufacturerDataRaw.slice(2);
            CLog(
              CLogTypes.info,
              `---- TNS_LeScanCallback.onLeScan ---- manufacturerData: ${manufacturerData}`
            );
          }

          CLog(
            CLogTypes.info,
            `---- TNS_LeScanCallback.scanCallback ---- payload: ${device.getAddress()}::${device.getName()}`
          );
          this._owner.get().sendEvent(Bluetooth.device_discovered_event, {
            type: 'scanResult', // TODO or use different callback functions?
            UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
            name: device.getName(),
            RSSI: rssi,
            state: 'disconnected',
            manufacturerId: manufacturerId,
            manufacturerData: manufacturerData
          });
        }
      }
    });
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this._owner = owner;
    CLog(
      CLogTypes.info,
      `---- TNS_LeScanCallback.onInit ---- this._owner: ${this._owner}`
    );
  }
}
