import { BondState, CLog, CLogTypes } from '../common';
import { Bluetooth, deviceToCentral } from './android_main';

@JavaProxy('com.nativescript.TNS_BroadcastReceiver')
// tslint:disable-next-line:class-name
export class TNS_BroadcastReceiver extends android.content.BroadcastReceiver {
  private _owner: WeakRef<Bluetooth>;
  constructor() {
    super();
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this._owner = owner;
    CLog(
      CLogTypes.info,
      `---- TNS_BroadcastReceiver.onInit ---- this._owner: ${this._owner}`
    );
  }

  /**
   * This method is called when the BroadcastReceiver is receiving an Intent broadcast.
   * During this time you can use the other methods on BroadcastReceiver to view/modify the current result values.
   * This method is always called within the main thread of its process, unless you explicitly asked for it to be scheduled on a different thread using registerReceiver(BroadcastReceiver, IntentFilter, String, android.os.Handler).
   * When it runs on the main thread you should never perform long-running operations in it (there is a timeout of 10 seconds that the system allows before considering the receiver to be blocked and a candidate to be killed).
   * You cannot launch a popup dialog in your implementation of onReceive().
   * @param context [android.content.Context] - The Context in which the receiver is running.
   * @param intent [android.content.Intent] - The Intent being received.
   */
  onReceive(context: android.content.Context, intent: android.content.Intent) {
    const action = intent.getAction();
    const device = intent.getParcelableExtra(
      android.bluetooth.BluetoothDevice.EXTRA_DEVICE
    ) as android.bluetooth.BluetoothDevice;
    CLog(
      CLogTypes.info,
      `TNS_BroadcastReceiver.onReceive() action: ${action}, device: ${device}, context: ${context}, intent: ${intent}`
    );
    if (!device) {
      CLog(CLogTypes.warning, `No device found in the intent: ${intent}`);
    }

    if (
      action === android.bluetooth.BluetoothDevice.ACTION_BOND_STATE_CHANGED
    ) {
      const bs = intent.getIntExtra(
        android.bluetooth.BluetoothDevice.EXTRA_BOND_STATE,
        android.bluetooth.BluetoothDevice.ERROR
      );
      let bondState = BondState.none;
      switch (bs) {
        case android.bluetooth.BluetoothDevice.BOND_BONDING:
          bondState = BondState.bonding;
          break;
        case android.bluetooth.BluetoothDevice.BOND_BONDED:
          bondState = BondState.bonded;
          break;
        case android.bluetooth.BluetoothDevice.BOND_NONE:
          bondState = BondState.none;
          break;
        default:
          break;
      }
      this._owner.get().sendEvent(Bluetooth.bond_status_change_event, {
        device: deviceToCentral(device),
        bondState
      });
    } else if (
      action === android.bluetooth.BluetoothDevice.ACTION_NAME_CHANGED
    ) {
      const name = intent.getStringExtra(
        android.bluetooth.BluetoothDevice.EXTRA_NAME
      );
      this._owner.get().sendEvent(Bluetooth.device_name_change_event, {
        device: deviceToCentral(device),
        name
      });
    } else if (action === android.bluetooth.BluetoothDevice.ACTION_UUID) {
      // TODO: uuidExtra in this is always null!
      const uuidExtra = intent.getParcelableArrayExtra(
        android.bluetooth.BluetoothDevice.EXTRA_UUID
      );
      const uuids = [];
      if (uuidExtra && uuidExtra.length) {
        for (let i = 0; i < uuidExtra.length; i++) {
          uuids.push(uuidExtra[i].toString());
        }
      }
      CLog(
        CLogTypes.info,
        `${uuidExtra || 0} UUIDs found in the ACTION_UUID action.`
      );

      this._owner.get().sendEvent(Bluetooth.device_uuid_change_event, {
        device: deviceToCentral(device),
        uuids: uuids
      });
    } else if (
      action === android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED
    ) {
      // TODO: device here might be peripheral or central - need to
      //       figure out which one it is!
      this._owner.get().sendEvent(Bluetooth.device_acl_disconnected_event, {
        device: deviceToCentral(device)
      });
    } else if (
      action === android.bluetooth.BluetoothAdapter.ACTION_DISCOVERY_FINISHED
    ) {
      CLog(CLogTypes.info, 'discovery finsihed in bluetooth adapter');
      // discovery has finished, give a call to fetchUuidsWithSdp
      const result = device.fetchUuidsWithSdp();
      CLog(CLogTypes.info, 'fetchUuidsWithSdp result', result);
    }
  }
}
