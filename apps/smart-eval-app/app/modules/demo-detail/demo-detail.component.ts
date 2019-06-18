import { Component, NgZone, OnInit } from '@angular/core';
import { Demo, PushTracker } from '@maxmobility/core';
import { BluetoothService, DemoService, FirmwareService, LocationService, LoggingService, ProgressService } from '@maxmobility/mobile';
import { TranslateService } from '@ngx-translate/core';
import { Kinvey } from 'kinvey-nativescript-sdk';
import { PageRoute, RouterExtensions } from 'nativescript-angular/router';
import { BarcodeScanner } from 'nativescript-barcodescanner';
import * as camera from 'nativescript-camera';
import { Feedback } from 'nativescript-feedback';
import * as geolocation from 'nativescript-geolocation';
import { ImageCropper, Result as ImageCropperResult } from 'nativescript-imagecropper';
import * as LS from 'nativescript-localstorage';
import { Mapbox } from 'nativescript-mapbox';
import { Toasty } from 'nativescript-toasty';
import { switchMap } from 'rxjs/operators';
import { SmartEvalKeys } from 'smart-eval-kinvey';
import * as app from 'tns-core-modules/application';
import { ImageAsset } from 'tns-core-modules/image-asset/image-asset';
import { fromBase64, ImageSource } from 'tns-core-modules/image-source/image-source';
import { isAndroid, isIOS } from 'tns-core-modules/platform';
import { setTimeout } from 'tns-core-modules/timer';
import { View } from 'tns-core-modules/ui/core/view';
import { action, alert, confirm, prompt } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import * as utils from 'tns-core-modules/utils/utils';

@Component({
  selector: 'demo',
  moduleId: module.id,
  templateUrl: 'demo-detail.component.html',
  styleUrls: ['demo-detail.component.scss']
})
export class DemoDetailComponent implements OnInit {
  private static LOG_TAG = 'demo-detail.component ';
  mapboxToken = SmartEvalKeys.MAPBOX_TOKEN;
  demo: Demo;
  // translation strings in UI
  mcu_version_label = ` - SmartDrive MCU ${this._translateService.instant(
    'general.version'
  )}`;
  ble_version_label = ` - SmartDrive BLE ${this._translateService.instant(
    'general.version'
  )}`;
  pt_version_label = ` - PushTracker ${this._translateService.instant(
    'general.version'
  )}`;

  private _imageCropper: ImageCropper;
  private _feedback: Feedback;
  private _index = -1; // index into DemoService.Demos
  private _datastore = Kinvey.DataStore.collection<any>('SmartDrives');

  /**
   * Boolean to track if the unit is new or modifying existing demo unit.
   * If new, show a prompt to the user when they are leaving the page.
   */
  private _isNewDemoUnit = false;

  constructor(
    private _page: Page,
    private _routerExtensions: RouterExtensions,
    private _pageRoute: PageRoute,
    private _zone: NgZone,
    private _barcodeScanner: BarcodeScanner,
    private _progressService: ProgressService,
    private _demoService: DemoService,
    private _bluetoothService: BluetoothService,
    private _firmwareService: FirmwareService,
    private _translateService: TranslateService,
    private _loggingService: LoggingService
  ) {
    this._loggingService.logBreadCrumb(
      DemoDetailComponent.LOG_TAG + `constructor.`
    );
    this._page.className = 'blue-gradient-down';
    this.demo = new Demo();
    this._pageRoute.activatedRoute
      .pipe(switchMap(activatedRoute => activatedRoute.queryParams))
      .forEach(params => {
        if (params.index !== undefined && params.index > -1) {
          this._index = params.index;
          const demo = DemoService.Demos.getItem(this._index);
          // BRAD - fix the image before binding to UI - https://github.com/PushTracker/EvalApp/issues/144
          if (demo.pt_image && demo.pt_image_base64) {
            demo.pt_image = fromBase64(demo.pt_image_base64);
          }
          if (demo.sd_image && demo.sd_image_base64) {
            demo.sd_image = fromBase64(demo.sd_image_base64);
          }
          this.demo = demo;
          this._setBackNav(true);
        } else {
          this.demo = new Demo();
          this._isNewDemoUnit = true;
          this._setBackNav(false);
        }
      });
  }

  ngOnInit() {
    this._imageCropper = new ImageCropper();
    this._feedback = new Feedback();
  }

  get sd_serial_label(): string {
    return (
      (this.demo.smartdrive_serial_number.length &&
        this.demo.smartdrive_serial_number) ||
      this._translateService.instant('demo-detail.scan-sd')
    );
  }

  get pt_serial_label(): string {
    return (
      (this.demo.pushtracker_serial_number.length &&
        this.demo.pushtracker_serial_number) ||
      this._translateService.instant('demo-detail.scan-pt')
    );
  }

