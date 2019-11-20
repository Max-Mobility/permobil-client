import * as Application from '@nativescript/core/application';
import * as Dialogs from '@nativescript/core/ui/dialogs';
import * as Utility from '@nativescript/core/utils/utils';
import * as appSettings from '@nativescript/core/application-settings';

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
    this.configuration.id = this.configuration.id ? this.configuration.id : 'ratings-0';
    this.configuration.showOnCount = this.configuration.showOnCount ? this.configuration.showOnCount : 5;
    this.configuration.agreeButtonText = this.configuration.agreeButtonText ? this.configuration.agreeButtonText : 'Rate Now';
    this.configuration.remindButtonText = this.configuration.remindButtonText ? this.configuration.remindButtonText : 'Remind Me Later';
    this.configuration.declineButtonText = this.configuration.declineButtonText ? this.configuration.declineButtonText : 'No Thanks';
  }

  init() {
    this.showCount = appSettings.getNumber(this.configuration.id, 0);
    this.showCount++;
    appSettings.setNumber(this.configuration.id, this.showCount);
  }

  prompt() {
    if (this.showCount >= this.configuration.showOnCount) {
      setTimeout(() => {
        Dialogs.confirm({
          title: this.configuration.title,
          message: this.configuration.text,
          okButtonText: this.configuration.agreeButtonText,
          cancelButtonText: this.configuration.declineButtonText,
          neutralButtonText: this.configuration.remindButtonText
        }).then(result => {
          if (result === true) {
            let appStore = '';
            if (Application.android) {
              const androidPackageName = this.configuration.androidPackageId ? this.configuration.androidPackageId : Application.android.packageName;
              const uri = android.net.Uri.parse('market://details?id=' + androidPackageName);
              const myAppLinkToMarket = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri);
              // Launch the PlayStore
              Application.android.foregroundActivity.startActivity(myAppLinkToMarket);
            } else if (Application.ios) {
              appStore = 'itms-apps://itunes.apple.com/en/app/id' + this.configuration.iTunesAppId;
            }
            Utility.openUrl(appStore);
          } else if (result === false) {
            // Decline
          } else {
            appSettings.setNumber(this.configuration.id, 0);
          }
        });
      });
    }
  }

}