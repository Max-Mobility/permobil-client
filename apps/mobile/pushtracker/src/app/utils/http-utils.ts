import { Log } from '@permobil/core/src';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import * as TNS_HTTP from 'tns-core-modules/http';
import { APP_KEY } from './kinvey-keys';

const BASE_URL = `https://baas.kinvey.com/appdata/${APP_KEY}/`;

export function getJSONFromKinvey(queryString: string): Promise<any> {
  return new Promise((resolve, reject) => {
    Log.D('HTTPUtils | getJSONFromKinvey query string =', queryString);
    const kinveyActiveUser = KinveyUser.getActiveUser();

    TNS_HTTP.request({
      url: encodeURI(`${BASE_URL}${queryString}`),
      method: 'GET',
      headers: {
        Accept: 'application/json; charset=utf-8',
        Authorization: `Kinvey ${kinveyActiveUser._kmd.authtoken}`,
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json'
      }
    })
      .then(resp => {
        Log.D('HTTPUtils | getJSONFromKinvey | Received data!');
        if (resp) {
          resolve(resp.content.toJSON());
        }
      })
      .catch(err => {
        Log.E(err);
        reject(err);
      });
  });
}

export function getUserDataFromKinvey() {
  return new Promise((resolve, reject) => {
    const kinveyActiveUser = KinveyUser.getActiveUser();
    TNS_HTTP.request({
      url: encodeURI(
        `https://baas.kinvey.com/user/${APP_KEY}/${kinveyActiveUser._id}`
      ),
      method: 'GET',
      headers: {
        Authorization: 'Kinvey ' + kinveyActiveUser['_kmd']['authtoken'],
        'Content-Type': 'application/json'
      }
    })
      .then(resp => {
        if (resp) {
          resolve(resp.content.toJSON());
        }
      })
      .catch(err => {
        Log.E(err);
        reject(err);
      });
  });
}
