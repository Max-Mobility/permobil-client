import * as app from '@nativescript/core/application';
import { Log } from '@permobil/core';

export const SMARTDRIVE_SPEECH_REQUEST_CODE = 5425;

export function promptUserForSpeech() {
  return new Promise((resolve, reject) => {
    try {
      // create the intent
      const intent = new android.content.Intent(
        android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH
      );
      intent.putExtra(
        android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
        android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
      );

      // handle the speech result
      app.android.on(
        app.AndroidApplication.activityResultEvent,
        (args: app.AndroidActivityResultEventData) => {
          if (
            args.requestCode === SMARTDRIVE_SPEECH_REQUEST_CODE &&
            args.resultCode === android.app.Activity.RESULT_OK
          ) {
            const intentData = args.intent as android.content.Intent;
            const results = intentData.getStringArrayListExtra(
              android.speech.RecognizerIntent.EXTRA_RESULTS
            );
            Log.D('printing spoken results');
            Log.D('size of results list: ' + results.size());
            Log.D('is results empty: ' + results.isEmpty());
            const spokenText = results.get(0);
            resolve(spokenText);
          }
        }
      );

      // start the speech activity
      const activity: android.app.Activity =
        app.android.foregroundActivity || app.android.startActivity;
      activity.startActivityForResult(intent, SMARTDRIVE_SPEECH_REQUEST_CODE);
    } catch (error) {
      reject(error);
    }
  });
}
