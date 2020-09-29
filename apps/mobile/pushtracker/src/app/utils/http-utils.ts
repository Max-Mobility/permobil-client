import { User as KinveyUser } from '@bradmartin/kinvey-nativescript-sdk';
import { Http as TNS_HTTP } from '@nativescript/core';
import { Log } from '@permobil/core/src';
import { APP_KEY } from '@permobil/nativescript';

const BASE_URL = `https://baas.kinvey.com/appdata/${APP_KEY}/`;

export function getJSONFromKinvey(queryString: string): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
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
        if (resp) {
          resolve(resp.content.toJSON());
        }
      })
      .catch(err => {
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
