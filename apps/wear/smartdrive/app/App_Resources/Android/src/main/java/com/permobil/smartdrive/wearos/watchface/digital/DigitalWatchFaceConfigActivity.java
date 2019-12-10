package com.permobil.smartdrive.wearos.watchface.digital;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.support.wearable.complications.ComplicationHelperActivity;
import android.support.wearable.complications.ComplicationProviderInfo;
import android.support.wearable.complications.ProviderChooserIntent;
import android.support.wearable.complications.ProviderInfoRetriever;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;

import com.permobil.smartdrive.wearos.R;

import org.jetbrains.annotations.Nullable;

import java.util.concurrent.Executors;

import butterknife.BindDrawable;
import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * The watch-side config activity for {@link DigitalWatchFaceService}, which allows for setting
 * the left and right complications of watch face.
 */
public class DigitalWatchFaceConfigActivity extends Activity implements View.OnClickListener {
    private static final String TAG = "ConfigActivity";
    static final int COMPLICATION_CONFIG_REQUEST_CODE = 1001;

    /**
     * Used by associated watch face ({@link DigitalWatchFaceService}) to let this
     * configuration Activity know which complication locations are supported, their ids, and
     * supported complication data types.
     */
    public enum ComplicationLocation {
        TOP
    }

    private int mTopComplicationId;
    // Selected complication id by user.
    private int mSelectedComplicationId;
    // ComponentName used to identify a specific service that renders the watch face.
    private ComponentName mWatchFaceComponentName;
    // Required to retrieve complication data from watch face for preview.
    private ProviderInfoRetriever mProviderInfoRetriever;

    // Butterknife views
    @BindDrawable(R.drawable.add_complication)
    Drawable defaultAddComplicationDrawable;
    @BindDrawable(R.drawable.added_complication)
    Drawable addedComplicationDrawable;
    @BindView(R.id.top_complication_background)
    ImageView topComplicationBackground;
    @BindView(R.id.top_complication)
    ImageButton topComplication;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_config);

        mWatchFaceComponentName = new ComponentName(getApplicationContext(), DigitalWatchFaceService.class);

        ButterKnife.bind(this);

        mSelectedComplicationId = -1;
        mTopComplicationId = DigitalWatchFaceService.getComplicationId(ComplicationLocation.TOP);
        topComplication.setOnClickListener(this);
        // Sets default as "Add Complication" icon.
        topComplication.setImageDrawable(defaultAddComplicationDrawable);
        topComplicationBackground.setVisibility(View.INVISIBLE);

        // Initialization of code to retrieve active complication data for the watch face.
        mProviderInfoRetriever = new ProviderInfoRetriever(getApplicationContext(), Executors.newCachedThreadPool());
        mProviderInfoRetriever.init();
        retrieveInitialComplicationsData();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Required to release retriever for active complication data.
        mProviderInfoRetriever.release();
    }

    @Override
    public void onClick(View view) {
        if (view.equals(topComplication)) {
            Log.d(TAG, "Top Complication click()");
            launchComplicationHelperActivity(ComplicationLocation.TOP);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == COMPLICATION_CONFIG_REQUEST_CODE && resultCode == RESULT_OK) {
            // Retrieves information for selected Complication provider.
            ComplicationProviderInfo complicationProviderInfo = data.getParcelableExtra(ProviderChooserIntent.EXTRA_PROVIDER_INFO);
            Log.d(TAG, "Provider: " + complicationProviderInfo);
            if (mSelectedComplicationId >= 0) {
                updateComplicationViews(mSelectedComplicationId, complicationProviderInfo);
            }
        }
    }

    public void retrieveInitialComplicationsData() {
        final int[] complicationIds = DigitalWatchFaceService.getComplicationIds();

        mProviderInfoRetriever.retrieveProviderInfo(
                new ProviderInfoRetriever.OnProviderInfoReceivedCallback() {
                    @Override
                    public void onProviderInfoReceived(int watchFaceComplicationId, @Nullable ComplicationProviderInfo complicationProviderInfo) {
                        Log.d(TAG, "onProviderInfoReceived: " + complicationProviderInfo);
                        updateComplicationViews(watchFaceComplicationId, complicationProviderInfo);
                    }
                },
                mWatchFaceComponentName,
                complicationIds);
    }

    public void updateComplicationViews(int watchFaceComplicationId, ComplicationProviderInfo complicationProviderInfo) {
        Log.d(TAG, "updateComplicationViews(): id: " + watchFaceComplicationId);
        Log.d(TAG, "\tinfo: " + complicationProviderInfo);

        if (watchFaceComplicationId == mTopComplicationId) {
            Log.d(TAG, "checking for provider info");
            if (complicationProviderInfo != null) {
                Log.d(TAG, "has provider info..");
                topComplication.setImageIcon(complicationProviderInfo.providerIcon);
                topComplicationBackground.setImageIcon(null); // removes the old image icon set if the user previously had a provider selected
                topComplicationBackground.setImageDrawable(addedComplicationDrawable);
                topComplicationBackground.setVisibility(View.VISIBLE); // need to ensure it's VISIBLE here if it's been flagged INVISIBLE prior
            } else {
                topComplication.setImageIcon(null); // removes the old image icon set if the user previously had a provider selected
                topComplication.setImageDrawable(defaultAddComplicationDrawable);
                topComplicationBackground.setVisibility(View.INVISIBLE);
            }
        }
    }

    // Verifies the watch face supports the complication location, then launches the helper
    // class, so user can choose their complication data provider.
    private void launchComplicationHelperActivity(ComplicationLocation complicationLocation) {
        mSelectedComplicationId = DigitalWatchFaceService.getComplicationId(complicationLocation);

        if (mSelectedComplicationId >= 0) {
            int[] supportedTypes = DigitalWatchFaceService.getSupportedComplicationTypes(complicationLocation);

            startActivityForResult(ComplicationHelperActivity.createProviderChooserHelperIntent(
                    getApplicationContext(),
                    mWatchFaceComponentName,
                    mSelectedComplicationId,
                    supportedTypes),
                    DigitalWatchFaceConfigActivity.COMPLICATION_CONFIG_REQUEST_CODE
            );
        } else {
            Log.d(TAG, "Complication not supported by watch face.");
        }
    }
}