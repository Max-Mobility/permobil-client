import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'com.permobil.pushtracker',
  appResourcesPath: 'app/App_Resources',
  android: {
    v8Flags: '--nolazy --expose_gc',
    markingMode: 'none',
    codeCache: true
  },
  appPath: 'app'
} as NativeScriptConfig;
