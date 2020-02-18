/// <reference path="./tns-core-modules.d.ts" />

// Export all interfaces from "application" module
export { AndroidActivityBackPressedEventData, AndroidActivityBundleEventData, AndroidActivityEventData, AndroidActivityNewIntentEventData, AndroidActivityRequestPermissionsEventData, AndroidActivityResultEventData, AndroidApplication, ApplicationEventData, CssChangedEventData, DiscardedErrorEventData, iOSApplication, LaunchEventData, LoadAppCSSEventData, OrientationChangedEventData, UnhandledErrorEventData } from './application';
export { Color } from './color';
export { EventData, Observable, PropertyChangeData } from './data/observable';
export { ChangedData, ChangeType, ObservableArray } from './data/observable-array';
export { File, FileSystemEntity, Folder, knownFolders, path } from './file-system';
// Export all interfaces from "http" module
export { Headers, HttpContent, HttpRequestOptions, HttpResponse, HttpResponseEncoding } from './http';
export { ImageAsset, ImageAssetOptions } from './image-asset';
export { ImageSource } from './image-source';
export { device as Device, isAndroid, isIOS, screen as Screen } from './platform';
// Export interfaces from "profiling" module
export { InstrumentationMode, TimerInfo } from './profiling';
export { encoding } from './text';
export { DefaultErrorHandler, ErrorHandler, TraceWriter } from './trace';
export * from './ui'; // Barrel export
export { ParserEvent, ParserEventType, XmlParser } from './xml';

// Export all methods and fields from "application" as Application
import { addCss, android, discardedErrorEvent, displayedEvent, exitEvent, getCssFileName, getMainEntry, getNativeApplication, getRootView, hasLaunched, ios, launchEvent, loadAppCss, lowMemoryEvent, off, on, orientation, orientationChangedEvent, resumeEvent, run, setCssFileName, setResources, suspendEvent, uncaughtErrorEvent } from './application';
// Export all methods from "application-settings" as ApplicationSettings
import { clear, flush, getAllKeys, getBoolean, getNumber, getString, hasKey, remove, setBoolean, setNumber, setString } from './application-settings';
import { connectionType, getConnectionType, startMonitoring, stopMonitoring } from './connectivity';
// Export all methods from "http" as Http
import { getFile, getImage, getJSON, getString as httpGetString, request } from './http';
// Export methods from "profiling" module
import { disable as profilingDisable, dumpProfiles, enable as profilingEnable, isRunning, profile, resetProfiles, start, startCPUProfile, stop, stopCPUProfile, time, uptime } from './profiling';
import { addCategories, addWriter, categories, clearWriters, disable, enable, error, isEnabled, messageType, removeWriter, setCategories, setErrorHandler, write } from './trace';
import { ad as androidUtils, dispatchToMainThread, executeOnMainThread, GC, getModuleName, ios as iosUtils, isDataURI, isFileOrResourcePath, isFontIconURI, isMainThread, layout, mainThreadify, openFile, openUrl, releaseNativeObject } from './utils/utils';
export const Application = {
  launchEvent,
  displayedEvent,
  uncaughtErrorEvent,
  discardedErrorEvent,
  suspendEvent,
  resumeEvent,
  exitEvent,
  lowMemoryEvent,
  orientationChangedEvent,

  getMainEntry,
  getRootView,
  setResources,
  setCssFileName,
  getCssFileName,
  loadAppCss,
  addCss,
  on,
  off,
  run,
  orientation,
  getNativeApplication,
  hasLaunched,

  android,
  ios
};

export const ApplicationSettings = {
  clear,
  flush,
  hasKey,
  remove,
  setString,
  getString,
  getAllKeys,
  getBoolean,
  setBoolean,
  getNumber,
  setNumber
};


export const Connectivity = {
  connectionType,
  getConnectionType,
  startMonitoring,
  stopMonitoring
};


export const Http = {
  getFile,
  getImage,
  getJSON,
  getString: httpGetString,
  request
};



export const Profiling = {
  enable: profilingEnable,
  disable: profilingDisable,
  time,
  uptime,
  start,
  stop,
  isRunning,
  dumpProfiles,
  resetProfiles,
  profile,
  startCPUProfile,
  stopCPUProfile
};



export const Trace = {
  messageType,
  categories,
  setCategories,
  addCategories,
  addWriter,
  removeWriter,
  clearWriters,
  setErrorHandler,
  write,
  error,
  enable,
  disable,
  isEnabled
};



export const Utils = {
  GC,
  isFontIconURI,
  isDataURI,
  isFileOrResourcePath,
  executeOnMainThread,
  mainThreadify,
  isMainThread,
  dispatchToMainThread,
  releaseNativeObject,

  getModuleName,
  openFile,
  openUrl,

  layout,
  android: androidUtils,
  ios: iosUtils
};


