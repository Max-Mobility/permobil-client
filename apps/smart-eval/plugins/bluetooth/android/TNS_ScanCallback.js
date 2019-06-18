"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var android_main_1 = require("./android_main");
var TNS_ScanCallback = (function (_super) {
    __extends(TNS_ScanCallback, _super);
    function TNS_ScanCallback() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    TNS_ScanCallback.prototype.onInit = function (owner) {
        this._owner = owner;
    };
    TNS_ScanCallback.prototype.onBatchScanResults = function (results) {
        common_1.CLog(common_1.CLogTypes.info, "----- TNS_ScanCallback.onBatchScanResults ----- results: " + results);
    };
    TNS_ScanCallback.prototype.onScanFailed = function (errorCode) {
        common_1.CLog(common_1.CLogTypes.info, "----- TNS_ScanCallback.onScanFailed ----- errorCode: " + errorCode);
        var errorMessage;
        if (errorCode ===
            android.bluetooth.le.ScanCallback.SCAN_FAILED_ALREADY_STARTED) {
            errorMessage = 'Scan already started';
        }
        else if (errorCode ===
            android.bluetooth.le.ScanCallback
                .SCAN_FAILED_APPLICATION_REGISTRATION_FAILED) {
            errorMessage = 'Application registration failed';
        }
        else if (errorCode ===
            android.bluetooth.le.ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED) {
            errorMessage = 'Feature unsupported';
        }
        else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_INTERNAL_ERROR) {
            errorMessage = 'Internal error';
        }
        else {
            errorMessage = 'Scan failed to start';
        }
        common_1.CLog(common_1.CLogTypes.info, '----- TNS_ScanCallback.onScanFailed errorMessage: ' + errorMessage);
    };
    TNS_ScanCallback.prototype.onScanResult = function (callbackType, result) {
        common_1.CLog(common_1.CLogTypes.info, "----- TNS_ScanCallback.onScanResult ----- callbackType: " + callbackType + ", result: " + result);
        var stateObject = this._owner.get().connections[result.getDevice().getAddress()];
        if (!stateObject) {
            this._owner.get().connections[result.getDevice().getAddress()] = {
                state: 'disconnected'
            };
            var manufacturerId = void 0;
            var manufacturerData = void 0;
            if (result
                .getScanRecord()
                .getManufacturerSpecificData()
                .size() > 0) {
                manufacturerId = result
                    .getScanRecord()
                    .getManufacturerSpecificData()
                    .keyAt(0);
                common_1.CLog(common_1.CLogTypes.info, "---- TNS_ScanCallback.onScanResult ---- manufacturerId: " + manufacturerId);
                manufacturerData = this._owner.get().decodeValue(result
                    .getScanRecord()
                    .getManufacturerSpecificData()
                    .valueAt(0));
                common_1.CLog(common_1.CLogTypes.info, "---- TNS_ScanCallback.onScanResult ---- manufacturerData: " + manufacturerData);
            }
            common_1.CLog(common_1.CLogTypes.info, "---- Lollipop+ scanCallback result: " + result
                .getDevice()
                .getName() + "::" + result.getDevice().getAddress());
            this._owner.get().sendEvent(android_main_1.Bluetooth.device_discovered_event, {
                type: 'scanResult',
                UUID: result.getDevice().getAddress(),
                name: result.getDevice().getName(),
                RSSI: result.getRssi(),
                state: 'disconnected',
                advertisement: android.util.Base64.encodeToString(result.getScanRecord().getBytes(), android.util.Base64.NO_WRAP),
                manufacturerId: manufacturerId,
                manufacturerData: manufacturerData
            });
        }
    };
    TNS_ScanCallback = __decorate([
        JavaProxy('com.nativescript.TNS_ScanCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_ScanCallback);
    return TNS_ScanCallback;
}(android.bluetooth.le.ScanCallback));
exports.TNS_ScanCallback = TNS_ScanCallback;
