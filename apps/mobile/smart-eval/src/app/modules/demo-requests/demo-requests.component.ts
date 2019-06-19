import { Component, OnInit } from '@angular/core';
import { DemoRequest, User } from '@maxmobility/core';
import { LoggingService, ProgressService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { EventData } from 'tns-core-modules/data/observable';
import { isIOS } from 'tns-core-modules/platform';
import { confirm } from 'tns-core-modules/ui/dialogs/dialogs';
import { ListView } from 'tns-core-modules/ui/list-view';
import { Page } from 'tns-core-modules/ui/page';

@Component({
  selector: 'demo-requests',
  moduleId: module.id,
  templateUrl: 'demo-requests.component.html',
  styleUrls: ['demo-requests.component.scss']
})
export class DemoRequestsComponent implements OnInit {
  private static LOG_TAG = 'demo-requests.component ';
  items: DemoRequest[] = [];
  itemsLoaded = false;
  isFetchingData = false;
  userType: number;
  userId: string;
  currentUserId: string;

  private _datastore = Kinvey.DataStore.collection<DemoRequest>('DemoRequests');

  constructor(
    private _page: Page,
    private _translateService: TranslateService,
    private _progressService: ProgressService,
    private _logService: LoggingService
  ) {
    this._page.className = 'blue-gradient-down';
  }

  ngOnInit() {
    this._logService.logBreadCrumb(DemoRequestsComponent.LOG_TAG + `ngOnInit`);

    const activeUser = Kinvey.User.getActiveUser();
    this.userId = activeUser._id as string;
    this.userType = (activeUser.data as User).type as number;
    this.currentUserId = activeUser._id;
    this._datastore.clearSync();

    this.loadDemoRequests()
      .then(() => {
        this.itemsLoaded = true;
      })
      .catch(error => {
        this._logService.logException(error);
        this.itemsLoaded = false;
      });
  }

  listviewLoaded(args: EventData) {
    console.log(args.object);
    const lv = args.object as ListView;
    if (isIOS && lv.ios) {
      lv.ios.allowsSelection = false;
    }
  }

  loadDemoRequests() {
    return new Promise((resolve, reject) => {
      this.isFetchingData = true;
      // build the Kinvey Query for DemoRequests
      const query = new Kinvey.Query();
      query.descending('_kmd.ect');
      // only query for 20 at a time for paging
      query.limit = 20;
      // need to determine offset for the query based on current data
      query.skip = this.items.length;
      console.log({ query });
      this._logService.logBreadCrumb(
        DemoRequestsComponent.LOG_TAG + `query: ${query}`
      );

      this._datastore
        .find(query)
        .toPromise()
        .then((entities: DemoRequest[]) => {
          this.itemsLoaded = true;
          this.isFetchingData = false;
          for (const i of entities) {
            this.items.push(i);
          }
          resolve();
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /**
   * Load more when listview nears the bottom to page data into the items array.
   * @param args
   */
  loadMoreItems(args) {
    this.loadDemoRequests();
  }

  /**
   * Button tap event for "claiming" Demo Requests. Will confirm with the user if they wish to claim the demo.
   * If confirmed, set the `claimed_user` value to the claiming user (current user id) and save to Kinvey.
   * This user will then be able to flag Demo Requests as `complete`.
   * @param index [number] - Index in the items array for DemoRequest entities.
   */
  async onClaimDemoRequestTap(index: number) {
    const dr = this.items[index];
    const confirmResult = await confirm({
      title: this._translateService.instant('demo-requests.claim'),
      message: this._translateService.instant('demo-requests.claim_confirm'),
      okButtonText: this._translateService.instant('dialogs.yes'),
      cancelButtonText: this._translateService.instant('dialogs.no')
    });

    if (confirmResult === true) {
      this._progressService.show(
        `${this._translateService.instant('general.updating')}...`
      );

      this._logService.logBreadCrumb(
        DemoRequestsComponent.LOG_TAG +
          `onClaimDemoRequestTap() confirmed claim demo: ${JSON.stringify(dr)}`
      );

      // set the claimed_user to the current user since they confirmed to claim this demo
      dr.claimed_user = this.currentUserId;

      console.log('Modified DemoRequest', { dr });

      this._datastore
        .save(dr)
        .then(entity => {
          this._logService.logBreadCrumb(
            DemoRequestsComponent.LOG_TAG +
              `onClaimDemoRequestTap() updated demo: ${JSON.stringify(entity)}`
          );
          this._progressService.hide();
        })
        .catch(error => {
          this._progressService.hide();
          this._logService.logException(error);
          console.log('error saving modified demo request', { dr }, error);
        });
    }
  }

  async onCompleteDemoRequestTap(index) {
    const dr = this.items[index];
    const confirmResult = await confirm({
      title: this._translateService.instant('demo-requests.complete'),
      message: this._translateService.instant('demo-requests.complete_confirm'),
      okButtonText: this._translateService.instant('dialogs.yes'),
      cancelButtonText: this._translateService.instant('dialogs.no')
    });

    if (confirmResult === true) {
      this._progressService.show(
        `${this._translateService.instant('general.updating')}...`
      );

      this._logService.logBreadCrumb(
        DemoRequestsComponent.LOG_TAG +
          `onCompleteDemoRequestTap() confirmed completed demo: ${JSON.stringify(
            dr
          )}`
      );

      // set the completed flag to true to mark the request as complete to filter it out of current requests
      dr.complete = true;

      console.log('Modified DemoRequest', { dr });

      this._datastore
        .save(dr)
        .then(entity => {
          this._logService.logBreadCrumb(
            DemoRequestsComponent.LOG_TAG +
              `onCompleteDemoRequestTap() updated demo: ${JSON.stringify(
                entity
              )}`
          );
          this._progressService.hide();
        })
        .catch(error => {
          this._progressService.hide();
          this._logService.logException(error);
          dr.complete = false; // setting to false in case an error occurs
          console.log('error saving modified demo request', { dr }, error);
        });
    }
  }

  onDemoRequestItemTap(index) {
    const dr = this.items[index];
    console.log({ dr });
    if (dr.complete) {
      new Toasty({
        text: this._translateService.instant(
          'demo-requests.demo_is_complete_msg'
        ),
        duration: ToastDuration.SHORT,
        position: ToastPosition.BOTTOM
      }).show();
    }
    // else if (dr.claimed_user !== this.userId) {
    //   console.log('claimed by another user');
    // new Toasty(
    //   {text: this._translateService.instant('demo-requests.claimed_by_other'),
    //   duration: ToastDuration.SHORT,
    //   position: ToastPosition.BOTTOM}
    // ).show();
    // }
  }

  onFilterListTap(args) {
    console.log('onFilterListTap');
  }
}
