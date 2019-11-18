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

  private _query: KinveyQuery;

  constructor(private _logService: LoggingService) {
    this.reset();
  }

  async reset() {
    this.login();
    this.datastore.sync(this._query);
  }

  clear() {
    this.datastore.clear();
  }

  async saveDailyErrorsFromPushTracker(dailyErrors: any): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyErrors.date);

      // Run a .find first to get the _id of the daily activity
      {
        return this.datastore
          .find(query)
          .subscribe((data: any[]) => {
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
              })
              .catch((error) => {
                this._logService.logException(error);
                return false;
              });
          }, (err) => {
            this._logService.logException(err);
            return false;
          }, () => {
          });
      }

    } catch (err) {
      this._logService.logBreadCrumb(SmartDriveErrorsService.name, 'Failed to save daily errors from pushtracker in Kinvey');
      // his._logService.logException(err);
      return false;
    }
  }

  private async login() {
    const activeUser = KinveyUser.getActiveUser();
    if (!!activeUser) {
      this._query = new KinveyQuery();
      this._query.equalTo('_acl.creator', activeUser._id);
      // since this is the errors service - we don't actually want to
      // pull anything from the server, so we set an arbitrary date in
      // the future which will prevent any data download
      this._query.equalTo('date', '2200-01-01');
    } else {
      throw new Error('no active user');
    }
  }

}
