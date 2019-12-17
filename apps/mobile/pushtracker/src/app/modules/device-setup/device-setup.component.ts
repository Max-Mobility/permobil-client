import { Component, NgZone, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { WearOsComms } from '@maxmobility/nativescript-wear-os-comms';
import { ModalDialogParams } from '@nativescript/angular';
import { isAndroid, isIOS, Page } from '@nativescript/core';
import * as application from '@nativescript/core/application';
import * as appSettings from '@nativescript/core/application-settings';
import { action, alert, confirm } from '@nativescript/core/ui/dialogs';
import { TranslateService } from '@ngx-translate/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import { ToastDuration, Toasty } from 'nativescript-toasty';
import { APP_THEMES, CONFIGURATIONS, STORAGE_KEYS } from '../../enums';
import { PushTracker, PushTrackerUser } from '../../models';
import { BluetoothService, LoggingCategory, LoggingService } from '../../services';

// TODO: activity indicator for E2 on ios (during scanning /
// connection / etc.)

@Component({
  selector: 'device-setup',
  moduleId: module.id,
  templateUrl: './device-setup.component.html'
})
export class DeviceSetupComponent {
  APP_THEMES = APP_THEMES;
  CONFIGURATIONS = CONFIGURATIONS;
  CURRENT_THEME: string;
  user: PushTrackerUser;
  slide = undefined;
  // Done button
  paired: boolean = false;
  connected: boolean = false;
  setupComplete: boolean = false;
  // messages
  statusMessage: string = this._translateService.instant(
    'device-setup.waiting-for-pairing-request'
  );
  showDoneButton: boolean = false;
  doneButtonText: string = this._translateService.instant(
    'device-setup.finish'
  );
  doLaterButtonText: string = this._translateService.instant(
    'device-setup.do-later'
  );
  showFailure: boolean = false;
  failureButtonText: string = this._translateService.instant(
    'device-setup.retry'
  );
  // e2 things
  hasPairedE2: boolean = false;
  // permissions for the bluetooth service
  private permissionsNeeded = [];
  private CAPABILITY_WEAR_APP: string = 'permobil_pushtracker_wear_app';
  private CAPABILITY_PHONE_APP: string = 'permobil_pushtracker_phone_app';
  constructor(
    private _router: Router,
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

    this.user = KinveyUser.getActiveUser() as PushTrackerUser;
    this.init();
  }

  async init() {
    const config = this.user?.data?.control_configuration;
    if (config === CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE) {
      this.initPushTracker();
    } else if (config === CONFIGURATIONS.PUSHTRACKER_E2_WITH_SMARTDRIVE) {
      this.initPushTrackerE2();
    }
  }

  async initPushTracker() {
    // OG PushTracker configuration
    this.slide = this._translateService.instant(
      'device-setup.pushtracker-with-smartdrive'
    );

    this.registerBluetoothEvents();
    this.updatePushTrackerState();

    if (!this._bluetoothService.advertising) {
      this._askForPermissions()
        .then((didGetPermissions) => {
          if (didGetPermissions) {
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
    }
  }

  async initPushTrackerE2() {
    // PushTracker E2/ WearOS configuration
    this.slide = this._translateService.instant(
      'device-setup.pushtracker-e2-with-smartdrive'
    );
    try {
      await WearOsComms.initPhone();
      // start looking for E2
      this._onPushTrackerE2();
    } catch (err) {
      this._logService.logBreadCrumb(
        DeviceSetupComponent.name,
        `Error initializing phone wear-os-comms: ${err}`
      );
    }
  }

  unregisterBluetoothEvents() {
    this._bluetoothService.off(
      BluetoothService.pushtracker_added,
      this.updatePushTrackerState.bind(this)
    );

    this._bluetoothService.off(
      BluetoothService.pushtracker_connected,
      this.updatePushTrackerState.bind(this)
    );
  }

  registerBluetoothEvents() {
    this.unregisterBluetoothEvents();
    this._bluetoothService.on(
      BluetoothService.pushtracker_added,
      this.updatePushTrackerState.bind(this)
    );

    this._bluetoothService.on(
      BluetoothService.pushtracker_connected,
      this.updatePushTrackerState.bind(this)
    );
  }

  isAndroid(): boolean {
    return isAndroid;
  }

  async pairPushTrackerE2() {
    if (isAndroid) {
      await this._pairPushTrackerE2Android();
    } else {
      await this._pairPushTrackerE2IOS();
    }
  }

  onDoneTap(args) {
    if (this._params && this._params.context && this._params.context.modal) {
      this._params.closeCallback('');
    } else {
      this._router.navigate(['/tabs/default']);
    }
  }

  onDoLaterTap(args) {
    this.onDoneTap(args);
  }

  private async _confirmToOpenSettingsOnIOS() {
    if (isIOS) {
      const confirmResult = await confirm({
        message: this._translateService.instant('bluetooth.ios-open-settings'),
        cancelable: true,
        okButtonText: this._translateService.instant('dialogs.yes'),
        cancelButtonText: this._translateService.instant('dialogs.no')
      });

      if (confirmResult === true) {
        // open Settings on iOS for this device
        UIApplication.sharedApplication.openURL(
          NSURL.URLWithString(UIApplicationOpenSettingsURLString)
        );
      } else {
        this._logService.logBreadCrumb(
          DeviceSetupComponent.name,
          'User declined to open Settings to enable Bluetooth.'
        );
      }
    }
  }

  private async _askForPermissions() {
    const hasPermission = await this._bluetoothService.hasPermissions();
    if (hasPermission) {
      return true;
    }
    this._logService.logBreadCrumb(
      DeviceSetupComponent.name,
      'Asking for Bluetooth Permission'
    );
    if (isAndroid) {
      // only show our permissions alert on android - on iOS the
      // system has already shown the permissions request at this
      // point, and the text for it comes from Info.plist
      await alert({
        title: this._translateService.instant(
          'permissions-request.title'
        ),
        message: this._translateService.instant(
          'permissions-reasons.coarse-location'
        ),
        okButtonText: this._translateService.instant('general.ok')
      });
      const perm = await this._bluetoothService.requestPermissions();
      return perm;
    } else if (isIOS) {
      this._confirmToOpenSettingsOnIOS();
      return false;
    }
  }

  private registerPushTrackerEvents(pt: PushTracker) {
    // unregister to make sure we don't register multiple times
    pt.off(
      PushTracker.daily_info_event,
      this.onPushTrackerDailyInfoEvent.bind(this)
    );
    // now register for the events we're interested in
    pt.on(
      PushTracker.daily_info_event,
      this.onPushTrackerDailyInfoEvent.bind(this)
    );
  }

  private updatePushTrackerState() {
    this._zone.run(() => {
      if (this.setupComplete) {
        this.statusMessage = this._translateService.instant(
          'device-setup.connection-successful'
        );
        this.showDoneButton = true;
        return;
      }
      // a pt has been paired if we have at least one known pushtracker
      this.paired = BluetoothService.PushTrackers.length > 0;
      if (!this.paired) {
        // there are no pushtrackers we are aware of - set the status
        // message to indicate we are waiting for pushtrackers
        this.statusMessage = this._translateService.instant(
          'device-setup.waiting-for-pairing-request'
        );
      } else {
        // we are aware of pushtrackers - register for their events
        BluetoothService.PushTrackers.forEach(this.registerPushTrackerEvents.bind(this));
        // now see if any are currently connected
        const pts = BluetoothService.PushTrackers.filter(pt => pt.connected);
        if (pts.length === 0) {
          // we have known pushtrackers, but non are currently connected
          // - set the status message to indicate we are waiting for
          // connection
          this.statusMessage = this._translateService.instant(
            'device-setup.pairing'
          );
        } else {
          // update state
          this.connected = true;
          this.setupComplete = true;
          // we have at least one pushtracker known and currently
          // connected - set the status message to indicate we are
          // successfully connected
          this.statusMessage = this._translateService.instant(
            'device-setup.connection-successful'
          );
          this.showDoneButton = true;
        }
      }
    });
  }

  private onPushTrackerDailyInfoEvent() {
    this._logService.logBreadCrumb(
      DeviceSetupComponent.name,
      'PushTracker daily_info_event received!'
    );
    // We just received a daily info event
    // Our connection with the OG PushTracker is solid
    this.paired = true;
    this.connected = true;
    this.setupComplete = true;
    this.updatePushTrackerState();
  }

  private async _onPushTrackerE2() {
    this.showFailure = false;
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

  private async _pairPushTrackerE2Android() {
    // update display
    this.showFailure = false;
    this.statusMessage = this._translateService.instant(
      'device-setup.e2.finding-app'
    );
    // reset paired so that the ui updates properly
    this.hasPairedE2 = false;
    this.showDoneButton = false;
    // clear out the companion to make sure we don't save it accidentally
    WearOsComms.clearCompanion();

    // see if there are any companion devices with the app
    // installed - if so, save them and show success
    const nodesWithApp = await WearOsComms.findDevicesWithApp(
      this.CAPABILITY_WEAR_APP
    );
    if (nodesWithApp.length >= 1) {
      const node = nodesWithApp[0];
      const name = node.getDisplayName();
      // save companion
      WearOsComms.saveCompanion(name);
      // send data to remote apps
      this.statusMessage =
        this._translateService.instant(
          'device-setup.e2.sending-authorization'
        ) + `${name}`;
      const sentMessage = await this._sendMessage();
      // await this._disconnectCompanion();
      if (sentMessage) {
        new Toasty({
          text: this._translateService.instant(
            'wearos-comms.messages.pte2-sync-successful'
          ),
          duration: ToastDuration.LONG
        }).show();
        this.statusMessage =
          this._translateService.instant('device-setup.e2.authorization-sent') +
          `${name}`;
        this.showDoneButton = true;
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
        this.showFailure = true;
        this.statusMessage =
          this._translateService.instant('device-setup.e2.failures.sending') +
          `${name}`;
      }
      return;
    }

    // if there are no companion devices with the app installed,
    // see if there are any companion devices connected
    this.statusMessage = this._translateService.instant(
      'device-setup.e2.finding-devices'
    );
    const nodesConnected = await WearOsComms.findDevicesConnected(10000);

    // if there are not companion devices connected, inform the
    // user they need to set up a PushTracker E2 with the WearOS app
    // to pair it to their phone.
    if (nodesConnected.length === 0) {
      await alert({
        title: this._translateService.instant(
          'wearos-comms.errors.pte2-not-setup.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.pte2-not-setup.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
      this.showFailure = true;
      this.statusMessage = this._translateService.instant(
        'device-setup.e2.failures.none-found'
      );
      return;
    }

    // if there are companion devices connected, open the
    // pushtracker app in the play store on the watch
    await WearOsComms.openAppInPlayStoreOnWatch('com.permobil.pushtracker');

    // potentially wait here for the user to install the app -
    // or should we just inform them that we've opened the play store
    // and they'll need to install, run, and retry?
    await alert({
      title: this._translateService.instant(
        'wearos-comms.errors.pte2-not-installed.title'
      ),
      message: this._translateService.instant(
        'wearos-comms.errors.pte2-not-installed.message'
      ),
      okButtonText: this._translateService.instant('profile-tab.ok')
    });
    this.showFailure = true;
    this.statusMessage = this._translateService.instant(
      'device-setup.e2.failures.app-not-installed'
    );
  }

  private async _pairPushTrackerE2IOS() {
    // update display
    this.showFailure = false;
    this.statusMessage = this._translateService.instant(
      'device-setup.e2.scanning'
    );
    // reset paired so that the ui updates properly
    this.hasPairedE2 = false;
    this.showDoneButton = false;
    // clear out the companion to make sure we don't save it accidentally
    WearOsComms.clearCompanion();
    // find possible companions for pairing
    const possiblePeripherals = await this._getListOfCompanions();
    if (possiblePeripherals === null || possiblePeripherals === undefined) {
      // search failed, let them know
      await alert({
        title: this._translateService.instant(
          'wearos-comms.errors.bluetooth-error.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.bluetooth-error.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
      this.showFailure = true;
      this.statusMessage = this._translateService.instant(
        'device-setup.e2.failures.bluetooth'
      );
      return;
    }
    if (possiblePeripherals.length === 0) {
      // we don't have any peripherals, let them know to
      await alert({
        title: this._translateService.instant(
          'wearos-comms.errors.pte2-scan-error.title'
        ),
        message: this._translateService.instant(
          'wearos-comms.errors.pte2-scan-error.message'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
      this.showFailure = true;
      this.statusMessage = this._translateService.instant(
        'device-setup.e2.failures.none-found'
      );
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
        title: this._translateService.instant(
          'device-setup.e2.must-select-error.title'
        ),
        message: this._translateService.instant(
          'device-setup.e2.must-select-error.message'
        ),
        okButtonText: this._translateService.instant('dialogs.ok')
      });
      this.showFailure = true;
      this.statusMessage = this._translateService.instant(
        'device-setup.e2.failures.none-selected'
      );
      return;
    }
    const name = selection[0].name;
    const address = selection[0].identifier.UUIDString;
    this._logService.logBreadCrumb(
      DeviceSetupComponent.name,
      `selected: ${address}`
    );
    // TODO: we should save the name / address to app settings for later
    // save that as the companion
    WearOsComms.saveCompanion(address);
    // try connecting and sending information
    this.statusMessage =
      this._translateService.instant('device-setup.e2.connecting') + `${name}`;
    const didConnect = await this._connectCompanion();
    if (didConnect) {
      this.statusMessage =
        this._translateService.instant(
          'device-setup.e2.sending-authorization'
        ) + `${name}`;
      const sentMessage = await this._sendMessage();
      await this._disconnectCompanion();
      if (sentMessage) {
        new Toasty({
          text: this._translateService.instant(
            'wearos-comms.messages.pte2-sync-successful'
          ),
          duration: ToastDuration.LONG
        }).show();
        this.statusMessage =
          this._translateService.instant('device-setup.e2.authorization-sent') +
          `${name}`;
        this.showDoneButton = true;
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
        this.showFailure = true;
        this.statusMessage =
          this._translateService.instant('device-setup.e2.failures.sending') +
          `${name}`;
        return;
      }
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
      this.showFailure = true;
      this.statusMessage =
        this._translateService.instant('device-setup.e2.failures.connect') +
        `${name}`;
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
      this._logService.logBreadCrumb(
        DeviceSetupComponent.name,
        `connecting to companion`
      );
      didConnect = await WearOsComms.connectCompanion(10000);
    } catch (err) {
      console.error('error connecting:', err);
      // clear out the companion so we can search again
      WearOsComms.clearCompanion();
      // this._logService.logException(err);
      this._logService.logBreadCrumb(
        DeviceSetupComponent.name,
        'Error connecting: ' + err.message + '\n\t' + err,
        LoggingCategory.Warning
      );
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
      // this._logService.logException(err);
      this._logService.logBreadCrumb(
        DeviceSetupComponent.name,
        'Error disconnecting: ' + err.message + '\n\t' + err,
        LoggingCategory.Warning
      );
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
      // this._logService.logException(error);
      this._logService.logBreadCrumb(
        DeviceSetupComponent.name,
        'Error sending data: ' + error.message + '\n\t' + error,
        LoggingCategory.Warning
      );
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
      // means no devices are connected
      // this._logService.logException(error);
      this._logService.logBreadCrumb(
        DeviceSetupComponent.name,
        'Error sending message: ' + error.message + '\n\t' + error,
        LoggingCategory.Warning
      );
    }
    return didSend;
  }
}
