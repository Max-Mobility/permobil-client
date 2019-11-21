package com.permobil.smartdrivemx2digital;

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

import org.jetbrains.annotations.Nullable;

import java.util.concurrent.Executors;

import butterknife.BindDrawable;
import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * The watch-side config activity for {@link ComplicationWatchFaceService}, which allows for setting
 * the left and right complications of watch face.
 */
public class ComplicationConfigActivity extends Activity implements View.OnClickListener {
    private static final String TAG = "ConfigActivity";
    static final int COMPLICATION_CONFIG_REQUEST_CODE = 1001;

    /**
     * Used by associated watch face ({@link ComplicationWatchFaceService}) to let this
     * configuration Activity know which complication locations are supported, their ids, and
     * supported complication data types.
     */
    public enum ComplicationLocation {
        TOP,
        CENTER
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
    @BindView(R.id.top_complication_background)
    ImageView topComplicationBackground;
    @BindView(R.id.top_complication)
    ImageButton topComplication;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_config);

        mWatchFaceComponentName = new ComponentName(getApplicationContext(), ComplicationWatchFaceService.class);

        ButterKnife.bind(this);

        mSelectedComplicationId = -1;
        mTopComplicationId = ComplicationWatchFaceService.getComplicationId(ComplicationLocation.CENTER);
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


    public void retrieveInitialComplicationsData() {
        final int[] complicationIds = ComplicationWatchFaceService.getComplicationIds();

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


    // Verifies the watch face supports the complication location, then launches the helper
    // class, so user can choose their complication data provider.

    private void launchComplicationHelperActivity(ComplicationLocation complicationLocation) {
        mSelectedComplicationId = ComplicationWatchFaceService.getComplicationId(complicationLocation);

        if (mSelectedComplicationId >= 0) {
            int[] supportedTypes = ComplicationWatchFaceService.getSupportedComplicationTypes(complicationLocation);

            startActivityForResult(ComplicationHelperActivity.createProviderChooserHelperIntent(
                    getApplicationContext(),
                    mWatchFaceComponentName,
                    mSelectedComplicationId,
                    supportedTypes),
                    ComplicationConfigActivity.COMPLICATION_CONFIG_REQUEST_CODE
            );
        } else {
            Log.d(TAG, "Complication not supported by watch face.");
        }
    }

    public void updateComplicationViews(int watchFaceComplicationId, ComplicationProviderInfo complicationProviderInfo) {
        Log.d(TAG, "updateComplicationViews(): id: " + watchFaceComplicationId);
        Log.d(TAG, "\tinfo: " + complicationProviderInfo);

        if (watchFaceComplicationId == mTopComplicationId) {
            if (complicationProviderInfo != null) {
                topComplication.setImageIcon(complicationProviderInfo.providerIcon);
                topComplicationBackground.setVisibility(View.INVISIBLE);
            } else {
                topComplication.setImageDrawable(defaultAddComplicationDrawable);
                topComplicationBackground.setVisibility(View.VISIBLE);
            }
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
}