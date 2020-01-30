Object.defineProperty(exports, '__esModule', { value: true });
var frame_1 = require('./frame');
var globals = require('../../globals');
var appModule = require('../../application');
if (global.__snapshot) {
  globals.install();
}
var NativeScriptActivity = (function(_super) {
  __extends(NativeScriptActivity, _super);
  function NativeScriptActivity() {
    var _this = _super.call(this) || this;
    return global.__native(_this);
  }
  NativeScriptActivity.prototype.onCreate = function(savedInstanceState) {
    appModule.android.init(this.getApplication());
    this.isNativeScriptActivity = true;
    if (!this._callbacks) {
      frame_1.setActivityCallbacks(this);
    }
    this._callbacks.onCreate(
      this,
      savedInstanceState,
      this.getIntent(),
      _super.prototype.onCreate
    );
  };
  NativeScriptActivity.prototype.onNewIntent = function(intent) {
    this._callbacks.onNewIntent(
      this,
      intent,
      _super.prototype.setIntent,
      _super.prototype.onNewIntent
    );
  };
  NativeScriptActivity.prototype.onSaveInstanceState = function(outState) {
    this._callbacks.onSaveInstanceState(
      this,
      outState,
      _super.prototype.onSaveInstanceState
    );
  };
  NativeScriptActivity.prototype.onStart = function() {
    this._callbacks.onStart(this, _super.prototype.onStart);
  };
  NativeScriptActivity.prototype.onStop = function() {
    this._callbacks.onStop(this, _super.prototype.onStop);
  };
  NativeScriptActivity.prototype.onDestroy = function() {
    this._callbacks.onDestroy(this, _super.prototype.onDestroy);
  };
  NativeScriptActivity.prototype.onPostResume = function() {
    this._callbacks.onPostResume(this, _super.prototype.onPostResume);
  };
  NativeScriptActivity.prototype.onBackPressed = function() {
    this._callbacks.onBackPressed(this, _super.prototype.onBackPressed);
  };
  NativeScriptActivity.prototype.onRequestPermissionsResult = function(
    requestCode,
    permissions,
    grantResults
  ) {
    this._callbacks.onRequestPermissionsResult(
      this,
      requestCode,
      permissions,
      grantResults,
      undefined
    );
  };
  NativeScriptActivity.prototype.onActivityResult = function(
    requestCode,
    resultCode,
    data
  ) {
    this._callbacks.onActivityResult(
      this,
      requestCode,
      resultCode,
      data,
      _super.prototype.onActivityResult
    );
  };
  NativeScriptActivity = __decorate(
    [JavaProxy('com.tns.NativeScriptActivity')],
    NativeScriptActivity
  );
  return NativeScriptActivity;
})(androidx.appcompat.app.AppCompatActivity);
//# sourceMappingURL=activity.android.js.map
