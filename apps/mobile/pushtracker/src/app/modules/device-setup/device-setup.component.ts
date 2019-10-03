import { Component, OnInit, NgZone, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { PushTrackerUser } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { Page } from 'tns-core-modules/ui/page';
import {
  PushTrackerUserService,
  BluetoothService,
  LoggingService
} from '../../services';
import { CONFIGURATIONS, STORAGE_KEYS } from '../../enums';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { isAndroid, isIOS, screen } from 'tns-core-modules/platform';
import { TranslateService } from '@ngx-translate/core';
import { PushTracker } from '../../models';
import { Toasty, ToastDuration } from 'nativescript-toasty';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';

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

  // Done button
  public showDoneButton: boolean = false;
  public doneButtonText: string = this._translateService.instant(
    'device-setup.finish'
  );
  public doLaterButtonText: string = this._translateService.instant(
    'device-setup.do-later'
  );

  constructor(
    private _router: Router,
    private _userService: PushTrackerUserService,
    private _bluetoothService: BluetoothService,
    private _translateService: TranslateService,
    private _logService: LoggingService,
    private _page: Page,
    private _zone: NgZone,
    @Optional() private _params: ModalDialogParams
  ) {
    this._page.actionBarHidden = true;
  }

  ngOnInit() {
    this._userService.user.subscribe(user => {
      this._user = user;

      if (
        this._user &&
        this._user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE &&
        !this.bluetoothAdvertised
      ) {
      }

      if (
        !this.slides.length &&
        this._user &&
        this._user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
      ) {
        // OG PushTracker configuration
        this.slides = this._translateService.instant(
          'device-setup.slides.pushtracker-with-smartdrive'
        );

        // Check for already connected PushTrackers
        this.checkIfPushTrackerAlreadyConnected();

        if (!this.pushTracker && !this.bluetoothAdvertised) {
          this._logService.logBreadCrumb(
            DeviceSetupComponent.name,
            'Asking for Bluetooth Permission'
          );
          this.askForPermissions()
            .then(() => {
              if (!this._bluetoothService.advertising) {
                this._logService.logBreadCrumb(
                  DeviceSetupComponent.name,
                  'Starting Bluetooth'
                );
                // start the bluetooth service
                return this._bluetoothService.advertise();
              }
            })
            .catch(err => {
              this._logService.logException(err);
            });
          this.bluetoothAdvertised = true;
        }

        this._bluetoothService.on(
          BluetoothService.pushtracker_connected,
          this.checkIfPushTrackerAlreadyConnected,
          this
        );

        this._bluetoothService.on(
          BluetoothService.pushtracker_disconnected,
          this.onPushTrackerDisconnected,
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

  closeModal() {
    this._params.closeCallback('');
  }

  onDoneTap(args) {
    if (this._params && this._params.context && this._params.context.modal) {
      this.closeModal();
    } else {
      this._router.navigate(['/tabs/default']);
    }
  }

  onSkipTap(args) {
    this.onDoneTap(args);
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

  checkIfPushTrackerAlreadyConnected() {
    if (!this.pushTracker) {
      const trackers = BluetoothService.PushTrackers.filter((val, _1, _2) => {
        return val.connected;
      });
      if (trackers.length === 0) {
        new Toasty({
          text: this._translateService.instant(
            'wireless-updates.messages.no-pushtracker-detected'
          ),
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
          this.pushTracker.on(
            PushTracker.daily_info_event,
            this.onPushTrackerDailyInfoEvent,
            this
          );
        //   if (this.pushTracker.ableToSend) {
        //     this.onPushTrackerDailyInfoEvent();
        //   }
        });
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'PushTracker successfully connected!'
        );
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'Set showDoneButton to true'
        );
      }
    } else {
      this.pushTracker.on(
        PushTracker.daily_info_event,
        this.onPushTrackerDailyInfoEvent,
        this
      );
    }
  }

  onPushTrackerDailyInfoEvent() {
    this._logService.logBreadCrumb(
      DeviceSetupComponent.name,
      'PushTracker daily_info_event received!'
    );
    // We just received a daily info event
    // Our connection with the OG PushTracker is solid
    this._zone.run(() => {
      this.showDoneButton = true;
    });
  }

  onPushTrackerDisconnected() {
    this._logService.logBreadCrumb(
      DeviceSetupComponent.name,
      'PushTracker disconnected!'
    );
    this.pushTracker = null;
    this._zone.run(() => {
      this.showDoneButton = false;
    });
    return;
  }
}
