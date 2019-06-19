import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { PushTracker, SmartDrive } from '@maxmobility/core';
import {
  BluetoothService,
  FirmwareService,
  LoggingService,
  ProgressService
} from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { Carousel, CarouselItem } from 'nativescript-carousel';
import { allowSleepAgain, keepAwake } from 'nativescript-insomnia';
import { Subscription } from 'rxjs/Subscription';
import * as app from 'tns-core-modules/application';
import { Color } from 'tns-core-modules/color';
import {
  ChangedData,
  ObservableArray
} from 'tns-core-modules/data/observable-array';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { EventData } from 'tns-core-modules/ui/core/view';
import { alert, confirm } from 'tns-core-modules/ui/dialogs';
import { Label } from 'tns-core-modules/ui/label';
import { Page } from 'tns-core-modules/ui/page';
import { ScrollView } from 'tns-core-modules/ui/scroll-view';

@Component({
  selector: 'ota',
  moduleId: module.id,
  templateUrl: 'ota.component.html',
  styleUrls: ['ota.component.scss']
})
export class OTAComponent implements OnInit {
  private static LOG_TAG = 'ota.component ';

  @ViewChild('carousel', { static: false })
  carousel: ElementRef;
  selectedPage = 0;
  connected = false;
  updating = false;
  searching = false;
  bluetoothReady = false;
  // translation - changes depending on state
  updatingButtonText = this._translateService.instant('ota.begin');
  smartDriveOTAs = new ObservableArray<SmartDrive>();
  pushTrackerOTAs = new ObservableArray<PushTracker>();
  private routeSub: Subscription; // subscription to route observer
  private slideInterval = 5000;
  private slideIntervalID: any;
  private _hasSeenOtaMultipleDeviceAlert = false;

  constructor(
    private _page: Page,
    private _router: Router,
    private _routerExtensions: RouterExtensions,
    private _translateService: TranslateService,
    private _progressService: ProgressService,
    private _bluetoothService: BluetoothService,
    private _firmwareService: FirmwareService,
    private _loggingService: LoggingService
  ) {
    this._page.className = 'blue-gradient-down';

    // add current pushtrackers to ota candidates
    BluetoothService.PushTrackers.map(pt => {
      this.pushTrackerOTAs.push(pt);
    });
    this.register();
  }

