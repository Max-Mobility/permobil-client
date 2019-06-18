"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var android_main_1 = require("./android_main");
var TNS_BroadcastReceiver = (function (_super) {
    __extends(TNS_BroadcastReceiver, _super);
    function TNS_BroadcastReceiver() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    TNS_BroadcastReceiver.prototype.onInit = function (owner) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "---- TNS_BroadcastReceiver.onInit ---- this._owner: " + this._owner);
    };
    TNS_BroadcastReceiver.prototype.onReceive = function (context, intent) {
        var action = intent.getAction();
        var device = intent.getParcelableExtra(android.bluetooth.BluetoothDevice.EXTRA_DEVICE);
        common_1.CLog(common_1.CLogTypes.info, "TNS_BroadcastReceiver.onReceive() action: " + action + ", device: " + device + ", context: " + context + ", intent: " + intent);
        if (!device) {
            common_1.CLog(common_1.CLogTypes.warning, "No device found in the intent: " + intent);
        }
        if (action === android.bluetooth.BluetoothDevice.ACTION_BOND_STATE_CHANGED) {
            var bs = intent.getIntExtra(android.bluetooth.BluetoothDevice.EXTRA_BOND_STATE, android.bluetooth.BluetoothDevice.ERROR);
            var bondState = common_1.BondState.none;
            switch (bs) {
                case android.bluetooth.BluetoothDevice.BOND_BONDING:
                    bondState = common_1.BondState.bonding;
                    break;
                case android.bluetooth.BluetoothDevice.BOND_BONDED:
                    bondState = common_1.BondState.bonded;
                    break;
                case android.bluetooth.BluetoothDevice.BOND_NONE:
                    bondState = common_1.BondState.none;
                    break;
                default:
                    break;
            }
            this._owner.get().sendEvent(android_main_1.Bluetooth.bond_status_change_event, {
                device: android_main_1.deviceToCentral(device),
                bondState: bondState
            });
        }
        else if (action === android.bluetooth.BluetoothDevice.ACTION_NAME_CHANGED) {
            var name_1 = intent.getStringExtra(android.bluetooth.BluetoothDevice.EXTRA_NAME);
            this._owner.get().sendEvent(android_main_1.Bluetooth.device_name_change_event, {
                device: android_main_1.deviceToCentral(device),
                name: name_1
            });
        }
        else if (action === android.bluetooth.BluetoothDevice.ACTION_UUID) {
            var uuidExtra = intent.getParcelableArrayExtra(android.bluetooth.BluetoothDevice.EXTRA_UUID);
            var uuids = [];
            if (uuidExtra && uuidExtra.length) {
                for (var i = 0; i < uuidExtra.length; i++) {
                    uuids.push(uuidExtra[i].toString());
                }
            }
            common_1.CLog(common_1.CLogTypes.info, (uuidExtra || 0) + " UUIDs found in the ACTION_UUID action.");
            this._owner.get().sendEvent(android_main_1.Bluetooth.device_uuid_change_event, {
                device: android_main_1.deviceToCentral(device),
                uuids: uuids
            });
        }
        else if (action === android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED) {
            this._owner.get().sendEvent(android_main_1.Bluetooth.device_acl_disconnected_event, {
                device: android_main_1.deviceToCentral(device)
            });
        }
        else if (action === android.bluetooth.BluetoothAdapter.ACTION_DISCOVERY_FINISHED) {
            common_1.CLog(common_1.CLogTypes.info, 'discovery finsihed in bluetooth adapter');
            var result = device.fetchUuidsWithSdp();
            common_1.CLog(common_1.CLogTypes.info, 'fetchUuidsWithSdp result', result);
        }
    };
    TNS_BroadcastReceiver = __decorate([
        JavaProxy('com.nativescript.TNS_BroadcastReceiver'),
        __metadata("design:paramtypes", [])
    ], TNS_BroadcastReceiver);
    return TNS_BroadcastReceiver;
}(android.content.BroadcastReceiver));
exports.TNS_BroadcastReceiver = TNS_BroadcastReceiver;
