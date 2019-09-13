import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { Common } from './wear-os-comms.common';

declare const com: any;

export class WearOsComms extends Common {
  constructor() {
    super();
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
