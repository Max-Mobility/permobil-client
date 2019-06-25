import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as Kinvey from 'kinvey-nativescript-sdk';
import * as localStorage from 'nativescript-localstorage';
import * as fs from 'tns-core-modules/file-system';
import * as http from 'tns-core-modules/http';
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
    const files = (await Kinvey.Files.find(query).catch(e => {
      this._loggingService.logException(e);
    })) as Kinvey.File[];

    if (files && files.length >= 1) {
      files.forEach(async file => {
        // check if we have the latest version of the translation files - if not return out to next item
        const data = localStorage.getItem(
          `${file._filename}-${FileService.fsKeyMetadata}`
        );

        // _version is a property on our Kinvey files
        if (data && data.file_version >= (file as any)._version) {
          return;
        }

        const filePath = fs.path.join(
          fs.knownFolders.currentApp().path,
          `assets/i18n/${file._filename}`
        );
        await http.getFile(file._downloadURL, filePath).catch(err => {
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

  private _saveFileMetaData(file: Kinvey.File) {
    const metadata = {
      file_version: (file as any)._version
    };

    localStorage.setItem(
      `${file._filename}-${FileService.fsKeyMetadata}`,
      metadata
    );
  }
}
