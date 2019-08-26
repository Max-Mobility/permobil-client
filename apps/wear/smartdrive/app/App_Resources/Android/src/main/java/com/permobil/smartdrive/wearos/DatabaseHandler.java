package com.permobil.pushtracker.wearos;

import android.content.ContentValues;
import android.content.Context;
import android.database.AbstractWindowedCursor;
import android.database.Cursor;
import android.database.CursorWindow;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import io.sentry.Sentry;

import com.google.gson.Gson;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class DatabaseHandler extends SQLiteOpenHelper {
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
  public static final String KEY_DATE = "date";

  public static final int ID_INDEX = 0;
  public static final int DATA_INDEX = 1;
  public static final int DATE_INDEX = 2;

  private Context mContext;

  public class Record {
    int id;
    String data;
    String date;
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
        KEY_DATA + " TEXT, " +
        KEY_DATE + " TEXT " +
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
  synchronized public void addRecord(Map data) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();

    try {
      Gson gson = new Gson();
      String dataAsJSON = gson.toJson(data);
      values.put(KEY_DATE, (string)data.get("date"));
      values.put(KEY_DATA, dataAsJSON);
      db.insert(TABLE_NAME, null, values);
      Log.d(TAG, "Saving new RECORD to SQL Table: " + (string)data.get("date"));
    } catch (Exception e) {
      Log.e(TAG, "Exception adding data to table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
  }
  synchronized public void updateRecord(Map data, int id) {
    SQLiteDatabase db = this.getWritableDatabase();
    ContentValues values = new ContentValues();

    try {
      Gson gson = new Gson();
      String dataAsJSON = gson.toJson(data);
      values.put(KEY_DATA, dataAsJSON);
      String whereString = KEY_ID + "=\"" + id + "\"";
      String[] whereArgs = {};
      db.update(TABLE_NAME, values, whereString, whereArgs);
      Log.d(TAG, "Updating RECORD in SQL Table: " + id + " - " + dataAsJSON);
    } catch (Exception e) {
      Log.e(TAG, "Exception updating data in table: " + e.getMessage());
      Sentry.capture(e);
    }

    db.close();
  }

  synchronized public String getMostRecent() {
    String record = null;
    String selectQuery = "SELECT * FROM " + TABLE_NAME;
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
        record = cursor.getString(DATA_INDEX);
        Log.d(TAG, "record id: " + index);
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

  synchronized public List<String> getRecords(int numRecords) {
    List<String> recordList = new ArrayList<>();
    String selectQuery = "SELECT * FROM " + TABLE_NAME;
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
          String record = cursor.getString(DATA_INDEX);
          Log.d(TAG, "record id: " + index);
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
        record.date = cursor.getString(DATE_INDEX);
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
    db.delete(TABLE_NAME, KEY_ID + "=?", new int[]{id});
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
