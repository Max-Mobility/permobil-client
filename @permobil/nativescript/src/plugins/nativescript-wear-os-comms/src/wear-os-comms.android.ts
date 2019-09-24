import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { Common } from './wear-os-comms.common';

declare const com: any;

export class WearOsComms extends Common {
  // this will only be used for advertising the service if the watch's
  // paired phone is not running android
  private static _bluetooth: Bluetooth = null;
  private static _companionService: any = null;

  constructor() {
    super();
  }

  public static async advertiseAsCompanion() {
    try {
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
        // start the server
        WearOsComms._bluetooth.startGattServer();
        // create service / characteristics
        WearOsComms.createService();
        // TODO: set up listeners for data receipt from the app
        // advertise the added service
        await WearOsComms._bluetooth.startAdvertising({
          UUID: WearOsComms.ServiceUUID,
          settings: {
            connectable: true
          },
          data: {
            includeDeviceName: true
          }
        });
        // now add the service to the bluetooth
        WearOsComms._bluetooth.addService(WearOsComms._companionService);
      }
    } catch (err) {
      console.error('error advertising as companion:', err);
    }
  }

  private static createService() {
    // TODO: flesh out!
    if (WearOsComms._bluetooth.offersService(WearOsComms.ServiceUUID)) {
      console.log(`Bluetooth already offers ${WearOsComms.ServiceUUID}`);
      return;
    }
    console.log('making service');

    // make the service
    WearOsComms._companionService = WearOsComms._bluetooth.makeService({
      UUID: WearOsComms.ServiceUUID,
      primary: true
    });

    const descriptorUUIDs = ['2900', '2902'];

    // make the characteristics
    const characteristics = [
      WearOsComms.MessageCharacteristicUUID,
      WearOsComms.DataCharacteristicUUID,
    ].map(cuuid => {
      // console.log('Making characteristic: ' + cuuid);
      //  defaults props are set READ/WRITE/NOTIFY, perms are set to READ/WRITE
      const c = WearOsComms._bluetooth.makeCharacteristic({
        UUID: cuuid
      });

      // console.log('making descriptors');
      const descriptors = descriptorUUIDs.map(duuid => {
        //  defaults perms are set to READ/WRITE
        const d = WearOsComms._bluetooth.makeDescriptor({
          UUID: duuid
        });

        d.setValue(new Array<any>([0x00, 0x00]));
        // console.log('Making descriptor: ' + duuid);
        return d;
      });

      descriptors.map(d => {
        c.addDescriptor(d);
      });

      c.setValue(
        0,
        (android.bluetooth as any).BluetoothGattCharacteristic.FORMAT_UINT8,
        0
      );
      c.setWriteType(
        (android.bluetooth as any).BluetoothGattCharacteristic
          .WRITE_TYPE_DEFAULT
      );

      return c;
    });
    console.log('Adding characteristics to service!');
    characteristics.map(c => WearOsComms._companionService.addCharacteristic(c));
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
