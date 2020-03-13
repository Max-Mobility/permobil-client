import { File, Http, knownFolders, path } from '@nativescript/core';
import { device } from '@nativescript/core/platform';
import { eachDay, format, subDays } from 'date-fns';

export namespace SmartDriveData {
  export namespace Info {
    export const RECORD_LENGTH_MS = 30 * 60 * 1000; // 30 minutes

    export const TableName = 'SmartDriveInfo';
    export const IdName = 'id';
    export const DateName = 'date';
    export const StartTimeName = 'start_time';
    export const BatteryName = 'battery';
    export const DriveDistanceName = 'distance_smartdrive_drive';
    export const CoastDistanceName = 'distance_smartdrive_coast';
    export const DriveDistanceStartName = 'distance_smartdrive_drive_start';
    export const CoastDistanceStartName = 'distance_smartdrive_coast_start';
    export const RecordsName = 'records';
    export const UuidName = 'uuid';
    export const HasBeenSentName = 'has_been_sent';
    export const Fields = [
      { name: DateName, type: 'TEXT' },
      { name: StartTimeName, type: 'bigint' },
      { name: BatteryName, type: 'smallint' },
      { name: DriveDistanceName, type: 'bigint' },
      { name: CoastDistanceName, type: 'bigint' },
      { name: DriveDistanceStartName, type: 'bigint' },
      { name: CoastDistanceStartName, type: 'bigint' },
      { name: RecordsName, type: 'TEXT' },
      { name: UuidName, type: 'TEXT' },
      { name: HasBeenSentName, type: 'bit' }
    ];

    export function getDateValue(date?: any) {
      if (date !== undefined) {
        return format(new Date(date), 'YYYY/MM/DD');
      } else {
        return format(new Date(), 'YYYY/MM/DD');
      }
    }

    export function getHalfHourDate() {
      const d = new Date();
      const m = d.getMinutes() > 30 ? 30 : 0;
      d.setMinutes(m);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d;
    }

    export function getDateStartTime(date?: any) {
      let d = new Date();
      if (date !== undefined) {
        d = new Date(date);
      }
      d.setHours(0);
      d.setMinutes(0);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d.getTime();
    }

    export function getPastDates(numDates: number) {
      const now = new Date();
      return eachDay(subDays(now, numDates), now);
    }

    export function makeRecord(
      battery: number = 0,
      coast: number = 0,
      drive: number = 0
    ) {
      const timestamp = SmartDriveData.Info.getHalfHourDate().getTime();
      return {
        [SmartDriveData.Info.BatteryName]: battery,
        [SmartDriveData.Info.CoastDistanceName]: coast,
        [SmartDriveData.Info.DriveDistanceName]: drive,
        [SmartDriveData.Info.StartTimeName]: timestamp
      };
    }

    // update the records, potentially creating a new record if none
    // exist with an appropriate start time
    export function updateRecords(
      updates: {
        driveDistance?: number;
        coastDistance?: number;
        battery?: number;
      },
      records: any[]
    ) {
      const driveDistance = updates.driveDistance || 0;
      const coastDistance = updates.coastDistance || 0;
      const battery = updates.battery || 0;
      if (driveDistance === 0 && coastDistance === 0 && battery === 0) {
        return;
      }
      // get the current timestamp
      const timeMs = new Date().getTime();
      // get most recent record
      if (records && records.length) {
        // determine if we need a new record
        const record = records[records.length - 1];
        const timeDiffMs = timeMs - record[SmartDriveData.Info.StartTimeName];
        if (timeDiffMs > SmartDriveData.Info.RECORD_LENGTH_MS) {
          // we need a new record
          const record = SmartDriveData.Info.makeRecord(
            battery,
            coastDistance,
            driveDistance
          );
          // now append it
          records.push(record);
        } else {
          // can just update this record
          record[SmartDriveData.Info.BatteryName] += battery;
          record[SmartDriveData.Info.CoastDistanceName] =
            coastDistance || record[SmartDriveData.Info.CoastDistanceName];
          record[SmartDriveData.Info.DriveDistanceName] =
            driveDistance || record[SmartDriveData.Info.DriveDistanceName];
        }
      } else {
        // we have no records, make a new one
        const record = SmartDriveData.Info.makeRecord(
          battery,
          coastDistance,
          driveDistance
        );
        // and append it
        records.push(record);
      }
    }

