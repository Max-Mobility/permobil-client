import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SnackBar } from '@nstudio/nativescript-snackbar';
import { Log, PushTrackerUser } from '@permobil/core';
import throttle from 'lodash/throttle';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { ChangedData, ObservableArray } from 'tns-core-modules/data/observable-array';
import { isAndroid } from 'tns-core-modules/platform';
import { BottomNavigation } from 'tns-core-modules/ui/bottom-navigation';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { APP_LANGUAGES, CONFIGURATIONS, STORAGE_KEYS } from '../../enums';
import { PushTracker } from '../../models';
import { ActivityService, BluetoothService, LoggingService, PushTrackerUserService, SettingsService, SmartDriveErrorsService, SmartDriveUsageService } from '../../services';
import { YYYY_MM_DD } from '../../utils';

@Component({
  moduleId: module.id,
  selector: 'tabs-page',
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  public CONFIGURATIONS = CONFIGURATIONS;
  bluetoothAdvertised: boolean = false;
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
    private _activityService: ActivityService,
    private _translateService: TranslateService,
    private _settingsService: SettingsService,
    private _bluetoothService: BluetoothService,
    private _page: Page,
    private _userService: PushTrackerUserService,
    private _usageService: SmartDriveUsageService,
    private _errorsService: SmartDriveErrorsService
  ) {
    this._logService.logBreadCrumb(TabsComponent.name, 'Constructor');
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

    this._userService.user.subscribe(user => {
      if (!user) return;

      this.user = user;
      if (this.user.data.language_preference) {
        const language = APP_LANGUAGES[this.user.data.language_preference];
        if (this._translateService.currentLang !== language)
          this._translateService.use(language);
      }

      if (
        this.user &&
        this.user.data.control_configuration ===
          CONFIGURATIONS.PUSHTRACKER_WITH_SMARTDRIVE &&
        !this.bluetoothAdvertised
      ) {
        this._logService.logBreadCrumb(TabsComponent.name, 'Asking for Bluetooth Permission');
        setTimeout(() => {
          this.askForPermissions()
            .then(() => {
              if (!this._bluetoothService.advertising) {
                this._logService.logBreadCrumb(TabsComponent.name, 'Starting Bluetooth');
                // start the bluetooth service
                return this._bluetoothService.advertise();
              }
            })
            .catch(err => {
              this._logService.logException(err);
            });
          this.bluetoothAdvertised = true;
        }, 5000);
      }
    });

  }

  onRootBottomNavLoaded(_) {
    if (this._firstLoad) return;

    setTimeout(() => {
      this.registerBluetoothEvents();
    }, 5000);
    this.registerPushTrackerEvents();

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

  /**
   * BLUETOOTH EVENT MANAGEMENT
   */
  private registerBluetoothEvents() {
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

  private onBluetoothAdvertiseError(args: any) {
    const error = args.data.error;
    alert({
      title: this._translateService.instant('bluetooth.service-failure'),
      okButtonText: this._translateService.instant('general.ok'),
      message: `${error}`
    });
  }

  private onPushTrackerPaired(args: any) {
    const pt = args.data.pushtracker;
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
    pt.on(PushTracker.daily_info_event, this._throttledOnDailyInfoEvent, this);
    pt.on(PushTracker.distance_event, this._throttledOnDistanceEvent, this);
    pt.on(PushTracker.error_event, this.onErrorEvent, this);
  }

  onDailyInfoEvent(args) {
    this._logService.logBreadCrumb(TabsComponent.name, 'daily_info_event received from PushTracker');
    const data = args.data;
    const year = data.year;
    const month = data.month - 1;
    const day = data.day;
    const pushesWithout = data.pushesWithout;
    const coastWith = data.coastWith;
    const coastWithout = data.coastWithout;
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const dailyActivity = {
      _acl: { creator: this.user._id },
      coast_time_avg: coastWithout,
      coast_time_total: coastWith + coastWithout,
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
          this._logService.logBreadCrumb(TabsComponent.name, 'DailyInfo from PushTracker successfully saved in Kinvey');
        else
          this._logService.logException(new Error('[TabsComponent] Failed to save DailyInfo from PushTracker in Kinvey'));
      })
      .catch(err => {
        this._logService.logException(err);
      });

    // Request distance information from PushTracker
    if (this.pushTracker) {
      this.pushTracker.sendPacket('Command', 'DistanceRequest');
      this._logService.logBreadCrumb(TabsComponent.name, 'Distance data requested from PushTracker');
    }
  }

  onDistanceEvent(args) {
    this._logService.logBreadCrumb(TabsComponent.name, 'distance_event received from PushTracker');
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
          this._logService.logBreadCrumb(TabsComponent.name, 'Distance from PushTracker successfully saved in Kinvey');
        else
          this._logService.logException(new Error('[TabsComponent] Failed to save Distance from PushTracker in Kinvey'));
      })
      .catch(err => {
        this._logService.logException(err);
      });
  }

  onErrorEvent(args) {
    const data = args.data;
    const year = data.year;
    const month = data.month;
    const day = data.day;
    if (year === 0 && month === 0 && day === 0)  {
      return;
    }

    this._logService.logBreadCrumb(TabsComponent.name, 'error_event received from PushTracker');

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
        this._logService.logBreadCrumb(TabsComponent.name, 'ErrorInfo from PushTracker successfully saved in Kinvey');
      else
        this._logService.logException(new Error('[' + TabsComponent.name + '] ' + 'Failed to save ErrorInfo from PushTracker in Kinvey'));
    })
    .catch(err => {
      this._logService.logException(err);
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
    BluetoothService.PushTrackers.off(ObservableArray.changeEvent);
    BluetoothService.PushTrackers.map(pt => {
      pt.off(PushTracker.paired_event);
      // pt.off(PushTracker.connect_event);
      pt.off(PushTracker.settings_event);
      pt.off(PushTracker.push_settings_event);
      pt.off(PushTracker.switch_control_settings_event);
    });
  }

  private _registerEventsForPT(pt: PushTracker) {
    pt.on(PushTracker.paired_event, () => {
      this._logService.logBreadCrumb(TabsComponent.name, 'PushTracker paired: ' + pt.address);
      this.onPushTrackerPaired({
        data: { pushtracker: pt }
      });
    });
    // register for settings and push settings
    pt.on(PushTracker.settings_event, this.onPushTrackerSettings, this);
    pt.on(
      PushTracker.push_settings_event,
      this.onPushTrackerPushSettings,
      this
    );
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
    BluetoothService.PushTrackers.on(
      ObservableArray.changeEvent,
      (args: ChangedData<number>) => {
        if (args.action === 'add') {
          const pt = BluetoothService.PushTrackers.getItem(
            BluetoothService.PushTrackers.length - 1
          );
          if (pt) {
            this._registerEventsForPT(pt);
          }
        }
      }
    );
  }

  private async onPushTrackerSettings(args: any) {
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
          this._settingsService.save().catch(Log.E);
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

  private async onPushTrackerPushSettings(args: any) {
    const s = args.data.pushSettings;
    const pt = args.object as PushTracker;
    if (!this._settingsService.pushSettings.equals(s)) {
      const selection = await action({
        cancelable: false,
        title: this._translateService.instant('push-settings-different.title'),
        message: this._translateService.instant(
          'push-settings-different.message'
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
          this._settingsService.pushSettings.copy(s);
          this._settingsService.saveToFileSystem();
          this._settingsService.save().catch(Log.E);
          break;
        case this._translateService.instant(
          'actions.overwrite-remote-settings'
        ):
          pt.sendPushSettingsObject(this._settingsService.pushSettings);
          break;
        case this._translateService.instant('actions.keep-both-settings'):
          break;
        default:
          break;
      }
    }
  }

  private async onPushTrackerSwitchControlSettings(args: any) {
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
          this._settingsService.save().catch(Log.E);
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
