import { Component, OnInit } from '@angular/core';
import { ModalDialogParams } from '@nativescript/angular';
import { isIOS } from '@nativescript/core';
import { SearchBar } from '@nativescript/core/ui';
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

  onItemLoading(args) {
    if (isIOS) {
      const iosCell = args.ios as UITableViewCell;
      iosCell.selectionStyle = UITableViewCellSelectionStyle.None;
    }
  }

  onNavBtnTap() {
    this._params.closeCallback('');
  }

  onSubmit(args) {
    const searchBar = args.object as SearchBar;
    this.searchPhrase = searchBar.text;
    const relevant = this._allSupportItems.filter(i => {
      return i.a.includes(this.searchPhrase) || i.q.includes(this.searchPhrase);
    });
    this.supportItems.splice(0, this.supportItems.length, ...relevant);
  }

  onTextChanged(args) {
    const searchBar = args.object as SearchBar;
  }

  onClear(args) {
    const searchBar = args.object as SearchBar;
    this.supportItems.splice(0, this.supportItems.length, ...this._allSupportItems);
  }
}
