package com.permobil.pushtracker;

import android.net.Uri;

public class AuthorizationHandler {
  public static final String AUTHORIZATION_CONTENT_AUTHORITY = "com.permobil.pushtracker.data";
  public static final Uri AUTHORIZATION_BASE_CONTENT_URI = Uri.parse("content://" + AUTHORIZATION_CONTENT_AUTHORITY);
  public static final String TYPE_AUTHORIZATION_TOKEN = "AuthorizationToken";
  public static final String TYPE_USER_ID = "UserId";

  /* The base CONTENT_URI used to query the Usage table from the content provider */
  public static final Uri AUTHORIZATION_URI = AUTHORIZATION_BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_AUTHORIZATION_TOKEN)
    .build();
  public static final Uri USER_ID_URI = AUTHORIZATION_BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_USER_ID)
    .build();
  public static final int AUTHORIZATION_DATA_INDEX = 1;
  public static final int USER_ID_DATA_INDEX = 1;
}
