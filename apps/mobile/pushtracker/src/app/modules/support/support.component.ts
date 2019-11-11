import { Component, OnInit } from '@angular/core';
import { ModalDialogParams } from '@nativescript/angular';
import { isIOS } from '@nativescript/core';
import { EventData, ItemEventData, TextField } from '@nativescript/core';
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
    this.supportItems = this._translateService.instant(
      'support-component.faqs'
    );
    this._allSupportItems = this.supportItems.map(i => {
      return {
        a: i.a,
        q: i.q
      };
    });
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
