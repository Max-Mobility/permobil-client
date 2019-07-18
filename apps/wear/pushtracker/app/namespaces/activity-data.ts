import { eachDay, format, subDays } from 'date-fns';

export namespace ActivityData {
  export namespace Info {
    export const TableName = 'ActivityInfo';
    export const IdName = 'id';
    export const DateName = 'date';
    export const PushName = 'pushes';
    export const CoastName = 'coast';
    export const DistanceName = 'distance';
    export const UuidName = 'uuid';
    export const HasBeenSentName = 'has_been_sent';
    export const Fields = [
      { name: DateName, type: 'TEXT' },
      { name: PushName, type: 'smallint' },
      { name: CoastName, type: 'REAL' },
      { name: DistanceName, type: 'REAL' },
      { name: UuidName, type: 'TEXT' },
      { name: HasBeenSentName, type: 'bit' }
    ];

    export function getDateValue(date: any) {
      return format(date, 'YYYY/MM/DD');
    }

    export function getPastDates(numDates: number) {
      const now = new Date();
      return eachDay(subDays(now, numDates), now);
    }

    export function newInfo(
      id: number,
      date: any,
      pushes: number,
      coast: number,
      distance: number
    ) {
      return {
        [ActivityData.Info.IdName]: id,
        [ActivityData.Info.DateName]: ActivityData.Info.getDateValue(date),
        [ActivityData.Info.PushName]: +pushes,
        [ActivityData.Info.CoastName]: +coast,
        [ActivityData.Info.DistanceName]: +distance,
        [ActivityData.Info.UuidName]: java.util.UUID.randomUUID().toString(),
        [ActivityData.Info.HasBeenSentName]: 0
      };
    }

    export function loadInfo(
      id: number,
      date: any,
      pushes: number,
      coast: number,
      distance: number,
      uuid: string,
      has_been_sent: number
    ) {
      return {
        [ActivityData.Info.IdName]: id,
        [ActivityData.Info.DateName]: ActivityData.Info.getDateValue(date),
        [ActivityData.Info.PushName]: +pushes,
        [ActivityData.Info.CoastName]: +coast,
        [ActivityData.Info.DistanceName]: +distance,
        [ActivityData.Info.UuidName]: uuid,
        [ActivityData.Info.HasBeenSentName]: +has_been_sent
      };
    }
  }
}
