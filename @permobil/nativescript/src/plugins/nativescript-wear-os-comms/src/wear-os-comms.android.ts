import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { Common } from './wear-os-comms.common';

declare const com: any;

export class WearOsComms extends Common {
  private static _bluetooth: Bluetooth = null;

  constructor() {
    super();
  }

  public static advertiseAsCompanion() {
    let needToAdvertise = false;
    // check paired phone type to determine if we need to advertise
    // (e.g. if the phone is ios we need to use the bluetooth)

    const phoneDeviceType = android.support.wearable.phone.PhoneDeviceType
      .getPhoneDeviceType(ad.getApplicationContext());
    switch (phoneDeviceType) {
        // Paired to Android phone, use Play Store URI.
      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ANDROID:
        break;

        // Paired to iPhone, use iTunes App Store URI
      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_IOS:
        Log.D('\tDEVICE_TYPE_IOS');
        needToAdvertise = true;
        break;

      case android.support.wearable.phone.PhoneDeviceType.DEVICE_TYPE_ERROR_UNKNOWN:
        Log.E('\tDEVICE_TYPE_ERROR_UNKNOWN');
        break;
    }

    if (needToAdvertise) {
      // create the bluetooth object
      WearOsComms._bluetooth = new Bluetooth();
      // TODO: add service / characteristics
      // TODO: advertise the added service
      // TODO: set up listeners for data receipt from the app
    }
  }

  public static sendMessage(channel: string, msg: string) {
    return new Promise((resolve, reject) => {
      try {
        const r = new com.github.maxmobility.wearmessage.Message(
          androidUtils.getApplicationContext()
        );

        r.sendMessage(channel, msg);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  public static sendData(data: any) {
    return new Promise((resolve, reject) => {
      try {
        const l = new com.github.maxmobility.wearmessage.Data(
          androidUtils.getApplicationContext()
        );
        l.sendData(data);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
