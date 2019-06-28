require('globals');
import { knownFolders, path, Folder, File } from 'tns-core-modules/file-system';
import { device } from 'tns-core-modules/platform';
import { getResources, setResources } from 'tns-core-modules/application';

// The current translation object
let lang = null;
const translations = {};
// The folder where we look for translation files, default is
// "~/assets/i18n"
const i18nPath = path.join(
  knownFolders.currentApp().path,
  'assets',
  'i18n'
);

const getDefaultLang = function() {
  return device.language;
};

const use = function(language?: string) {
  if (language === lang) {
    return;
  }
  lang = language;
};

const languagePath = function(language: string) {
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
const load = async function(language?: string) {
  const languagesToLoad = [];
  if (language) {
    // only load the specified language
    languagesToLoad.push(language);
  } else {
    // load the languages found in the folder
    const langFiles = await Folder.fromPath(i18nPath)
      .getEntities()
      .then(entities => {
        return entities.map(e => e.name);
      });
    languagesToLoad.push(...langFiles);
  }
  // now actually load the language files
  languagesToLoad.map(l => {
    const fname = languagePath(l);
    const file = File.fromPath(fname);
    translations[l] = file.readSync(err => {
      console.error(`Couldn't load translation file ${fname}: ${err}`);
    });
  });
};

/**
 * Update is used when we download a new translation file from the
 * server. It will update the state of the translations object and
 * will save the new translation content to disk - overwriting the
 * original translation file.
 */
const update = function(language: string, translation: any) {
  // update translations
  translations[language] = translation;
  // save translation file
  const fname = languagePath(language);
  const file = File.fromPath(fname);
  file.writeSync(translation, (err) => {
    console.error(`Couldn't write translation file ${fname}: ${err}`);
  });
};

const L = function () {
  if (lang && translations[lang] && arguments.length) {
    return translations[lang][arguments[0]] || arguments[0];
  } else if (arguments.length) {
    return arguments[0];
  }
};

const applicationResources = getResources();
applicationResources.L = L;
setResources(applicationResources);
// @ts-ignore
global.L = L;

export { load, update, L };
