import { CLog, CLogTypes } from '../common';
import { Bluetooth } from './android_main';

/**
 * Bluetooth LE scan callbacks. Scan results are reported using these callbacks.
 * https://developer.android.com/reference/android/bluetooth/le/ScanCallback.html
 */
@JavaProxy('com.nativescript.TNS_ScanCallback')
// tslint:disable-next-line:class-name
export class TNS_ScanCallback extends android.bluetooth.le.ScanCallback {
  private _owner: WeakRef<Bluetooth>;
  constructor() {
    super();
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this._owner = owner;
  }

  /**
   * Callback when batch results are delivered.
   * @param results [List<android.bluetooth.le.ScanResult>] - List of scan results that are previously scanned.
   */
  onBatchScanResults(results) {
    CLog(
      CLogTypes.info,
      `----- TNS_ScanCallback.onBatchScanResults ----- results: ${results}`
    );
  }

  /**
   * Callback when scan could not be started.
   * @param errorCode [number] - Error code (one of SCAN_FAILED_*) for scan failure.
   */
  onScanFailed(errorCode: number) {
    CLog(
      CLogTypes.info,
      `----- TNS_ScanCallback.onScanFailed ----- errorCode: ${errorCode}`
    );
    let errorMessage;
    if (
      errorCode ===
      android.bluetooth.le.ScanCallback.SCAN_FAILED_ALREADY_STARTED
    ) {
      errorMessage = 'Scan already started';
    } else if (
      errorCode ===
      android.bluetooth.le.ScanCallback
        .SCAN_FAILED_APPLICATION_REGISTRATION_FAILED
    ) {
      errorMessage = 'Application registration failed';
    } else if (
      errorCode ===
      android.bluetooth.le.ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED
    ) {
      errorMessage = 'Feature unsupported';
    } else if (
      errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_INTERNAL_ERROR
    ) {
      errorMessage = 'Internal error';
    } else {
      errorMessage = 'Scan failed to start';
    }
    CLog(
      CLogTypes.info,
      '----- TNS_ScanCallback.onScanFailed errorMessage: ' + errorMessage
    );
  }

  /**
   * Callback when a BLE advertisement has been found.
   * @param callbackType [number] - Determines how this callback was triggered. Could be one of CALLBACK_TYPE_ALL_MATCHES, CALLBACK_TYPE_FIRST_MATCH or CALLBACK_TYPE_MATCH_LOST
   * @param result  [android.bluetooth.le.ScanResult] - A Bluetooth LE scan result.
   */
  onScanResult(callbackType: number, result: android.bluetooth.le.ScanResult) {
    CLog(
      CLogTypes.info,
      `----- TNS_ScanCallback.onScanResult ----- callbackType: ${callbackType}, result: ${result}`
    );
    const stateObject = this._owner.get().connections[
      result.getDevice().getAddress()
    ];
    if (!stateObject) {
      this._owner.get().connections[result.getDevice().getAddress()] = {
        state: 'disconnected'
      };
      let manufacturerId;
      let manufacturerData;
      if (
        result
          .getScanRecord()
          .getManufacturerSpecificData()
          .size() > 0
      ) {
        manufacturerId = result
          .getScanRecord()
          .getManufacturerSpecificData()
          .keyAt(0);
        CLog(
          CLogTypes.info,
          `---- TNS_ScanCallback.onScanResult ---- manufacturerId: ${manufacturerId}`
        );
        manufacturerData = this._owner.get().decodeValue(
          result
            .getScanRecord()
            .getManufacturerSpecificData()
            .valueAt(0)
        );
        CLog(
          CLogTypes.info,
          `---- TNS_ScanCallback.onScanResult ---- manufacturerData: ${manufacturerData}`
        );
      }

      CLog(
        CLogTypes.info,
        `---- Lollipop+ scanCallback result: ${result
          .getDevice()
          .getName()}::${result.getDevice().getAddress()}`
      );
      this._owner.get().sendEvent(Bluetooth.device_discovered_event, {
        type: 'scanResult', // TODO or use different callback functions?
        UUID: result.getDevice().getAddress(),
        name: result.getDevice().getName(),
        RSSI: result.getRssi(),
        state: 'disconnected',
        advertisement: android.util.Base64.encodeToString(
          result.getScanRecord().getBytes(),
          android.util.Base64.NO_WRAP
        ),
        manufacturerId: manufacturerId,
        manufacturerData: manufacturerData
      });
    }
  }
}
