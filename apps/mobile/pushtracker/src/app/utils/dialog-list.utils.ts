import { isIOS } from 'tns-core-modules/platform';
import { CFAlertDialog, DialogOptions, CFAlertActionAlignment, CFAlertActionStyle, CFAlertStyle} from 'nativescript-cfalert-dialog';
import * as dialogs from 'tns-core-modules/ui/dialogs';


export function  dialog( title: string, list: any) {
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
                singleChoiceList: {
                    items: list,
                    selectedItem: 0,
                    onClick: (dialogInterface, index) => {
                        const val = options.singleChoiceList.items[index];
                        console.log(val);
                        resolve(val);
                    }
                }
            };
            alert.show(options);
        }
    });
}