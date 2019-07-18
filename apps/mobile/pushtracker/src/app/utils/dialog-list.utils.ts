import { isIOS } from 'tns-core-modules/platform';
import { CFAlertDialog, DialogOptions, CFAlertActionAlignment, CFAlertActionStyle, CFAlertStyle} from 'nativescript-cfalert-dialog';
import * as dialogs from 'tns-core-modules/ui/dialogs';


export function  dialog( title: string, list: any, selectedItem?: number): Promise<string> {
    return new Promise((resolve, reject) => {
        if (isIOS) {
            console.log('This is iOS dialog');
            dialogs.action({
                message: title,
                cancelButtonText: 'Cancel',
                actions: list
            }).then(result => {
                console.log(result);
                resolve(result);
            }).catch(error => {
                console.log(error);
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
                      onClick: function(response) {
                        console.log(response);
                      },
                    },
                  ]
            };
            alert.show(options);
        }
    });
}