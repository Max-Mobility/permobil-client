import { Injectable } from '@angular/core';
import {
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';

@Injectable()
export class ActivityService {
  private datastore = KinveyDataStore.collection('PushTrackerActivity');
  public dailyActivity: any;
  public weeklyActivity: any;

  constructor(private _logService: LoggingService) {
    this.login();
    this.datastore.sync();
  }

  async saveDailyActivityFromPushTracker(dailyActivity: any): Promise<boolean> {
    try {
      await this.login();
      await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyActivity.date);
      query.equalTo('data_type', 'DailyActivity');

      // Run a .find first to get the _id of the daily activity
      {
        const stream = this.datastore.find(query);
        const data = await stream.toPromise();
        if (data && data.length) {
          const id = data[0]._id;
          dailyActivity._id = id;
        }
        const promise = this.datastore.save(dailyActivity)
          .then(function onSuccess(entity) {
            return true;
          }).catch(function onError(error) {
            this._logService.logException(error);
            return false;
          });
      }

    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  async loadDailyActivity(date: Date): Promise<boolean> {
    try {
      await this.login();
      await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.ect');
      query.limit = 1;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      query.equalTo(
        'date',
        date.getFullYear() +
        '/' +
        (month < 10 ? '0' + month : month) +
        '/' +
        (day < 10 ? '0' + day : day)
      );
      query.equalTo('data_type', 'DailyActivity');

      const stream = this.datastore.find(query);
      const data = await stream.toPromise();
      if (data && data.length) {
        this.dailyActivity = data[0];
        // Do something with data
        return true;
      }
      this.dailyActivity = {};
      return false;
    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  async loadWeeklyActivity(weekStartDate: Date): Promise<boolean> {
    try {
      // await this.login();
      // await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.ect');
      query.limit = 1;
      query.equalTo('data_type', 'WeeklyActivity');

      if (weekStartDate) {

        const month = weekStartDate.getMonth() + 1;
        const day = weekStartDate.getDate();
        query.equalTo('date',
          weekStartDate.getFullYear() + '/' +
          (month < 10 ? '0' + month : month) + '/' +
          (day < 10 ? '0' + day : day));

        const stream = this.datastore.find(query);
        const data = await stream.toPromise();
        if (data && data.length) {
          this.weeklyActivity = data[0];
          // Do something with data
          return true;
        }
      }
      this.weeklyActivity = [];
      return false;
    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  async loadAllWeeklyActivityTill(weekStartDate: Date, limit: number = 1): Promise<boolean> {
    try {
      // await this.login();
      // await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('date');
      query.equalTo('data_type', 'WeeklyActivity');

      if (weekStartDate) {

        const month = weekStartDate.getMonth() + 1;
        const day = weekStartDate.getDate();
        query.lessThanOrEqualTo('date',
          weekStartDate.getFullYear() + '/' +
          (month < 10 ? '0' + month : month) + '/' +
          (day < 10 ? '0' + day : day));

        query.limit = limit;

        const stream = this.datastore.find(query);
        const data = await stream.toPromise();
        if (data && data.length) {
          this.weeklyActivity = data[0];
          // Do something with data
          return true;
        }
      }
      this.weeklyActivity = [];
      return false;
    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  private login(): Promise<any> {
    if (!!KinveyUser.getActiveUser()) {
      return Promise.resolve();
    } else {
      return Promise.reject('no active user');
    }
  }

  private _areDaysSame(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }
}

namespace ActivityService {
  export interface Data {
    coast_time_avg: number;
    coast_time_total: number;
    data_type: string;
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
