import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'com.permobil.smartdrive.wearos',
  appResourcesPath: 'app/App_Resources',
  android: {
    v8Flags: '--nolazy --expose_gc',
    markingMode: 'none',
    handleTimeZoneChanges: true,
    codeCache: true,
    suppressCallJSMethodExceptions: false
  },
  appPath: 'app'
} as NativeScriptConfig;
