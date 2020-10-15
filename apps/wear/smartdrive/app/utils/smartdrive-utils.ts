import { Log } from '@permobil/core';
import { ReflectiveInjector } from 'injection-js';
import { Sentry } from 'nativescript-sentry';
import { SmartDriveData } from '../namespaces';
import { SmartDriveKinveyService, SqliteService } from '../services';
import { sentryBreadCrumb } from './sentry-utils';

const injector = ReflectiveInjector.resolveAndCreate([SmartDriveKinveyService, SqliteService]);

export async function getUpdateInformation() {
  sentryBreadCrumb('Checking for updates');
  const _kinveyService: SmartDriveKinveyService = injector.get(SmartDriveKinveyService);

  const currentVersions = await getCurrentFirmwareData().catch(err => {
    Sentry.captureException(err);
  });
  sentryBreadCrumb(
    `Current FW Versions: ${JSON.stringify(currentVersions, null, 2)}`
  );

  const response = await _kinveyService
    .downloadFirmwareFiles()
    .catch(err => {
      Sentry.captureException(err);
    });

  // Now that we have the metadata, check to see if we already have
  // the most up to date firmware files and download them if we don't
  const mds = response;
  const fileMetaDatas = await checkFirmwareMetaData(mds, currentVersions);
  sentryBreadCrumb(
    'Got file metadatas, length: ' + (fileMetaDatas && fileMetaDatas.length)
  );

  // do we need to download any firmware files?
  const updateAvailable = fileMetaDatas && fileMetaDatas.length > 0;
  sentryBreadCrumb('Update available: ' + updateAvailable);
  const info = {
    updateAvailable,
    currentVersions
  };
  return info;
}

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

export async function checkFirmwareMetaData(mds, currentVersions: any) {
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
    const current = currentVersions[fwName];
    const currentVersion = current && current.version;
    const isMax = v === reducedMaxes[fwName];
    return isMax && (!current || v > currentVersion);
  });

  return fileMetaDatas;
}
