import { Injectable } from '@angular/core';
import {
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class SmartDriveUsageService {
  private datastore = KinveyDataStore.collection('SmartDriveUsage');
  public dailyActivity: any;
  public weeklyActivity: any;
  private _usageUpdated = new BehaviorSubject<boolean>(false);
  usageUpdated = this._usageUpdated.asObservable();

  constructor(private _logService: LoggingService) {
    this.login();
    this.datastore.sync();
  }

  async saveDailyUsageFromPushTracker(dailyUsage: any): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyUsage.date);
      query.equalTo('data_type', 'SmartDriveDailyInfo');

      // Run a .find first to get the _id of the daily activity
      {
        const stream = this.datastore.find(query);
        return stream.toPromise().then(data => {
          if (data && data.length) {
            const id = data[0]._id;
            dailyUsage._id = id;
            dailyUsage.distance_smartdrive_drive_start = data[0].distance_smartdrive_drive_start;
            dailyUsage.distance_smartdrive_coast_start = data[0].distance_smartdrive_coast_start;
          }
          else {
            // First record for this day
            // Save distance_start
            dailyUsage.distance_smartdrive_drive_start = dailyUsage.distance_smartdrive_drive;
            dailyUsage.distance_smartdrive_coast_start = dailyUsage.distance_smartdrive_coast;
          }
          return this.datastore.save(dailyUsage)
            .then(function onSuccess(entity) {
              return true;
            }).catch(function onError(error) {
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
      return stream.toPromise().then(data => {
        if (data && data.length) {
          this.dailyActivity = data[0];
          // Do something with data
          this._usageUpdated.next(true);
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
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('_kmd.lmt');
      query.limit = 1;
      query.equalTo('data_type', 'SmartDriveWeeklyInfo');

      if (weekStartDate) {
        const month = weekStartDate.getMonth() + 1;
        const day = weekStartDate.getDate();
        query.equalTo('date',
          weekStartDate.getFullYear() + '/' +
          (month < 10 ? '0' + month : month) + '/' +
          (day < 10 ? '0' + day : day));
        const stream = this.datastore.find(query);
        return stream.toPromise().then(data => {
          if (data && data.length) {
            this.weeklyActivity = data[0];
            // Do something with data
            this._usageUpdated.next(true);
            return true;
          }
          this.weeklyActivity = [];
          return false;
        });
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
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.descending('date');
      query.equalTo('data_type', 'SmartDriveWeeklyInfo');

      if (weekStartDate) {
        const month = weekStartDate.getMonth() + 1;
        const day = weekStartDate.getDate();
        query.lessThanOrEqualTo('date',
          weekStartDate.getFullYear() + '/' +
          (month < 10 ? '0' + month : month) + '/' +
          (day < 10 ? '0' + day : day));
        query.limit = limit;

        const stream = this.datastore.find(query);
        return stream.toPromise().then(data => {
          if (data && data.length) {
            this.weeklyActivity = data[0];
            // Do something with data
            this._usageUpdated.next(true);
            return true;
          }
          this.weeklyActivity = [];
          return false;
        });
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