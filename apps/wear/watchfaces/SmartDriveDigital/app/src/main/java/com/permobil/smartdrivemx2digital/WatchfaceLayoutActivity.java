package com.permobil.smartdrivemx2digital;

import android.os.Bundle;
import android.support.wearable.activity.WearableActivity;

public class WatchfaceLayoutActivity extends WearableActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.watchface_layout);
        // Enables Always-on
        setAmbientEnabled();
    }
}
