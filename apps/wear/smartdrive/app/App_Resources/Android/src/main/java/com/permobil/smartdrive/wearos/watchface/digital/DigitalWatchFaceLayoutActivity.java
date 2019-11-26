package com.permobil.smartdrive.wearos.watchface.digital;

import android.os.Bundle;
import android.support.wearable.activity.WearableActivity;

import com.permobil.smartdrive.wearos.R;

public class DigitalWatchFaceLayoutActivity extends WearableActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.watchface_layout);
        // Enables Always-on
        setAmbientEnabled();
    }
}
