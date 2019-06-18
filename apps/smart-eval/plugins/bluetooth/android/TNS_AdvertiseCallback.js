"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var android_main_1 = require("./android_main");
var TNS_AdvertiseCallback = (function (_super) {
    __extends(TNS_AdvertiseCallback, _super);
    function TNS_AdvertiseCallback() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    TNS_AdvertiseCallback.prototype.onInit = function (owner) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_AdvertiseCallback.onInit ---- this._owner: " + this._owner);
    };
    TNS_AdvertiseCallback.prototype.onStartSuccess = function (settingsInEffect) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_AdvertiseCallback.onStartSuccess ---- settingsInEffect: " + settingsInEffect);
        this._owner.get().sendEvent(android_main_1.Bluetooth.bluetooth_advertise_success_event);
    };
    TNS_AdvertiseCallback.prototype.onStartFailure = function (errorCode) {
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_AdvertiseCallback.onStartFailure ---- errorCode: " + errorCode);
        var errorObj;
        switch (errorCode) {
            case 1:
                errorObj = {
                    code: android.bluetooth.le.AdvertiseCallback
                        .ADVERTISE_FAILED_DATA_TOO_LARGE,
                    msg: 'Failed to start advertising as the advertise data to be broadcasted is larger than 31 bytes.'
                };
                break;
            case 2:
                errorObj = {
                    code: android.bluetooth.le.AdvertiseCallback
                        .ADVERTISE_FAILED_TOO_MANY_ADVERTISERS,
                    msg: 'Failed to start advertising because no advertising instance is available.'
                };
                break;
            case 3:
                errorObj = {
                    code: android.bluetooth.le.AdvertiseCallback
                        .ADVERTISE_FAILED_ALREADY_STARTED,
                    msg: 'Failed to start advertising as the advertising is already started.'
                };
                break;
            case 4:
                errorObj = {
                    code: android.bluetooth.le.AdvertiseCallback
                        .ADVERTISE_FAILED_INTERNAL_ERROR,
                    msg: 'Operation failed due to an internal error.'
                };
                break;
            case 5:
                errorObj = {
                    code: android.bluetooth.le.AdvertiseCallback
                        .ADVERTISE_FAILED_FEATURE_UNSUPPORTED,
                    msg: 'This feature is not supported on this platform.'
                };
                break;
        }
        this._owner
            .get()
            .sendEvent(android_main_1.Bluetooth.bluetooth_advertise_failure_event, { error: errorObj }, "TNS_AdvertiseCallback.onStartFailure --- error: " + errorObj.msg);
    };
    TNS_AdvertiseCallback = __decorate([
        JavaProxy('com.nativescript.TNS_AdvertiseCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_AdvertiseCallback);
    return TNS_AdvertiseCallback;
}(android.bluetooth.le
    .AdvertiseCallback));
exports.TNS_AdvertiseCallback = TNS_AdvertiseCallback;