  get title(): string {
    return `${this.demo.model} ${this._translateService.instant(
      'general.demo'
    )} ${this.demo.smartdrive_serial_number}`;
  }

  get currentVersion(): string {
    return this._firmwareService.currentVersion;
  }

  async onUpdateSDImageTap() {
    try {
      const result = await this.takePictureAndCrop();
      if (result && result.image) {
        this.demo.sd_image = result.image;
        if (this._index && this.demo.sd_image) {
          // auto-save if this demo already exists
          const picKey = this.demo.getSDImageFSKey();
          const b64 = this.demo.sd_image.toBase64String('png');
          LS.setItem(picKey, b64);
          this.demo.sd_image_base64 = b64;
          this._loggingService.logBreadCrumb(
            DemoDetailComponent.LOG_TAG + `updated SD Image.`
          );
        }
      } else {
        this._loggingService.logBreadCrumb(
          DemoDetailComponent.LOG_TAG +
            'No result returned from the image cropper.'
        );
      }
    } catch (error) {
      this._loggingService.logException(error);
    }
  }

  async onUpdatePTImageTap() {
    try {
      const result = await this.takePictureAndCrop();
      if (result && result.image !== null) {
        this.demo.pt_image = result.image;
        if (this._index && this.demo.pt_image) {
          // auto-save if this demo already exists
          const picKey = this.demo.getPTImageFSKey();
          const b64 = this.demo.pt_image.toBase64String('png');
          LS.setItem(picKey, b64);
          this.demo.pt_image_base64 = b64;
          this._loggingService.logBreadCrumb(
            DemoDetailComponent.LOG_TAG + `updated PT Image.`
          );
        }
      } else {
        this._loggingService.logBreadCrumb(
          DemoDetailComponent.LOG_TAG +
            'No result returned from the image cropper.'
        );
      }
    } catch (error) {
      this._loggingService.logException(error);
    }
  }

  haveSerial(): boolean {
    const sdSN = this.demo.smartdrive_serial_number.trim();
    // let ptSN = this.demo.pushtracker_serial_number.trim();
    return sdSN && sdSN.length && true;
  }

  async onSave() {
    try {
      if (!this.haveSerial()) {
        this._loggingService.logBreadCrumb(
          DemoDetailComponent.LOG_TAG + `no serial number entered.`
        );
        alert({
          title: '',
          message: this._translateService.instant(
            'demo-detail.sd-serial-required'
          ),
          okButtonText: this._translateService.instant('dialogs.ok')
        });
        return;
      }

      this._progressService.show(
        this._translateService.instant('demo-detail.saving-demo')
      );

      await this.demo.use();

      await this._demoService.create(this.demo);

      // the demo service calls load() at the end of create
      // now re-load our data from the service
      if (this._index > -1) {
        this._loggingService.logBreadCrumb(
          DemoDetailComponent.LOG_TAG +
            'index is greater than -1 trying to save demo-detail'
        );
      } else {
        this._index = DemoService.Demos.indexOf(
          this._demoService.getDemoBySmartDriveSerialNumber(
            this.demo.smartdrive_serial_number
          )
        );
      }

      const demo = DemoService.Demos.getItem(this._index);
      this._loggingService.logBreadCrumb(
        DemoDetailComponent.LOG_TAG + `Found demo: ${JSON.stringify(demo)}`
      );

      // BRAD - https://github.com/PushTracker/EvalApp/issues/144
      if (demo.sd_image_base64 && demo.sd_image) {
        const source = fromBase64(demo.sd_image_base64);
        demo.sd_image = source;
      }
      if (demo.pt_image_base64 && demo.pt_image) {
        const source = fromBase64(demo.pt_image_base64);
        demo.pt_image = source;
      }
      this.demo = demo;
      this._progressService.hide();
    } catch (error) {
      this._loggingService.logException(error);
      this._progressService.hide();
    }
  }

  onScan(deviceName) {
    this._barcodeScanner
      .scan({
        formats: 'QR_CODE, EAN_13',
        cancelLabel: this._translateService.instant('demo-detail.cancel-scan'), // iOS only
        cancelLabelBackgroundColor: '#333333', // iOS only
        message: `${this._translateService.instant(
          'demo-detail.scan-msg'
        )} ${deviceName ||
          this._translateService.instant('demo-detail.sd-or-pt')}`, // Android only
        showFlipCameraButton: true,
        preferFrontCamera: false,
        showTorchButton: true,
        beepOnScan: true,
        torchOn: false,
        closeCallback: () => {
          // scanner closed, not doing anything for now
        },
        resultDisplayDuration: 500, // Android only
        openSettingsIfPermissionWasPreviouslyDenied: true
      })
      .then(result => {
        const validDevices =
          deviceName === 'pushtracker'
            ? ['pushtracker', 'wristband']
            : ['smartdrive'];
        this._handleSerial(result.text, validDevices);
      })
      .catch(err => {
        this._loggingService.logException(err);
      });
  }

