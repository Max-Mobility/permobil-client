import {
  Application,
  ApplicationSettings,
  Dialogs,
  Utils
} from '@nativescript/core';
import { setTimeout } from '@nativescript/core/timer';

declare var android: any;

export interface IConfiguration {
  id?: string;
  showOnCount?: number;
  title: string;
  text: string;
  agreeButtonText?: string;
  remindButtonText?: string;
  declineButtonText?: string;
  androidPackageId?: string;
  iTunesAppId?: string;
}

export class Ratings {
  private configuration: IConfiguration;
  private showCount: number;

  constructor(configuration: IConfiguration) {
    this.configuration = configuration;
    this.configuration.id = this.configuration.id
      ? this.configuration.id
      : 'ratings-0';
    this.configuration.showOnCount = this.configuration.showOnCount
      ? this.configuration.showOnCount
      : 5;
    this.configuration.agreeButtonText = this.configuration.agreeButtonText
      ? this.configuration.agreeButtonText
      : 'Rate Now';
    this.configuration.remindButtonText = this.configuration.remindButtonText
      ? this.configuration.remindButtonText
      : 'Remind Me Later';
    this.configuration.declineButtonText = this.configuration.declineButtonText
      ? this.configuration.declineButtonText
      : 'No Thanks';
  }

  count() {
    return this.showCount;
  }

  init() {
    this.showCount = ApplicationSettings.getNumber(this.configuration.id, 0);
  }

  increment() {
    this.showCount = ApplicationSettings.getNumber(this.configuration.id, 0);
    this.showCount++;
    ApplicationSettings.setNumber(this.configuration.id, this.showCount);
  }

  prompt() {
    const userRated = ApplicationSettings.getBoolean(
      'PUSHTRACKER.RATER.ACCEPTED',
      false
    );
    if (userRated) {
      console.log('User has already rated the app. Not showing prompt');
      return;
    }

    const userDeclined = ApplicationSettings.getBoolean(
      'PUSHTRACKER.RATER.DECLINED',
      false
    );
    if (userDeclined) {
      console.log('User declined to provide ratings. Not showing prompt');
      return;
    }

    if (this.showCount >= this.configuration.showOnCount) {
      setTimeout(() => {
        Dialogs.confirm({
          title: this.configuration.title,
          message: this.configuration.text,
          okButtonText: this.configuration.agreeButtonText,
          cancelButtonText: this.configuration.declineButtonText,
          neutralButtonText: this.configuration.remindButtonText,
          cancelable: false
        }).then(result => {
          if (result === true) {
            ApplicationSettings.setBoolean('PUSHTRACKER.RATER.ACCEPTED', true);
            let appStore = '';
            if (Application.android) {
              const androidPackageName = this.configuration.androidPackageId
                ? this.configuration.androidPackageId
                : Application.android.packageName;
              const uri = android.net.Uri.parse(
                'market://details?id=' + androidPackageName
              );
              const myAppLinkToMarket = new android.content.Intent(
                android.content.Intent.ACTION_VIEW,
                uri
              );
              // Launch the PlayStore
              Application.android.foregroundActivity.startActivity(
                myAppLinkToMarket
              );
            } else if (Application.ios) {
              appStore =
                'itms-apps://itunes.apple.com/en/app/id' +
                this.configuration.iTunesAppId;
            }
            Utils.openUrl(appStore);
          } else if (result === false) {
            // Decline
            ApplicationSettings.setBoolean('PUSHTRACKER.RATER.DECLINED', true);
          } else {
            ApplicationSettings.setNumber(this.configuration.id, 0);
          }
        });
      });
    } else {
      console.log('Not showing prompt');
      console.log('showOnCount =', this.configuration.showOnCount);
      console.log('currentCount =', this.showCount);
    }
  }
}
