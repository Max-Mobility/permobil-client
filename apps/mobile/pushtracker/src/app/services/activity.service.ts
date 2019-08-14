import { Injectable } from '@angular/core';
import { Device, timeToString } from '@permobil/core';
import {
  DataStore as KinveyDataStore,
  User as KinveyUser,
  Query as KinveyQuery
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';

@Injectable()
export class ActivityService {
  private datastore = KinveyDataStore.collection('PushTrackerActivity');
  public activity: any;

  constructor(private _logService: LoggingService) { }

  async loadActivity(): Promise<boolean> {
    try {
      await this.login();
      await this.datastore.sync();
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.ect');
      query.limit = 1;

      const stream = this.datastore.find(query);
      const data = await stream.toPromise();
      if (data && data.length) {
        this.activity = data;
        // Do something with data
        return true;
      }
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
    lastPush: { activity: string, confidence: number, name: string, time: number };
    push_count: number;
    [index: number]: {
        coast_time_avg: number,
        coast_time_total: number,
        distance_phone: number,
        distance_smartdrive_coast: number,
        distance_smartdrive_drive: number,
        distance_watch: number,
        heart_rate: number,
        push_count: number,
        start_time: number
    };
    start_time: number;
  }
}