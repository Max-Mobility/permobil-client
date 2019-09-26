import { BluetoothService } from './bluetooth.service';
import { SentryService } from './sentry.service';
import { SqliteService } from './sqlite.service';
import { NetworkService } from './network.service';
import { KinveyService } from './kinvey.service';

// exporting an array of any service that will be used for dependency injection on app.ts during start up
export const SERVICES = [
  BluetoothService,
  SentryService,
  SqliteService,
  NetworkService,
  KinveyService
];

// export all services so they're able to be imported for types when used
export * from './bluetooth.service';
export * from './sentry.service';
export * from './sqlite.service';
export * from './network.service';
export * from './kinvey.service';
