import { Component, OnInit, ViewContainerRef } from '@angular/core';
import {
  BottomSheetOptions,
  BottomSheetService
} from '@nativescript-community/ui-material-bottomsheet/angular';
import { ModalDialogParams } from '@nativescript/angular';
import {
  EventData,
  isIOS,
  ItemEventData,
  TextField,
  Utils
} from '@nativescript/core';
import { compose } from '@nativescript/email';
import { TranslateService } from '@ngx-translate/core';
import { validate } from 'email-validator';
import { InAppBrowser } from 'nativescript-inappbrowser';
import { LoggingService } from '../../services';
import { ListPickerSheetComponent } from '../shared/components';

@Component({
  selector: 'support',
  moduleId: module.id,
  templateUrl: 'support.component.html'
})
export class SupportComponent implements OnInit {
  supportItems;
  searchPhrase: string = '';

  allCategory: string = this._translateService.instant(
    'support-component.category.all'
  );
  selectedCategory: string = this.allCategory;
  categories: string[] = [];

  private _allSupportItems;
  private _searchBar: TextField;

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _params: ModalDialogParams,
    private _bottomSheet: BottomSheetService,
    private _vcRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this._logService.logBreadCrumb(
      SupportComponent.name,
      ' SupportComponent OnInit'
    );

    // since this is an array object it appears we can't simply pass
    // the parameters as the second argument to the instant function -
    // the templates don't render
    const faqs = this._translateService.instant('support-component.faqs');

    this.categories = [this.allCategory];

    this.supportItems = Object.values(faqs).map((i: any) => {
      if (this.categories.indexOf(i.category) === -1) {
        this.categories.push(i.category);
      }
      return {
        category: i.category,
        a: i.a,
        q: i.q
      };
    });

    this._allSupportItems = this.supportItems.map((i: any) => {
      return {
        category: i.category,
        a: i.a,
        q: i.q
      };
    });
  }

  async onFilterSelectorTapped(args: EventData) {
    const primaryIndex = this.categories.indexOf(this.selectedCategory);
    const options: BottomSheetOptions = {
      viewContainerRef: this._vcRef,
      dismissOnBackgroundTap: true,
      context: {
        title: this._translateService.instant(
          'support-component.category.title'
        ),
        description: this._translateService.instant(
          'support-component.category.description'
        ),
        primaryItems: this.categories,
        primaryIndex,
        listPickerNeedsSecondary: false
      }
    };

    this._bottomSheet
      .show(ListPickerSheetComponent, options)
      .subscribe(result => {
        if (result && result.data) {
          this.selectedCategory = this.categories[result.data.primaryIndex];
        } else {
          this.selectedCategory = this.allCategory;
        }
        this.onSearch();
      });
  }

  async onLinkTapped(args) {
    try {
      const link = args.link;
      const emailRegex = new RegExp('@permobil.com', 'i');
      const isEmail = emailRegex.test(link);
      if (isEmail || validate(link)) {
        await compose({
          subject: '',
          body: '',
          to: [link]
        }).catch(err => {
          this._logService.logException(err);
        });
      } else {
        this._logService.logBreadCrumb(
          SupportComponent.name,
          `User opening link: ${link}`
        );
        if (isIOS || (await !InAppBrowser.isAvailable())) {
          Utils.openUrl(link);
        } else {
          await InAppBrowser.open(link, {
            // Android Properties
            showTitle: true,
            toolbarColor: '#6200EE',
            secondaryToolbarColor: 'black',
            enableUrlBarHiding: true,
            enableDefaultShare: true,
            forceCloseOnRedirection: false,
            // Specify full animation resource identifier(package:anim/name)
            // or only resource name(in case of animation bundled with app).
            animations: {
              startEnter: 'slide_in_right',
              startExit: 'slide_out_left',
              endEnter: 'slide_in_left',
              endExit: 'slide_out_right'
            },
            hasBackButton: true,
            browserPackage: '',
            showInRecents: false
          }).catch(err => {
            this._logService.logException(err);
          });
        }
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
        return (
          regex.test(i.a) ||
          (regex.test(i.q) &&
            (this.selectedCategory === this.allCategory ||
              i.category === this.selectedCategory))
        );
      });
      this.supportItems.splice(0, this.supportItems.length, ...relevant);
      this._searchBar?.dismissSoftInput();
    } else if (this.selectedCategory !== this.allCategory) {
      const relevant = this._allSupportItems.filter(i => {
        return i.category === this.selectedCategory;
      });
      this.supportItems.splice(0, this.supportItems.length, ...relevant);
      this._searchBar?.dismissSoftInput();
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
    this.selectedCategory = this.allCategory;
    this.searchPhrase = '';
    this.supportItems.splice(
      0,
      this.supportItems.length,
      ...this._allSupportItems
    );
    if (this._searchBar) {
      this._searchBar.text = '';
      this._searchBar.dismissSoftInput();
    }
  }
}
