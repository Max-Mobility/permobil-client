"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var ios_main_1 = require("./ios_main");
var CBPeripheralManagerDelegateImpl = (function (_super) {
    __extends(CBPeripheralManagerDelegateImpl, _super);
    function CBPeripheralManagerDelegateImpl() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._isConnected = false;
        _this._otaInProgress = false;
        _this._subscribedCharacteristics = new Set();
        _this._forceUpdate = false;
        _this._isWakeSupportCheck = false;
        _this._bandSupportsWake = false;
        _this._isSendingTime = false;
        return _this;
    }
    CBPeripheralManagerDelegateImpl.new = function () {
        return _super.new.call(this);
    };
    CBPeripheralManagerDelegateImpl.prototype.initWithOwner = function (owner) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralManagerDelegateImpl.initWithCallback ---- this._owner: " + this._owner);
        return this;
    };
    CBPeripheralManagerDelegateImpl.prototype.initWithCallback = function (owner, callback) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralManagerDelegateImpl.initWithCallback ---- this._owner: " + this._owner);
        return this;
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerDidUpdateState = function (mgr) {
        common_1.CLog(common_1.CLogTypes.info, 'peripheralManagerDidUpdateState');
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        this._lastObservedPeripheralState = mgr.state;
        var state = owner._getManagerStateString(mgr.state);
        common_1.CLog(common_1.CLogTypes.info, "current peripheral manager state = " + state);
        owner.sendEvent(ios_main_1.Bluetooth.peripheralmanager_update_state_event, {
            manager: mgr,
            state: state
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerWillRestoreState = function (peripheral, dict) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerWillRestoreState ---- ', dict);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        owner.sendEvent(ios_main_1.Bluetooth.peripheralmanager_restore_state_event, {
            manager: peripheral,
            dict: dict
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerDidAddError = function (peripheral, service, error) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerDidAddError ---- ', error);
        alert('Peripheral Manager Did Add Error');
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        owner.sendEvent(ios_main_1.Bluetooth.peripheralmanager_did_add_event, {
            manager: peripheral,
            service: service,
            error: error
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerDidStartAdvertisingError = function (peripheralMgr, error) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerDidStartAdvertisingError ----', error);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        if (error) {
            common_1.CLog(common_1.CLogTypes.warning, 'TODO: we may need to parse out the error value here for parity with Android.');
            this._owner.get().sendEvent(ios_main_1.Bluetooth.bluetooth_advertise_failure_event, {
                error: error
            });
            return;
        }
        this._owner.get().sendEvent(ios_main_1.Bluetooth.bluetooth_advertise_success_event);
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerCentralDidSubscribeToCharacteristic = function (peripheral, central, characteristic) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerCentralDidSubscribeToCharacteristic ----', characteristic);
        var isNewCentral = false;
        var oldCentral = this._central;
        if (!oldCentral || !oldCentral.identifier) {
        }
        if (oldCentral && oldCentral.identifier && oldCentral === this._central) {
            if (oldCentral.identifier !== central.identifier) {
                isNewCentral = true;
            }
            else if (oldCentral !== central) {
                isNewCentral = true;
            }
        }
        else {
            isNewCentral = true;
        }
        if (isNewCentral) {
            this._central = central;
            this._subscribedCharacteristics = new Set();
        }
        peripheral.setDesiredConnectionLatencyForCentral(0, central);
        this._isConnected = true;
        this._subscribedCharacteristics.add(characteristic.UUID);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var connection_state = common_1.ConnectionState.connected;
        var dev = ios_main_1.deviceToCentral(central);
        dev.UUIDs = ['1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0'.toUpperCase()];
        owner.sendEvent(ios_main_1.Bluetooth.server_connection_state_changed_event, {
            device: dev,
            manager: peripheral,
            central: central,
            connection_state: connection_state
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerCentralDidUnsubscribeFromCharacteristic = function (peripheral, central, characteristic) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerCentralDidUnsubscribeFromCharacteristic ----', central, characteristic);
        this._subscribedCharacteristics.delete(characteristic.UUID);
        if (this._subscribedCharacteristics.size <= 0) {
            this._isConnected = false;
        }
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var connection_state = common_1.ConnectionState.disconnected;
        var dev = ios_main_1.deviceToCentral(central);
        dev.UUIDs = ['1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0'.toUpperCase()];
        owner.sendEvent(ios_main_1.Bluetooth.server_connection_state_changed_event, {
            device: dev,
            manager: peripheral,
            central: central,
            connection_state: connection_state
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerDidAddServiceError = function (peripheral, service, error) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerDidAddServiceError ----', peripheral, service, "error: " + error);
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerIsReadyToUpdateSubscribers = function (peripheral) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerIsReadyToUpdateSubscribers ----', peripheral);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        owner.sendEvent(ios_main_1.Bluetooth.peripheralmanager_ready_update_subscribers_event, {
            manager: peripheral
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerDidReceiveReadRequest = function (peripheral, request) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerDidReceiveReadRequest ----', peripheral, request);
        peripheral.setDesiredConnectionLatencyForCentral(0, request.central);
        peripheral.respondToRequestWithResult(request, 0);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        owner.sendEvent(ios_main_1.Bluetooth.peripheralmanager_read_request_event, {
            manager: peripheral,
            request: request
        });
    };
    CBPeripheralManagerDelegateImpl.prototype.peripheralManagerDidReceiveWriteRequests = function (peripheral, requests) {
        common_1.CLog(common_1.CLogTypes.info, 'CBPeripheralManagerDelegateImpl.peripheralManagerDidReceiveWriteRequests ----', peripheral, requests);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        owner.sendEvent(ios_main_1.Bluetooth.peripheralmanager_write_request_event, {
            manager: peripheral,
            requests: requests
        });
        peripheral.respondToRequestWithResult(requests.objectAtIndex(0), 0);
        for (var i = 0; i < requests.count; i++) {
            var r = requests.objectAtIndex(i);
            var dev = ios_main_1.deviceToCentral(r.central);
            owner.sendEvent(ios_main_1.Bluetooth.characteristic_write_request_event, {
                device: dev,
                manager: peripheral,
                requestId: i,
                characteristic: r.characteristic,
                preparedWrite: null,
                responseNeeded: false,
                offset: r.offset,
                value: r.value
            });
        }
    };
    CBPeripheralManagerDelegateImpl.ObjCProtocols = [CBPeripheralManagerDelegate];
    return CBPeripheralManagerDelegateImpl;
}(NSObject));
exports.CBPeripheralManagerDelegateImpl = CBPeripheralManagerDelegateImpl;
