import { Injectable } from 'injection-js';
import { Observable } from 'tns-core-modules/data/observable';

import * as app from 'tns-core-modules/application';

function cbExists(cb) {
  return cb && typeof cb === 'function';
}

@Injectable()
export class NetworkService extends Observable {
  public static network_available_event = 'network_available_event';
  public static network_capabilities_changed_event =
    'network_capabilities_changed_event';
  public static network_unavailable_event = 'network_unavailable_event';
  public static network_lost_event = 'network_lost_event';

  private connectivityManager: android.net.ConnectivityManager;
  private networkCallback: Callback;

  constructor() {
    super();
    // set up the connectivity manager and network callback
    const context = android.content.Context;
    this.connectivityManager = app.android.context.getSystemService(
      context.CONNECTIVITY_SERVICE
    );
    this.networkCallback = new Callback({
      onAvailable: this._onAvailable.bind(this),
      onCapabilitiesChanged: this._onCapabilitiesChanged.bind(this),
      onLost: this._onLost.bind(this),
      onUnavailable: this._onUnavailable.bind(this)
    });
  }

  /**
   * Remove network registration - allow the device to turn off the radio.
   */
  unregisterNetwork() {
    try {
      this.connectivityManager.bindProcessToNetwork(null);
      if (this.networkCallback.isRegistered) {
        this.connectivityManager.unregisterNetworkCallback(
          this.networkCallback
        );
      }
    } catch (e) {}
    this.networkCallback.isRegistered = false;
  }

  /**
   * Request the network and timeout if no network found after
   * timeoutMs (default 10 seconds). Can specify the capabilities
   * (default INTERNET | NOT_METERED) and the transport types (default
   * WIFI).
   */
  requestNetwork(args: {
    timeoutMs?: number;
    capabilities?: number[];
    transportTypes?: number[];
  }) {
    if (this.networkCallback.isRegistered) {
      // we already have the network, don't need to re-register
      return;
    }
    try {
      const request = new android.net.NetworkRequest.Builder();
      // add capabilities
      const capabilities = args.capabilities || [
        android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET,
        android.net.NetworkCapabilities.NET_CAPABILITY_NOT_METERED
      ];
      // add transport types
      const transportTypes = args.transportTypes || [
        android.net.NetworkCapabilities.TRANSPORT_WIFI
      ];
      // add the capabilities and transport types to the request
      capabilities.map(c => request.addCapability(c));
      transportTypes.map(t => request.addTransportType(t));
      // set timeout
      const timeoutMs = args.timeoutMs || 10 * 1000;
      this.connectivityManager.requestNetwork(
        request.build(),
        this.networkCallback,
        timeoutMs
      );
    } catch (e) {}
  }

  /**
   * Notify events by name and optionally pass data
   */
  private sendEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }

  /**
   *  Network Callback handlers:
   */
  private _onAvailable(network: android.net.Network) {
    try {
      if (this.connectivityManager.bindProcessToNetwork(network)) {
        const capabilities = this.connectivityManager.getNetworkCapabilities(
          network
        );
        if (capabilities) {
          this.sendEvent(NetworkService.network_available_event, {
            network,
            capabilities
          });
        } else {
          this.unregisterNetwork();
        }
      } else {
        this.unregisterNetwork();
      }
    } catch (e) {
      this.unregisterNetwork();
    }
  }

  private _onCapabilitiesChanged(
    network: android.net.Network,
    capabilities: android.net.NetworkCapabilities
  ) {
    this.sendEvent(NetworkService.network_capabilities_changed_event, {
      network,
      capabilities
    });
  }

  private _onLost(network: android.net.Network) {
    this.sendEvent(NetworkService.network_lost_event, { network });
  }

  private _onUnavailable() {
    this.sendEvent(NetworkService.network_unavailable_event);
  }
}

class Callback extends android.net.ConnectivityManager.NetworkCallback {
  public isRegistered: boolean = false;

  private _onAvailableCallback: any = null;
  private _onCapabilitiesChangedCallback: any = null;
  private _onLostCallback: any = null;
  private _onUnavailableCallback: any = null;

  constructor(args: {
    onAvailable?: any;
    onCapabilitiesChanged?: any;
    onLost?: any;
    onUnavailable?: any;
  }) {
    super();

    this._onAvailableCallback = args.onAvailable;
    this._onCapabilitiesChangedCallback = args.onCapabilitiesChanged;
    this._onLostCallback = args.onLost;
    this._onUnavailableCallback = args.onUnavailable;

    // necessary when extending TypeScript constructors
    return global.__native(this);
  }

  onAvailable(network: android.net.Network) {
    this.isRegistered = true;
    if (cbExists(this._onAvailableCallback)) {
      this._onAvailableCallback(network);
    }
  }

  onCapabilitiesChanged(
    network: android.net.Network,
    capabilities: android.net.NetworkCapabilities
  ) {
    this.isRegistered = true;
    if (cbExists(this._onCapabilitiesChangedCallback)) {
      this._onCapabilitiesChangedCallback(network, capabilities);
    }
  }

  onLost(network: android.net.Network) {
    if (cbExists(this._onLostCallback)) {
      this._onLostCallback(network);
    }
  }

  onUnavailable() {
    this.isRegistered = false;
    if (cbExists(this._onUnavailableCallback)) {
      this._onUnavailableCallback();
    }
  }
}
