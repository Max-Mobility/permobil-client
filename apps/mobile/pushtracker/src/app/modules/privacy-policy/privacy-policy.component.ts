import { Component } from '@angular/core';
import { ModalDialogParams } from '@nativescript/angular';
import { PropertyChangeData, Switch } from '@nativescript/core';
import * as utilityModule from '@nativescript/core/utils/utils';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'privacy-policy',
  moduleId: module.id,
  templateUrl: 'privacy-policy.component.html'
})
export class PrivacyPolicyComponent {
  has_agreed_to_user_agreement: boolean = false;
  has_read_privacy_policy: boolean = false;
  readonly: boolean = false;
  consent_to_product_development: boolean = false;
  consent_to_research: boolean = false;

  constructor(
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) {
    if (this._params.context.navigatedFrom) {
      if (this._params.context.navigatedFrom === 'profile') {
        this.readonly = true;
      }
    }

    const data = this._params.context.data;
    // copy to local vars
    this.has_agreed_to_user_agreement =
      data.has_agreed_to_user_agreement || false;
    this.has_read_privacy_policy = data.has_read_privacy_policy || false;
    this.consent_to_product_development =
      data.consent_to_product_development || false;
    this.consent_to_research = data.consent_to_research || false;
  }

  async onSettingsChecked(args: PropertyChangeData, setting: string) {
    const isChecked = args.value;
    const sw = args.object as Switch;
    sw.className =
      isChecked === true ? 'setting-switch' : 'inactive-setting-switch';
    // now set the setting
    this[setting] = isChecked;
  }

  openWebsite(url: string) {
    const newUrl = this._translateService.instant(url);
    utilityModule.openUrl(newUrl);
  }

  close() {
    this._params.closeCallback({
      has_agreed_to_user_agreement: this.has_agreed_to_user_agreement,
      has_read_privacy_policy: this.has_read_privacy_policy,
      consent_to_product_development: this.consent_to_product_development,
      consent_to_research: this.consent_to_research
    });
  }

  cancel() {
    this._params.closeCallback();
  }
}
