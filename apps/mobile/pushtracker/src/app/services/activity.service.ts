import { Injectable } from '@angular/core';
import {
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';
import * as TNSHTTP from 'tns-core-modules/http';
import { Log } from '@permobil/core';
import { YYYY_MM_DD } from '../utils';

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
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyActivity.date);
      query.equalTo('data_type', 'DailyActivity');

      // Run a .find first to get the _id of the daily activity
      {
        const stream = this.datastore.find(query);
        return stream.toPromise().then(data => {
          if (data && data.length) {
            const id = data[0]._id;
            dailyActivity._id = id;
          }
          return this.datastore.save(dailyActivity)
            .then((entity) => {
              return true;
            }).catch((error) => {
              this._logService.logException(error);
              return false;
            });
        });
      }

    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  async loadDailyActivity(date: Date): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.lmt');
      query.limit = 1;
      query.equalTo(
        'date',
        YYYY_MM_DD(date)
      );
      query.equalTo('data_type', 'DailyActivity');

      const stream = this.datastore.find(query);
      return stream.toPromise().then(data => {
        if (data && data.length) {
          this.dailyActivity = data[0];
          return true;
        }
        this.dailyActivity = {};
        return false;
      });
    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  async loadWeeklyActivity(weekStartDate: Date): Promise<boolean> {
    const date = YYYY_MM_DD(weekStartDate);

    try {
      const queryString = '?query={"_acl.creator":"' + KinveyUser.getActiveUser()._id + '","data_type":"WeeklyActivity","date":"' + date + '"}&limit=1&sort={"_kmd.lmt": -1}';
      return TNSHTTP.request({
        url:
          'https://baas.kinvey.com/appdata/kid_rkoCpw8VG/PushTrackerActivity' + queryString,
        method: 'GET',
        headers: {
          Accept: 'application/json; charset=utf-8',
          'Accept-Encoding': 'gzip',
          Authorization:
            'Kinvey 904de4dc-f5c5-4b75-b506-fd2ee601c631.x/ZbF//c1ZXSzbakn+pMp31ct4t3ZoF1+hapoGlrmDo=',
          'Content-Type': 'application/json'
        }
      })
      .then(resp => {
        const data = resp.content.toJSON();
        if (data && data.length) {
          this.weeklyActivity = data[0];
          Log.D('Loaded weekly activity');
          return true;
        }
        this.weeklyActivity = [];
        return false;
      })
      .catch(err => {
        console.log(err);
        this.weeklyActivity = [];
        return false;
      });
    } catch (err) {
      this._logService.logException(err);
      return false;
    }
  }

  async loadAllWeeklyActivityTill(weekStartDate: Date, limit: number = 1): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('date');
      query.equalTo('data_type', 'WeeklyActivity');

      if (weekStartDate) {
        query.lessThanOrEqualTo('date',
          YYYY_MM_DD(weekStartDate));

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
