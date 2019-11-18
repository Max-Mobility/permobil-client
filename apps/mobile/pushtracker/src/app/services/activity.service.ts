import { Injectable } from '@angular/core';
import {
  DataStoreType as DataStoreType,
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';

@Injectable()
export class ActivityService {
  private dailyDatastore = KinveyDataStore.collection('DailyPushTrackerActivity', DataStoreType.Sync);
  private weeklyDatastore = KinveyDataStore.collection('WeeklyPushTrackerActivity', DataStoreType.Sync);
  public dailyActivity: any;
  public weeklyActivity: any;

  // queries used to control what data is stored on device for each
  // datastore
  private _dailyQuery: KinveyQuery;
  private _weeklyQuery: KinveyQuery;

  constructor(private _logService: LoggingService) {
    this.reset();
  }

  async reset() {
    this.login();
    this.dailyDatastore.sync(this._dailyQuery);
    this.weeklyDatastore.sync(this._weeklyQuery);
  }

  clear() {
    this.dailyDatastore.clear();
    this.weeklyDatastore.clear();
  }

  async saveDailyActivityFromPushTracker(dailyActivity: any): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyActivity.date);

      // Run a .find first to get the _id of the daily activity
      {
        return this.dailyDatastore.find(query)
          .then(data => {
            if (data && data.length) {
              const id = data[0]._id;
              dailyActivity._id = id;
            }
            return this.dailyDatastore.save(dailyActivity)
              .then((_) => {
                return true;
              }).catch((error) => {
                this._logService.logException(error);
                return false;
              });
          });
      }

    } catch (err) {
      this._logService.logBreadCrumb(ActivityService.name, 'Failed to save daily activity from pushtracker in Kinvey');
      // this._logService.logException(err);
      return false;
    }
  }

  private async login() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      // we only ever push data to the daily activity datastore - so
      // we should set a date that is far in the future to keep the
      // pulls from ever actually pulling data
      this._dailyQuery = new KinveyQuery();
      this._dailyQuery.equalTo('_acl.creator', activeUser._id);
      this._dailyQuery.equalTo('date', '2200-01-01');
      // we actually want to have the weekly datastore storing data
      // locally for use when offline / bad network conditions (and to
      // not have to pull data that we've already seen) so we just set
      // the user id
      this._weeklyQuery = new KinveyQuery();
      this._weeklyQuery.equalTo('_acl.creator', activeUser._id);
    } else {
      throw new Error('no active user');
    }
  }
}

namespace ActivityService {
  export interface Data {
    coast_time_avg: number;
    coast_time_total: number;
    date: string;
    distance_phone: number;
    distance_smartdrive_coast: number;
    distance_smartdrive_drive: number;
    has_been_sent: boolean;
    heart_rate: 0;
    lastPush: {
      activity: string;
      confidence: number;
      name: string;
      time: number;
    };
    push_count: number;
    [index: number]: {
      coast_time_avg: number;
      coast_time_total: number;
      distance_phone: number;
      distance_smartdrive_coast: number;
      distance_smartdrive_drive: number;
      distance_watch: number;
      heart_rate: number;
      push_count: number;
      start_time: number;
    };
    start_time: number;
  }
}
