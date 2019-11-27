import { File, Folder, knownFolders, path } from '@nativescript/core';
import { Observable, Observer } from 'rxjs';

export class TNSTranslateLoader {
  constructor() {
    // copy all language files to documents folder from assets folder
    const i18nFolder = Folder.fromPath(path.join(knownFolders.currentApp().path, 'app', 'assets', 'i18n'));
    // this should create the folder
    const destFolder = knownFolders.documents().getFolder('i18n');
    // if the dest path doesn't exist, we've never copied the files,
    // so do it now
    const entities = i18nFolder.getEntitiesSync();
    // entities is array with the document's files and folders.
    entities.forEach((entity) => {
      const newFilePath = path.join(destFolder.path, entity.name);
      if (!File.exists(newFilePath)) {
        // copy over the file if it is not there already - we don't
        // want to overwrite files that may have been downloaded from
        // the server as updates!
        const newFile = File.fromPath(newFilePath);
        const data = File.fromPath(entity.path).readSync((err) => {
          console.error('could not read file:', err);
        });
        newFile.writeSync(data, (err) => {
          console.error('exception writing', entity, err);
        });
      }
    });
  }

  getTranslation(lang: string) {
    const filePath = `/i18n/${lang}.json`;
    return this.requestLocalFile(filePath);
  }

  private requestLocalFile(url: string): Observable<any> {
    url = this._getAbsolutePath(url);

    // request from local app resources
    return new Observable((observer: Observer<any>) => {
      if (this._fileExists(url)) {
        const localFile = this._fileFromPath(url);
        localFile.readText().then(
          (data: string) => {
            try {
              const json = JSON.parse(data);
              const processed = this._process(json);
              observer.next(processed);
              observer.complete();
            } catch (error) {
              // Even though the response status was 2xx, this is still an error.
              // The parse error contains the text of the body that failed to parse.
              const errorResult = {
                error,
                text: data
              };
              observer.error(errorResult);
            }
          },
          (error: object) => {
            const errorResult = { error };
            observer.error(errorResult);
          }
        );
      } else {
        const errorResult = { error: 'not found' };
        observer.error(errorResult);
      }
    });
  }

  private _process(object: any) {
    const newObject = {};

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        if (typeof object[key] === 'object') {
          newObject[key] = this._process(object[key]);
        }
        else if ((typeof object[key] === 'string') && (object[key] === '')) {
          // do not copy empty strings
          console.log('empty string found!');
        }
        else {
          newObject[key] = object[key];
        }
      }
    }
    return newObject;
  }

  private _currentApp(): Folder {
    return knownFolders.currentApp();
  }

  private _documents(): Folder {
    return knownFolders.documents();
  }

  private _fileFromPath(filepath: string): File {
    return File.fromPath(filepath);
  }

  private _fileExists(filepath: string): boolean {
    return File.exists(filepath);
  }

  private _getAbsolutePath(url: string): string {
    url = url.replace('~', '').replace('/', '');
    url = path.join(this._documents().path, url);
    return url;
  }
}
