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
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteQueryBuilder;
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
    matcher.addURI(authority, DatabaseHandler.TABLE_NAME, CODE_USAGE);

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
    db = new DatabaseHelper(getContext());
    return db != null;
  }

  @Nullable
  @Override
  public Cursor query(@NonNull Uri uri, @Nullable String[] projection, @Nullable String selection, @Nullable String[] selectionArgs, @Nullable String sortOrder) {

    Cursor cursor;

    switch (sUriMatcher.match(uri)) {
    case CODE_USAGE: {
      cursor = db.getCursor();
      break;
    }

    default:
      throw new UnsupportedOperationException("Unknown uri: " + uri);
    }

    cursor.setNotificationUri(getContext().getContentResolver(), uri);
    return cursor;
  }

  @Nullable
  @Override
  public String getData(@NonNull Uri uri) {

    String data = null;

    switch (sUriMatcher.match(uri)) {
    case CODE_USAGE: {
      data = db.getRecord();
      break;
    }

    default:
      throw new UnsupportedOperationException("Unknown uri: " + uri);
    }

    return data;
  }

  @Nullable
  @Override
  public String getType(@NonNull Uri uri) {
    return null;
  }

  @Nullable
  @Override
  public Uri insert(@NonNull Uri uri, @Nullable String data) {
    switch (sUriMatcher.match(uri)) {
    case CODE_USAGE:

      long _id = db.updateRecord(data);
      if (_id != -1) {
        /*
         * This will help to broadcast that database has been changed,
         * and will inform entities to perform automatic update.
         */
        getContext().getContentResolver().notifyChange(uri, null);
      }

      return DatabaseHandler.buildUsageUriWithId(_id);

    default:
      return null;
    }
  }

  @Override
  public int delete(@NonNull Uri uri, @Nullable String selection, @Nullable String[] selectionArgs) {
    return 0;
  }

  @Override
  public int update(@NonNull Uri uri, @Nullable ContentValues values, @Nullable String selection, @Nullable String[] selectionArgs) {
    return 0;
  }
}