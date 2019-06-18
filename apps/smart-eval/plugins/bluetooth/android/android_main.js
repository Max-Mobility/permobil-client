"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var application = require("tns-core-modules/application");
var utils = require("tns-core-modules/utils/utils");
var common_1 = require("../common");
var TNS_AdvertiseCallback_1 = require("./TNS_AdvertiseCallback");
var TNS_BluetoothGattCallback_1 = require("./TNS_BluetoothGattCallback");
var TNS_BluetoothGattServerCallback_1 = require("./TNS_BluetoothGattServerCallback");
var TNS_BroadcastReceiver_1 = require("./TNS_BroadcastReceiver");
var TNS_LeScanCallback_1 = require("./TNS_LeScanCallback");
var TNS_ScanCallback_1 = require("./TNS_ScanCallback");
var ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;
var ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
var ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE = 224;
function deviceToCentral(dev) {
    var uuids = [];
    var us = dev.getUuids();
    if (us) {
        for (var i = 0; i < us.length; i++) {
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
exports.deviceToCentral = deviceToCentral;
function deviceToPeripheral(dev) {
    var uuid = dev.getUuids()[0].toString();
    return {
        device: dev,
        UUID: uuid,
        name: dev.getName(),
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
    function Bluetooth() {
        var _this = _super.call(this) || this;
        _this.bluetoothManager = utils.ad
            .getApplicationContext()
            .getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        _this.adapter = _this.bluetoothManager.getAdapter();
        _this.bluetoothGattServerCallback = new TNS_BluetoothGattServerCallback_1.TNS_BluetoothGattServerCallback();
        _this.bluetoothGattCallback = new TNS_BluetoothGattCallback_1.TNS_BluetoothGattCallback();
        _this.advertiseCallback = new TNS_AdvertiseCallback_1.TNS_AdvertiseCallback();
        _this.connections = {};
        common_1.CLog(common_1.CLogTypes.info, '*** Android Bluetooth Constructor ***');
        common_1.CLog(common_1.CLogTypes.info, 'this.bluetoothManager', _this.bluetoothManager);
        common_1.CLog(common_1.CLogTypes.info, 'this.adapter', _this.adapter);
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            _this.scanCallback = new TNS_ScanCallback_1.TNS_ScanCallback();
            _this.scanCallback.onInit(new WeakRef(_this));
            _this.bluetoothGattServerCallback.onInit(new WeakRef(_this));
            _this.advertiseCallback.onInit(new WeakRef(_this));
            _this.broadcastReceiver = new TNS_BroadcastReceiver_1.TNS_BroadcastReceiver();
            _this.broadcastReceiver.onInit(new WeakRef(_this));
            var deviceChangeIntent = new android.content.IntentFilter();
            deviceChangeIntent.addAction(android.bluetooth.BluetoothDevice.ACTION_BOND_STATE_CHANGED);
            deviceChangeIntent.addAction(android.bluetooth.BluetoothDevice.ACTION_NAME_CHANGED);
            deviceChangeIntent.addAction(android.bluetooth.BluetoothDevice.ACTION_UUID);
            deviceChangeIntent.addAction(android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED);
            utils.ad
                .getApplicationContext()
                .registerReceiver(_this.broadcastReceiver, deviceChangeIntent);
        }
        else {
            _this.LeScanCallback = new TNS_LeScanCallback_1.TNS_LeScanCallback();
            _this.LeScanCallback.onInit(new WeakRef(_this));
        }
        _this.bluetoothGattCallback.onInit(new WeakRef(_this));
        return _this;
    }
    Object.defineProperty(Bluetooth.prototype, "enabled", {
        get: function () {
            if (this.adapter !== null && this.adapter.isEnabled()) {
                return true;
            }
            else {
                return false;
            }
        },
        enumerable: true,
        configurable: true
    });
    Bluetooth.prototype.coarseLocationPermissionGranted = function () {
        var hasPermission = android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M;
        if (!hasPermission) {
            var ctx = this._getContext();
            common_1.CLog(common_1.CLogTypes.info, "app context " + ctx);
            hasPermission =
                android.content.pm.PackageManager.PERMISSION_GRANTED ===
                    android.support.v4.content.ContextCompat.checkSelfPermission(ctx, android.Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.coarseLocationPermissionGranted ---- ACCESS_COARSE_LOCATION permission granted?', hasPermission);
        return hasPermission;
    };
    Bluetooth.prototype.requestCoarseLocationPermission = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, function (args) {
                for (var i = 0; i < args.permissions.length; i++) {
                    if (args.grantResults[i] ===
                        android.content.pm.PackageManager.PERMISSION_DENIED) {
                        reject('Permission denied');
                        return;
                    }
                }
                resolve();
            });
            var activity = _this._getActivity();
            android.support.v4.app.ActivityCompat.requestPermissions(activity, [android.Manifest.permission.ACCESS_COARSE_LOCATION], ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE);
        });
    };
    Bluetooth.prototype.enable = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var onBluetoothEnableResult_1 = function (args) {
                    common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.onBluetoothEnableResult ---', "requestCode: " + args.requestCode + ", result: " + args.resultCode);
                    if (args.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE) {
                        try {
                            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                            if (args.resultCode === android.app.Activity.RESULT_OK) {
                                _this.sendEvent(Bluetooth.bluetooth_enabled_event);
                                resolve(true);
                            }
                            else {
                                resolve(false);
                            }
                        }
                        catch (ex) {
                            common_1.CLog(common_1.CLogTypes.error, ex);
                            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                            _this.sendEvent(Bluetooth.error_event, { error: ex }, "Bluetooth.enable ---- error: " + ex);
                            reject(ex);
                            return;
                        }
                    }
                    else {
                        application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                        resolve(false);
                        return;
                    }
                };
                application.android.on(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                var intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
                var activity = application.android.foregroundActivity ||
                    application.android.startActivity;
                activity.startActivityForResult(intent, ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.enable: " + ex);
                reject(ex);
                _this.sendEvent(Bluetooth.error_event, { error: ex }, 'Error enabling bluetooth.');
            }
        });
    };
    Bluetooth.prototype.disable = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.adapter.disable();
            resolve();
        });
    };
    Bluetooth.prototype.isBluetoothEnabled = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                resolve(_this._isEnabled());
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.isBluetoothEnabled: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.startScanning = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                var onPermissionGranted = function () {
                    _this.connections = {};
                    var serviceUUIDs = arg.serviceUUIDs || [];
                    var uuids = [];
                    for (var s in serviceUUIDs) {
                        if (s) {
                            uuids.push(_this.stringToUuid(serviceUUIDs[s]));
                        }
                    }
                    if (android.os.Build.VERSION.SDK_INT <
                        android.os.Build.VERSION_CODES.LOLLIPOP) {
                        var didStart = uuids.length === 0
                            ? _this.adapter.startLeScan(_this.LeScanCallback)
                            : _this.adapter.startLeScan(uuids, _this.LeScanCallback);
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startScanning ---- didStart scanning: " + didStart);
                        if (!didStart) {
                            reject("Scanning didn't start");
                            return;
                        }
                    }
                    else {
                        var scanFilters = null;
                        if (uuids.length > 0) {
                            scanFilters = new java.util.ArrayList();
                            for (var u in uuids) {
                                if (u) {
                                    var theUuid = uuids[u];
                                    var scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
                                    scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(theUuid));
                                    scanFilters.add(scanFilterBuilder.build());
                                }
                            }
                        }
                        var scanSettings = new android.bluetooth.le.ScanSettings.Builder();
                        scanSettings.setReportDelay(0);
                        var scanMode = (arg.android && arg.android.scanMode) ||
                            android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY;
                        scanSettings.setScanMode(scanMode);
                        if (android.os.Build.VERSION.SDK_INT >=
                            android.os.Build.VERSION_CODES.M) {
                            var matchMode = (arg.android && arg.android.matchMode) ||
                                android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
                            scanSettings.setMatchMode(matchMode);
                            var matchNum = (arg.android && arg.android.matchNum) ||
                                android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
                            scanSettings.setNumOfMatches(matchNum);
                            var callbackType = (arg.android && arg.android.callbackType) ||
                                android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
                            scanSettings.setCallbackType(callbackType);
                        }
                        _this.adapter
                            .getBluetoothLeScanner()
                            .startScan(scanFilters, scanSettings.build(), _this.scanCallback);
                    }
                    if (arg.seconds) {
                        setTimeout(function () {
                            if (android.os.Build.VERSION.SDK_INT <
                                android.os.Build.VERSION_CODES.LOLLIPOP) {
                                _this.adapter.stopLeScan(_this.LeScanCallback);
                            }
                            else {
                                _this.adapter
                                    .getBluetoothLeScanner()
                                    .stopScan(_this.scanCallback);
                            }
                            resolve();
                        }, arg.seconds * 1000);
                    }
                    else {
                        resolve();
                    }
                };
                if (arg.skipPermissionCheck !== true &&
                    !_this.coarseLocationPermissionGranted()) {
                    common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.startScanning ---- Coarse Location Permission not granted on Android device, will request permission.');
                    _this.requestCoarseLocationPermission().then(function () {
                        _this.startScanning(arg);
                    });
                }
                else {
                    onPermissionGranted();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startScanning ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.stopScanning = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (android.os.Build.VERSION.SDK_INT <
                    android.os.Build.VERSION_CODES.LOLLIPOP) {
                    _this.adapter.stopLeScan(_this.LeScanCallback);
                }
                else {
                    _this.adapter.getBluetoothLeScanner().stopScan(_this.scanCallback);
                }
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopScanning: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.connect = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var bluetoothDevice = _this.adapter.getRemoteDevice(arg.UUID);
                if (bluetoothDevice === null) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- Connecting to peripheral with UUID: " + arg.UUID);
                    var gatt = void 0;
                    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M) {
                        gatt = bluetoothDevice.connectGatt(utils.ad.getApplicationContext(), false, _this.bluetoothGattCallback);
                    }
                    else {
                        gatt = bluetoothDevice.connectGatt(utils.ad.getApplicationContext(), false, _this.bluetoothGattCallback, android.bluetooth.BluetoothDevice.TRANSPORT_LE);
                    }
                    _this.connections[arg.UUID] = {
                        state: 'connecting',
                        onConnected: arg.onConnected,
                        onDisconnected: arg.onDisconnected,
                        device: gatt
                    };
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.connect ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.disconnect = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var connection = _this.connections[arg.UUID];
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.disconnect ---- connection: " + connection);
                if (!connection) {
                    reject("Peripheral wasn't connected");
                    return;
                }
                _this.gattDisconnect(connection.device);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.disconnect ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.read = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(arg, reject);
                if (!wrapper) {
                    return;
                }
                var gatt = wrapper.gatt;
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- gatt: " + gatt);
                var bluetoothGattService = wrapper.bluetoothGattService;
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- bluetoothGattService: " + bluetoothGattService);
                var characteristicUUID = _this.stringToUuid(arg.characteristicUUID);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- characteristicUUID: " + characteristicUUID);
                var bluetoothGattCharacteristic = _this._findCharacteristicOfType(bluetoothGattService, characteristicUUID, android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- bluetoothGattCharacteristic: " + bluetoothGattCharacteristic);
                if (!bluetoothGattCharacteristic) {
                    reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                    return;
                }
                var stateObject = _this.connections[arg.peripheralUUID];
                stateObject.onReadPromise = resolve;
                if (!gatt.readCharacteristic(bluetoothGattCharacteristic)) {
                    reject('Failed to set client characteristic read for ' + characteristicUUID);
                }
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
                    reject("You need to provide some data to write in the 'value' property");
                    return;
                }
                var wrapper = _this._getWrapper(arg, reject);
                if (wrapper === null) {
                    return;
                }
                var characteristic = _this._findCharacteristicOfType(wrapper.bluetoothGattService, _this.stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.write ---- characteristic: " + characteristic);
                if (!characteristic) {
                    reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                    return;
                }
                var val = _this.encodeValue(arg.value);
                if (val === null) {
                    reject('Invalid value: ' + arg.value);
                    return;
                }
                characteristic.setValue(val);
                characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                _this.connections[arg.peripheralUUID].onWritePromise = resolve;
                if (!wrapper.gatt.writeCharacteristic(characteristic)) {
                    reject("Failed to write to characteristic " + arg.characteristicUUID);
                }
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
                var wrapper = _this._getWrapper(arg, reject);
                if (!wrapper) {
                    return;
                }
                var characteristic = _this._findCharacteristicOfType(wrapper.bluetoothGattService, _this.stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.writeWithoutResponse ---- characteristic: " + characteristic);
                if (!characteristic) {
                    reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                    return;
                }
                var val = _this.encodeValue(arg.value);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.writeWithoutResponse ---- encodedValue: " + val);
                if (!val) {
                    reject("Invalid value: " + arg.value);
                    return;
                }
                characteristic.setValue(val);
                characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                if (wrapper.gatt.writeCharacteristic(characteristic)) {
                    resolve();
                }
                else {
                    reject("Failed to write to characteristic " + arg.characteristicUUID);
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.writeWithoutResponse ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.startNotifying = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(arg, reject);
                if (!wrapper) {
                    return;
                }
                var gatt = wrapper.gatt;
                var bluetoothGattService = wrapper.bluetoothGattService;
                var characteristicUUID = _this.stringToUuid(arg.characteristicUUID);
                var characteristic = _this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- characteristic: " + characteristic);
                if (!characteristic) {
                    reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                    return;
                }
                if (!gatt.setCharacteristicNotification(characteristic, true)) {
                    reject("Failed to register notification for characteristic " + arg.characteristicUUID);
                    return;
                }
                var clientCharacteristicConfigId = _this.stringToUuid('2902');
                var bluetoothGattDescriptor = characteristic.getDescriptor(clientCharacteristicConfigId);
                if (!bluetoothGattDescriptor) {
                    bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(clientCharacteristicConfigId, android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE);
                    characteristic.addDescriptor(bluetoothGattDescriptor);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- descriptor: " + bluetoothGattDescriptor);
                }
                if ((characteristic.getProperties() &
                    android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !==
                    0) {
                    bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                }
                else if ((characteristic.getProperties() &
                    android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !==
                    0) {
                    bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
                }
                else {
                    reject("Characteristic " + characteristicUUID + " does not have NOTIFY or INDICATE property set.");
                    return;
                }
                if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
                    var cb = arg.onNotify ||
                        function (result) {
                            common_1.CLog(common_1.CLogTypes.warning, "No 'onNotify' callback function specified for 'startNotifying'");
                        };
                    var stateObject = _this.connections[arg.peripheralUUID];
                    stateObject.onNotifyCallback = cb;
                    common_1.CLog(common_1.CLogTypes.info, '--- notifying');
                    resolve();
                }
                else {
                    reject("Failed to set client characteristic notification for " + characteristicUUID);
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startNotifying ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.stopNotifying = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(arg, reject);
                if (!wrapper) {
                    return;
                }
                var gatt = wrapper.gatt;
                var gattService = wrapper.bluetoothGattService;
                var characteristicUUID = _this.stringToUuid(arg.characteristicUUID);
                var characteristic = _this._findNotifyCharacteristic(gattService, characteristicUUID);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.stopNotifying ---- service characteristic: " + characteristic);
                if (!characteristic) {
                    reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                    return;
                }
                var stateObject = _this.connections[arg.peripheralUUID];
                stateObject.onNotifyCallback = null;
                if (gatt.setCharacteristicNotification(characteristic, false)) {
                    resolve();
                }
                else {
                    reject('Failed to remove client characteristic notification for ' +
                        characteristicUUID);
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopNotifying: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.getAdapter = function () {
        return this.adapter;
    };
    Bluetooth.prototype.removeBond = function (device) {
        try {
            var m = device.getClass();
            var tmp = Array.create('java.lang.Class', 0);
            m = m.getMethod('removeBond', tmp);
            var removed = m.invoke(device, null);
            common_1.CLog(common_1.CLogTypes.info, 'Removed bond');
            return removed;
        }
        catch (ex) {
            common_1.CLog(common_1.CLogTypes.error, "Bluetooth.removeBond ---- error: " + ex);
        }
    };
    Bluetooth.prototype.fetchUuidsWithSdp = function (device) {
        try {
            var m = device.getClass();
            var tmp = Array.create('java.lang.Class', 0);
            m = m.getMethod('fetchUuidsWithSdp', tmp);
            var worked = m.invoke(device, null);
            return worked;
        }
        catch (ex) {
            common_1.CLog(common_1.CLogTypes.error, "Bluetooth.fetchUuidsWithSdp ---- error: " + ex);
        }
    };
    Bluetooth.prototype.stopGattServer = function () {
        if (this.gattServer) {
            this.gattServer.close();
        }
        this.gattServer = null;
    };
    Bluetooth.prototype.startGattServer = function () {
        if (android.os.Build.VERSION.SDK_INT >=
            android.os.Build.VERSION_CODES.JELLY_BEAN_MR2) {
            this.gattServer = this.bluetoothManager.openGattServer(utils.ad.getApplicationContext(), this.bluetoothGattServerCallback);
        }
    };
    Bluetooth.prototype.notifyCentrals = function (value, characteristic, devices) {
        var _this = this;
        var didSetValue = characteristic && characteristic.setValue(value);
        if (didSetValue) {
            var notify_1 = function (dev) {
                return new Promise(function (resolve, reject) {
                    var timeoutID = setTimeout(function () {
                        _this.off(Bluetooth.notification_sent_event, notificationSent);
                        reject('notify timeout!');
                    }, 10000);
                    var notificationSent = function (args) {
                        var argdata = args.data;
                        var device = argdata.device;
                        var status = argdata.status;
                        if (device.address == dev) {
                            clearTimeout(timeoutID);
                            _this.off(Bluetooth.notification_sent_event, notificationSent);
                            if (status) {
                                reject("notify status error: " + status);
                            }
                            else {
                                resolve();
                            }
                        }
                    };
                    _this.on(Bluetooth.notification_sent_event, notificationSent);
                    if (dev && characteristic) {
                        _this.gattServer.notifyCharacteristicChanged(dev, characteristic, true);
                    }
                    else {
                        reject('Device or characteristic closed unexpectedly!');
                    }
                });
            };
            return devices.reduce(function (chain, item) {
                return chain.then(notify_1.bind(null, item));
            }, notify_1(devices.shift()));
        }
        else {
            return Promise.reject("Couldn't set value on " + characteristic);
        }
    };
    Bluetooth.prototype.setDiscoverable = function () {
        return new Promise(function (resolve, reject) {
            try {
                var intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
                application.android.foregroundActivity.startActivityForResult(intent, ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.setDiscoverable ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.getAdvertiser = function () {
        if (this.adapter.isMultipleAdvertisementSupported()) {
            if (android.os.Build.VERSION.SDK_INT >=
                android.os.Build.VERSION_CODES.LOLLIPOP) {
                return this.adapter.getBluetoothLeAdvertiser();
            }
        }
    };
    Bluetooth.prototype.makeService = function (opts) {
        var suuid = this.stringToUuid(opts.UUID);
        var serviceType = opts && opts.primary === true
            ? android.bluetooth.BluetoothGattService.SERVICE_TYPE_PRIMARY
            : android.bluetooth.BluetoothGattService.SERVICE_TYPE_SECONDARY;
        return new android.bluetooth.BluetoothGattService(suuid, serviceType);
    };
    Bluetooth.prototype.makeCharacteristic = function (opts) {
        var cuuid = this.stringToUuid(opts.UUID);
        var props = (opts && opts.properties) ||
            android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ |
                android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE |
                android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY;
        var permissions = (opts && opts.permissions) ||
            android.bluetooth.BluetoothGattCharacteristic.PERMISSION_WRITE |
                android.bluetooth.BluetoothGattCharacteristic.PERMISSION_READ;
        return new android.bluetooth.BluetoothGattCharacteristic(cuuid, props, permissions);
    };
    Bluetooth.prototype.makeDescriptor = function (opts) {
        var uuid = this.stringToUuid(opts.UUID);
        var perms = (opts && opts.permissions) ||
            android.bluetooth.BluetoothGattDescriptor.PERMISSION_READ |
                android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE;
        return new android.bluetooth.BluetoothGattDescriptor(uuid, perms);
    };
    Bluetooth.prototype.addService = function (service) {
        if (service && this.gattServer) {
            this.gattServer.addService(service);
        }
    };
    Bluetooth.prototype.getServerService = function (uuidString) {
        if (this.gattServer) {
            var pUuid = this.stringToUuid(uuidString);
            var services = this.gattServer.getServices();
            var service = this.gattServer.getService(pUuid);
            if (service) {
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.getServerService ---- getService: " + service + " - " + service.getUuid());
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.getServerService ---- getService: " + uuidString + " - not found!");
            }
            return service;
        }
        return null;
    };
    Bluetooth.prototype.offersService = function (uuidString) {
        return this.getServerService(uuidString) !== null;
    };
    Bluetooth.prototype.clearServices = function () {
        if (this.gattServer) {
            this.gattServer.clearServices();
        }
    };
    Bluetooth.prototype.cancelServerConnection = function (device) {
        if (this.gattServer && device) {
            common_1.CLog(common_1.CLogTypes.info, "Bluetooth.cancelServerConnection ---- device: " + device);
            this.gattServer.cancelConnection(device);
        }
    };
    Bluetooth.prototype.getConnectedDevices = function () {
        return this.bluetoothManager.getConnectedDevices(android.bluetooth.BluetoothProfile.GATT);
    };
    Bluetooth.prototype.getConnectedDeviceState = function (device) {
        if (device) {
            return this.bluetoothManager.getConnectionState(device, android.bluetooth.BluetoothProfile.GATT);
        }
    };
    Bluetooth.prototype.getConnectedDevicesMatchingState = function (states) {
        if (states) {
            return this.bluetoothManager.getDevicesMatchingConnectionStates(android.bluetooth.BluetoothProfile.GATT, [states]);
        }
    };
    Bluetooth.prototype.getServerConnectedDevices = function () {
        return this.bluetoothManager.getConnectedDevices(android.bluetooth.BluetoothProfile.GATT_SERVER);
    };
    Bluetooth.prototype.getServerConnectedDeviceState = function (device) {
        if (device) {
            return this.bluetoothManager.getConnectionState(device, android.bluetooth.BluetoothProfile.GATT_SERVER);
        }
    };
    Bluetooth.prototype.getServerConnectedDevicesMatchingState = function (states) {
        if (states) {
            return this.bluetoothManager.getDevicesMatchingConnectionStates(android.bluetooth.BluetoothProfile.GATT_SERVER, [states]);
        }
    };
    Bluetooth.prototype.startAdvertising = function (opts) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this.adapter) {
                    reject('Bluetooth not properly initialized!');
                    return;
                }
                var adv = _this.getAdvertiser();
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startAdvertising ---- advertiser: " + adv);
                if (adv === null || !_this.adapter.isMultipleAdvertisementSupported()) {
                    reject('Adapter is turned off or doesnt support bluetooth advertisement');
                    return;
                }
                else {
                    var settings = opts.settings;
                    var _s = new android.bluetooth.le.AdvertiseSettings.Builder()
                        .setAdvertiseMode((settings && settings.advertiseMode) ||
                        android.bluetooth.le.AdvertiseSettings
                            .ADVERTISE_MODE_LOW_LATENCY)
                        .setTxPowerLevel((settings && settings.txPowerLevel) ||
                        android.bluetooth.le.AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                        .setConnectable((settings && settings.connectable) || false)
                        .build();
                    var pUuid = android.os.ParcelUuid.fromString(opts.UUID);
                    var data = opts.data;
                    var _d = new android.bluetooth.le.AdvertiseData.Builder()
                        .addServiceUuid(pUuid)
                        .build();
                    var _scanResult = new android.bluetooth.le.AdvertiseData.Builder()
                        .setIncludeDeviceName((data && data.includeDeviceName) || true)
                        .build();
                    adv.startAdvertising(_s, _d, _scanResult, _this.advertiseCallback);
                    common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.startAdvertising ---- started advertising');
                    resolve();
                }
            }
            catch (err) {
                _this.sendEvent(Bluetooth.error_event, { error: err }, 'Error with Bluetooth.startAdvertising()');
                reject(err);
            }
        });
    };
    Bluetooth.prototype.stopAdvertising = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.adapter) {
                reject('Bluetooth not properly initialized!');
                return;
            }
            var adv = _this.getAdvertiser();
            common_1.CLog(common_1.CLogTypes.info, "Bluetooth.stopAdvertising ---- advertiser: " + adv);
            if (adv === null || !_this.adapter.isMultipleAdvertisementSupported()) {
                reject('Adapter is turned off or doesnt support bluetooth advertisement');
                return;
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.stopAdvertising ---- bluetooth stopping advertising!');
                adv.stopAdvertising(_this.advertiseCallback);
                resolve();
            }
        });
    };
    Bluetooth.prototype.isPeripheralModeSupported = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            resolve(_this.adapter.isMultipleAdvertisementSupported() &&
                _this.adapter.isOffloadedFilteringSupported() &&
                _this.adapter.isOffloadedScanBatchingSupported());
        });
    };
    Bluetooth.prototype.gattDisconnect = function (gatt) {
        if (gatt !== null) {
            var device = gatt.getDevice();
            common_1.CLog(common_1.CLogTypes.info, "Bluetooth.gattDisconnect ---- device: " + device);
            var stateObject = this.connections[device.getAddress()];
            common_1.CLog(common_1.CLogTypes.info, "Bluetooth.gattDisconnect ---- invoking disconnect callback");
            if (stateObject && stateObject.onDisconnected) {
                stateObject.onDisconnected({
                    UUID: device.getAddress(),
                    name: device.getName()
                });
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.gattDisconnect ---- no disconnect callback found');
            }
            this.connections[device.getAddress()] = null;
            common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.gattDisconnect ---- Closing GATT client');
            gatt.disconnect();
            gatt.close();
        }
    };
    Bluetooth.prototype.uuidToString = function (uuid) {
        var uuidStr = uuid.toString();
        var pattern = java.util.regex.Pattern.compile('0000(.{4})-0000-1000-8000-00805f9b34fb', 2);
        var matcher = pattern.matcher(uuidStr);
        return matcher.matches() ? matcher.group(1) : uuidStr;
    };
    Bluetooth.prototype.encodeValue = function (val) {
        var parts = val;
        if (typeof val === 'string') {
            parts = val.split(',');
            if (parts[0].indexOf('x') === -1) {
                return null;
            }
        }
        var result = Array.create('byte', parts.length);
        for (var i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result;
    };
    Bluetooth.prototype.decodeValue = function (value) {
        if (value === null) {
            return null;
        }
        var b = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
        return this.base64ToArrayBuffer(b);
    };
    Bluetooth.prototype.stringToUuid = function (uuidStr) {
        if (uuidStr.length === 4) {
            uuidStr = '0000' + uuidStr + '-0000-1000-8000-00805f9b34fb';
        }
        return java.util.UUID.fromString(uuidStr);
    };
    Bluetooth.prototype.extractManufacturerRawData = function (scanRecord) {
        var offset = 0;
        while (offset < scanRecord.length - 2) {
            var len = scanRecord[offset++] & 0xff;
            if (len === 0) {
                break;
            }
            var type = scanRecord[offset++] & 0xff;
            switch (type) {
                case 0xff:
                    return this.decodeValue(java.util.Arrays.copyOfRange(scanRecord, offset, offset + len - 1));
                default:
                    offset += len - 1;
                    break;
            }
        }
    };
    Bluetooth.prototype._findNotifyCharacteristic = function (bluetoothGattService, characteristicUUID) {
        var characteristics = bluetoothGattService.getCharacteristics();
        for (var i = 0; i < characteristics.size(); i++) {
            var c = characteristics.get(i);
            if ((c.getProperties() &
                android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !==
                0 &&
                characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }
        for (var j = 0; j < characteristics.size(); j++) {
            var ch = characteristics.get(j);
            if ((ch.getProperties() &
                android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !==
                0 &&
                characteristicUUID.equals(ch.getUuid())) {
                return ch;
            }
        }
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    };
    Bluetooth.prototype._findCharacteristicOfType = function (bluetoothGattService, characteristicUUID, charType) {
        var characteristics = bluetoothGattService.getCharacteristics();
        for (var i = 0; i < characteristics.size(); i++) {
            var c = characteristics.get(i);
            if ((c.getProperties() & charType) !== 0 &&
                characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    };
    Bluetooth.prototype._getWrapper = function (arg, reject) {
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
        var serviceUUID = this.stringToUuid(arg.serviceUUID);
        var stateObject = this.connections[arg.peripheralUUID];
        if (!stateObject) {
            reject('The peripheral is disconnected');
            return;
        }
        var gatt = stateObject.device;
        var bluetoothGattService = gatt.getService(serviceUUID);
        if (!bluetoothGattService) {
            reject("Could not find service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return;
        }
        return {
            gatt: gatt,
            bluetoothGattService: bluetoothGattService
        };
    };
    Bluetooth.prototype._isEnabled = function () {
        return this.adapter !== null && this.adapter.isEnabled();
    };
    Bluetooth.prototype._getContext = function () {
        var ctx = java.lang.Class.forName('android.app.AppGlobals')
            .getMethod('getInitialApplication', null)
            .invoke(null, null);
        if (ctx) {
            return ctx;
        }
        return java.lang.Class.forName('android.app.ActivityThread')
            .getMethod('currentApplication', null)
            .invoke(null, null);
    };
    Bluetooth.prototype._getActivity = function () {
        var _this = this;
        var activity = application.android.foregroundActivity ||
            application.android.startActivity;
        if (activity === null) {
            setTimeout(function () {
                _this._getActivity();
            }, 250);
            return;
        }
        else {
            return activity;
        }
    };
    return Bluetooth;
}(common_1.BluetoothCommon));
exports.Bluetooth = Bluetooth;
