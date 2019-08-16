import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Log, PushTrackerUser } from '@permobil/core';
import { RouterExtensions } from 'nativescript-angular/router';
import { Page } from 'tns-core-modules/ui/page';
import { SelectedIndexChangedEventData } from 'tns-core-modules/ui/tab-view';
import { BluetoothService, SettingsService } from '../../services';
import { AppResourceIcons, STORAGE_KEYS } from '../../enums';
import { SnackBar } from '@nstudio/nativescript-snackbar';
import * as application from 'tns-core-modules/application';
import { alert } from 'tns-core-modules/ui/dialogs';
import { hasPermission, requestPermissions } from 'nativescript-permissions';
import * as appSettings from 'tns-core-modules/application-settings';

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
  private permissionsNeeded = [
    android.Manifest.permission.ACCESS_COARSE_LOCATION
  ];

  private snackbar = new SnackBar();

  constructor(
    private _translateService: TranslateService,
    private _settingsService: SettingsService,
    private _bluetoothService: BluetoothService,
    private _routerExtension: RouterExtensions,
    private _activeRoute: ActivatedRoute,
    private _page: Page
  ) {
    // hide the actionbar on the root tabview
    this._page.actionBarHidden = true;

    // register for bluetooth events here
    this._bluetoothService.on(BluetoothService.advertise_error,
      this.onBluetoothAdvertiseError.bind(this));
    this._bluetoothService.on(BluetoothService.pushtracker_connected,
      this.onPushTrackerConnected.bind(this));
    this._bluetoothService.on(BluetoothService.pushtracker_disconnected,
      this.onPushTrackerDisconnected.bind(this));

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
  }

  async askForPermissions() {
    // determine if we have shown the permissions request
    const hasShownRequest = appSettings.getBoolean(
      STORAGE_KEYS.SHOULD_SHOW_BLE_PERMISSION_REQUEST
    ) || false;
    // will throw an error if permissions are denied, else will
    // return either true or a permissions object detailing all the
    // granted permissions. The error thrown details which
    // permissions were rejected
    const blePermission = android.Manifest.permission.ACCESS_COARSE_LOCATION;
    const reasons = [];
    const neededPermissions = this.permissionsNeeded.filter(
      p => !hasPermission(p) &&
        (application.android.foregroundActivity.shouldShowRequestPermissionRationale(p) ||
          !hasShownRequest)
    );
    // update the has-shown-request
    appSettings.setBoolean(
      STORAGE_KEYS.SHOULD_SHOW_BLE_PERMISSION_REQUEST,
      true
    );
    const reasoning = {
      [android.Manifest.permission.ACCESS_COARSE_LOCATION]: this._translateService.instant('permissions-reasons.coarse-location')
    };
    neededPermissions.map((r) => {
      reasons.push(reasoning[r]);
    });
    if (neededPermissions && neededPermissions.length > 0) {
      // Log.D('requesting permissions!', neededPermissions);
      await alert({
        title: this._translateService.instant('permissions-request.title'),
        message: reasons.join('\n\n'),
        okButtonText: this._translateService.instant('buttons.ok')
      });
      try {
        const permissions = await requestPermissions(neededPermissions, () => { });
        return true;
      } catch (permissionsObj) {
        const hasBlePermission =
          permissionsObj[blePermission] ||
          hasPermission(blePermission);
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

  onBluetoothAdvertiseError(args: any) {
    const error = args.data.error;
    alert({
      title: this._translateService.instant('bluetooth.service-failure'),
      okButtonText: this._translateService.instant('dialogs.ok'),
      message: `${error}`
    });
  }

  onPushTrackerConnected(args: any) {
    const pt = args.data.pushtracker;
    const msg = this._translateService.instant('general.pushtracker-connected') + `: ${pt.address}`;
    this.snackbar.simple(msg);
  }

  onPushTrackerDisconnected(args: any) {
    const pt = args.data.pushtracker;
    const msg = this._translateService.instant('general.pushtracker-disconnected') + `: ${pt.address}`;
    this.snackbar.simple(msg);
  }

  ngOnInit() {
    // load the device settings (sd / pt)
    this._settingsService.loadSettings();

    Log.D('asking for permissions');
    this.askForPermissions()
      .then(() => {
        Log.D('starting bluetoooth');
        // start the bluetooth service
        return this._bluetoothService.advertise();
      })
      .catch((err) => {
        Log.E('permission or bluetooth error:', err);
      });

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
}
