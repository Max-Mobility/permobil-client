import { Injectable } from '@angular/core';
import {
  DataStore as KinveyDataStore,
  Query as KinveyQuery,
  User as KinveyUser
} from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class SmartDriveErrorsService {
  private datastore = KinveyDataStore.collection('SmartDriveErrors');
  public dailyActivity: any;
  public weeklyActivity: any;
  private _usageUpdated = new BehaviorSubject<boolean>(false);
  usageUpdated = this._usageUpdated.asObservable();

  constructor(private _logService: LoggingService) {
    this.login();
    this.datastore.sync();
  }

  async saveDailyErrorsFromPushTracker(dailyErrors: any): Promise<boolean> {
    try {
      const query = new KinveyQuery();

      // configure the query to search for only activity that was
      // saved by this user, and to get only the most recent activity
      query.equalTo('_acl.creator', KinveyUser.getActiveUser()._id);
      query.equalTo('date', dailyErrors.date);
      query.equalTo('data_type', 'SmartDriveDailyErrors');

      // Run a .find first to get the _id of the daily activity
      {
        const stream = this.datastore.find(query);
        return stream.toPromise().then(data => {
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

  private login(): Promise<any> {
    if (!!KinveyUser.getActiveUser()) {
      return Promise.resolve();
    } else {
      return Promise.reject('no active user');
    }
  }

}