import { Observable, ObservableArray } from '@nativescript/core';
import { Packet } from '@permobil/core';
import { BluetoothService } from './../services';

export class DeviceBase extends Observable {
  static ota_start_event = 'ota_start_event';
  static ota_pause_event = 'ota_pause_event';
  static ota_resume_event = 'ota_resume_event';
  static ota_cancel_event = 'ota_cancel_event';
  static ota_force_event = 'ota_force_event';
  static ota_retry_event = 'ota_retry_event';
  static ota_failed_event = 'ota_failed_event';
  static ota_timeout_event = 'ota_timeout_event';

  static motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  static caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  static milesToMotorTicks(miles: number): number {
    return (miles * (265.714 * 63360.0)) / (2.0 * 3.14159265358 * 3.8);
  }

  static milesToCaseTicks(miles: number): number {
    return (miles * (36.0 * 63360.0)) / (2.0 * 3.14159265358 * 3.8);
  }

  static versionStringToByte(version: string): number {
    if (version.includes('.')) {
      const [major, minor] = version.split('.');
      return (parseInt(major) << 4) | parseInt(minor);
    } else {
      return 0xff;
    }
  }

  static versionByteToString(version: number): string {
    if (version === 0xff || version === 0x00) {
      return 'unknown';
    } else {
      return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
    }
  }

  /**
   * Microcontroller firmware version number
   */
  mcu_version: number = 0xff;

  /**
   * Bluetooth chip firmware version number
   */
  ble_version: number = 0xff;

  /**
   * Battery percent Stat of Charge (SoC)
   */
  battery: number = 0;

  /**
   * MAC Address
   */
  address: string = '';

  /**
   * Is this device connected?
   */
  connected: boolean = false;

  /**
   * The actual device (ios:CBPeripheral, android:BluetoothDevice)
   */
  device: any = null;
  ableToSend: boolean = false;
  otaStartTime: Date;
  otaCurrentTime: Date;
  otaEndTime: Date;
  otaActions = new ObservableArray();

  _bluetoothService: BluetoothService;

  constructor(btService: BluetoothService) {
    super();
    this._bluetoothService = btService;
  }

  setOtaActions(actions?: string[]) {
    if (actions) this.otaActions.splice(0, this.otaActions.length, ...actions);
    else this.otaActions.splice(0, this.otaActions.length);
  }

  sendSettings(
    mode: string,
    units: string,
    flags: number,
    tap_sensitivity: number,
    acceleration: number,
    max_speed: number
  ): Promise<any> {
    const p = new Packet();
    const settings = p.data('settings');
    // convert mode
    if (mode === 'MX2+') mode = 'Advanced';
    else if (mode === 'MX2') mode = 'Intermediate';
    else if (mode === 'MX1') mode = 'Beginner';
    else if (mode === 'Off') mode = 'Off';
    else mode = 'Advanced';
    // convert units
    units = units === 'Metric' ? 'Metric' : 'English';
    // clamp numbers
    const clamp = n => {
      return Math.max(0, Math.min(n, 1.0));
    };
    tap_sensitivity = clamp(tap_sensitivity);
    acceleration = clamp(acceleration);
    max_speed = clamp(max_speed);
    // now fill in the packet
    settings.ControlMode = Packet.makeBoundData('SmartDriveControlMode', mode);
    settings.Units = Packet.makeBoundData('Units', units);
    settings.Flags = flags;
    settings.TapSensitivity = tap_sensitivity;
    settings.Acceleration = acceleration;
    settings.MaxSpeed = max_speed;
    p.destroy();
    return settings;
  }

  sendSwitchControlSettings(
    mode: string,
    max_speed: number
  ): Promise<any> {
    const p = new Packet();
    const settings = p.data('switchControlSettings');
    // convert mode
    // don't have to convert mode since we don't alias it in any way
    // clamp numbers
    const clamp = n => {
      return Math.max(0, Math.min(n, 1.0));
    };
    max_speed = clamp(max_speed);
    // now fill in the packet
    settings.Mode = Packet.makeBoundData('SwitchControlMode', mode);
    settings.MaxSpeed = max_speed;
    p.destroy();
    return settings;
  }

  /**
   * Notify events by name and optionally pass data
   */
  sendEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }
}
