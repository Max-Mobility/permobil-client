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

  constructor(private _logService: LoggingService) {
    this.reset();
  }

  async reset() {
    this.login();

    // now set up the queries to make sure we don't sync more than we need to

    const _dailyQuery = this.makeQuery();
    // we only ever push data to the daily activity datastore - so
    // we should set a date that is far in the future to keep the
    // pulls from ever actually pulling data
    _dailyQuery.equalTo('date', '2200-01-01');
    // we actually want to have the weekly datastore storing data
    // locally for use when offline / bad network conditions (and to
    // not have to pull data that we've already seen) so we just set
    // the user id
    const _weeklyQuery = this.makeQuery();

    this.dailyDatastore.sync(_dailyQuery);
    this.weeklyDatastore.sync(_weeklyQuery);
  }

  clear() {
    this.dailyDatastore.clear();
    this.weeklyDatastore.clear();
  }

  async _query(db: any, query: KinveyQuery): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.find(query)
        .subscribe((data: any[]) => {
          resolve(data);
        }, (err) => {
          console.error('\n', 'error finding weekly activity', err);
          reject(err);
        }, () => {
          // this seems to be called right at the very end - after
          // we've gotten data, so this resolve will have been
          // superceded by the resolve(data) above
          resolve([]);
        });
    });
  }

  async dailyQuery(query: KinveyQuery): Promise<any[]> {
    return this._query(this.dailyDatastore, query);
  }

  async weeklyQuery(query: KinveyQuery): Promise<any[]> {
    return this._query(this.weeklyDatastore, query);
  }

  async getWeeklyActivityWithQuery(query: KinveyQuery): Promise<any[]> {
    // make sure the query only returns data that was created by this
    // user!
    query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
    return this.weeklyQuery(query);
  }

  async getWeeklyActivity(date?: string, limit?: number): Promise<any[]> {
    const query = new KinveyQuery();
    // configure the query to search for only activity that was
    // saved by this user, and to get only the most recent activity
    query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
    // set the date if they provided it
    if (date) {
      // make sure we only get the weekly activity we are looking for
      query.equalTo('date', date);
    }
    // set the limit if they provided it
    if (limit) {
      query.limit = limit;
    }
    // sort by last modified time descending
    query.descending('_kmd.lmt');
    return this.weeklyQuery(query);
  }

  async saveDailyActivityFromPushTracker(dailyActivity: any): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyActivity.date);

      // TODO: test this after the update to the Sync datastore type!

      return this.dailyQuery(query)
        .then((data: any[]) => {
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

    } catch (err) {
      this._logService.logBreadCrumb(ActivityService.name, 'Failed to save daily activity from pushtracker in Kinvey');
      // this._logService.logException(err);
      return false;
    }
  }

  private makeQuery() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      const query = new KinveyQuery();
      query.equalTo('_acl.creator', activeUser._id);
      return query;
    } else {
      throw new Error('no active user');
    }
  }

  private async login() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      // do nothing - we're good now
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
      coast_time_count: number;
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
