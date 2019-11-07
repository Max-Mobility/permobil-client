import { DISTANCE_UNITS } from '../enums';

export function milesToKilometers(miles: number) {
  return miles * 1.60934;
}

export function kilometersToMiles(km: number) {
  return km * 0.621371;
}

export function convertToMilesIfUnitPreferenceIsMiles(
  distance: number,
  unit_preference: string
) {
  if (unit_preference === DISTANCE_UNITS.MILES) {
    return kilometersToMiles(distance);
  }
  return distance;
}
