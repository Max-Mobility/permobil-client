import { device } from '@nativescript/core/platform';
import { Injectable } from 'injection-js';
import { KinveyService } from '../../../../../@permobil/nativescript/src/services/kinvey.service';

@Injectable()
export class SmartDriveKinveyService extends KinveyService {

  constructor() {
    super();
  }

  private reformatForDb(o: any) {
    // remove fields we don't want in the db
    o._id = o.uuid;
    delete o.id;
    delete o.uuid;
    delete o.has_been_sent;
    // set watch_uuid for log
    o.watch_uuid = device.uuid;
    o.watch_serial_number = this.watch_serial_number || 'not_provided';
  }

  async sendError(error: any, id?: string) {
    this.checkAuth();
    this.reformatForDb(error);
    let response = null;
    if (id) response = await this.put(KinveyService.api_error_db, error, id);
    else response = await this.post(KinveyService.api_error_db, error);
    return response;
  }

  async sendInfo(info: any, id?: string) {
    this.checkAuth();
    this.reformatForDb(info);
    let response = null;
    if (id) response = await this.put(KinveyService.api_info_db, info, id);
    else response = await this.post(KinveyService.api_info_db, info);
    return response;
  }

  async sendActivity(activity: any, id?: string) {
    this.checkAuth();
    this.reformatForDb(activity);
    let response = null;
    if (id)
      response = await this.put(KinveyService.api_activity_db, activity, id);
    else response = await this.post(KinveyService.api_activity_db, activity);
    return response;
  }

  async sendSettings(settings: any, id?: string) {
    this.checkAuth();
    this.reformatForDb(settings);
    let response = null;
    if (id)
      response = await this.put(KinveyService.api_settings_db, settings, id);
    else response = await this.post(KinveyService.api_settings_db, settings);
    return response;
  }
}
