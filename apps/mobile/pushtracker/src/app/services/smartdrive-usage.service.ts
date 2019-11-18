import { Injectable } from '@angular/core';
import {
  DataStoreType as DataStoreType,
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';
import { BehaviorSubject } from 'rxjs';
import { connectionType, getConnectionType } from '@nativescript/core/connectivity';

@Injectable()
export class SmartDriveUsageService {
  private dailyDatastore = KinveyDataStore.collection('DailySmartDriveUsage', DataStoreType.Sync);
  private weeklyDatastore = KinveyDataStore.collection('WeeklySmartDriveUsage', DataStoreType.Sync);
  public dailyActivity: any;
  public weeklyActivity: any;
  private _usageUpdated = new BehaviorSubject<boolean>(false);
  usageUpdated = this._usageUpdated.asObservable();

  private _query: KinveyQuery;

  constructor(private _logService: LoggingService) {
    this.reset();
  }

  async reset() {
    this.login();
    this.dailyDatastore.sync(this._query);
    this.weeklyDatastore.sync(this._query);
  }

  clear() {
    this.dailyDatastore.clear();
    this.weeklyDatastore.clear();
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
        return this.dailyDatastore.find(query)
          .then(data => {
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
            return this.dailyDatastore.save(dailyUsage);
          })
          .then((_) => {
            return true;
          })
          .catch((error) => {
            this._logService.logException(error);
            return false;
          });
      }

    } catch (err) {
      this._logService.logBreadCrumb(SmartDriveUsageService.name, 'Failed to save daily usage from pushtracker in Kinvey');
      // this._logService.logException(err);
      return false;
    }
  }

  private async login() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      this._query = new KinveyQuery();
      // we are only interested in the usage data for this user
      this._query.equalTo('_acl.creator', activeUser._id);
    } else {
      throw new Error('no active user');
    }
  }

}
