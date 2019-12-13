import { Component } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { BottomNavigation, isAndroid, isIOS, Page, SelectedIndexChangedEventData } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
import { action, alert, confirm } from '@nativescript/core/ui/dialogs';
import { TranslateService } from '@ngx-translate/core';
import { SnackBar } from '@nstudio/nativescript-snackbar';
import { Log } from '@permobil/core';
import { User as KinveyUser } from 'kinvey-nativescript-sdk';
import throttle from 'lodash/throttle';
import * as LS from 'nativescript-localstorage';
import { APP_LANGUAGES, CONFIGURATIONS } from '../../enums';
import { PushTracker, PushTrackerUser } from '../../models';
import { ActivityService, BluetoothService, LoggingService, PushTrackerUserService, SettingsService, SmartDriveErrorsService, SmartDriveUsageService } from '../../services';
import { enableDefaultTheme, YYYY_MM_DD } from '../../utils';

@Component({
  moduleId: module.id,
  selector: 'tabs-page',
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  public CONFIGURATIONS = CONFIGURATIONS;
  pushTracker: PushTracker;
  user: PushTrackerUser;
  private _throttledOnDailyInfoEvent: any = null;
  private _throttledOnDistanceEvent: any = null;
  private _firstLoad = false;
  // permissions for the bluetooth service
  private permissionsNeeded = [];
  private snackbar = new SnackBar();

  constructor(
    private _logService: LoggingService,
    private _userService: PushTrackerUserService,
    private _activityService: ActivityService,
    private _translateService: TranslateService,
    private _settingsService: SettingsService,
    private _bluetoothService: BluetoothService,
    private _routerExtensions: RouterExtensions,
    private _page: Page,
    private _usageService: SmartDriveUsageService,
    private _errorsService: SmartDriveErrorsService
  ) {
    this._logService.logBreadCrumb(TabsComponent.name, 'Constructor');

    // register for user configuration changed event
    this._userService.on(
      PushTrackerUserService.configuration_change_event,
      this.onUserChangedConfiguration,
      this
    );

    // hide the actionbar on the root tabview
    this._page.actionBarHidden = true;

    // Run every 10 minutes
    const TEN_MINUTES = 10 * 60 * 1000;
    this._throttledOnDailyInfoEvent = throttle(
      this.onDailyInfoEvent,
      TEN_MINUTES,
      {
        leading: true,
        trailing: true
      }
    );

    this._throttledOnDistanceEvent = throttle(
      this.onDistanceEvent,
      TEN_MINUTES,
      {
        leading: true,
        trailing: true
      }
    );

    // make sure to reset the data services when we load (in case the
    // user has changed)
    this._activityService.reset();
    this._usageService.reset();
    this._errorsService.reset();

    const user = KinveyUser.getActiveUser() as PushTrackerUser;

    if (!user || !user.data) {
      // we should probably logout here since we don't have a valid
      // user
      KinveyUser.logout();
      // clean up local storage
      LS.clear();
      // Clean up appSettings key-value pairs
      appSettings.clear();
      // Reset the settings service
      this._settingsService.reset();
      // restore to default theme
      enableDefaultTheme();
      // go ahead and nav to login to keep UI moving without waiting
      this._routerExtensions.navigate(['/login'], {
        clearHistory: true
      });
      return;
    }

    // we have a user - set it!
    this.user = user;

    const config = this.user.data.control_configuration;
    // @ts-ignore
    if (!Object.values(CONFIGURATIONS).includes(config)) {
      this._logService.logBreadCrumb(
        TabsComponent.name,
        `got user, but did not get valid configuration: ${config}, ${this.user}`
      );
      // the user does not have a valid configuration - route to the
      // configuration page so they can set one
      this._routerExtensions.navigate(['configuration'], {
        clearHistory: true
      });
      return;
    }

    setTimeout(this.configureBluetooth.bind(this), 1000);
  }

  private async configureBluetooth() {
    if (
      this.user &&
      this.user.data.control_configuration ===
        CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE
    ) {
      this._logService.logBreadCrumb(
        TabsComponent.name,
        'Asking for Bluetooth Permission'
      );

      return this.askForPermissions()
        .then(result => {
          if (result === false) {
            // we dont have permission to use bluetooth so we shouldn't call `advertise` until we do
            this._logService.logBreadCrumb(
              TabsComponent.name,
              'Bluetooth permission check failed, so we cannot advertise.'
            );

            // TODO: do we want to tell the user that we cannot do anything here since we don't have access???
            // William?
            return;
          }

          this.registerBluetoothEvents();
          this.registerPushTrackerEvents();
          if (!this._bluetoothService.advertising && result === true) {
            this._logService.logBreadCrumb(
              TabsComponent.name,
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

  onUserChangedConfiguration(args: any) {
    this._logService.logBreadCrumb(
      TabsComponent.name,
      `Registered user changed configuration: ${args.data.control_configuration}`
    );
    const data = args.data;
    const config = data.control_configuration;
    this.user.data.control_configuration = config;
  }

  async onRootBottomNavLoaded(_) {
    // now update all of the UI
    let language: string | APP_LANGUAGES = APP_LANGUAGES.English;
    if (this.user && this.user.data.language_preference) {
      language = APP_LANGUAGES[this.user.data.language_preference];
    }
    if (this._translateService.currentLang !== language) {
      await this._translateService.reloadLang(language).toPromise();
      await this._translateService.use(language).toPromise();
    }

    if (this._firstLoad) return;

    if (isAndroid) {
      this.permissionsNeeded.push(
        android.Manifest.permission.ACCESS_COARSE_LOCATION
      );
    }
    this._firstLoad = true;
  }

  /**
   * Executes when the bottomnavigation item index is changed.
   * Update the css class for styling the active/inactive tabstripitems.
   * @param args [SelectedIndexChangedEventData]
   */
  async tabViewIndexChange(args: SelectedIndexChangedEventData) {
    const x = args.object as BottomNavigation;
    const z = x.tabStrip.items;
    if (args.newIndex >= 0) {
      switch (args.newIndex) {
        case 0:
          z[0].className = 'tabstripitem-active';
          if (z.length > 1) {
            z[1].className = 'tabstripitem';
            z[2].className = 'tabstripitem';
          }
          break;
        case 1:
          z[0].className = 'tabstripitem';
          z[1].className = 'tabstripitem-active';
          z[2].className = 'tabstripitem';
          break;
        case 2:
          z[0].className = 'tabstripitem';
          z[1].className = 'tabstripitem';
          z[2].className = 'tabstripitem-active';
          break;
      }
    }
  }

  async tabViewIndexChangeWithoutJourney(args: SelectedIndexChangedEventData) {
    const x = args.object as BottomNavigation;
    const z = x.tabStrip.items;
    if (args.newIndex >= 0) {
      switch (args.newIndex) {
        case 0:
          z[0].className = 'tabstripitem-active';
          z[1].className = 'tabstripitem';
          break;
        case 1:
          z[0].className = 'tabstripitem';
          z[1].className = 'tabstripitem-active';
          break;
      }
    }
  }

  private async askForPermissions() {
    const hasPermission = await this._bluetoothService.hasPermissions();
    if (isAndroid && !hasPermission) {
      // only show our permissions alert on android - on iOS the
      // system has already shown the permissions request at this
      // point, and the text for it comes from Info.plist
      await alert({
        title: this._translateService.instant('permissions-request.title'),
        message: this._translateService.instant(
          'permissions-reasons.coarse-location'
        ),
        okButtonText: this._translateService.instant('general.ok')
      });
      await this._bluetoothService.requestPermissions();
      return true;
    } else if (isIOS) {
      if (hasPermission) {
        // we have bluetooth access on this device granted by the user previously
        return true;
      } else {
        // we don't have permission to access bluetooth
        // so if the user hasn't authorized Bluetooth permission to PT.M we need to let them know to enable it in Settings and try again.
        const confirmResult = await confirm({
          message:
            'PushTracker does not have access to use Bluetooth, do you want to enable Bluetooth in the Settings on your device?',
          cancelable: true,
          okButtonText: this._translateService.instant('dialogs.yes'),
          cancelButtonText: this._translateService.instant('dialogs.no')
        });

        if (confirmResult === true) {
          // open Settings on iOS for this device
          UIApplication.sharedApplication.openURL(
            NSURL.URLWithString(UIApplicationOpenSettingsURLString)
          );
        }
        return false;
      }
    }
  }

  /**
   * BLUETOOTH EVENT MANAGEMENT
   */
  private registerBluetoothEvents() {
    this.unregisterBluetoothEvents();
    // register for bluetooth events here
    this._bluetoothService.on(
      BluetoothService.advertise_error,
      this.onBluetoothAdvertiseError.bind(this)
    );
    this._bluetoothService.on(
      BluetoothService.pushtracker_connected,
      this.onPushTrackerConnected.bind(this)
    );
    this._bluetoothService.on(
      BluetoothService.pushtracker_disconnected,
      this.onPushTrackerDisconnected.bind(this)
    );
  }

  private unregisterBluetoothEvents() {
    // register for bluetooth events here
    this._bluetoothService.off(
      BluetoothService.advertise_error,
      this.onBluetoothAdvertiseError.bind(this)
    );
    this._bluetoothService.off(
      BluetoothService.pushtracker_connected,
      this.onPushTrackerConnected.bind(this)
    );
    this._bluetoothService.off(
      BluetoothService.pushtracker_disconnected,
      this.onPushTrackerDisconnected.bind(this)
    );
  }

  private onBluetoothAdvertiseError(args: any) {
    const error = args.data.error;
    alert({
      title: this._translateService.instant('bluetooth.service-failure'),
      okButtonText: this._translateService.instant('general.ok'),
      message: `${error}`
    });
  }

  private onPushTrackerPaired(args: any) {
    const pt = args.object as PushTracker;
    this._logService.logBreadCrumb(
      TabsComponent.name,
      'PushTracker paired: ' + pt.address
    );
    const msg =
      this._translateService.instant('general.pushtracker-paired') +
      `: ${pt.address}`;
    this.snackbar.simple(msg);
  }

  private onPushTrackerConnected(args: any) {
    const pt = args.data.pushtracker as PushTracker;
    if (!this.pushTracker) this.pushTracker = pt;
    const msg =
      this._translateService.instant('general.pushtracker-connected') +
      `: ${pt.address}`;
    this.snackbar.simple(msg);
    // unregister so we don't get duplicate events
    pt.off(PushTracker.daily_info_event, this._throttledOnDailyInfoEvent, this);
    pt.off(PushTracker.distance_event, this._throttledOnDistanceEvent, this);
    pt.off(PushTracker.error_event, this.onErrorEvent, this);
    pt.off(PushTracker.version_event, this.onPushTrackerVersionEvent, this);
    // now register again to make sure we get the events
    pt.on(PushTracker.daily_info_event, this._throttledOnDailyInfoEvent, this);
    pt.on(PushTracker.distance_event, this._throttledOnDistanceEvent, this);
    pt.on(PushTracker.error_event, this.onErrorEvent, this);
    pt.on(PushTracker.version_event, this.onPushTrackerVersionEvent, this);
  }

  onPushTrackerVersionEvent(args) {
    const pt = args.object as PushTracker;
    const smartDriveUpToDate =
      !pt.hasAllVersionInfo() || pt.isSmartDriveUpToDate('2.0');
    const ptUpToDate = pt.isUpToDate('2.0');
    // Alert user if they are connected to a pushtracker which is out
    // of date -
    // https://github.com/Max-Mobility/permobil-client/issues/516
    // TODO: should get this version from the server somewhere!
    if (!smartDriveUpToDate && !ptUpToDate) {
      // both the pushtrackers and the smartdrives are not up to date
      alert({
        title: this._translateService.instant(
          'profile-settings.update-notice.title'
        ),
        message: this._translateService.instant(
          'profile-settings.update-notice.pushtracker-and-smartdrive-out-of-date'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    } else if (!smartDriveUpToDate) {
      // the pushtrackers are up to date but the smartdrives are not
      alert({
        title: this._translateService.instant(
          'profile-settings.update-notice.title'
        ),
        message: this._translateService.instant(
          'profile-settings.update-notice.smartdrive-out-of-date'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    } else if (!ptUpToDate) {
      // only the pushtrackers are out of date
      alert({
        title: this._translateService.instant(
          'profile-settings.update-notice.title'
        ),
        message: this._translateService.instant(
          'profile-settings.update-notice.pushtracker-out-of-date'
        ),
        okButtonText: this._translateService.instant('profile-tab.ok')
      });
    }
  }

  onDailyInfoEvent(args) {
    this._logService.logBreadCrumb(
      TabsComponent.name,
      'daily_info_event received from PushTracker'
    );
    const data = args.data;
    const year = data.year;
    const month = data.month;
    const day = data.day;
    const pushesWithout = data.pushesWithout;
    const coastWithout = data.coastWithout;
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const dailyActivity = {
      _acl: { creator: this.user._id },
      coast_time_avg: coastWithout,
      coast_time_total: coastWithout * pushesWithout,
      date: YYYY_MM_DD(date),
      has_been_sent: false,
      push_count: pushesWithout,
      records: [],
      start_time: date.getTime(),
      watch_serial_number: this.user.data.pushtracker_serial_number
    };
    this._activityService
      .saveDailyActivityFromPushTracker(dailyActivity)
      .then(result => {
        if (result)
          this._logService.logBreadCrumb(
            TabsComponent.name,
            'DailyInfo from PushTracker successfully saved in Kinvey'
          );
        else
          this._logService.logBreadCrumb(
            TabsComponent.name,
            'Failed to save DailyInfo from PushTracker in Kinvey'
          );
      })
      .catch(err => {
        this._logService.logBreadCrumb(
          TabsComponent.name,
          'Failed to save DailyInfo from PushTracker in Kinvey'
        );
      });

    // Request distance information from PushTracker
    if (this.pushTracker) {
      this.pushTracker.sendPacket('Command', 'DistanceRequest');
      this._logService.logBreadCrumb(
        TabsComponent.name,
        'Distance data requested from PushTracker'
      );
    }
  }

  onDistanceEvent(args) {
    this._logService.logBreadCrumb(
      TabsComponent.name,
      'distance_event received from PushTracker'
    );
    const data = args.data;
    const distance_smartdrive_drive = data.driveDistance;
    const distance_smartdrive_coast = data.coastDistance;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const start_time = date.getTime();
    const dailyUsage = {
      _acl: { creator: this.user._id },
      date: YYYY_MM_DD(date),
      battery: 0,
      distance_smartdrive_coast: distance_smartdrive_coast,
      distance_smartdrive_drive: distance_smartdrive_drive,
      records: [],
      start_time: start_time,
      watch_uuid: '',
      watch_serial_number: this.user.data.pushtracker_serial_number
    };
    this._usageService
      .saveDailyUsageFromPushTracker(dailyUsage)
      .then(result => {
        if (result)
          this._logService.logBreadCrumb(
            TabsComponent.name,
            'Distance from PushTracker successfully saved in Kinvey'
          );
        else
          this._logService.logBreadCrumb(
            TabsComponent.name,
            'Failed to save Distance from PushTracker in Kinvey'
          );
        // this._logService.logException(
        //   new Error(
        //     '[TabsComponent] Failed to save Distance from PushTracker in Kinvey'
        //   )
        // );
      })
      .catch(err => {
        this._logService.logBreadCrumb(
          TabsComponent.name,
          'Failed to save Distance from PushTracker in Kinvey'
        );
        // this._logService.logException(err);
      });
  }

  onErrorEvent(args) {
    const data = args.data;
    const year = data.year;
    const month = data.month;
    const day = data.day;
    if (year === 0 && month === 0 && day === 0) {
      return;
    }

    this._logService.logBreadCrumb(
      TabsComponent.name,
      'error_event received from PushTracker'
    );

    const hour = data.hour;
    const minute = data.minute;
    const second = data.second;
    const date = new Date(year, month, day, hour, minute, second);
    const dailyErrors = {
      _acl: { creator: this.user._id },
      date: YYYY_MM_DD(date),
      most_recent_error: data.mostRecentError,
      num_battery_voltage_errors: data.numBatteryVoltageErrors || 0,
      num_over_current_errors: data.numOverCurrentErrors || 0,
      num_motor_phase_errors: data.numMotorPhaseErrors || 0,
      num_gyro_range_errors: data.numGyroRangeErrors || 0,
      num_over_temperature_errors: data.numOverTemperatureErrors || 0,
      num_ble_disconnect_errors: data.numBLEDisconnectErrors || 0,
      watch_serial_number: this.user.data.pushtracker_serial_number
    };

    // Write code to push to SmartDriveErrors collection
    this._errorsService
      .saveDailyErrorsFromPushTracker(dailyErrors)
      .then(result => {
        if (result)
          this._logService.logBreadCrumb(
            TabsComponent.name,
            'ErrorInfo from PushTracker successfully saved in Kinvey'
          );
        else
          this._logService.logBreadCrumb(
            TabsComponent.name,
            'Failed to save ErrorInfo from PushTracker in Kinvey'
          );
        // this._logService.logException(
        //   new Error(
        //     '[' +
        //     TabsComponent.name +
        //     '] ' +
        //     'Failed to save ErrorInfo from PushTracker in Kinvey'
        //   )
        // );
      })
      .catch(err => {
        this._logService.logBreadCrumb(
          TabsComponent.name,
          'Failed to save ErrorInfo from PushTracker in Kinvey'
        );
        // this._logService.logException(err);
      });
  }

  private onPushTrackerDisconnected(args: any) {
    const pt = args.data.pushtracker;
    const msg =
      this._translateService.instant('general.pushtracker-disconnected') +
      `: ${pt.address}`;
    this.snackbar.simple(msg);
  }

  /**
   * PUSHTRACKER EVENT MANAGEMENT
   */
  private unregisterPushTrackerEvents() {
    this._bluetoothService.off(
      BluetoothService.pushtracker_added,
      this.onPushTrackerAdded,
      this
    );
    BluetoothService.PushTrackers.map(pt => {
      this._unregisterEventsForPT(pt);
    });
  }

  private _unregisterEventsForPT(pt: PushTracker) {
    // unregister
    pt.off(PushTracker.paired_event, this.onPushTrackerPaired, this);
    pt.off(PushTracker.settings_event, this.onPushTrackerSettings, this);
    pt.off(
      PushTracker.switch_control_settings_event,
      this.onPushTrackerSwitchControlSettings,
      this
    );
  }

  private _registerEventsForPT(pt: PushTracker) {
    this._unregisterEventsForPT(pt);
    // now register
    pt.on(PushTracker.paired_event, this.onPushTrackerPaired, this);
    pt.on(PushTracker.settings_event, this.onPushTrackerSettings, this);
    pt.on(
      PushTracker.switch_control_settings_event,
      this.onPushTrackerSwitchControlSettings,
      this
    );
  }

  private registerPushTrackerEvents() {
    this.unregisterPushTrackerEvents();
    // handle pushtracker pairing events for existing pushtrackers
    BluetoothService.PushTrackers.map(pt => {
      this._registerEventsForPT(pt);
    });
    // listen for completely new pusthrackers (that we haven't seen before)
    this._bluetoothService.on(
      BluetoothService.pushtracker_added,
      this.onPushTrackerAdded,
      this
    );
  }

  private onPushTrackerAdded(args: any) {
    this._logService.logBreadCrumb(
      TabsComponent.name,
      'PushTracker added event received from BLE service'
    );
    this._registerEventsForPT(args.data.pt);
  }

  private async onPushTrackerSettings(args: any) {
    this._logService.logBreadCrumb(
      TabsComponent.name,
      'PushTracker settings received'
    );
    const s = args.data.settings;
    const pt = args.object as PushTracker;
    if (!this._settingsService.settings.equals(s)) {
      const selection = await action({
        cancelable: false,
        title: this._translateService.instant('settings-different.title'),
        message: this._translateService.instant('settings-different.message'),
        actions: [
          this._translateService.instant('actions.overwrite-local-settings'),
          this._translateService.instant('actions.overwrite-remote-settings'),
          this._translateService.instant('actions.keep-both-settings')
        ],
        cancelButtonText: this._translateService.instant('general.cancel')
      });
      switch (selection) {
        case this._translateService.instant('actions.overwrite-local-settings'):
          this._settingsService.settings.copy(s);
          this._settingsService.saveToFileSystem();
          try {
            await this._settingsService.save();
          } catch (err) {
            Log.E(err);
          }
          break;
        case this._translateService.instant(
          'actions.overwrite-remote-settings'
        ):
          pt.sendSettingsObject(this._settingsService.settings);
          break;
        case this._translateService.instant('actions.keep-both-settings'):
          break;
        default:
          break;
      }
    }
  }

  private async onPushTrackerSwitchControlSettings(args: any) {
    this._logService.logBreadCrumb(
      TabsComponent.name,
      'PushTracker switch control settings received'
    );
    const s = args.data.switchControlSettings;
    const pt = args.object as PushTracker;
    if (!this._settingsService.switchControlSettings.equals(s)) {
      const selection = await action({
        cancelable: false,
        title: this._translateService.instant(
          'switch-control-settings-different.title'
        ),
        message: this._translateService.instant(
          'switch-control-settings-different.message'
        ),
        actions: [
          this._translateService.instant('actions.overwrite-local-settings'),
          this._translateService.instant('actions.overwrite-remote-settings'),
          this._translateService.instant('actions.keep-both-settings')
        ],
        cancelButtonText: this._translateService.instant('general.cancel')
      });
      switch (selection) {
        case this._translateService.instant('actions.overwrite-local-settings'):
          this._settingsService.switchControlSettings.copy(s);
          this._settingsService.saveToFileSystem();
          try {
            await this._settingsService.save();
          } catch (err) {
            Log.E(err);
          }
          break;
        case this._translateService.instant(
          'actions.overwrite-remote-settings'
        ):
          pt.sendSwitchControlSettingsObject(
            this._settingsService.switchControlSettings
          );
          break;
        case this._translateService.instant('actions.keep-both-settings'):
          break;
        default:
          break;
      }
    }
  }
}
