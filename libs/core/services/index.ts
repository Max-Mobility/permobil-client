import { AnalyticsService } from './analytics.service';
import { LoggingService } from './logging.service';
import { RouterExtService } from './routerext.service';
import { SettingsService } from './settings.service';

export const CORE_PROVIDERS: any[] = [
  AnalyticsService,
  LoggingService,
  RouterExtService,
  SettingsService
];

export * from './analytics.service';
export * from './logging.service';
export * from './routerext.service';
export * from './settings.service';
