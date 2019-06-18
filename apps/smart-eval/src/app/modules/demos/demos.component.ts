import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Demo, DemoRequest, User } from '@maxmobility/core';
import { DemoService, FirmwareService, LocationService, LoggingService, ProgressService, UserService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { RouterExtensions } from 'nativescript-angular/router';
import * as geolocation from 'nativescript-geolocation';
import { ToastDuration, ToastPosition, Toasty } from 'nativescript-toasty';
import { EventData } from 'tns-core-modules/data/observable';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import * as http from 'tns-core-modules/http';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { clearTimeout, setTimeout } from 'tns-core-modules/timer';
import { Animation } from 'tns-core-modules/ui/animation';
import { action, confirm, prompt } from 'tns-core-modules/ui/dialogs';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { ListView } from 'tns-core-modules/ui/list-view';
import { Page } from 'tns-core-modules/ui/page';
import { Slider } from 'tns-core-modules/ui/slider';
import * as utils from 'tns-core-modules/utils/utils';
import { APP_KEY, HOST_URL } from '../../utils/kinvey-keys';

@Component({
  selector: 'demos',
  moduleId: module.id,
  templateUrl: 'demos.component.html',
  styleUrls: ['demos.component.scss']
})
export class DemosComponent implements OnInit {
  private static LOG_TAG = 'demos.component ';

  @ViewChild('demoRequestForm', { static: false })
  demoRequestForm: ElementRef;

  @ViewChild('requestDemoBtn', { static: false })
  requestDemoBtn: ElementRef;

  @ViewChild('demoListView', { static: false })
  demoListView: ElementRef;

  get Demos(): ObservableArray<Demo> {
    return DemoService.Demos;
  }

  userType: number;

  currentUserId: string;

  /**
   * Boolean to track when the demo unit loading has finished to hide the loading indicator and show the list data
   */
  demoUnitsLoaded = false;

  /**
   * DemoRequest entity when user is requesting a demo - binded to the hidden DemoRequest form.
   */
  demorequest = new DemoRequest();

  private _datastore = Kinvey.DataStore.collection<any>('SmartDrives');

  constructor(
    private _page: Page,
    private _routerExtensions: RouterExtensions,
    private _demoService: DemoService,
    private _firmwareService: FirmwareService,
    private _logService: LoggingService,
    private _translateService: TranslateService,
    private _userService: UserService,
    private _progressService: ProgressService
  ) {
    this._page.className = 'blue-gradient-down';
  }

  ngOnInit() {
    this._logService.logBreadCrumb(DemosComponent.LOG_TAG + 'ngOnInit');

    new Toasty({
      text: this._translateService.instant('demos.owner-color-explanation'),
      duration: ToastDuration.LONG
    }).show();
    const activeUser = Kinvey.User.getActiveUser();
    this.userType = (activeUser.data as User).type as number;
    this.currentUserId = activeUser._id;
    // init the request demo values needed
    this.demorequest.maxDistance = 25;
    this.demorequest.contact_info = '';

    setTimeout(() => {
      this.loadDemoUnits();
    }, 100);
  }

  isIOS(): boolean {
    return isIOS;
  }

  isAndroid(): boolean {
    return isAndroid;
  }

  get currentVersion(): string {
    return this._firmwareService.currentVersion;
  }

  onDemoTap(index: any) {
    this._routerExtensions.navigate(['/demo-detail'], {
      queryParams: {
        index
      }
    });
  }

  loadDemoUnits() {
    this.demoUnitsLoaded = false; // toggle the display of the loading indicator
    DemoService.Demos.splice(0, DemoService.Demos.length); // empty the current items

    this._demoService
      .load()
      .then(() => {
        this.demoUnitsLoaded = true;
      })
      .catch(err => {
        this._logService.logException(err);
        this.demoUnitsLoaded = true;
      });
  }

  addDemo() {
    // add a new demo
    this._logService.logBreadCrumb(
      DemosComponent.LOG_TAG + 'Navigating to demo-detail to add a new demo.'
    );
    this._routerExtensions.navigate(['/demo-detail'], {});
  }

  /**
   * Confirm if user wants to update the location of the demo unit to the current location (and tell them what it is).
   * @param demo [Demo] - Demo unit to update.
   */
  async onUpdateLocationButtonTap(demo: Demo) {
    let processTimeout = 0;

    try {
      const isEnabled = await geolocation.isEnabled();
      if (isEnabled) {
        // if more than 750ms pass then show a toasty that location is being calculated...
        processTimeout = setTimeout(() => {
          new Toasty({
            text: this._translateService.instant('demos.location-calculating')
          }).show();
        }, 750);
      } else {
        // location might not be enabled or permission not granted
        // show alert informing user and return since we can't do anything with location for the device
        this._logService.logBreadCrumb(
          DemosComponent.LOG_TAG + `geolocation isEnabled = ${isEnabled}`
        );

        // show the confirmation asking if they want to open the settings app on iOS only for now
        // haven't looked into handling android with similar flow just yet
        if (isIOS) {
          const status = CLLocationManager.authorizationStatus();
          this._logService.logBreadCrumb(
            DemosComponent.LOG_TAG + `Location Manager status = ${status}`
          );
          // check if the user has previously denied permission and then show the confirmation
          // if the user has not denied Location prior to attempting to access the device location
          // then the location permission will not be in the app settings on iOS so
          // then users can't enable/disable it at that point
          if (status === CLAuthorizationStatus.kCLAuthorizationStatusDenied) {
            confirm({
              title: '',
              message: this._translateService.instant(
                'demo-detail.geolocation-disabled'
              ),
              okButtonText: this._translateService.instant('dialogs.ok'),
              cancelButtonText: this._translateService.instant('dialogs.cancel')
            }).then(confirmResult => {
              if (confirmResult === true) {
                utils.ios
                  .getter(UIApplication, UIApplication.sharedApplication)
                  .openURL(
                    NSURL.URLWithString(UIApplicationOpenSettingsURLString)
                  );
              }
            });

            // Only returning here if we are opening the confirmation to open the settings on iOS
            return;
          }
        }
      }

      const loc = await LocationService.getLocationData();
      // clear the timeout when done
      clearTimeout(processTimeout);

      // confirm with user if they want to update the demo location
      const result = await confirm({
        message: `${this._translateService.instant(
          'demos.location-confirm-message'
        )} ${loc.place_name}?`,
        okButtonText: this._translateService.instant('dialogs.yes'),
        neutralButtonText: this._translateService.instant('dialogs.no')
      });

      if (result === true) {
        // update the demo units location 👍
        demo.location = loc.place_name;
        demo.geo = [loc.longitude, loc.latitude];
        this._datastore.save(demo);
      }
    } catch (error) {
      // clear the timeout when done
      clearTimeout(processTimeout);
      this._logService.logException(error);
    }
  }

  /**
   * Show the hidden new demo request form and hide the request demo button from view.
   * Also collapse the listview behind the form so that interaction is not possibe while form is open.
   */
  onShowNewDemoForm() {
    this._logService.logBreadCrumb(
      DemosComponent.LOG_TAG + 'Opening the request demo form.'
    );
    new Animation([
      {
        target: this.demoRequestForm.nativeElement as StackLayout,
        opacity: 1,
        translate: {
          x: 0,
          y: 0
        },
        duration: 400
      },
      {
        target: this.requestDemoBtn.nativeElement,
        opacity: 0,
        translate: { x: 0, y: 400 },
        duration: 400
      }
    ])
      .play()
      .then(() => {
        // collapse the listview since it's not visible behind the form
        // this is mainly to prevent interaction with the listview
        // be sure the listview has loaded - related: https://github.com/PushTracker/EvalApp/issues/348
        if (this.demoListView && this.demoListView.nativeElement) {
          (this.demoListView.nativeElement as ListView).visibility = 'collapse';
        }
      })
      .catch(e => {
        console.log(e.message);
      });
  }

  onCloseDemoRequestForm() {
    this._logService.logBreadCrumb(
      DemosComponent.LOG_TAG + 'Closing the request demo form.'
    );

    // make sure listview is visible for interaction
    if (this.demoListView && this.demoListView.nativeElement) {
      (this.demoListView.nativeElement as ListView).visibility = 'visible';
    }
    new Animation([
      {
        target: this.demoRequestForm.nativeElement as StackLayout,
        opacity: 0,
        translate: {
          x: 0,
          y: 1250
        },
        duration: 400
      },
      {
        target: this.requestDemoBtn.nativeElement,
        opacity: 1,
        translate: { x: 0, y: 0 },
        duration: 400
      }
    ]).play();
  }

  /**
   * Close the hidden demo request form.
   * POST the form data to the request-demo-unit on Kinvey instance.
   */
  async onSubmitDemoRequestTap() {
    // close the hidden form
    this.onCloseDemoRequestForm();

    const token = (this._userService.user._kmd as any).authtoken;

    // also need to get user location - it is required or we won't do demo requests per William
    const userLoc = await LocationService.getCoordinates().catch(error => {
      alert({
        message: this._translateService.instant(
          'demos.demo-request-location-is-required'
        ),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
      return;
    });

    // make sure we have location to send to kinvey request
    if (!userLoc) {
      this._logService.logMessage('No user location for the demo request.');
      return;
    }

    this._progressService.show(
      this._translateService.instant('demos.saving-request')
    );

    const response = await http.request({
      method: 'POST',
      url: `${HOST_URL}/rpc/${APP_KEY}/custom/request-demo-unit`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Kinvey ${token}`
      },
      content: JSON.stringify({
        lng: userLoc.longitude,
        lat: userLoc.latitude,
        maxDistance: this.demorequest.maxDistance,
        contact_info: this.demorequest.contact_info
      })
    });

    // hide the loading indicator
    this._progressService.hide();

    if (response.statusCode === 200) {
      new Toasty({
        text: this._translateService.instant('demos.demo-request-success'),
        duration: ToastDuration.LONG,
        position: ToastPosition.CENTER
      }).show();
    } else {
      this._logService.logException(
        new Error(
          `request-demo-unit error code: ${
            response.statusCode
          } - message: ${response.content.toJSON()}`
        )
      );
      alert({
        message: this._translateService.instant('demos.demo-request-error'),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
    }
  }

  /**
   * Change event for the Max Distance slider.
   * @param args
   */
  onMaxDistanceSliderChange(args: EventData) {
    // iOS will return decimals so round to whole
    this.demorequest.maxDistance = Math.round((args.object as Slider).value);
  }

  /**
   * show list actions for clinicians and reps based on the user type.
   * 1. handing over a demo unit to a clinician
   * 2. retrieving a demo unit from a clinician
   * 3. requesting a demo unit from nearby reps
   */
  async onRepDemoActionButtonTap(demo: Demo) {
    // create the Rep user type actions for demos
    const toClinicianAction = this._translateService.instant(
      'demos.demo-to-clinician-action'
    );
    const fromClinicianAction = this._translateService.instant(
      'demos.retrieve-from-clinician-action'
    );
    const repOpts = [toClinicianAction, fromClinicianAction];

    const result = await action({
      message: 'Demo Unit Actions',
      actions: repOpts,
      cancelable: true,
      cancelButtonText: 'Cancel'
    });

    // if no action selected
    if (!result) {
      return;
    }

    this._logService.logBreadCrumb(
      DemosComponent.LOG_TAG + `RepDemo Action Selected: ${result}`
    );

    const token = (this._userService.user._kmd as any).authtoken;
    let response;

    switch (result) {
      case toClinicianAction:
        const promptResult = await prompt({
          message: `Clinician's email?`,
          okButtonText: 'Enter',
          cancelButtonText: 'Cancel'
        });

        if (!promptResult.text) {
          return;
        }

        const clinicianEmail = promptResult.text;

        // also need to get user location - it is required or we won't do demo requests per William
        const userLoc = await LocationService.getCoordinates().catch(error => {
          alert({
            message: this._translateService.instant(
              'demos.demo-change-owner-location-required'
            ),
            okButtonText: this._translateService.instant('dialogs.ok')
          });
          return;
        });

        response = await http.request({
          method: 'POST',
          url: `${HOST_URL}/rpc/${APP_KEY}/custom/demo-unit-actions`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Kinvey ${token}`
          },
          content: JSON.stringify({
            action: '1',
            demoId: demo.id,
            clinicianEmail,
            newLocation: [userLoc.longitude, userLoc.latitude]
          })
        });
        break;
      case fromClinicianAction:
        response = await http.request({
          method: 'POST',
          url: `${HOST_URL}/rpc/${APP_KEY}/custom/demo-unit-actions`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Kinvey ${token}`
          },
          content: JSON.stringify({
            action: '2',
            demoId: demo.id,
            newLocation: [userLoc.longitude, userLoc.latitude]
          })
        });
        break;
    }
  }
}
