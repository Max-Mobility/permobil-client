import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface IAnalyticsProperties {
  category?: string;
  label?: string;
  action?: string;
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hitType
  hitType?:
    | 'pageview'
    | 'screenview'
    | 'event'
    | 'transaction'
    | 'item'
    | 'social'
    | 'exception'
    | 'timing';
  value?: number;
  page?: string;

  [key: string]: any;
}

/**
 * Funnel for all analytics reporting data
 */
@Injectable()
export class AnalyticsService {
  private _devMode = false;

  constructor(private _router: Router) {
    this.devMode(false);
  }

  /**
   * Track actions, events, etc.
   **/
  track(action: string, properties: any | IAnalyticsProperties): void {
    if (!this.devMode()) {
      // send some analytics to db/service
    }
  }

  /**
   * Control whether analytics are tracked
   * true: dev mode on, therefore do not track anything
   * false: dev mode off, track everything
   **/
  devMode(enable?: boolean): boolean {
    if (typeof enable !== 'undefined') {
      this._devMode = enable;
    }
    return this._devMode;
  }
}

/**
 * Base class
 * Standardizes tracking actions and categorization
 */
export class Analytics {
  analytics: AnalyticsService;
  // sub-classes should define their category
  category: string;

  /**
   * Track actions, events, etc.
   **/
  track(action: string, properties: IAnalyticsProperties = {}): void {
    this.analytics.track(
      action,
      Object.assign({}, properties, { category: this.category })
    );
  }
}
