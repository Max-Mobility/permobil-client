import { bindingTypeToString, Packet } from '@maxmobility/core';
import { BluetoothService } from '@maxmobility/mobile';
import { Color } from 'tns-core-modules/color';
import { Observable } from 'tns-core-modules/data/observable';
import { isIOS } from 'tns-core-modules/platform';
import * as timer from 'tns-core-modules/timer';

enum OTAState {
  not_started = 'ota.pt.state.not-started',
  awaiting_version = 'ota.pt.state.awaiting-version',
  awaiting_ready = 'ota.pt.state.awaiting-ready',
  updating = 'ota.pt.state.updating',
  rebooting = 'ota.pt.state.rebooting',
  verifying_update = 'ota.pt.state.verifying-update',
  complete = 'ota.pt.state.complete',
  canceling = 'ota.pt.state.canceling',
  canceled = 'ota.pt.state.canceled',
  failed = 'ota.pt.state.failed',
  timeout = 'ota.pt.state.timeout'
}

const timeToString = (milliseconds: number): string => {
  const t = new Date(null);
  t.setSeconds(milliseconds / 1000.0);
  return t.toISOString().substr(11, 8);
};

export class PushTracker extends Observable {
  // STATIC:
  static readonly OTAState = OTAState;

  static Settings = class extends Observable {
    // settings classes
    static ControlMode = class {
      static Options: string[] = ['MX1', 'MX2', 'MX2+'];

      static Off = 'Off';

      static Beginner = 'MX1';
      static Intermediate = 'MX2';
      static Advanced = 'MX2+';

      static MX1 = 'MX1';
      static MX2 = 'MX2';
      static MX2plus = 'MX2+';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('SmartDriveControlMode', s.ControlMode);
        return PushTracker.Settings.ControlMode[o];
      }
    };

