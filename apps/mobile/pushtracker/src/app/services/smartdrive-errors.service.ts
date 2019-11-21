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
export class SmartDriveErrorsService {
  private datastore = KinveyDataStore.collection('DailyPushTrackerErrors', DataStoreType.Sync);
  public dailyActivity: any;
  public weeklyActivity: any;
  private _usageUpdated = new BehaviorSubject<boolean>(false);
  usageUpdated = this._usageUpdated.asObservable();

  constructor(private _logService: LoggingService) {
    this.reset();
  }

  async reset() {
    this.login();
    const query = this.makeQuery();
    // since this is the errors service - we don't actually want to
    // pull anything from the server, so we set an arbitrary date in
    // the future which will prevent any data download
    query.equalTo('date', '2200-01-01');
    this.datastore.sync(query);
  }

  clear() {
    this.datastore.clear();
  }

  async _query(query: KinveyQuery): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.datastore.find(query)
        .subscribe((data: any[]) => {
          resolve(data);
        }, (err) => {
          console.error('\n', 'error finding error by query', err);
          reject(err);
        }, () => {
          // this seems to be called right at the very end - after
          // we've gotten data, so this resolve will have been
          // superceded by the resolve(data) above
          resolve([]);
        });
    });
  }

  async saveDailyErrorsFromPushTracker(dailyErrors: any): Promise<boolean> {
    try {
      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      const query = this.makeQuery();
      query.equalTo('date', dailyErrors.date);

      // Run a .find first to get the _id of the daily activity
      return this._query(query)
        .then((data: any[]) => {
          if (data && data.length) {
            const id = data[0]._id;
            dailyErrors._id = id;
            // Accumulate errors w/ saved info in DB
            dailyErrors.num_battery_voltage_errors += data[0].num_battery_voltage_errors || 0;
            dailyErrors.num_over_current_errors += data[0].num_over_current_errors || 0;
            dailyErrors.num_motor_phase_errors += data[0].num_motor_phase_errors || 0;
            dailyErrors.num_gyro_range_errors += data[0].num_gyro_range_errors || 0;
            dailyErrors.num_over_temperature_errors += data[0].num_over_temperature_errors || 0;
            dailyErrors.num_ble_disconnect_errors += data[0].num_ble_disconnect_errors || 0;
          }
          return this.datastore.save(dailyErrors)
            .then((_) => {
              return true;
            });
        })
        .catch((error) => {
          this._logService.logException(error);
          return false;
        });
    } catch (err) {
      this._logService.logBreadCrumb(SmartDriveErrorsService.name, 'Failed to save daily errors from pushtracker in Kinvey');
      // his._logService.logException(err);
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
      // do nothing - we're good
    } else {
      throw new Error('no active user');
    }
  }

}
