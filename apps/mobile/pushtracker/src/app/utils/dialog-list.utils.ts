import { isIOS } from 'tns-core-modules/platform';
import { CFAlertDialog, DialogOptions, CFAlertActionAlignment, CFAlertActionStyle, CFAlertStyle} from 'nativescript-cfalert-dialog';
import * as dialogs from 'tns-core-modules/ui/dialogs';


export function  dialog( title: string, items: any) {
    return new Promise((resolve, reject) => {
        if ( isIOS) {
            console.log('This is iOS dialog');
            dialogs.action({
                message: title,
                cancelButtonText: 'Cancel',
                actions: items
            }).then(result => {
                console.log(result);
                resolve(result);
            }).catch(error => {
                console.log(error);
                reject(error);
            });
        }
        else {
            const alert = new CFAlertDialog();

            const options: DialogOptions = {
                dialogStyle: CFAlertStyle.ALERT,
                title: title,
                singleChoiceList: {
                    items: items,
                    selectedItem: 1,
                    onClick: function (dialogInterface, index, b) {
                        console.log(dialogInterface);
                        console.log(index);
                        console.log(b);
                        resolve(index);
                    }
                }
            };
            alert.show(options);
        }
    });
}