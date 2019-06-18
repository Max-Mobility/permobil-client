import { Injectable } from '@angular/core';
import { Evaluation } from '@maxmobility/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { LoggingService } from './logging.service';

@Injectable()
export class EvaluationService {
  evaluation: Evaluation = null;
  private datastore = Kinvey.DataStore.collection<Evaluation>('Evaluations');

  constructor(private _logService: LoggingService) {}

  save() {
    return new Promise(async (resolve, reject) => {
      try {
        await this.datastore.save(this.evaluation.data());
        await this.datastore.push();
        this.evaluation = null;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async loadEvaluations(): Promise<any> {
    try {
      await this.login();
      await this.datastore.sync();
      const query = new Kinvey.Query();
      query.equalTo('creator_id', Kinvey.User.getActiveUser()._id);
      query.descending('_kmd.ect');

      const stream = this.datastore.find(query);
      const data = await stream.toPromise();
      return data;
    } catch (error) {
      this._logService.logException(error);
    }
  }

  private login(): Promise<any> {
    if (!!Kinvey.User.getActiveUser()) {
      return Promise.resolve();
    } else {
      return Promise.reject('No active user!');
    }
  }

  private handleErrors(error: Response) {
    // console.log(error);
  }
}
