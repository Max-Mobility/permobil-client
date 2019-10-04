import { SqliteService } from './sqlite.service';
import { KinveyService } from './kinvey.service';

// exporting an array of any service that will be used for dependency injection on app.ts during start up
export const SERVICES = [
  SqliteService,
  KinveyService
];

// export all services so they're able to be imported for types when used
export * from './sqlite.service';
export * from './kinvey.service';
