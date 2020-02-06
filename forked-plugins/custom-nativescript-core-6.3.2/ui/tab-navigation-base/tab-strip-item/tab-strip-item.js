function __export(m) {
  for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, '__esModule', { value: true });
var view_1 = require('../../core/view');
var platform_1 = require('../../../platform');
var image_1 = require('../../image/image');
var label_1 = require('../../label/label');
__export(require('../../core/view'));
exports.traceCategory = 'TabView';
var TabStripItem = (function(_super) {
  __extends(TabStripItem, _super);
  function TabStripItem() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  TabStripItem_1 = TabStripItem;
  Object.defineProperty(TabStripItem.prototype, 'title', {
    get: function() {
      if (this.isLoaded) {
        return this.label.text;
      }
      return this._title;
    },
    set: function(value) {
      this._title = value;
      if (this.isLoaded) {
        this.label.text = value;
      }
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(TabStripItem.prototype, 'iconSource', {
    get: function() {
      if (this.isLoaded) {
        return this.image.src;
      }
      return this._iconSource;
    },
    set: function(value) {
      this._iconSource = value;
      if (this.isLoaded) {
        this.image.src = value;
      }
    },
    enumerable: true,
    configurable: true
  });
  TabStripItem.prototype.onLoaded = function() {
    var _this = this;
    if (!this.image) {
      var image = new image_1.Image();
      image.src = this.iconSource;
      this.image = image;
      this._addView(this.image);
    }
    if (!this.label) {
      var label = new label_1.Label();
      label.text = this.title;
      this.label = label;
      this._addView(this.label);
    }
    _super.prototype.onLoaded.call(this);
    this._labelColorHandler =
      this._labelColorHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent && tabStripParent.setTabBarItemColor(_this, args.value)
        );
      };
    this.label.style.on('colorChange', this._labelColorHandler);
    this._labelFontHandler =
      this._labelFontHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent &&
          tabStripParent.setTabBarItemFontInternal(_this, args.value)
        );
      };
    this.label.style.on('fontInternalChange', this._labelFontHandler);
    this._labelTextTransformHandler =
      this._labelTextTransformHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent &&
          tabStripParent.setTabBarItemTextTransform(_this, args.value)
        );
      };
    this.label.style.on('textTransformChange', this._labelTextTransformHandler);
    this._labelTextHandler =
      this._labelTextHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent && tabStripParent.setTabBarItemTitle(_this, args.value)
        );
      };
    this.label.on('textChange', this._labelTextHandler);
    this._imageColorHandler =
      this._imageColorHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent && tabStripParent.setTabBarIconColor(_this, args.value)
        );
      };
    this.image.style.on('colorChange', this._imageColorHandler);
    this._imageFontHandler =
      this._imageFontHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent && tabStripParent.setTabBarIconColor(_this, args.value)
        );
      };
    this.image.style.on('fontInternalChange', this._imageFontHandler);
    this._imageSrcHandler =
      this._imageSrcHandler ||
      function(args) {
        var parent = _this.parent;
        var tabStripParent = parent && parent.parent;
        return (
          tabStripParent && tabStripParent.setTabBarIconColor(_this, args.value)
        );
      };
    this.image.on('srcChange', this._imageSrcHandler);
  };
  TabStripItem.prototype.onUnloaded = function() {
    _super.prototype.onUnloaded.call(this);
    this.label.style.off('colorChange', this._labelColorHandler);
    this.label.style.off('fontInternalChange', this._labelFontHandler);
    this.label.style.off(
      'textTransformChange',
      this._labelTextTransformHandler
    );
    this.label.style.off('textChange', this._labelTextHandler);
    this.image.style.off('colorChange', this._imageColorHandler);
    this.image.style.off('fontInternalChange', this._imageFontHandler);
    this.image.style.off('srcChange', this._imageSrcHandler);
  };
  TabStripItem.prototype.eachChild = function(callback) {
    if (this.label) {
      callback(this.label);
    }
    if (this.image) {
      callback(this.image);
    }
  };
  TabStripItem.prototype._addChildFromBuilder = function(name, value) {
    if (value instanceof image_1.Image) {
      this.image = value;
      this.iconSource = value.src;
      this._addView(value);
    }
    if (value instanceof label_1.Label) {
      this.label = value;
      this.title = value.text;
      this._addView(value);
    }
  };
  TabStripItem.prototype.requestLayout = function() {
    var parent = this.parent;
    if (parent) {
      parent.requestLayout();
    }
  };
  TabStripItem.prototype._updateTabStateChangeHandler = function(subscribe) {
    var _this = this;
    if (subscribe) {
      this._highlightedHandler =
        this._highlightedHandler ||
        function() {
          _this._goToVisualState('highlighted');
        };
      this._normalHandler =
        this._normalHandler ||
        function() {
          _this._goToVisualState('normal');
        };
      this.on(TabStripItem_1.selectEvent, this._highlightedHandler);
      this.on(TabStripItem_1.unselectEvent, this._normalHandler);
      var parent_1 = this.parent;
      var tabStripParent = parent_1 && parent_1.parent;
      if (
        this._index === tabStripParent.selectedIndex &&
        !(platform_1.isIOS && tabStripParent.cssType.toLowerCase() === 'tabs')
      ) {
        this._goToVisualState('highlighted');
      }
    } else {
      this.off(TabStripItem_1.selectEvent, this._highlightedHandler);
      this.off(TabStripItem_1.unselectEvent, this._normalHandler);
    }
  };
  TabStripItem.prototype[
    view_1.backgroundColorProperty.getDefault
  ] = function() {
    var parent = this.parent;
    var tabStripParent = parent && parent.parent;
    return tabStripParent && tabStripParent.getTabBarBackgroundColor();
  };
  TabStripItem.prototype[view_1.backgroundColorProperty.setNative] = function(
    value
  ) {
    var parent = this.parent;
    var tabStripParent = parent && parent.parent;
    return (
      tabStripParent && tabStripParent.setTabBarItemBackgroundColor(this, value)
    );
  };
  TabStripItem.prototype[
    view_1.backgroundInternalProperty.getDefault
  ] = function() {
    return null;
  };
  TabStripItem.prototype[
    view_1.backgroundInternalProperty.setNative
  ] = function(value) {};
  var TabStripItem_1;
  TabStripItem.tapEvent = 'tap';
  TabStripItem.selectEvent = 'select';
  TabStripItem.unselectEvent = 'unselect';
  __decorate(
    [view_1.PseudoClassHandler('normal', 'highlighted', 'pressed', 'active')],
    TabStripItem.prototype,
    '_updateTabStateChangeHandler',
    null
  );
  TabStripItem = TabStripItem_1 = __decorate(
    [view_1.CSSType('TabStripItem')],
    TabStripItem
  );
  return TabStripItem;
})(view_1.View);
exports.TabStripItem = TabStripItem;
//# sourceMappingURL=tab-strip-item.js.map