    // update the info object and return the diff (for inserting into
    // db. return null if no updates were performed.
    export function updateInfo(
      updates: {
        driveDistance?: number;
        coastDistance?: number;
        battery?: number;
      },
      info: any
    ) {
      const driveDistance = updates.driveDistance || 0;
      const coastDistance = updates.coastDistance || 0;
      const battery = updates.battery || 0;
      if (driveDistance === 0 && coastDistance === 0 && battery === 0) {
        return null;
      }
      // compute updates
      const updatedBattery = battery + info[SmartDriveData.Info.BatteryName];
      const updatedDriveDistance =
        driveDistance || info[SmartDriveData.Info.DriveDistanceName];
      const updatedCoastDistance =
        coastDistance || info[SmartDriveData.Info.CoastDistanceName];
      let recordString = info[SmartDriveData.Info.RecordsName];
      // convert into an array of objects
      let updatedRecords = [];
      try {
        updatedRecords = JSON.parse(recordString);
      } catch (err) {
        console.error('parsing', err);
      }
      // now actually update the records
      SmartDriveData.Info.updateRecords(updates, updatedRecords);
      // now stringify the diff (what will be inserted into db)
      try {
        recordString = JSON.stringify(updatedRecords);
      } catch (err) {
        console.error('serializing', err);
      }
      // now return the updates
      return {
        [SmartDriveData.Info.BatteryName]: updatedBattery,
        [SmartDriveData.Info.DriveDistanceName]: updatedDriveDistance,
        [SmartDriveData.Info.CoastDistanceName]: updatedCoastDistance,
        [SmartDriveData.Info.RecordsName]: recordString,
        [SmartDriveData.Info.HasBeenSentName]: 0
      };
    }

    export function newInfo(
      id: number,
      date: any,
      battery: number,
      drive: number,
      coast: number,
      driveStart?: number,
      coastStart?: number
    ) {
      return {
        [SmartDriveData.Info.IdName]: id,
        [SmartDriveData.Info.DateName]: SmartDriveData.Info.getDateValue(date),
        [SmartDriveData.Info
          .StartTimeName]: SmartDriveData.Info.getDateStartTime(date),
        [SmartDriveData.Info.BatteryName]: +battery,
        [SmartDriveData.Info.DriveDistanceName]: +drive,
        [SmartDriveData.Info.CoastDistanceName]: +coast,
        [SmartDriveData.Info.DriveDistanceStartName]: +(driveStart || drive),
        [SmartDriveData.Info.CoastDistanceStartName]: +(coastStart || coast),
        [SmartDriveData.Info.RecordsName]: '[]',
        [SmartDriveData.Info.UuidName]: java.util.UUID.randomUUID().toString(),
        [SmartDriveData.Info.HasBeenSentName]: 0
      };
    }

    export function loadInfo(
      id: number,
      date: any,
      startTime: number,
      battery: number,
      drive: number,
      coast: number,
      driveStart: number,
      coastStart: number,
      recordsString: string,
      uuid: string,
      has_been_sent: number
    ) {
      return {
        [SmartDriveData.Info.IdName]: id,
        [SmartDriveData.Info.DateName]: SmartDriveData.Info.getDateValue(date),
        [SmartDriveData.Info.StartTimeName]: startTime,
        [SmartDriveData.Info.BatteryName]: +battery,
        [SmartDriveData.Info.DriveDistanceName]: +drive,
        [SmartDriveData.Info.CoastDistanceName]: +coast,
        [SmartDriveData.Info.DriveDistanceStartName]: +driveStart,
        [SmartDriveData.Info.CoastDistanceStartName]: +coastStart,
        [SmartDriveData.Info.RecordsName]: recordsString,
        [SmartDriveData.Info.UuidName]: uuid,
        [SmartDriveData.Info.HasBeenSentName]: +has_been_sent
      };
    }
  }

