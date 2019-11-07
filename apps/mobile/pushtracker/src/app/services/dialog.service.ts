import { Injectable } from '@angular/core';
import { action } from '@nativescript/core/ui/dialogs';
import { TranslateService } from '@ngx-translate/core';
import { Log } from '@permobil/core';

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
