import { bindingTypeToString, ISmartDriveEvents, mod, Packet, SD_OTA_State } from '@permobil/core';
import { Prop } from '@permobil/nativescript';
import { Color } from 'tns-core-modules/color';
import { Observable } from 'tns-core-modules/data/observable';
import * as timer from 'tns-core-modules/timer';
import { BluetoothService } from '../services/bluetooth.service';
import { DeviceBase } from './device-base.model';

export class SmartDrive extends DeviceBase {
  // STATIC:
  static readonly OTAState = SD_OTA_State;
  readonly OTAState = SmartDrive.OTAState;

  // bluetooth info
  public static ServiceUUID = '0cd51666-e7cb-469b-8e4d-2742f1ba7723';
  public static Characteristics = [
    'e7add780-b042-4876-aae1-112855353cc1',
    'e8add780-b042-4876-aae1-112855353cc1',
    'e9add780-b042-4876-aae1-112855353cc1',
    // 'eaadd780-b042-4876-aae1-112855353cc1',
    'ebadd780-b042-4876-aae1-112855353cc1'
  ];
  public static BLEOTADataCharacteristic = SmartDrive.Characteristics[0];
  public static DataCharacteristic = SmartDrive.Characteristics[1];
  public static ControlCharacteristic = SmartDrive.Characteristics[2];
  public static BLEOTAControlCharacteristic = SmartDrive.Characteristics[3];
  // public static BLEOTADongleCharacteristic = SmartDrive.Characteristics[3];

  // Event names
  public static smartdrive_connect_event = 'smartdrive_connect_event';
  public static smartdrive_disconnect_event = 'smartdrive_disconnect_event';
  public static smartdrive_service_discovered_event =
    'smartdrive_service_discovered_event';
  public static smartdrive_characteristic_discovered_event =
    'smartdrive_characteristic_discovered_event';
  public static smartdrive_ble_version_event = 'smartdrive_ble_version_event';
  public static smartdrive_mcu_version_event = 'smartdrive_mcu_version_event';
  public static smartdrive_distance_event = 'smartdrive_distance_event';
  public static smartdrive_motor_info_event = 'smartdrive_motor_info_event';
  public static smartdrive_error_event = 'smartdrive_error_event';
  // ota events
  public static smartdrive_ota_ready_event = 'smartdrive_ota_ready_event';
  public static smartdrive_ota_ready_ble_event =
    'smartdrive_ota_ready_ble_event';
  public static smartdrive_ota_ready_mcu_event =
    'smartdrive_ota_ready_mcu_event';
  public static smartdrive_ota_status_event =
    'smartdrive_ota_status_event';  // sends state, actions, progress
  public static smartdrive_ota_started_event =
    'smartdrive_ota_started_event';
  public static smartdrive_ota_canceled_event =
    'smartdrive_ota_canceled_event';
  public static smartdrive_ota_completed_event =
    'smartdrive_ota_completed_event';
  public static smartdrive_ota_failed_event =
    'smartdrive_ota_failed_event';

  // NON STATIC:
  public events: ISmartDriveEvents;

  // public members
  public driveDistance: number = 0; // cumulative total distance the smartDrive has driven
  public coastDistance: number = 0; // cumulative total distance the smartDrive has gone
  public settings = new SmartDrive.Settings();
  public switchControlSettings = new SmartDrive.SwitchControlSettings();

  // not serialized
  @Prop() device: any = null; // the actual bluetooth device associated with this smartdrive
  @Prop() rssi: number = null; // the received signal strength indicator (how close is it?)
  @Prop() otaState: SD_OTA_State = SD_OTA_State.not_started;
  @Prop() bleOTAProgress: number = 0;
  @Prop() mcuOTAProgress: number = 0;
  @Prop() notifying: boolean = false;
  @Prop() driving: boolean = false;

  // private members
  private doBLEUpdate: boolean = false;
  private doMCUUpdate: boolean = false;

  // functions
  constructor(btService: BluetoothService, obj?: any) {
    super(btService);
    if (obj !== null && obj !== undefined) {
      this.fromObject(obj);
    }
  }

  public toString(): string {
    return `${this.data()}`;
  }

  public data(): any {
    return {
      mcu_version: this.mcu_version,
      ble_version: this.ble_version,
      battery: this.battery,
      driveDistance: this.driveDistance,
      coastDistance: this.coastDistance,
      address: this.address
    };
  }

  public fromObject(obj: any): void {
    this.mcu_version = (obj && obj.mcu_version) || 0xff;
    this.ble_version = (obj && obj.ble_version) || 0xff;
    this.battery = (obj && obj.battery) || 0;
    this.driveDistance = (obj && obj.driveDistance) || 0;
    this.coastDistance = (obj && obj.coastDistance) || 0;
    this.address = (obj && obj.address) || '';
  }

  // regular methods

  hasVersionInfo(): boolean {
    return [this.ble_version, this.mcu_version].reduce((a, v) => {
      return a && v < 0xff && v > 0x00;
    }, true);
  }

  get mcu_version_string(): string {
    return SmartDrive.versionByteToString(this.mcu_version);
  }

  get ble_version_string(): string {
    return SmartDrive.versionByteToString(this.ble_version);
  }

