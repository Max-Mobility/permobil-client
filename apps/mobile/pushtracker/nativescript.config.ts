import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'org.nativescript.app',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    id: 'com.permobil.pushtracker'
  },
  ios: {
    id: 'com.max-mobility.PushTracker'
  },
  appPath: 'src'
} as NativeScriptConfig;
