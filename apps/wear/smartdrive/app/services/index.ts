import { BluetoothService } from './bluetooth.service';
import { SmartDriveKinveyService } from './kinvey.service';
import { NetworkService } from './network.service';
import { SensorService } from './sensor.service';
import { SettingsService } from './settings.service';
import { SqliteService } from './sqlite.service';

// exporting an array of any service that will be used for dependency injection on app.ts during start up
export const SERVICES = [
  BluetoothService,
  SensorService,
  SqliteService,
  NetworkService,
  SmartDriveKinveyService,
  SettingsService
];

// export all services so they're able to be imported for types when used
export * from './bluetooth.service';
export * from './kinvey.service';
export * from './network.service';
export * from './sensor.service';
export * from './settings.service';
export * from './sqlite.service';

