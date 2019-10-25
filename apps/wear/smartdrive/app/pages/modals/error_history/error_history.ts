import { Log } from '@permobil/core';
import { WearOsLayout } from 'nativescript-wear-os';
import { fromObject, Observable } from 'tns-core-modules/data/observable';
import { screen } from 'tns-core-modules/platform';
import { Page, ShownModallyData } from 'tns-core-modules/ui/page';
import { ad as androidUtils } from 'tns-core-modules/utils/utils';
import { KinveyService, SqliteService } from '../../../services';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { PowerAssist, SmartDriveData } from '../../../namespaces';
import { getDefaultLang, L, Prop } from '@permobil/nativescript';
import { Level, Sentry } from 'nativescript-sentry';
import differenceBy from 'lodash/differenceBy';
import { closestIndexTo, format, isSameDay, isToday, subDays } from 'date-fns';

let closeCallback;
let page: Page;
let wearOsLayout: WearOsLayout;
let sqliteService: SqliteService;
const dateLocales = {
  da: require('date-fns/locale/da'),
  de: require('date-fns/locale/de'),
  en: require('date-fns/locale/en'),
  es: require('date-fns/locale/es'),
  fr: require('date-fns/locale/fr'),
  it: require('date-fns/locale/it'),
  ja: require('date-fns/locale/ja'),
  ko: require('date-fns/locale/ko'),
  nb: require('date-fns/locale/nb'),
  nl: require('date-fns/locale/nl'),
  nn: require('date-fns/locale/nb'),
  zh: require('date-fns/locale/zh_cn')
};

// values for UI databinding via bindingContext
const data = {
  insetPadding: 0,
  chinSize: 0,
  errorHistoryData: []
};

export function onCloseTap(args) {
  closeCallback();
}

export async function onShownModally(args: ShownModallyData) {
  Log.D('error-history-page onShownModally');
  page = args.object as Page;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  // Sqlite service
  sqliteService = args.context.sqliteService;

  Log.D('data', data);

  // set the pages bindingContext
  page.bindingContext = fromObject(data) as Observable;

  wearOsLayout = page.getViewById('wearOsLayout');
  configureLayout(wearOsLayout);

  showErrorHistory();
}

function formatDate(d: Date, fmt: string) {
  return format(d, fmt, {
    locale: dateLocales[getDefaultLang()] || dateLocales['en']
  });
}

async function getRecentErrors(numErrors: number, offset: number = 0) {
  let errors = [];
  try {
    const rows = await sqliteService.getAll({
      tableName: SmartDriveData.Errors.TableName,
      orderBy: SmartDriveData.Errors.IdName,
      ascending: false,
      limit: numErrors,
      offset: offset
    });
    if (rows && rows.length) {
      errors = rows.map(r => {
        const translationKey =
          'error-history.errors.' + (r && r[2]).toLowerCase();
        return {
          time: formatDate(new Date(r && +r[1]), 'YYYY-MM-DD HH:mm'),
          code: L(translationKey),
          id: r && r[3],
          uuid: r && r[4],
          insetPadding: data.insetPadding,
          isBack: false,
          onTap: () => { },
          key: 'error'
        };
      });
    }
  } catch (err) {
    Sentry.captureException(err);
    Log.E('Could not get errors', err);
  }
  return errors;
}

export function selectErrorTemplate(item, index, items) {
  if (item.isBack) return 'back';
  else if (index === items.length - 1) return 'last';
  else return 'error';
}

async function onLoadMoreErrors() {
  let recents = await getRecentErrors(10, data.errorHistoryData.length);
  // add the back button as the first element - should only load once
  if (data.errorHistoryData.length === 0) {
    data.errorHistoryData.push({
      code: L('buttons.back'),
      onTap: closeCallback,
      isBack: true,
      key: 'back'
    });
  }
  // determine the unique errors that we have
  recents = differenceBy(recents, data.errorHistoryData.slice(), 'uuid');
  if (recents && recents.length) {
    // now add the recent data
    data.errorHistoryData.push(...recents);
    data.errorHistoryData.map(error => error.key = 'error');
    data.errorHistoryData[0].key = 'back';
    data.errorHistoryData[data.errorHistoryData.length - 1].key = 'last';
  } else if (data.errorHistoryData.length === 1) {
    // or add the 'no errors' message
    data.errorHistoryData.push({
      code: L('error-history.no-errors'),
      insetPadding: data.insetPadding,
      isBack: false,
      key: 'last'
    });
  }
}

function showErrorHistory() {
  // clear out any pre-loaded data
  data.errorHistoryData.splice(0, data.errorHistoryData.length);
  // load the error data
  onLoadMoreErrors();
}

function configureLayout(layout: WearOsLayout) {
  Log.D('customWOLInsetLoaded', layout);

  // determine inset padding
  const androidConfig = androidUtils
    .getApplicationContext()
    .getResources()
    .getConfiguration();
  const isCircleWatch = androidConfig.isScreenRound();
  const screenWidth = screen.mainScreen.widthPixels;
  const screenHeight = screen.mainScreen.heightPixels;

  if (isCircleWatch) {
    data.insetPadding = Math.round(0.146467 * screenWidth);
    // if the height !== width then there is a chin!
    if (screenWidth !== screenHeight && screenWidth > screenHeight) {
      data.chinSize = screenWidth - screenHeight;
    }
  }
  layout.nativeView.setPadding(
    data.insetPadding,
    data.insetPadding,
    data.insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', data.insetPadding);
  page.bindingContext.set('chinSize', data.chinSize);
}