  onEditSD() {
    prompt({
      title: this._translateService.instant('demo-detail.enter-serial-title'),
      message: this._translateService.instant(
        'demo-detail.enter-serial-message'
      ),
      okButtonText: this._translateService.instant('general.save'),
      cancelButtonText: this._translateService.instant('dialogs.cancel')
    }).then(r => {
      try {
        this._handleSerial(r.text, ['smartdrive']);
      } catch (err) {
        this._loggingService.logException(err);
        alert({
          title: '',
          message: `${r.text} ${this._translateService.instant(
            'demo-detail.invalid-sd-serial'
          )}`,
          okButtonText: this._translateService.instant('dialogs.ok')
        });
      }
    });
  }

  onEditPT() {
    prompt({
      title: this._translateService.instant('demo-detail.enter-serial-title'),
      message: this._translateService.instant('demo-detail.enter-pt-serial'),
      okButtonText: this._translateService.instant('general.save'),
      cancelButtonText: this._translateService.instant('dialogs.cancel')
    }).then(r => {
      try {
        this._handleSerial(r.text, ['pushtracker', 'wristband']);
      } catch (err) {
        this._loggingService.logException(err);
        alert({
          title: '',
          message: '',
          okButtonText: this._translateService.instant('dialogs.ok')
        });
      }
    });
  }

