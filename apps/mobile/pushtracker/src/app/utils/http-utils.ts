import { Log } from '@permobil/core/src';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import * as TNS_HTTP from 'tns-core-modules/http';
import { APP_KEY } from './kinvey-keys';

const BASE_USER_URL = `https://baas.kinvey.com/user/${APP_KEY}/`;
const BASE_URL = `https://baas.kinvey.com/appdata/${APP_KEY}/`;

export function getJSONFromKinvey(queryString: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('querying for json from kinvey');

    console.log(queryString);
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
        console.log('got the data', resp);
        if (resp) {
          const data = resp.content.toJSON();
          console.log('data', data);
          resolve(resp.content.toJSON());
        }
      })
      .catch(err => {
        Log.E(err);
        reject(err);
      });
  });
}
