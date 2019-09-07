package com.permobil.pushtracker.wearos;

import android.net.Uri;

public class SmartDriveUsageProvider {
  public static final String CONTENT_AUTHORITY = "com.permobil.smartdrive.wearos.smartdrive.usage";
  /*
   * Use CONTENT_AUTHORITY to create the base of all URI's which apps will use to contact
   * the content provider for Sunshine.
   */
  public static final Uri BASE_CONTENT_URI = Uri.parse("content://" + CONTENT_AUTHORITY);

  public static final String TYPE_USAGE = "UsageRecord";
  public static final String TYPE_AUTHORIZATION_TOKEN = "AuthorizationToken";
  public static final String TYPE_USER_ID = "UserId";

  public static final int ID_INDEX = 0;
  public static final int TYPE_INDEX = 1;
  public static final int DATA_INDEX = 2;

  /* The base CONTENT_URI used to query the Usage table from the content provider */
  public static final Uri USAGE_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_USAGE)
    .build();

  public static final Uri AUTHORIZATION_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_AUTHORIZATION_TOKEN)
    .build();

  public static final Uri USER_ID_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_USER_ID)
    .build();
}
