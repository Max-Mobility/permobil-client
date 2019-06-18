"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var android_main_1 = require("./android_main");
var TNS_BluetoothGattServerCallback = (function (_super) {
    __extends(TNS_BluetoothGattServerCallback, _super);
    function TNS_BluetoothGattServerCallback() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    TNS_BluetoothGattServerCallback.prototype.onInit = function (owner) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onInit ---- this._owner: " + this._owner);
    };
    TNS_BluetoothGattServerCallback.prototype.onCharacteristicReadRequest = function (device, requestId, offset, characteristic) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onCharacteristicReadRequest ---- device: " + device + " requestId: " + requestId + ", offset: " + offset + ", characteristic: " + characteristic);
        this._owner.get().sendEvent(android_main_1.Bluetooth.characteristic_read_request_event, {
            device: android_main_1.deviceToCentral(device),
            requestId: requestId,
            offset: offset,
            characteristic: characteristic
        });
        if (this._owner.get().gattServer) {
            var respData = Array.create('byte', 1);
            respData[0] = 0x01;
            this._owner
                .get()
                .gattServer.sendResponse(device, requestId, 0, offset, respData);
        }
    };
    TNS_BluetoothGattServerCallback.prototype.onCharacteristicWriteRequest = function (device, requestId, characteristic, preparedWrite, responseNeeded, offset, value) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onCharacteristicWriteRequest ---- device: " + device + " requestId: " + requestId + ", characteristic: " + characteristic);
        this._owner.get().sendEvent(android_main_1.Bluetooth.characteristic_write_request_event, {
            device: android_main_1.deviceToCentral(device),
            requestId: requestId,
            characteristic: characteristic,
            preparedWrite: preparedWrite,
            responseNeeded: responseNeeded,
            offset: offset,
            value: value
        });
        if (this._owner.get().gattServer) {
            var respData = Array.create('byte', 1);
            respData[0] = 0x01;
            this._owner
                .get()
                .gattServer.sendResponse(device, requestId, 0, offset, respData);
        }
    };
    TNS_BluetoothGattServerCallback.prototype.onConnectionStateChange = function (device, status, newState) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onConnectionStateChange ---- device: " + device + ", status: " + status + ", newState: " + newState);
        var connection_state = newState === android.bluetooth.BluetoothProfile.STATE_CONNECTED
            ? common_1.ConnectionState.connected
            : common_1.ConnectionState.disconnected;
        this._owner
            .get()
            .sendEvent(android_main_1.Bluetooth.server_connection_state_changed_event, {
            device: android_main_1.deviceToCentral(device),
            connection_state: connection_state
        });
    };
    TNS_BluetoothGattServerCallback.prototype.onDescriptorReadRequest = function (device, requestId, offset, descriptor) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onDescriptorReadRequest ---- device: " + device + ", requestId: " + requestId + ", offset: " + offset + ", descriptor: " + descriptor);
        this._owner.get().sendEvent(android_main_1.Bluetooth.descriptor_read_request_event, {
            device: android_main_1.deviceToCentral(device),
            requestId: requestId,
            offset: offset,
            descriptor: descriptor
        });
        if (this._owner.get().gattServer) {
            var respData = Array.create('byte', 1);
            respData[0] = 0x01;
            this._owner
                .get()
                .gattServer.sendResponse(device, requestId, 0, offset, respData);
        }
    };
    TNS_BluetoothGattServerCallback.prototype.onDescriptorWriteRequest = function (device, requestId, descriptor, preparedWrite, responseNeeded, offset, value) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onDescriptorWriteRequest ---- device: " + device + ", requestId: " + requestId + ", descriptor: " + descriptor);
        this._owner.get().sendEvent(android_main_1.Bluetooth.descriptor_write_request_event, {
            device: android_main_1.deviceToCentral(device),
            requestId: requestId,
            descriptor: descriptor,
            preparedWrite: preparedWrite,
            responseNeeded: responseNeeded,
            offset: offset,
            value: value
        });
        if (this._owner.get().gattServer) {
            var respData = Array.create('byte', 1);
            respData[0] = 0x01;
            this._owner
                .get()
                .gattServer.sendResponse(device, requestId, 0, offset, respData);
        }
    };
    TNS_BluetoothGattServerCallback.prototype.onExecuteWrite = function (device, requestId, execute) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onExecuteWrite ---- device: " + device + ", requestId: " + requestId + ", execute: " + execute);
        this._owner.get().sendEvent(android_main_1.Bluetooth.execute_write_event, {
            device: android_main_1.deviceToCentral(device),
            requestId: requestId,
            execute: execute
        });
        if (this._owner.get().gattServer) {
            var respData = Array.create('byte', 1);
            respData[0] = 0x01;
            this._owner
                .get()
                .gattServer.sendResponse(device, requestId, 0, 0, respData);
        }
    };
    TNS_BluetoothGattServerCallback.prototype.onNotificationSent = function (device, status) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onNotificationSent ---- device: " + device + ", status: " + status);
        this._owner.get().sendEvent(android_main_1.Bluetooth.notification_sent_event, {
            device: android_main_1.deviceToCentral(device),
            status: status
        });
    };
    TNS_BluetoothGattServerCallback.prototype.onServiceAdded = function (status, service) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BluetoothGattServerCallback.onServiceAdded ---- status: " + status + ", service: " + service);
    };
    TNS_BluetoothGattServerCallback = __decorate([
        JavaProxy('com.nativescript.TNS_BluetoothGattServerCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_BluetoothGattServerCallback);
    return TNS_BluetoothGattServerCallback;
}(android.bluetooth
    .BluetoothGattServerCallback));
exports.TNS_BluetoothGattServerCallback = TNS_BluetoothGattServerCallback;
