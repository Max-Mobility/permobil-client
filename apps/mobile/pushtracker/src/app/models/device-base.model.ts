import { Observable, ObservableArray } from '@nativescript/core';
import { Packet } from '@permobil/core';
import { SMARTDRIVE_MODE, SMARTDRIVE_MODE_SETTING, SMARTDRIVE_UNIT } from './../enums';
import { BluetoothService } from './../services';

export class DeviceBase extends Observable {
  public static ota_start_event = 'ota_start_event';
  public static ota_pause_event = 'ota_pause_event';
  public static ota_resume_event = 'ota_resume_event';
  public static ota_cancel_event = 'ota_cancel_event';
  public static ota_force_event = 'ota_force_event';
  public static ota_retry_event = 'ota_retry_event';
  public static ota_failed_event = 'ota_failed_event';
  public static ota_timeout_event = 'ota_timeout_event';

  public static motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  public static caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  public static motorTicksToKilometers(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 265.714 / 1000.0;
  }

  public static caseTicksToKilometers(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 36.0 / 1000.0;
  }

  public static motorTicksToMeters(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 265.714;
  }

  public static caseTicksToMeters(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 36.0;
  }

  public static milesToMotorTicks(miles: number): number {
    return (miles * (265.714 * 63360.0)) / (2.0 * 3.14159265358 * 3.8);
  }

  public static milesToCaseTicks(miles: number): number {
    return (miles * (36.0 * 63360.0)) / (2.0 * 3.14159265358 * 3.8);
  }

  public static versionStringToByte(version: string): number {
    if (version.includes('.')) {
      const [major, minor] = version.split('.');
      return (parseInt(major) << 4) | parseInt(minor);
    } else {
      return 0xff;
    }
  }

  public static versionByteToString(version: number): string {
    if (version === 0xff || version === 0x00) {
      return '??';
    } else {
      return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
    }
  }

  public static validVersion(version: number): boolean {
    return typeof version === 'number' &&
      version > 0x00 && version < 0xff;
  }

  public static versionsUpToDate(latest: string, versions: number[]): boolean {
    const v = DeviceBase.versionStringToByte(latest);
    if (v === 0xff) {
      return false;
    }
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  /**
   * Microcontroller firmware version number
   */
  public mcu_version: number = 0xff;

  /**
   * Bluetooth chip firmware version number
   */
  public ble_version: number = 0xff;

  /**
   * Battery percent Stat of Charge (SoC)
   */
  public battery: number = 0;

  /**
   * MAC Address
   */
  public address: string = '';

  /**
   * Is this device connected?
   */
  public connected: boolean = false;

  /**
   * The actual device (ios:CBPeripheral, android:BluetoothDevice)
   */
  public device: any = null;
  public ableToSend: boolean = false;
  public otaStartTime: Date;
  public otaCurrentTime: Date;
  public otaEndTime: Date;
  public otaActions = new ObservableArray();

  public _bluetoothService: BluetoothService;

  constructor(btService: BluetoothService) {
    super();
    this._bluetoothService = btService;
  }

  public setOtaActions(actions?: string[]) {
    if (actions) this.otaActions.splice(0, this.otaActions.length, ...actions);
    else this.otaActions.splice(0, this.otaActions.length);
  }

  public sendSettings(
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
    if (mode === SMARTDRIVE_MODE.MX2_PLUS)
      mode = SMARTDRIVE_MODE_SETTING.ADVANCED;
    else if (mode === SMARTDRIVE_MODE.MX2)
      mode = SMARTDRIVE_MODE_SETTING.INTERMEDIATE;
    else if (mode === SMARTDRIVE_MODE.MX1)
      mode = SMARTDRIVE_MODE_SETTING.BEGINNER;
    else if (mode === SMARTDRIVE_MODE.OFF) mode = SMARTDRIVE_MODE_SETTING.OFF;
    else mode = SMARTDRIVE_MODE_SETTING.ADVANCED;
    // convert units
    units =
      units === SMARTDRIVE_UNIT.METRIC
        ? SMARTDRIVE_UNIT.METRIC
        : SMARTDRIVE_UNIT.ENGLISH;
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

  public sendSwitchControlSettings(
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
  public sendEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }
}
