import { PushTracker } from '@maxmobility/core';
import { LocationService } from '@maxmobility/mobile';
import { Kinvey } from 'kinvey-nativescript-sdk';
import * as LS from 'nativescript-localstorage';
import { Observable } from 'tns-core-modules/data/observable';
import * as imageSource from 'tns-core-modules/image-source';

export class Record extends Observable {
  time: Date;
  geo: number[];
  location: string;
  user_id: string;

  constructor(obj?: any) {
    super();
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  fromObject(obj: any) {
    Object.assign(this, obj);
  }

  data(): any {
    const obj = {
      time: this.time,
      geo: this.geo,
      location: this.location,
      user_id: this.user_id
    };
    return obj;
  }

  getTime(): Date {
    return typeof this.time === 'string' ? new Date(this.time) : this.time;
  }
}

export class Demo extends Observable {
  // STATIC:
  static fsKeyPrefix = 'Demo.';
  static fsKeySDImage = 'SDImage';
  static fsKeyPTImage = 'PTImage';

  static upToDateBadge: string = String.fromCharCode(0xf133);
  static outOfDateBadge: string = String.fromCharCode(0xf159);

  static editableProperties = [
    'model',
    'geo',
    'location',
    'smartdrive_serial_number',
    'pushtracker_serial_number',
    'pt_version',
    'ble_version',
    'mcu_version',
    'pt_mac_addr',
    'sd_mac_addr',
    'sd_image',
    'sd_image_base64',
    'pt_image',
    'pt_image_base64'
  ];

  // NON STATIC:
  id = null;
  geo = [];
  owner_id = '';
  model = '';
  location = '';
  smartdrive_serial_number = '';
  pushtracker_serial_number = '';
  pt_version = '';
  ble_version = '';
  mcu_version = '';
  pt_mac_addr = '';
  sd_mac_addr = '';
  pt_image: any = null;
  sd_image: any = null;

  /**
   * Base64 string of the image saved for the Smart Drive unit.
   */
  sd_image_base64 = '';
  /**
   * Base64 string of the image saved for the PushTracker for the demo unit.
   */
  pt_image_base64 = '';
  usage: Record[] = [];

  get location_string(): string {
    if (this.location && this.location.length) {
      return this.location.trim();
    } else {
      return '??';
    }
  }

  version_badge(version: string, dev?: string): string {
    let badge = Demo.outOfDateBadge;
    if (dev && dev.length) {
      if (this.isDevUpToDate(dev, version)) {
        badge = Demo.upToDateBadge;
      }
    } else {
      if (this.isUpToDate(version)) {
        badge = Demo.upToDateBadge;
      }
    }
    return badge;
  }

  get version_string(): string {
    return [
      this.pt_version_string,
      this.mcu_version_string,
      this.ble_version_string
    ].join(', ');
  }

  get pt_version_string(): string {
    if (
      this.pt_version &&
      this.pt_version.length &&
      this.pt_version.includes('.')
    ) {
      return this.pt_version.trim();
    } else {
      return '??';
    }
  }

  get ble_version_string(): string {
    if (
      this.ble_version &&
      this.ble_version.length &&
      this.ble_version.includes('.')
    ) {
      return this.ble_version.trim();
    } else {
      return '??';
    }
  }

  get mcu_version_string(): string {
    if (
      this.mcu_version &&
      this.mcu_version.length &&
      this.mcu_version.includes('.')
    ) {
      return this.mcu_version.trim();
    } else {
      return '??';
    }
  }

