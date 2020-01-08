import { File, isIOS, knownFolders, path } from '@nativescript/core';
import * as timer from '@nativescript/core/timer';
import { bindingTypeToString, Device, Packet } from '@permobil/core';
import { differenceInCalendarDays } from 'date-fns';
import throttle from 'lodash/throttle';
import { DownloadProgress } from 'nativescript-download-progress';
import { BluetoothService } from '../services';
import { DeviceBase } from './device-base.model';

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
  timeout = 'ota.pt.state.timeout',
  already_uptodate = 'ota.pt.state.already-uptodate',
  detected_pt = 'ota.pt.state.detected-pt'
}

export class PushTracker extends DeviceBase {
  // STATIC:
  static readonly OTAState = OTAState;
  readonly OTAState = PushTracker.OTAState;

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
  static DataCharacteristic: any;

  // Event names
  static paired_event = 'paired_event';
  static connect_event = 'connect_event';
  static disconnect_event = 'disconnect_event';
  static version_event = 'version_event';
  static error_event = 'error_event';
  static distance_event = 'distance_event';
  static settings_event = 'settings_event';
  static push_settings_event = 'push_settings_event';
  static switch_control_settings_event = 'switch_control_settings_event';
  static daily_info_event = 'daily_info_event';
  static awake_event = 'awake_event';
  static ota_ready_event = 'ota_ready_event';

  // user interaction events
  public static ota_start_event = 'ota_start_event';
  public static ota_pause_event = 'ota_pause_event';
  public static ota_resume_event = 'ota_resume_event';
  public static ota_cancel_event = 'ota_cancel_event';
  public static ota_force_event = 'ota_force_event';
  public static ota_retry_event = 'ota_retry_event';
  public static ota_failed_event = 'ota_failed_event';
  public static ota_timeout_event = 'ota_timeout_event';
  public static pushtracker_ota_status_event = 'pushtracker_ota_status_event'; // sends state, actions, progress

  canBackNavigate = true;

  // NON STATIC:
  events: any /*IPushTrackerEvents*/;

  //  members - in addition to Device Base
  sdBattery = 0; // stored battery information about smartdrive
  version = 0xff; // firmware version number for the PT firmware
  paired = false; // Is this PushTracker paired?
  settings = new Device.Settings();
  pushSettings = new Device.PushSettings();
  switchControlSettings = new Device.SwitchControlSettings();

  // not serialized
  otaState: OTAState = OTAState.not_started;
  otaProgress = 0;

  private _throttledSendTime: any = null;

  // functions
  constructor(btService: BluetoothService, obj?: any) {
    super(btService);
    this._bluetoothService = btService;
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }

