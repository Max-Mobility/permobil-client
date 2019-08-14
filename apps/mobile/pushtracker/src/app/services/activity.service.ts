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

  constructor(private _logService: LoggingService) {}

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

  async loadWeeklyActivity(from: Date, to: Date): Promise<boolean> {
    console.log(from, to);
    try {
      await this.login();
      await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.ect');
      query.limit = 1;

      const daysInWeek = [];
      while (!this._areDaysSame(from, to)) {
        const month = from.getMonth() + 1;
        const day = from.getDate();
        daysInWeek.push(
          from.getFullYear() +
            '/' +
            (month < 10 ? '0' + month : month) +
            '/' +
            (day < 10 ? '0' + day : day)
        );
        from.setDate(from.getDate() + 1);
      }
      const toMonth = to.getMonth() + 1;
      const toDay = to.getDate();
      daysInWeek.push(
        to.getFullYear() +
          '/' +
          (toMonth < 10 ? '0' + toMonth : toMonth) +
          '/' +
          (toDay < 10 ? '0' + toDay : toDay)
      );
      query.contains('date', daysInWeek);

      const stream = this.datastore.find(query);
      const data = await stream.toPromise();
      if (data && data.length) {
        this.weeklyActivity = data;
        // Do something with data
        return true;
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
