import { AuthGuardService } from './auth-guard.service';
import { BluetoothService } from './bluetooth.service';
import { DemoService } from './demo.service';
import { EvaluationService } from './evaluation.service';
import { FileService } from './file.service';
import { FirmwareService } from './firmware.service';
import { LocationService } from './location.service';
import { LoggingService } from './logging.service';
import { ProgressService } from './progress.service';
import { SettingsService } from './settings.service';
import { UserService } from './user.service';

export const PROVIDERS: any[] = [
  LoggingService,
  LocationService,
  EvaluationService,
  FileService,
  DemoService,
  UserService,
  AuthGuardService,
  ProgressService,
  BluetoothService,
  FirmwareService,
  SettingsService
];

export * from './auth-guard.service';
export * from './bluetooth.service';
export * from './demo.service';
export * from './evaluation.service';
export * from './file.service';
export * from './firmware.service';
export * from './location.service';
export * from './logging.service';
export * from './progress.service';
export * from './settings.service';
export * from './user.service';

