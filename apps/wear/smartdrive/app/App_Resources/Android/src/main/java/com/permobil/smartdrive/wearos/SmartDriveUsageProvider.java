package com.permobil.smartdrive.wearos;

import java.io.FileNotFoundException;
import java.io.IOException;

import android.content.ContentProvider;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.database.SQLException;
import android.net.Uri;
import android.text.TextUtils;
import android.util.Log;


public class SmartDriveUsageProvider extends ContentProvider {

  /*
   * Actual data storage interface
   */
  private DatabaseHandler db;

  /*
   * These constant will be used to match URIs with the data we are looking for. We will take
   * advantage of the UriMatcher class to make that matching MUCH easier than doing something
   * ourselves, such as using regular expressions.
   */
  public static final int CODE_USAGE = 100;
  public static final int CODE_AUTHORIZATION = 200;
  public static final int CODE_USER_ID = 201;

  /* The URI Matcher used by this content provider. */
  private static final UriMatcher sUriMatcher = buildUriMatcher();

  /**
   * Creates the UriMatcher that will match each URI to the CODE_USAGE
   *
   * UriMatcher does all the hard work for you. You just have to tell it which code to match
   * with which URI, and it does the rest automatically.
   *
   * @return A UriMatcher that correctly matches the constants for CODE_USAGE
   */
  public static UriMatcher buildUriMatcher() {

    /*
     * All paths added to the UriMatcher have a corresponding code to return when a match is
     * found. The code passed into the constructor of UriMatcher here represents the code to
     * return for the root URI. It's common to use NO_MATCH as the code for this case.
     */
    final UriMatcher matcher = new UriMatcher(UriMatcher.NO_MATCH);
    final String authority = DatabaseHandler.CONTENT_AUTHORITY;

    /*
     * For each type of URI you want to add, create a corresponding code. Preferably, these are
     * constant fields in your class so that you can use them throughout the class and you no
     * they aren't going to change. In Usage, we use CODE_USAGE
     */

    /* This URI is content://com.permobil.smartdrive.wearos.usage/usage/ */
    matcher.addURI(authority, DatabaseHandler.TYPE_USAGE, CODE_USAGE);
    /* This URI is content://com.permobil.smartdrive.wearos.usage/usage/ */
    matcher.addURI(authority, DatabaseHandler.TYPE_AUTHORIZATION_TOKEN, CODE_AUTHORIZATION);
    /* This URI is content://com.permobil.smartdrive.wearos.usage/usage/ */
    matcher.addURI(authority, DatabaseHandler.TYPE_USER_ID, CODE_USER_ID);

    return matcher;
  }

  /**
   * In onCreate, we initialize our content provider on startup. This method is called for all
   * registered content providers on the application main thread at application launch time.
   * It must not perform lengthy operations, or application startup will be delayed.
   *
   * @return true if the provider was successfully loaded, false otherwise
   */
  @Override
  public boolean onCreate() {
    db = new DatabaseHandler(getContext());
    return db != null;
  }

  @Override
  public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {

    Cursor cursor;

    switch (sUriMatcher.match(uri)) {
    case CODE_USAGE: {
      Log.d("SmartDriveUsageProvider", "getting cursor for type usage");
      cursor = db.getCursor(DatabaseHandler.TYPE_USAGE);
      break;
    }
    case CODE_AUTHORIZATION: {
      Log.d("SmartDriveUsageProvider", "getting cursor for type authorization");
      cursor = db.getCursor(DatabaseHandler.TYPE_AUTHORIZATION_TOKEN);
      break;
    }
    case CODE_USER_ID: {
      Log.d("SmartDriveUsageProvider", "getting cursor for type user id");
      cursor = db.getCursor(DatabaseHandler.TYPE_USER_ID);
      break;
    }

    default:
      throw new UnsupportedOperationException("Unknown uri: " + uri);
    }

    cursor.setNotificationUri(getContext().getContentResolver(), uri);
    return cursor;
  }

  @Override
  public String getType(Uri uri) {
    return null;
  }

  @Override
  public Uri insert(Uri uri, ContentValues values) {
    String data = values.getAsString("data");
    switch (sUriMatcher.match(uri)) {
    case CODE_USAGE: {
      Log.d("SmartDriveUsageProvider", "updating record: " + data);
      long _id = db.updateRecord(data, DatabaseHandler.TYPE_USAGE);
      if (_id != -1) {
        /*
         * This will help to broadcast that database has been changed,
         * and will inform entities to perform automatic update.
         */
        getContext().getContentResolver().notifyChange(uri, null);
      }

      return DatabaseHandler.buildUsageUriWithId(_id);
    }
    case CODE_AUTHORIZATION: {
      Log.d("SmartDriveUsageProvider", "updating record: " + data);
      long _id = db.updateRecord(data, DatabaseHandler.TYPE_AUTHORIZATION_TOKEN);
      if (_id != -1) {
        /*
         * This will help to broadcast that database has been changed,
         * and will inform entities to perform automatic update.
         */
        getContext().getContentResolver().notifyChange(uri, null);
      }

      return DatabaseHandler.buildAuthorizationUriWithId(_id);
    }
    case CODE_USER_ID: {
      Log.d("SmartDriveUsageProvider", "updating record: " + data);
      long _id = db.updateRecord(data, DatabaseHandler.TYPE_USER_ID);
      if (_id != -1) {
        /*
         * This will help to broadcast that database has been changed,
         * and will inform entities to perform automatic update.
         */
        getContext().getContentResolver().notifyChange(uri, null);
      }

      return DatabaseHandler.buildUserIdUriWithId(_id);
    }
    default:
      return null;
    }
  }

  @Override
  public int delete(Uri uri, String selection, String[] selectionArgs) {
    return 0;
  }

  @Override
  public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
    return 0;
  }
}