    static Units = class {
      static Options: string[] = ['English', 'Metric'];
      static Translations: string[] = [
        'pushtracker.settings.units.english',
        'pushtracker.settings.units.metric'
      ];

      static English = 'English';
      static Metric = 'Metric';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('Units', s.Units);
        return PushTracker.Settings.Units[o];
      }
    };

    // public members
    controlMode: string = PushTracker.Settings.ControlMode.MX2plus;
    ezOn = false;
    units: string = PushTracker.Settings.Units.English;
    acceleration = 30;
    maxSpeed = 70;
    tapSensitivity = 100;

    ledColor: Color = new Color('#3c8aba');

    constructor() {
      super();
    }

    static getBoolSetting(flags: number, settingBit: number): boolean {
      return ((flags >> settingBit) & 0x01) > 0;
    }

    fromSettings(s: any): void {
      // from c++ settings bound array to c++ class
      this.controlMode = PushTracker.Settings.ControlMode.fromSettings(s);
      this.units = PushTracker.Settings.Units.fromSettings(s);
      this.ezOn = PushTracker.Settings.getBoolSetting(s.Flags, 0);
      // these floats are [0,1] on pushtracker
      this.acceleration = Math.round(s.Acceleration * 100.0);
      this.maxSpeed = Math.round(s.MaxSpeed * 100.0);
      this.tapSensitivity = Math.round(s.TapSensitivity * 100.0);
    }

    copy(s: any) {
      // from a settings class exactly like this
      this.controlMode = s.controlMode;
      this.units = s.units;
      this.ezOn = s.ezOn;
      this.acceleration = s.acceleration;
      this.maxSpeed = s.maxSpeed;
      this.tapSensitivity = s.tapSensitivity;
    }

    diff(s: any): boolean {
      return (
        this.controlMode !== s.controlMode ||
        this.units !== s.units ||
        this.ezOn !== s.ezOn ||
        this.acceleration !== s.acceleration ||
        this.maxSpeed !== s.maxSpeed ||
        this.tapSensitivity !== s.tapSensitivity
      );
    }
  };

  static PushSettings = class extends Observable {
    // settings classes

    // public members
    threshold = 3;
    timeWindow = 15;
    clearCounter = false;

    constructor() {
      super();
    }

    fromPushSettings(ps: any): void {
      // from c++ push settings bound array to c++ class
      this.threshold = ps.threshold;
      this.timeWindow = ps.timeWindow;
      this.clearCounter = ps.clearCounter > 0;
    }

    copy(ps: any) {
      // from a push settings class exactly like this
      this.threshold = ps.threshold;
      this.timeWindow = ps.timeWindow;
      this.clearCounter = ps.clearCounter;
    }

    diff(ps: any): boolean {
      return (
        this.threshold !== ps.threshold ||
        this.timeWindow !== ps.timeWindow ||
        this.clearCounter !== ps.clearCounter
      );
    }
  };

  // bluetooth info
  static ServiceUUID = '1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0';
  static Characteristics = [
    '58daaa15-f2b2-4cd9-b827-5807b267dae1',
    '68208ebf-f655-4a2d-98f4-20d7d860c471',
    '9272e309-cd33-4d83-a959-b54cc7a54d1f',
    '8489625f-6c73-4fc0-8bcc-735bb173a920',
    '5177fda8-1003-4254-aeb9-7f9edb3cc9cf'
  ];
  static DataCharacteristicUUID = PushTracker.Characteristics[1];
  static DataCharacteristic;

  // Event names
  static pushtracker_paired_event = 'pushtracker_paired_event';
  static pushtracker_connect_event = 'pushtracker_connect_event';
  static pushtracker_disconnect_event = 'pushtracker_disconnect_event';
  static pushtracker_version_event = 'pushtracker_version_event';
  static pushtracker_error_event = 'pushtracker_error_event';
  static pushtracker_distance_event = 'pushtracker_distance_event';
  static pushtracker_settings_event = 'pushtracker_settings_event';
  static pushtracker_push_settings_event = 'pushtracker_push_settings_event';
  static pushtracker_daily_info_event = 'pushtracker_daily_info_event';
  static pushtracker_awake_event = 'pushtracker_awake_event';
  static pushtracker_ota_ready_event = 'pushtracker_ota_ready_event';

  // user interaction events
  static pushtracker_ota_start_event = 'pushtracker_ota_start_event';
  static pushtracker_ota_pause_event = 'pushtracker_ota_pause_event';
  static pushtracker_ota_resume_event = 'pushtracker_ota_resume_event';
  static pushtracker_ota_cancel_event = 'pushtracker_ota_cancel_event';
  static pushtracker_ota_force_event = 'pushtracker_ota_force_event';
  static pushtracker_ota_retry_event = 'pushtracker_ota_retry_event';
  static pushtracker_ota_failed_event = 'pushtracker_ota_failed_event';
  static pushtracker_ota_timeout_event = 'pushtracker_ota_timeout_event';
  readonly OTAState = PushTracker.OTAState;

  // private members
  private _bluetoothService: BluetoothService;

  // NON STATIC:
  events: any /*IPushTrackerEvents*/;

  //  members
  version = 0xff; // firmware version number for the PT firmware
  mcu_version = 0xff; // firmware version number for the SD MCU firmware
  ble_version = 0xff; // firmware version number for the SD BLE firmware
  battery = 0; // battery percent Stat of Charge (SoC)

  address = ''; // MAC Address
  paired = false; // Is this PushTracker paired?
  connected = false; // Is this PushTracker connected?

  settings = new PushTracker.Settings();
  pushSettings = new PushTracker.PushSettings();

  // not serialized
  device: any = null; // the actual device (ios:CBCentral, android:BluetoothDevice)
  otaState: OTAState = OTAState.not_started;
  otaProgress = 0;
  otaActions: string[] = [];
  ableToSend = false;
  otaStartTime: Date;
  otaCurrentTime: Date;
  otaEndTime: Date;

  // static methods:
  static motorTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (265.714 * 63360.0);
  }

  static caseTicksToMiles(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 3.8)) / (36.0 * 63360.0);
  }

  static motorTicksToMeters(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 265.714;
  }

  static caseTicksToMeters(ticks: number): number {
    return (ticks * (2.0 * 3.14159265358 * 0.09652)) / 36.0;
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

  // functions
  constructor(btService: BluetoothService, obj?: any) {
    super();
    this._bluetoothService = btService;
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  toString(): string {
    return `${this.data()}`;
  }

  status(): string {
    let s = '';
    s += this.address + '\n';
    s += 'PT: ' + PushTracker.versionByteToString(this.version) + ',  ';
    s += 'SD: ' + PushTracker.versionByteToString(this.mcu_version) + ',  ';
    s += 'BT: ' + PushTracker.versionByteToString(this.ble_version);
    return s;
  }

  data(): any {
    return {
      version: this.version,
      mcu_version: this.mcu_version,
      ble_version: this.ble_version,
      battery: this.battery,
      address: this.address,
      paired: this.paired,
      connected: this.connected
    };
  }

  fromObject(obj: any): void {
    this.version = (obj && obj.version) || 0xff;
    this.mcu_version = (obj && obj.mcu_version) || 0xff;
    this.ble_version = (obj && obj.ble_version) || 0xff;
    this.battery = (obj && obj.battery) || 0;
    this.address = (obj && obj.address) || '';
    this.paired = (obj && obj.paired) || false;
    this.connected = (obj && obj.connected) || false;
  }

  // regular methods

  get version_string(): string {
    return PushTracker.versionByteToString(this.version);
  }

  isUpToDate(version: string, checkAll?: boolean): boolean {
    const v = PushTracker.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.version];
    if (checkAll) {
      versions.push(this.mcu_version, this.ble_version);
    }
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  otaProgressToString(): string {
    return `${this.otaProgress.toFixed(1)} %`;
  }

  otaStateToString(): string {
    return this.otaState;
  }

  onOTAActionTap(action: string) {
    switch (action) {
      case 'ota.action.start':
        this.sendEvent(PushTracker.pushtracker_ota_start_event);
        break;
      case 'ota.action.pause':
        this.sendEvent(PushTracker.pushtracker_ota_pause_event);
        break;
      case 'ota.action.resume':
        this.sendEvent(PushTracker.pushtracker_ota_resume_event);
        break;
      case 'ota.action.cancel':
        this.sendEvent(PushTracker.pushtracker_ota_cancel_event);
        break;
      case 'ota.action.force':
        this.sendEvent(PushTracker.pushtracker_ota_force_event);
        break;
      case 'ota.action.retry':
        this.sendEvent(PushTracker.pushtracker_ota_retry_event);
        break;
      default:
        break;
    }
  }

  cancelOTA() {
    this.sendEvent(PushTracker.pushtracker_ota_cancel_event);
  }

  performOTA(fw: any, fwVersion: number, timeout: number): Promise<any> {
    // send start ota to PT
    //   - periodically sends start ota
    //   - stop sending once we get ota ready from PT
    // send firmware data for PT
    // send stop ota to PT
    //   - wait for disconnect event
    // inform the user they will need to re-pair the PT to the app
    //   - wait for pairing event for PT
    // tell the user to reconnect to the app
    //   - wait for connection event
    // wait for versions and check to verify update
    return new Promise((resolve, reject) => {
      if (!fw || !fwVersion) {
        const msg = `Bad version (${fwVersion}), or firmware (${fw})!`;
        reject(msg);
      } else {
        // set up variables to keep track of the ota
        let cancelOTA = false;
        let startedOTA = false;
        let hasRebooted = false;
        let haveVersion = false;
        let paused = false;

        let index = 0; // tracking the pointer into the firmware
        const payloadSize = 16; // how many firmware bytes to send each time

        // timer ids
        let otaIntervalID = null; // for managing state
        let otaTimeoutID = null; // for timing out of the ota
        const otaTimeout = timeout;

        const begin = () => {
          cancelOTA = false;
          hasRebooted = false;
          haveVersion = false;
          startedOTA = false;
          paused = false;
          index = 0;

          register();
          // set the progress
          this.otaProgress = 0;
          // set the state
          this.otaState = PushTracker.OTAState.not_started;
          this.otaActions = [];
          if (this.connected) {
            if (this.version !== 0xff) {
              haveVersion = true;
            }
            this.otaActions = ['ota.action.start'];
          }
          // stop the timer
          if (otaIntervalID) {
            timer.clearInterval(otaIntervalID);
          }
          // now actually start the ota
          otaIntervalID = timer.setInterval(runOTA, 250);
        };

        // Handlers
        const connectHandler = () => {
          hasRebooted = true;
          haveVersion = false;
        };
        const disconnectHandler = () => {
          hasRebooted = true;
          haveVersion = false;
        };

        const versionHandler = data => {
          haveVersion = true;
        };
        const otaStartHandler = data => {
          this.otaState = PushTracker.OTAState.awaiting_version;
          this.otaActions = ['ota.action.cancel'];
          this.otaStartTime = new Date();
          // start the timeout timer
          if (otaTimeoutID) {
            timer.clearTimeout(otaTimeoutID);
          }
          otaTimeoutID = timer.setTimeout(() => {
            this.sendEvent(PushTracker.pushtracker_ota_timeout_event);
          }, otaTimeout);
        };
        const otaReadyHandler = data => {
          startedOTA = true;
          this.otaState = PushTracker.OTAState.updating;
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
        };
        const otaForceHandler = data => {
          startedOTA = true;
          this.otaState = PushTracker.OTAState.awaiting_ready;
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
        };
        const otaPauseHandler = data => {
          paused = true;
          this.otaActions = ['ota.action.resume', 'ota.action.cancel'];
        };
        const otaResumeHandler = data => {
          paused = false;
          this.otaActions = ['ota.action.pause', 'ota.action.cancel'];
        };
        const otaCancelHandler = data => {
          this.otaState = PushTracker.OTAState.canceling;
        };
        const otaTimeoutHandler = data => {
          startedOTA = false;
          this.otaState = PushTracker.OTAState.timeout;
        };
        const otaRetryHandler = data => {
          begin();
        };

        // define our functions here
        const unregister = () => {
          // de-register for events
          this.off(PushTracker.pushtracker_connect_event, connectHandler);
          this.off(PushTracker.pushtracker_disconnect_event, disconnectHandler);
          this.off(PushTracker.pushtracker_version_event, versionHandler);
          this.off(PushTracker.pushtracker_ota_start_event, otaStartHandler);
          this.off(PushTracker.pushtracker_ota_ready_event, otaReadyHandler);
          this.off(PushTracker.pushtracker_ota_pause_event, otaPauseHandler);
          this.off(PushTracker.pushtracker_ota_resume_event, otaResumeHandler);
          this.off(PushTracker.pushtracker_ota_force_event, otaForceHandler);
          this.off(PushTracker.pushtracker_ota_cancel_event, otaCancelHandler);
          this.off(PushTracker.pushtracker_ota_retry_event, otaRetryHandler);
          this.off(
            PushTracker.pushtracker_ota_timeout_event,
            otaTimeoutHandler
          );
        };
        const register = () => {
          unregister();
          // register for events
          this.on(PushTracker.pushtracker_connect_event, connectHandler);
          this.on(PushTracker.pushtracker_disconnect_event, disconnectHandler);
          this.on(PushTracker.pushtracker_version_event, versionHandler);
          this.on(PushTracker.pushtracker_ota_ready_event, otaReadyHandler);
          this.on(PushTracker.pushtracker_ota_start_event, otaStartHandler);
          this.on(PushTracker.pushtracker_ota_pause_event, otaPauseHandler);
          this.on(PushTracker.pushtracker_ota_resume_event, otaResumeHandler);
          this.on(PushTracker.pushtracker_ota_force_event, otaForceHandler);
          this.on(PushTracker.pushtracker_ota_cancel_event, otaCancelHandler);
          this.on(PushTracker.pushtracker_ota_retry_event, otaRetryHandler);
          this.on(PushTracker.pushtracker_ota_timeout_event, otaTimeoutHandler);
        };

        const writeFirmwareSector = (
          fwSector: any,
          characteristic: any,
          nextState: any
        ) => {
          if (index < 0) index = 0;
          const fileSize = fwSector.length;
          if (cancelOTA) {
            return;
          } else if (paused) {
            setTimeout(() => {
              writeFirmwareSector(fwSector, characteristic, nextState);
            }, 100);
          } else if (index < fileSize) {
            if (this.connected && this.ableToSend) {
              const p = new Packet();
              p.makeOTAPacket('PushTracker', index, fwSector);
              const data = p.writableBuffer();
              p.destroy();
              this._bluetoothService
                .sendToPushTrackers(data, [this.device])
                .then(notified => {
                  index += payloadSize;
                  if (isIOS) {
                    setTimeout(() => {
                      writeFirmwareSector(fwSector, characteristic, nextState);
                    }, 30);
                  } else {
                    writeFirmwareSector(fwSector, characteristic, nextState);
                  }
                })
                .catch(err => {
                  setTimeout(() => {
                    writeFirmwareSector(fwSector, characteristic, nextState);
                  }, 100);
                });
            } else {
              setTimeout(() => {
                writeFirmwareSector(fwSector, characteristic, nextState);
              }, 500);
            }
          } else {
            // we are done with the sending change
            // state to the next state
            setTimeout(() => {
              // wait for a little bit
              this.otaState = nextState;
            }, 1500);
          }
        };
        const stopOTA = (
          reason: string,
          success: boolean = false,
          doRetry: boolean = false
        ) => {
          cancelOTA = true;
          startedOTA = false;
          this.otaActions = [];
          // stop timers
          if (otaIntervalID) {
            timer.clearInterval(otaIntervalID);
          }
          if (otaTimeoutID) {
            timer.clearInterval(otaTimeoutID);
          }

          unregister();
          // TODO: do we disconnect?
          // TODO: How do we disconnect from the PT?
          if (success) {
            resolve(reason);
          } else if (doRetry) {
            this.on(PushTracker.pushtracker_ota_cancel_event, otaCancelHandler);
            this.on(PushTracker.pushtracker_ota_retry_event, otaRetryHandler);
            this.otaActions = ['ota.action.retry'];
            otaIntervalID = timer.setInterval(runOTA, 250);
          } else {
            resolve(reason);
          }
        };
        const runOTA = () => {
          switch (this.otaState) {
            case PushTracker.OTAState.not_started:
              if (this.connected && this.ableToSend) {
                this.otaActions = ['ota.action.start'];
              } else {
                this.otaActions = [];
              }
              break;
            case PushTracker.OTAState.awaiting_version:
              if (this.ableToSend && haveVersion) {
                if (this.version >= fwVersion) {
                  this.otaActions = ['ota.action.force', 'ota.action.cancel'];
                } else {
                  this.otaState = PushTracker.OTAState.awaiting_ready;
                }
              }
              break;
            case PushTracker.OTAState.awaiting_ready:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              // make sure the index is set to 0 for next OTA
              index = -1;
              if (this.connected && this.ableToSend) {
                // send start OTA
                this.sendPacket(
                  'Command',
                  'StartOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'PushTracker'
                ).catch(err => {});
              }
              break;
            case PushTracker.OTAState.updating:
              // now that we've successfully gotten the
              // OTA started - don't timeout
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              if (otaTimeoutID) {
                timer.clearTimeout(otaTimeoutID);
              }
              if (index === -1) {
                writeFirmwareSector(
                  fw,
                  PushTracker.DataCharacteristic,
                  PushTracker.OTAState.rebooting
                );
              }
              // update the progress bar
              this.otaProgress = ((index + 16) * 100) / fw.length;
              // we need to reboot after the OTA
              hasRebooted = false;
              haveVersion = false;
              break;
            case PushTracker.OTAState.rebooting:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.otaActions = [];
              if (this.ableToSend && !hasRebooted) {
                // send stop ota command
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'PushTracker'
                ).catch(err => {});
              } else if (this.ableToSend && haveVersion) {
                this.otaState = PushTracker.OTAState.verifying_update;
              }
              break;
            case PushTracker.OTAState.verifying_update:
              // TODO: this should be a part of another
              //       page - since we have to re-pair
              //       and re-connect the PT to the App
              this.otaEndTime = new Date();
              let msg = '';
              if (this.version === fwVersion) {
                msg = `PushTracker OTA Succeeded! ${this.version.toString(16)}`;
                this.otaState = PushTracker.OTAState.complete;
              } else {
                msg = `PushTracker OTA FAILED! ${this.version.toString(16)}`;
                this.otaState = PushTracker.OTAState.failed;
              }
              break;
            case PushTracker.OTAState.complete:
              stopOTA('OTA Complete', true, false);
              break;
            case PushTracker.OTAState.canceling:
              this.otaActions = [];
              this.otaProgress = 0;
              cancelOTA = true;
              if (!startedOTA) {
                // now update the ota state
                this.otaState = PushTracker.OTAState.canceled;
              } else if (this.connected && this.ableToSend) {
                // send stop ota command
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'PushTracker'
                )
                  .then(success => {
                    if (success) {
                      // now update the ota state
                      this.otaState = PushTracker.OTAState.canceled;
                    }
                  })
                  .catch(err => {});
              } else {
                // now update the ota state
                this.otaState = PushTracker.OTAState.canceled;
              }
              break;
            case PushTracker.OTAState.canceled:
              stopOTA('OTA Canceled', false, false);
              break;
            case PushTracker.OTAState.failed:
              stopOTA('OTA Failed', false, true);
              break;
            case PushTracker.OTAState.timeout:
              stopOTA('OTA Timeout', false, true);
              break;
            default:
              break;
          }
        };
        // now actually start
        begin();
      }
    });
  }

  sendPacket(
    Type: string,
    SubType: string,
    dataKey?: string,
    dataType?: string,
    data?: any
  ): Promise<any> {
    console.log(
      `\n\n PushTracker.model Sending ${Type}::${SubType}::${data} to ${
        this.address
      } \n\n`
    );
    const p = new Packet();
    p.Type(Type);
    p.SubType(SubType);
    if (dataKey) {
      // if dataType is non-null and not '', then we need to transform the data
      let boundData = data;
      if (dataType && dataType.length) {
        boundData = Packet.makeBoundData(dataType, data);
      }
      p.data(dataKey, boundData);
    }
    const transmitData = p.writableBuffer();
    p.destroy();
    return this._bluetoothService.sendToPushTrackers(transmitData, [
      this.device
    ]);
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
    return this.sendPacket(
      'Command',
      'SetSettings',
      'settings',
      null,
      settings
    );
  }

  sendPushSettings(
    threshold: number,
    timeWindow: number,
    clearCounter: boolean
  ): Promise<any> {
    const p = new Packet();
    const pushSettings = p.data('pushSettings');
    // clamp numbers
    const clamp = n => {
      return Math.round(Math.max(0, Math.min(n, 255.0)));
    };
    threshold = clamp(threshold);
    timeWindow = clamp(timeWindow);
    // now fill in the packet
    pushSettings.threshold = threshold;
    pushSettings.timeWindow = timeWindow;
    pushSettings.clearCounter = clearCounter ? 1 : 0;
    p.destroy();
    return this.sendPacket(
      'Command',
      'SetPushSettings',
      'pushSettings',
      null,
      pushSettings
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

  // handlers
  handlePaired() {
    this.paired = true;
    this.sendEvent(PushTracker.pushtracker_paired_event);
  }

  handleConnect() {
    this.connected = true;
    this.sendEvent(PushTracker.pushtracker_connect_event);
  }

  handleDisconnect() {
    this.connected = false;
    this.sendEvent(PushTracker.pushtracker_disconnect_event);
  }

  handlePacket(p: Packet) {
    // if we get a pakcet we must have been paired
    this.paired = true;
    // if we get data we must be connected properly
    this.ableToSend = true;
    // now actually determine packet type and call handlers
    const packetType = p.Type();
    const subType = p.SubType();
    if (packetType && packetType === 'Data') {
      switch (subType) {
        case 'VersionInfo':
          this.handleVersionInfo(p);
          break;
        case 'ErrorInfo':
          this.handleErrorInfo(p);
          break;
        case 'MotorDistance':
          this.handleDistance(p);
          break;
        case 'DailyInfo':
          this.handleDailyInfo(p);
          break;
        case 'PushSettings':
          this.handlePushSettings(p);
          break;
        case 'Ready':
          this.handleReady(p);
          break;
        default:
          break;
      }
    } else if (packetType && packetType === 'Command') {
      switch (subType) {
        case 'SetSettings':
          this.handleSettings(p);
          break;
        case 'OTAReady':
          this.handleOTAReady(p);
          break;
        default:
          break;
      }
    }
  }

  // private functions
  private handleVersionInfo(p: Packet) {
    // This is sent by the PushTracker when it connects
    const versionInfo = p.data('versionInfo');
    /* Version Info
           struct {
           uint8_t     pushTracker;         // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           uint8_t     smartDrive;          // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           uint8_t     smartDriveBluetooth; // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           }            versionInfo;
        */
    this.version = versionInfo.pushTracker;
    this.mcu_version = versionInfo.smartDrive;
    this.ble_version = versionInfo.smartDriveBluetooth;
    // TODO: send version event to subscribers so they get updated
    this.sendEvent(PushTracker.pushtracker_version_event, {
      pt: this.version,
      mcu: this.mcu_version,
      ble: this.ble_version
    });
  }

  private handleErrorInfo(p: Packet) {
    // This is sent by the PushTracker when it connects
    const errorInfo = p.data('errorInfo');
    /* Error Info
           struct {
           uint16_t            year;
           uint8_t             month;
           uint8_t             day;
           uint8_t             hour;
           uint8_t             minute;
           uint8_t             second;
           SmartDrive::Error   mostRecentError;  // Type of the most recent error, associated with the timeStamp.
           uint8_t             numBatteryVoltageErrors;
           uint8_t             numOverCurrentErrors;
           uint8_t             numMotorPhaseErrors;
           uint8_t             numGyroRangeErrors;
           uint8_t             numOverTemperatureErrors;
           uint8_t             numBLEDisconnectErrors;
           }                     errorInfo;
        */
    // TODO: send error event to subscribers so they get updated
    this.sendEvent(PushTracker.pushtracker_error_event, {
      // what should we put here?
    });
    // TODO: update error record for this pushtracker (locally and
    // on the server)
  }

  private handleDistance(p: Packet) {
    // This is sent by the PushTracker when it connects and when
    // the app sends a Command::DistanceRequest
    const motorTicks = p.data('motorDistance');
    const caseTicks = p.data('caseDistance');
    const motorMiles = PushTracker.motorTicksToMiles(motorTicks);
    const caseMiles = PushTracker.caseTicksToMiles(caseTicks);
    /* DistanceInfo
           struct {
           uint64_t   motorDistance;  /** Cumulative Drive distance in ticks.
           uint64_t   caseDistance;   /** Cumulative Case distance in ticks.
           }            distanceInfo;
        */
    // console.log(`Got distance info: ${motorTicks}, ${caseTicks}`);
    // console.log(`                 : ${motorMiles}, ${caseMiles}`);
    this.sendEvent(PushTracker.pushtracker_distance_event, {
      driveDistance: motorTicks,
      coastDistance: caseTicks
    });
    // TODO: update distance record for this pushtracker (locally
    // and on the server)
  }

  private handleSettings(p: Packet) {
    // This is sent by the PushTracker when it connects
    const settings = p.data('settings');
    /* Settings
           struct Settings {
           ControlMode controlMode;
           Units       units;
           uint8_t     settingsFlags1;  /** Bitmask of boolean settings.
           uint8_t     padding;
           float       tapSensitivity;  /** Slider setting, range: [0.1, 1.0]
           float       acceleration;    /** Slider setting, range: [0.1, 1.0]
           float       maxSpeed;        /** Slider setting, range: [0.1, 1.0]
           } settings;
        */
    this.settings.fromSettings(settings);
    this.sendEvent(PushTracker.pushtracker_settings_event, {
      settings: this.settings
    });
  }

  private handlePushSettings(p: Packet) {
    // This is sent by the PushTracker when it connects
    const pushSettings = p.data('pushSettings');
    /* PushSettings
	       struct PushSettings {
   	   uint8_t     threshold;       /** Push Detection Threshold, [0, 255]
		   uint8_t     timeWindow;      /** Push Detection Time Window, [0, 255]
		   uint8_t     clearCounter;    /** Clear the counter for data below threshold? [0, 1]
		   }  pushSettings;
		*/
    this.pushSettings.fromPushSettings(pushSettings);
    this.sendEvent(PushTracker.pushtracker_push_settings_event, {
      pushSettings: this.pushSettings
    });
  }

  private handleDailyInfo(p: Packet) {
    // This is sent by the PushTracker every 10 seconds while it
    // is connected (for today's daily info) - it also sends all
    // unsent daily info for previous days on connection
    const di = p.data('dailyInfo');
    /* Daily Info
           struct {
           uint16_t    year;
           uint8_t     month;
           uint8_t     day;
           uint16_t    pushesWith;      /** Raw integer number of pushes.
           uint16_t    pushesWithout;   /** Raw integer number of pushes.
           uint16_t    coastWith;       /** Coast Time (s) * 100.
           uint16_t    coastWithout;    /** Coast Time Without (s) * 100.
           uint8_t     distance;        /** Distance (mi) * 10.
           uint8_t     speed;           /** Speed (mph) * 10.
           uint8_t     ptBattery;       /** Percent, [0, 100].
           uint8_t     sdBattery;       /** Percent, [0, 100].
           }            dailyInfo;
        */
    this.sendEvent(PushTracker.pushtracker_daily_info_event, {
      year: di.year,
      month: di.month,
      day: di.day,
      pushesWith: di.pushesWith,
      pushesWithout: di.pushesWithout,
      coastWith: di.coastWith,
      coastWithout: di.coastWithout,
      distance: di.distance,
      speed: di.speed,
      ptBattery: di.ptBattery,
      sdBattery: di.sdBattery
    });
    // TODO: upate daily info record for this pushtracker (locally
    // and on the server)
  }

  private handleReady(p: Packet) {
    // This is sent by the PushTracker after it has received a
    // Wake command
    this.sendEvent(PushTracker.pushtracker_awake_event);
  }

  private handleOTAReady(p: Packet) {
    // this is sent by both the PT in response to a
    // Command::StartOTA
    const otaDevice = bindingTypeToString('PacketOTAType', p.data('OTADevice'));
    switch (otaDevice) {
      case 'PushTracker':
        this.sendEvent(PushTracker.pushtracker_ota_ready_event);
        break;
      default:
        this.sendEvent(PushTracker.pushtracker_ota_ready_event);
        break;
    }
  }
}

/**
 * All of the events for PushTracker that can be emitted and listened
 * to.
 */
export interface IPushtrackerEvents {
  pushtracker_disconnect_event: string;
  pushtracker_connect_event: string;

  pushtracker_version_event: string;
  pushtracker_error_event: string;
  pushtracker_distance_event: string;
  pushtracker_settings_event: string;

  pushtracker_daily_info_event: string;
  pushtracker_awake_event: string;

  pushtracker_ota_timeout_event: string;
  pushtracker_ota_progress_event: string;
  pushtracker_ota_version_event: string;
  pushtracker_ota_complete_event: string;
  pushtracker_ota_failure_event: string;
}
