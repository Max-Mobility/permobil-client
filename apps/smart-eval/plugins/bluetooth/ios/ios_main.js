"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var CBCentralManagerDelegateImpl_1 = require("./CBCentralManagerDelegateImpl");
var CBPeripheralManagerDelegateImpl_1 = require("./CBPeripheralManagerDelegateImpl");
var singleton = null;
var peripheralArray = NSMutableArray.new();
function deviceToCentral(dev) {
    return {
        device: dev,
        UUIDs: [],
        address: dev.identifier.UUIDString,
        name: dev.name || 'PushTracker',
        RSSI: null,
        manufacturerId: null,
        manufacturerData: null
    };
}
exports.deviceToCentral = deviceToCentral;
function deviceToPeripheral(dev) {
    return {
        device: dev,
        UUID: dev.identifier.UUIDString,
        name: null,
        RSSI: null,
        services: null,
        manufacturerId: null,
        manufacturerData: null
    };
}
exports.deviceToPeripheral = deviceToPeripheral;
var common_2 = require("../common");
exports.BondState = common_2.BondState;
exports.ConnectionState = common_2.ConnectionState;
var Bluetooth = (function (_super) {
    __extends(Bluetooth, _super);
    function Bluetooth(options) {
        var _this = _super.call(this) || this;
        _this._centralDelegate = null;
        _this._centralPeripheralMgrDelegate = null;
        _this._centralManager = null;
        _this._peripheralManager = null;
        _this._connectCallbacks = {};
        _this._disconnectCallbacks = {};
        _this._onDiscovered = null;
        var weakref = new WeakRef(_this);
        if (singleton) {
            if (!options || options.singleton !== false) {
                var ref = singleton.get();
                if (ref) {
                    return ref;
                }
            }
        }
        else {
            singleton = weakref;
        }
        var centralKeys = [], centralValues = [];
        var peripheralKeys = [], peripheralValues = [];
        _this._centralPeripheralMgrDelegate = CBPeripheralManagerDelegateImpl_1.CBPeripheralManagerDelegateImpl.new().initWithOwner(weakref);
        _this._centralDelegate = CBCentralManagerDelegateImpl_1.CBCentralManagerDelegateImpl.new().initWithOwner(weakref);
        if (options) {
            if (options.centralPreservation) {
                centralValues.push(options.centralPreservation);
                centralKeys.push(CBCentralManagerOptionRestoreIdentifierKey);
            }
            if (options.peripheralPreservation) {
                peripheralValues.push(options.peripheralPreservation);
                peripheralKeys.push(CBPeripheralManagerOptionRestoreIdentifierKey);
            }
        }
        if (centralKeys.length > 0) {
            var _cmoptions = NSDictionary.dictionaryWithObjectsForKeys(centralValues, centralKeys);
            _this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(_this._centralDelegate, null, _cmoptions);
        }
        else {
            _this._centralManager = CBCentralManager.alloc().initWithDelegateQueue(_this._centralDelegate, null);
        }
        if (peripheralKeys.length > 0) {
            var _poptions = NSDictionary.dictionaryWithObjectsForKeys(peripheralValues, peripheralKeys);
            _this._peripheralManager = CBPeripheralManager.new().initWithDelegateQueueOptions(_this._centralPeripheralMgrDelegate, null, _poptions);
        }
        else {
            _this._peripheralManager = CBPeripheralManager.new().initWithDelegateQueue(_this._centralPeripheralMgrDelegate, null);
        }
        common_1.CLog(common_1.CLogTypes.info, '*** iOS Bluetooth Constructor ***');
        common_1.CLog(common_1.CLogTypes.info, "this._centralManager: " + _this._centralManager);
        common_1.CLog(common_1.CLogTypes.info, "this._peripheralManager: " + _this._peripheralManager);
        return _this;
    }
    Object.defineProperty(Bluetooth.prototype, "enabled", {
        get: function () {
            var state = this._centralManager.state;
            if (state === 5) {
                return true;
            }
            else {
                return false;
            }
        },
        enumerable: true,
        configurable: true
    });
    Bluetooth.prototype.removePeripheral = function (peripheral) {
        var foundAt = peripheralArray.indexOfObject(peripheral);
        peripheralArray.removeObject(foundAt);
    };
    Bluetooth.prototype.addPeripheral = function (peripheral) {
        peripheralArray.addObject(peripheral);
    };
    Bluetooth.prototype._getState = function (state) {
        if (state === 1) {
            return 'connecting';
        }
        else if (state === 2) {
            return 'connected';
        }
        else if (state === 0) {
            return 'disconnected';
        }
        else {
            common_1.CLog(common_1.CLogTypes.warning, "Bluetooth._getState ---- Unexpected state, returning 'disconnected' for state of " + state);
            return 'disconnected';
        }
    };
    Bluetooth.prototype.isBluetoothEnabled = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var isEnabled = _this._isEnabled();
                resolve(isEnabled);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.isBluetoothEnabled ---- " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.startScanning = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startScanning ---- Bluetooth is not enabled.");
                    reject('Bluetooth is not enabled.');
                    return;
                }
                _this._onDiscovered = arg.onDiscovered;
                var serviceUUIDs = arg.serviceUUIDs || [];
                var services = [];
                for (var s in serviceUUIDs) {
                    if (s) {
                        services.push(CBUUID.UUIDWithString(serviceUUIDs[s]));
                    }
                }
                peripheralArray.removeAllObjects();
                _this._centralManager.scanForPeripheralsWithServicesOptions(services, null);
                if (arg.seconds) {
                    setTimeout(function () {
                        _this._centralManager.stopScan();
                        resolve();
                    }, arg.seconds * 1000);
                }
                else {
                    resolve();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startScanning ---- " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.toArrayBuffer = function (value) {
        if (value === null) {
            return null;
        }
        var b = value.base64EncodedStringWithOptions(0);
        return this.base64ToArrayBuffer(b);
    };
    Bluetooth.prototype.removeBond = function (device) {
    };
    Bluetooth.prototype.fetchUuidsWithSdp = function (device) {
    };
    Bluetooth.prototype.stopGattServer = function () {
        return;
    };
    Bluetooth.prototype.startGattServer = function () {
        return;
    };
    Bluetooth.prototype.setDiscoverable = function () {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    };
    Bluetooth.prototype.getAdvertiser = function () {
        return null;
    };
    Bluetooth.prototype.makeService = function (opts) {
        var primary = opts && opts.primary === true ? true : false;
        var uuid = CBUUID.UUIDWithString(opts.UUID);
        var service = CBMutableService.alloc().initWithTypePrimary(uuid, primary);
        return service;
    };
    Bluetooth.prototype.makeCharacteristic = function (opts) {
        var uuid = CBUUID.UUIDWithString(opts.UUID);
        var props = (opts && opts.properties) ||
            2 |
                8 |
                16;
        var permissions = (opts && opts.permissions) ||
            2 | 1;
        var characteristic = CBMutableCharacteristic.alloc().initWithTypePropertiesValuePermissions(uuid, props, null, permissions);
        return characteristic;
    };
    Bluetooth.prototype.makeDescriptor = function (options) {
        var uuid = this._stringToUuid(options.UUID);
        var descriptor = CBMutableDescriptor.alloc().init();
        var d = CBDescriptor.alloc().init();
        return null;
    };
    Bluetooth.prototype.addService = function (service) {
        if (service && this._peripheralManager) {
            this._peripheralManager.addService(service);
        }
    };
    Bluetooth.prototype.getServerService = function (uuidString) {
        return null;
    };
    Bluetooth.prototype.offersService = function (uuidString) {
        return this.getServerService(uuidString) !== null;
    };
    Bluetooth.prototype.clearServices = function () {
        this._peripheralManager.removeAllServices();
    };
    Bluetooth.prototype.cancelServerConnection = function (device) {
    };
    Bluetooth.prototype.notifyCentrals = function (value, characteristic, centrals) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var resendTimeoutID = null;
            var readyToUpdate = null;
            var timeoutID = null;
            var didUpdate = false;
            var sendUpdate = function () {
                _this.on(Bluetooth.peripheralmanager_ready_update_subscribers_event, readyToUpdate);
                didUpdate = _this._peripheralManager.updateValueForCharacteristicOnSubscribedCentrals(value, characteristic, centrals);
                if (didUpdate) {
                    if (timeoutID) {
                        clearTimeout(timeoutID);
                    }
                    _this.off(Bluetooth.peripheralmanager_ready_update_subscribers_event);
                    resolve(true);
                }
            };
            readyToUpdate = function (args) {
                _this.off(Bluetooth.peripheralmanager_ready_update_subscribers_event, readyToUpdate);
                if (resendTimeoutID) {
                    clearTimeout(resendTimeoutID);
                }
                resendTimeoutID = setTimeout(sendUpdate, 10);
            };
            timeoutID = setTimeout(function () {
                _this.off(Bluetooth.peripheralmanager_ready_update_subscribers_event, readyToUpdate);
                if (resendTimeoutID) {
                    clearTimeout(resendTimeoutID);
                }
                reject('Notify Timeout!');
            }, 1000);
            sendUpdate();
        });
    };
    Bluetooth.prototype.getConnectedDevices = function () {
        return peripheralArray;
    };
    Bluetooth.prototype.getServerConnectedDevices = function () {
        if (peripheralArray) {
            return peripheralArray;
        }
    };
    Bluetooth.prototype.getServerConnectedDeviceState = function (device) {
    };
    Bluetooth.prototype.getServerConnectedDevicesMatchingState = function (state) {
    };
    Bluetooth.prototype.startAdvertising = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._peripheralManager) {
                    reject('Bluetooth not properly initialized!');
                    return;
                }
                if (_this._peripheralManager.isAdvertising) {
                    _this._peripheralManager.stopAdvertising();
                }
                var uuid = CBUUID.UUIDWithString(args.UUID);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startAdvertising ---- creating advertisement");
                var advertisement_1 = NSDictionary.dictionaryWithObjectsForKeys([[uuid], 'data_service'], [CBAdvertisementDataServiceUUIDsKey, CBAdvertisementDataLocalNameKey]);
                common_1.CLog(common_1.CLogTypes.info, "peripheral manager state " + _this._getManagerStateString(_this._peripheralManager.state));
                setTimeout(function () {
                    _this._peripheralManager.startAdvertising(advertisement_1);
                    common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.startAdvertising ---- started advertising');
                    resolve();
                }, 750);
            }
            catch (error) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startAdvertising ---- " + error);
                reject(error);
            }
        });
    };
    Bluetooth.prototype.stopAdvertising = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this._peripheralManager) {
                reject('Bluetooth not properly initialized.');
                return;
            }
            if (_this._peripheralManager.isAdvertising) {
                common_1.CLog(common_1.CLogTypes.info, 'Peripheral manager is advertising.');
                _this._peripheralManager.stopAdvertising();
            }
            resolve();
        });
    };
    Bluetooth.prototype.isPeripheralModeSupported = function () {
        return new Promise(function (resolve, reject) {
            try {
                var newPM = CBPeripheralManager.new().initWithDelegateQueue(null, null);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.isPeripheralModeSupported ---- new CBPeripheralManager " + newPM);
                if (!newPM) {
                    reject(false);
                }
                else {
                    resolve(true);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    };
    Bluetooth.prototype.enable = function () {
        return new Promise(function (resolve, reject) {
            common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.enable ---- Not possible on iOS');
            reject('Not possible - you may want to choose to not call this function on iOS.');
        });
    };
    Bluetooth.prototype.disable = function () {
        return new Promise(function (resolve, reject) {
            common_1.CLog(common_1.CLogTypes.info, 'Disabling bluetooth on iOS is not possible via the public CoreBluetooth API.');
            resolve();
        });
    };
    Bluetooth.prototype.stopScanning = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                _this._centralManager.stopScan();
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopScanning ---- " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.connect = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                if (!args.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- " + args.UUID);
                var peripheral = _this.findPeripheral(args.UUID);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- peripheral found: " + peripheral);
                if (!peripheral) {
                    reject("Could not find peripheral with UUID: " + args.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- Connecting to peripheral with UUID: " + args.UUID);
                    _this._connectCallbacks[args.UUID] = args.onConnected;
                    _this._disconnectCallbacks[args.UUID] = args.onDisconnected;
                    _this._centralManager.connectPeripheralOptions(peripheral, null);
                    resolve();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.connect ---- " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.disconnect = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var peripheral = _this.findPeripheral(arg.UUID);
                if (!peripheral) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.disconnect ---- Disconnecting peripheral with UUID " + arg.UUID);
                    if (peripheral.state !== 0) {
                        _this._centralManager.cancelPeripheralConnection(peripheral);
                        peripheral.delegate = null;
                    }
                    resolve();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.disconnect ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.isConnected = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var peripheral = _this.findPeripheral(arg.UUID);
                if (peripheral === null) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.isConnected ---- checking connection with peripheral UUID: " + arg.UUID);
                    resolve(peripheral.state === 2);
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.isConnected ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.findPeripheral = function (UUID) {
        for (var i = 0; i < peripheralArray.count; i++) {
            var peripheral = peripheralArray.objectAtIndex(i);
            if (UUID === peripheral.identifier.UUIDString) {
                return peripheral;
            }
        }
        return null;
    };
    Bluetooth.prototype.read = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(arg, 2, reject);
                if (!wrapper) {
                    return;
                }
                wrapper.peripheral
                    .delegate._onReadPromise = resolve;
                wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.read ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.write = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property.");
                    return;
                }
                var wrapper = _this._getWrapper(arg, 8, reject);
                if (!wrapper) {
                    return;
                }
                var valueEncoded = _this._encodeValue(arg.value);
                if (valueEncoded === null) {
                    reject('Invalid value: ' + arg.value);
                    return;
                }
                wrapper.peripheral
                    .delegate._onWritePromise = resolve;
                wrapper.peripheral
                    .delegate._onWriteReject = reject;
                wrapper.peripheral
                    .delegate._onWriteTimeout = setTimeout(function () {
                    reject('Write timed out!');
                }, 10000);
                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, 0);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.write ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.writeWithoutResponse = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property");
                    return;
                }
                var wrapper = _this._getWrapper(arg, 4, reject);
                if (!wrapper) {
                    return;
                }
                var valueEncoded = _this._encodeValue(arg.value);
                common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.writeWithoutResponse ---- Attempting to write (encoded): ' +
                    valueEncoded);
                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, 1);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.writeWithoutResponse ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.startNotifying = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(args, 16, reject);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- wrapper: " + wrapper);
                if (!wrapper) {
                    return;
                }
                var cb = args.onNotify ||
                    function (result) {
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- No 'onNotify' callback function specified for 'startNotifying()'");
                    };
                wrapper.peripheral
                    .delegate._onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startNotifying ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.stopNotifying = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(args, 16, reject);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.stopNotifying ---- wrapper: " + wrapper);
                if (wrapper === null) {
                    return;
                }
                var peripheral = _this.findPeripheral(args.peripheralUUID);
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopNotifying ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype._mapCharacteristicProps = function (props) {
        var result = null;
        if (props) {
            props.forEach(function (v) {
                if (v === 0) {
                    props += 8;
                }
                if (v === 1) {
                    props += 2;
                }
                if (v === 2) {
                    props += 16;
                }
            });
        }
    };
    Bluetooth.prototype._isEnabled = function () {
        var state = this._centralManager.state;
        common_1.CLog(common_1.CLogTypes.info, "Bluetooth._isEnabled ---- this._centralManager.state: " + this._centralManager.state);
        return state === 5;
    };
    Bluetooth.prototype._stringToUuid = function (uuidStr) {
        if (uuidStr.length === 4) {
            uuidStr = "0000" + uuidStr + "-0000-1000-8000-00805f9b34fb";
        }
        return CFUUIDCreateFromString(null, uuidStr);
    };
    Bluetooth.prototype._findService = function (UUID, peripheral) {
        for (var i = 0; i < peripheral.services.count; i++) {
            var service = peripheral.services.objectAtIndex(i);
            if (UUID.UUIDString === service.UUID.UUIDString) {
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth._findService ---- found service with UUID:  " + service.UUID);
                return service;
            }
        }
        return null;
    };
    Bluetooth.prototype._findCharacteristic = function (UUID, service, property) {
        common_1.CLog(common_1.CLogTypes.info, "Bluetooth._findCharacteristic ---- UUID: " + UUID + ", service: " + service + ", characteristics: " + service.characteristics);
        for (var i = 0; i < service.characteristics.count; i++) {
            var characteristic = service.characteristics.objectAtIndex(i);
            if (UUID.UUIDString === characteristic.UUID.UUIDString) {
                if (property && characteristic.properties) {
                    if (property === property) {
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth._findCharacteristic ---- characteristic.found: " + characteristic.UUID);
                        return characteristic;
                    }
                }
                else {
                    return characteristic;
                }
            }
        }
        common_1.CLog(common_1.CLogTypes.warning, 'Bluetooth._findCharacteristic ---- characteristic NOT found');
        return null;
    };
    Bluetooth.prototype._getWrapper = function (arg, property, reject) {
        if (!this._isEnabled()) {
            reject('Bluetooth is not enabled');
            return;
        }
        if (!arg.peripheralUUID) {
            reject('No peripheralUUID was passed');
            return null;
        }
        if (!arg.serviceUUID) {
            reject('No serviceUUID was passed');
            return null;
        }
        if (!arg.characteristicUUID) {
            reject('No characteristicUUID was passed');
            return null;
        }
        var peripheral = this.findPeripheral(arg.peripheralUUID);
        if (!peripheral) {
            reject('Could not find peripheral with UUID ' + arg.peripheralUUID);
            return null;
        }
        if (peripheral.state !== 2) {
            reject('The peripheral is disconnected');
            return null;
        }
        var serviceUUID = CBUUID.UUIDWithString(arg.serviceUUID);
        var service = this._findService(serviceUUID, peripheral);
        if (!service) {
            reject("Could not find service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        var characteristicUUID = CBUUID.UUIDWithString(arg.characteristicUUID);
        var characteristic = this._findCharacteristic(characteristicUUID, service, property);
        if (property === 16 &&
            !characteristic) {
            characteristic = this._findCharacteristic(characteristicUUID, service, 32);
        }
        if (!characteristic) {
            characteristic = this._findCharacteristic(characteristicUUID, service, null);
        }
        if (!characteristic) {
            reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        return {
            peripheral: peripheral,
            service: service,
            characteristic: characteristic
        };
    };
    Bluetooth.prototype._encodeValue = function (value) {
        if (typeof value !== 'string') {
            return value.buffer;
        }
        var parts = value.split(',');
        if (parts[0].indexOf('x') === -1) {
            return null;
        }
        var result;
        if (parts[0].length === 4) {
            result = new Uint8Array(parts.length);
        }
        else {
            result = new Uint16Array(parts.length);
        }
        for (var i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result.buffer;
    };
    Bluetooth.prototype._getManagerStateString = function (state) {
        var result;
        switch (state) {
            case 0:
                result = 'unknown';
                break;
            case 5:
                result = 'on';
                break;
            case 4:
                result = 'off';
                break;
            case 1:
                result = 'resetting';
                break;
            case 3:
                result = 'resetting';
                break;
            case 2:
                result = 'resetting';
                break;
            default:
                result = 'WTF state is the manager?!?';
        }
        return result;
    };
    return Bluetooth;
}(common_1.BluetoothCommon));
exports.Bluetooth = Bluetooth;
