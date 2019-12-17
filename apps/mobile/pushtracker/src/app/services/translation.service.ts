import { Injectable } from '@angular/core';
import { File, knownFolders, Observable, path } from '@nativescript/core';
import * as appSettings from '@nativescript/core/application-settings';
// for querying kinvey for translation files
import { Files as KinveyFiles, Query as KinveyQuery } from 'kinvey-nativescript-sdk';
import { DownloadProgress } from 'nativescript-download-progress';
import { LoggingService } from './logging.service';

@Injectable()
export class TranslationService extends Observable {
  private static CURRENT_VERSIONS_KEY: string =
    'translation.service.current-versions';

  private currentVersions: any = {};

  constructor(private _logService: LoggingService) {
    super();
  }

  async updateTranslationFilesFromKinvey() {
    try {
      // get the current versions of the translation files we have
      this.loadLanguageData();
      // this query will get the metadata about all translation files on
      // the server for the pushtracker_mobile app
      const kinveyQuery = new KinveyQuery();
      kinveyQuery.equalTo('app_name', 'pushtracker_mobile');
      kinveyQuery.equalTo('translation_file', true);
      const kinveyResponse = await KinveyFiles.find(kinveyQuery);
      // get the max version of each file
      const maxes = kinveyResponse.reduce((maxes, metadata) => {
        const v = metadata['_version'];
        const fName = metadata['_filename'];
        if (!maxes[fName]) maxes[fName] = 0.0;
        maxes[fName] = Math.max(v, maxes[fName]);
        return maxes;
      }, {});
      // filter only the files that we don't have of that are newer
      // than the ones we have (and are the max)
      const fileMetadatas = kinveyResponse.filter(f => {
        const v = f['_version'];
        const fName = f['_filename'];
        const current = this.currentVersions[fName];
        const currentVersion = current && current.version;
        const isMax = v === maxes[fName];
        return isMax && (!current || v > currentVersion);
      });
      const files = [];
      // do we need to download any language files?
      if (fileMetadatas && fileMetadatas.length) {
        for (let i = 0; i < fileMetadatas.length; i++) {
          const f = fileMetadatas[i];
          this._logService.logBreadCrumb(
            TranslationService.name,
            `Downloading language file update ${f['_filename']} version ${f['_version']}`
          );

          const dl = await TranslationService.download(f).catch(err => {
            this._logService.logBreadCrumb(
              TranslationService.name,
              'Could not download language files: ' + err
            );
          });

          files.push(dl);
        }
      }

      // now that we have downloaded the files, write them to disk
      // and update our stored metadata
      if (files && files.length) {
        files.forEach(this.updateLanguageData.bind(this));
      }

      // save the metadata to app settings
      appSettings.setString(
        TranslationService.CURRENT_VERSIONS_KEY,
        JSON.stringify(this.currentVersions)
      );
    } catch (err) {
      this._logService.logException(err);
    }
  }

  private loadLanguageData() {
    // reset current versions
    this.currentVersions = {};
    // load the saved current versions
    let versions = {};
    try {
      versions = JSON.parse(
        appSettings.getString(TranslationService.CURRENT_VERSIONS_KEY, '{}')
      );
    } catch (err) {}
    const objs = Object.values(versions);
    if (objs.length) {
      // for each language we got, try to load the file. If we have
      // the file, update the langauge data and current versions
      objs.forEach((f: any) => {
        const fname = f.filename;
        if (fname && fname.length) {
          this._logService.logBreadCrumb(
            TranslationService.name,
            `Loading Language file: ${fname}`
          );
          try {
            const blob = TranslationService.loadFromFileSystem(fname);
            if (blob && blob.length) {
              this.currentVersions[f.name] = f;
            }
          } catch (err) {
            this._logService.logBreadCrumb(
              TranslationService.name,
              'Could not load language file: ' + err
            );
            this._logService.logException(err);
          }
        }
      });
    }
  }

  private updateLanguageData(f: DownloadedFile) {
    if (f === null) {
      return;
    }
    // update the current versions
    const i18n = knownFolders.documents().getFolder('i18n');
    this.currentVersions[f.name] = {
      version: f.version,
      name: f.name,
      app_name: f.app_name,
      filename: path.join(i18n.path, f.name),
      language_code: f.name.replace('.json', '')
    };
    try {
      // save binary file to fs
      TranslationService.saveToFileSystem(
        this.currentVersions[f.name].filename,
        f.data
      );
    } catch (err) {
      // clear out the data - we couldn't save the file
      delete this.currentVersions[f.name];
      this._logService.logBreadCrumb(
        TranslationService.name,
        'Could not save language file: ' + err
      );
      // this._logService.logException(err);
    }
  }

  private static loadFromFileSystem(filename: string) {
    const file = File.fromPath(filename);
    return file.readTextSync(err => {
      throw new Error('Could not load language from fs: ' + err);
    });
  }

  private static saveToFileSystem(filename: string, data: any) {
    const file = File.fromPath(filename);
    file.writeTextSync(data, err => {
      throw new Error('Could not save language to fs: ' + err);
    });
  }

  private static async download(f: any): Promise<DownloadedFile | null> {
    let url = f['_downloadURL'];
    // make sure they're https!
    if (!url.startsWith('https:')) {
      url = url.replace('http:', 'https:');
    }

    const i18nFolder = knownFolders.documents().getFolder('i18n');
    const download = new DownloadProgress();
    const destFilePath = path.join(i18nFolder.path, f._filename);
    const file = await download
      .downloadFile(url, null, destFilePath)
      .catch(err => {
        throw new Error(
          `Could not download ${f['_filename']}: ${err.toString()}`
        );
      });

    const fileData = File.fromPath(file.path)
      .readText()
      .catch(err => {
        throw new Error('could not load downloaded file data:' + err);
      });

    return new DownloadedFile(
      f['_version'],
      f['_filename'],
      f['app_name'],
      fileData
    );
  }
}

class DownloadedFile {
  constructor(
    public version: string,
    public name: string,
    public app_name: string,
    public data: any
  ) {}
}
