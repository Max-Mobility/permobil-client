import { Injectable } from '@angular/core';
import * as Kinvey from '@bradmartin/kinvey-nativescript-sdk';
import { Http, knownFolders, path } from '@nativescript/core';
import { TranslateService } from '@ngx-translate/core';
import * as localStorage from 'nativescript-localstorage';
import { LoggingService } from './logging.service';

@Injectable()
export class FileService {
  constructor(
    private _translateService: TranslateService,
    private _loggingService: LoggingService
  ) {}

  private static fsKeyMetadata = 'Metadata';

  /**
   * Downloads the i18n json translation files from the Kinvey account and saves to the `assets/i18n/` directory that the ngx TranslateService will use to load files.
   */
  async downloadTranslationFiles() {
    // query Kinvey Files for all translation files
    const query = new Kinvey.Query().equalTo('translation_file', true);
    const files = await Kinvey.Files.find(query).catch(e => {
      this._loggingService.logException(e);
    });

    if (files && files.length >= 1) {
      files.forEach(async file => {
        // check if we have the latest version of the translation files - if not return out to next item
        const data = localStorage.getItem(
          `${file._filename}-${FileService.fsKeyMetadata}`
        );

        // _version is a property on our Kinvey files
        if (data && data.file_version >= file._version) {
          return;
        }

        const i18n = knownFolders.documents().getFolder('i18n'); // creates i18n if it doesn't exist
        const filePath = path.join(i18n.path, file._filename);
        await Http.getFile(file._downloadURL, filePath).catch(err => {
          this._loggingService.logException(err);
        });

        // Get the language name from the filename by removing the file extension from _filename property
        const languageName = file._filename.replace(/\..+$/, '');
        // reload the language in the ngx TranslateService
        this._translateService
          .reloadLang(languageName)
          .toPromise()
          .catch(e => {
            this._loggingService.logException(e);
          });

        // save the file metadata since we just downloaded the file and stored it
        this._saveFileMetaData(file);
      });
    }
  }

  private _saveFileMetaData(file) {
    const metadata = {
      file_version: file._version
    };

    localStorage.setItem(
      `${file._filename}-${FileService.fsKeyMetadata}`,
      metadata
    );
  }
}
