package com.permobil.smartdrive.wearos;

import android.content.ContentValues;
import android.content.Context;
import android.database.AbstractWindowedCursor;
import android.database.Cursor;
import android.database.CursorWindow;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.net.Uri;
import android.util.Log;

import io.sentry.Sentry;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class DatabaseHandler extends SQLiteOpenHelper {
  public static final String CONTENT_AUTHORITY = "com.permobil.smartdrive.wearos.smartdrive.usage";
  /*
   * Use CONTENT_AUTHORITY to create the base of all URI's which apps will use to contact
   * the content provider for Sunshine.
   */
  public static final Uri BASE_CONTENT_URI = Uri.parse("content://" + CONTENT_AUTHORITY);


  /*
   * Database related stuff:
   */
  private static final String TAG = "DatabaseHandler";
  // Database Version
  private static final int DATABASE_VERSION = 1;
  // Database Name
  public static final String DATABASE_NAME = "SmartDriveInfo";
  // Table name
  public static final String TABLE_NAME = "DailyUsage";
  // Table Columns names
  public static final String KEY_ID = "id";
  public static final String KEY_DATA = "data";

  public static final int ID_INDEX = 0;
  public static final int DATA_INDEX = 1;

  private Context mContext;

  /* The base CONTENT_URI used to query the Usage table from the content provider */
  public static final Uri CONTENT_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TABLE_NAME)
    .build();

  public class Record {
    int id;
    String data;
  }

  /**
   * Builds a URI that adds the task _ID to the end of the usage content URI path.
   * This is used to query details about a single usage entry by _ID. This is what we
   * use for the detail view query.
   *
   * @param id Unique id pointing to that row
   * @return Uri to query details about a single usage entry
   */
  public static Uri buildUsageUriWithId(long id) {
    return CONTENT_URI.buildUpon()
      .appendPath(Long.toString(id))
      .build();
  }

  public DatabaseHandler(Context context) {
    super(context, DATABASE_NAME, null, DATABASE_VERSION);
    mContext = context;
  }

  @Override
  public void onCreate(SQLiteDatabase db) {
    try {
      String CREATE_TABLE_ACTIVITYDATA = "CREATE TABLE " + TABLE_NAME + "(" +
        KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT," +
        KEY_DATA + " TEXT " +
        ")";
      db.execSQL(CREATE_TABLE_ACTIVITYDATA);
    } catch (Exception e) {
      Log.e(TAG, "exception creating table: " + e.getMessage());
    }
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    // Drop older table if existed
    db.execSQL("DROP TABLE IF EXISTS " + TABLE_NAME);
    // Create tables again
    onCreate(db);
  }

  // Insert values to the table
  synchronized public long updateRecord(String data) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();
    long _id = 0;
    try {
      values.put(KEY_ID, 0);
      values.put(KEY_DATA, data);
      Log.d(TAG, "Updating RECORD in SQL Table");
      _id = db.insertWithOnConflict(TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    } catch (Exception e) {
      Log.e(TAG, "Exception updating data in table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
    return _id;
  }

  synchronized public Record getRecord() {
    Record record = new Record();
    String selectQuery = "SELECT * FROM " + TABLE_NAME;
    selectQuery += " ORDER BY " + KEY_ID + " ASC LIMIT 1";

    SQLiteDatabase db = this.getReadableDatabase();
    Cursor cursor = db.rawQuery(selectQuery, null);

    CursorWindow cw;
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
      cw = new CursorWindow("getRecordCursor", 20000000);
    } else {
      cw = new CursorWindow("getRecordCursor");
    }
    AbstractWindowedCursor ac = (AbstractWindowedCursor) cursor;
    ac.setWindow(cw);

    // if TABLE has rows
    if (cursor.moveToFirst()) {
      try {
        int index = cursor.getInt(ID_INDEX);
        record.id = index;
        record.data = cursor.getString(DATA_INDEX);
        Log.d(TAG, "record id: " + index);
      } catch (Exception e) {
        Log.e(TAG, "Exception getting record from db:" + e.getMessage());
        Sentry.capture(e);
      }
    }

    cursor.close();
    db.close();
    Log.d(TAG, "Returning SQLite Record");
    return record;
  }

  synchronized public Cursor getCursor() {
    String selectQuery = "SELECT * FROM " + TABLE_NAME;
    selectQuery += " ORDER BY " + KEY_ID + " ASC LIMIT 1";

    SQLiteDatabase db = this.getReadableDatabase();
    Cursor cursor = db.rawQuery(selectQuery, null);
    return cursor;
  }

  synchronized public long getTableRowCount() {
    SQLiteDatabase db = this.getReadableDatabase();
    long count = DatabaseUtils.queryNumEntries(db, TABLE_NAME);
    Log.d(TAG, "Current SQLite Table Row Count: " + count);
    db.close();
    return count;
  }

  synchronized public long getTableSizeBytes() {
    File f = mContext.getDatabasePath(DATABASE_NAME);
    return f.length();
  }

  synchronized public void deleteRecord(int id) {
    SQLiteDatabase db = this.getWritableDatabase();
    db.delete(TABLE_NAME, KEY_ID + "=?", new String[]{Integer.toString(id)});
    Log.d(TAG, "Deleted record from database with id: " + id);
    db.close();
  }

  synchronized public void deleteDatabase_DO_YOU_KNOW_WHAT_YOU_ARE_DOING() {
    SQLiteDatabase db = this.getWritableDatabase();
    db.delete(DATABASE_NAME, null, null);
    Log.d(TAG, "Deleting entire database.");
    db.close();
  }
}
