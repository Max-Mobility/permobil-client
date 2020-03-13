let debug = false;
export function setDebug(value: boolean) {
  debug = value;
}

export enum CLogTypes {
  info,
  warning,
  error
}

export const CLog = (type: CLogTypes = 0, ...args) => {
  if (debug) {
    if (type === 0) {
      // Info
      console.log('[nativescript-perms]', ...args);
    } else if (type === 1) {
      // Warning
      console.warn('[nativescript-perms]', ...args);
    } else if (type === 2) {
      console.error('[nativescript-perms]', ...args);
    }
  }
};

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
