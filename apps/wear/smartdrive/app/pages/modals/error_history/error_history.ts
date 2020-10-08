import {
  fromObject,
  ObservableArray,
  Page,
  ShownModallyData
} from '@nativescript/core';
import { Log } from '@permobil/core';
import { getDefaultLang, L } from '@permobil/nativescript';
import differenceBy from 'lodash/differenceBy';
import { Sentry } from 'nativescript-sentry';
import {
  LoadOnDemandListViewEventData,
  RadListView
} from 'nativescript-ui-listview';
import { SmartDriveData } from '../../../namespaces';
import { SqliteService } from '../../../services';
import { formatDateTime, configureLayout } from '../../../utils';

let closeCallback;
let page: Page;
let errorRadListView: RadListView;
let sqliteService: SqliteService;

let errorHistoryData;

export async function closeModal() {
  closeCallback && closeCallback();
}

export async function onShownModally(args: ShownModallyData) {
  Log.D('error-history-page onShownModally');
  page = args.object as Page;
  page.bindingContext = fromObject({});

  closeCallback = args.closeCallback; // the closeCallback handles closing the modal

  // store the reference to the rad list view
  errorRadListView = page.getViewById('errorRadListView');

  // Sqlite service
  sqliteService = args.context.sqliteService;

  // set the pages bindingContext
  errorHistoryData = new ObservableArray();
  page.bindingContext.set('errorHistoryData', errorHistoryData);

  const wearOsLayout: any = page.getViewById('wearOsLayout');
  const res = configureLayout(wearOsLayout);
  wearOsLayout.nativeView.setPadding(
    res.insetPadding,
    res.insetPadding,
    res.insetPadding,
    0
  );

  page.bindingContext.set('insetPadding', res.insetPadding);
  page.bindingContext.set('chinSize', res.chinSize);

  showErrorHistory();
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
          time: formatDateTime(new Date(r && +r[1]), 'YYYY-MM-dd HH:mm').formatted,
          code: L(translationKey),
          id: r && r[3],
          uuid: r && r[4]
        };
      });
    }
  } catch (err) {
    Sentry.captureException(err);
    Log.E('Could not get errors', err);
  }
  return errors;
}

export async function onLoadMoreErrors(
  args: LoadOnDemandListViewEventData | { object: any, returnValue: boolean }
) {
  const listView: RadListView = args.object;
  // load more errors
  let recents = await getRecentErrors(10, errorHistoryData.length - 1);
  // determine the unique errors that we have
  recents = differenceBy(recents, errorHistoryData.slice(), 'uuid');
  if (recents && recents.length) {
    errorHistoryData.push(...recents);
    args.returnValue = true;
    listView.notifyLoadOnDemandFinished(false);
  } else {
    args.returnValue = false;
    listView.notifyLoadOnDemandFinished(true);
  }
  if (args.returnValue) {
    page.bindingContext.set('footerText', L('error-history.load-more'));
  } else {
    // we're at the end of the list
    if (errorHistoryData.length === 0) {
      // we have no errors - add the 'no-errors' message
      page.bindingContext.set('footerText', L('error-history.no-errors'));
    } else {
      // clear the footer text since we have errors
      page.bindingContext.set('footerText', '');
    }
  }
}

export async function onLoadMoreTap() {
  onLoadMoreErrors({
    object: errorRadListView,
    returnValue: true
  });
}

function showErrorHistory() {
  // clear out any pre-loaded data
  errorHistoryData.splice(0, errorHistoryData.length);
  // load the error data
  onLoadMoreErrors({
    object: errorRadListView,
    returnValue: true
  });
}