  public isMcuUpToDate(version: string | number): boolean {
    const v =
      typeof version === 'number'
        ? version
        : SmartDrive.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.mcu_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  public isBleUpToDate(version: string | number): boolean {
    const v =
      typeof version === 'number'
        ? version
        : SmartDrive.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.ble_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  public isUpToDate(version: string | number): boolean {
    const v =
      typeof version === 'number'
        ? version
        : SmartDrive.versionStringToByte(version);
    if (v === 0xff) {
      return true;
    }
    const versions = [this.mcu_version, this.ble_version];
    return versions.reduce((a, e) => {
      return a && e !== 0xff && e >= v;
    }, true);
  }

  get otaProgress(): number {
    if (this.doBLEUpdate && this.doMCUUpdate) {
      return (this.mcuOTAProgress + this.bleOTAProgress) / 2;
    } else if (this.doBLEUpdate) {
      return this.bleOTAProgress;
    } else if (this.doMCUUpdate) {
      return this.mcuOTAProgress;
    } else {
      return 0;
    }
  }

  public otaProgressToString(): string {
    return `${this.otaProgress.toFixed(1)} %`;
  }

  public otaStateToString(): string {
    return this.otaState;
  }

  public onOTAActionTap(action: string) {
    console.log(`OTA Action: ${action}`);
    switch (action) {
      case 'ota.action.start':
        this.sendEvent(SmartDrive.ota_start_event);
        break;
      case 'ota.action.pause':
        this.sendEvent(SmartDrive.ota_pause_event);
        break;
      case 'ota.action.resume':
        this.sendEvent(SmartDrive.ota_resume_event);
        break;
      case 'ota.action.cancel':
        this.sendEvent(SmartDrive.ota_cancel_event);
        break;
      case 'ota.action.force':
        this.sendEvent(SmartDrive.ota_force_event);
        break;
      case 'ota.action.retry':
        this.sendEvent(SmartDrive.ota_retry_event);
        break;
      default:
        break;
    }
  }

  public cancelOTA() {
    this.sendEvent(SmartDrive.ota_cancel_event);
  }

  public performOTA(
    bleFirmware: any,
    mcuFirmware: any,
    bleFWVersion: number,
    mcuFWVersion: number,
    timeout: number,
    autoForce: boolean = false
  ): Promise<any> {
    // send start ota for MCU
    //   - wait for reconnection (try to reconnect)
    //   - keep sending periodically (check connection state)
    //   - stop sending once we get ota ready from mcu
    // send firmware data for MCU
    // send start ota for BLE
    //   - keep sending periodically (check connection state)
    //   - stop sending once we get ota ready from mcu
    // send firmware data for BLE
    // send '3' to ble control characteristic
    //   - wait for reconnection (try to reconnect)
    // send stop OTA to MCU
    //   - wait for reconnection (try to reconnect)
    // wait to get ble version
    // wait to get mcu version
    // check versions
    return new Promise((resolve, reject) => {
      if ((!bleFirmware && bleFWVersion) ||
        (!mcuFirmware && mcuFWVersion) ||
        (!mcuFWVersion && !bleFWVersion)) {
        const msg = `Bad version (${bleFWVersion}, ${mcuFWVersion}), or firmware (${bleFirmware}, ${mcuFirmware})!`;
        reject(msg);
      } else {
        // set up variables to keep track of the ota
        let otaIntervalID = null;

        let mcuVersion = 0xff;
        let bleVersion = 0xff;
        let haveMCUVersion = false;
        let haveBLEVersion = false;

        const canDoMCUUpdate = (mcuFWVersion && mcuFirmware && mcuFirmware.length > 0);
        const canDoBLEUpdate = (bleFWVersion && bleFirmware && bleFirmware.length > 0);
        this.doBLEUpdate = false;
        this.doMCUUpdate = false;

        let hasRebooted = false;
        let startedOTA = false;
        let cancelOTA = false;
        let paused = false;

        let index = 0; // tracking the pointer into the firmware
        const payloadSize = 16; // how many firmware bytes to send each time

        // timer ids
        let connectionIntervalID = null;
        let otaTimeoutID = null;
        const otaTimeout = timeout;
        const smartDriveConnectionInterval = 5000;

        // define our functions here
        const unregister = () => {
          // unregister for events
          this.off(SmartDrive.smartdrive_connect_event, connectHandler);
          this.off(SmartDrive.smartdrive_disconnect_event, disconnectHandler);
          this.off(SmartDrive.smartdrive_ble_version_event, bleVersionHandler);
          this.off(SmartDrive.smartdrive_mcu_version_event, mcuVersionHandler);
          this.off(SmartDrive.smartdrive_ota_ready_event, otaReadyHandler);
          this.off(
            SmartDrive.smartdrive_ota_ready_mcu_event,
            otaMCUReadyHandler
          );
          this.off(
            SmartDrive.smartdrive_ota_ready_ble_event,
            otaBLEReadyHandler
          );
          this.off(SmartDrive.ota_start_event, otaStartHandler);
          this.off(SmartDrive.ota_retry_event, otaRetryHandler);
          this.off(SmartDrive.ota_force_event, otaForceHandler);
          this.off(SmartDrive.ota_pause_event, otaPauseHandler);
          this.off(SmartDrive.ota_resume_event, otaResumeHandler);
          this.off(SmartDrive.ota_cancel_event, otaCancelHandler);
          this.off(SmartDrive.ota_timeout_event, otaTimeoutHandler);
        };
        const register = () => {
          unregister();
          // register for connection events
          this.on(SmartDrive.smartdrive_connect_event, connectHandler);
          this.on(SmartDrive.smartdrive_disconnect_event, disconnectHandler);
          this.on(SmartDrive.smartdrive_ble_version_event, bleVersionHandler);
          this.on(SmartDrive.smartdrive_mcu_version_event, mcuVersionHandler);
          this.on(
            SmartDrive.smartdrive_ota_ready_mcu_event,
            otaMCUReadyHandler
          );
          this.on(
            SmartDrive.smartdrive_ota_ready_ble_event,
            otaBLEReadyHandler
          );
          this.on(SmartDrive.smartdrive_ota_ready_event, otaReadyHandler);
          this.on(SmartDrive.ota_start_event, otaStartHandler);
          this.on(SmartDrive.ota_retry_event, otaRetryHandler);
          this.on(SmartDrive.ota_pause_event, otaPauseHandler);
          this.on(SmartDrive.ota_resume_event, otaResumeHandler);
          this.on(SmartDrive.ota_force_event, otaForceHandler);
          this.on(SmartDrive.ota_cancel_event, otaCancelHandler);
          this.on(SmartDrive.ota_timeout_event, otaTimeoutHandler);
        };
        const begin = () => {
          console.log(`Beginning OTA for SmartDrive: ${this.address}`);
          paused = false;
          cancelOTA = false;
          startedOTA = false;
          hasRebooted = false;

          mcuVersion = this.mcu_version;
          bleVersion = this.ble_version;
          haveMCUVersion = mcuVersion > 0x00 && mcuVersion < 0xff;
          haveBLEVersion = bleVersion > 0x00 && bleVersion < 0xff;

          this.doBLEUpdate = false;
          this.doMCUUpdate = false;

          index = 0;
          // set the action
          this.setOtaActions(['ota.action.start']);
          // now that we're starting the OTA, we are awaiting the versions
          this.otaState = SmartDrive.OTAState.not_started;

          register();
          // stop the timer
          if (otaIntervalID) {
            timer.clearInterval(otaIntervalID);
          }
          // now actually start the ota
          otaIntervalID = timer.setInterval(runOTA, 250);
        };
        const otaStartHandler = () => {
          // set the progresses
          this.bleOTAProgress = 0;
          this.mcuOTAProgress = 0;
          this.setOtaActions(['ota.action.cancel']);
          this.otaStartTime = new Date();
          // connect to the smartdrive
          if (!this.connected)
            this.connect();
          this.otaState = SmartDrive.OTAState.awaiting_versions;
          // start the timeout timer
          if (otaTimeoutID) {
            timer.clearTimeout(otaTimeoutID);
          }
          otaTimeoutID = timer.setTimeout(() => {
            this.sendEvent(SmartDrive.ota_timeout_event);
          }, otaTimeout);
        };
        const otaForceHandler = () => {
          startedOTA = true;
          this.doMCUUpdate = canDoMCUUpdate;
          this.doBLEUpdate = canDoBLEUpdate;
          this.otaState = SmartDrive.OTAState.awaiting_mcu_ready;
          this.setOtaActions(['ota.action.cancel']);
        };
        const otaPauseHandler = () => {
          this.setOtaActions(['ota.action.resume', 'ota.action.cancel']);
          paused = true;
        };
        const otaResumeHandler = () => {
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
          paused = false;
        };
        const otaCancelHandler = () => {
          this.otaState = SmartDrive.OTAState.canceling;
        };
        const otaTimeoutHandler = () => {
          startedOTA = false;
          stopOTA('updates.timeout', false, true);
          this.otaState = SmartDrive.OTAState.timeout;
        };
        const otaRetryHandler = () => {
          begin();
        };
        const connectHandler = () => {
          this.ableToSend = false;
          // clear out the connection interval
          timer.clearInterval(connectionIntervalID);
        };
        const disconnectHandler = () => {
          this.ableToSend = false;
          hasRebooted = true;
          if (connectionIntervalID) {
            timer.clearInterval(connectionIntervalID);
          }
          if (!cancelOTA) {
            // try to connect to it again
            connectionIntervalID = timer.setInterval(() => {
              console.log(`Disconnected - reconnecting to ${this.address}`);
              this.connect();
            }, smartDriveConnectionInterval);
          }
        };
        const bleVersionHandler = data => {
          bleVersion = data.data.ble;
          haveBLEVersion = true;
          if (autoForce || bleVersion < bleFWVersion) {
            this.doBLEUpdate = canDoBLEUpdate;
          }
        };
        const mcuVersionHandler = data => {
          mcuVersion = data.data.mcu;
          haveMCUVersion = true;
          if (autoForce || mcuVersion < mcuFWVersion) {
            this.doMCUUpdate = canDoMCUUpdate;
          }
        };
        const otaMCUReadyHandler = data => {
          startedOTA = true;
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
          console.log(`Got MCU OTAReady from ${this.address}`);
          this.otaState = SmartDrive.OTAState.updating_mcu;
        };
        const otaBLEReadyHandler = data => {
          startedOTA = true;
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
          console.log(`Got BLE OTAReady from ${this.address}`);
          this.otaState = SmartDrive.OTAState.updating_ble;
        };
        const otaReadyHandler = data => {
          startedOTA = true;
          this.setOtaActions(['ota.action.pause', 'ota.action.cancel']);
          console.log(`Got OTAReady from ${this.address}`);
          if (this.otaState === SmartDrive.OTAState.awaiting_mcu_ready) {
            console.log('CHANGING SD OTA STATE TO UPDATING MCU');
            this.otaState = SmartDrive.OTAState.updating_mcu;
          } else if (this.otaState === SmartDrive.OTAState.awaiting_ble_ready) {
            console.log('CHANGING SD OTA STATE TO UPDATING BLE');
            this.otaState = SmartDrive.OTAState.updating_ble;
          }
        };
        let writeFirmwareTimeoutID = null;
        const writeFirmwareSector = (
          device: string,
          fw: any,
          characteristic: any,
          nextState: any
        ) => {
          if (writeFirmwareTimeoutID) {
            timer.clearTimeout(writeFirmwareTimeoutID);
          }
          writeFirmwareTimeoutID = null;
          if (index < 0) {
            console.log(
              'writing firmware to ' + device + ' at ' + characteristic
            );
            index = 0;
          }
          const fileSize = fw.length;
          try {
            if (cancelOTA) {
              return;
            } else if (
              paused ||
              !this.connected ||
              !this.ableToSend ||
              !this.notifying
            ) {
              // console.log('NOT WRITING TO SD!');
              writeFirmwareTimeoutID = timer.setTimeout(() => {
                // console.log('trying now!');
                writeFirmwareSector(device, fw, characteristic, nextState);
              }, 500);
            } else if (index < fileSize) {
              // console.log(`Writing ${index} / ${fileSize} of ota to ${device}`);
              let data = null;
              if (device === 'SmartDrive') {
                const p = new Packet();
                p.makeOTAPacket(device, index, fw);
                data = p.toUint8Array();
                p.destroy();
              } else if (device === 'SmartDriveBluetooth') {
                const length = Math.min(fw.length - index, 16);
                data = Uint8Array.from(fw.subarray(index, index + length));
              } else {
                throw `ERROR: ${device} should be either 'SmartDrive' or 'SmartDriveBluetooth'`;
              }
              // TODO: add write timeout here in case of disconnect or other error
              this._bluetoothService
                .write({
                  peripheralUUID: this.address,
                  serviceUUID: SmartDrive.ServiceUUID,
                  characteristicUUID: characteristic,
                  value: data
                })
                .then(() => {
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    this.ableToSend = true;
                    index += payloadSize;
                    writeFirmwareSector(device, fw, characteristic, nextState);
                  }, 0);
                })
                .catch(err => {
                  console.log(`Could not send fw to ${device}: ${err}`);
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    console.log('Retrying');
                    writeFirmwareSector(device, fw, characteristic, nextState);
                  }, 500);
                });
            } else {
              // we are done with the sending change
              // state to the next state
              this.otaState = nextState;
            }
          } catch (err) {
            console.log(`WriteFirmwareSector error: ${err}`);
            writeFirmwareTimeoutID = timer.setTimeout(() => {
              writeFirmwareSector(device, fw, characteristic, nextState);
            }, 500);
          }
        };
        const stopOTA = (
          reason: string,
          success: boolean = false,
          doRetry: boolean = false
        ) => {
          startedOTA = false;
          cancelOTA = true;
          this.setOtaActions();
          // stop timers
          if (connectionIntervalID) {
            timer.clearInterval(connectionIntervalID);
          }
          if (otaIntervalID) {
            timer.clearInterval(otaIntervalID);
          }
          if (otaTimeoutID) {
            timer.clearInterval(otaTimeoutID);
          }
          // unregister from all events
          unregister();

          // if we are supposed to retry
          const retry = () => {
            cancelOTA = false;
            this.on(SmartDrive.ota_retry_event, otaRetryHandler);
            this.on(SmartDrive.ota_cancel_event, otaCancelHandler);
            this.setOtaActions(['ota.action.retry']);
            otaIntervalID = timer.setInterval(runOTA, 250);
          };

          const finish = () => {
            if (success) {
              resolve(reason);
            } else if (doRetry) {
              retry();
            } else {
              resolve(reason);
            }
          };
          // send a state update
          this.sendEvent(SmartDrive.smartdrive_ota_status_event, {
            progress: this.otaProgress,
            actions: this.otaActions.slice(),
            state: this.otaState
          });
          return this.disconnect()
            .then(finish)
            .catch(finish);
        };
        const runOTA = () => {
          // send a state update
          this.sendEvent(SmartDrive.smartdrive_ota_status_event, {
            progress: this.otaProgress,
            actions: this.otaActions.slice(),
            state: this.otaState
          });
          switch (this.otaState) {
            case SmartDrive.OTAState.not_started:
              this.setOtaActions(['ota.action.start']);
              break;
            case SmartDrive.OTAState.awaiting_versions:
              if (haveBLEVersion && haveMCUVersion) {
                if (
                  !autoForce &&
                  bleVersion >= bleFWVersion &&
                  mcuVersion >= mcuFWVersion
                ) {
                  this.setOtaActions(['ota.action.force', 'ota.action.cancel']);
                } else {
                  this.otaState = SmartDrive.OTAState.awaiting_mcu_ready;
                }
              } else if (haveMCUVersion && !haveBLEVersion) {
                this.otaState = SmartDrive.OTAState.comm_failure;
                timer.setTimeout(() => {
                  stopOTA('updates.communications-failed', false, false);
                }, 2500);
              }
              break;
            case SmartDrive.OTAState.awaiting_mcu_ready:
              startedOTA = true;
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.setOtaActions(['ota.action.cancel']);
              // make sure the index is set to -1 to start next OTA
              index = -1;
              if (this.connected && this.ableToSend) {
                // send start OTA
                this.sendPacket(
                  'Command',
                  'StartOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'SmartDrive'
                ).catch(err => { });
              }
              break;
            case SmartDrive.OTAState.updating_mcu:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              // now that we've successfully gotten the
              // SD connected - don't timeout
              if (otaTimeoutID) {
                timer.clearTimeout(otaTimeoutID);
              }

              // what state do we go to next?
              const nextState = this.doBLEUpdate
                ? SmartDrive.OTAState.awaiting_ble_ready
                : this.doMCUUpdate
                  ? SmartDrive.OTAState.rebooting_mcu
                  : SmartDrive.OTAState.complete;

              if (this.doMCUUpdate) {
                // we need to reboot after the OTA
                hasRebooted = false;
                // make sure we clear out the version info that we get
                haveMCUVersion = false;
                // now send data to SD MCU - probably want
                // to send all the data here and cancel
                // the interval for now? - shouldn't need
                // to
                if (index === -1) {
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    writeFirmwareSector(
                      'SmartDrive',
                      mcuFirmware,
                      SmartDrive.ControlCharacteristic.toUpperCase(),
                      nextState
                    );
                  }, 0);
                }
              } else {
                // go to next state
                this.otaState = nextState;
              }
              // update the progress bar
              this.mcuOTAProgress = ((index + 16) * 100) / mcuFirmware.length;
              break;
            case SmartDrive.OTAState.awaiting_ble_ready:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.setOtaActions(['ota.action.cancel']);
              // make sure the index is set to -1 to start next OTA
              index = -1;
              // now send StartOTA to BLE
              if (this.connected && this.ableToSend) {
                // send start OTA
                console.log(`Sending StartOTA::BLE to ${this.address}`);
                const data = Uint8Array.from([0x06]); // this is the start command
                this._bluetoothService
                  .write({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
                    characteristicUUID: SmartDrive.BLEOTAControlCharacteristic.toUpperCase(),
                    value: data
                  })
                  .then(() => {
                    this.ableToSend = true;
                  })
                  .catch(err => { });
              }
              break;
            case SmartDrive.OTAState.updating_ble:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              // now that we've successfully gotten the
              // SD connected - don't timeout
              if (otaTimeoutID) {
                timer.clearTimeout(otaTimeoutID);
              }
              if (this.doBLEUpdate) {
                // we need to reboot after the OTA
                hasRebooted = false;
                // make sure we clear out the version info that we get
                haveBLEVersion = false;
                // now send data to SD BLE
                if (index === -1) {
                  writeFirmwareTimeoutID = timer.setTimeout(() => {
                    writeFirmwareSector(
                      'SmartDriveBluetooth',
                      bleFirmware,
                      SmartDrive.BLEOTADataCharacteristic.toUpperCase(),
                      SmartDrive.OTAState.rebooting_ble
                    );
                  }, 0);
                }
              } else {
                this.otaState = this.doMCUUpdate
                  ? SmartDrive.OTAState.rebooting_mcu
                  : SmartDrive.OTAState.complete;
              }
              // update the progress bar
              this.bleOTAProgress = ((index + 16) * 100) / bleFirmware.length;
              break;
            case SmartDrive.OTAState.rebooting_ble:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.setOtaActions();
              // if we have gotten the version, it has
              // rebooted so now we should reboot the
              // MCU
              if (haveBLEVersion) {
                this.otaState = SmartDrive.OTAState.rebooting_mcu;
                hasRebooted = false;
              } else if (this.connected && !hasRebooted) {
                // send BLE stop ota command
                console.log(`Sending StopOTA::BLE to ${this.address}`);
                const data = Uint8Array.from([0x03]); // this is the stop command
                this._bluetoothService
                  .write({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
                    characteristicUUID: SmartDrive.BLEOTAControlCharacteristic.toUpperCase(),
                    value: data
                  })
                  .then(() => {
                    this.ableToSend = true;
                  })
                  .catch(err => { });
              }
              break;
            case SmartDrive.OTAState.rebooting_mcu:
              if (!paused) {
                this.otaCurrentTime = new Date();
              }
              this.setOtaActions();
              // if we have gotten the version, it has
              // rebooted so now we should reboot the
              // MCU
              if (haveMCUVersion) {
                this.otaState = SmartDrive.OTAState.verifying_update;
                hasRebooted = false;
              } else if (this.connected && !hasRebooted) {
                // send MCU stop ota command
                // send stop OTA
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'SmartDrive'
                ).catch(() => { });
              }
              break;
            case SmartDrive.OTAState.verifying_update:
              this.setOtaActions();
              // check the versions here and notify the
              // user of the success / failure of each
              // of t he updates!
              // - probably add buttons so they can retry?
              this.otaEndTime = new Date();
              let msg = '';
              if (mcuVersion === mcuFWVersion && bleVersion === bleFWVersion) {
                msg = `SmartDrive OTA Succeeded! ${mcuVersion.toString(
                  16
                )}, ${bleVersion.toString(16)}`;
                console.log(msg);
                this.otaState = SmartDrive.OTAState.complete;
              } else {
                msg = `SmartDrive OTA FAILED! ${mcuVersion.toString(
                  16
                )}, ${bleVersion.toString(16)}`;
                console.log(msg);
                this.otaState = SmartDrive.OTAState.failed;
                stopOTA('updates.failed', false, true);
              }
              break;
            case SmartDrive.OTAState.complete:
              stopOTA('updates.success', true);
              break;
            case SmartDrive.OTAState.canceling:
              cancelOTA = true;
              this.setOtaActions();
              this.mcuOTAProgress = 0;
              this.bleOTAProgress = 0;
              if (!startedOTA) {
                this.otaState = SmartDrive.OTAState.canceled;
              } else if (this.connected && this.ableToSend) {
                // send stop OTA command
                this.sendPacket(
                  'Command',
                  'StopOTA',
                  'OTADevice',
                  'PacketOTAType',
                  'SmartDrive'
                )
                  .then(() => {
                    // now set state to cancelled
                    this.otaState = SmartDrive.OTAState.canceled;
                  })
                  .catch(err => {
                    console.log(`Could not cancel ota, retrying: ${err}`);
                  });
              } else {
                // now set state to cancelled
                this.otaState = SmartDrive.OTAState.canceled;
              }
              break;
            case SmartDrive.OTAState.canceled:
              stopOTA('updates.canceled', false);
              break;
            case SmartDrive.OTAState.failed:
              break;
            case SmartDrive.OTAState.comm_failure:
              break;
            case SmartDrive.OTAState.timeout:
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

  // TODO: abstract sendPacket to the DeviceBase class
  public sendSettings(
    mode: string,
    units: string,
    flags: number,
    tap_sensitivity: number,
    acceleration: number,
    max_speed: number
  ): Promise<any> {
    const settings = super.sendSettings(
      mode,
      units,
      flags,
      tap_sensitivity,
      acceleration,
      max_speed
    );
    return this.sendPacket(
      'Command',
      'SetSettings',
      'settings',
      null,
      settings
    );
  }

  public sendSettingsObject(settings: SmartDrive.Settings): Promise<any> {
    const flags = [
      settings.ezOn,
      settings.disablePowerAssistBeep
    ].reduce((f, s, i) => {
      if (s) {
        f |= (1 << i);
      }
      return f;
    }, 0);
    const _settings = super.sendSettings(
      settings.controlMode,
      settings.units,
      flags,
      settings.tapSensitivity / 100.0,
      settings.acceleration / 100.0,
      settings.maxSpeed / 100.0
    );
    return this.sendPacket(
      'Command',
      'SetSettings',
      'settings',
      null,
      _settings
    );
  }

  public sendSwitchControlSettings(mode: string, max_speed: number): Promise<any> {
    const switchControlSettings = super.sendSwitchControlSettings(mode, max_speed);
    return this.sendPacket(
      'Command',
      'SetSwitchControlSettings',
      'switchControlSettings',
      null,
      switchControlSettings
    );
  }

  public sendSwitchControlSettingsObject(
    settings: SmartDrive.SwitchControlSettings
  ): Promise<any> {
    const _switchControlSettings = super.sendSwitchControlSettings(
      settings.mode,
      settings.maxSpeed / 100.0
    );
    return this.sendPacket(
      'Command',
      'SetSwitchControlSettings',
      'switchControlSettings',
      null,
      _switchControlSettings
    );
  }

  public sendPacket(
    Type: string,
    SubType: string,
    dataKey?: string,
    dataType?: string,
    data?: any
  ): Promise<any> {
    if (this.ableToSend) {
      console.log(`Sending ${Type}::${SubType}::${data} to ${this.address}`);
      const p = new Packet();
      p.Type(Type);
      p.SubType(SubType);
      // if dataType is non-null and not '', then we need to transform the data
      let boundData = data;
      if (dataType && dataType.length) {
        boundData = Packet.makeBoundData(dataType, data);
      }
      p.data(dataKey, boundData);
      const transmitData = p.toUint8Array();
      // console.log('sending:', p.toString());
      p.destroy();

      return this._bluetoothService.write({
        peripheralUUID: this.address,
        serviceUUID: SmartDrive.ServiceUUID,
        characteristicUUID: SmartDrive.ControlCharacteristic.toUpperCase(),
        value: transmitData
      });
    } else {
      return Promise.reject('Smartdrive is unable to send');
    }
  }

  public sendTap() {
    return this.sendPacket('Command', 'Tap');
  }

  public stopMotor() {
    return this.sendPacket('Command', 'TurnOffMotor');
  }

  // handlers

  private stoppingNotify = false;
  private stopNotifyCharacteristics(
    characteristics: Array<string>
  ): Promise<any> {
    if (this.stoppingNotify)
      return Promise.resolve('Already stopping notifying!');
    else this.stoppingNotify = true;
    // console.log(`StopNotifying`);
    const retry = (maxRetries, fn) => {
      return fn().catch(err => {
        if (maxRetries <= 0) {
          throw err;
        } else {
          console.log(`RETRYING: ${err}, ${maxRetries}`);
          return retry(maxRetries - 1, fn);
        }
      });
    };
    const retries = 3;
    return characteristics
      .reduce((p, characteristic) => {
        return p.then(() => {
          return retry(retries, () => {
            return new Promise((resolve, reject) => {
              timer.setTimeout(() => {
                // console.log(`Stop Notifying ${characteristic}`);
                this._bluetoothService
                  .stopNotifying({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
                    characteristicUUID: characteristic.toUpperCase(),
                    onNotify: this.handleNotify.bind(this)
                  })
                  .then(() => {
                    resolve();
                  })
                  .catch(err => {
                    // if we failed we probably stopped anyway
                    resolve(err);
                  });
              }, 250);
            });
          });
        });
      }, Promise.resolve())
      .then(() => {
        this.stoppingNotify = false;
      });
  }

  private startingNotify = false;
  private startNotifyCharacteristics(
    characteristics: Array<string>
  ): Promise<any> {
    if (this.startingNotify)
      return Promise.reject('Already started notifying!');
    else this.startingNotify = true;
    // console.log(`StartNotifying`);
    const retry = (maxRetries, fn) => {
      return fn().catch(err => {
        if (err.includes('peripheral is disconnected')) {
          // can't notify a disconnected peripheral
          throw err;
        } else {
          if (maxRetries <= 0) {
            throw err;
          } else {
            console.log(`RETRYING: ${err}, ${maxRetries}`);
            return retry(maxRetries - 1, fn);
          }
        }
      });
    };
    return characteristics
      .reduce((p, characteristic) => {
        return p.then(() => {
          return retry(3, () => {
            return new Promise((resolve, reject) => {
              timer.setTimeout(() => {
                // console.log(`Start Notifying ${characteristic}`);
                this._bluetoothService
                  .startNotifying({
                    peripheralUUID: this.address,
                    serviceUUID: SmartDrive.ServiceUUID,
                    characteristicUUID: characteristic.toUpperCase(),
                    onNotify: this.handleNotify.bind(this)
                  })
                  .then(() => {
                    resolve();
                  })
                  .catch(err => {
                    reject(err);
                  });
              }, 250);
            });
          });
        });
      }, Promise.resolve())
      .then(() => {
        this.startingNotify = false;
      })
      .catch(() => {
        this.startingNotify = false;
      });
  }

  public connect() {
    return this._bluetoothService.connect(
      this.address,
      this.handleConnect.bind(this),
      this.handleDisconnect.bind(this)
    );
  }

  public disconnect() {
    const promises = [];
    if (this.connected && this.ableToSend && this.notifying) {
      // TODO: THIS IS A HACK TO FORCE THE BLE CHIP TO REBOOT AND CLOSE THE CONNECTION
      const data = Uint8Array.from([0x03]); // this is the OTA stop command
      const writePromise = this._bluetoothService
        .write({
          peripheralUUID: this.address,
          serviceUUID: SmartDrive.ServiceUUID,
          characteristicUUID: SmartDrive.BLEOTAControlCharacteristic.toUpperCase(),
          value: data
        });
      promises.push(writePromise);
    }
    return Promise.all(promises)
      .then(() => {
        return this._bluetoothService.disconnect({
          UUID: this.address
        });
      })
      .catch(err => {
        console.log('DISCONNECT ERR:', err);
        this.handleDisconnect();
      });
  }

  public requestHighPriorityConnection(): boolean {
    let requestSucceeded = false;
    if (this.device) {
      try {
        // register for HIGH_PRIORITY connection
        requestSucceeded = this.device.requestConnectionPriority(
          android.bluetooth.BluetoothGatt.CONNECTION_PRIORITY_HIGH
        );
      } catch (err) {
        console.error('could not request high priority connection', err);
      }
    }
    return requestSucceeded;
  }

  public releaseHighPriorityConnection(): boolean {
    let requestSucceeded = false;
    if (this.device) {
      try {
        // register for HIGH_PRIORITY connection
        requestSucceeded = this.device.requestConnectionPriority(
          android.bluetooth.BluetoothGatt.CONNECTION_PRIORITY_BALANCED
        );
      } catch (err) {
        console.error('could not request balanced connection', err);
      }
    }
    return requestSucceeded;
  }

  public handleConnect(data?: any) {
    // update state
    this.connected = true;
    this.notifying = false;
    this.ableToSend = false;
    // now that we're connected, subscribe to the characteristics
    this.startNotifyCharacteristics(SmartDrive.Characteristics)
      .then(() => {
        this.sendEvent(SmartDrive.smartdrive_connect_event);
      })
      .catch(err => { });
  }

  public handleDisconnect() {
    // update state
    this.notifying = false;
    this.connected = false;
    this.ableToSend = false;
    // now that we're disconnected - make sure we unsubscribe to the characteristics
    this.stopNotifyCharacteristics(SmartDrive.Characteristics).then(() => {
      this.sendEvent(SmartDrive.smartdrive_disconnect_event);
    });
  }

  public handleNotify(args: any) {
    // Notify is called when the SmartDrive sends us data, args.value is the data
    // now that we're receiving data we can definitly send data
    if (!this.notifying || !this.ableToSend) {
      // request high priority connection on first data received
      this.requestHighPriorityConnection();
    }
    // update state
    this.notifying = true;
    this.ableToSend = true;
    this.connected = true;
    // handle the packet here
    const value = args.value;
    const uArray = new Uint8Array(value);
    const p = new Packet();
    p.initialize(uArray);
    // console.log(`${p.Type()}::${p.SubType()} ${p.toString()}`);
    this.handlePacket(p);
    p.destroy();
  }

  public handlePacket(p: Packet) {
    const packetType = p.Type();
    const subType = p.SubType();
    if (!packetType || !subType) {
      return;
    } else if (packetType === 'Data') {
      switch (subType) {
        case 'DeviceInfo':
          this._handleDeviceInfo(p);
          break;
        case 'MotorInfo':
          this._handleMotorInfo(p);
          break;
        case 'MotorDistance':
          this._handleDistanceInfo(p);
          break;
        default:
          break;
      }
    } else if (packetType === 'Command') {
      switch (subType) {
        case 'OTAReady':
          this._handleOTAReady(p);
          break;
        default:
          break;
      }
    } else if (packetType === 'Error') {
      this._handleError(p);
    }
  }

  public getBleDisconnectError() {
    /*
	  const boundError = Packet.makeBoundData('PacketErrorType', 'BLEDisconnect');
	  return bindingTypeToString('PacketErrorType', boundError);
	  */
    return 'BLEDisconnect';
  }

  // private functions
  private _handleError(p: Packet) {
    // This is sent by the smartdrive whenever it encounters an error
    const errorType = p.SubType();
    const errorId = p.data('errorId');
    this.sendEvent(SmartDrive.smartdrive_error_event, {
      errorType: errorType,
      errorId: errorId
    });
  }

  private _handleDeviceInfo(p: Packet) {
    // This is sent by the SmartDrive Bluetooth Chip when it
    // connects
    const devInfo = p.data('deviceInfo');
    // so they get updated
    /* Device Info
           struct {
           Device     device;     // Which Device is this about?
           uint8_t    version;    // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           }            deviceInfo;
        */
    this.ble_version = devInfo.version;
    this.sendEvent(SmartDrive.smartdrive_ble_version_event, {
      ble: this.ble_version
    });
  }

  private _handleMotorInfo(p: Packet) {
    // This is sent by the SmartDrive microcontroller every 200ms
    // (5 hz) while connected
    const motorInfo = p.data('motorInfo');
    /* Motor Info
           struct {
           Motor::State state;
           uint8_t      batteryLevel; // [0,100] integer percent.
           uint8_t      version;      // Major.Minor version as the MAJOR and MINOR nibbles of the byte.
           uint8_t      padding;
           float        distance;
           float        speed;
           float        driveTime;
           }            motorInfo;
        */
    this.mcu_version = motorInfo.version;
    this.battery = motorInfo.batteryLevel;
    const motorOnState = Packet.makeBoundData('MotorState', 'On');
    this.driving = motorInfo.state === motorOnState;
    // send events to subscribers
    this.sendEvent(SmartDrive.smartdrive_mcu_version_event, {
      mcu: this.mcu_version
    });
    this.sendEvent(SmartDrive.smartdrive_motor_info_event, {
      motorInfo: motorInfo
    });
  }

  private _handleDistanceInfo(p: Packet) {
    // This is sent by the SmartDrive microcontroller every 1000
    // ms (1 hz) while connected and the motor is off
    const motorTicks = p.data('motorDistance');
    const caseTicks = p.data('caseDistance');
    const motorMiles = SmartDrive.motorTicksToMiles(motorTicks);
    const caseMiles = SmartDrive.caseTicksToMiles(caseTicks);
    /* Distance Info
           struct {
           uint64_t   motorDistance;  // Cumulative Drive distance in ticks.
           uint64_t   caseDistance;   // Cumulative Case distance in ticks.
           }            distanceInfo;
        */
    this.driveDistance = motorTicks;
    this.coastDistance = caseTicks;
    /*
		  console.log(`Got distance info: ${motorTicks}, ${caseTicks}`);
		  console.log(`                 : ${motorMiles}, ${caseMiles}`);
		*/
    this.sendEvent(SmartDrive.smartdrive_distance_event, {
      driveDistance: motorTicks,
      coastDistance: caseTicks
    });
  }

  private _handleOTAReady(p: Packet) {
    // this is sent by both the MCU and the BLE chip in response
    // to a Command::StartOTA
    const otaDevice = bindingTypeToString('PacketOTAType', p.data('OTADevice'));
    switch (otaDevice) {
      case 'SmartDrive':
        this.sendEvent(SmartDrive.smartdrive_ota_ready_mcu_event);
        break;
      case 'SmartDriveBluetooth':
        this.sendEvent(SmartDrive.smartdrive_ota_ready_ble_event);
        break;
      default:
        this.sendEvent(SmartDrive.smartdrive_ota_ready_event);
        break;
    }
  }
}

export namespace SmartDrive {
  // Standard SmartDrive Settings:
  export class Settings extends Observable {
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
        return SmartDrive.Settings.ControlMode[o];
      }
    };

