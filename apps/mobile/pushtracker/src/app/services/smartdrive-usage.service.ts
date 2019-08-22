import { Injectable } from '@angular/core';
import {
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';

@Injectable()
export class SmartDriveUsageService {
  private datastore = KinveyDataStore.collection('SmartDriveUsage');
  public dailyActivity: any;
  public weeklyActivity: any;

  constructor(private _logService: LoggingService) {
    this.login();
    this.datastore.sync();
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
      query.equalTo('data_type', 'SmartDriveDailyInfo');

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
      query.equalTo('data_type', 'SmartDriveWeeklyInfo');

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

}