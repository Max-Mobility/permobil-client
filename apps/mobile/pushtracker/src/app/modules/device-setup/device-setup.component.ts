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
import { CONFIGURATIONS, STORAGE_KEYS, APP_THEMES } from '../../enums';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { isAndroid, isIOS, screen } from 'tns-core-modules/platform';
import { TranslateService } from '@ngx-translate/core';
import { PushTracker } from '../../models';
import { Toasty, ToastDuration } from 'nativescript-toasty';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { ModalDialogParams } from 'nativescript-angular/modal-dialog';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';

// TODO: activity indicator for E2 on ios (during scanning /
// connection / etc.)

@Component({
  selector: 'device-setup',
  moduleId: module.id,
  templateUrl: './device-setup.component.html'
})
export class DeviceSetupComponent implements OnInit {
  public APP_THEMES = APP_THEMES;
  public CONFIGURATIONS = CONFIGURATIONS;
  public user: PushTrackerUser;
  slide = undefined;
  bluetoothAdvertised = false;
  // permissions for the bluetooth service
  private permissionsNeeded = [];
  public pushTracker: PushTracker;

  // e2 things
  public hasPairedE2: boolean = false;

  // Done button
  public paired: boolean = false;
  public statusMessage: string = this._translateService.instant(
    'device-setup.waiting-for-pairing-request'
  );
  public showDoneButton: boolean = false;
  public doneButtonText: string = this._translateService.instant(
    'device-setup.finish'
  );
  public doLaterButtonText: string = this._translateService.instant(
    'device-setup.do-later'
  );

