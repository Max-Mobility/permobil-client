import { Bluetooth } from './android_main';

/**
 * Callback interface used to deliver LE scan results.
 * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.LeScanCallback.html
 */
@NativeClass()
@JavaProxy('com.nativescript.TNS_LeScanCallback')
export class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter
  .LeScanCallback {
  private _owner: WeakRef<Bluetooth>;
  onPeripheralDiscovered: (data: any) => void;

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
        console.info(
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
          console.info(
            `---- TNS_LeScanCallback.onLeScan ---- manufacturerDataRaw: ${manufacturerDataRaw}`
          );
          if (manufacturerDataRaw) {
            manufacturerId = new DataView(manufacturerDataRaw, 0).getUint16(
              0,
              true
            );
            console.info(
              `---- TNS_LeScanCallback.onLeScan ---- manufacturerId: ${manufacturerId}`
            );
            manufacturerData = manufacturerDataRaw.slice(2);
            console.info(
              `---- TNS_LeScanCallback.onLeScan ---- manufacturerData: ${manufacturerData}`
            );
          }

          console.info(
            `---- TNS_LeScanCallback.scanCallback ---- payload: ${device.getAddress()}::${device.getName()}`
          );
          const payload = {
            type: 'scanResult', // TODO or use different callback functions?
            device: device,
            UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
            name: device.getName(),
            RSSI: rssi,
            state: 'disconnected',
            manufacturerId: manufacturerId,
            manufacturerData: manufacturerData
          };
          this._owner
            .get()
            .sendEvent(Bluetooth.device_discovered_event, payload);
          this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
        }
      }
    });
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this._owner = owner;
  }
}
