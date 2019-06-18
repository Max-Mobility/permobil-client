"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("tns-core-modules/data/observable");
require('./base64');
var BluetoothUtil = (function () {
    function BluetoothUtil() {
    }
    BluetoothUtil.debug = false;
    return BluetoothUtil;
}());
exports.BluetoothUtil = BluetoothUtil;
var CLogTypes;
(function (CLogTypes) {
    CLogTypes[CLogTypes["info"] = 0] = "info";
    CLogTypes[CLogTypes["warning"] = 1] = "warning";
    CLogTypes[CLogTypes["error"] = 2] = "error";
})(CLogTypes = exports.CLogTypes || (exports.CLogTypes = {}));
exports.CLog = function (type) {
    if (type === void 0) { type = 0; }
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (BluetoothUtil.debug) {
        if (type === 0) {
            console.log('NativeScript-Bluetooth: INFO', args);
        }
        else if (type === 1) {
            console.log('NativeScript-Bluetooth: WARNING', args);
        }
        else if (type === 2) {
            console.log('NativeScript-Bluetooth: ERROR', args);
        }
    }
};
var BluetoothCommon = (function (_super) {
    __extends(BluetoothCommon, _super);
    function BluetoothCommon() {
        return _super.call(this) || this;
    }
    Object.defineProperty(BluetoothCommon.prototype, "debug", {
        set: function (value) {
            BluetoothUtil.debug = value;
        },
        enumerable: true,
        configurable: true
    });
    BluetoothCommon.prototype.base64ToArrayBuffer = function (b64) {
        var decoded = atob(b64);
        var ret = new Uint8Array(decoded.length);
        for (var i = 0; i < decoded.length; i++) {
            ret[i] = decoded.charCodeAt(i);
        }
        return ret.buffer;
    };
    BluetoothCommon.prototype.requestCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    BluetoothCommon.prototype.hasCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    BluetoothCommon.prototype.sendEvent = function (eventName, data, msg) {
        this.notify({
            eventName: eventName,
            object: this,
            data: data,
            message: msg
        });
    };
    BluetoothCommon.error_event = 'error_event';
    BluetoothCommon.peripheral_connected_event = 'peripheral_connected_event';
    BluetoothCommon.peripheral_disconnected_event = 'peripheral_disconnected_event';
    BluetoothCommon.peripheral_failed_to_connect_event = 'peripheral_failed_to_connect_event';
    BluetoothCommon.centralmanager_updated_state_event = 'centralmanager_updated_state_event';
    BluetoothCommon.centralmanager_restore_state_event = 'centralmanager_restore_state_event';
    BluetoothCommon.peripheralmanager_restore_state_event = 'peripheralmanager_restore_state_event';
    BluetoothCommon.peripheralmanager_update_state_event = 'peripheralmanager_update_state_event';
    BluetoothCommon.peripheralmanager_did_add_event = 'peripheralmanager_did_add_event';
    BluetoothCommon.peripheralmanager_subscribe_characteristic_event = 'peripheralmanager_subscribe_characteristic_event';
    BluetoothCommon.peripheralmanager_unsubscribe_characteristic_event = 'peripheralmanager_unsubscribe_characteristic_event';
    BluetoothCommon.peripheralmanager_ready_update_subscribers_event = 'peripheralmanager_ready_update_subscribers_event';
    BluetoothCommon.peripheralmanager_read_request_event = 'peripheralmanager_read_request_event';
    BluetoothCommon.peripheralmanager_write_request_event = 'peripheralmanager_write_request_event';
    BluetoothCommon.bluetooth_enabled_event = 'bluetooth_enabled_event';
    BluetoothCommon.bluetooth_discoverable_event = 'bluetooth_discoverable_event';
    BluetoothCommon.bluetooth_advertise_success_event = 'bluetooth_advertise_success_event';
    BluetoothCommon.bluetooth_advertise_failure_event = 'bluetooth_advertise_failure_event';
    BluetoothCommon.server_connection_state_changed_event = 'server_connection_state_changed_event';
    BluetoothCommon.bond_status_change_event = 'bond_status_change_event';
    BluetoothCommon.device_discovered_event = 'device_discovered_event';
    BluetoothCommon.device_name_change_event = 'device_name_change_event';
    BluetoothCommon.device_uuid_change_event = 'device_uuid_change_event';
    BluetoothCommon.device_acl_disconnected_event = 'device_acl_disconnected_event';
    BluetoothCommon.characteristic_write_request_event = 'characteristic_write_request_event';
    BluetoothCommon.characteristic_read_request_event = 'characteristic_read_request_event';
    BluetoothCommon.descriptor_write_request_event = 'descriptor_write_request_event';
    BluetoothCommon.descriptor_read_request_event = 'descriptor_read_request_event';
    BluetoothCommon.execute_write_event = 'execute_write_event';
    BluetoothCommon.notification_sent_event = 'notification_sent_event';
    return BluetoothCommon;
}(observable_1.Observable));
exports.BluetoothCommon = BluetoothCommon;
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["connected"] = 0] = "connected";
    ConnectionState[ConnectionState["disconnected"] = 1] = "disconnected";
})(ConnectionState = exports.ConnectionState || (exports.ConnectionState = {}));
var BondState;
(function (BondState) {
    BondState[BondState["none"] = 0] = "none";
    BondState[BondState["bonding"] = 1] = "bonding";
    BondState[BondState["bonded"] = 2] = "bonded";
    BondState[BondState["failed"] = 3] = "failed";
})(BondState = exports.BondState || (exports.BondState = {}));
var CharacteristicProperties;
(function (CharacteristicProperties) {
    CharacteristicProperties[CharacteristicProperties["WRITE"] = 0] = "WRITE";
    CharacteristicProperties[CharacteristicProperties["READ"] = 1] = "READ";
    CharacteristicProperties[CharacteristicProperties["NOTIFY"] = 2] = "NOTIFY";
    CharacteristicProperties[CharacteristicProperties["WRITE_NO_RESPONSE"] = 3] = "WRITE_NO_RESPONSE";
})(CharacteristicProperties = exports.CharacteristicProperties || (exports.CharacteristicProperties = {}));
var IBluetoothEvents;
(function (IBluetoothEvents) {
    IBluetoothEvents["error_event"] = "error_event";
    IBluetoothEvents["bluetooth_enabled_event"] = "bluetooth_enabled_event";
    IBluetoothEvents["peripheral_connected_event"] = "peripheral_connected_event";
    IBluetoothEvents["peripheral_disconnected_event"] = "peripheral_disconnected_event";
    IBluetoothEvents["peripheral_failed_to_connect_event"] = "peripheral_failed_to_connect_event";
    IBluetoothEvents["centralmanager_updated_state_event"] = "centralmanager_updated_state_event";
    IBluetoothEvents["centralmanager_restore_state_event"] = "centralmanager_restore_state_event";
    IBluetoothEvents["peripheralmanager_restore_state_event"] = "peripheralmanager_restore_state_event";
    IBluetoothEvents["peripheralmanager_update_state_event"] = "peripheralmanager_update_state_event";
    IBluetoothEvents["peripheralmanager_did_add_event"] = "peripheralmanager_did_add_event";
    IBluetoothEvents["peripheralmanager_subscribe_characteristic_event"] = "peripheralmanager_subscribe_characteristic_event";
    IBluetoothEvents["peripheralmanager_unsubscribe_characteristic_event"] = "peripheralmanager_unsubscribe_characteristic_event";
    IBluetoothEvents["peripheralmanager_ready_update_subscribers_event"] = "peripheralmanager_ready_update_subscribers_event";
    IBluetoothEvents["peripheralmanager_read_request_event"] = "peripheralmanager_read_request_event";
    IBluetoothEvents["peripheralmanager_write_request_event"] = "peripheralmanager_write_request_event";
    IBluetoothEvents["bluetooth_advertise_success_event"] = "bluetooth_advertise_success_event";
    IBluetoothEvents["bluetooth_advertise_failure_event"] = "bluetooth_advertise_failure_event";
    IBluetoothEvents["server_connection_state_changed_event"] = "server_connection_state_changed_event";
    IBluetoothEvents["bond_status_change_event"] = "bond_status_change_event";
    IBluetoothEvents["device_discovered_event"] = "device_discovered_event";
    IBluetoothEvents["device_name_change_event"] = "device_name_change_event";
    IBluetoothEvents["device_uuid_change_event"] = "device_uuid_change_event";
    IBluetoothEvents["device_acl_disconnected_event"] = "device_acl_disconnected_event";
    IBluetoothEvents["characteristic_write_request_event"] = "characteristic_write_request_event";
    IBluetoothEvents["characteristic_read_request_event"] = "characteristic_read_request_event";
    IBluetoothEvents["descriptor_write_request_event"] = "descriptor_write_request_event";
    IBluetoothEvents["descriptor_read_request_event"] = "descriptor_read_request_event";
    IBluetoothEvents["execute_write_event"] = "execute_write_event";
    IBluetoothEvents["notification_sent_event"] = "notification_sent_event";
})(IBluetoothEvents = exports.IBluetoothEvents || (exports.IBluetoothEvents = {}));
