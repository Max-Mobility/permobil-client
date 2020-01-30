function __export(m) {
  for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, '__esModule', { value: true });
var application = require('../../application');
var frame_common_1 = require('./frame-common');
var fragment_transitions_1 = require('./fragment.transitions');
var builder_1 = require('../builder');
var system_classes_1 = require('../../css/system-classes');
var platform_1 = require('../../platform/platform');
var profiling_1 = require('../../profiling');
__export(require('./frame-common'));
var ANDROID_PLATFORM = 'android';
var INTENT_EXTRA = 'com.tns.activity';
var ROOT_VIEW_ID_EXTRA = 'com.tns.activity.rootViewId';
var FRAMEID = '_frameId';
var CALLBACKS = '_callbacks';
var HMR_REPLACE_TRANSITION = 'fade';
var ownerSymbol = Symbol('_owner');
var activityRootViewsMap = new Map();
var navDepth = -1;
var fragmentId = -1;
if (global && global.__inspector) {
  var devtools = require('../../debugger/devtools-elements');
  devtools.attachDOMInspectorEventCallbacks(global.__inspector);
  devtools.attachDOMInspectorCommandCallbacks(global.__inspector);
}
function getAttachListener() {
  if (!exports.attachStateChangeListener) {
    var AttachListener = (function(_super) {
      __extends(AttachListener, _super);
      function AttachListener() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
      }
      AttachListener.prototype.onViewAttachedToWindow = function(view) {
        var owner = view[ownerSymbol];
        if (owner) {
          owner._onAttachedToWindow();
        }
      };
      AttachListener.prototype.onViewDetachedFromWindow = function(view) {
        var owner = view[ownerSymbol];
        if (owner) {
          owner._onDetachedFromWindow();
        }
      };
      AttachListener = __decorate(
        [Interfaces([android.view.View.OnAttachStateChangeListener])],
        AttachListener
      );
      return AttachListener;
    })(java.lang.Object);
    exports.attachStateChangeListener = new AttachListener();
  }
  return exports.attachStateChangeListener;
}
var Frame = (function(_super) {
  __extends(Frame, _super);
  function Frame() {
    var _this = _super.call(this) || this;
    _this._containerViewId = -1;
    _this._tearDownPending = false;
    _this._attachedToWindow = false;
    _this._android = new AndroidFrame(_this);
    return _this;
  }
  Frame.reloadPage = function(context) {
    var activity = application.android.foregroundActivity;
    var callbacks = activity[CALLBACKS];
    if (callbacks) {
      var rootView = callbacks.getRootView();
      var isAppRootModuleChanged =
        context &&
        context.path &&
        context.path.includes(application.getMainEntry().moduleName) &&
        context.type !== 'style';
      if (
        isAppRootModuleChanged ||
        !rootView ||
        !rootView._onLivesync(context)
      ) {
        callbacks.resetActivityContent(activity);
      }
    } else {
      frame_common_1.traceError(activity + '[CALLBACKS] is null or undefined');
    }
  };
  Object.defineProperty(Frame, 'defaultAnimatedNavigation', {
    get: function() {
      return frame_common_1.FrameBase.defaultAnimatedNavigation;
    },
    set: function(value) {
      frame_common_1.FrameBase.defaultAnimatedNavigation = value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Frame, 'defaultTransition', {
    get: function() {
      return frame_common_1.FrameBase.defaultTransition;
    },
    set: function(value) {
      frame_common_1.FrameBase.defaultTransition = value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Frame.prototype, 'containerViewId', {
    get: function() {
      return this._containerViewId;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Frame.prototype, 'android', {
    get: function() {
      return this._android;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Frame.prototype, '_hasFragments', {
    get: function() {
      return true;
    },
    enumerable: true,
    configurable: true
  });
  Frame.prototype._onAttachedToWindow = function() {
    _super.prototype._onAttachedToWindow.call(this);
    if (this._manager && this._manager.isDestroyed()) {
      return;
    }
    this._attachedToWindow = true;
    this._processNextNavigationEntry();
  };
  Frame.prototype._onDetachedFromWindow = function() {
    _super.prototype._onDetachedFromWindow.call(this);
    this._attachedToWindow = false;
  };
  Frame.prototype._processNextNavigationEntry = function() {
    if (!this.isLoaded || this._executingContext || !this._attachedToWindow) {
      return;
    }
    var animatedEntries = fragment_transitions_1._getAnimatedEntries(
      this._android.frameId
    );
    if (animatedEntries) {
      if (animatedEntries.size > 0) {
        return;
      }
    }
    var manager = this._getFragmentManager();
    var entry = this._currentEntry;
    var isNewEntry =
      !this._cachedTransitionState ||
      entry !== this._cachedTransitionState.entry;
    if (
      isNewEntry &&
      entry &&
      manager &&
      !manager.findFragmentByTag(entry.fragmentTag)
    ) {
      var cachedTransitionState = getTransitionState(this._currentEntry);
      if (cachedTransitionState) {
        this._cachedTransitionState = cachedTransitionState;
        this._currentEntry = null;
        this._navigateCore(entry);
        this._currentEntry = entry;
      } else {
        _super.prototype._processNextNavigationEntry.call(this);
      }
    } else {
      _super.prototype._processNextNavigationEntry.call(this);
    }
  };
  Frame.prototype._getChildFragmentManager = function() {
    var backstackEntry;
    if (this._executingContext && this._executingContext.entry) {
      backstackEntry = this._executingContext.entry;
    } else {
      backstackEntry = this._currentEntry;
    }
    if (
      backstackEntry &&
      backstackEntry.fragment &&
      backstackEntry.fragment.isAdded()
    ) {
      return backstackEntry.fragment.getChildFragmentManager();
    }
    return null;
  };
  Frame.prototype._onRootViewReset = function() {
    _super.prototype._onRootViewReset.call(this);
    this.disposeCurrentFragment();
  };
  Frame.prototype.onLoaded = function() {
    if (this._originalBackground) {
      this.backgroundColor = null;
      this.backgroundColor = this._originalBackground;
      this._originalBackground = null;
    }
    _super.prototype.onLoaded.call(this);
  };
  Frame.prototype.onUnloaded = function() {
    _super.prototype.onUnloaded.call(this);
    this.disposeCurrentFragment();
  };
  Frame.prototype.disposeCurrentFragment = function() {
    if (
      !this._currentEntry ||
      !this._currentEntry.fragment ||
      !this._currentEntry.fragment.isAdded()
    ) {
      return;
    }
    var fragment = this._currentEntry.fragment;
    var fragmentManager = fragment.getFragmentManager();
    var transaction = fragmentManager.beginTransaction();
    var fragmentExitTransition = fragment.getExitTransition();
    if (
      fragmentExitTransition &&
      fragmentExitTransition instanceof
        org.nativescript.widgets.CustomTransition
    ) {
      fragmentExitTransition.setResetOnTransitionEnd(true);
    }
    transaction.remove(fragment);
    transaction.commitNowAllowingStateLoss();
  };
  Frame.prototype.createFragment = function(backstackEntry, fragmentTag) {
    ensureFragmentClass();
    var newFragment = new fragmentClass();
    var args = new android.os.Bundle();
    args.putInt(FRAMEID, this._android.frameId);
    newFragment.setArguments(args);
    setFragmentCallbacks(newFragment);
    var callbacks = newFragment[CALLBACKS];
    callbacks.frame = this;
    callbacks.entry = backstackEntry;
    backstackEntry.fragment = newFragment;
    backstackEntry.fragmentTag = fragmentTag;
    backstackEntry.navDepth = navDepth;
    return newFragment;
  };
  Frame.prototype.setCurrent = function(entry, navigationType) {
    var current = this._currentEntry;
    var currentEntryChanged = current !== entry;
    if (currentEntryChanged) {
      this._updateBackstack(entry, navigationType);
      if (this._tearDownPending) {
        this._tearDownPending = false;
        if (!entry.recreated) {
          clearEntry(entry);
        }
        if (current && !current.recreated) {
          clearEntry(current);
        }
        var context_1 = this._context;
        if (context_1 && !entry.recreated) {
          entry.fragment = this.createFragment(entry, entry.fragmentTag);
          entry.resolvedPage._setupUI(context_1);
        }
        entry.recreated = false;
        if (current) {
          current.recreated = false;
        }
      }
      _super.prototype.setCurrent.call(this, entry, navigationType);
      this._processNavigationQueue(entry.resolvedPage);
    } else {
      this._processNextNavigationEntry();
    }
    if (this._cachedTransitionState) {
      restoreTransitionState(this._currentEntry, this._cachedTransitionState);
      this._cachedTransitionState = null;
    }
    if (navigationType === frame_common_1.NavigationType.replace) {
      fragment_transitions_1._clearEntry(entry);
      var animated = this._getIsAnimatedNavigation(entry.entry);
      var navigationTransition = this._getNavigationTransition(entry.entry);
      var currentEntry = null;
      var newEntry = entry;
      var transaction = null;
      fragment_transitions_1._setAndroidFragmentTransitions(
        animated,
        navigationTransition,
        currentEntry,
        newEntry,
        this._android.frameId,
        transaction
      );
    }
  };
  Frame.prototype.onBackPressed = function() {
    if (this.canGoBack()) {
      this.goBack();
      return true;
    }
    if (!this.navigationQueueIsEmpty()) {
      var manager = this._getFragmentManager();
      if (manager) {
        manager.executePendingTransactions();
        return true;
      }
    }
    return false;
  };
  Frame.prototype._navigateCore = function(newEntry) {
    _super.prototype._navigateCore.call(this, newEntry);
    newEntry.frameId = this._android.frameId;
    var activity = this._android.activity;
    if (!activity) {
      var currentActivity = this._android.currentActivity;
      if (currentActivity) {
        startActivity(currentActivity, this._android.frameId);
      }
      return;
    }
    var manager = this._getFragmentManager();
    var clearHistory = newEntry.entry.clearHistory;
    var currentEntry = this._currentEntry;
    if (clearHistory) {
      navDepth = -1;
    }
    var isReplace =
      this._executingContext &&
      this._executingContext.navigationType ===
        frame_common_1.NavigationType.replace;
    if (!isReplace) {
      navDepth++;
    }
    fragmentId++;
    var newFragmentTag = 'fragment' + fragmentId + '[' + navDepth + ']';
    var newFragment = this.createFragment(newEntry, newFragmentTag);
    var transaction = manager.beginTransaction();
    var animated = currentEntry
      ? this._getIsAnimatedNavigation(newEntry.entry)
      : false;
    var navigationTransition;
    if (isReplace) {
      animated = true;
      navigationTransition = { name: HMR_REPLACE_TRANSITION, duration: 100 };
    } else if (this._currentEntry) {
      navigationTransition = this._getNavigationTransition(newEntry.entry);
    } else {
      navigationTransition = null;
    }
    var isNestedDefaultTransition = !currentEntry;
    fragment_transitions_1._setAndroidFragmentTransitions(
      animated,
      navigationTransition,
      currentEntry,
      newEntry,
      this._android.frameId,
      transaction,
      isNestedDefaultTransition
    );
    if (currentEntry && animated && !navigationTransition) {
    }
    transaction.replace(this.containerViewId, newFragment, newFragmentTag);
    transaction.commitAllowingStateLoss();
  };
  Frame.prototype._goBackCore = function(backstackEntry) {
    _super.prototype._goBackCore.call(this, backstackEntry);
    navDepth = backstackEntry.navDepth;
    var manager = this._getFragmentManager();
    var transaction = manager.beginTransaction();
    if (!backstackEntry.fragment) {
      backstackEntry.fragment = this.createFragment(
        backstackEntry,
        backstackEntry.fragmentTag
      );
      fragment_transitions_1._updateTransitions(backstackEntry);
    }
    fragment_transitions_1._reverseTransitions(
      backstackEntry,
      this._currentEntry
    );
    transaction.replace(
      this.containerViewId,
      backstackEntry.fragment,
      backstackEntry.fragmentTag
    );
    transaction.commitAllowingStateLoss();
  };
  Frame.prototype._removeEntry = function(removed) {
    _super.prototype._removeEntry.call(this, removed);
    if (removed.fragment) {
      fragment_transitions_1._clearEntry(removed);
    }
    removed.fragment = null;
    removed.viewSavedState = null;
  };
  Frame.prototype.createNativeView = function() {
    if (this._currentEntry) {
      this._pushInFrameStack();
    }
    return new org.nativescript.widgets.ContentLayout(this._context);
  };
  Frame.prototype.initNativeView = function() {
    _super.prototype.initNativeView.call(this);
    var listener = getAttachListener();
    this.nativeViewProtected.addOnAttachStateChangeListener(listener);
    this.nativeViewProtected[ownerSymbol] = this;
    this._android.rootViewGroup = this.nativeViewProtected;
    if (this._containerViewId < 0) {
      this._containerViewId = android.view.View.generateViewId();
    }
    this._android.rootViewGroup.setId(this._containerViewId);
  };
  Frame.prototype.disposeNativeView = function() {
    var listener = getAttachListener();
    this.nativeViewProtected.removeOnAttachStateChangeListener(listener);
    this.nativeViewProtected[ownerSymbol] = null;
    this._tearDownPending = !!this._executingContext;
    var current = this._currentEntry;
    var executingEntry = this._executingContext
      ? this._executingContext.entry
      : null;
    this.backStack.forEach(function(entry) {
      if (entry !== executingEntry) {
        clearEntry(entry);
      }
    });
    if (current && !executingEntry) {
      clearEntry(current);
    }
    this._android.rootViewGroup = null;
    this._removeFromFrameStack();
    _super.prototype.disposeNativeView.call(this);
  };
  Frame.prototype._popFromFrameStack = function() {
    if (!this._isInFrameStack) {
      return;
    }
    _super.prototype._popFromFrameStack.call(this);
  };
  Frame.prototype._getNavBarVisible = function(page) {
    switch (this.actionBarVisibility) {
      case 'never':
        return false;
      case 'always':
        return true;
      default:
        if (page.actionBarHidden !== undefined) {
          return !page.actionBarHidden;
        }
        if (this._android && this._android.showActionBar !== undefined) {
          return this._android.showActionBar;
        }
        return true;
    }
  };
  Frame.prototype._saveFragmentsState = function() {
    this.backStack.forEach(function(entry) {
      var view = entry.resolvedPage.nativeViewProtected;
      if (!entry.viewSavedState && view) {
        var viewState = new android.util.SparseArray();
        view.saveHierarchyState(viewState);
        entry.viewSavedState = viewState;
      }
    });
  };
  __decorate([profiling_1.profile], Frame.prototype, '_navigateCore', null);
  return Frame;
})(frame_common_1.FrameBase);
exports.Frame = Frame;
function reloadPage(context) {
  console.log('reloadPage() is deprecated. Use Frame.reloadPage() instead.');
  return Frame.reloadPage(context);
}
exports.reloadPage = reloadPage;
global.__onLiveSyncCore = Frame.reloadPage;
function cloneExpandedTransitionListener(expandedTransitionListener) {
  if (!expandedTransitionListener) {
    return null;
  }
  var cloneTransition = expandedTransitionListener.transition.clone();
  return fragment_transitions_1.addNativeTransitionListener(
    expandedTransitionListener.entry,
    cloneTransition
  );
}
function getTransitionState(entry) {
  var expandedEntry = entry;
  var transitionState = {};
  if (
    expandedEntry.enterTransitionListener &&
    expandedEntry.exitTransitionListener
  ) {
    transitionState.enterTransitionListener = cloneExpandedTransitionListener(
      expandedEntry.enterTransitionListener
    );
    transitionState.exitTransitionListener = cloneExpandedTransitionListener(
      expandedEntry.exitTransitionListener
    );
    transitionState.reenterTransitionListener = cloneExpandedTransitionListener(
      expandedEntry.reenterTransitionListener
    );
    transitionState.returnTransitionListener = cloneExpandedTransitionListener(
      expandedEntry.returnTransitionListener
    );
    transitionState.transitionName = expandedEntry.transitionName;
    transitionState.entry = entry;
  } else {
    return null;
  }
  return transitionState;
}
function restoreTransitionState(entry, snapshot) {
  var expandedEntry = entry;
  if (snapshot.enterTransitionListener) {
    expandedEntry.enterTransitionListener = snapshot.enterTransitionListener;
  }
  if (snapshot.exitTransitionListener) {
    expandedEntry.exitTransitionListener = snapshot.exitTransitionListener;
  }
  if (snapshot.reenterTransitionListener) {
    expandedEntry.reenterTransitionListener =
      snapshot.reenterTransitionListener;
  }
  if (snapshot.returnTransitionListener) {
    expandedEntry.returnTransitionListener = snapshot.returnTransitionListener;
  }
  expandedEntry.transitionName = snapshot.transitionName;
}
function clearEntry(entry) {
  if (entry.fragment) {
    fragment_transitions_1._clearFragment(entry);
  }
  entry.recreated = false;
  entry.fragment = null;
  var page = entry.resolvedPage;
  if (page && page._context) {
    entry.resolvedPage._tearDownUI(true);
  }
}
var framesCounter = 0;
var framesCache = new Array();
var AndroidFrame = (function(_super) {
  __extends(AndroidFrame, _super);
  function AndroidFrame(owner) {
    var _this = _super.call(this) || this;
    _this._showActionBar = true;
    _this._owner = owner;
    _this.frameId = framesCounter++;
    framesCache.push(new WeakRef(_this));
    return _this;
  }
  Object.defineProperty(AndroidFrame.prototype, 'showActionBar', {
    get: function() {
      return this._showActionBar;
    },
    set: function(value) {
      if (this._showActionBar !== value) {
        this._showActionBar = value;
        if (this.owner.currentPage) {
          this.owner.currentPage.actionBar.update();
        }
      }
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(AndroidFrame.prototype, 'activity', {
    get: function() {
      var activity = this.owner._context;
      if (activity) {
        return activity;
      }
      var currView = this._owner.parent;
      while (currView) {
        if (currView instanceof Frame) {
          return currView.android.activity;
        }
        currView = currView.parent;
      }
      return undefined;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(AndroidFrame.prototype, 'actionBar', {
    get: function() {
      var activity = this.currentActivity;
      if (!activity) {
        return undefined;
      }
      var bar = activity.getActionBar();
      if (!bar) {
        return undefined;
      }
      return bar;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(AndroidFrame.prototype, 'currentActivity', {
    get: function() {
      var activity = this.activity;
      if (activity) {
        return activity;
      }
      var frames = frame_common_1._stack();
      for (var length_1 = frames.length, i = length_1 - 1; i >= 0; i--) {
        activity = frames[i].android.activity;
        if (activity) {
          return activity;
        }
      }
      return undefined;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(AndroidFrame.prototype, 'owner', {
    get: function() {
      return this._owner;
    },
    enumerable: true,
    configurable: true
  });
  AndroidFrame.prototype.canGoBack = function() {
    if (!this.activity) {
      return false;
    }
    return (
      this.activity.getIntent().getAction() !==
      android.content.Intent.ACTION_MAIN
    );
  };
  AndroidFrame.prototype.fragmentForPage = function(entry) {
    var tag = entry && entry.fragmentTag;
    if (tag) {
      return this.owner._getFragmentManager().findFragmentByTag(tag);
    }
    return undefined;
  };
  return AndroidFrame;
})(frame_common_1.Observable);
function findPageForFragment(fragment, frame) {
  var fragmentTag = fragment.getTag();
  if (frame_common_1.traceEnabled()) {
    frame_common_1.traceWrite(
      'Finding page for ' + fragmentTag + '.',
      frame_common_1.traceCategories.NativeLifecycle
    );
  }
  var entry;
  var current = frame._currentEntry;
  var executingContext = frame._executingContext;
  if (current && current.fragmentTag === fragmentTag) {
    entry = current;
  } else if (
    executingContext &&
    executingContext.entry &&
    executingContext.entry.fragmentTag === fragmentTag
  ) {
    entry = executingContext.entry;
  }
  var page;
  if (entry) {
    entry.recreated = true;
    page = entry.resolvedPage;
  }
  if (page) {
    var callbacks = fragment[CALLBACKS];
    callbacks.frame = frame;
    callbacks.entry = entry;
    entry.fragment = fragment;
    fragment_transitions_1._updateTransitions(entry);
  } else {
    throw new Error('Could not find a page for ' + fragmentTag + '.');
  }
}
function startActivity(activity, frameId) {
  var intent = new android.content.Intent(activity, activity.getClass());
  intent.setAction(android.content.Intent.ACTION_DEFAULT);
  intent.putExtra(INTENT_EXTRA, frameId);
  activity.startActivity(intent);
}
function getFrameByNumberId(frameId) {
  for (var i = 0; i < framesCache.length; i++) {
    var aliveFrame = framesCache[i].get();
    if (aliveFrame && aliveFrame.frameId === frameId) {
      return aliveFrame.owner;
    }
  }
  return null;
}
function ensureFragmentClass() {
  if (fragmentClass) {
    return;
  }
  require('./fragment');
  if (!fragmentClass) {
    throw new Error(
      'Failed to initialize the extended androidx.fragment.app.Fragment class'
    );
  }
}
var fragmentClass;
function setFragmentClass(clazz) {
  if (fragmentClass) {
    throw new Error('Fragment class already initialized');
  }
  fragmentClass = clazz;
}
exports.setFragmentClass = setFragmentClass;
var FragmentCallbacksImplementation = (function() {
  function FragmentCallbacksImplementation() {
    this.backgroundBitmap = null;
  }
  FragmentCallbacksImplementation.prototype.onHiddenChanged = function(
    fragment,
    hidden,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        fragment + '.onHiddenChanged(' + hidden + ')',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    superFunc.call(fragment, hidden);
  };
  FragmentCallbacksImplementation.prototype.onCreateAnimator = function(
    fragment,
    transit,
    enter,
    nextAnim,
    superFunc
  ) {
    var animator = null;
    var entry = this.entry;
    if (enter && entry.isNestedDefaultTransition) {
      animator = entry.enterAnimator;
      entry.isNestedDefaultTransition = false;
    }
    return animator || superFunc.call(fragment, transit, enter, nextAnim);
  };
  FragmentCallbacksImplementation.prototype.onCreate = function(
    fragment,
    savedInstanceState,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        fragment + '.onCreate(' + savedInstanceState + ')',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    superFunc.call(fragment, savedInstanceState);
    if (!this.entry) {
      var args = fragment.getArguments();
      var frameId = args.getInt(FRAMEID);
      var frame = getFrameByNumberId(frameId);
      if (!frame) {
        throw new Error('Cannot find Frame for ' + fragment);
      }
      findPageForFragment(fragment, frame);
    }
  };
  FragmentCallbacksImplementation.prototype.onCreateView = function(
    fragment,
    inflater,
    container,
    savedInstanceState,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        fragment +
          '.onCreateView(inflater, container, ' +
          savedInstanceState +
          ')',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    var entry = this.entry;
    if (!entry) {
      frame_common_1.traceError(
        fragment + '.onCreateView: entry is null or undefined'
      );
      return null;
    }
    var page = entry.resolvedPage;
    if (!page) {
      frame_common_1.traceError(
        fragment + '.onCreateView: entry has no resolvedPage'
      );
      return null;
    }
    var frame = this.frame;
    if (!frame) {
      frame_common_1.traceError(
        fragment + '.onCreateView: this.frame is null or undefined'
      );
      return null;
    }
    if (page.parent === frame) {
      if (!page._context) {
        var context_2 =
          (container && container.getContext()) ||
          (inflater && inflater.getContext());
        page._setupUI(context_2);
      }
    } else {
      if (!frame._styleScope) {
        page._updateStyleScope();
      }
      frame._addView(page);
    }
    if (frame.isLoaded && !page.isLoaded) {
      page.callLoaded();
    }
    var savedState = entry.viewSavedState;
    if (savedState) {
      page.nativeViewProtected.restoreHierarchyState(savedState);
      entry.viewSavedState = null;
    }
    var nativeView = page.nativeViewProtected;
    if (nativeView != null) {
      var parentView = nativeView.getParent();
      if (parentView instanceof android.view.ViewGroup) {
        if (parentView.getChildCount() === 0) {
          parentView.addViewInLayout(
            nativeView,
            -1,
            new org.nativescript.widgets.CommonLayoutParams()
          );
        }
        parentView.removeAllViews();
      }
    }
    return page.nativeViewProtected;
  };
  FragmentCallbacksImplementation.prototype.onSaveInstanceState = function(
    fragment,
    outState,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        fragment + '.onSaveInstanceState(' + outState + ')',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    superFunc.call(fragment, outState);
  };
  FragmentCallbacksImplementation.prototype.onDestroyView = function(
    fragment,
    superFunc
  ) {
    try {
      if (frame_common_1.traceEnabled()) {
        frame_common_1.traceWrite(
          fragment + '.onDestroyView()',
          frame_common_1.traceCategories.NativeLifecycle
        );
      }
      var hasRemovingParent = fragment.getRemovingParentFragment();
      if (hasRemovingParent) {
        var bitmapDrawable = new android.graphics.drawable.BitmapDrawable(
          application.android.context.getResources(),
          this.backgroundBitmap
        );
        this.frame._originalBackground =
          this.frame.backgroundColor || new frame_common_1.Color('White');
        this.frame.nativeViewProtected.setBackgroundDrawable(bitmapDrawable);
        this.backgroundBitmap = null;
      }
    } finally {
      superFunc.call(fragment);
    }
  };
  FragmentCallbacksImplementation.prototype.onDestroy = function(
    fragment,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        fragment + '.onDestroy()',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    superFunc.call(fragment);
    var entry = this.entry;
    if (!entry) {
      frame_common_1.traceError(
        fragment + '.onDestroy: entry is null or undefined'
      );
      return null;
    }
    entry.fragment = null;
    var page = entry.resolvedPage;
    if (!page) {
      frame_common_1.traceError(
        fragment + '.onDestroy: entry has no resolvedPage'
      );
      return null;
    }
  };
  FragmentCallbacksImplementation.prototype.onPause = function(
    fragment,
    superFunc
  ) {
    try {
      var hasRemovingParent = fragment.getRemovingParentFragment();
      if (hasRemovingParent) {
        this.backgroundBitmap = this.loadBitmapFromView(
          this.frame.nativeViewProtected
        );
      }
    } finally {
      superFunc.call(fragment);
    }
  };
  FragmentCallbacksImplementation.prototype.onStop = function(
    fragment,
    superFunc
  ) {
    superFunc.call(fragment);
  };
  FragmentCallbacksImplementation.prototype.toStringOverride = function(
    fragment,
    superFunc
  ) {
    var entry = this.entry;
    if (entry) {
      return entry.fragmentTag + '<' + entry.resolvedPage + '>';
    } else {
      return 'NO ENTRY, ' + superFunc.call(fragment);
    }
  };
  FragmentCallbacksImplementation.prototype.loadBitmapFromView = function(
    view
  ) {
    if (!(view && view.getWidth() > 0 && view.getHeight() > 0)) {
      return undefined;
    }
    view.setDrawingCacheEnabled(true);
    var drawCache = view.getDrawingCache();
    var bitmap = android.graphics.Bitmap.createBitmap(drawCache);
    view.setDrawingCacheEnabled(false);
    return bitmap;
  };
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onHiddenChanged',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onCreateAnimator',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onCreate',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onCreateView',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onSaveInstanceState',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onDestroyView',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onDestroy',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onPause',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'onStop',
    null
  );
  __decorate(
    [profiling_1.profile],
    FragmentCallbacksImplementation.prototype,
    'toStringOverride',
    null
  );
  return FragmentCallbacksImplementation;
})();
var ActivityCallbacksImplementation = (function() {
  function ActivityCallbacksImplementation() {}
  ActivityCallbacksImplementation.prototype.getRootView = function() {
    return this._rootView;
  };
  ActivityCallbacksImplementation.prototype.onCreate = function(
    activity,
    savedInstanceState,
    intentOrSuperFunc,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'Activity.onCreate(' + savedInstanceState + ')',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    var intent = superFunc ? intentOrSuperFunc : undefined;
    if (!superFunc) {
      console.log(
        'AndroidActivityCallbacks.onCreate(activity: any, savedInstanceState: any, superFunc: Function) ' +
          'is deprecated. Use AndroidActivityCallbacks.onCreate(activity: any, savedInstanceState: any, intent: any, superFunc: Function) instead.'
      );
      superFunc = intentOrSuperFunc;
    }
    var isRestart = !!savedInstanceState && exports.moduleLoaded;
    superFunc.call(activity, isRestart ? savedInstanceState : null);
    if (savedInstanceState) {
      var rootViewId = savedInstanceState.getInt(ROOT_VIEW_ID_EXTRA, -1);
      if (rootViewId !== -1 && activityRootViewsMap.has(rootViewId)) {
        this._rootView = activityRootViewsMap.get(rootViewId).get();
      }
    }
    if (intent && intent.getAction()) {
      application.android.notify({
        eventName: application.AndroidApplication.activityNewIntentEvent,
        object: application.android,
        activity: activity,
        intent: intent
      });
    }
    this.setActivityContent(activity, savedInstanceState, true);
    exports.moduleLoaded = true;
  };
  ActivityCallbacksImplementation.prototype.onSaveInstanceState = function(
    activity,
    outState,
    superFunc
  ) {
    superFunc.call(activity, outState);
    var rootView = this._rootView;
    if (rootView instanceof Frame) {
      outState.putInt(INTENT_EXTRA, rootView.android.frameId);
      rootView._saveFragmentsState();
    }
    outState.putInt(ROOT_VIEW_ID_EXTRA, rootView._domId);
  };
  ActivityCallbacksImplementation.prototype.onNewIntent = function(
    activity,
    intent,
    superSetIntentFunc,
    superFunc
  ) {
    superFunc.call(activity, intent);
    superSetIntentFunc.call(activity, intent);
    application.android.notify({
      eventName: application.AndroidApplication.activityNewIntentEvent,
      object: application.android,
      activity: activity,
      intent: intent
    });
  };
  ActivityCallbacksImplementation.prototype.onStart = function(
    activity,
    superFunc
  ) {
    superFunc.call(activity);
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'NativeScriptActivity.onStart();',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    var rootView = this._rootView;
    if (rootView && !rootView.isLoaded) {
      rootView.callLoaded();
    }
  };
  ActivityCallbacksImplementation.prototype.onStop = function(
    activity,
    superFunc
  ) {
    superFunc.call(activity);
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'NativeScriptActivity.onStop();',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    var rootView = this._rootView;
    if (rootView && rootView.isLoaded) {
      rootView.callUnloaded();
    }
  };
  ActivityCallbacksImplementation.prototype.onPostResume = function(
    activity,
    superFunc
  ) {
    superFunc.call(activity);
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'NativeScriptActivity.onPostResume();',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    if (activity.isNativeScriptActivity) {
      var args = {
        eventName: application.resumeEvent,
        object: application.android,
        android: activity
      };
      application.notify(args);
      application.android.paused = false;
    }
  };
  ActivityCallbacksImplementation.prototype.onDestroy = function(
    activity,
    superFunc
  ) {
    try {
      if (frame_common_1.traceEnabled()) {
        frame_common_1.traceWrite(
          'NativeScriptActivity.onDestroy();',
          frame_common_1.traceCategories.NativeLifecycle
        );
      }
      var rootView = this._rootView;
      if (rootView) {
        rootView._tearDownUI(true);
      }
      var exitArgs = {
        eventName: application.exitEvent,
        object: application.android,
        android: activity
      };
      application.notify(exitArgs);
    } finally {
      superFunc.call(activity);
    }
  };
  ActivityCallbacksImplementation.prototype.onBackPressed = function(
    activity,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'NativeScriptActivity.onBackPressed;',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    var args = {
      eventName: 'activityBackPressed',
      object: application.android,
      activity: activity,
      cancel: false
    };
    application.android.notify(args);
    if (args.cancel) {
      return;
    }
    var view = this._rootView;
    var callSuper = false;
    if (view instanceof Frame) {
      callSuper = !frame_common_1.FrameBase.goBack();
    } else {
      var viewArgs = {
        eventName: 'activityBackPressed',
        object: view,
        activity: activity,
        cancel: false
      };
      view.notify(viewArgs);
      if (!viewArgs.cancel && !view.onBackPressed()) {
        callSuper = true;
      }
    }
    if (callSuper) {
      superFunc.call(activity);
    }
  };
  ActivityCallbacksImplementation.prototype.onRequestPermissionsResult = function(
    activity,
    requestCode,
    permissions,
    grantResults,
    superFunc
  ) {
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'NativeScriptActivity.onRequestPermissionsResult;',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    application.android.notify({
      eventName: 'activityRequestPermissions',
      object: application.android,
      activity: activity,
      requestCode: requestCode,
      permissions: permissions,
      grantResults: grantResults
    });
  };
  ActivityCallbacksImplementation.prototype.onActivityResult = function(
    activity,
    requestCode,
    resultCode,
    data,
    superFunc
  ) {
    superFunc.call(activity, requestCode, resultCode, data);
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'NativeScriptActivity.onActivityResult(' +
          requestCode +
          ', ' +
          resultCode +
          ', ' +
          data +
          ')',
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    application.android.notify({
      eventName: 'activityResult',
      object: application.android,
      activity: activity,
      requestCode: requestCode,
      resultCode: resultCode,
      intent: data
    });
  };
  ActivityCallbacksImplementation.prototype.resetActivityContent = function(
    activity
  ) {
    if (this._rootView) {
      var manager = this._rootView._getFragmentManager();
      manager.executePendingTransactions();
      this._rootView._onRootViewReset();
    }
    this._rootView = null;
    this.setActivityContent(activity, null, false);
    this._rootView.callLoaded();
  };
  ActivityCallbacksImplementation.prototype.setActivityContent = function(
    activity,
    savedInstanceState,
    fireLaunchEvent
  ) {
    var _this = this;
    var rootView = this._rootView;
    if (frame_common_1.traceEnabled()) {
      frame_common_1.traceWrite(
        'Frame.setActivityContent rootView: ' +
          rootView +
          ' shouldCreateRootFrame: false fireLaunchEvent: ' +
          fireLaunchEvent,
        frame_common_1.traceCategories.NativeLifecycle
      );
    }
    if (!rootView) {
      var mainEntry = application.getMainEntry();
      var intent = activity.getIntent();
      if (fireLaunchEvent) {
        rootView = notifyLaunch(intent, savedInstanceState);
      }
      if (!rootView) {
        if (!mainEntry) {
          throw new Error(
            'Main entry is missing. App cannot be started. Verify app bootstrap.'
          );
        }
        rootView = builder_1.Builder.createViewFromEntry(mainEntry);
      }
      this._rootView = rootView;
      activityRootViewsMap.set(rootView._domId, new WeakRef(rootView));
      var deviceType = platform_1.device.deviceType.toLowerCase();
      system_classes_1.pushToSystemCssClasses(
        '' + system_classes_1.CLASS_PREFIX + ANDROID_PLATFORM
      );
      system_classes_1.pushToSystemCssClasses(
        '' + system_classes_1.CLASS_PREFIX + deviceType
      );
      system_classes_1.pushToSystemCssClasses(
        '' + system_classes_1.CLASS_PREFIX + application.android.orientation
      );
      system_classes_1.pushToSystemCssClasses(
        '' +
          system_classes_1.CLASS_PREFIX +
          application.android.systemAppearance
      );
      this._rootView.cssClasses.add(system_classes_1.ROOT_VIEW_CSS_CLASS);
      var rootViewCssClasses = system_classes_1.getSystemCssClasses();
      rootViewCssClasses.forEach(function(c) {
        return _this._rootView.cssClasses.add(c);
      });
    }
    rootView._setupAsRootView(activity);
    activity.setContentView(
      rootView.nativeViewProtected,
      new org.nativescript.widgets.CommonLayoutParams()
    );
  };
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onCreate',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onSaveInstanceState',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onNewIntent',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onStart',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onStop',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onPostResume',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onDestroy',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onBackPressed',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onRequestPermissionsResult',
    null
  );
  __decorate(
    [profiling_1.profile],
    ActivityCallbacksImplementation.prototype,
    'onActivityResult',
    null
  );
  return ActivityCallbacksImplementation;
})();
var notifyLaunch = profiling_1.profile('notifyLaunch', function notifyLaunch(
  intent,
  savedInstanceState
) {
  var launchArgs = {
    eventName: application.launchEvent,
    object: application.android,
    android: intent,
    savedInstanceState: savedInstanceState
  };
  application.notify(launchArgs);
  application.notify({
    eventName: 'loadAppCss',
    object: this,
    cssFile: application.getCssFileName()
  });
  return launchArgs.root;
});
function setActivityCallbacks(activity) {
  activity[CALLBACKS] = new ActivityCallbacksImplementation();
}
exports.setActivityCallbacks = setActivityCallbacks;
function setFragmentCallbacks(fragment) {
  fragment[CALLBACKS] = new FragmentCallbacksImplementation();
}
exports.setFragmentCallbacks = setFragmentCallbacks;
//# sourceMappingURL=frame.android.js.map
