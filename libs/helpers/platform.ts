/**
 * Various platform helpers to determine which api is being used or target platfom
 */
export function isApiRc(url: string) {
  return url.indexOf('api-rc') > -1;
}

export function isApiBeta(url: string) {
  return url.indexOf('api-beta') > -1;
}

export function isApiProd(url: string) {
  return url.indexOf('api-prod') > -1;
}

/**
 * Mobile helpers
 */

declare var NSObject, NSString, android, java;

/**
 * Determine if running on native iOS mobile app
 */
export function isIOS() {
  return typeof NSObject !== 'undefined' && typeof NSString !== 'undefined';
}

/**
 * Determine if running on native Android mobile app
 */
export function isAndroid() {
  return typeof android !== 'undefined' && typeof java !== 'undefined';
}

/**
 * Determine if running on native iOS or Android mobile app
 */
export function isNativeScript() {
  return isIOS() || isAndroid();
}
