import { ActivityService } from './activity.service';
import { AuthGuardService } from './auth-guard.service';
import { BluetoothService } from './bluetooth.service';
import { DialogService } from './dialog.service';
import { FileService } from './file.service';
import { FirmwareService } from './firmware.service';
import { LocationService } from './location.service';
import { LoggingService } from './logging.service';
import { ProgressService } from './progress.service';
import { PushTrackerUserService } from './pushtracker.user.service';
import { SmartDriveUsageService } from './smartdrive-usage.service';
import { SettingsService } from './settings.service';

export const PROVIDERS: any[] = [
  LoggingService,
  LocationService,
  DialogService,
  FileService,
  AuthGuardService,
  ProgressService,
  BluetoothService,
  FirmwareService,
  SettingsService,
  ActivityService,
  PushTrackerUserService,
  SmartDriveUsageService
];

export * from './auth-guard.service';
export * from './bluetooth.service';
export * from './dialog.service';
export * from './file.service';
export * from './firmware.service';
export * from './location.service';
export * from './logging.service';
export * from './progress.service';
export * from './pushtracker.user.service';
export * from './settings.service';
