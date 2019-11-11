import { File, Folder, knownFolders, path } from '@nativescript/core';
import { Observable, Observer } from 'rxjs';

export class TNSTranslateLoader {
  constructor(private _path: string) {}

  getTranslation(lang: string) {
    const filePath = `${this._path || '/assets/i18n/'}${lang}.json`;
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

  private _fileFromPath(filepath: string): File {
    return File.fromPath(filepath);
  }

  private _fileExists(filepath: string): boolean {
    return File.exists(filepath);
  }

  private _getAbsolutePath(url: string): string {
    url = url.replace('~', '').replace('/', '');
    url = path.join(this._currentApp().path, url);
    return url;
  }
}
