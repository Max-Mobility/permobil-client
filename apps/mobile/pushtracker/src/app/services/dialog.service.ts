import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';
import { action } from 'tns-core-modules/ui/dialogs';

@Injectable()
export class DialogService {
  constructor(private _translateService: TranslateService) {}

  public action(title: string, actions: any): Promise<string> {
    return new Promise((resolve, reject) => {
      action({
        title,
        cancelButtonText: this._translateService.instant('general.cancel'),
        actions
      })
        .then(result => {
          Log.D(`action selected: ${result}`);
          if (
            result &&
            result !== this._translateService.instant('general.cancel')
          ) {
            resolve(result);
          } else {
            resolve();
          }
        })
        .catch(error => {
          Log.E(error);
          reject(error);
        });
    });
  }
}
