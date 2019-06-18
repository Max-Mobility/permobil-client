"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var CBPeripheralDelegateImpl_1 = require("./CBPeripheralDelegateImpl");
var ios_main_1 = require("./ios_main");
var CBCentralManagerDelegateImpl = (function (_super) {
    __extends(CBCentralManagerDelegateImpl, _super);
    function CBCentralManagerDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CBCentralManagerDelegateImpl.new = function () {
        return _super.new.call(this);
    };
    CBCentralManagerDelegateImpl.prototype.initWithOwner = function (owner) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegateImpl.initWithOwner ---- this._owner: " + this._owner);
        return this;
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheral = function (central, peripheral) {
        common_1.CLog(common_1.CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: " + peripheral);
        var peri = this._owner
            .get()
            .findPeripheral(peripheral.identifier.UUIDString);
        common_1.CLog(common_1.CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: cached perio: " + peri);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var cb = owner._connectCallbacks[peripheral.identifier.UUIDString];
        var delegate = CBPeripheralDelegateImpl_1.CBPeripheralDelegateImpl.new().initWithCallback(this._owner, cb);
        CFRetain(delegate);
        peri.delegate = delegate;
        common_1.CLog(common_1.CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");
        peri.discoverServices(null);
        var eventData = {
            device: peripheral,
            UUID: peripheral.identifier.UUIDString,
            name: peripheral.name,
            RSSI: null,
            state: owner._getState(peripheral.state),
            manufacturerId: null,
            manufacturerData: null
        };
        owner.sendEvent('peripheral_connected_event', eventData);
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidDisconnectPeripheralError = function (central, peripheral, error) {
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var cb = owner._disconnectCallbacks[peripheral.identifier.UUIDString];
        if (cb) {
            cb({
                UUID: peripheral.identifier.UUIDString,
                name: peripheral.name
            });
        }
        else {
            common_1.CLog(common_1.CLogTypes.info, "***** centralManagerDidDisconnectPeripheralError() no disconnect callback found *****");
        }
        owner.removePeripheral(peripheral);
        var eventData = {
            device: peripheral,
            UUID: peripheral.identifier.UUIDString,
            name: peripheral.name,
            RSSI: null,
            state: owner._getState(peripheral.state),
            manufacturerId: null,
            manufacturerData: null,
            error: error
        };
        owner.sendEvent('peripheral_disconnected_event', eventData);
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidFailToConnectPeripheralError = function (central, peripheral, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----", central, peripheral, error);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var eventData = {
            device: peripheral,
            UUID: peripheral.identifier.UUIDString,
            name: peripheral.name,
            RSSI: null,
            state: owner._getState(peripheral.state),
            manufacturerId: null,
            manufacturerData: null,
            error: error
        };
        owner.sendEvent('peripheral_failed_to_connect_event', eventData);
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI = function (central, peripheral, advData, RSSI) {
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- " + peripheral.name + " @ " + RSSI);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var peri = owner.findPeripheral(peripheral.identifier.UUIDString);
        if (!peri) {
            owner.addPeripheral(peripheral);
            var manufacturerId = void 0;
            var manufacturerData = void 0;
            if (advData.objectForKey(CBAdvertisementDataManufacturerDataKey)) {
                var manufacturerIdBuffer = this._owner
                    .get()
                    .toArrayBuffer(advData
                    .objectForKey(CBAdvertisementDataManufacturerDataKey)
                    .subdataWithRange(NSMakeRange(0, 2)));
                manufacturerId = new DataView(manufacturerIdBuffer, 0).getUint16(0, true);
                manufacturerData = this._owner
                    .get()
                    .toArrayBuffer(advData
                    .objectForKey(CBAdvertisementDataManufacturerDataKey)
                    .subdataWithRange(NSMakeRange(2, advData.objectForKey(CBAdvertisementDataManufacturerDataKey)
                    .length - 2)));
            }
            var eventData = {
                device: peripheral,
                UUID: peripheral.identifier.UUIDString,
                name: peripheral.name,
                RSSI: RSSI,
                state: owner._getState(peripheral.state),
                manufacturerId: manufacturerId,
                manufacturerData: manufacturerData
            };
            owner.sendEvent(ios_main_1.Bluetooth.device_discovered_event, eventData);
            if (owner._onDiscovered) {
                owner._onDiscovered(eventData);
            }
            else {
                common_1.CLog(common_1.CLogTypes.warning, 'CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- No onDiscovered callback specified');
            }
        }
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidUpdateState = function (central) {
        if (central.state === 2) {
            common_1.CLog(common_1.CLogTypes.warning, "CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.");
        }
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        owner.sendEvent('centralmanager_updated_state_event', { manager: central });
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerWillRestoreState = function (central, dict) {
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegateImpl.centralManagerWillRestoreState ---- central: " + central + ", dict: " + dict);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var peripheralArray = dict.objectForKey(CBCentralManagerRestoredStatePeripheralsKey);
        common_1.CLog(common_1.CLogTypes.info, 'Restoring ', peripheralArray.count);
        for (var i = 0; i < peripheralArray.count; i++) {
            var peripheral = peripheralArray.objectAtIndex(i);
            owner.addPeripheral(peripheral);
            var eventData = {
                device: peripheral,
                UUID: peripheral.identifier.UUIDString,
                name: peripheral.name,
                RSSI: null,
                state: owner._getState(peripheral.state),
                manufacturerId: null,
                manufacturerData: null
            };
            owner.sendEvent(ios_main_1.Bluetooth.device_discovered_event, eventData);
            if (owner._onDiscovered) {
                owner._onDiscovered(eventData);
            }
        }
        owner.sendEvent('centralmanager_restore_state_event', {
            manager: central,
            dict: dict
        });
    };
    CBCentralManagerDelegateImpl.ObjCProtocols = [CBCentralManagerDelegate];
    return CBCentralManagerDelegateImpl;
}(NSObject));
exports.CBCentralManagerDelegateImpl = CBCentralManagerDelegateImpl;
