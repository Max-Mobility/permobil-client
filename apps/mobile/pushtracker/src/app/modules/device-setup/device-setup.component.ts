import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Page } from 'tns-core-modules/ui/page';
import { PushTrackerUserService, BluetoothService, LoggingService } from '../../services';
import { CONFIGURATIONS, STORAGE_KEYS } from '../../enums';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { isAndroid, isIOS, screen } from 'tns-core-modules/platform';
import { TranslateService } from '@ngx-translate/core';
import { PushTracker } from '../../models'; 
import { Toasty, ToastDuration } from 'nativescript-toasty';
import { hasPermission, requestPermissions } from 'nativescript-permissions';

@Component({
  selector: 'device-setup',
  moduleId: module.id,
  templateUrl: './device-setup.component.html'
})
export class DeviceSetupComponent implements OnInit {
  public CONFIGURATIONS = CONFIGURATIONS;
  private _user: PushTrackerUser;
  slides = [];
  slideIndex: number = 0;
  bluetoothAdvertised = false;
  // permissions for the bluetooth service
  private permissionsNeeded = [];
  public pushTracker: PushTracker;
  public showDoneButton: boolean = false;

  constructor(
    private _router: Router,
    private _userService: PushTrackerUserService,
    private _bluetoothService: BluetoothService,
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _page: Page
  ) {
    this._page.actionBarHidden = true;
  }

  ngOnInit() {
    this._userService.user.subscribe(user => {
      this._user = user;

      if (
        this._user &&
        this._user.data.control_configuration === CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE &&
        !this.bluetoothAdvertised
      ) {
        this._logService.logBreadCrumb(DeviceSetupComponent.name, 'Asking for Bluetooth Permission');
        this.askForPermissions()
        .then(() => {
          if (!this._bluetoothService.advertising) {
            this._logService.logBreadCrumb(DeviceSetupComponent.name, 'Starting Bluetooth');
            // start the bluetooth service
            return this._bluetoothService.advertise();
          }
        })
        .catch(err => {
            this._logService.logException(err);
        });
        this.bluetoothAdvertised = true;
      }

      if (
        !this.slides.length &&
        this._user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
      ) {
        // OG PushTracker configuration
        this.slides = this._translateService.instant(
          'device-setup.slides.pushtracker-with-smartdrive'
        );
        // set up the status watcher for the pushtracker state
        this._bluetoothService.on(
            BluetoothService.pushtracker_connected,
            this.onPushTrackerConnected,
            this
        );
      }
    });
  }

  isIOS(): boolean {
    return isIOS;
  }

  isAndroid(): boolean {
    return isAndroid;
  }

  isGif(value: string) {
    if (value.endsWith('.gif')) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Loaded event for the stacklayout that is the top part of the carousel slide
   * Setting the size based on the screen height to avoid stretching the gifs
   * @param args
   */
  onTopSlideLoaded(args) {
    args.object.height = screen.mainScreen.heightDIPs * 0.35;
  }

  /**
   * Loaded event for the Gifs in the carousel items
   * Setting the size based on the screen height to avoid stretching the gifs
   * @param args
   */
  onGifLoaded(args) {
    args.object.height = screen.mainScreen.heightDIPs * 0.35;
    args.object.width = screen.mainScreen.heightDIPs * 0.35;
  }

  onPreviousTap(args) {
    if (!this.slides) return;
    if (this.slideIndex > 0) this.slideIndex -= 1;
  }

  onNextTap(args) {
    if (!this.slides) return;
    if (this.slideIndex < this.slides.length) this.slideIndex += 1;
  }

  onDoneTap(args) {
    this.onNextTap(args);
    if (this.slideIndex === this.slides.length) {
      // Done with device setup
      this._router.navigate(['/tabs/default']);
    }
  }

  onSkipTap(args) {
    this._router.navigate(['/tabs/default']);
  }

  private async askForPermissions() {
    if (isAndroid) {
      // determine if we have shown the permissions request
      const hasShownRequest =
        appSettings.getBoolean(
          STORAGE_KEYS.SHOULD_SHOW_BLE_PERMISSION_REQUEST
        ) || false;
      // will throw an error if permissions are denied, else will
      // return either true or a permissions object detailing all the
      // granted permissions. The error thrown details which
      // permissions were rejected
      const blePermission = android.Manifest.permission.ACCESS_COARSE_LOCATION;
      const reasons = [];
      const activity: android.app.Activity =
        application.android.startActivity ||
        application.android.foregroundActivity;
      const neededPermissions = this.permissionsNeeded.filter(
        p =>
          !hasPermission(p) &&
          (activity.shouldShowRequestPermissionRationale(p) || !hasShownRequest)
      );
      // update the has-shown-request
      appSettings.setBoolean(
        STORAGE_KEYS.SHOULD_SHOW_BLE_PERMISSION_REQUEST,
        true
      );
      const reasoning = {
        [android.Manifest.permission
          .ACCESS_COARSE_LOCATION]: this._translateService.instant(
          'permissions-reasons.coarse-location'
        )
      };
      neededPermissions.map(r => {
        reasons.push(reasoning[r]);
      });
      if (neededPermissions && neededPermissions.length > 0) {
        await alert({
          title: this._translateService.instant('permissions-request.title'),
          message: reasons.join('\n\n'),
          okButtonText: this._translateService.instant('general.ok')
        });
        try {
          await requestPermissions(neededPermissions, () => {});
          return true;
        } catch (permissionsObj) {
          const hasBlePermission =
            permissionsObj[blePermission] || hasPermission(blePermission);
          if (hasBlePermission) {
            return true;
          } else {
            throw this._translateService.instant('failures.permissions');
          }
        }
      } else if (hasPermission(blePermission)) {
        return Promise.resolve(true);
      } else {
        throw this._translateService.instant('failures.permissions');
      }
    }
  }

  onPushTrackerConnected() {
    if (!this.pushTracker) {
      const trackers = BluetoothService.PushTrackers.filter(
        (val, _1, _2) => {
          return val.connected;
        }
      );
      if (trackers.length === 0) {
        new Toasty({
          text: this._translateService.instant('wireless-updates.messages.no-pushtracker-detected'),
          duration: ToastDuration.LONG
        }).show();
        return;
      } else if (trackers.length > 1) {
        new Toasty({
          text: this._translateService.instant(
            'wireless-updates.messages.more-than-one-pushtracker-connected'
          ),
          duration: ToastDuration.LONG
        }).show();
        return;
      } else {
        trackers.map(tracker => {
          this.pushTracker = tracker;
        });
        this._logService.logBreadCrumb(DeviceSetupComponent.name,
          'PushTracker successfully connected!');
        this.showDoneButton = true;
      }
    } else {
      this._logService.logBreadCrumb(DeviceSetupComponent.name,
        'PushTracker already connected!');
      this.showDoneButton = true;
    }
  }

}
