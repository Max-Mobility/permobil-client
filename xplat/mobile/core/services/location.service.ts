import { Injectable } from '@angular/core';
import { MapboxKeys } from '@maxmobility/private-keys';
import { Kinvey } from 'kinvey-nativescript-sdk';
import * as geolocation from 'nativescript-geolocation';
import * as httpModule from 'tns-core-modules/http';
import { Accuracy } from 'tns-core-modules/ui/enums'; // used to describe at what accuracy the location should be get

// see https://www.mapbox.com/api-documentation/?language=cURL#retrieve-places-near-a-location

@Injectable()
export class LocationService {
  static getCoordinates(): Promise<any> {
    // Get current location with high accuracy
    return geolocation.getCurrentLocation({
      desiredAccuracy: Accuracy.high,
      maximumAge: 5000,
      timeout: 20000
    });
  }

  static getLocation(): Promise<string> {
    return LocationService.getCoordinates().then(coords => {
      return LocationService.coordToLocation(coords);
    });
  }

  static getLocationData(): Promise<any> {
    let coords = {};
    return LocationService.getCoordinates()
      .then(_coords => {
        coords = _coords;
        return LocationService.coordToLocation(coords);
      })
      .then(place_name => {
        return Object.assign(coords, { place_name: place_name });
      });
  }

  static coordToLocation(coord: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const userLoc = `${coord.longitude},${coord.latitude}`;
      const user = Kinvey.User.getActiveUser();
      const userData = ((user && user.data) || {}) as any;
      const lang = userData.language ? '&language=' + userData.language : '';
      const query =
        'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
        userLoc +
        '.json?access_token=' +
        MapboxKeys.MAPBOX_TOKEN +
        lang;

      // TODO: might also add '&types=postcode' to the query to only get postcode
      httpModule.getJSON(query).then(
        r => {
          // const location = (r as any).features.filter(f => f.place_type.indexOf('postcode') > -1)[0].place_name;
          // BRAD - using POI to get street address
          // postcode on the place_type filter only returns city, state, zip

          const location = (r as any).features.filter(
            f => f.place_type.indexOf('address') > -1
          )[0].place_name;
          resolve(location);
        },
        e => {
          reject(`Couldn't get location: ${e}`);
        }
      );
    });
  }
}