    static Units = class {
      static Options: string[] = ['English', 'Metric'];
      static Translations: string[] = [
        'smartdrive.settings.units.english',
        'smartdrive.settings.units.metric'
      ];

      static English = 'English';
      static Metric = 'Metric';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('Units', s.Units);
        return SmartDrive.Settings.Units[o];
      }
    };

    public static Defaults = {
      controlMode: Settings.ControlMode.MX2plus,
      ezOn: false,
      disablePowerAssistBeep: false,
      units: Settings.Units.English,
      acceleration: 30,
      maxSpeed: 70,
      tapSensitivity: 100,
    };

    // public members
    controlMode: string = SmartDrive.Settings.Defaults.controlMode;
    ezOn = SmartDrive.Settings.Defaults.ezOn;
    disablePowerAssistBeep = SmartDrive.Settings.Defaults.disablePowerAssistBeep;
    units: string = SmartDrive.Settings.Defaults.units;
    acceleration = SmartDrive.Settings.Defaults.acceleration;
    maxSpeed = SmartDrive.Settings.Defaults.maxSpeed;
    tapSensitivity = SmartDrive.Settings.Defaults.tapSensitivity;

    constructor() {
      super();
    }

    static getBoolSetting(flags: number, settingBit: number): boolean {
      return ((flags >> settingBit) & 0x01) > 0;
    }

    increase(key: string, increment: number = 10): void {
      let index = 0;
      switch (key) {
        case 'maxspeed':
        case 'Max Speed':
        case 'max-speed':
          this.maxSpeed = Math.min(this.maxSpeed + increment, 100);
          break;
        case 'acceleration':
        case 'Acceleration':
          this.acceleration = Math.min(this.acceleration + increment, 100);
          break;
        case 'tapsensitivity':
        case 'tap-sensitivity':
        case 'Tap Sensitivity':
          this.tapSensitivity = Math.min(this.tapSensitivity + increment, 100);
          break;
        case 'powerassistbuzzer':
        case 'power-assist-buzzer':
        case 'Power Assist Buzzer':
          this.disablePowerAssistBeep = !this.disablePowerAssistBeep;
          break;
        case 'controlmode':
        case 'control-mode':
        case 'Control Mode':
          index = SmartDrive.Settings.ControlMode.Options.indexOf(
            this.controlMode
          );
          index = mod(
            index + 1,
            SmartDrive.Settings.ControlMode.Options.length
          );
          this.controlMode = SmartDrive.Settings.ControlMode.Options[index];
          break;
        case 'units':
        case 'Units':
          index = SmartDrive.Settings.Units.Options.indexOf(this.units);
          index = mod(index + 1, SmartDrive.Settings.Units.Options.length);
          this.units = SmartDrive.Settings.Units.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 10): void {
      let index = 0;
      switch (key) {
        case 'maxspeed':
        case 'Max Speed':
        case 'max-speed':
          this.maxSpeed = Math.max(this.maxSpeed - increment, 10);
          break;
        case 'acceleration':
        case 'Acceleration':
          this.acceleration = Math.max(this.acceleration - increment, 10);
          break;
        case 'tapsensitivity':
        case 'tap-sensitivity':
        case 'Tap Sensitivity':
          this.tapSensitivity = Math.max(this.tapSensitivity - increment, 10);
          break;
        case 'powerassistbuzzer':
        case 'power-assist-buzzer':
        case 'Power Assist Buzzer':
          this.disablePowerAssistBeep = !this.disablePowerAssistBeep;
          break;
        case 'controlmode':
        case 'control-mode':
        case 'Control Mode':
          index = SmartDrive.Settings.ControlMode.Options.indexOf(
            this.controlMode
          );
          index = mod(
            index - 1,
            SmartDrive.Settings.ControlMode.Options.length
          );
          this.controlMode = SmartDrive.Settings.ControlMode.Options[index];
          break;
        case 'units':
        case 'Units':
          index = SmartDrive.Settings.Units.Options.indexOf(this.units);
          index = mod(index - 1, SmartDrive.Settings.Units.Options.length);
          this.units = SmartDrive.Settings.Units.Options[index];
          break;
      }
    }

    toObj(): any {
      return Object.keys(SmartDrive.Settings.Defaults)
        .reduce((obj, key) => {
          obj[key] = this[key];
          return obj;
        }, {});
    }

    fromSettings(s: any): void {
      // from c++ settings bound array to c++ class
      this.controlMode = SmartDrive.Settings.ControlMode.fromSettings(s);
      this.units = SmartDrive.Settings.Units.fromSettings(s);
      this.ezOn = SmartDrive.Settings.getBoolSetting(s.Flags, 0);
      this.disablePowerAssistBeep = SmartDrive.Settings.getBoolSetting(s.Flags, 1);
      // these floats are [0,1] on pushtracker
      this.acceleration = Math.round(s.Acceleration * 100.0);
      this.maxSpeed = Math.round(s.MaxSpeed * 100.0);
      this.tapSensitivity = Math.round(s.TapSensitivity * 100.0);
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
        this[key] = other[key];
      } else if (key in SmartDrive.Settings.Defaults) {
        this[key] = SmartDrive.Settings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a settings class exactly like this
      Object.keys(SmartDrive.Settings.Defaults)
        .map(k => this.copyKey(k, s));
    }

    diff(s: any): boolean {
      return Object.keys(SmartDrive.Settings.Defaults)
        .reduce((equal, key) => {
          return equal && this[key] === s[key];
        }, true);
    }
  }

  // SmartDrive Switch Control Settings:
  export class SwitchControlSettings extends Observable {
    // settings classes
    static Mode = class {
      static Options: string[] = ['Momentary', 'Latching'];

      static Momentary = 'Momentary';
      static Latching = 'Latching';

      static fromSettings(s: any): string {
        const o = bindingTypeToString('SwitchControlMode', s.mode);
        return SmartDrive.SwitchControlSettings.Mode[o];
      }
    };

    public static Defaults = {
      mode: SwitchControlSettings.Mode.Momentary,
      maxSpeed: 30
    };

    // public members
    mode: string = SmartDrive.SwitchControlSettings.Defaults.mode;
    maxSpeed = SmartDrive.SwitchControlSettings.Defaults.maxSpeed;

    constructor() {
      super();
    }

    increase(key: string, increment: number = 10): void {
      let index;
      switch (key) {
        case 'switchcontrolspeed':
        case 'switch-control-speed':
        case 'Switch Control Speed':
          this.maxSpeed = Math.min(this.maxSpeed + increment, 100);
          break;
        case 'switchcontrolmode':
        case 'switch-control-mode':
        case 'Switch Control Mode':
          index = SmartDrive.SwitchControlSettings.Mode.Options.indexOf(
            this.mode
          );
          index = mod(
            index + 1,
            SmartDrive.SwitchControlSettings.Mode.Options.length
          );
          this.mode =
            SmartDrive.SwitchControlSettings.Mode.Options[index];
          break;
      }
    }

    decrease(key: string, increment: number = 10): void {
      let index;
      switch (key) {
        case 'switchcontrolspeed':
        case 'switch-control-speed':
        case 'Switch Control Speed':
          this.maxSpeed = Math.max(this.maxSpeed - increment, 10);
          break;
        case 'switchcontrolmode':
        case 'switch-control-mode':
        case 'Switch Control Mode':
          index = SmartDrive.SwitchControlSettings.Mode.Options.indexOf(
            this.mode
          );
          index = mod(
            index - 1,
            SmartDrive.SwitchControlSettings.Mode.Options.length
          );
          this.mode =
            SmartDrive.SwitchControlSettings.Mode.Options[index];
          break;
      }
    }

    toObj(): any {
      return Object.keys(SmartDrive.SwitchControlSettings.Defaults)
        .reduce((obj, key) => {
          obj[key] = this[key];
          return obj;
        }, {});
    }

    fromSettings(s: any): void {
      // from c++ settings bound array to c++ class
      this.mode = SmartDrive.SwitchControlSettings.Mode.fromSettings(
        s
      );
      // these floats are [0,1] on smartdrive
      this.maxSpeed = Math.round(s.MaxSpeed * 100.0);
    }

    copyKey(key: string, other: any) {
      if (other && key in other) {
        this[key] = other[key];
      } else if (key in SmartDrive.SwitchControlSettings.Defaults) {
        this[key] = SmartDrive.SwitchControlSettings.Defaults[key];
      }
    }

    copy(s: any) {
      // from a SwitchControlSettings class exactly like this
      Object.keys(SmartDrive.SwitchControlSettings.Defaults)
        .map(k => this.copyKey(k, s));
    }

    diff(s: any): boolean {
      return Object.keys(SmartDrive.SwitchControlSettings.Defaults)
        .reduce((equal, key) => {
          return equal && this[key] === s[key];
        }, true);
    }
  }
}
