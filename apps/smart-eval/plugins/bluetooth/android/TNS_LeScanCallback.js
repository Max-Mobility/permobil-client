"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var android_main_1 = require("./android_main");
var TNS_LeScanCallback = (function (_super) {
    __extends(TNS_LeScanCallback, _super);
    function TNS_LeScanCallback() {
        var _this = _super.call(this, {
            onLeScan: function (device, rssi, scanRecord) {
                common_1.CLog(common_1.CLogTypes.info, "---- TNS_LeScanCallback.onLeScan ---- device: " + device + ", rssi: " + rssi + ", scanRecord: " + scanRecord);
                var stateObject = this._owner.get().connections[device.getAddress()];
                if (!stateObject) {
                    this._owner.get().connections[device.getAddress()] = {
                        state: 'disconnected'
                    };
                    var manufacturerId = void 0;
                    var manufacturerData = void 0;
                    var manufacturerDataRaw = this._owner
                        .get()
                        .extractManufacturerRawData(scanRecord);
                    common_1.CLog(common_1.CLogTypes.info, "---- TNS_LeScanCallback.onLeScan ---- manufacturerDataRaw: " + manufacturerDataRaw);
                    if (manufacturerDataRaw) {
                        manufacturerId = new DataView(manufacturerDataRaw, 0).getUint16(0, true);
                        common_1.CLog(common_1.CLogTypes.info, "---- TNS_LeScanCallback.onLeScan ---- manufacturerId: " + manufacturerId);
                        manufacturerData = manufacturerDataRaw.slice(2);
                        common_1.CLog(common_1.CLogTypes.info, "---- TNS_LeScanCallback.onLeScan ---- manufacturerData: " + manufacturerData);
                    }
                    common_1.CLog(common_1.CLogTypes.info, "---- TNS_LeScanCallback.scanCallback ---- payload: " + device.getAddress() + "::" + device.getName());
                    this._owner.get().sendEvent(android_main_1.Bluetooth.device_discovered_event, {
                        type: 'scanResult',
                        UUID: device.getAddress(),
                        name: device.getName(),
                        RSSI: rssi,
                        state: 'disconnected',
                        manufacturerId: manufacturerId,
                        manufacturerData: manufacturerData
                    });
                }
            }
        }) || this;
        return global.__native(_this);
    }
    TNS_LeScanCallback.prototype.onInit = function (owner) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_LeScanCallback.onInit ---- this._owner: " + this._owner);
    };
    TNS_LeScanCallback = __decorate([
        JavaProxy('com.nativescript.TNS_LeScanCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_LeScanCallback);
    return TNS_LeScanCallback;
}(android.bluetooth.BluetoothAdapter
    .LeScanCallback));
exports.TNS_LeScanCallback = TNS_LeScanCallback;
