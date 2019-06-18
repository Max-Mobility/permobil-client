import { Inject, Injectable } from '@angular/core';
import { Demo } from '@maxmobility/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { fromBase64 } from 'tns-core-modules/image-source/image-source';
import { LoggingService } from './logging.service';

@Injectable()
export class DemoService {
  constructor(@Inject(LoggingService) private _logService: LoggingService) {
    //this.load();
  }
  static Demos = new ObservableArray<Demo>([]);

  private datastore = Kinvey.DataStore.collection<any>('SmartDrives');

  private static cloneUpdateModel(demo: Demo): object {
    return Demo.editableProperties.reduce((a, e) => ((a[e] = demo[e]), a), {
      _id: demo.id,
      _geoloc: demo.geo,
      owner_id: Kinvey.User.getActiveUser()._id,
      // https://github.com/PushTracker/EvalApp/issues/362
      usage: demo.usage.map(r => typeof r.data === 'function' && r.data())
    });
  }

  getDemoById(id: string): Demo {
    if (!id) {
      return;
    }
    const o = DemoService.Demos.filter(demo => {
      return demo.id === id;
    });
    const obj = o && o.length ? o[0] : null;
    return obj;
  }

  getDemoByPushTrackerSerialNumber(sn: string): Demo {
    if (!sn || !sn.length || !sn.trim().length) {
      return;
    }
    const o = DemoService.Demos.filter(demo => {
      return demo.pushtracker_serial_number === sn;
    });
    const obj = o && o.length ? o[0] : null;
    return obj;
  }

  getDemoBySmartDriveSerialNumber(sn: string): Demo {
    if (!sn || !sn.length || !sn.trim().length) {
      return;
    }
    const o = DemoService.Demos.filter(demo => {
      return demo.smartdrive_serial_number === sn;
    });
    const obj = o && o.length ? o[0] : null;
    return obj;
  }

  async create(demoModel: Demo): Promise<any> {
    const foundSD = this.getDemoBySmartDriveSerialNumber(
      demoModel.smartdrive_serial_number
    );
    const foundPT = this.getDemoByPushTrackerSerialNumber(
      demoModel.pushtracker_serial_number
    );
    if (foundSD) {
      foundSD.update(demoModel);
      demoModel = foundSD;
    } else if (foundPT) {
      foundPT.update(demoModel);
      demoModel = foundPT;
    } else {
      // nothing
    }
    await this.update(demoModel);
    return this.load();
  }

  save() {
    const tasks = DemoService.Demos.map(demo => {
      return this.datastore
        .save(demo.data())
        .then(data => {
          this.update(data);
        })
        .catch(error => {
          console.log(error);
        });
    });
    return Promise.all(tasks);
  }

  async load(): Promise<any> {
    try {
      DemoService.Demos = new ObservableArray<Demo>();

      if (!Kinvey.User.getActiveUser()) {
        return Promise.reject('No active user!');
      }

      const query = new Kinvey.Query();
      query.equalTo('owner_id', Kinvey.User.getActiveUser()._id);
      query.ascending('smartdrive_serial_number');
      console.log({ query });
      const stream = this.datastore.find(query);

      const data = await stream.toPromise();
      // console.log('data from query', { data });

      const demos = data.map((demoData: Demo) => {
        demoData.id = (demoData as any)._id;

        // BRAD = attempt to fix https://github.com/PushTracker/EvalApp/issues/144 for loading the base64 images
        // if the unit has the base64 string and a value in the sd_image then they took a picture and saved it
        // if not null it out so the `Image` databinding in the UI doesn't crash trying to bind
        if (demoData.sd_image && demoData.sd_image_base64) {
          const source = fromBase64(demoData.sd_image_base64);
          demoData.sd_image = source;
        } else {
          demoData.sd_image = null;
        }

        return new Demo(demoData);
      });

      DemoService.Demos.push(demos);
    } catch (error) {
      console.log('demoservice load error', error);
      this._logService.logException(error);
    }
  }

  private update(demoModel: Demo): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const updateModel = DemoService.cloneUpdateModel(demoModel);
        console.log('saving demo to data store', updateModel);
        await this.datastore.save(updateModel);
        console.log('demo unit saved to datastore', updateModel);
        resolve();
      } catch (error) {
        this._logService.logException(error);
        reject(error);
      }
    });
  }
}
