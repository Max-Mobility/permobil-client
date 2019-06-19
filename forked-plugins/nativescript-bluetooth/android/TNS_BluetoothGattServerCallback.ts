import { CLog, CLogTypes, ConnectionState } from '../common';
import { Bluetooth, deviceToCentral } from './android_main';

@JavaProxy('com.nativescript.TNS_BluetoothGattServerCallback')
export class TNS_BluetoothGattServerCallback extends android.bluetooth
  .BluetoothGattServerCallback {
  private _owner: WeakRef<Bluetooth>;
  constructor() {
    super();
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this._owner = owner;
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onInit ---- this._owner: ${
        this._owner
      }`
    );
  }

  /**
   * A remote client has requested to read a local characteristic.
   * @param device [BluetoothDevice] - The remote device that has requested the read operation.
   * @param requestId [number] - The Id of the request.
   * @param offset [number] - Offset into the value of the characteristic
   * @param characteristic [android.bluetooth.BluetoothGattCharacteristic] - Characteristic to be read
   */
  onCharacteristicReadRequest(
    device: android.bluetooth.BluetoothDevice,
    requestId: number,
    offset: number,
    characteristic: android.bluetooth.BluetoothGattCharacteristic
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onCharacteristicReadRequest ---- device: ${device} requestId: ${requestId}, offset: ${offset}, characteristic: ${characteristic}`
    );

    this._owner.get().sendEvent(Bluetooth.characteristic_read_request_event, {
      device: deviceToCentral(device),
      requestId,
      offset,
      characteristic
    });

    if (this._owner.get().gattServer) {
      const respData = Array.create('byte', 1);
      respData[0] = 0x01;
      this._owner
        .get()
        .gattServer.sendResponse(device, requestId, 0, offset, respData);
    }
  }

  /**
   * A remote client has requested to write to a local characteristic.
   * @param device - The remote device that has requested the write operation
   * @param requestId - The Id of the request
   * @param characteristic - Characteristic to be written to.
   * @param preparedWrite - true, if this write operation should be queued for later execution.
   * @param responseNeeded - true, if the remote device requires a response
   * @param offset - The offset given for the value
   * @param value - The value the client wants to assign to the characteristic
   */
  onCharacteristicWriteRequest(
    device: android.bluetooth.BluetoothDevice,
    requestId: number,
    characteristic: android.bluetooth.BluetoothGattCharacteristic,
    preparedWrite: boolean,
    responseNeeded: boolean,
    offset: number,
    value: any[]
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onCharacteristicWriteRequest ---- device: ${device} requestId: ${requestId}, characteristic: ${characteristic}`
    );

    this._owner.get().sendEvent(Bluetooth.characteristic_write_request_event, {
      device: deviceToCentral(device),
      requestId,
      characteristic,
      preparedWrite,
      responseNeeded,
      offset,
      value
    });
    if (this._owner.get().gattServer) {
      const respData = Array.create('byte', 1);
      respData[0] = 0x01;
      this._owner
        .get()
        .gattServer.sendResponse(device, requestId, 0, offset, respData);
    }
  }

  /**
   * Callback indicating when a remote device has been connected or disconnected.
   * @param device - Remote device that has been connected or disconnected.
   * @param status - Status of the connect or disconnect operation.
   * @param newState - Returns the new connection state. Can be one of STATE_DISCONNECTED or STATE_CONNECTED
   */
  onConnectionStateChange(
    device: android.bluetooth.BluetoothDevice,
    status: number,
    newState: number
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onConnectionStateChange ---- device: ${device}, status: ${status}, newState: ${newState}`
    );

    // setup return data values for cross-platform use
    const connection_state =
      newState === android.bluetooth.BluetoothProfile.STATE_CONNECTED
        ? ConnectionState.connected
        : ConnectionState.disconnected;

    this._owner
      .get()
      .sendEvent(Bluetooth.server_connection_state_changed_event, {
        device: deviceToCentral(device),
        connection_state
      });
  }

  /**
   * A remote client has requested to read a local descriptor.
   * An application must call sendResponse(BluetoothDevice, int, int, int, byte[]) to complete the request.
   * @param device - The remote device that has requested the read operation
   * @param requestId - The Id of the request
   * @param offset - Offset into the value of the characteristic
   * @param descriptor - Descriptor to be read
   */
  onDescriptorReadRequest(
    device: android.bluetooth.BluetoothDevice,
    requestId: number,
    offset: number,
    descriptor
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onDescriptorReadRequest ---- device: ${device}, requestId: ${requestId}, offset: ${offset}, descriptor: ${descriptor}`
    );

    this._owner.get().sendEvent(Bluetooth.descriptor_read_request_event, {
      device: deviceToCentral(device),
      requestId,
      offset,
      descriptor
    });

    // this._owner.get()._onDescriptorReadRequestCallback(device, requestId, offset, descriptor);
    if (this._owner.get().gattServer) {
      const respData = Array.create('byte', 1);
      respData[0] = 0x01;
      this._owner
        .get()
        .gattServer.sendResponse(device, requestId, 0, offset, respData);
    }
  }

  /**
   * A remote client has requested to write to a local descriptor.
   * An application must call sendResponse(BluetoothDevice, int, int, int, byte[]) to complete the request.
   * @param device - The remote device that has requested the write operation
   * @param requestId - The Id of the request
   * @param descriptor - Descriptor to be written to.
   * @param preparedWrite - true, if this write operation should be queued for later execution.
   * @param responseNeeded - true, if the remote device requires a response
   * @param offset - The offset given for the value
   * @param value - The value the client wants to assign to the descriptor
   */
  onDescriptorWriteRequest(
    device,
    requestId,
    descriptor,
    preparedWrite,
    responseNeeded,
    offset,
    value
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onDescriptorWriteRequest ---- device: ${device}, requestId: ${requestId}, descriptor: ${descriptor}`
    );

    this._owner.get().sendEvent(Bluetooth.descriptor_write_request_event, {
      device: deviceToCentral(device),
      requestId,
      descriptor,
      preparedWrite,
      responseNeeded,
      offset,
      value
    });
    if (this._owner.get().gattServer) {
      const respData = Array.create('byte', 1);
      respData[0] = 0x01;
      this._owner
        .get()
        .gattServer.sendResponse(device, requestId, 0, offset, respData);
    }
  }

  /**
   * Execute all pending write operations for this device.
   * An application must call sendResponse(BluetoothDevice, int, int, int, byte[]) to complete the request.
   * @param device - The remote device that has requested the write operations
   * @param requestId - The Id of the request
   * @param execute - Whether the pending writes should be executed (true) or cancelled (false)
   */
  onExecuteWrite(
    device: android.bluetooth.BluetoothDevice,
    requestId: number,
    execute: boolean
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onExecuteWrite ---- device: ${device}, requestId: ${requestId}, execute: ${execute}`
    );

    this._owner.get().sendEvent(Bluetooth.execute_write_event, {
      device: deviceToCentral(device),
      requestId,
      execute
    });

    if (this._owner.get().gattServer) {
      const respData = Array.create('byte', 1);
      respData[0] = 0x01;
      this._owner
        .get()
        .gattServer.sendResponse(device, requestId, 0, 0, respData);
    }
  }

  /**
   * Callback invoked when a notification or indication has been sent to a remote device.
   * When multiple notifications are to be sent, an application must wait for this callback to be received before sending additional notifications.
   * API level 21+
   * @param device - The remote device the notification has been sent to
   * @param status [number] - Returns GATT_SUCCESS if the operation was successful.
   */
  onNotificationSent(
    device: android.bluetooth.BluetoothDevice,
    status: number
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onNotificationSent ---- device: ${device}, status: ${status}`
    );

    this._owner.get().sendEvent(Bluetooth.notification_sent_event, {
      device: deviceToCentral(device),
      status
    });
  }

  /**
   * Indicates whether a local service has been added successfully.
   * @param status [number] - Returns GATT_SUCCESS if the service was added successfully.
   * @param service [android.bluetooth.BluetoothGattService] - The service that has been added.
   */
  onServiceAdded(
    status: number,
    service: android.bluetooth.BluetoothGattService
  ) {
    CLog(
      CLogTypes.info,
      `---- TNS_BluetoothGattServerCallback.onServiceAdded ---- status: ${status}, service: ${service}`
    );
  }
}
