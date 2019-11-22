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

  constructor(private _logService: LoggingService) {
    this.reset();
  }

  async reset() {
    this.login();
    this.refreshDaily();
    this.refreshWeekly();
  }

  refreshDaily() {
    const _dailyQuery = this.makeQuery();
    // we only ever push data to the daily activity datastore - so
    // we should set a date that is far in the future to keep the
    // pulls from ever actually pulling data
    _dailyQuery.equalTo('date', '2200-01-01');
    return this.dailyDatastore.sync(_dailyQuery);
  }

  refreshWeekly() {
    // we actually want to have the weekly datastore storing data
    // locally for use when offline / bad network conditions (and to
    // not have to pull data that we've already seen) so we just set
    // the user id
    const _weeklyQuery = this.makeQuery();
    return this.weeklyDatastore.sync(_weeklyQuery);
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
    // configure the query to search for only activity that was
    // saved by this user, and to get only the most recent activity
    const query = this.makeQuery();
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

  async saveDailyUsageFromPushTracker(dailyUsage: any): Promise<boolean> {
    try {
      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      const query = this.makeQuery();
      query.equalTo('date', dailyUsage.date);

      // TODO: test this after the update to the Sync datastore type!

      // Run a .find first to get the _id of the daily activity
      return this.dailyQuery(query)
        .then((data: any[]) => {
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

    } catch (err) {
      this._logService.logBreadCrumb(SmartDriveUsageService.name, 'Failed to save daily usage from pushtracker in Kinvey');
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
