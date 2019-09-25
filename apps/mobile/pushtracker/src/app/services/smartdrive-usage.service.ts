import { Injectable } from '@angular/core';
import {
  DataStoreType as DataStoreType,
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class SmartDriveUsageService {
  private datastore = KinveyDataStore.collection('DailySmartDriveUsage', DataStoreType.Auto);
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