  constructor(obj?: any) {
    super();
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  fromObject(obj: any) {
    Object.assign(this, obj);
    this.usage = this.usage.map(r => new Record(r));
    this.sortUsage();
  }

  data(): any {
    const obj = {
      geo: this.geo,
      usage: this.usage.map(r => {
        return r.data();
      })
    };
    Object.keys(this).map(k => {
      if (
        typeof this[k] === 'number' ||
        typeof this[k] === 'string' ||
        typeof this[k] === 'boolean'
      ) {
        obj[k] = this[k];
      }
    });
    return obj;
  }

  getSDImageFSKey(): string {
    const key = Demo.fsKeyPrefix + this.id + '.' + Demo.fsKeySDImage;
    return key;
  }

  getPTImageFSKey(): string {
    const key = Demo.fsKeyPrefix + this.id + '.' + Demo.fsKeyPTImage;
    return key;
  }

  loadImages() {
    this.loadPTImage();
    this.loadSDImage();
  }

  // saveImages() {
  //   this.savePTImage();
  //   this.saveSDImage();
  // }

  saveSDImage() {
    try {
      if (this.sd_image) {
        const picKey = this.getSDImageFSKey();
        const b64 = this.sd_image.toBase64String('png');
        LS.setItem(picKey, b64);
      }
    } catch (err) {}
  }

  savePTImage() {
    try {
      if (this.pt_image) {
        const picKey = this.getPTImageFSKey();
        const b64 = this.pt_image.toBase64String('png');
        LS.setItem(picKey, b64);
      }
    } catch (err) {}
  }

  loadSDImage() {
    try {
      const picKey = this.getSDImageFSKey();
      const pic = LS.getItem(picKey);
      if (pic) {
        const source = imageSource.fromBase64(pic);
        this.sd_image = source;
      } else {
        this.sd_image = undefined;
      }
    } catch (err) {}
  }

  loadPTImage() {
    try {
      const picKey = this.getPTImageFSKey();
      const pic = LS.getItem(picKey);
      if (pic) {
        const source = imageSource.fromBase64(pic);
        this.pt_image = source;
      } else {
        this.pt_image = undefined;
      }
    } catch (err) {}
  }

  isUpToDate(version: string): boolean {
    const v = PushTracker.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [
      PushTracker.versionStringToByte(this.pt_version),
      PushTracker.versionStringToByte(this.mcu_version),
      PushTracker.versionStringToByte(this.ble_version)
    ];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  isDevUpToDate(dev: string, version: string): boolean {
    const v = PushTracker.versionStringToByte(version);
    if (v === 0xff || !dev.length) {
      return true;
    }
    const e = PushTracker.versionStringToByte(this[dev + '_version']) || 0xff;
    return e !== 0xff && e >= v;
  }

  versionsAreEqualTo(version: string): boolean {
    return (
      this.pt_version.includes(version) &&
      this.mcu_version.includes(version) &&
      this.ble_version.includes(version)
    );
  }

  getTime(): string {
    let str = '??';
    if (this.usage && this.usage.length) {
      str = this.usage[0].getTime().toISOString();
    }
    return str;
  }

  update(demo: any) {
    Demo.editableProperties.map(p => {
      this[p] = demo[p];
    });
    this.usage.push(...demo.usage);
    this.sortUsage();
  }

  sortUsage() {
    this.usage.sort((a, b) => {
      // https://github.com/PushTracker/EvalApp/issues/363
      // something has changed to data flow to cause items to be null in some scenarios
      // need to overhaul the services and models and how data is being persisted in running app
      const aDate = a.getTime() ? a.getTime() : null;
      const bDate = b.getTime() ? b.getTime() : null;
      return aDate < bDate ? 1 : -1;
    });

    // https://github.com/PushTracker/EvalApp/issues/361
    const filtered = this.usage
      .filter(v => {
        if (v && v.getTime()) {
          return true;
        } else {
          return false;
        }
      })
      .map(item => {
        return item.getTime().toISOString();
      });

    this.usage = Array.from(new Set(filtered)) as any;
  }

  use(): Promise<any> {
    return LocationService.getLocationData().then(locationData => {
      const geo = [locationData.longitude, locationData.latitude];
      const location = locationData.place_name;
      const record = new Record({
        time: new Date(),
        geo: geo,
        location: location,
        user_id: Kinvey.User.getActiveUser()._id
      });
      this.usage.unshift(record);
      this.sortUsage();
      this.geo = geo;
      this.location = location;
    });
  }
}
