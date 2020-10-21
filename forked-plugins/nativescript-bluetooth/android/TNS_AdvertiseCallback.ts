import { Bluetooth } from './android_main';

function setupAdvertiseCallback() {
  @NativeClass()
  @JavaProxy('com.nativescript.TNS_AdvertiseCallback')
  class TNS_AdvertiseCallback extends android.bluetooth.le.AdvertiseCallback {
    private _owner: WeakRef<Bluetooth>;
    constructor() {
      super();
      return global.__native(this);
    }

    onInit(owner: WeakRef<Bluetooth>) {
      this._owner = owner;
    }

    /**
     * Callback triggered in response to startAdvertising(AdvertiseSettings, AdvertiseData, AdvertiseCallback) indicating that the advertising has been started successfully.
     * @param settingsInEffect
     */
    onStartSuccess(settingsInEffect: android.bluetooth.le.AdvertiseSettings) {
      this._owner.get().sendEvent(Bluetooth.bluetooth_advertise_success_event);
      // this._owner.get()._onBluetoothAdvertiseResolve(settingsInEffect);
    }

    /**
     * Callback when advertising could not be started.
     * @param errorCode
     */
    onStartFailure(errorCode: number) {
      // Get the error code value
      let errorObj;
      switch (errorCode) {
        case 1:
          // Failed to start advertising as the advertise data to be broadcasted is larger than 31 bytes.
          errorObj = {
            code:
              android.bluetooth.le.AdvertiseCallback
                .ADVERTISE_FAILED_DATA_TOO_LARGE,
            msg:
              'Failed to start advertising as the advertise data to be broadcasted is larger than 31 bytes.'
          };
          break;
        case 2:
          // Failed to start advertising because no advertising instance is available.
          errorObj = {
            code:
              android.bluetooth.le.AdvertiseCallback
                .ADVERTISE_FAILED_TOO_MANY_ADVERTISERS,
            msg:
              'Failed to start advertising because no advertising instance is available.'
          };
          break;
        case 3:
          // Failed to start advertising as the advertising is already started.
          errorObj = {
            code:
              android.bluetooth.le.AdvertiseCallback
                .ADVERTISE_FAILED_ALREADY_STARTED,
            msg:
              'Failed to start advertising as the advertising is already started.'
          };
          break;
        case 4:
          errorObj = {
            code:
              android.bluetooth.le.AdvertiseCallback
                .ADVERTISE_FAILED_INTERNAL_ERROR,
            msg: 'Operation failed due to an internal error.'
          };
          break;
        case 5:
          // This feature is not supported on this platform.
          errorObj = {
            code:
              android.bluetooth.le.AdvertiseCallback
                .ADVERTISE_FAILED_FEATURE_UNSUPPORTED,
            msg: 'This feature is not supported on this platform.'
          };
          break;
      }

      this._owner
        .get()
        .sendEvent(
          Bluetooth.bluetooth_advertise_failure_event,
          { error: errorObj },
          `TNS_AdvertiseCallback.onStartFailure --- error: ${errorObj.msg}`
        );

      // this._owner.get()._onBluetoothAdvertiseReject(errorCode);
    }
  }

  return TNS_AdvertiseCallback;
}

export const TNS_AdvertiseCallback = setupAdvertiseCallback();
