require('globals');
import { File, Folder, knownFolders, path } from '@nativescript/core';
import { getResources, setResources } from '@nativescript/core/application';
import * as AppSettings from '@nativescript/core/application-settings';
import { device } from '@nativescript/core/platform';
import { DataKeys } from '@permobil/core/src/enums';

// Long string that will be the unique app-settings key across multiple apps for the i18n language file the user has set

const getDefaultLang = () => {
  return AppSettings.getString(DataKeys.APP_LANGUAGE_FILE, device.language);
};

// The current translation object
let lang = getDefaultLang();
const translations = {};
// The folder where we look for translation files, default is
// "~/assets/i18n"
const i18nPath = path.join(knownFolders.currentApp().path, 'assets', 'i18n');

const use = (language?: string) => {
  if (language) {
    lang = language;
  } else {
    lang = getDefaultLang();
  }
};

const languagePath = (language: string) => {
  let l = language;
  if (!l.endsWith('.json')) {
    l += '.json';
  }
  return path.join(i18nPath, l);
};

/**
 * Load is used when we want to load the translation files into memory
 * from disk. It updates the state of the translations object.
 */
const load = async (language?: string) => {
  const languagesToLoad = [];
  if (language) {
    // load the specified language
    languagesToLoad.push(language);
    // and load english as a backup
    languagesToLoad.push('en');
  } else {
    // load the languages found in the folder
    const langFiles = await Folder.fromPath(i18nPath)
      .getEntities()
      .then(entities => {
        return entities.map(e => e.name).filter(n => !n.includes('babel'));
      });
    languagesToLoad.push(...langFiles);
  }
  // now actually load the language files
  languagesToLoad.forEach(async l => {
    try {
      const fname = languagePath(l);
      const file = File.fromPath(fname);
      // console.log(`Loading translation file ${fname}`);
      file
        .readText()
        .then(text => {
          translations[l.replace('.json', '')] = JSON.parse(text);
        })
        .catch(err => {
          delete translations[l.replace('.json', '')];
          console.error(`Could not load translation file ${fname}: ${err}`);
        });
    } catch (e) {
      delete translations[l.replace('.json', '')];
    }
    // console.log(l.replace('.json', ''), translations[l.replace('.json', '')]);
  });
};

/**
 * Update is used when we download a new translation file from the
 * server. It will update the state of the translations object and
 * will save the new translation content to disk - overwriting the
 * original translation file.
 */
const update = (language: string, translation: any) => {
  // update translations
  translations[language] = translation;
  // save translation file
  const fname = languagePath(language);
  const file = File.fromPath(fname);
  file.writeSync(translation, err => {
    console.error(`Could not write translation file ${fname}: ${err}`);
  });
};

const get = (k, obj) => {
  return k.split('.').reduce((o, i) => o[i], obj);
};

const L = (...args: any[]) => {
  let translated = get(args[0], translations['en']) || args[0];
  try {
    translated = get(args[0], translations[lang]) || args[0];
  } catch {
    // do nothing - we have our defaults
  }
  return translated;
};

const applicationResources = getResources();
applicationResources.L = L;
setResources(applicationResources);
// @ts-ignore
global.L = L;

export { getDefaultLang, use, load, update, L };
