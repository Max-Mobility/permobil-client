import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SnackBar } from '@nstudio/nativescript-snackbar';
import { Log, PushTrackerUser } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import * as application from 'tns-core-modules/application';
import * as appSettings from 'tns-core-modules/application-settings';
import { ChangedData, ObservableArray } from 'tns-core-modules/data/observable-array';
import { isAndroid } from 'tns-core-modules/platform';
import { action, alert } from 'tns-core-modules/ui/dialogs';
import { Page } from 'tns-core-modules/ui/page';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { AppResourceIcons, STORAGE_KEYS } from '../../enums';
import { PushTracker } from '../../models';
import { BluetoothService, PushTrackerUserService, SettingsService, ActivityService, SmartDriveUsageService } from '../../services';
import throttle from 'lodash/throttle';

@Component({
  moduleId: module.id,
  selector: 'tabs-page',
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  public homeTabItem;
  public journeyTabItem;
  public profileTabItem;

  private _homeTabTitle = this._translateService.instant('home-tab.title');
  private _journeyTabTitle = this._translateService.instant(
    'journey-tab.title'
  );
  private _profileTabTitle = this._translateService.instant(
    'profile-tab.title'
  );

  // permissions for the bluetooth service
  private permissionsNeeded = [];

  private snackbar = new SnackBar();

  bluetoothAdvertised: boolean = false;
  pushTracker: PushTracker;
  user: PushTrackerUser;
  private _throttledOnDailyInfoEvent: any = null;
  private _throttledOnDistanceEvent: any = null;

  constructor(
    private _activityService: ActivityService,
    private _translateService: TranslateService,
    private _settingsService: SettingsService,
    private _bluetoothService: BluetoothService,
    private _routerExtension: RouterExtensions,
    private _activeRoute: ActivatedRoute,
    private _page: Page,
    private userService: PushTrackerUserService,
    private _usageService: SmartDriveUsageService
  ) {
    // hide the actionbar on the root tabview
    this._page.actionBarHidden = true;

    this.homeTabItem = {
      title: this._homeTabTitle,
      iconSource: AppResourceIcons.HOME_ACTIVE,
      textTransform: 'capitalize'
    };
    this.journeyTabItem = {
      title: this._journeyTabTitle,
      iconSource: AppResourceIcons.JOURNEY_INACTIVE,
      textTransform: 'capitalize'
    };
    this.profileTabItem = {
      title: this._profileTabTitle,
      iconSource: AppResourceIcons.PROFILE_INACTIVE,
      textTransform: 'capitalize'
    };

    // Run every 10 minutes
    const TEN_MINUTES = 10 * 60 * 1000;
    this._throttledOnDailyInfoEvent = throttle(this.onDailyInfoEvent, TEN_MINUTES, {
      leading: true,
      trailing: true
    });

    this._throttledOnDistanceEvent = throttle(this.onDistanceEvent, TEN_MINUTES, {
      leading: true,
      trailing: true
    });

  }

  onRootTabViewLoaded() {
    this.registerBluetoothEvents();
    this.registerPushTrackerEvents();

    if (isAndroid) {
      this.permissionsNeeded.push(
        android.Manifest.permission.ACCESS_COARSE_LOCATION
      );
    }

    this._routerExtension.navigate(
      [
        {
          outlets: {
            homeTab: ['home'],
            journeyTab: ['journey'],
            profileTab: ['profile']
          }
        }
      ],
      { relativeTo: this._activeRoute }
    );

    this.userService.user.subscribe(user => {
      if (!user) return;
      this.user = user;
      if (
        this.user &&
        this.user.data.control_configuration ===
          'PushTracker with SmartDrive' &&
        !this.bluetoothAdvertised
      ) {
        Log.D('asking for permissions');
        this.askForPermissions()
          .then(() => {
            if (!this._bluetoothService.advertising) {
              Log.D('starting bluetoooth');
              // start the bluetooth service
              return this._bluetoothService.advertise();
            }
          })
          .catch(err => {
            Log.E('permission or bluetooth error:', err);
          });
        this.bluetoothAdvertised = true;
      }
    });

    // this._settingsService.loadSettings();
  }

  /**
   * Executes when the tabview item index is changed. Usually in response to user interaction changing which tab they are viewing.
   * Update the icon for the visual indicator which tab is active.
   * @param args [SelectedIndexChangedEventData]
   */
  tabViewIndexChange(args: SelectedIndexChangedEventData) {
    if (args.newIndex >= 0) {
      switch (args.newIndex) {
        case 0:
          Log.D('HomeTab Active');
          this.homeTabItem = {
            title: this._homeTabTitle,
            iconSource: AppResourceIcons.HOME_ACTIVE
          };
          this.journeyTabItem = {
            title: this._journeyTabTitle,
            iconSource: AppResourceIcons.JOURNEY_INACTIVE
          };
          this.profileTabItem = {
            title: this._profileTabTitle,
            iconSource: AppResourceIcons.PROFILE_INACTIVE
          };
          break;
        case 1:
          Log.D('JourneyTab Active');
          this.homeTabItem = {
            title: this._homeTabTitle,
            iconSource: AppResourceIcons.HOME_INACTIVE
          };
          this.journeyTabItem = {
            title: this._journeyTabTitle,
            iconSource: AppResourceIcons.JOURNEY_ACTIVE
          };
          this.profileTabItem = {
            title: this._profileTabTitle,
            iconSource: AppResourceIcons.PROFILE_INACTIVE
          };
          break;
        case 2:
          Log.D('ProfileTab Active');
          this.homeTabItem = {
            title: this._homeTabTitle,
            iconSource: AppResourceIcons.HOME_INACTIVE
          };
          this.journeyTabItem = {
            title: this._journeyTabTitle,
            iconSource: AppResourceIcons.JOURNEY_INACTIVE
          };
          this.profileTabItem = {
            title: this._profileTabTitle,
            iconSource: AppResourceIcons.PROFILE_ACTIVE
          };
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
        // Log.D('requesting permissions!', neededPermissions);
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
    pt.on(
      PushTracker.daily_info_event,
      this._throttledOnDailyInfoEvent,
      this
    );
    pt.on(
      PushTracker.distance_event,
      this._throttledOnDistanceEvent,
      this
    );
  }

  onDailyInfoEvent(args) {
    Log.D('daily_info_event received from Pushtracker');
    const data = args.data;
    const year = data.year;
    const month = data.month - 1;
    const day = data.day;
    const pushesWith = data.pushesWith;
    const pushesWithout = data.pushesWithout;
    const coastWith = data.coastWith;
    const coastWithout = data.coastWithout;
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const dateFormatted = function(date: Date) {
      return (
        date.getFullYear() +
        '/' +
        (date.getMonth() + 1 < 10
          ? '0' + (date.getMonth() + 1)
          : date.getMonth() + 1) +
        '/' +
        (date.getDate() < 10 ? '0' + date.getDate() : date.getDate())
      );
    };

    const dailyActivity = {
      _acl: { creator: this.user._id },
      coast_time_avg: coastWithout,
      coast_time_total: coastWith + coastWithout,
      data_type: 'DailyActivity',
      date: dateFormatted(date),
      has_been_sent: false,
      push_count: pushesWithout,
      records: [],
      start_time: date.getTime(),
      watch_serial_number: this.user.data.pushtracker_serial_number
    };
    this._activityService.saveDailyActivityFromPushTracker(dailyActivity);

    // Request distance information from PushTracker
    if (this.pushTracker) {
      this.pushTracker.sendPacket('Command', 'DistanceRequest');
      Log.D('Distance data requested from PushTracker');
    }
  }

  onDistanceEvent(args) {
    Log.D('Distance event received');
    const data = args.data;
    const distance_smartdrive_drive = data.driveDistance;
    const distance_smartdrive_coast = data.coastDistance;
    const battery = 0;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const start_time = date.getTime();
    const dateFormatted = function(date: Date) {
      return (
        date.getFullYear() +
        '/' +
        (date.getMonth() + 1 < 10
          ? '0' + (date.getMonth() + 1)
          : date.getMonth() + 1) +
        '/' +
        (date.getDate() < 10 ? '0' + date.getDate() : date.getDate())
      );
    };

    const dailyUsage = {
      _acl: { creator: this.user._id },
      data_type: 'SmartDriveDailyInfo',
      date: dateFormatted(date),
      battery: 0,
      distance_smartdrive_coast: distance_smartdrive_coast,
      distance_smartdrive_drive: distance_smartdrive_drive,
      records: [],
      start_time: start_time,
      watch_uuid: '',
      watch_serial_number: this.user.data.pushtracker_serial_number,
    };
    Log.D('Distance', data);
    Log.D('SmartDriveDailyInfo', dailyUsage);
    this._usageService.saveDailyUsageFromPushTracker(dailyUsage);
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
      Log.D('pt paired:', pt.address);
      this.onPushTrackerPaired({
        data: { pushtracker: pt }
      });
    });
    /* // Don't register for connect event here - handled by the bluetoothservice pushtracker_connect
    pt.on(PushTracker.connect_event, () => {
      Log.D('pt connected:', pt.address);
      this.onPushTrackerConnected({
        data: { pushtracker: pt }
      })
    });
    */
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
