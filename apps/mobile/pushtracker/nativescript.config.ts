import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'org.nativescript.app',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    id: 'com.permobil.pushtracker',
    codeCache: true
  },
  ios: {
    id: 'com.max-mobility.PushTracker',
    codeCache: true
  },
  appPath: 'src'
} as NativeScriptConfig;
