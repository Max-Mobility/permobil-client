import { Component, OnInit } from '@angular/core';
import { ModalDialogParams } from '@nativescript/angular';
import { isIOS } from '@nativescript/core';
import { EventData, ItemEventData, TextField } from '@nativescript/core';
import { openUrl } from '@nativescript/core/utils/utils';
import { validate } from 'email-validator';
import { compose } from "nativescript-email";
import { TranslateService } from '@ngx-translate/core';
import { LoggingService } from '../../services';

@Component({
  selector: 'support',
  moduleId: module.id,
  templateUrl: 'support.component.html'
})
export class SupportComponent implements OnInit {
  supportItems;
  searchPhrase: string = '';

  private _allSupportItems;
  private _searchBar: TextField;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams
  ) { }

  ngOnInit() {
    this._logService.logBreadCrumb(SupportComponent.name, 'OnInit');

    // since this is an array object it appears we can't simply pass
    // the parameters as the second argument to the instant function -
    // the templates don't render
    const faqs = this._translateService.instant(
      'support-component.faqs'
    );

    this.supportItems = Object.values(faqs).map((i: any) => {
      if (i.links) {
        return {
          category: i.category,
          a: i.a,
          q: i.q,
          links: Object.values(i.links)
        };
      } else {
        return {
          category: i.category,
          a: i.a,
          q: i.q,
          links: null
        };
      }
    });

    this._allSupportItems = this.supportItems.map((i: any) => {
      return {
        category: i.category,
        a: i.a,
        q: i.q,
        links: i.links
      };
    });
  }

  itemTemplateSelector(item: any, index: number, items: any) {
    return item.links ? 'has-links' : 'no-links';
  }

  async onLinkTapped(link: string) {
    try {
      const emailRegex = new RegExp('@permobil\.com', 'i');
      const isEmail = emailRegex.test(link);
      if (isEmail || validate(link)) {
        await compose({
          subject: '',
          body: '',
          to: [link]
        })
          .then(() => {
          })
          .catch((err) => {
            this._logService.logException(err);
          });
      } else {
        openUrl(link);
      }
    } catch (err) {
      this._logService.logException(err);
    }
  }

  onItemLoading(args: ItemEventData) {
    if (isIOS) {
      const iosCell = args.ios as UITableViewCell;
      iosCell.selectionStyle = UITableViewCellSelectionStyle.None;
    }
  }

  onNavBtnTap() {
    this._params.closeCallback('');
  }

  onSearch() {
    if (this.searchPhrase && this.searchPhrase.length) {
      const regex = new RegExp(this.searchPhrase, 'i');
      const relevant = this._allSupportItems.filter(i => {
        return regex.test(i.a) || regex.test(i.q);
      });
      this.supportItems.splice(0, this.supportItems.length, ...relevant);
      if (this._searchBar) {
        this._searchBar.dismissSoftInput();
      }
    } else {
      this.onClear();
    }
  }

  onSubmit(args: EventData) {
    this._searchBar = args.object as TextField;
    this.searchPhrase = this._searchBar.text;
    this.onSearch();
  }

  onTextChanged(args: EventData) {
    this._searchBar = args.object as TextField;
    this.searchPhrase = this._searchBar.text;
  }

  onClear() {
    this.searchPhrase = '';
    this.supportItems.splice(0, this.supportItems.length, ...this._allSupportItems);
    if (this._searchBar) {
      this._searchBar.text = '';
      this._searchBar.dismissSoftInput();
    }
  }
}
