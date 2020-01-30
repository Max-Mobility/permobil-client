function __export(m) {
  for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, '__esModule', { value: true });
var native_helper_1 = require('./native-helper');
exports.ios = native_helper_1.ios;
var trace_1 = require('../trace');
__export(require('./utils-common'));
function openFile(filePath) {
  try {
    var appPath = native_helper_1.ios.getCurrentAppPath();
    var path = filePath.replace('~', appPath);
    var controller = UIDocumentInteractionController.interactionControllerWithURL(
      NSURL.fileURLWithPath(path)
    );
    controller.delegate = new native_helper_1.ios.UIDocumentInteractionControllerDelegateImpl();
    return controller.presentPreviewAnimated(true);
  } catch (e) {
    trace_1.write(
      'Error in openFile',
      trace_1.categories.Error,
      trace_1.messageType.error
    );
  }
  return false;
}
exports.openFile = openFile;
function GC() {
  __collect();
}
exports.GC = GC;
function releaseNativeObject(object) {
  __releaseNativeCounterpart(object);
}
exports.releaseNativeObject = releaseNativeObject;
function openUrl(location) {
  try {
    var url = NSURL.URLWithString(location.trim());
    if (UIApplication.sharedApplication.canOpenURL(url)) {
      return UIApplication.sharedApplication.openURL(url);
    }
  } catch (e) {
    trace_1.write(
      'Error in OpenURL',
      trace_1.categories.Error,
      trace_1.messageType.error
    );
  }
  return false;
}
exports.openUrl = openUrl;
//# sourceMappingURL=utils.ios.js.map