  onVersionTap() {
    this._zone.run(() => {
      const connectedPTs = BluetoothService.PushTrackers.filter(
        pt => pt.connected
      );
      if (connectedPTs.length > 1) {
        const pts = connectedPTs.map(pt => pt.address);
        action({
          message:
            'Select PushTracker' + this.demo.pushtracker_serial_number.length
              ? ` ${this.demo.pushtracker_serial_number}`
              : '',
          cancelButtonText: 'Cancel',
          actions: pts
        }).then(r => {
          if (r.indexOf('Cancel') > -1) {
            return;
          }

          const pt = connectedPTs.filter(pt => pt.address === r)[0];
          this.demo.pt_version = PushTracker.versionByteToString(pt.version);
          this.demo.mcu_version = PushTracker.versionByteToString(
            pt.mcu_version
          );
          this.demo.ble_version = PushTracker.versionByteToString(
            pt.ble_version
          );
          this.demo.pt_mac_addr = pt.address;
        });
      } else if (connectedPTs.length === 1) {
        const pt = connectedPTs[0];
        this.demo.pt_version = PushTracker.versionByteToString(pt.version);
        this.demo.mcu_version = PushTracker.versionByteToString(pt.mcu_version);
        this.demo.ble_version = PushTracker.versionByteToString(pt.ble_version);
        this.demo.pt_mac_addr = pt.address;
      } else {
        this._feedback.info({
          message: this._translateService.instant('demo-detail.connect-pt')
        });
      }
    });
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
          new Toasty(
            {text: this._translateService.instant('demos.location-calculating')}
          ).show();
        }, 750);
      } else {
        // location might not be enabled or permission not granted
        // show alert informing user and return since we can't do anything with location for the device
        this._loggingService.logBreadCrumb(
          DemoDetailComponent.LOG_TAG + `geolocation isEnabled = ${isEnabled}`
        );

        // show the confirmation asking if they want to open the settings app on iOS only for now
        // haven't looked into handling android with similar flow just yet
        if (isIOS) {
          const status = CLLocationManager.authorizationStatus();
          this._loggingService.logBreadCrumb(
            DemoDetailComponent.LOG_TAG + `Location Manager status = ${status}`
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
      this._loggingService.logException(error);
    }
  }

  onSDRowTapped() {
    confirm({
      title: 'Transfer ' + this.demo.smartdrive_serial_number,
      message: 'Would you like to transfer to ' + this.demo.location,
      okButtonText: 'Transfer',
      cancelButtonText: 'Cancel'
    }).then(result => {
      // result argument is boolean
    });
  }

  /**
   * When the mapbox map loads, ensure we have geo coords for the unit and then show marker on the map where unit is located.
   * @param args
   */
  async onMapReady(args) {
    const map = args.map as Mapbox;

    // make sure we have demo unit with lat/lng
    if (!this.demo.geo || !this.demo.geo[0] || !this.demo.geo[1]) {
      const nsMapView = args.object as View;
      nsMapView.visibility = 'collapse';
      nsMapView.height = 0;
      return;
    }

    // set center of the map to the unit's coords
    map.setCenter({
      lat: this.demo.geo[1],
      lng: this.demo.geo[0],
      animated: false
    });

    // adding the one demo unit marker to the map
    map
      .addMarkers([
        {
          lat: this.demo.geo[1],
          lng: this.demo.geo[0],
          icon: 'res://sd_side_no_logo',
          subtitle: `Demo: ${this.demo.smartdrive_serial_number.toString()}`,
          selected: true
        }
      ])
      .catch(err => {
        this._loggingService.logException(err);
      });
  }

  confirmUserBackNav() {
    // if we are not updating devices then just navigate back as normal
    // else confirm with user to navigate which will cancel any active OTAs
    if (this._isNewDemoUnit === false) {
      // remove the android back pressed event
      if (isAndroid) {
        app.android.off(app.AndroidApplication.activityBackPressedEvent);
      }
      // now actually navigate back
      this._routerExtensions.back();
    } else {
      // we have a new demo unit
      confirm({
        title: this._translateService.instant('dialogs.warning'),
        message: this._translateService.instant('demo-detail.leaving-new-demo'),
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

  private _handleSerial(text: string, forDevices?: string[]) {
    try {
      this._loggingService.logBreadCrumb(
        DemoDetailComponent.LOG_TAG + `_handleSerial ${text}, ${forDevices}`
      );

      text = text || '';
      text = text.trim().toUpperCase();
      let deviceType = null;
      const isPushTracker = text[0] === 'B';
      const isWristband = text[0] === 'A';
      let isSmartDrive = false;
      const serialNumber = text;

      const value = parseInt(text, 10);
      const valid = isFinite(value);
      isSmartDrive = !isPushTracker && !isWristband && valid && value > 0;

      if (isPushTracker) {
        deviceType = 'pushtracker';
      } else if (isWristband) {
        deviceType = 'wristband';
      } else if (isSmartDrive) {
        deviceType = 'smartdrive';
      } else {
        return;
      }
      this._loggingService.logBreadCrumb(
        DemoDetailComponent.LOG_TAG + `_handleSerial deviceType = ${deviceType}`
      );

      // check the type
      if (
        forDevices &&
        forDevices.length &&
        forDevices.indexOf(deviceType) === -1
      ) {
        this._loggingService.logMessage(
          `Wrong device entered/scanned --- text: ${text}, forDevices: ${forDevices}`
        );
        return;
      }

      // set the model
      if (isPushTracker) {
        this.demo.model = 'MX2+';
      } else if (isWristband) {
        this.demo.model = 'MX2';
      }

      // now set the serial number
      if (deviceType === 'pushtracker' || deviceType === 'wristband') {
        this.demo.pushtracker_serial_number = serialNumber;
      } else if (deviceType === 'smartdrive') {
        this.demo.smartdrive_serial_number = serialNumber;
      }
    } catch (error) {
      this._loggingService.logException(error);
    }
  }

  private takePictureAndCrop() {
    try {
      // check if device has camera
      if (!camera.isAvailable()) {
        return null;
      }

      // request camera permissions
      return camera
        .requestPermissions()
        .then(
          async () => {
            const imageAsset = (await camera.takePicture({
              width: 256,
              height: 256,
              keepAspectRatio: true,
              cameraFacing: 'rear'
            })) as ImageAsset;

            const source = new ImageSource();
            const iSrc = await source.fromAsset(imageAsset);

            const result = (await this._imageCropper.show(iSrc, {
              width: 256,
              height: 256,
              lockSquare: true
            })) as ImageCropperResult;

            return result;
          },
          async error => {
            if (isIOS) {
              confirm({
                title: this._translateService.instant(
                  'general.camera-permission'
                ),
                message: this._translateService.instant(
                  'general.no-camera-permission-ios-confirm'
                ),
                okButtonText: this._translateService.instant('dialogs.yes'),
                cancelButtonText: this._translateService.instant(
                  'dialogs.cancel'
                )
              }).then(result => {
                if (result) {
                  utils.ios
                    .getter(UIApplication, UIApplication.sharedApplication)
                    .openURL(
                      NSURL.URLWithString(UIApplicationOpenSettingsURLString)
                    );
                }
              });
            } else {
              alert({
                title: this._translateService.instant(
                  'general.camera-permission'
                ),
                message: this._translateService.instant(
                  'general.no-camera-permission-android'
                ),
                okButtonText: this._translateService.instant('dialogs.ok')
              });
            }

            return null;
          }
        )
        .catch(error => {
          // this should only happen if the user cancels the image capture
          return null;
        });
    } catch (error) {
      this._loggingService.logException(error);
      return null;
    }
  }

  private _setBackNav(allowed: boolean) {
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
              title: this._translateService.instant('dialogs.warning'),
              message: this._translateService.instant(
                'demo-detail.leaving-new-demo'
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
}
