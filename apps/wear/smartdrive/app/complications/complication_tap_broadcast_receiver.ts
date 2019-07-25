/// <reference path="../../node_modules/tns-platform-declarations/android-25.d.ts" />

import * as appSettings from 'tns-core-modules/application-settings';

/**
 * Simple {@link BroadcastReceiver} subclass for asynchronously incrementing an integer for any
 * complication id triggered via TapAction on complication. Also, provides static method to create
 * a {@link PendingIntent} that triggers this receiver.
 */
@JavaProxy('com.permobil.smartdrive.ComplicationTapBroadcastReceiver')
export class ComplicationTapBroadcastReceiver extends android.content
  .BroadcastReceiver {
  // public static EXTRA_PROVIDER_COMPONENT =
  //   'com.example.android.wearable.watchface.provider.action.PROVIDER_COMPONENT';
  // public static EXTRA_COMPLICATION_ID =
  //   'com.example.android.wearable.watchface.provider.action.COMPLICATION_ID';

  // public COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY =
  //   'com.example.android.wearable.watchface.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY';

  constructor() {
    super();
    return global.__native(this);
  }

  onReceive(
    context: android.content.Context,
    intent: android.content.Intent
  ): void {
    console.log('tapBroadcastReceiver', 'onReceive');
    const extras = intent.getExtras();
    const provider = extras.getParcelable(
      KEYS.EXTRA_PROVIDER_COMPONENT
    ) as android.content.ComponentName;
    const complicationId = extras.getInt(KEYS.EXTRA_COMPLICATION_ID);

    // Retrieve data via SharedPreferences.
    const preferenceKey = getPreferenceKey(provider, complicationId);
    const sharedPreferences = context.getSharedPreferences(
      KEYS.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY,
      0
    );

    const sdBattery = appSettings.getNumber('sd.battery');
    console.log('tapBroadcastReceiver', 'onReceive', sdBattery);

    const editor = sharedPreferences.edit() as android.content.SharedPreferences.Editor;
    editor.putInt(preferenceKey, sdBattery);
    editor.apply();

    // Request an update for the complication that has just been tapped.
    const requester = new android.support.wearable.complications.ProviderUpdateRequester(
      context,
      provider
    );
    // This instructs Wear OS that our complication's data has been updated.
    console.log('calling requestUpdate for the Provider');
    requester.requestUpdate([complicationId]);
  }

  /**
   * Returns a pending intent, suitable for use as a tap intent, that causes a complication to be
   * toggled and updated.
   */
  static getToggleIntent(
    context: android.content.Context,
    provider: android.content.ComponentName,
    complicationId: number
  ): android.app.PendingIntent {
    const intent = new android.content.Intent(
      context,
      ComplicationTapBroadcastReceiver.class
    );
    intent.putExtra(
      KEYS.EXTRA_PROVIDER_COMPONENT,
      provider
    );
    intent.putExtra(
      KEYS.EXTRA_COMPLICATION_ID,
      complicationId
    );

    // Pass complicationId as the requestCode to ensure that different complications get
    // different intents.
    return android.app.PendingIntent.getBroadcast(
      context,
      complicationId,
      intent,
      android.app.PendingIntent.FLAG_UPDATE_CURRENT
    );
  }
}

/**
 * Returns the key for the shared preference used to hold the current state of a given
 * complication.
 */
function getPreferenceKey(
  provider: android.content.ComponentName,
  complicationId: number
): string {
  return provider.getClassName() + complicationId;
}

enum KEYS {
  COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY = 'com.permobil.smartdrive.watchface.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY',
  EXTRA_COMPLICATION_ID = 'com.permobil.smartdrive.watchface.provider.action.COMPLICATION_ID',
  EXTRA_PROVIDER_COMPONENT = 'com.permobil.smartdrive.watchface.provider.action.PROVIDER_COMPONENT'
}
