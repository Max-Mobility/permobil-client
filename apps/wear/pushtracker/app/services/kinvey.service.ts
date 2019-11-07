import { PushTrackerKinveyKeys } from '@maxmobility/private-keys';
import { request } from '@nativescript/core/http';
import { Injectable } from 'injection-js';

@Injectable()
export class KinveyService {
  public static api_base = PushTrackerKinveyKeys.HOST_URL;
  public static api_user_route = '/user/';
  public static api_file_route = '/blob/';
  public static api_data_route = '/appdata/';
  public static api_app_key = PushTrackerKinveyKeys.DEV_KEY;
  public static api_app_secret = PushTrackerKinveyKeys.DEV_SECRET;
  public static api_login = '/login';
  public static api_logout = '/logout';
  public static api_error_db = '/SmartDriveErrors';
  public static api_info_db = '/DailySmartDriveUsage';
  public static api_settings_db = '/SmartDriveSettings';
  public static api_activity_db = '/DailyPushTrackerActivity';

  private _auth: string = null;
  private _userId: string = null;
  public watch_serial_number: string = null;

  constructor() {
    // TODO: try to load authorization from ContentProvider
  }

  public hasAuth() {
    return this._auth !== null;
  }

  private checkAuth() {
    if (this._auth === null) {
      throw 'Login credentials not provided!';
    }
  }

  public wasGoodStatus(statusCode: number) {
    return (
      statusCode === 200 ||
      statusCode === 201 ||
      (statusCode >= 200 && statusCode < 300)
    );
  }

  public wasInvalidCredentials(statusCode: number) {
    return (
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 422 ||
      (statusCode >= 400 && statusCode < 500)
    );
  }

  private handleBadStatus(statusCode: number) {
    if (this.wasInvalidCredentials(statusCode)) {
      // we have an invalid token now - invalidate the credentials!
      this._auth = null;
    }
  }

  private handleResponse(response: any) {
    const statusCode = response && response.statusCode;
    if (!this.wasGoodStatus(statusCode)) {
      console.error('KinveyService bad statuscode:', statusCode);
      this.handleBadStatus(statusCode);
      throw response;
    }
    return response.content.toJSON();
  }

  private makeAuth(un: string, pw: string) {
    const authorizationToEncode = new java.lang.String(`${un}:${pw}`);
    const data = authorizationToEncode.getBytes(
      java.nio.charset.StandardCharsets.UTF_8
    );
    return (
      'Basic ' +
      android.util.Base64.encodeToString(data, android.util.Base64.NO_WRAP)
    );
  }

  public async setAuth(newAuth: string, userId: string) {
    try {
      // see if we can get the user info
      await this.getUser(newAuth, userId);
      // if we do then set the auth / id accordingly
      this._auth = newAuth;
      this._userId = userId;
      return true;
    } catch (err) {
      console.error('error getting user info', err);
      // reset to null if login failed
      this._auth = null;
      this._userId = null;
      return false;
    }
  }

  public async getUserData() {
    try {
      const user = await this.getUser(this._auth, this._userId);
      return user;
    } catch (err) {
      return undefined;
    }
  }

  public async updateUser(data: any) {
    this.checkAuth();
    const url =
      KinveyService.api_base +
      KinveyService.api_user_route +
      KinveyService.api_app_key +
      `/${this._userId}`;
    const response = await request({
      url: url,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  private async getUser(auth: string, userId: string) {
    const url =
      KinveyService.api_base +
      KinveyService.api_user_route +
      KinveyService.api_app_key +
      `/${userId}`;
    const response = await request({
      url: url,
      method: 'GET',
      headers: {
        Authorization: auth
      }
    });
    return this.handleResponse(response);
  }

  public async login(username: string, password: string) {
    const url =
      KinveyService.api_base +
      KinveyService.api_user_route +
      KinveyService.api_app_key +
      KinveyService.api_login;
    const content = {
      username,
      password
    };
    const response = await request({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.makeAuth(
          KinveyService.api_app_key,
          KinveyService.api_app_secret
        )
      },
      content: JSON.stringify(content)
    });
    return this.handleResponse(response);
  }

  async getFile(
    fileId?: string,
    queries?: any,
    limit?: number,
    sort?: any,
    skip?: any
  ) {
    // NOTE: This is the only kinvey service function which *DOES
    // NOT REQUIRE USER AUTHENTICATION*, so we don't need to check
    // this.hasAuth() OR this.checkAuth()
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
    const response = await request({
      url: url,
      method: 'GET',
      headers: {
        Authorization: this.makeAuth(
          KinveyService.api_app_key,
          KinveyService.api_app_secret
        )
      }
    });
    return this.handleResponse(response);
  }

  async getEntry(
    db: string,
    queries?: any,
    limit?: number,
    sort?: any,
    skip?: any
  ) {
    this.checkAuth();
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
    const response = await request({
      url: url,
      method: 'GET',
      headers: {
        Authorization: this._auth
      }
    });
    return this.handleResponse(response);
  }

  async post(db: string, content: any) {
    this.checkAuth();
    const url =
      KinveyService.api_base +
      KinveyService.api_data_route +
      KinveyService.api_app_key +
      db;
    const response = await request({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(content)
    });
    return this.handleResponse(response);
  }

  async put(db: string, content: any, id: any) {
    this.checkAuth();
    const url =
      KinveyService.api_base +
      KinveyService.api_data_route +
      KinveyService.api_app_key +
      db +
      `/${id}`;
    const response = await request({
      url: url,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(content)
    });
    return this.handleResponse(response);
  }
}
