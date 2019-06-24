import { Injectable } from '@angular/core';
import * as Kinvey from 'kinvey-nativescript-sdk';
import { Push } from 'kinvey-nativescript-sdk/push';
import { Feedback } from 'nativescript-feedback';
import * as fs from 'tns-core-modules/file-system';

@Injectable()
export class UserService {
  static hasRegistered = false;
  private _feedback = new Feedback();

  constructor() {}

  /**
   * Will return the active user from the Kinvey auth.
   */
  get user() {
    return Kinvey.User.getActiveUser();
  }

  /**
   * Unregister for push notifications so the device doesn't receive any after signing out.
   * Then logout the Kinvey User.
   */
  logout() {
    return new Promise(async (resolve, reject) => {
      try {
        // only call if registered
        if (UserService.hasRegistered === true) {
          // kinvey docs might be out of date on `unregister` method
          await (Push as any)
            .unregister({
              android: {
                senderID: '1053576736707'
              }
            })
            .catch(error => {
              // do nothing
            });
        }
        UserService.hasRegistered = false;
        await Kinvey.User.logout();
        resolve(true);
      } catch (error) {
        resolve(false);
      }
    });
  }

  uploadImage(remoteFullPath: string, localFullPath: string): Promise<any> {
    const imageFile = fs.File.fromPath(localFullPath);
    const imageContent = imageFile.readSync();

    const metadata = {
      filename: imageFile.name,
      mimeType: this.getMimeType(imageFile.extension),
      size: imageContent.length,
      public: true
    };

    return Kinvey.Files.upload(imageFile, metadata, { timeout: 2147483647 })
      .then((uploadedFile: any) => {
        const query = new Kinvey.Query();
        query.equalTo('_id', uploadedFile._id);

        return Kinvey.Files.find(query);
      })
      .then((files: any[]) => {
        if (files && files.length) {
          const file = files[0];
          file.url = file._downloadURL;

          return file;
        } else {
          Promise.reject(
            new Error('No items with the given ID could be found.')
          );
        }
      });
  }

  private getMimeType(imageExtension: string): string {
    const extension = imageExtension === 'jpg' ? 'jpeg' : imageExtension;

    return 'image/' + extension.replace(/\./g, '');
  }

  _registerForPushNotifications() {
    return new Promise(async (resolve, reject) => {
      try {
        let register = null;
        if (!UserService.hasRegistered) {
          register = await Push.register({
            android: {
              senderID: '1053576736707',
              notificationCallbackAndroid: (data, notification) => {
                this._feedback.info({
                  title: 'New Message from Smart Evaluation',
                  message: notification.getBody(),
                  duration: 10000,
                  onTap: () => {
                    // do nothing now
                  }
                });
              }
            },
            ios: {
              alert: true,
              badge: true,
              sound: true,
              interactiveSettings: null,
              notificationCallbackIOS: message => {
                this._feedback.info({
                  title: 'New Message from Smart Evaluation',
                  message: message.alert,
                  duration: 60000, // show for one minute without interaction, touch will close it
                  // type: FeedbackType.Success, // no need to specify when using 'success' instead of 'show'
                  onTap: () => {
                    // do nothing for now
                  }
                });
              }
            }
          });
          UserService.hasRegistered = true;
          resolve(register);
        }

        resolve(register);
      } catch (error) {
        reject(error);
      }
    });
  }
}
