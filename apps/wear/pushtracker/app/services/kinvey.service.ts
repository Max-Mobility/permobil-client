import { Injectable } from 'injection-js';
import { device } from 'tns-core-modules/platform';
import { request } from 'tns-core-modules/http';

@Injectable()
export class KinveyService {
  public static api_base = 'https://baas.kinvey.com';
  public static api_file_route = '/blob/';
  public static api_data_route = '/appdata/';
  public static api_app_key = 'kid_SyIIDJjdM';
  public static api_error_db = '/SmartDriveErrors';
  public static api_info_db = '/SmartDriveUsage';
  public static api_settings_db = '/SmartDriveSettings';
  public static api_activity_db = '/PushTrackerActivity';

  private _auth: string = null;

  constructor() {
    // configure authorization here:
    const authorizationToEncode = new java.lang.String(
      'bradwaynemartin@gmail.com:testtest'
    );
    const data = authorizationToEncode.getBytes(
      java.nio.charset.StandardCharsets.UTF_8
    );
    this._auth =
      'Basic ' +
      android.util.Base64.encodeToString(data, android.util.Base64.NO_WRAP);
  }

  private reformatForDb(o) {
    // remove fields we don't want in the db
    delete o.id;
    delete o.uuid;
    delete o.has_been_sent;
    // set watch_uuid for log
    o.watch_uuid = device.uuid;
  }

  getFile(
    fileId?: string,
    queries?: any,
    limit?: number,
    sort?: any,
    skip?: any
  ) {
    let url =
      KinveyService.api_base +
      KinveyService.api_file_route +
      KinveyService.api_app_key;
    if (fileId) {
      url += `/${fileId}`;
    }
    const argObj = {
      query: queries,
      limit: limit,
      sort: sort,
      skip: skip
    };
    const args = Object.keys(argObj).filter(a => argObj[a]);
    if (args.length) {
      url += '?' + args.map(a => `${a}=${JSON.stringify(argObj[a])}`).join('&');
    }
    return request({
      url: url,
      method: 'GET',
      headers: {
        Authorization: this._auth
      }
    });
  }

  getEntry(db: string, queries?: any, limit?: number, sort?: any, skip?: any) {
    let url =
      KinveyService.api_base +
      KinveyService.api_data_route +
      KinveyService.api_app_key +
      db;
    const argObj = {
      query: queries,
      limit: limit,
      sort: sort,
      skip: skip
    };
    const args = Object.keys(argObj).filter(a => argObj[a]);
    if (args.length) {
      url += '?' + args.map(a => `${a}=${JSON.stringify(argObj[a])}`).join('&');
    }
    return request({
      url: url,
      method: 'GET',
      headers: {
        Authorization: this._auth
      }
    });
  }

  post(db: string, content: any) {
    const url =
      KinveyService.api_base +
      KinveyService.api_data_route +
      KinveyService.api_app_key +
      db;
    return request({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(content)
    });
  }

  put(db: string, content: any, id: any) {
    const url =
      KinveyService.api_base +
      KinveyService.api_data_route +
      KinveyService.api_app_key +
      db +
      `/${id}`;
    return request({
      url: url,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(content)
    });
  }

  sendError(error: any, id?: string) {
    this.reformatForDb(error);
    if (id) return this.put(KinveyService.api_error_db, error, id);
    else return this.post(KinveyService.api_error_db, error);
  }

  sendInfo(info: any, id?: string) {
    this.reformatForDb(info);
    if (id) return this.put(KinveyService.api_info_db, info, id);
    else return this.post(KinveyService.api_info_db, info);
  }

  sendActivity(activity: any, id?: string) {
    this.reformatForDb(activity);
    if (id) return this.put(KinveyService.api_activity_db, activity, id);
    else return this.post(KinveyService.api_activity_db, activity);
  }

  sendSettings(settings: any, id?: string) {
    this.reformatForDb(settings);
    if (id) return this.put(KinveyService.api_settings_db, settings, id);
    else return this.post(KinveyService.api_settings_db, settings);
  }
}
