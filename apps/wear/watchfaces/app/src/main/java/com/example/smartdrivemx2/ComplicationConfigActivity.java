package com.example.smartdrivemx2;

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
        LEFT,
        BACKGROUND,
        CENTER
    }

    private int mLeftComplicationId;
    private int mBackgroundComplicationId;
    private int mCenterComplicationId;

    // Selected complication id by user.
    private int mSelectedComplicationId;

    // ComponentName used to identify a specific service that renders the watch face.
    private ComponentName mWatchFaceComponentName;

    // Required to retrieve complication data from watch face for preview.
    private ProviderInfoRetriever mProviderInfoRetriever;

    private ImageView mLeftComplicationBackground;
    private ImageView mBackgroundComplicationBackground;
    private ImageView mCenterComplicationBackground;

    private ImageButton mLeftComplication;
    private ImageButton mBackgroundComplication;
    private ImageButton mCenterComplication;

    private Drawable mDefaultAddComplicationDrawable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_config);

        mDefaultAddComplicationDrawable = getDrawable(R.drawable.add_complication);


        mSelectedComplicationId = -1;

        mLeftComplicationId =
                ComplicationWatchFaceService.getComplicationId(ComplicationLocation.LEFT);
        mBackgroundComplicationId =
                ComplicationWatchFaceService.getComplicationId(ComplicationLocation.BACKGROUND);
        mCenterComplicationId =
                ComplicationWatchFaceService.getComplicationId(ComplicationLocation.CENTER);

        mWatchFaceComponentName =
                new ComponentName(getApplicationContext(), ComplicationWatchFaceService.class);

        // Sets up left complication preview.
        mLeftComplicationBackground = findViewById(R.id.left_complication_background);
        mLeftComplication = findViewById(R.id.left_complication);
        mLeftComplication.setOnClickListener(this);

        // Sets default as "Add Complication" icon.
        mLeftComplication.setImageDrawable(mDefaultAddComplicationDrawable);
        mLeftComplicationBackground.setVisibility(View.INVISIBLE);

        // Sets up right complication preview.
        mBackgroundComplicationBackground = findViewById(R.id.background_complication_background);
        mBackgroundComplication = findViewById(R.id.background_complication);
        mBackgroundComplication.setOnClickListener(this);

        // Sets default as "Add Complication" icon.
        mBackgroundComplication.setImageDrawable(mDefaultAddComplicationDrawable);
        mBackgroundComplicationBackground.setVisibility(View.INVISIBLE);

        // Sets up center complication preview.
        mCenterComplicationBackground = findViewById(R.id.center_complication_background);
        mCenterComplication = findViewById(R.id.center_complication);
        mCenterComplication.setOnClickListener(this);

        // Sets default as "Add Complication" icon.
        mCenterComplication.setImageDrawable(mDefaultAddComplicationDrawable);
        mCenterComplicationBackground.setVisibility(View.INVISIBLE);


        // Initialization of code to retrieve active complication data for the watch face.
        mProviderInfoRetriever =
                new ProviderInfoRetriever(getApplicationContext(), Executors.newCachedThreadPool());
        mProviderInfoRetriever.init();

        retrieveInitialComplicationsData();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();


        // Required to release retriever for active complication data.
        mProviderInfoRetriever.release();
    }


    public void retrieveInitialComplicationsData() {

        final int[] complicationIds = ComplicationWatchFaceService.getComplicationIds();

        mProviderInfoRetriever.retrieveProviderInfo(
                new ProviderInfoRetriever.OnProviderInfoReceivedCallback() {
                    @Override
                    public void onProviderInfoReceived(
                            int watchFaceComplicationId,
                            @Nullable ComplicationProviderInfo complicationProviderInfo) {

                        Log.d(TAG, "onProviderInfoReceived: " + complicationProviderInfo);

                        updateComplicationViews(watchFaceComplicationId, complicationProviderInfo);
                    }
                },
                mWatchFaceComponentName,
                complicationIds);
    }

    @Override
    public void onClick(View view) {
        if (view.equals(mCenterComplication)) {
            Log.d(TAG, "Center Complication click()");
            launchComplicationHelperActivity(ComplicationLocation.CENTER);

        } else if (view.equals(mBackgroundComplication)) {
            Log.d(TAG, "Background Complication click()");
            launchComplicationHelperActivity(ComplicationLocation.BACKGROUND);
        } else if (view.equals(mLeftComplication)) {
            Log.d(TAG, "Left Complication click()");
            launchComplicationHelperActivity(ComplicationLocation.LEFT);
        }
    }

    // Verifies the watch face supports the complication location, then launches the helper
    // class, so user can choose their complication data provider.

    private void launchComplicationHelperActivity(ComplicationLocation complicationLocation) {

        mSelectedComplicationId =
                ComplicationWatchFaceService.getComplicationId(complicationLocation);

        if (mSelectedComplicationId >= 0) {

            int[] supportedTypes =
                    ComplicationWatchFaceService.getSupportedComplicationTypes(
                            complicationLocation);

            startActivityForResult(
                    ComplicationHelperActivity.createProviderChooserHelperIntent(
                            getApplicationContext(),
                            mWatchFaceComponentName,
                            mSelectedComplicationId,
                            supportedTypes),
                    ComplicationConfigActivity.COMPLICATION_CONFIG_REQUEST_CODE);

        } else {
            Log.d(TAG, "Complication not supported by watch face.");
        }
    }

    public void updateComplicationViews(
            int watchFaceComplicationId, ComplicationProviderInfo complicationProviderInfo) {
        Log.d(TAG, "updateComplicationViews(): id: " + watchFaceComplicationId);
        Log.d(TAG, "\tinfo: " + complicationProviderInfo);

        if (watchFaceComplicationId == mLeftComplicationId) {
            if (complicationProviderInfo != null) {
                mLeftComplication.setImageIcon(complicationProviderInfo.providerIcon);
                mLeftComplicationBackground.setVisibility(View.VISIBLE);

            } else {
                mLeftComplication.setImageDrawable(mDefaultAddComplicationDrawable);
                mLeftComplicationBackground.setVisibility(View.INVISIBLE);
            }

        } else if (watchFaceComplicationId == mBackgroundComplicationId) {
            if (complicationProviderInfo != null) {
                mBackgroundComplication.setImageIcon(complicationProviderInfo.providerIcon);
                mBackgroundComplicationBackground.setVisibility(View.VISIBLE);

            } else {
                mBackgroundComplication.setImageDrawable(mDefaultAddComplicationDrawable);
                mBackgroundComplicationBackground.setVisibility(View.INVISIBLE);
            }
        } else if (watchFaceComplicationId == mCenterComplicationId) {
            if (complicationProviderInfo != null) {
                mCenterComplication.setImageIcon(complicationProviderInfo.providerIcon);
                mCenterComplicationBackground.setVisibility(View.VISIBLE);

            } else {
                mCenterComplication.setImageDrawable(mDefaultAddComplicationDrawable);
                mCenterComplicationBackground.setVisibility(View.INVISIBLE);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {


        if (requestCode == COMPLICATION_CONFIG_REQUEST_CODE && resultCode == RESULT_OK) {

            // Retrieves information for selected Complication provider.
            ComplicationProviderInfo complicationProviderInfo =
                    data.getParcelableExtra(ProviderChooserIntent.EXTRA_PROVIDER_INFO);
            Log.d(TAG, "Provider: " + complicationProviderInfo);

            if (mSelectedComplicationId >= 0) {
                updateComplicationViews(mSelectedComplicationId, complicationProviderInfo);
            }
        }
    }
}