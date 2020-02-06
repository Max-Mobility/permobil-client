function __export(m) {
  for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, '__esModule', { value: true });
var tab_strip_1 = require('../tab-navigation-base/tab-strip');
var tab_strip_item_1 = require('../tab-navigation-base/tab-strip-item');
var application = require('../../application');
var image_source_1 = require('../../image-source');
var utils_1 = require('../../utils/utils');
var view_1 = require('../core/view');
var frame_1 = require('../frame');
var tab_navigation_base_1 = require('../tab-navigation-base/tab-navigation-base');
var text_base_1 = require('../text-base');
var tabs_common_1 = require('./tabs-common');
__export(require('./tabs-common'));
var ACCENT_COLOR = 'colorAccent';
var PRIMARY_COLOR = 'colorPrimary';
var DEFAULT_ELEVATION = 4;
var TABID = '_tabId';
var INDEX = '_index';
var PagerAdapter;
var TabsBar;
var appResources;
function makeFragmentName(viewId, id) {
  return 'android:viewpager:' + viewId + ':' + id;
}
function getTabById(id) {
  var ref = exports.tabs.find(function(ref) {
    var tab = ref.get();
    return tab && tab._domId === id;
  });
  return ref && ref.get();
}
function initializeNativeClasses() {
  if (PagerAdapter) {
    return;
  }
  var TabFragmentImplementation = (function(_super) {
    __extends(TabFragmentImplementation, _super);
    function TabFragmentImplementation() {
      var _this = _super.call(this) || this;
      _this.backgroundBitmap = null;
      return global.__native(_this);
    }
    TabFragmentImplementation.newInstance = function(tabId, index) {
      var args = new android.os.Bundle();
      args.putInt(TABID, tabId);
      args.putInt(INDEX, index);
      var fragment = new TabFragmentImplementation();
      fragment.setArguments(args);
      return fragment;
    };
    TabFragmentImplementation.prototype.onCreate = function(
      savedInstanceState
    ) {
      _super.prototype.onCreate.call(this, savedInstanceState);
      var args = this.getArguments();
      this.owner = getTabById(args.getInt(TABID));
      this.index = args.getInt(INDEX);
      if (!this.owner) {
        throw new Error('Cannot find TabView');
      }
    };
    TabFragmentImplementation.prototype.onCreateView = function(
      inflater,
      container,
      savedInstanceState
    ) {
      var tabItem = this.owner.items[this.index];
      return tabItem.nativeViewProtected;
    };
    TabFragmentImplementation.prototype.onDestroyView = function() {
      var hasRemovingParent = this.getRemovingParentFragment();
      if (hasRemovingParent && this.owner.selectedIndex === this.index) {
        var bitmapDrawable = new android.graphics.drawable.BitmapDrawable(
          appResources,
          this.backgroundBitmap
        );
        this.owner._originalBackground =
          this.owner.backgroundColor || new view_1.Color('White');
        this.owner.nativeViewProtected.setBackgroundDrawable(bitmapDrawable);
        this.backgroundBitmap = null;
      }
      _super.prototype.onDestroyView.call(this);
    };
    TabFragmentImplementation.prototype.onPause = function() {
      var hasRemovingParent = this.getRemovingParentFragment();
      if (hasRemovingParent && this.owner.selectedIndex === this.index) {
        this.backgroundBitmap = this.loadBitmapFromView(
          this.owner.nativeViewProtected
        );
      }
      _super.prototype.onPause.call(this);
    };
    TabFragmentImplementation.prototype.loadBitmapFromView = function(view) {
      view.setDrawingCacheEnabled(true);
      var bitmap = android.graphics.Bitmap.createBitmap(view.getDrawingCache());
      view.setDrawingCacheEnabled(false);
      return bitmap;
    };
    return TabFragmentImplementation;
  })(org.nativescript.widgets.FragmentBase);
  var POSITION_UNCHANGED = -1;
  var POSITION_NONE = -2;
  var FragmentPagerAdapter = (function(_super) {
    __extends(FragmentPagerAdapter, _super);
    function FragmentPagerAdapter(owner) {
      var _this = _super.call(this) || this;
      _this.owner = owner;
      return global.__native(_this);
    }
    FragmentPagerAdapter.prototype.getCount = function() {
      var items = this.items;
      return items ? items.length : 0;
    };
    FragmentPagerAdapter.prototype.getPageTitle = function(index) {
      var items = this.items;
      if (index < 0 || index >= items.length) {
        return '';
      }
      return '';
    };
    FragmentPagerAdapter.prototype.startUpdate = function(container) {
      if (container.getId() === android.view.View.NO_ID) {
        throw new Error(
          'ViewPager with adapter ' + this + ' requires a view containerId'
        );
      }
    };
    FragmentPagerAdapter.prototype.instantiateItem = function(
      container,
      position
    ) {
      var fragmentManager = this.owner._getFragmentManager();
      if (!this.mCurTransaction) {
        this.mCurTransaction = fragmentManager.beginTransaction();
      }
      var itemId = this.getItemId(position);
      var name = makeFragmentName(container.getId(), itemId);
      var fragment = fragmentManager.findFragmentByTag(name);
      if (fragment != null) {
        this.mCurTransaction.attach(fragment);
      } else {
        fragment = TabFragmentImplementation.newInstance(
          this.owner._domId,
          position
        );
        this.mCurTransaction.add(container.getId(), fragment, name);
      }
      if (fragment !== this.mCurrentPrimaryItem) {
        fragment.setMenuVisibility(false);
        fragment.setUserVisibleHint(false);
      }
      var tabItems = this.owner.items;
      var tabItem = tabItems ? tabItems[position] : null;
      if (tabItem) {
        tabItem.canBeLoaded = true;
      }
      return fragment;
    };
    FragmentPagerAdapter.prototype.getItemPosition = function(object) {
      return this.items ? POSITION_UNCHANGED : POSITION_NONE;
    };
    FragmentPagerAdapter.prototype.destroyItem = function(
      container,
      position,
      object
    ) {
      if (!this.mCurTransaction) {
        var fragmentManager = this.owner._getFragmentManager();
        this.mCurTransaction = fragmentManager.beginTransaction();
      }
      var fragment = object;
      this.mCurTransaction.detach(fragment);
      if (this.mCurrentPrimaryItem === fragment) {
        this.mCurrentPrimaryItem = null;
      }
      var tabItems = this.owner.items;
      var tabItem = tabItems ? tabItems[position] : null;
      if (tabItem) {
        tabItem.canBeLoaded = false;
      }
    };
    FragmentPagerAdapter.prototype.setPrimaryItem = function(
      container,
      position,
      object
    ) {
      var fragment = object;
      if (fragment !== this.mCurrentPrimaryItem) {
        if (this.mCurrentPrimaryItem != null) {
          this.mCurrentPrimaryItem.setMenuVisibility(false);
          this.mCurrentPrimaryItem.setUserVisibleHint(false);
        }
        if (fragment != null) {
          fragment.setMenuVisibility(true);
          fragment.setUserVisibleHint(true);
        }
        this.mCurrentPrimaryItem = fragment;
        this.owner.selectedIndex = position;
        var tab = this.owner;
        var tabItems = tab.items;
        var newTabItem = tabItems ? tabItems[position] : null;
        if (newTabItem) {
          tab._loadUnloadTabItems(tab.selectedIndex);
        }
      }
    };
    FragmentPagerAdapter.prototype.finishUpdate = function(container) {
      this._commitCurrentTransaction();
    };
    FragmentPagerAdapter.prototype.isViewFromObject = function(view, object) {
      return object.getView() === view;
    };
    FragmentPagerAdapter.prototype.saveState = function() {
      this._commitCurrentTransaction();
      return null;
    };
    FragmentPagerAdapter.prototype.restoreState = function(state, loader) {};
    FragmentPagerAdapter.prototype.getItemId = function(position) {
      return position;
    };
    FragmentPagerAdapter.prototype._commitCurrentTransaction = function() {
      if (this.mCurTransaction != null) {
        this.mCurTransaction.commitNowAllowingStateLoss();
        this.mCurTransaction = null;
      }
    };
    return FragmentPagerAdapter;
  })(androidx.viewpager.widget.PagerAdapter);
  var TabsBarImplementation = (function(_super) {
    __extends(TabsBarImplementation, _super);
    function TabsBarImplementation(context, owner) {
      var _this = _super.call(this, context) || this;
      _this.owner = owner;
      return global.__native(_this);
    }
    TabsBarImplementation.prototype.onSelectedPositionChange = function(
      position,
      prevPosition
    ) {
      var owner = this.owner;
      if (!owner) {
        return;
      }
      var tabStripItems = owner.tabStrip && owner.tabStrip.items;
      if (position >= 0 && tabStripItems && tabStripItems[position]) {
        tabStripItems[position]._emit(
          tab_strip_item_1.TabStripItem.selectEvent
        );
      }
      if (prevPosition >= 0 && tabStripItems && tabStripItems[prevPosition]) {
        tabStripItems[prevPosition]._emit(
          tab_strip_item_1.TabStripItem.unselectEvent
        );
      }
    };
    TabsBarImplementation.prototype.onTap = function(position) {
      var owner = this.owner;
      if (!owner) {
        return false;
      }
      var tabStrip = owner.tabStrip;
      var tabStripItems = tabStrip && tabStrip.items;
      if (position >= 0 && tabStripItems[position]) {
        tabStripItems[position]._emit(tab_strip_item_1.TabStripItem.tapEvent);
        tabStrip.notify({
          eventName: tab_strip_1.TabStrip.itemTapEvent,
          object: tabStrip,
          index: position
        });
      }
      if (!owner.items[position]) {
        return false;
      }
      return true;
    };
    return TabsBarImplementation;
  })(org.nativescript.widgets.TabsBar);
  PagerAdapter = FragmentPagerAdapter;
  TabsBar = TabsBarImplementation;
  appResources = application.android.context.getResources();
}
var defaultAccentColor = undefined;
function getDefaultAccentColor(context) {
  if (defaultAccentColor === undefined) {
    defaultAccentColor =
      utils_1.ad.resources.getPaletteColor(ACCENT_COLOR, context) || 0xff33b5e5;
  }
  return defaultAccentColor;
}
function setElevation(grid, tabsBar, tabsPosition) {
  var compat = androidx.core.view.ViewCompat;
  if (compat.setElevation) {
    var val = DEFAULT_ELEVATION * utils_1.layout.getDisplayDensity();
    if (tabsPosition === 'top') {
      compat.setElevation(grid, val);
    }
    compat.setElevation(tabsBar, val);
  }
}
exports.tabs = new Array();
function iterateIndexRange(index, eps, lastIndex, callback) {
  var rangeStart = Math.max(0, index - eps);
  var rangeEnd = Math.min(index + eps, lastIndex);
  for (var i = rangeStart; i <= rangeEnd; i++) {
    callback(i);
  }
}
var Tabs = (function(_super) {
  __extends(Tabs, _super);
  function Tabs() {
    var _this = _super.call(this) || this;
    _this._androidViewId = -1;
    exports.tabs.push(new WeakRef(_this));
    return _this;
  }
  Object.defineProperty(Tabs.prototype, '_hasFragments', {
    get: function() {
      return true;
    },
    enumerable: true,
    configurable: true
  });
  Tabs.prototype.onItemsChanged = function(oldItems, newItems) {
    _super.prototype.onItemsChanged.call(this, oldItems, newItems);
    if (oldItems) {
      oldItems.forEach(function(item, i, arr) {
        item.index = 0;
        item.tabItemSpec = null;
        item.setNativeView(null);
      });
    }
  };
  Tabs.prototype.createNativeView = function() {
    initializeNativeClasses();
    var context = this._context;
    var nativeView = new org.nativescript.widgets.GridLayout(context);
    var viewPager = new org.nativescript.widgets.TabViewPager(context);
    var tabsBar = new TabsBar(context, this);
    var lp = new org.nativescript.widgets.CommonLayoutParams();
    var primaryColor = utils_1.ad.resources.getPaletteColor(
      PRIMARY_COLOR,
      context
    );
    var accentColor = getDefaultAccentColor(context);
    lp.row = 1;
    if (this.tabsPosition === 'top') {
      nativeView.addRow(
        new org.nativescript.widgets.ItemSpec(
          1,
          org.nativescript.widgets.GridUnitType.auto
        )
      );
      nativeView.addRow(
        new org.nativescript.widgets.ItemSpec(
          1,
          org.nativescript.widgets.GridUnitType.star
        )
      );
      viewPager.setLayoutParams(lp);
    } else {
      nativeView.addRow(
        new org.nativescript.widgets.ItemSpec(
          1,
          org.nativescript.widgets.GridUnitType.star
        )
      );
      nativeView.addRow(
        new org.nativescript.widgets.ItemSpec(
          1,
          org.nativescript.widgets.GridUnitType.auto
        )
      );
      tabsBar.setLayoutParams(lp);
    }
    nativeView.addView(viewPager);
    nativeView.viewPager = viewPager;
    var adapter = new PagerAdapter(this);
    viewPager.setAdapter(adapter);
    viewPager.adapter = adapter;
    nativeView.addView(tabsBar);
    nativeView.tabsBar = tabsBar;
    setElevation(nativeView, tabsBar, this.tabsPosition);
    if (accentColor) {
      tabsBar.setSelectedIndicatorColors([accentColor]);
    }
    if (primaryColor) {
      tabsBar.setBackgroundColor(primaryColor);
    }
    return nativeView;
  };
  Tabs.prototype.initNativeView = function() {
    _super.prototype.initNativeView.call(this);
    if (this._androidViewId < 0) {
      this._androidViewId = android.view.View.generateViewId();
    }
    var nativeView = this.nativeViewProtected;
    this._tabsBar = nativeView.tabsBar;
    var viewPager = nativeView.viewPager;
    viewPager.setId(this._androidViewId);
    this._viewPager = viewPager;
    this._pagerAdapter = viewPager.adapter;
    this._pagerAdapter.owner = this;
  };
  Tabs.prototype._loadUnloadTabItems = function(newIndex) {
    var _this = this;
    var items = this.items;
    if (!items) {
      return;
    }
    var lastIndex = items.length - 1;
    var offsideItems = this.offscreenTabLimit;
    var toUnload = [];
    var toLoad = [];
    iterateIndexRange(newIndex, offsideItems, lastIndex, function(i) {
      return toLoad.push(i);
    });
    items.forEach(function(item, i) {
      var indexOfI = toLoad.indexOf(i);
      if (indexOfI < 0) {
        toUnload.push(i);
      }
    });
    toUnload.forEach(function(index) {
      var item = items[index];
      if (items[index]) {
        item.unloadView(item.content);
      }
    });
    var newItem = items[newIndex];
    var selectedView = newItem && newItem.content;
    if (selectedView instanceof frame_1.Frame) {
      selectedView._pushInFrameStackRecursive();
    }
    toLoad.forEach(function(index) {
      var item = items[index];
      if (_this.isLoaded && items[index]) {
        item.loadView(item.content);
      }
    });
  };
  Tabs.prototype.onLoaded = function() {
    _super.prototype.onLoaded.call(this);
    if (this._originalBackground) {
      this.backgroundColor = null;
      this.backgroundColor = this._originalBackground;
      this._originalBackground = null;
    }
    this.setItems(this.items);
    if (this.tabStrip) {
      this.setTabStripItems(this.tabStrip.items);
    }
  };
  Tabs.prototype.onUnloaded = function() {
    _super.prototype.onUnloaded.call(this);
    this.setItems(null);
    this.setTabStripItems(null);
  };
  Tabs.prototype.disposeNativeView = function() {
    this._tabsBar.setItems(null, null);
    this._pagerAdapter.owner = null;
    this._pagerAdapter = null;
    this._tabsBar = null;
    this._viewPager = null;
    _super.prototype.disposeNativeView.call(this);
  };
  Tabs.prototype._onRootViewReset = function() {
    _super.prototype._onRootViewReset.call(this);
    this.disposeCurrentFragments();
  };
  Tabs.prototype.disposeCurrentFragments = function() {
    var fragmentManager = this._getFragmentManager();
    var transaction = fragmentManager.beginTransaction();
    for (
      var _i = 0, _a = fragmentManager.getFragments().toArray();
      _i < _a.length;
      _i++
    ) {
      var fragment = _a[_i];
      transaction.remove(fragment);
    }
    transaction.commitNowAllowingStateLoss();
  };
  Tabs.prototype.shouldUpdateAdapter = function(items) {
    if (!this._pagerAdapter) {
      return false;
    }
    var currentPagerAdapterItems = this._pagerAdapter.items;
    if (!items && !currentPagerAdapterItems) {
      return false;
    }
    if (!items || !currentPagerAdapterItems) {
      return true;
    }
    if (items.length !== currentPagerAdapterItems.length) {
      return true;
    }
    var matchingItems = currentPagerAdapterItems.filter(function(currentItem) {
      return !!items.filter(function(item) {
        return item._domId === currentItem._domId;
      })[0];
    });
    if (matchingItems.length !== items.length) {
      return true;
    }
    return false;
  };
  Tabs.prototype.setItems = function(items) {
    if (this.shouldUpdateAdapter(items)) {
      this._pagerAdapter.items = items;
      if (items && items.length) {
        items.forEach(function(item, i) {
          item.index = i;
        });
      }
      this._pagerAdapter.notifyDataSetChanged();
    }
  };
  Tabs.prototype.setTabStripItems = function(items) {
    var _this = this;
    var length = items ? items.length : 0;
    if (length === 0) {
      this._tabsBar.setItems(null, null);
      return;
    }
    var tabItems = new Array();
    items.forEach(function(tabStripItem, i, arr) {
      tabStripItem._index = i;
      var tabItemSpec = _this.createTabItemSpec(tabStripItem);
      tabStripItem.tabItemSpec = tabItemSpec;
      tabItems.push(tabItemSpec);
    });
    var tabsBar = this._tabsBar;
    tabsBar.setItems(tabItems, this._viewPager);
    this.tabStrip.setNativeView(tabsBar);
    items.forEach(function(item, i, arr) {
      var tv = tabsBar.getTextViewForItemAt(i);
      item.setNativeView(tv);
    });
  };
  Tabs.prototype.createTabItemSpec = function(tabStripItem) {
    var tabItemSpec = new org.nativescript.widgets.TabItemSpec();
    if (tabStripItem.isLoaded) {
      var nestedLabel = tabStripItem.label;
      var title = nestedLabel.text;
      var textTransform = nestedLabel.style.textTransform;
      if (textTransform) {
        title = text_base_1.getTransformedText(title, textTransform);
      }
      tabItemSpec.title = title;
      var backgroundColor = tabStripItem.style.backgroundColor;
      if (backgroundColor) {
        tabItemSpec.backgroundColor = backgroundColor.android;
      }
      var color = nestedLabel.style.color;
      if (color) {
        tabItemSpec.color = color.android;
      }
      var fontInternal = nestedLabel.style.fontInternal;
      if (fontInternal) {
        tabItemSpec.fontSize = fontInternal.fontSize;
        tabItemSpec.typeFace = fontInternal.getAndroidTypeface();
      }
      var iconSource = tabStripItem.image && tabStripItem.image.src;
      if (iconSource) {
        var icon = this.getIcon(tabStripItem);
        if (icon) {
          tabItemSpec.iconDrawable = icon;
        } else {
        }
      }
    }
    return tabItemSpec;
  };
  Tabs.prototype.getIcon = function(tabStripItem) {
    var iconSource = tabStripItem.image && tabStripItem.image.src;
    var is;
    if (utils_1.isFontIconURI(iconSource)) {
      var fontIconCode = iconSource.split('//')[1];
      var target = tabStripItem.image ? tabStripItem.image : tabStripItem;
      var font = target.style.fontInternal;
      var color = target.style.color;
      is = image_source_1.ImageSource.fromFontIconCodeSync(
        fontIconCode,
        font,
        color
      );
    } else {
      is = image_source_1.ImageSource.fromFileOrResourceSync(iconSource);
    }
    var imageDrawable;
    if (is && is.android) {
      var image = is.android;
      if (this.tabStrip && this.tabStrip.isIconSizeFixed) {
        image = this.getFixedSizeIcon(image);
      }
      imageDrawable = new android.graphics.drawable.BitmapDrawable(
        appResources,
        image
      );
    } else {
    }
    return imageDrawable;
  };
  Tabs.prototype.getFixedSizeIcon = function(image) {
    var inWidth = image.getWidth();
    var inHeight = image.getHeight();
    var iconSpecSize = tab_navigation_base_1.getIconSpecSize({
      width: inWidth,
      height: inHeight
    });
    var widthPixels = iconSpecSize.width * utils_1.layout.getDisplayDensity();
    var heightPixels = iconSpecSize.height * utils_1.layout.getDisplayDensity();
    var scaledImage = android.graphics.Bitmap.createScaledBitmap(
      image,
      widthPixels,
      heightPixels,
      true
    );
    return scaledImage;
  };
  Tabs.prototype.updateAndroidItemAt = function(index, spec) {
    this._tabsBar.updateItemAt(index, spec);
  };
  Tabs.prototype.getTabBarBackgroundColor = function() {
    return this._tabsBar.getBackground();
  };
  Tabs.prototype.setTabBarBackgroundColor = function(value) {
    if (value instanceof view_1.Color) {
      this._tabsBar.setBackgroundColor(value.android);
    } else {
      this._tabsBar.setBackground(
        tryCloneDrawable(value, this.nativeViewProtected.getResources)
      );
    }
  };
  Tabs.prototype.getTabBarHighlightColor = function() {
    return getDefaultAccentColor(this._context);
  };
  Tabs.prototype.setTabBarHighlightColor = function(value) {
    var color = value instanceof view_1.Color ? value.android : value;
    this._tabsBar.setSelectedIndicatorColors([color]);
  };
  Tabs.prototype.setTabBarItemTitle = function(tabStripItem, value) {
    var tabStripItemIndex = this.tabStrip.items.indexOf(tabStripItem);
    var tabItemSpec = this.createTabItemSpec(tabStripItem);
    this.updateAndroidItemAt(tabStripItemIndex, tabItemSpec);
  };
  Tabs.prototype.setTabBarItemBackgroundColor = function(tabStripItem, value) {
    var tabStripItemIndex = this.tabStrip.items.indexOf(tabStripItem);
    var tabItemSpec = this.createTabItemSpec(tabStripItem);
    this.updateAndroidItemAt(tabStripItemIndex, tabItemSpec);
  };
  Tabs.prototype.setTabBarItemColor = function(tabStripItem, value) {
    if (typeof value === 'number') {
      tabStripItem.nativeViewProtected.setTextColor(value);
    } else {
      tabStripItem.nativeViewProtected.setTextColor(value.android);
    }
  };
  Tabs.prototype.setTabBarIconColor = function(tabStripItem, value) {
    var index = tabStripItem._index;
    var tabBarItem = this._tabsBar.getViewForItemAt(index);
    var imgView = tabBarItem.getChildAt(0);
    var drawable = this.getIcon(tabStripItem);
    imgView.setImageDrawable(drawable);
  };
  Tabs.prototype.setTabBarItemFontInternal = function(tabStripItem, value) {
    tabStripItem.nativeViewProtected.setTextSize(value.fontSize);
    tabStripItem.nativeViewProtected.setTypeface(value.getAndroidTypeface());
  };
  Tabs.prototype.setTabBarItemTextTransform = function(tabStripItem, value) {
    var nestedLabel = tabStripItem.label;
    var title = text_base_1.getTransformedText(nestedLabel.text, value);
    tabStripItem.nativeViewProtected.setText(title);
  };
  Tabs.prototype[
    tab_navigation_base_1.selectedIndexProperty.setNative
  ] = function(value) {
    var smoothScroll = true;
    this._viewPager.setCurrentItem(value, smoothScroll);
  };
  Tabs.prototype[tab_navigation_base_1.itemsProperty.getDefault] = function() {
    return null;
  };
  Tabs.prototype[tab_navigation_base_1.itemsProperty.setNative] = function(
    value
  ) {
    this.setItems(value);
    tab_navigation_base_1.selectedIndexProperty.coerce(this);
  };
  Tabs.prototype[
    tab_navigation_base_1.tabStripProperty.getDefault
  ] = function() {
    return null;
  };
  Tabs.prototype[tab_navigation_base_1.tabStripProperty.setNative] = function(
    value
  ) {
    this.setTabStripItems(value.items);
  };
  Tabs.prototype[tabs_common_1.swipeEnabledProperty.getDefault] = function() {
    return true;
  };
  Tabs.prototype[tabs_common_1.swipeEnabledProperty.setNative] = function(
    value
  ) {
    this._viewPager.setSwipePageEnabled(value);
  };
  Tabs.prototype[
    tabs_common_1.offscreenTabLimitProperty.getDefault
  ] = function() {
    return this._viewPager.getOffscreenPageLimit();
  };
  Tabs.prototype[tabs_common_1.offscreenTabLimitProperty.setNative] = function(
    value
  ) {
    this._viewPager.setOffscreenPageLimit(value);
  };
  return Tabs;
})(tabs_common_1.TabsBase);
exports.Tabs = Tabs;
function tryCloneDrawable(value, resources) {
  if (value) {
    var constantState = value.getConstantState();
    if (constantState) {
      return constantState.newDrawable(resources);
    }
  }
  return value;
}
//# sourceMappingURL=tabs.android.js.map