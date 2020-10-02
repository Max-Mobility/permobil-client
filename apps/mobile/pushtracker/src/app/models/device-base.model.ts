import { Observable, ObservableArray } from '@nativescript/core';
import { Device, Packet } from '@permobil/core';
import { SMARTDRIVE_MODE, SMARTDRIVE_MODE_SETTING, SMARTDRIVE_UNIT } from './../enums';
import { BluetoothService } from './../services';

export abstract class DeviceBase extends Observable {
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

  static motorTicksToKilometers(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 265.714 / 1000.0;
  }

  static caseTicksToKilometers(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 36.0 / 1000.0;
  }

  static motorTicksToMeters(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 265.714;
  }

  static caseTicksToMeters(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 36.0;
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
      return '??';
    } else {
      return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
    }
  }

  static validVersion(version: number): boolean {
    return typeof version === 'number' &&
      version > 0x00 && version < 0xff;
  }

  static versionsUpToDate(latest: string, versions: number[]): boolean {
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

  abstract sendPacket(
    Type: string,
    SubType: string,
    dataKey?: string,
    dataType?: string,
    data?: any
  ): Promise<any>;

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
    return this.sendPacket(
      'Command',
      'SetSettings',
      'settings',
      null,
      settings
    );
  }

  sendSettingsObject(settings: Device.Settings) {
    return this.sendSettings(
      settings.controlMode,
      settings.units,
      settings.getFlags(),
      settings.tapSensitivity / 100.0,
      settings.acceleration / 100.0,
      settings.maxSpeed / 100.0
    );
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
    return this.sendPacket(
      'Command',
      'SetSwitchControlSettings',
      'switchControlSettings',
      null,
      settings
    );
  }

  sendSwitchControlSettingsObject(
    settings: Device.SwitchControlSettings
  ): Promise<any> {
    return this.sendSwitchControlSettings(
      settings.mode,
      settings.maxSpeed / 100.0
    );
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
