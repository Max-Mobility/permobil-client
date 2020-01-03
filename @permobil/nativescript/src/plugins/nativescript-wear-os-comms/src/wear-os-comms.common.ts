export type CallbackFunction = (args?: any) => void;

export class Common {

  // bluetooth services / characteristics for wearos <-> ios
  // communications
  public static ServiceUUID: string = 'a04cfcb6-5dc5-4a27-bd04-e2dd0cb1ff44';
  public static MessageCharacteristicUUID: string =
    'f733bcab-767f-4b75-8aea-33e6a56fc87a';
  public static DataCharacteristicUUID: string =
    'f733bcab-767f-4b75-8aea-33e6a56fc88a';

  // for saving the companion to app settings
  public static APP_SETTINGS_COMPANION_KEY: string = 'wear-os-comms.companion';

  // messages are defined by ${path}${delimeter}${message}
  public static MessageDelimeter: string = '::::::';

  // data is sent as a map with 'data' -> data and 'time' -> time entries
  public static DATA_KEY: string = 'data';
  public static TIME_KEY: string = 'time';
  public static DATA_PATH: string = '/user-data';
}