  CURRENT_THEME: string;

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
    this.CURRENT_THEME = appSettings.getString(
      STORAGE_KEYS.APP_THEME,
      APP_THEMES.DEFAULT
    );
  }

  ngOnInit() {
    this._userService.user.subscribe(user => {
      this.user = user;

      if (
        !this.slide &&
        this.user &&
        this.user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
      ) {
        // OG PushTracker configuration
        this.slide = this._translateService.instant(
          'device-setup.pushtracker-with-smartdrive'
        );

        // Check for already connected PushTrackers
        this.onPushTrackerConnected();

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
          this.onPushTrackerConnected,
          this
        );

        this._bluetoothService.on(
          BluetoothService.pushtracker_disconnected,
          this.onPushTrackerDisconnected,
          this
        );
      }

      if (
        !this.slide &&
        this.user &&
        this.user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_E2_WITH_SMARTDRIVE
      ) {
        this._onPushTrackerE2();
        if (isAndroid) {
          this.showDoneButton = true;
          this.statusMessage = this._translateService.instant('wearos-comms.messages.pte2-sync-successful');
        }
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

  onPushTrackerConnected() {
    if (!this.pushTracker) {
      const trackers = BluetoothService.PushTrackers.filter((val, _1, _2) => {
        return val.connected;
      });
      if (trackers.length === 0) {
        return;
      } else if (trackers.length > 1) {
        return;
      } else {
        trackers.map(tracker => {
          this.pushTracker = tracker;
          this.paired = true;
          this.statusMessage = this._translateService.instant(
            'device-setup.pairing'
          );
          this.pushTracker.on(
            PushTracker.daily_info_event,
            this.onPushTrackerDailyInfoEvent,
            this
          );
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
      this.paired = true;
      this.statusMessage = this._translateService.instant(
        'device-setup.pairing'
      );
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
    this.paired = true;
    this.statusMessage = this._translateService.instant(
      'device-setup.connection-successful'
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

    if (this.pushTracker && this.pushTracker.ableToSend && this.paired) {
      // We were able to send and got disconnected
      this.paired = false;
      this.statusMessage = this._translateService.instant(
        'device-setup.waiting-for-pairing-request'
      );
      this.pushTracker = null;
    } else if (!this.pushTracker && !this.paired) {
      this.statusMessage = this._translateService.instant(
        'device-setup.pairing'
      );
    }

    this._zone.run(() => {
      this.showDoneButton = false;
    });
    return;
  }

  private async _onPushTrackerE2() {
    // PushTracker E2/ WearOS configuration
    this.slide = this._translateService.instant(
      'device-setup.pushtracker-e2-with-smartdrive'
    );
    WearOsComms.setDebugOutput(false);
    this.hasPairedE2 = WearOsComms.hasCompanion();
    if (this.hasPairedE2) {
      this.statusMessage = this._translateService.instant(
        'device-setup.e2.found-pairing-info'
      );
    } else {
      this.pairPushTrackerE2();
    }
  }

  public async pairPushTrackerE2() {
    // reset paired so that the ui updates properly
    this.hasPairedE2 = false;
    this.showDoneButton = false;
    // clear out the companion to make sure we don't save it accidentally
    WearOsComms.clearCompanion();
    // find possible companions for pairing
    this.statusMessage = this._translateService.instant('device-setup.e2.scanning');
    const possiblePeripherals = await this._getListOfCompanions();
    if (possiblePeripherals.length === 0) {
      // we don't have any peripherals, let them know to keep things correctly
      await alert({
        title: this._translateService.instant(
          'wearos-comms.errors.pte2-scan-error.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.pte2-scan-error.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
      return;
    }
    // ask user which companion is theirs
    const actions = possiblePeripherals.map(p => p.name);
    const result = await action({
      message: this._translateService.instant('device-setup.e2.select-device'),
      cancelButtonText: this._translateService.instant('dialogs.cancel'),
      actions: actions
    });
    const selection = possiblePeripherals.filter(p => p.name === result);
    if (selection.length === 0) {
      await alert({
        title: this._translateService.instant('device-setup.e2.must-select-error.title'),
        message: this._translateService.instant('device-setup.e2.must-select-error.message'),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
      return;
    }
    const name = selection[0].name;
    const address = selection[0].identifier.UUIDString;
    this._logService.logBreadCrumb(DeviceSetupComponent.name, `selected: ${address}`);
    // TODO: we should save the name / address to app settings for later
    // save that as the companion
    WearOsComms.saveCompanion(address);
    // try connecting and sending information
    this.statusMessage = this._translateService.instant('device-setup.e2.connecting') + `${name}`;
    const didConnect = await this._connectCompanion();
    if (didConnect) {
      console.log('didConnect', didConnect);
      this.statusMessage = this._translateService.instant('device-setup.e2.sending-authorization') + `${name}`;
      const sentMessage = await this._sendMessage();
      await this._disconnectCompanion();
      if (sentMessage) {
        this.statusMessage = this._translateService.instant('device-setup.e2.authorization-sent') + `${name}`;
        new Toasty({
          text: this._translateService.instant(
            'wearos-comms.messages.pte2-sync-successful'
          ),
          duration: ToastDuration.LONG
        }).show();
      } else {
        alert({
          title: this._translateService.instant(
            'wearos-comms.errors.pte2-send-error.title'
          ),
          message: this._translateService.instant(
            'wearos-comms.errors.pte2-send-error.message'
          ),
          okButtonText: this._translateService.instant('profile-tab.ok')
        });
      }
      this.showDoneButton = true;
    } else {
      await alert({
        title: this._translateService.instant(
          'wearos-comms.errors.pte2-connection-error.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.pte2-connection-error.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    }
  }

  private _getSerializedAuth() {
    // get user
    const user = KinveyUser.getActiveUser();
    const id = user._id;
    const token = user._kmd.authtoken;
    // this._logService.logBreadCrumb(DeviceSetupComponent.name, `user id: ${id}`);
    // this._logService.logBreadCrumb(DeviceSetupComponent.name, `user token: ${token}`);
    return `${id}:Kinvey ${token}`;
  }

  private async _getListOfCompanions() {
    let companions = [];
    try {
      // wait for 5 seconds while scanning and finding watches
      companions = await WearOsComms.findAvailableCompanions(5);
    } catch (err) {
      this._logService.logException(err);
    }
    return companions;
  }

  private async _connectCompanion() {
    // if we're Android we rely on WearOS Messaging, so we cannot manage connection state
    if (isAndroid) return true;
    // if we're iOS we have to actually find a companion
    let didConnect = false;
    try {
      if (!WearOsComms.hasCompanion()) {
        // TODO: more status here?
        return didConnect;
      }
      // now connect
      this._logService.logBreadCrumb(DeviceSetupComponent.name, `connecting to companion`);
      didConnect = await WearOsComms.connectCompanion(10000);
    } catch (err) {
      console.error('error connecting:', err);
      // clear out the companion so we can search again
      WearOsComms.clearCompanion();
      this._logService.logException(err);
    }
    return didConnect;
  }

  private async _disconnectCompanion() {
    // if we're Android we rely on WearOS Messaging, so we cannot manage connection state
    if (isAndroid) return true;
    // if we're iOS we have to actually disconnect from the companion
    try {
      await WearOsComms.disconnectCompanion();
    } catch (err) {
      this._logService.logException(err);
    }
  }

  private async _sendData() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendData(this._getSerializedAuth());
      if (didSend) {
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'SendData successful.'
        );
      } else {
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'SendData unsuccessful.'
        );
      }
    } catch (error) {
      this._logService.logException(error);
    }
    return didSend;
  }

  private async _sendMessage() {
    let didSend = false;
    try {
      didSend = await WearOsComms.sendMessage(
        '/app-message',
        this._getSerializedAuth()
      );
      if (didSend) {
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'SendMessage successful.'
        );
      } else {
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'SendMessage unsuccessful.'
        );
      }
    } catch (error) {
      this._logService.logException(error);
    }
    return didSend;
  }
}
