import { Log } from '@permobil/core';
import { ReflectiveInjector } from 'injection-js';
import { Sentry } from 'nativescript-sentry';
import { SmartDriveData } from '../namespaces';
import { SqliteService } from '../services';
import { sentryBreadCrumb } from './sentry-utils';

const injector = ReflectiveInjector.resolveAndCreate([SqliteService]);

export async function getCurrentFirmwareData() {
  sentryBreadCrumb('Getting firmware data');
  const _sqliteService: SqliteService = injector.get(SqliteService);

  try {
    const objs = await _sqliteService.getAll({
      tableName: SmartDriveData.Firmwares.TableName
    });
    Log.D('Done getting objects from SqliteService');
    // @ts-ignore
    const mds = objs.map(o => SmartDriveData.Firmwares.loadFirmware(...o));
    // make the metadata
    return mds.reduce((data, md) => {
      const fname = md[SmartDriveData.Firmwares.FileName];
      const blob = SmartDriveData.Firmwares.loadFromFileSystem({
        filename: fname
      });
      if (blob && blob.length) {
        data[md[SmartDriveData.Firmwares.FirmwareName]] = {
          version: md[SmartDriveData.Firmwares.VersionName],
          filename: fname,
          id: md[SmartDriveData.Firmwares.IdName],
          changes: md[SmartDriveData.Firmwares.ChangesName],
          data: blob
        };
      }
      return data;
    }, {});
  } catch (err) {
    sentryBreadCrumb('Could not get firmware metadata: ' + err);
    Sentry.captureException(err);
    return {};
  }
}

export async function checkFirmwareMetaData(mds) {
  sentryBreadCrumb('Firmware MetaData: ' + mds);
  // get the max firmware version for each firmware
  const reducedMaxes = mds.reduce((maxes, md) => {
    const v = SmartDriveData.Firmwares.versionStringToByte(md['version']);
    const fwName = md['_filename'];
    if (!maxes[fwName]) maxes[fwName] = 0;
    maxes[fwName] = Math.max(v, maxes[fwName]);
    return maxes;
  }, {});

  // filter only the firmwares that we don't have or that are newer
  // than the ones we have (and are the max)
  const fileMetaDatas = mds.filter(f => {
    const v = SmartDriveData.Firmwares.versionStringToByte(f['version']);
    const fwName = f['_filename'];
    const current = this.currentVersions[fwName];
    const currentVersion = current && current.version;
    const isMax = v === reducedMaxes[fwName];
    return isMax && (!current || v > currentVersion);
  });

  return fileMetaDatas;
}

export async function saveFirmwareFiles(metadata) {
  // now download the files
  const files = [];
  try {
    for (const fmd of metadata) {
      const f = await SmartDriveData.Firmwares.download(fmd);
      files.push(f);
    }
    return files;
  } catch (err) {
    return err;
  }
}

export async function updateFirmwareData(f: any, currentVersions) {
  const _sqliteService: SqliteService = injector.get(SqliteService);

  const id = currentVersions[f.name] && currentVersions[f.name].id;
  // update the data in the db
  const newFirmware = SmartDriveData.Firmwares.newFirmware(
    f.version,
    f.name,
    undefined,
    f.changes
  );

  // update current versions
  currentVersions[f.name] = {
    version: f.version,
    changes: f.changes,
    filename: newFirmware[SmartDriveData.Firmwares.FileName],
    data: f.data
  };

  // save binary file to fs
  sentryBreadCrumb(`saving file ${currentVersions[f.name].filename}`);
  SmartDriveData.Firmwares.saveToFileSystem({
    filename: currentVersions[f.name].filename,
    data: f.data
  });

  if (id !== undefined) {
    currentVersions[f.name].id = id;
    newFirmware[SmartDriveData.Firmwares.IdName] = id;
    await _sqliteService.updateInTable(
      SmartDriveData.Firmwares.TableName,
      {
        [SmartDriveData.Firmwares.VersionName]:
          newFirmware[SmartDriveData.Firmwares.VersionName],
        [SmartDriveData.Firmwares.ChangesName]:
          newFirmware[SmartDriveData.Firmwares.ChangesName],
        [SmartDriveData.Firmwares.FileName]:
          newFirmware[SmartDriveData.Firmwares.FileName]
      },
      {
        [SmartDriveData.Firmwares.IdName]: id
      }
    );
  } else {
    await _sqliteService.insertIntoTable(
      SmartDriveData.Firmwares.TableName,
      newFirmware
    );
  }
}
