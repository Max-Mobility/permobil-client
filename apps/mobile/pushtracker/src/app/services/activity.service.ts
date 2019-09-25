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
  private datastore = KinveyDataStore.collection('DailyPushTrackerActivity', DataStoreType.Auto);
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

      // Run a .find first to get the _id of the daily activity
      {
        const stream = this.datastore.find(query);
        return stream.toPromise().then(data => {
          if (data && data.length) {
            const id = data[0]._id;
            dailyActivity._id = id;
          }
          return this.datastore.save(dailyActivity)
            .then((_) => {
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

  private login(): Promise<any> {
    if (!!KinveyUser.getActiveUser()) {
      return Promise.resolve();
    } else {
      return Promise.reject('no active user');
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
