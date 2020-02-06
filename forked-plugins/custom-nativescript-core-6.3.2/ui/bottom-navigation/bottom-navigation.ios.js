function __export(m) {
  for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, '__esModule', { value: true });
var tab_strip_1 = require('../tab-navigation-base/tab-strip');
var tab_strip_item_1 = require('../tab-navigation-base/tab-strip-item');
var color_1 = require('../../color');
var image_source_1 = require('../../image-source');
var platform_1 = require('../../platform');
var utils_1 = require('../../utils/utils');
var view_1 = require('../core/view');
var frame_1 = require('../frame');
var tab_navigation_base_1 = require('../tab-navigation-base/tab-navigation-base');
var text_base_1 = require('../text-base');
__export(require('../tab-navigation-base/tab-content-item'));
__export(require('../tab-navigation-base/tab-navigation-base'));
__export(require('../tab-navigation-base/tab-strip'));
__export(require('../tab-navigation-base/tab-strip-item'));
var maxTabsCount = 5;
var majorVersion = utils_1.ios.MajorVersion;
var isPhone = platform_1.device.deviceType === 'Phone';
var UITabBarControllerImpl = (function(_super) {
  __extends(UITabBarControllerImpl, _super);
  function UITabBarControllerImpl() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  UITabBarControllerImpl.initWithOwner = function(owner) {
    var handler = UITabBarControllerImpl.new();
    handler._owner = owner;
    return handler;
  };
  UITabBarControllerImpl.prototype.viewWillAppear = function(animated) {
    _super.prototype.viewWillAppear.call(this, animated);
    var owner = this._owner.get();
    if (!owner) {
      return;
    }
    this.extendedLayoutIncludesOpaqueBars = true;
    view_1.ios.updateAutoAdjustScrollInsets(this, owner);
    if (!owner.parent) {
      owner.callLoaded();
    }
  };
  UITabBarControllerImpl.prototype.viewDidDisappear = function(animated) {
    _super.prototype.viewDidDisappear.call(this, animated);
    var owner = this._owner.get();
    if (
      owner &&
      !owner.parent &&
      owner.isLoaded &&
      !this.presentedViewController
    ) {
      owner.callUnloaded();
    }
  };
  UITabBarControllerImpl.prototype.viewWillTransitionToSizeWithTransitionCoordinator = function(
    size,
    coordinator
  ) {
    var _this = this;
    _super.prototype.viewWillTransitionToSizeWithTransitionCoordinator.call(
      this,
      size,
      coordinator
    );
    UIViewControllerTransitionCoordinator.prototype.animateAlongsideTransitionCompletion.call(
      coordinator,
      function() {
        var owner = _this._owner.get();
        if (owner && owner.tabStrip && owner.tabStrip.items) {
          var tabStrip_1 = owner.tabStrip;
          tabStrip_1.items.forEach(function(tabStripItem) {
            updateBackgroundPositions(tabStrip_1, tabStripItem);
            var index = tabStripItem._index;
            var tabBarItemController = _this.viewControllers[index];
            updateTitleAndIconPositions(
              tabStripItem,
              tabBarItemController.tabBarItem,
              tabBarItemController
            );
          });
        }
      },
      null
    );
  };
  UITabBarControllerImpl.prototype.traitCollectionDidChange = function(
    previousTraitCollection
  ) {
    _super.prototype.traitCollectionDidChange.call(
      this,
      previousTraitCollection
    );
    if (majorVersion >= 13) {
      var owner = this._owner.get();
      if (
        owner &&
        this.traitCollection
          .hasDifferentColorAppearanceComparedToTraitCollection &&
        this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection(
          previousTraitCollection
        )
      ) {
        owner.notify({
          eventName: view_1.ios.traitCollectionColorAppearanceChangedEvent,
          object: owner
        });
      }
    }
  };
  return UITabBarControllerImpl;
})(UITabBarController);
var UITabBarControllerDelegateImpl = (function(_super) {
  __extends(UITabBarControllerDelegateImpl, _super);
  function UITabBarControllerDelegateImpl() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  UITabBarControllerDelegateImpl.initWithOwner = function(owner) {
    var delegate = UITabBarControllerDelegateImpl.new();
    delegate._owner = owner;
    return delegate;
  };
  UITabBarControllerDelegateImpl.prototype.tabBarControllerShouldSelectViewController = function(
    tabBarController,
    viewController
  ) {
    var owner = this._owner.get();
    if (owner) {
      var backToMoreWillBeVisible = false;
      owner._handleTwoNavigationBars(backToMoreWillBeVisible);
      if (tabBarController.viewControllers) {
        var position = tabBarController.viewControllers.indexOfObject(
          viewController
        );
        if (position !== NSNotFound) {
          var tabStrip = owner.tabStrip;
          var tabStripItems = tabStrip && tabStrip.items;
          if (tabStripItems && tabStripItems[position]) {
            tabStripItems[position]._emit(
              tab_strip_item_1.TabStripItem.tapEvent
            );
            tabStrip.notify({
              eventName: tab_strip_1.TabStrip.itemTapEvent,
              object: tabStrip,
              index: position
            });
          }
        }
      }
    }
    if (tabBarController.selectedViewController === viewController) {
      return false;
    }
    tabBarController._willSelectViewController = viewController;
    return true;
  };
  UITabBarControllerDelegateImpl.prototype.tabBarControllerDidSelectViewController = function(
    tabBarController,
    viewController
  ) {
    var owner = this._owner.get();
    if (owner) {
      if (tabBarController.viewControllers) {
        var position = tabBarController.viewControllers.indexOfObject(
          viewController
        );
        if (position !== NSNotFound) {
          var prevPosition = owner.selectedIndex;
          var tabStripItems = owner.tabStrip && owner.tabStrip.items;
          if (tabStripItems) {
            if (tabStripItems[position]) {
              tabStripItems[position]._emit(
                tab_strip_item_1.TabStripItem.selectEvent
              );
            }
            if (tabStripItems[prevPosition]) {
              tabStripItems[prevPosition]._emit(
                tab_strip_item_1.TabStripItem.unselectEvent
              );
            }
          }
        }
      }
      owner._onViewControllerShown(viewController);
    }
    tabBarController._willSelectViewController = undefined;
  };
  UITabBarControllerDelegateImpl.ObjCProtocols = [UITabBarControllerDelegate];
  return UITabBarControllerDelegateImpl;
})(NSObject);
var UINavigationControllerDelegateImpl = (function(_super) {
  __extends(UINavigationControllerDelegateImpl, _super);
  function UINavigationControllerDelegateImpl() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  UINavigationControllerDelegateImpl.initWithOwner = function(owner) {
    var delegate = UINavigationControllerDelegateImpl.new();
    delegate._owner = owner;
    return delegate;
  };
  UINavigationControllerDelegateImpl.prototype.navigationControllerWillShowViewControllerAnimated = function(
    navigationController,
    viewController,
    animated
  ) {
    var owner = this._owner.get();
    if (owner) {
      var backToMoreWillBeVisible = owner._ios.viewControllers.containsObject(
        viewController
      );
      owner._handleTwoNavigationBars(backToMoreWillBeVisible);
    }
  };
  UINavigationControllerDelegateImpl.prototype.navigationControllerDidShowViewControllerAnimated = function(
    navigationController,
    viewController,
    animated
  ) {
    navigationController.navigationBar.topItem.rightBarButtonItem = null;
    var owner = this._owner.get();
    if (owner) {
      owner._onViewControllerShown(viewController);
    }
  };
  UINavigationControllerDelegateImpl.ObjCProtocols = [
    UINavigationControllerDelegate
  ];
  return UINavigationControllerDelegateImpl;
})(NSObject);
function updateBackgroundPositions(tabStrip, tabStripItem) {
  var bgView = tabStripItem.bgView;
  if (!bgView) {
    var index_1 = tabStripItem._index;
    var width = tabStrip.nativeView.frame.size.width / tabStrip.items.length;
    var frame = CGRectMake(
      width * index_1,
      0,
      width,
      tabStrip.nativeView.frame.size.width
    );
    bgView = UIView.alloc().initWithFrame(frame);
    tabStrip.nativeView.insertSubviewAtIndex(bgView, 0);
    tabStripItem.bgView = bgView;
  } else {
    var index_2 = tabStripItem._index;
    var width = tabStrip.nativeView.frame.size.width / tabStrip.items.length;
    var frame = CGRectMake(
      width * index_2,
      0,
      width,
      tabStrip.nativeView.frame.size.width
    );
    bgView.frame = frame;
  }
  var backgroundColor = tabStripItem.style.backgroundColor;
  bgView.backgroundColor =
    backgroundColor instanceof color_1.Color
      ? backgroundColor.ios
      : backgroundColor;
}
function updateTitleAndIconPositions(tabStripItem, tabBarItem, controller) {
  if (!tabStripItem || !tabBarItem) {
    return;
  }
  var orientation = controller.interfaceOrientation;
  var isPortrait = orientation !== 4 && orientation !== 3;
  var isIconAboveTitle = majorVersion < 11 || (isPhone && isPortrait);
  if (!tabStripItem.iconSource) {
    if (isIconAboveTitle) {
      tabBarItem.titlePositionAdjustment = { horizontal: 0, vertical: -20 };
    } else {
      tabBarItem.titlePositionAdjustment = { horizontal: 0, vertical: 0 };
    }
  }
  if (!tabStripItem.title) {
    if (isIconAboveTitle) {
      tabBarItem.imageInsets = new UIEdgeInsets({
        top: 6,
        left: 0,
        bottom: -6,
        right: 0
      });
    } else {
      tabBarItem.imageInsets = new UIEdgeInsets({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      });
    }
  }
}
var BottomNavigation = (function(_super) {
  __extends(BottomNavigation, _super);
  function BottomNavigation() {
    var _this = _super.call(this) || this;
    _this._iconsCache = {};
    _this.viewController = _this._ios = UITabBarControllerImpl.initWithOwner(
      new WeakRef(_this)
    );
    _this.nativeViewProtected = _this._ios.view;
    return _this;
  }
  BottomNavigation.prototype.initNativeView = function() {
    _super.prototype.initNativeView.call(this);
    this._delegate = UITabBarControllerDelegateImpl.initWithOwner(
      new WeakRef(this)
    );
    this._moreNavigationControllerDelegate = UINavigationControllerDelegateImpl.initWithOwner(
      new WeakRef(this)
    );
    if (!this.tabStrip) {
      this.viewController.tabBar.hidden = true;
    }
  };
  BottomNavigation.prototype.disposeNativeView = function() {
    this._delegate = null;
    this._moreNavigationControllerDelegate = null;
    _super.prototype.disposeNativeView.call(this);
  };
  BottomNavigation.prototype.onLoaded = function() {
    _super.prototype.onLoaded.call(this);
    this.setViewControllers(this.items);
    var selectedIndex = this.selectedIndex;
    var selectedView =
      this.items &&
      this.items[selectedIndex] &&
      this.items[selectedIndex].content;
    if (selectedView instanceof frame_1.Frame) {
      selectedView._pushInFrameStackRecursive();
    }
    this._ios.delegate = this._delegate;
  };
  BottomNavigation.prototype.onUnloaded = function() {
    this._ios.delegate = null;
    this._ios.moreNavigationController.delegate = null;
    _super.prototype.onUnloaded.call(this);
  };
  Object.defineProperty(BottomNavigation.prototype, 'ios', {
    get: function() {
      return this._ios;
    },
    enumerable: true,
    configurable: true
  });
  BottomNavigation.prototype.layoutNativeView = function(
    left,
    top,
    right,
    bottom
  ) {};
  BottomNavigation.prototype._setNativeViewFrame = function(
    nativeView,
    frame
  ) {};
  BottomNavigation.prototype.onSelectedIndexChanged = function(
    oldIndex,
    newIndex
  ) {
    var items = this.items;
    if (!items) {
      return;
    }
    var oldItem = items[oldIndex];
    if (oldItem) {
      oldItem.canBeLoaded = false;
      oldItem.unloadView(oldItem.content);
    }
    var newItem = items[newIndex];
    if (newItem && this.isLoaded) {
      var selectedView = items[newIndex].content;
      if (selectedView instanceof frame_1.Frame) {
        selectedView._pushInFrameStackRecursive();
      }
      newItem.canBeLoaded = true;
      newItem.loadView(newItem.content);
    }
    _super.prototype.onSelectedIndexChanged.call(this, oldIndex, newIndex);
  };
  BottomNavigation.prototype.getTabBarBackgroundColor = function() {
    return this._ios.tabBar.barTintColor;
  };
  BottomNavigation.prototype.setTabBarBackgroundColor = function(value) {
    this._ios.tabBar.barTintColor =
      value instanceof color_1.Color ? value.ios : value;
  };
  BottomNavigation.prototype.setTabBarItemTitle = function(
    tabStripItem,
    value
  ) {
    tabStripItem.nativeView.title = value;
  };
  BottomNavigation.prototype.setTabBarItemBackgroundColor = function(
    tabStripItem,
    value
  ) {
    if (!this.tabStrip || !tabStripItem) {
      return;
    }
    updateBackgroundPositions(this.tabStrip, tabStripItem);
  };
  BottomNavigation.prototype.setTabBarItemColor = function(
    tabStripItem,
    value
  ) {
    var states = getTitleAttributesForStates(tabStripItem.label);
    applyStatesToItem(tabStripItem.nativeView, states);
  };
  BottomNavigation.prototype.setTabBarIconColor = function(
    tabStripItem,
    value
  ) {
    var image = this.getIcon(tabStripItem);
    tabStripItem.nativeView.image = image;
    tabStripItem.nativeView.selectedImage = image;
  };
  BottomNavigation.prototype.setTabBarItemFontInternal = function(
    tabStripItem,
    value
  ) {
    var states = getTitleAttributesForStates(tabStripItem.label);
    applyStatesToItem(tabStripItem.nativeView, states);
  };
  BottomNavigation.prototype.setTabBarItemTextTransform = function(
    tabStripItem,
    value
  ) {
    var title = text_base_1.getTransformedText(tabStripItem.label.text, value);
    tabStripItem.nativeView.title = title;
  };
  BottomNavigation.prototype.onMeasure = function(
    widthMeasureSpec,
    heightMeasureSpec
  ) {
    var width = utils_1.layout.getMeasureSpecSize(widthMeasureSpec);
    var widthMode = utils_1.layout.getMeasureSpecMode(widthMeasureSpec);
    var height = utils_1.layout.getMeasureSpecSize(heightMeasureSpec);
    var heightMode = utils_1.layout.getMeasureSpecMode(heightMeasureSpec);
    var widthAndState = view_1.View.resolveSizeAndState(
      width,
      width,
      widthMode,
      0
    );
    var heightAndState = view_1.View.resolveSizeAndState(
      height,
      height,
      heightMode,
      0
    );
    this.setMeasuredDimension(widthAndState, heightAndState);
  };
  BottomNavigation.prototype._onViewControllerShown = function(viewController) {
    if (
      this._ios.viewControllers &&
      this._ios.viewControllers.containsObject(viewController)
    ) {
      this.selectedIndex = this._ios.viewControllers.indexOfObject(
        viewController
      );
    } else {
    }
  };
  BottomNavigation.prototype._handleTwoNavigationBars = function(
    backToMoreWillBeVisible
  ) {
    var page =
      this.page || this._selectedView.page || this._selectedView.currentPage;
    if (!page || !page.frame) {
      return;
    }
    var actionBarVisible = page.frame._getNavBarVisible(page);
    if (backToMoreWillBeVisible && actionBarVisible) {
      page.frame.ios._disableNavBarAnimation = true;
      page.actionBarHidden = true;
      page.frame.ios._disableNavBarAnimation = false;
      this._actionBarHiddenByTabView = true;
      return;
    }
    if (!backToMoreWillBeVisible && this._actionBarHiddenByTabView) {
      page.frame.ios._disableNavBarAnimation = true;
      page.actionBarHidden = false;
      page.frame.ios._disableNavBarAnimation = false;
      this._actionBarHiddenByTabView = undefined;
      return;
    }
  };
  BottomNavigation.prototype.getViewController = function(item) {
    var newController = item.content ? item.content.viewController : null;
    if (newController) {
      item.setViewController(newController, newController.view);
      return newController;
    }
    if (item.content.ios instanceof UIViewController) {
      newController = item.content.ios;
      item.setViewController(newController, newController.view);
    } else if (
      item.content.ios &&
      item.content.ios.controller instanceof UIViewController
    ) {
      newController = item.content.ios.controller;
      item.setViewController(newController, newController.view);
    } else {
      newController = view_1.ios.UILayoutViewController.initWithOwner(
        new WeakRef(item.content)
      );
      newController.view.addSubview(item.content.nativeViewProtected);
      item.content.viewController = newController;
      item.setViewController(newController, item.content.nativeViewProtected);
    }
    return newController;
  };
  BottomNavigation.prototype.setViewControllers = function(items) {
    var _this = this;
    var length = items ? items.length : 0;
    if (length === 0) {
      this._ios.viewControllers = null;
      return;
    }
    items = items.slice(0, maxTabsCount);
    var controllers = NSMutableArray.alloc().initWithCapacity(length);
    if (this.tabStrip) {
      this.tabStrip.setNativeView(this._ios.tabBar);
    }
    items.forEach(function(item, i) {
      var controller = _this.getViewController(item);
      if (_this.tabStrip && _this.tabStrip.items && _this.tabStrip.items[i]) {
        var tabStripItem = _this.tabStrip.items[i];
        var tabBarItem = _this.createTabBarItem(tabStripItem, i);
        updateTitleAndIconPositions(tabStripItem, tabBarItem, controller);
        var states = getTitleAttributesForStates(tabStripItem.label);
        applyStatesToItem(tabBarItem, states);
        controller.tabBarItem = tabBarItem;
        tabStripItem._index = i;
        tabStripItem.setNativeView(tabBarItem);
      }
      controllers.addObject(controller);
    });
    this._ios.viewControllers = controllers;
    this._ios.customizableViewControllers = null;
    this._ios.moreNavigationController.delegate = this._moreNavigationControllerDelegate;
  };
  BottomNavigation.prototype.createTabBarItem = function(item, index) {
    var image;
    var title;
    if (item.isLoaded) {
      image = this.getIcon(item);
      title = item.label.text;
      var textTransform = item.label.style.textTransform;
      if (textTransform) {
        title = text_base_1.getTransformedText(title, textTransform);
      }
    }
    var tabBarItem = UITabBarItem.alloc().initWithTitleImageTag(
      title,
      image,
      index
    );
    return tabBarItem;
  };
  BottomNavigation.prototype.getIconRenderingMode = function() {
    switch (this.tabStrip && this.tabStrip.iosIconRenderingMode) {
      case 'alwaysOriginal':
        return 1;
      case 'alwaysTemplate':
        return 2;
      case 'automatic':
      default:
        return 0;
    }
  };
  BottomNavigation.prototype.getIcon = function(tabStripItem) {
    var iconSource = tabStripItem.image && tabStripItem.image.src;
    if (!iconSource) {
      return null;
    }
    var target = tabStripItem.image;
    var font = target.style.fontInternal;
    var color = target.style.color;
    var iconTag = [
      iconSource,
      font.fontStyle,
      font.fontWeight,
      font.fontSize,
      font.fontFamily,
      color
    ].join(';');
    var isFontIcon = false;
    var image = this._iconsCache[iconTag];
    if (!image) {
      var is = new image_source_1.ImageSource();
      if (utils_1.isFontIconURI(iconSource)) {
        isFontIcon = true;
        var fontIconCode = iconSource.split('//')[1];
        is = image_source_1.ImageSource.fromFontIconCodeSync(
          fontIconCode,
          font,
          color
        );
      } else {
        is = image_source_1.ImageSource.fromFileOrResourceSync(iconSource);
      }
      if (is && is.ios) {
        image = is.ios;
        if (this.tabStrip && this.tabStrip.isIconSizeFixed) {
          image = this.getFixedSizeIcon(image);
        }
        var renderingMode = 1;
        if (!isFontIcon) {
          renderingMode = this.getIconRenderingMode();
        }
        var originalRenderedImage = image.imageWithRenderingMode(renderingMode);
        this._iconsCache[iconTag] = originalRenderedImage;
        image = originalRenderedImage;
      } else {
      }
    }
    return image;
  };
  BottomNavigation.prototype.getFixedSizeIcon = function(image) {
    var inWidth = image.size.width;
    var inHeight = image.size.height;
    var iconSpecSize = tab_navigation_base_1.getIconSpecSize({
      width: inWidth,
      height: inHeight
    });
    var widthPts = iconSpecSize.width;
    var heightPts = iconSpecSize.height;
    UIGraphicsBeginImageContextWithOptions(
      { width: widthPts, height: heightPts },
      false,
      utils_1.layout.getDisplayDensity()
    );
    image.drawInRect(CGRectMake(0, 0, widthPts, heightPts));
    var resultImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return resultImage;
  };
  BottomNavigation.prototype[
    tab_navigation_base_1.selectedIndexProperty.setNative
  ] = function(value) {
    if (value > -1) {
      this._ios._willSelectViewController = this._ios.viewControllers[value];
      this._ios.selectedIndex = value;
    }
  };
  BottomNavigation.prototype[
    tab_navigation_base_1.itemsProperty.getDefault
  ] = function() {
    return null;
  };
  BottomNavigation.prototype[
    tab_navigation_base_1.itemsProperty.setNative
  ] = function(value) {
    if (value) {
      value.forEach(function(item, i) {
        item.index = i;
      });
    }
    this.setViewControllers(value);
    tab_navigation_base_1.selectedIndexProperty.coerce(this);
  };
  BottomNavigation.prototype[
    tab_navigation_base_1.tabStripProperty.getDefault
  ] = function() {
    return null;
  };
  BottomNavigation.prototype[
    tab_navigation_base_1.tabStripProperty.setNative
  ] = function(value) {
    this.setViewControllers(this.items);
    tab_navigation_base_1.selectedIndexProperty.coerce(this);
  };
  BottomNavigation = __decorate(
    [view_1.CSSType('BottomNavigation')],
    BottomNavigation
  );
  return BottomNavigation;
})(tab_navigation_base_1.TabNavigationBase);
exports.BottomNavigation = BottomNavigation;
function getTitleAttributesForStates(view) {
  var _a, _b;
  if (!view) {
    return null;
  }
  var result = {};
  var defaultTabItemFontSize = 10;
  var tabItemFontSize = view.style.fontSize || defaultTabItemFontSize;
  var font = view.style.fontInternal.getUIFont(
    UIFont.systemFontOfSize(tabItemFontSize)
  );
  var tabItemTextColor = view.style.color;
  var textColor =
    tabItemTextColor instanceof color_1.Color ? tabItemTextColor.ios : null;
  result.normalState = ((_a = {}), (_a[NSFontAttributeName] = font), _a);
  if (textColor) {
    result.normalState[UITextAttributeTextColor] = textColor;
  }
  var tabSelectedItemTextColor = view.style.color;
  var selectedTextColor =
    tabSelectedItemTextColor instanceof color_1.Color
      ? tabSelectedItemTextColor.ios
      : null;
  result.selectedState = ((_b = {}), (_b[NSFontAttributeName] = font), _b);
  if (selectedTextColor) {
    result.selectedState[UITextAttributeTextColor] = selectedTextColor;
  }
  return result;
}
function applyStatesToItem(item, states) {
  if (!states) {
    return;
  }
  item.setTitleTextAttributesForState(states.normalState, 0);
  item.setTitleTextAttributesForState(states.selectedState, 4);
}
//# sourceMappingURL=bottom-navigation.ios.js.map