import {
  AndroidActivityCallbacks,
  setActivityCallbacks
} from '@nativescript/core';
import * as application from '@nativescript/core/application';


@NativeClass()
@JavaProxy('com.permobil.smartdrive.wearos.MainActivity')
@Interfaces([androidx.wear.ambient.AmbientModeSupport.AmbientCallbackProvider])
class MainActivity
  extends androidx.appcompat.app.AppCompatActivity
  implements androidx.wear.ambient.AmbientModeSupport.AmbientCallbackProvider {
  constructor() {
    super();
  }

  /**
   * Ambient mode controller attached to this display. Used by Activity to see if it is in ambient
   * mode.
   */
  public ambientController: androidx.wear.ambient.AmbientModeSupport.AmbientController;

  public isNativeScriptActivity;

  private _callbacks: AndroidActivityCallbacks;

  public getAmbientCallback(): androidx.wear.ambient.AmbientModeSupport.AmbientCallback {
    return new MyAmbientCallback();
  }

  public onCreate(savedInstanceState: android.os.Bundle): void {
    // Set the isNativeScriptActivity in onCreate (as done in the original NativeScript activity code)
    // The JS constructor might not be called because the activity is created from Android.
    this.isNativeScriptActivity = true;
    if (!this._callbacks) {
      setActivityCallbacks(this);
    }

    this._callbacks.onCreate(
      this,
      savedInstanceState,
      this.getIntent(),
      super.onCreate
    );

    this.ambientController = androidx.wear.ambient.AmbientModeSupport.attach(
      this
    );
  }

  public onSaveInstanceState(outState: android.os.Bundle): void {
    this._callbacks.onSaveInstanceState(
      this,
      outState,
      super.onSaveInstanceState
    );
  }

  public onStart(): void {
    this._callbacks.onStart(this, super.onStart);
  }

  public onStop(): void {
    this._callbacks.onStop(this, super.onStop);
  }

  public onDestroy(): void {
    this._callbacks.onDestroy(this, super.onDestroy);
  }

  public onBackPressed(): void {
    this._callbacks.onBackPressed(this, super.onBackPressed);
  }

  public onRequestPermissionsResult(
    requestCode: number,
    permissions: Array<string>,
    grantResults: Array<number>
  ): void {
    this._callbacks.onRequestPermissionsResult(
      this,
      requestCode,
      permissions,
      grantResults,
      undefined /*TODO: Enable if needed*/
    );
  }

  public onActivityResult(
    requestCode: number,
    resultCode: number,
    data: android.content.Intent
  ): void {
    this._callbacks.onActivityResult(
      this,
      requestCode,
      resultCode,
      data,
      super.onActivityResult
    );
  }
}

@NativeClass()
class MyAmbientCallback extends androidx.wear.ambient.AmbientModeSupport
  .AmbientCallback {
  /** If the display is low-bit in ambient mode. i.e. it requires anti-aliased fonts. */
  public mIsLowBitAmbient: boolean;

  /**
   * If the display requires burn-in protection in ambient mode, rendered pixels need to be
   * intermittently offset to avoid screen burn-in.
   */
  public mDoBurnInProtection: boolean;

  onAmbientOffloadInvalidated(): void {
    // Called to inform an activity that whatever decomposition it has sent to Sidekick
    // is no longer valid and should be re-sent before enabling ambient offload.
    const eventData = {
      eventName: 'ambientOffloadInvalidated',
      object: null,
      data: {
        isLowBitAmbient: this.mIsLowBitAmbient,
        doBurnInProtection: this.mDoBurnInProtection
      }
    };
    application.notify(eventData);
  }

  public onEnterAmbient(ambientDetails: android.os.Bundle): void {
    this.mIsLowBitAmbient = ambientDetails.getBoolean(
      androidx.wear.ambient.AmbientModeSupport.EXTRA_LOWBIT_AMBIENT,
      false
    );
    this.mDoBurnInProtection = ambientDetails.getBoolean(
      androidx.wear.ambient.AmbientModeSupport.EXTRA_BURN_IN_PROTECTION,
      false
    );

    // Handle entering ambient mode
    const eventData = {
      eventName: 'enterAmbient',
      object: null,
      data: {
        isLowBitAmbient: this.mIsLowBitAmbient,
        doBurnInProtection: this.mDoBurnInProtection
      }
    };
    application.notify(eventData);
  }

  public onExitAmbient(): void {
    // Handle exiting ambient mode
    const eventData = {
      eventName: 'exitAmbient',
      object: null,
      data: {
        isLowBitAmbient: this.mIsLowBitAmbient,
        doBurnInProtection: this.mDoBurnInProtection
      }
    };
    application.notify(eventData);
  }

  public onUpdateAmbient(): void {
    // Update the content
    const eventData = {
      eventName: 'updateAmbient',
      object: null,
      data: {
        isLowBitAmbient: this.mIsLowBitAmbient,
        doBurnInProtection: this.mDoBurnInProtection
      }
    };
    application.notify(eventData);
  }
}
