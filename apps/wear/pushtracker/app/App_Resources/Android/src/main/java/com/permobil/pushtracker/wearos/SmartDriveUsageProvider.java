package com.permobil.pushtracker.wearos;

import android.net.Uri;

public class SmartDriveUsageProvider {
  public static final String CONTENT_AUTHORITY = "com.permobil.smartdrive.wearos.smartdrive.usage";
  /*
   * Use CONTENT_AUTHORITY to create the base of all URI's which apps will use to contact
   * the content provider for Sunshine.
   */
  public static final Uri BASE_CONTENT_URI = Uri.parse("content://" + CONTENT_AUTHORITY);

  /*
   * Database related stuff:
   */
  public static final String TABLE_NAME = "DailyUsage";

  /* The base CONTENT_URI used to query the Usage table from the content provider */
  public static final Uri CONTENT_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TABLE_NAME)
    .build();
}
