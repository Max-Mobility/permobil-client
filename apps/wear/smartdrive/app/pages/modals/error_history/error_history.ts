import { Log } from '@permobil/core';
import { getDefaultLang, L } from '@permobil/nativescript';
import { format } from 'date-fns';
import differenceBy from 'lodash/differenceBy';
import { Sentry } from 'nativescript-sentry';
import { WearOsLayout } from 'nativescript-wear-os';
import {
  ObservableArray,
  Observable,
  Page,
  ShownModallyData
} from '@nativescript/core';
import { fromObject } from '@nativescript/core/data/observable';
import {
  ListViewEventData,
  RadListView,
  LoadOnDemandListViewEventData
} from 'nativescript-ui-listview';
import { SmartDriveData } from '../../../namespaces';
import { SqliteService } from '../../../services';
import { configureLayout } from '../../../utils';

let closeCallback;
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
  errorHistoryData: new ObservableArray()
};

export async function onShownModally(args: ShownModallyData) {
  Log.D('error-history-page onShownModally');
  const page = args.object as Page;
  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  // Sqlite service
  sqliteService = args.context.sqliteService;

  // set the pages bindingContext
  page.bindingContext = fromObject(data) as Observable;

  const wearOsLayout = page.getViewById('wearOsLayout') as WearOsLayout;
  const res = configureLayout(wearOsLayout);
  page.bindingContext.set('chinSize', res.chinSize);
  page.bindingContext.set('insetPadding', res.insetPadding);
  wearOsLayout.nativeView.setPadding(
    res.insetPadding,
    res.insetPadding,
    res.insetPadding,
    0
  );

  showErrorHistory();

  data.insetPadding = res.insetPadding;
  data.chinSize = res.chinSize;
}

export function selectErrorTemplate(item, index, items) {
  return item.key;
  /*
  if (item.isBack) return 'back';
  else if (index === items.length - 1) return 'last';
  else return 'error';
  */
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
          onTap: () => {},
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

export async function onLoadMoreErrors(args: LoadOnDemandListViewEventData) {
  const listView: RadListView = args.object;
  // load more errors
  let recents = await getRecentErrors(10, data.errorHistoryData.length - 1);
  // determine the unique errors that we have
  recents = differenceBy(recents, data.errorHistoryData.slice(), 'uuid');
  if (recents && recents.length) {
    data.errorHistoryData.push(...recents);
    args.returnValue = true;
    listView.notifyLoadOnDemandFinished();
  } else {
    if (data.errorHistoryData.length === 1) {
      // we have no errors - add the 'no-errors' message
      data.errorHistoryData.push({
        code: L('error-history.no-errors'),
        insetPadding: data.insetPadding,
        key: 'no-errors'
      });
    } else {
      // add the padding message if we have errors
      data.errorHistoryData.push({
        insetPadding: data.insetPadding,
        key: 'last'
      });
    }
    args.returnValue = false;
    listView.notifyLoadOnDemandFinished(true);
  }
}

function showErrorHistory() {
  // clear out any pre-loaded data
  data.errorHistoryData.splice(0, data.errorHistoryData.length);
  // load the error data
  // onLoadMoreErrors();

  data.errorHistoryData.push({
    code: L('buttons.back'),
    onTap: closeCallback,
    key: 'back'
  });
}

function formatDate(d: Date, fmt: string) {
  return format(d, fmt, {
    locale: dateLocales[getDefaultLang()] || dateLocales['en']
  });
}
