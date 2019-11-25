package com.permobil.smartdrive.watchface;

import android.os.Bundle;
import android.support.wearable.activity.WearableActivity;

public class DigitalWatchFaceLayoutActivity extends WearableActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.watchface_layout);
        // Enables Always-on
        setAmbientEnabled();
    }
}
