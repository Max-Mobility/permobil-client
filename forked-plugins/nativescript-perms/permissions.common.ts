export type Status = 'authorized' | 'denied' | 'restricted' | 'undetermined';

export type Permissions =
  | 'location'
  | 'camera'
  | 'microphone'
  | 'photo'
  | 'contacts'
  | 'event'
  | 'reminder'
  | 'bluetooth'
  | 'notification'
  | 'backgroundRefresh'
  | 'speechRecognition'
  | 'mediaLibrary'
  | 'motion'
  | 'storage'
  | 'callPhone'
  | 'readSms'
  | 'receiveSms';
export interface Rationale {
  title: string;
  message: string;
  buttonPositive?: string;
  buttonNegative?: string;
  buttonNeutral?: string;
}
export type CheckOptions = string | { type: string };
export type RequestOptions = string | { type: string; rationale?: Rationale };
