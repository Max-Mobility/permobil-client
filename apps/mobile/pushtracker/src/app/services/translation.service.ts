import { Injectable } from '@angular/core';
import * as appSettings from '@nativescript/core/application-settings';
import { Observable } from '@nativescript/core';
import { LoggingService } from './logging.service';
import { TranslateService } from '@ngx-translate/core';

// for querying kinvey for translation files
import { Files as KinveyFiles, Query as KinveyQuery } from 'kinvey-nativescript-sdk';

// for downloading firmware files
import { File, knownFolders, path } from '@nativescript/core';
import { DownloadProgress } from 'nativescript-download-progress';

@Injectable()
export class TranslationService extends Observable {

  private static CURRENT_VERSIONS_KEY: string = 'translation.service.current-versions';

  private currentVersions: any = {};
  private languageData: any = {};

  constructor(
    private _logService: LoggingService,
    private _translateService: TranslateService
  ) {
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
      // array for the different sets of promises we'll be waiting
      // on
      let promises = [];
      // do we need to download any language files?
      if (fileMetadatas && fileMetadatas.length) {
        promises = fileMetadatas.map(TranslationService.download);
      }

      // await the downloading of the files
      let files = null;
      try {
        files = await Promise.all(promises);
      } catch (err) {
        this._logService.logException(err);
      }

      // now that we have downloaded the files, write them to disk
      // and update our stored metadata
      if (files && files.length) {
        files.map(this.updateLanguageData.bind(this));
      }

      // save the metadata to app settings
      appSettings.setString(
        TranslationService.CURRENT_VERSIONS_KEY,
        JSON.stringify(this.currentVersions)
      );

      // now update the languages in the app
      Object.keys(this.currentVersions).map((key: string) => {
        const info = this.currentVersions[key];
        const data = this.languageData[key];
        // console.log('loaded data for', info.name, ':', data);
        // now set the translation service to use it
        this._translateService.setTranslation(info.language_code, data);
      });
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
    } catch (err) { }
    const objs = Object.values(versions);
    if (objs.length) {
      // for each language we got, try to load the file. If we have
      // the file, update the langauge data and current versions
      objs.map((f: any) => {
        const fname = f.filename;
        if (fname && fname.length) {
          this._logService.logBreadCrumb(
            TranslationService.name,
            `Loading Language file: ${fname}`
          );
          const blob = TranslationService.loadFromFileSystem(fname);
          if (blob && blob.length) {
            this.currentVersions[f.name] = f;
            this.languageData[f.name] = blob;
          }
        }
      });
    }
  }

  private updateLanguageData(f: DownloadedFile) {
    // update the current versions
    this.currentVersions[f.name] = {
      version: f.version,
      name: f.name,
      app_name: f.app_name,
      filename: path.join(
        knownFolders.currentApp().path,
        'assets',
        'i18n',
        f.name
      ),
      language_code: f.name.replace('.json', '')
    };
    // store the data for access later
    this.languageData[f.name] = f.data;
    // save binary file to fs
    TranslationService.saveToFileSystem(
      this.currentVersions[f.name].filename,
      f.data
    );
  }

  private static loadFromFileSystem(filename: string) {
    const file = File.fromPath(filename);
    return file.readTextSync(err => {
      console.error('Could not load from fs:', err);
    });
  }

  private static saveToFileSystem(filename: string, data: any) {
    const file = File.fromPath(filename);
    file.writeTextSync(data, err => {
      console.error('Could not save to fs:', err);
    });
  }

  private static async download(f: any): Promise<DownloadedFile | null> {
    let url = f['_downloadURL'];
    // make sure they're https!
    if (!url.startsWith('https:')) {
      url = url.replace('http:', 'https:');
    }
    console.log('Downloading language file update', f['_filename']);

    const download = new DownloadProgress();
    return download
      .downloadFile(url)
      .then(file => {
        const fileData = File.fromPath(file.path).readSync();
        return new DownloadedFile(
          f['_version'],
          f['_filename'],
          f['app_name'],
          fileData
        );
      })
      .catch(error => {
        console.error('download error', url, error);
        return null;
      });
  }
}

class DownloadedFile {
  constructor(public version: string,
    public name: string,
    public app_name: string,
    public data: any) { }
}
