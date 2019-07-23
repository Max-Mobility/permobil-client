import { eachDay, format, subDays } from 'date-fns';

declare const com: any;

export namespace ActivityData {
    export namespace Info {
        export const TableName =
            com.permobil.pushtracker.wearos.DatabaseHandler.DATABASE_NAME; // 'ActivityInfo';
        export const IdName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_ID; // 'id';
        export const DateName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_DATE; // 'date';
        export const PushName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_PUSHES; // 'pushes';
        export const CoastName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_COAST; // 'coast';
        export const DistanceName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_DISTANCE; // 'distance';
        export const SmartDriveDistanceName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_SMARTDRIVE_DISTANCE; // 'smartdrive_distance';
        export const HeartRatesName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_HEART_RATES; // 'heart_rates';
        export const LocationsName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_LOCATIONS; // 'locations';
        export const UserIdentifierName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_USER_IDENTIFIER; // 'user_identifier';
        export const UuidName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_UUID; // 'uuid';
        export const HasBeenSentName =
            com.permobil.pushtracker.wearos.DatabaseHandler.KEY_HAS_BEEN_SENT; // 'has_been_sent';
        export const Fields = [
            { name: DateName, type: 'TEXT' },
            { name: PushName, type: 'smallint' },
            { name: CoastName, type: 'REAL' },
            { name: DistanceName, type: 'REAL' },
            { name: SmartDriveDistanceName, type: 'REAL' },
            { name: HeartRatesName, type: 'TEXT' },
            { name: LocationsName, type: 'TEXT' },
            { name: UserIdentifierName, type: 'TEXT' },
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
