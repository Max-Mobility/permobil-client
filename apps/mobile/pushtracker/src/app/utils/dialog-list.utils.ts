import { Log } from '@permobil/core';
import {
  CFAlertActionAlignment,
  CFAlertActionStyle,
  CFAlertDialog,
  CFAlertStyle,
  DialogOptions
} from 'nativescript-cfalert-dialog';
import { isIOS } from 'tns-core-modules/platform';
import * as dialogs from 'tns-core-modules/ui/dialogs';

export function dialog(
  title: string,
  list: any,
  selectedItem?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (isIOS) {
      dialogs
        .action({
          message: title,
          cancelButtonText: 'Cancel',
          actions: list
        })
        .then(result => {
          Log.D(`action selected: ${result}`);
          resolve(result);
        })
        .catch(error => {
          Log.E(error);
          reject(error);
        });
    } else {
      const alert = new CFAlertDialog();

      const options: DialogOptions = {
        dialogStyle: CFAlertStyle.ALERT,
        title: title,
        onDismiss: () => {
          const index = options.singleChoiceList.selectedItem;
          const item = options.singleChoiceList.items[index];
          Log.D(`item selected: ${item}`);
          resolve(item);
        },
        singleChoiceList: {
          items: list,
          selectedItem: selectedItem,
          onClick: (dialogInterface, index) => {
            options.singleChoiceList.selectedItem = index;
          }
        },
        buttons: [
          {
            text: 'Okay',
            buttonStyle: CFAlertActionStyle.DEFAULT,
            buttonAlignment: CFAlertActionAlignment.END,
            textColor: '#000000',
            backgroundColor: '#FFFFFF',
            onClick: response => {
              Log.D(response);
            }
          }
        ]
      };
      alert.show(options);
    }
  });
}
