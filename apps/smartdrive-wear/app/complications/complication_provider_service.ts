@JavaProxy('com.permobil.ComplicationProviderService')
export class ComplicationProviderService extends android.support.wearable
  .complications.ComplicationProviderService {
  constructor() {
    super();
    return global.__native(this);
  }

  /*
   * Called when a complication has been activated. The method is for any one-time
   * (per complication) set-up.
   *
   * You can continue sending data for the active complicationId until onComplicationDeactivated()
   * is called.
   */
  onComplicationActivated(
    complicationId: number,
    dataType: number,
    complicationManager: android.support.wearable.complications.ComplicationManager
  ): void {
    console.log(
      'ComplicationProviderService',
      `onComplicationActivated(): complicationId ${complicationId}`
    );
  }

  /*
   * Called when the complication needs updated data from your provider. There are four scenarios
   * when this will happen:
   *
   *   1. An active watch face complication is changed to use this provider
   *   2. A complication using this provider becomes active
   *   3. The period of time you specified in the manifest has elapsed (UPDATE_PERIOD_SECONDS)
   *   4. You triggered an update from your own class via the
   *       ProviderUpdateRequester.requestUpdate() method.
   */

  onComplicationUpdate(
    complicationId: number,
    dataType: number,
    complicationManager: android.support.wearable.complications.ComplicationManager
  ): void {
    console.log(
      'ComplicationProviderService',
      `onComplicationUpdate() complicationId: ${complicationId}`
    );

    // if (javaObj === null || typeof javaObj !== 'object') {
    //   return javaObj;
    // }

    // Used to create a unique key to use with SharedPreferences for this complication.
    const thisProvider = new android.content.ComponentName(
      this as any,
      java.lang.Class.forName('com.permobil.ComplicationProviderService')
    );

    // We pass the complication id, so we can only update the specific complication tapped.
    const complicationPendingIntent = this.getToggleIntent(
      this as any,
      thisProvider,
      complicationId
    );
    console.log('complicationPendingIntent', complicationPendingIntent);

    const prefKey = KEYS.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY;
    console.log('PREFKEY', prefKey);
    // Retrieves your data, in this case, we grab an incrementing number from SharedPrefs.
    const preferences = (this as any).getSharedPreferences(
      KEYS.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY,
      0
    ) as android.content.SharedPreferences;
    console.log({ preferences });

    const keyNumber = preferences.getInt(
      getPreferenceKey(thisProvider, complicationId),
      0
    );
    // const numberText = String.format(Locale.getDefault(), '%d!', number);
    let numberText = '--';
    if (keyNumber >= 0) {
      numberText = `${keyNumber}%`;
    }
    console.log({ numberText });

    let complicationData = null;

    console.log('switch statement for DATATYPE', dataType);

    const builder = new android.support.wearable.complications.ComplicationData.Builder(
      dataType
    );
    console.log(builder);

    switch (dataType) {
      case android.support.wearable.complications.ComplicationData
        .TYPE_SHORT_TEXT:
        complicationData = new android.support.wearable.complications.ComplicationData.Builder(
          android.support.wearable.complications.ComplicationData.TYPE_SHORT_TEXT
        )
          .setShortText(
            android.support.wearable.complications.ComplicationText.plainText(
              numberText
            )
          )
          .setTapAction(complicationPendingIntent)
          .build();
        break;
      case android.support.wearable.complications.ComplicationData
        .TYPE_SMALL_IMAGE:
        console.log('TYPE_SMALL_IMAGE data type');
        // builder.setLongText(
        //   android.support.wearable.complications.ComplicationText.plainText(
        //     'World'
        //   )
        // );
        // builder.setLongTitle(
        //   android.support.wearable.complications.ComplicationText.plainText(
        //     'Hello'
        //   )
        // );
        // complicationData = builder.build();
        break;
      default:
        console.log(
          'ComplicationProviderService',
          'Unexpected complication type ' + dataType
        );
    }

    console.log('COMPLICATIONDATA', complicationData);
    if (complicationData != null) {
      complicationManager.updateComplicationData(
        complicationId,
        complicationData
      );
    } else {
      // If no data is sent, we still need to inform the ComplicationManager, so the update
      // job can finish and the wake lock isn't held any longer than necessary.
      complicationManager.noUpdateRequired(complicationId);
    }
  }

  /*
   * Called when the complication has been deactivated.
   */
  onComplicationDeactivated(complicationId: number): void {
    console.log(
      'ComplicationProviderService',
      'onComplicationDeactivated(): ' + complicationId
    );
  }

  /**
   * Returns a pending intent, suitable for use as a tap intent, that causes a complication to be
   * toggled and updated.
   */
  private getToggleIntent(
    context: android.content.Context,
    provider: android.content.ComponentName,
    complicationId: number
  ): android.app.PendingIntent {
    const intent = new android.content.Intent(
      context,
      ComplicationProviderService.class
    );
    intent.putExtra(KEYS.EXTRA_PROVIDER_COMPONENT, provider);
    intent.putExtra(KEYS.EXTRA_COMPLICATION_ID, complicationId);

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
  COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY = 'com.example.android.wearable.watchface.COMPLICATION_PROVIDER_PREFERENCES_FILE_KEY',
  EXTRA_COMPLICATION_ID = 'com.example.android.wearable.watchface.provider.action.COMPLICATION_ID',
  EXTRA_PROVIDER_COMPONENT = 'com.example.android.wearable.watchface.provider.action.PROVIDER_COMPONENT',
  MAX_NUMBER = 20
}
