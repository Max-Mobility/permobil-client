import { eachDay, format, subDays } from 'date-fns';

declare const com: any;

export namespace DailyActivity {
  export class Record extends com.permobil.pushtracker.DailyActivity {}

  export namespace Info {
    export const TableName =
      com.permobil.pushtracker.DatabaseHandler.TABLE_NAME || 'DailyActivity';
    export const IdName =
      com.permobil.pushtracker.DatabaseHandler.KEY_ID || 'id';
    export const DataName =
      com.permobil.pushtracker.DatabaseHandler.KEY_DATA || 'data';
    export const DateName =
      com.permobil.pushtracker.DatabaseHandler.KEY_DATE || 'date';
    export const UuidName =
      com.permobil.pushtracker.DatabaseHandler.KEY_UUID || 'uuid';
    export const HasBeenSentName =
      com.permobil.pushtracker.DatabaseHandler.KEY_HAS_BEEN_SENT ||
      'has_been_sent';
    export const Fields = [
      { name: DataName, type: 'TEXT' },
      { name: DateName, type: 'TEXT' },
      { name: UuidName, type: 'TEXT' },
      { name: HasBeenSentName, type: 'INTEGER DEFAULT 0' }
    ];

    export function getDateValue(date: any) {
      return format(date, 'YYYY/MM/DD');
    }

    export function getPastDates(numDates: number) {
      const now = new Date();
      return eachDay(subDays(now, numDates), now);
    }

    export function fromString(dataString: string) {
      let data = null;
      try {
        data = JSON.parse(dataString);
      } catch (err) {
        // Log.E(err);
      }
      return data;
    }

    export function newInfo(
      date: any,
      pushes: number,
      coast: number,
      distance: number
    ) {
      const record = new DailyActivity.Record();
      record.date = DailyActivity.Info.getDateValue(date);
      record.push_count = pushes;
      record.coast_time_avg = coast;
      record.watch_distance = distance;
      return record;
    }

    export function loadInfo(
      id: number,
      data: string,
      date: any,
      uuid: string,
      has_been_sent: number
    ) {
      return DailyActivity.Info.fromString(data);
    }
  }
}
