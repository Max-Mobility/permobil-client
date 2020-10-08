import { Utils } from '@nativescript/core';
import { getDefaultLang } from '@permobil/nativescript';

export const is24HourFormat = () => {
  const context = Utils.android.getApplicationContext();
  const _is24HourFormat = android.text.format.DateFormat.is24HourFormat(
    context
  );
  return _is24HourFormat;
}

export const formatDateTime = (date: Date, format?: string, locale?: string) => {
  const _date = new java.util.Date(date.getTime());
  const _locale = (locale === undefined) ?
    new java.util.Locale(getDefaultLang())
    :
    new java.util.Locale(locale);
  const datetime = {
    time: '',
    timeMeridiem: '',
    day: '',
    year: '',
    formatted: ''
  };
  // set time and timemeridiem
  if (is24HourFormat()) {
    datetime.time =
      new java.text.SimpleDateFormat('HH:mm', _locale).format(_date);
    datetime.timeMeridiem = '';
  } else {
    datetime.time =
      new java.text.SimpleDateFormat('h:mm', _locale).format(_date);
    datetime.timeMeridiem =
      new java.text.SimpleDateFormat('aa', _locale).format(_date);
  }
  // set the day
  datetime.day =
    new java.text.SimpleDateFormat('EEE MMM d', _locale).format(_date);
  // set the year
  datetime.year =
    new java.text.SimpleDateFormat('YYYY', _locale).format(_date);
  if (format) {
    // set the formatted version (what they asked for)
    datetime.formatted =
      new java.text.SimpleDateFormat(format, _locale).format(_date);
  }
  return datetime;
}