  export namespace Errors {
    export const TableName = 'SmartDriveErrors';
    export const IdName = 'id';
    export const TimestampName = 'timestamp';
    export const ErrorCodeName = 'error_code';
    export const ErrorIdName = 'error_id';
    export const UuidName = 'uuid';
    export const HasBeenSentName = 'has_been_sent';
    export const Fields = [
      { name: TimestampName, type: 'bigint' },
      { name: ErrorCodeName, type: 'TEXT' },
      { name: ErrorIdName, type: 'int' },
      { name: UuidName, type: 'TEXT' },
      { name: HasBeenSentName, type: 'bit' }
    ];

    export function getTimestamp() {
      // 'x' is Milliseconds timetsamp format
      return new Date().getTime();
    }

    export function loadError(
      id: any,
      timestamp: any,
      errorType: string,
      errorId: number,
      uuid: string,
      has_been_sent: number
    ) {
      return {
        [SmartDriveData.Errors.IdName]: id,
        [SmartDriveData.Errors.TimestampName]: +timestamp,
        [SmartDriveData.Errors.ErrorCodeName]: errorType,
        [SmartDriveData.Errors.ErrorIdName]: errorId,
        [SmartDriveData.Errors.UuidName]: uuid,
        [SmartDriveData.Errors.HasBeenSentName]: +has_been_sent
      };
    }

    export function newError(errorType: string, errorId: number) {
      return {
        [SmartDriveData.Errors
          .TimestampName]: SmartDriveData.Errors.getTimestamp(),
        [SmartDriveData.Errors.ErrorCodeName]: errorType,
        [SmartDriveData.Errors.ErrorIdName]: errorId,
        [SmartDriveData.Errors
          .UuidName]: java.util.UUID.randomUUID().toString(),
        [SmartDriveData.Errors.HasBeenSentName]: 0
      };
    }
  }

  export namespace Firmwares {
    export const TableName = 'SmartDriveFirmwares';
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
        f.filename || f[SmartDriveData.Firmwares.FileName]
      );
      return file.readSync(err => {
        console.error('Could not load from fs:', err);
      });
    }

    export function saveToFileSystem(f) {
      const file = File.fromPath(
        f.filename || f[SmartDriveData.Firmwares.FileName]
      );
      // console.log('f.filename', f.filename, file);
      // console.log('f.data', typeof f.data, f.data.length);
      file.writeSync(f.data, err => {
        console.error('Could not save to fs:', err);
      });
    }

    export async function download(f: any) {
      let url = f['_downloadURL'];
      // make sure they're https!
      if (!url.startsWith('https:')) {
        url = url.replace('http:', 'https:');
      }
      console.log('Downloading FW update', f['_filename']);

      console.log('starting http get file...');
      return Http.getFile(url).then(file => {
        console.log('http get file:', file);
        const fileData = File.fromPath(file.path).readSync();
        return {
          version: SmartDriveData.Firmwares.versionStringToByte(f['version']),
          name: f['_filename'],
          data: fileData,
          changes: f['change_notes'][device.language] || f['change_notes']['en']
        };
      });
    }

    export function versionByteToString(version: number): string {
      if (version === 0xff || version === 0x00) {
        return 'unknown';
      } else {
        return `${(version & 0xf0) >> 4}.${version & 0x0f}`;
      }
    }

    export function versionStringToByte(version: string): number {
      const [major, minor] = version.split('.');
      return (parseInt(major) << 4) | parseInt(minor);
    }

    export function getFileName(firmware: string): string {
      return path.join(
        knownFolders.currentApp().path,
        'assets',
        'firmwares',
        firmware
      );
    }

    export function loadFirmware(
      id: any,
      version: number,
      firmwareName: string,
      fileName: string,
      changes: string
    ) {
      return {
        [SmartDriveData.Firmwares.IdName]: id,
        [SmartDriveData.Firmwares.VersionName]: version,
        [SmartDriveData.Firmwares.FirmwareName]: firmwareName,
        [SmartDriveData.Firmwares.FileName]: fileName,
        [SmartDriveData.Firmwares.ChangesName]: changes
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
        fileName || SmartDriveData.Firmwares.getFileName(firmwareName);
      return {
        [SmartDriveData.Firmwares.VersionName]: version,
        [SmartDriveData.Firmwares.FirmwareName]: firmwareName,
        [SmartDriveData.Firmwares.FileName]: fname,
        [SmartDriveData.Firmwares.ChangesName]: changes
          ? JSON.stringify(changes)
          : '[]'
      };
    }
  }
}
