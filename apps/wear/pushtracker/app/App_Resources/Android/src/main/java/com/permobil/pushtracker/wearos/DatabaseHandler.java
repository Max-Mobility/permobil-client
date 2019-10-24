package com.permobil.pushtracker;

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

import com.google.gson.Gson;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class DatabaseHandler extends SQLiteOpenHelper {
  public class Record {
    String data = null;
    String date = null;
    String id = null;
    boolean has_been_sent = false;
  }

  public static final String CONTENT_AUTHORITY = "com.permobil.pushtracker.data";
  /*
   * Use CONTENT_AUTHORITY to create the base of all URI's which apps will use to contact
   * the content provider for Sunshine.
   */
  public static final Uri BASE_CONTENT_URI = Uri.parse("content://" + CONTENT_AUTHORITY);

  public static final String TYPE_AUTHORIZATION_TOKEN = "AuthorizationToken";
  public static final String TYPE_USER_ID = "UserId";

  /**
   * Database related stuff:
   */
  private Context mContext;

  private static final String TAG = "DatabaseHandler";

  // Database Version
  private static final int DATABASE_VERSION = 1;

  // Database Name
  public static final String DATABASE_NAME = "PushTrackerDatabase";

  // Tables
  public static final String CONTENT_TABLE_NAME = "SharedData";
  public static final String ACTIVITY_TABLE_NAME = "DailyActivity";

  // Table info for ACTIVITY_TABLE_NAME
  public static final String KEY_ID = "id";
  public static final String KEY_DATA = "data";
  public static final String KEY_DATE = "date";
  public static final String KEY_UUID = "uuid";
  public static final String KEY_HAS_BEEN_SENT = "has_been_sent";
  public static final int ID_INDEX = 0;
  public static final int DATA_INDEX = 1;
  public static final int DATE_INDEX = 2;
  public static final int UUID_INDEX = 3;
  public static final int HAS_BEEN_SENT_INDEX = 4;

  // Table info for CONTENT_TABLE_NAME
  public static final String KEY_TYPE = "type";
  public static final int TYPE_INDEX = 2;
  private static final int TYPE_AUTHORIZATION_TOKEN_UUID = 0;
  private static final int TYPE_USER_ID_UUID = 1;

  /* The base CONTENT_URI used to query the Usage table from the content provider */
  public static final Uri AUTHORIZATION_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_AUTHORIZATION_TOKEN)
    .build();
  public static final Uri USER_ID_URI = BASE_CONTENT_URI.buildUpon()
    .appendPath(TYPE_USER_ID)
    .build();

  /**
   * Builds a URI that adds the task _ID to the end of the usage content URI path.
   * This is used to query details about a single usage entry by _ID. This is what we
   * use for the detail view query.
   *
   * @param id Unique id pointing to that row
   * @return Uri to query details about a single usage entry
   */
  public static Uri buildAuthorizationUriWithId(long id) {
    return AUTHORIZATION_URI.buildUpon()
      .appendPath(Long.toString(id))
      .build();
  }
  public static Uri buildUserIdUriWithId(long id) {
    return USER_ID_URI.buildUpon()
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
      String CREATE_TABLE_ACTIVITYDATA = "CREATE TABLE " + ACTIVITY_TABLE_NAME + "(" +
        KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT," +
        KEY_DATA + " TEXT, " +
        KEY_DATE + " TEXT, " +
        KEY_UUID + " TEXT, " +
        KEY_HAS_BEEN_SENT + " INTEGER DEFAULT 0" +
        ")";
      db.execSQL(CREATE_TABLE_ACTIVITYDATA);
    } catch (Exception e) {
      Log.e(TAG, "exception creating table: " + e.getMessage());
    }
    try {
      String CREATE_TABLE_CONTENT = "CREATE TABLE " + CONTENT_TABLE_NAME + "(" +
        KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT," +
        KEY_DATA + " TEXT, " +
        KEY_TYPE + " TEXT " +
        ")";
      db.execSQL(CREATE_TABLE_CONTENT);
    } catch (Exception e) {
      Log.e(TAG, "exception creating table: " + e.getMessage());
    }
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    // Drop older table if existed
    db.execSQL("DROP TABLE IF EXISTS " + ACTIVITY_TABLE_NAME);
    db.execSQL("DROP TABLE IF EXISTS " + CONTENT_TABLE_NAME);
    // Create tables again
    onCreate(db);
  }

  /**
   * FOR CONTENT PROVIDER:
   */
  public long getUUID(String type) {
    long uuid = -1;
    if (type.equals(TYPE_AUTHORIZATION_TOKEN)) {
      uuid = TYPE_AUTHORIZATION_TOKEN_UUID;
    } else if (type.equals(TYPE_USER_ID)) {
      uuid = TYPE_USER_ID_UUID;
    }
    return uuid;
  }

  // Insert content to the table
  synchronized public long updateContent(String data, String type) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();
    long _id = 0;
    try {
      long uuid = getUUID(type);
      if (uuid != -1) {
        values.put(KEY_ID, uuid);
        values.put(KEY_DATA, data);
        values.put(KEY_TYPE, type);
        Log.d(TAG, "Updating RECORD in SQL Table");
        _id = db.insertWithOnConflict(CONTENT_TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_REPLACE);
      }
    } catch (Exception e) {
      Log.e(TAG, "Exception updating data in table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
    return _id;
  }

  synchronized public Cursor getCursor(String type) {
    String selectQuery = "SELECT * FROM " + CONTENT_TABLE_NAME;
    selectQuery += " WHERE " + KEY_TYPE + "=\"" + type + "\"";
    selectQuery += " ORDER BY " + KEY_ID + " ASC LIMIT 1";

    SQLiteDatabase db = this.getReadableDatabase();
    Cursor cursor = db.rawQuery(selectQuery, null);
    return cursor;
  }

  /**
   * FOR REGULAR DB FUNCTIONS!
   */

  // Insert values to the table
  synchronized public void addRecord(DailyActivity data) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();

    try {
      Gson gson = new Gson();
      String dataAsJSON = gson.toJson(data);
      values.put(KEY_UUID, data._id);
      int has_been_sent = data.has_been_sent ? 1 : 0;
      values.put(KEY_HAS_BEEN_SENT, has_been_sent);
      values.put(KEY_DATE, data.date);
      values.put(KEY_DATA, dataAsJSON);
      db.insert(ACTIVITY_TABLE_NAME, null, values);
      Log.d(TAG, "Saving new RECORD to SQL Table: " + data._id);
    } catch (Exception e) {
      Log.e(TAG, "Exception adding data to table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
  }

  synchronized public void markRecordAsSent(String id) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();

    try {
      values.put(KEY_HAS_BEEN_SENT, 1);
      String whereString = KEY_UUID + "=\"" + id + "\"";
      String[] whereArgs = {};
      db.update(ACTIVITY_TABLE_NAME, values, whereString, whereArgs);
      Log.d(TAG, "Marking record as sent in SQL Table: " + id);
    } catch (Exception e) {
      Log.e(TAG, "Exception marking record as sent in table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
  }

  synchronized public void updateRecord(DailyActivity data) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();

    try {
      Gson gson = new Gson();
      String dataAsJSON = gson.toJson(data);
      int has_been_sent = data.has_been_sent ? 1 : 0;
      values.put(KEY_HAS_BEEN_SENT, has_been_sent);
      values.put(KEY_DATA, dataAsJSON);
      String whereString = KEY_UUID + "=\"" + data._id + "\"";
      String[] whereArgs = {};
      db.update(ACTIVITY_TABLE_NAME, values, whereString, whereArgs);
      Log.d(TAG, "Updating RECORD in SQL Table: " + data._id);
    } catch (Exception e) {
      Log.e(TAG, "Exception updating data in table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
  }

  synchronized public DailyActivity getMostRecent(boolean onlyUnsent) {
    DailyActivity record = null;
    String selectQuery = "SELECT * FROM " + ACTIVITY_TABLE_NAME;
    if (onlyUnsent) {
      selectQuery += " WHERE " + KEY_HAS_BEEN_SENT + "=0";
    }
    selectQuery += " ORDER BY " + KEY_ID + " DESC";
    selectQuery += " LIMIT " + 1;
    SQLiteDatabase db = this.getReadableDatabase();
    Cursor cursor = db.rawQuery(selectQuery, null);

    CursorWindow cw;
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
      cw = new CursorWindow("getRecordsCursor", 20000000);
    } else {
      cw = new CursorWindow("getRecordsCursor");
    }
    AbstractWindowedCursor ac = (AbstractWindowedCursor) cursor;
    ac.setWindow(cw);

    // if TABLE has rows
    if (cursor.moveToFirst()) {
      Gson gson = new Gson();
      try {
        int index = cursor.getInt(ID_INDEX);
        // set the record
        record = gson.fromJson(cursor.getString(DATA_INDEX), DailyActivity.class);
        String uuid = cursor.getString(UUID_INDEX);
        Log.d(TAG, "record id: " + index + " - " + uuid);
      } catch (Exception e) {
        Log.e(TAG, "Exception parsing json:" + e.getMessage());
        Sentry.capture(e);
      }
    }

    cursor.close();
    db.close();
    Log.d(TAG, "Returning SQLite Record: " + record);
    return record;
  }

  synchronized public List<DailyActivity> getRecords(int numRecords, boolean onlyUnsent) {
    List<DailyActivity> recordList = new ArrayList<>();
    String selectQuery = "SELECT * FROM " + ACTIVITY_TABLE_NAME;
    if (onlyUnsent) {
      selectQuery += " WHERE " + KEY_HAS_BEEN_SENT + "=0";
    }
    selectQuery += " ORDER BY " + KEY_ID + " ASC";
    if (numRecords > 0) {
      selectQuery += " LIMIT " + numRecords;
    }
    SQLiteDatabase db = this.getReadableDatabase();
    Cursor cursor = db.rawQuery(selectQuery, null);

    CursorWindow cw;
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
      cw = new CursorWindow("getRecordsCursor", 20000000);
    } else {
      cw = new CursorWindow("getRecordsCursor");
    }
    AbstractWindowedCursor ac = (AbstractWindowedCursor) cursor;
    ac.setWindow(cw);

    // if TABLE has rows
    if (cursor.moveToFirst()) {
      Gson gson = new Gson();
      try {
        // Loop through the table rows
        do {
          int index = cursor.getInt(ID_INDEX);
          DailyActivity record = gson.fromJson(cursor.getString(DATA_INDEX), DailyActivity.class);
          String uuid = cursor.getString(UUID_INDEX);
          Log.d(TAG, "record id: " + index + " - " + uuid);
          // Add record to list
          recordList.add(record);
        } while (cursor.moveToNext());
      } catch (Exception e) {
        Log.e(TAG, "Exception parsing json:" + e.getMessage());
        Sentry.capture(e);
      }
    }

    cursor.close();
    db.close();
    Log.d(TAG, "Returning SQLite RecordList with record count: " + recordList.size());
    return recordList;
  }

  synchronized public Record getRecord(boolean onlyUnsent) {
    Record record = new Record();
    String selectQuery = "SELECT * FROM " + ACTIVITY_TABLE_NAME;
    if (onlyUnsent) {
      selectQuery += " WHERE " + KEY_HAS_BEEN_SENT + "=0";
    }
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
        record.data = cursor.getString(DATA_INDEX);
        record.date = cursor.getString(DATE_INDEX);
        record.id = cursor.getString(UUID_INDEX);
        record.has_been_sent = (cursor.getInt(HAS_BEEN_SENT_INDEX) != 0);
        Log.d(TAG, "record id: " + index + " - " + record.id);
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

  synchronized public long getTableRowCount() {
    SQLiteDatabase db = this.getReadableDatabase();
    long count = DatabaseUtils.queryNumEntries(db, ACTIVITY_TABLE_NAME);
    Log.d(TAG, "Current SQLite Table Row Count: " + count);
    db.close();
    return count;
  }

  synchronized public long countUnsentEntries() {
    SQLiteDatabase db = this.getReadableDatabase();
    String selection = KEY_HAS_BEEN_SENT + "=0";
    long count = DatabaseUtils.queryNumEntries(db, ACTIVITY_TABLE_NAME, selection);
    Log.d(TAG, "Current SQLite Table Unsent Row Count: " + count);
    db.close();
    return count;
  }

  synchronized public long getTableSizeBytes() {
    File f = mContext.getDatabasePath(DATABASE_NAME);
    return f.length();
  }

  synchronized public void deleteRecord(String id) {
    SQLiteDatabase db = this.getWritableDatabase();
    db.delete(ACTIVITY_TABLE_NAME, KEY_UUID + "=?", new String[]{id});
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