    this._throttledSendTime = throttle(this.sendTime.bind(this), 1000, {
      leading: false,
      trailing: true
    });
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
      sdBattery: this.sdBattery,
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
    this.sdBattery = (obj && obj.sdBattery) || 0;
    this.address = (obj && obj.address) || '';
    this.paired = (obj && obj.paired) || false;
    this.connected = (obj && obj.connected) || false;
  }

  // regular methods

  get version_string(): string {
    return PushTracker.versionByteToString(this.version);
  }

  hasVersionInfo(): boolean {
    return [this.version].reduce((a, v) => {
      return a && v < 0xff && v > 0x00;
    }, true);
  }

  hasAllVersionInfo(): boolean {
    return [this.version, this.ble_version, this.mcu_version].reduce((a, v) => {
      return a && v < 0xff && v > 0x00;
    }, true);
  }

  isSmartDriveUpToDate(version: string): boolean {
    const v =
      typeof version === 'number'
        ? version
        : PushTracker.versionStringToByte(version);
    if (v === 0xff) {
      return false;
    }
    const versions = [this.mcu_version, this.ble_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  isUpToDate(version: string, checkAll?: boolean): boolean {
    const v =
      typeof version === 'number'
        ? version
        : PushTracker.versionStringToByte(version);
    if (v === 0xff) {
      return false;
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
        this.sendEvent(PushTracker.ota_start_event);
        break;
      case 'ota.action.pause':
        this.sendEvent(PushTracker.ota_pause_event);
        break;
      case 'ota.action.resume':
        this.sendEvent(PushTracker.ota_resume_event);
        break;
      case 'ota.action.cancel':
        this.sendEvent(PushTracker.ota_cancel_event);
        break;
      case 'ota.action.force':
        this.sendEvent(PushTracker.ota_force_event);
        break;
      case 'ota.action.retry':
        this.sendEvent(PushTracker.ota_retry_event);
        break;
      default:
        break;
    }
  }

  cancelOTA() {
    this.sendEvent(PushTracker.ota_cancel_event);
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
          this.otaState = PushTracker.OTAState.detected_pt;
          this.setOtaActions();
          if (this.connected) {
            if (this.version !== 0xff) {
              haveVersion = true;
            }
            this.setOtaActions(['ota.action.start']);
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

        const versionHandler = _ => {
          haveVersion = true;
        };
        const otaStartHandler = _ => {
          this.otaState = PushTracker.OTAState.awaiting_version;
          this.setOtaActions(['ota.action.cancel']);
          this.otaStartTime = new Date();
          // start the timeout timer
          if (otaTimeoutID) {
            timer.clearTimeout(otaTimeoutID);
          }
          otaTimeoutID = timer.setTimeout(() => {
            this.sendEvent(PushTracker.ota_timeout_event);
          }, otaTimeout);
        };
        const otaReadyHandler = _ => {
          startedOTA = true;
          this.otaState = PushTracker.OTAState.updating;
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
        };
        const otaForceHandler = _ => {
          startedOTA = true;
          this.otaState = PushTracker.OTAState.awaiting_ready;
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
        };
        const otaPauseHandler = _ => {
          paused = true;
          this.setOtaActions(['ota.action.resume', 'ota.action.cancel']);
        };
        const otaResumeHandler = _ => {
          paused = false;
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
        };
        const otaCancelHandler = _ => {
          this.otaState = PushTracker.OTAState.canceling;
        };
        const otaTimeoutHandler = _ => {
          startedOTA = false;
          this.otaState = PushTracker.OTAState.timeout;
        };
        const otaRetryHandler = _ => {
          begin();
        };

        // define our functions here
        const unregister = () => {
          // de-register for events
          this.off(PushTracker.connect_event, connectHandler);
          this.off(PushTracker.disconnect_event, disconnectHandler);
          this.off(PushTracker.version_event, versionHandler);
          this.off(PushTracker.ota_start_event, otaStartHandler);
          this.off(PushTracker.ota_ready_event, otaReadyHandler);
          this.off(PushTracker.ota_pause_event, otaPauseHandler);
          this.off(PushTracker.ota_resume_event, otaResumeHandler);
          this.off(PushTracker.ota_force_event, otaForceHandler);
          this.off(PushTracker.ota_cancel_event, otaCancelHandler);
          this.off(PushTracker.ota_retry_event, otaRetryHandler);
          this.off(PushTracker.ota_timeout_event, otaTimeoutHandler);
        };
        const register = () => {
          unregister();
          // register for events
          this.on(PushTracker.connect_event, connectHandler);
          this.on(PushTracker.disconnect_event, disconnectHandler);
          this.on(PushTracker.version_event, versionHandler);
          this.on(PushTracker.ota_ready_event, otaReadyHandler);
          this.on(PushTracker.ota_start_event, otaStartHandler);
          this.on(PushTracker.ota_pause_event, otaPauseHandler);
          this.on(PushTracker.ota_resume_event, otaResumeHandler);
          this.on(PushTracker.ota_force_event, otaForceHandler);
          this.on(PushTracker.ota_cancel_event, otaCancelHandler);
          this.on(PushTracker.ota_retry_event, otaRetryHandler);
          this.on(PushTracker.ota_timeout_event, otaTimeoutHandler);
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
                .then(_ => {
                  index += payloadSize;
                  if (isIOS) {
                    setTimeout(() => {
                      writeFirmwareSector(fwSector, characteristic, nextState);
                    }, 30);
                  } else {
                    writeFirmwareSector(fwSector, characteristic, nextState);
                  }
                })
                .catch(_ => {
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
          this.setOtaActions();
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
            this.on(PushTracker.ota_cancel_event, otaCancelHandler);
            this.on(PushTracker.ota_retry_event, otaRetryHandler);
            this.setOtaActions(['ota.action.retry']);
            otaIntervalID = timer.setInterval(runOTA, 250);
          } else {
            resolve(reason);
          }
          // send a state update
          this.sendEvent(PushTracker.pushtracker_ota_status_event, {
            progress: this.otaProgress,
            actions: this.otaActions.slice(),
            state: this.otaState
          });
          this.canBackNavigate = true;
        };
        const runOTA = () => {
          // send a state update
          this.sendEvent(PushTracker.pushtracker_ota_status_event, {
            progress: this.otaProgress,
            actions: this.otaActions.slice(),
            state: this.otaState
          });
          switch (this.otaState) {
            case PushTracker.OTAState.detected_pt:
              if (this.connected && this.ableToSend) {
                this.setOtaActions(['ota.action.start']);
              } else {
                this.setOtaActions();
              }
              break;
            case PushTracker.OTAState.awaiting_version:
              this.canBackNavigate = false;
              if (this.ableToSend && haveVersion) {
                if (this.version >= fwVersion) {
                  this.setOtaActions(['ota.action.force', 'ota.action.cancel']);
                  this.otaState = PushTracker.OTAState.already_uptodate;
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
                ).catch(_ => {});
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
              this.setOtaActions();
              if (this.ableToSend && !hasRebooted) {
                // send stop ota command
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'PushTracker'
                ).catch(_ => {});
              } else if (this.ableToSend && haveVersion) {
                this.otaState = PushTracker.OTAState.verifying_update;
              }
              break;
            case PushTracker.OTAState.verifying_update:
              // TODO: this should be a part of another
              //       page - since we have to re-pair
              //       and re-connect the PT to the App
              this.otaEndTime = new Date();
              if (this.version === fwVersion) {
                this.otaState = PushTracker.OTAState.complete;
              } else {
                this.otaState = PushTracker.OTAState.failed;
              }
              break;
            case PushTracker.OTAState.complete:
              stopOTA('OTA Complete', true, false);
              break;
            case PushTracker.OTAState.canceling:
              this.setOtaActions();
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
                  .catch(_ => {});
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
    console.log(
      `\n\n PushTracker.model Sending ${Type}::${SubType} (${p.toString()}) to ${
        this.address
      } \n\n`
    );
    const transmitData = p.writableBuffer();
    p.destroy();
    return this._bluetoothService.sendToPushTrackers(transmitData, [
      this.device
    ]);
  }

  sendPushSettingsObject(settings: Device.PushSettings) {
    return this.sendPushSettings(
      settings.threshold,
      settings.timeWindow,
      settings.clearCounter
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

  public sendTime(d?: Date) {
    const p = new Packet();
    const timeSettings = p.data('timeInfo');
    const date = d !== undefined ? new Date(d) : new Date();
    // now fill in the packet
    timeSettings.year = date.getFullYear();
    timeSettings.month = date.getMonth() + 1;
    timeSettings.day = date.getDate();
    timeSettings.hours = date.getHours();
    timeSettings.minutes = date.getMinutes();
    timeSettings.seconds = date.getSeconds();
    p.destroy();
    return this.sendPacket(
      'Command',
      'SetTime',
      'timeInfo',
      null,
      timeSettings
    );
  }

  // handlers
  handlePaired() {
    this.paired = true;
    this.sendEvent(PushTracker.paired_event);
  }

  handleConnect() {
    if (!this.connected) {
      this.sendEvent(PushTracker.connect_event);
    }
    this.connected = true;
  }

  handleDisconnect() {
    this.connected = false;
    this.sendEvent(PushTracker.disconnect_event);
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
        case 'SwitchControlSettings':
          this.handleSwitchControlSettings(p);
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
        case 'SetSwitchControlSettings':
          this.handleSwitchControlSettings(p);
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
           uint8_t  pushTracker;         // Major.Minor version as the MAJOR and MINOR nibbles.
           uint8_t  smartDrive;          // Major.Minor version as the MAJOR and MINOR nibbles.
           uint8_t  smartDriveBluetooth; // Major.Minor version as the MAJOR and MINOR nibbles.
         }            versionInfo;
    */
    this.version = versionInfo.pushTracker;
    this.mcu_version = versionInfo.smartDrive;
    this.ble_version = versionInfo.smartDriveBluetooth;
    this.sendEvent(PushTracker.version_event, {
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
       SmartDrive::Error   mostRecentError;
       uint8_t             numBatteryVoltageErrors;
       uint8_t             numOverCurrentErrors;
       uint8_t             numMotorPhaseErrors;
       uint8_t             numGyroRangeErrors;
       uint8_t             numOverTemperatureErrors;
       uint8_t             numBLEDisconnectErrors;
       }                     errorInfo;
    */
    // Properly check against invalid dates (null or in the future)
    // https://github.com/Max-Mobility/permobil-client/issues/546
    const year = errorInfo.year;
    const month = errorInfo.month - 1;
    const day = errorInfo.day;
    const now = new Date();
    const then = new Date(year, month, day);
    const diff = differenceInCalendarDays(now, then);
    // don't check against month being truthy - it can be 0 -
    // https://github.com/Max-Mobility/permobil-client/issues/583
    if (year && diff >= 0) {
      this.sendEvent(PushTracker.error_event, {
        year: year,
        month: month,
        day: day,
        hour: errorInfo.hour,
        minute: errorInfo.minute,
        second: errorInfo.second,
        mostRecentError: bindingTypeToString(
          'PacketErrorType',
          errorInfo.mostRecentError
        ),
        numBatteryVoltageErrors: errorInfo.numBatteryVoltageErrors,
        numOverCurrentErrors: errorInfo.numOverCurrentErrors,
        numMotorPhaseErrors: errorInfo.numMotorPhaseErrors,
        numGyroRangeErrors: errorInfo.numGyroRangeErrors,
        numOverTemperatureErrors: errorInfo.numOverTemperatureErrors,
        numBLEDisconnectErrors: errorInfo.numBLEDisconnectErrors
      });
    }
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
    this.sendEvent(PushTracker.distance_event, {
      driveDistance: motorTicks,
      coastDistance: caseTicks,
      driveMiles: motorMiles,
      coastMiles: caseMiles
    });
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
    this.sendEvent(PushTracker.settings_event, {
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
    this.pushSettings.fromSettings(pushSettings);
    this.sendEvent(PushTracker.push_settings_event, {
      pushSettings: this.pushSettings
    });
  }

  private handleSwitchControlSettings(p: Packet) {
    // This is sent by the PushTracker when it connects
    const switchControlSettings = p.data('switchControlSettings');
    /* SwitchControlSettings
       struct SwitchControlSettings {
         SwitchControlMode mode;
         uint8_t padding1;
         uint8_t padding2;
         uint8_t padding3;
         float maxSpeed; // Slider setting, range: [0.1, 1.0]
       }  switchControlSettings;
    */
    this.switchControlSettings.fromSettings(switchControlSettings);
    this.sendEvent(PushTracker.switch_control_settings_event, {
      switchControlSettings: this.switchControlSettings
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
    // set the battery for
    // https://github.com/Max-Mobility/permobil-client/issues/580
    this.battery = di.ptBattery;
    this.sdBattery = di.sdBattery;

    // Properly check against invalid dates (null or in the future)
    // https://github.com/Max-Mobility/permobil-client/issues/546
    const year = di.year;
    const month = di.month - 1;
    const day = di.day;
    const now = new Date();
    const then = new Date(year, month, day);
    const diff = differenceInCalendarDays(now, then);

    if (diff > 0) {
      // we are receiving a daily info event for days that are not
      // today - which may happen on connection establishment for the
      // first connection of the day - but we want to make sure that
      // if the PT is out of date then we set the proper time
      // (throttled to 1 second to prevent saturation on connection
      // when we potentially receive 100 daily info at once) -
      // https://github.com/Max-Mobility/permobil-client/issues/581
      this._throttledSendTime();
    }

    // don't check against month being truthy - it can be 0 -
    // https://github.com/Max-Mobility/permobil-client/issues/583
    if (year && diff >= 0) {
      this.sendEvent(PushTracker.daily_info_event, {
        year: year,
        month: month,
        day: day,
        pushesWith: di.pushesWith,
        pushesWithout: di.pushesWithout,
        coastWith: di.coastWith / 100.0,
        coastWithout: di.coastWithout / 100.0,
        distance: di.distance / 10.0,
        speed: di.speed / 10.0,
        ptBattery: di.ptBattery,
        sdBattery: di.sdBattery
      });
    }
  }

  private handleReady(_: Packet) {
    // This is sent by the PushTracker after it has received a
    // Wake command
    this.sendEvent(PushTracker.awake_event);
  }

  private handleOTAReady(p: Packet) {
    // this is sent by both the PT in response to a
    // Command::StartOTA
    this.sendEvent(PushTracker.ota_ready_event);
  }
}

export namespace PushTrackerData {
  export namespace Firmware {
    export const TableName = 'PushTrackerFirmware';
    export const IdName = 'id';
    export const VersionName = 'version';
    export const FirmwareName = 'firmware';
    export const FileName = 'filename';
    export const ChangesName = 'changes';
    export const Fields = [
      { name: VersionName, type: 'int' },
      { name: FirmwareName, type: 'TEXT' },
      { name: FileName, type: 'TEXT' },
      { name: ChangesName, type: 'TEXT' }
    ];

    export function loadFromFileSystem(f) {
      const file = File.fromPath(
        f.filename || f[PushTrackerData.Firmware.FileName]
      );
      return file.readSync(err => {
        console.error('Could not load from fs:', err);
      });
    }

    export function saveToFileSystem(f) {
      const file = File.fromPath(
        f.filename || f[PushTrackerData.Firmware.FileName]
      );
      // console.log('f.filename', f.filename, file);
      // console.log('f.data', typeof f.data, f.data.length);
      file.writeSync(f.data, err => {
        console.error('Could not save to fs:', err);
      });
    }

    export function download(f: any) {
      let url = f['_downloadURL'];
      // make sure they're https!
      if (!url.startsWith('https:')) {
        url = url.replace('http:', 'https:');
      }
      console.log('Downloading FW update', f['_filename']);

      const download = new DownloadProgress();
      return download
        .downloadFile(url)
        .then(file => {
          const fileData = File.fromPath(file.path).readSync();
          return {
            version: PushTrackerData.Firmware.versionStringToByte(f['version']),
            name: f['_filename'],
            data: fileData,
            changes: f['change_notes']
          };
        })
        .catch(error => {
          console.error('download error', url, error);
        });
    }

    export function versionStringToByte(version: string): number {
      const [major, minor] = version.split('.');
      return (parseInt(major) << 4) | parseInt(minor);
    }

    export function getFileName(firmware: string): string {
      const firmwares = knownFolders.documents().getFolder('firmwares'); // creates Documents/firmwares if it doesn't exist
      return path.join(firmwares.path, firmware);
    }

    export function loadFirmware(
      id: any,
      version: number,
      firmwareName: string,
      fileName: string,
      changes: string
    ) {
      return {
        [PushTrackerData.Firmware.IdName]: id,
        [PushTrackerData.Firmware.VersionName]: version,
        [PushTrackerData.Firmware.FirmwareName]: firmwareName,
        [PushTrackerData.Firmware.FileName]: fileName,
        [PushTrackerData.Firmware.ChangesName]: changes
          ? JSON.parse(changes)
          : []
      };
    }

    export function newFirmware(
      version: number,
      firmwareName: string,
      fileName?: string,
      changes?: string[]
    ) {
      const fname =
        fileName || PushTrackerData.Firmware.getFileName(firmwareName);
      return {
        [PushTrackerData.Firmware.VersionName]: version,
        [PushTrackerData.Firmware.FirmwareName]: firmwareName,
        [PushTrackerData.Firmware.FileName]: fname,
        [PushTrackerData.Firmware.ChangesName]: changes
          ? JSON.stringify(changes)
          : '[]'
      };
    }
  }
}

/**
 * All of the events for PushTracker that can be emitted and listened
 * to.
 */
export interface IPushtrackerEvents {
  disconnect_event: string;
  connect_event: string;

  version_event: string;
  error_event: string;
  distance_event: string;
  settings_event: string;

  daily_info_event: string;
  awake_event: string;

  ota_timeout_event: string;
  ota_progress_event: string;
  ota_version_event: string;
  ota_complete_event: string;
  ota_failure_event: string;
}