  ngOnInit() {
    this._loggingService.logBreadCrumb(OTAComponent.LOG_TAG + 'ngOnInit');
    // see https://github.com/NativeScript/nativescript-angular/issues/1049
    this.routeSub = this._router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.unregister();
        this.cancelOTAs(true);
        if (this.slideIntervalID) {
          clearInterval(this.slideIntervalID);
        }
      }
    });

    this._page.on(Page.navigatingFromEvent, event => {
      if (this.slideIntervalID) {
        clearInterval(this.slideIntervalID);
      }
    });

    if (this.slideIntervalID) {
      clearInterval(this.slideIntervalID);
    }
  }

  register(): void {
    this._loggingService.logBreadCrumb(OTAComponent.LOG_TAG + 'register()');
    this.unregister();
    // handle pushtracker pairing events for existing pushtrackers
    // listen for completely new pusthrackers (that we haven't seen before)
    BluetoothService.PushTrackers.on(
      ObservableArray.changeEvent,
      (args: ChangedData<number>) => {
        if (args.action === 'add') {
          const pt = BluetoothService.PushTrackers.getItem(
            BluetoothService.PushTrackers.length - 1
          );
          if (pt) {
            this.pushTrackerOTAs.push(pt);
          }
        }
      }
    );
  }

  unregister(): void {
    this._loggingService.logBreadCrumb(OTAComponent.LOG_TAG + 'unregister()');
    BluetoothService.PushTrackers.off(ObservableArray.changeEvent);
  }

  get currentVersion(): string {
    return this._firmwareService.currentVersion;
  }

  get ready(): boolean {
    return this._firmwareService.haveFirmwares;
  }

  async checkForNewFirmwareTap() {
    this._loggingService.logBreadCrumb(
      OTAComponent.LOG_TAG + 'checkForNewFirmwareTap()'
    );
    const x = this._firmwareService.currentVersion;

    const result = await confirm({
      message: this._translateService.instant('ota.check_new_firmware_message'),
      okButtonText: this._translateService.instant('dialogs.yes'),
      cancelButtonText: this._translateService.instant('dialogs.no'),
      cancelable: true
    });

    if (result === true) {
      // show indicator for download
      this._progressService.show(
        this._translateService.instant('ota.downloading')
      );

      const carousel = this.carousel.nativeElement as Carousel;

      this._firmwareService
        .downloadFirmwares()
        .then(() => {
          this._loggingService.logBreadCrumb(
            OTAComponent.LOG_TAG + `Firmares updated on device.`
          );
          this._progressService.hide();
          // remove old items and add new from the translation file firmware string array
          this._loadFirmwareDescriptionItems(carousel);
        })
        .catch(error => {
          this._progressService.hide();
          this._loggingService.logException(error);
          alert({
            message: this._translateService.instant('ota.check_firmware_error'),
            okButtonText: this._translateService.instant('dialogs.ok')
          });
        });
    }
  }

  /**
   * Load the initial carousel items based on the firmware.currentversion string array from translation files
   */
  onCarouselLoad(args: EventData): void {
    const carousel = args.object as Carousel;
    this._loadFirmwareDescriptionItems(carousel);
  }

  rssiToColor(_rssi): string {
    let rssi = null;
    try {
      rssi = parseInt(_rssi, 10);
    } catch (err) {
      this._loggingService.logException(err);
    }
    if (rssi === null) {
      return 'red';
    }
    if (rssi > -70) {
      return 'green';
    }
    if (rssi > -80) {
      return 'GoldenRod';
    }
    if (rssi > -90) {
      return 'OrangeRed';
    }
    return 'red';
  }

  // Connectivity
  discoverSmartDrives() {
    this._progressService.show(
      this._translateService.instant('bluetooth.searching')
    );
    return this._bluetoothService
      .scanForSmartDrive(8)
      .then(() => {
        this._progressService.hide();
        return BluetoothService.SmartDrives;
      })
      .catch(e => {
        console.log('error finding smartdrives', e);
        this._progressService.hide();
        this._loggingService.logException(e);
      });
  }

  confirmUserBackNav() {
    // if we are not updating devices then just navigate back as normal
    // else confirm with user to navigate which will cancel any active OTAs
    if (this.updating === false) {
      // remove the android back pressed event
      if (isAndroid) {
        app.android.off(app.AndroidApplication.activityBackPressedEvent);
      }
      // now actually navigate back
      this._routerExtensions.back();
    } else {
      confirm({
        title: this._translateService.instant('ota.warnings.leaving.title'),
        message: this._translateService.instant('ota.warnings.leaving.message'),
        okButtonText: this._translateService.instant('dialogs.yes'),
        cancelable: true,
        cancelButtonText: this._translateService.instant('dialogs.cancel')
      }).then((result: boolean) => {
        if (result === true) {
          // remove the android back pressed event
          if (isAndroid) {
            app.android.off(app.AndroidApplication.activityBackPressedEvent);
          }

          // now actually navigate back
          this._routerExtensions.back();
        }
      });
    }
  }

  async onStartOtaUpdate() {
    const isAvailable = await this._bluetoothService.available();

    if (!isAvailable) {
      // bluetooth is not available
      alert({
        title: this._translateService.instant(
          'bluetooth.errors.unavailable.title'
        ),
        message: this._translateService.instant(
          'bluetooth.errors.unavailable.message'
        ),
        okButtonText: this._translateService.instant('dialogs.ok')
      }).then(() => {
        this._bluetoothService.advertise();
      });
      return;
    }

    if (!this.updating) {
      alert({
        title: this._translateService.instant('ota.warnings.starting.title'),
        message: this._translateService.instant(
          'ota.warnings.starting.message'
        ),
        okButtonText: this._translateService.instant('dialogs.ok')
      })
        .then(() => {
          // disable back nav for iOS - add event listener for android hardware back button
          this.setBackNav(false);
          // keep screen on with insomnia - related: https://github.com/PushTracker/EvalApp/issues/154
          keepAwake().then(() => {
            // console.log('Insomnia is active');
          });

          this._loggingService.logBreadCrumb(
            OTAComponent.LOG_TAG + `Start performing OTAs...`
          );
          // start updating
          return this.performOTAs();
        })
        .then(otaStatuses => {
          this._loggingService.logBreadCrumb(
            OTAComponent.LOG_TAG +
              `Completed all OTAs with statues: ${JSON.stringify(otaStatuses)}`
          );
          this.cancelOTAs(false);
        })
        .catch(err => {
          this._loggingService.logException(err);
          this._loggingService.logBreadCrumb(
            OTAComponent.LOG_TAG + `Couldn't finish updating: ${err}`
          );
          this.cancelOTAs(true);
        });
    } else {
      // we're already updating
      this.cancelOTAs(true);
    }
  }

  async onRefreshDeviceList(): Promise<any> {
    // if bluetooth is not enabled, return and alert user

    const isEnabled = await this._bluetoothService.radioEnabled();
    if (!this._bluetoothService.enabled || !isEnabled) {
      this._loggingService.logBreadCrumb(
        OTAComponent.LOG_TAG + `Bluetooth service is not enabled.`
      );
      alert({
        message: this._translateService.instant('bluetooth.enable-bluetooth'),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
      return;
    }
    if (!this.updating && !this.searching) {
      this.smartDriveOTAs.splice(0, this.smartDriveOTAs.length);
      this.searching = true;
      return this._bluetoothService
        .available()
        .then(available => {
          if (available) {
            return this.discoverSmartDrives();
          } else {
            // bluetooth is not available
            return alert({
              title: this._translateService.instant(
                'bluetooth.errors.unavailable.title'
              ),
              message: this._translateService.instant(
                'bluetooth.errors.unavailable.message'
              ),
              okButtonText: this._translateService.instant('dialogs.ok')
            }).then(() => {
              this.searching = false;
              return this._bluetoothService.advertise();
            });
          }
        })
        .then(() => {
          this.smartDriveOTAs.splice(0, this.smartDriveOTAs.length);
          BluetoothService.SmartDrives.map(sd => {
            this.smartDriveOTAs.push(sd);
          });
          this.searching = false;
        });
    }
  }

  private async performOTAs(): Promise<any> {
    this.updatingButtonText = this._translateService.instant('ota.cancel');

    // if this is the first OTA update to start, show an alert mentioning
    if (this._hasSeenOtaMultipleDeviceAlert === false) {
      // show the alert -- awaiting before proceeding to make sure alert is clear
      await alert({
        title: this._translateService.instant(
          'ota.warnings.multiple-devices.title'
        ),
        message: this._translateService.instant(
          'ota.warnings.multiple-devices.message'
        ),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
      this._hasSeenOtaMultipleDeviceAlert = true; // set true so it's not shown on subsequent OTAs
    }

    return Promise.resolve().then(() => {
      // OTA the selected smart drive(s)
      const smartDriveOTATasks = this.smartDriveOTAs.map(sd => {
        return sd.performOTA(
          this._firmwareService.firmwares.BLE.data,
          this._firmwareService.firmwares.MCU.data,
          this._firmwareService.firmwares.BLE.version,
          this._firmwareService.firmwares.MCU.version,
          300000
        );
      });

      const pushTrackerOTATasks = this.pushTrackerOTAs.map(pt => {
        return pt.performOTA(
          this._firmwareService.firmwares.PT.data,
          this._firmwareService.firmwares.PT.version,
          300000
        );
      });

      const otaTasks = smartDriveOTATasks.concat(pushTrackerOTATasks);

      if (otaTasks && otaTasks.length) {
        this.updating = true;
        return Promise.all(otaTasks);
      } else {
        return alert({
          title: this._translateService.instant('ota.errors.devices.title'),
          message: this._translateService.instant('ota.errors.devices.message'),
          okButtonText: this._translateService.instant('dialogs.ok')
        }).then(() => []);
      }
    });
  }

  private setBackNav(allowed: boolean) {
    if (isIOS) {
      if (
        this._page.ios.navigationController &&
        this._page.ios.navigationController.interactivePopGestureRecognizer
      ) {
        this._page.ios.navigationController.interactivePopGestureRecognizer.enabled = allowed;
      }
      this._page.enableSwipeBackNavigation = allowed;
    } else if (isAndroid) {
      if (allowed) {
        app.android.off(app.AndroidApplication.activityBackPressedEvent);
      } else {
        // setting the event listener for the android back pressed event
        app.android.on(
          app.AndroidApplication.activityBackPressedEvent,
          (args: app.AndroidActivityBackPressedEventData) => {
            // cancel the back nav for now then confirm with user to leave
            args.cancel = true;
            confirm({
              title: this._translateService.instant(
                'ota.warnings.leaving.title'
              ),
              message: this._translateService.instant(
                'ota.warnings.leaving.message'
              ),
              okButtonText: this._translateService.instant('dialogs.yes'),
              cancelable: true,
              cancelButtonText: this._translateService.instant('dialogs.cancel')
            }).then((result: boolean) => {
              if (result === true) {
                // user wants to leave so remove the back pressed event
                app.android.off(
                  app.AndroidApplication.activityBackPressedEvent
                );
                // now actually navigate back
                this._routerExtensions.back();
              }
            });
          }
        );
      }
    }
  }

  private cancelOTAs(doCancel: boolean) {
    // re-enable back nav and remove the back pressed event listener for android
    this.setBackNav(true);

    // disable the insomnia so screen can sleep now - related: https://github.com/PushTracker/EvalApp/issues/154
    allowSleepAgain().then(() => {
      // console.log('Insomnia is inactive, good night!');
    });

    this.updating = false;
    this.updatingButtonText = this._translateService.instant('ota.begin');
    if (doCancel) {
      this._loggingService.logBreadCrumb(
        OTAComponent.LOG_TAG + `Cancelling all OTAs`
      );
      this.smartDriveOTAs.map(sd => sd.cancelOTA());
      this.pushTrackerOTAs.map(pt => pt.cancelOTA());
    }
  }

  /**
   * Will update the items in the carousel based on the firmware.VERSION string array
   * @param carousel [Carousel]
   */
  private _loadFirmwareDescriptionItems(carousel: any) {
    // remove all children from the carousel (carousel extends GridLayout)
    carousel.removeChildren();

    let firmwareDescriptionItems = this._translateService.instant(
      'firmware.' + this._firmwareService.currentVersion
    );
    this._loggingService.logBreadCrumb(
      OTAComponent.LOG_TAG +
        `Current firmware description items: ${firmwareDescriptionItems}`
    );

    if (
      !this._firmwareService.currentVersion ||
      this._firmwareService.currentVersion === 'unknown'
    ) {
      firmwareDescriptionItems = this._translateService.instant(
        'firmware.not-found'
      );
    }

    const whiteColor = new Color('#fff');

    firmwareDescriptionItems.map((item: string) => {
      // create a new scrollview for the carousel item
      const sv = new ScrollView();

      // create a new label for the carousel item
      const label = new Label();
      label.text = item;
      label.color = whiteColor;
      label.margin = 5;
      label.fontSize = 20;
      label.verticalAlignment = 'middle';
      label.padding = 15;
      label.textWrap = true;
      label.className = 'features';

      // add the label as a child of the scrollview
      sv.content = label;

      // create new carousel item and add label to it
      const newCarouselItem = new CarouselItem() as any;
      newCarouselItem.addChild(sv);

      // add the carouselItem to the carousel
      carousel.addChild(newCarouselItem);

      if (isAndroid) {
        const adapter = carousel.android.getAdapter() as android.support.v4.view.PagerAdapter;
        if (adapter) {
          adapter.notifyDataSetChanged();
          // console.log(
          //   'BRAD - FIX THIS WHEN 4.1.0 is published, PR is pending to correct the types and simplify this.'
          // );
          carousel._pageIndicatorView.setCount(firmwareDescriptionItems.length);
        }
        // carousel.pageIndicatorCount = firmwareDescriptionItems.length;
      }

      carousel.refresh();
    });
  }
}
