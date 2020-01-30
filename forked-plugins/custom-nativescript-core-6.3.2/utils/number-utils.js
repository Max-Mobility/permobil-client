Object.defineProperty(exports, '__esModule', { value: true });
var epsilon = 1e-5;
function areClose(value1, value2) {
  return Math.abs(value1 - value2) < epsilon;
}
exports.areClose = areClose;
function greaterThanOrClose(value1, value2) {
  return value1 > value2 || areClose(value1, value2);
}
exports.greaterThanOrClose = greaterThanOrClose;
function greaterThan(value1, value2) {
  return value1 > value2 && !areClose(value1, value2);
}
exports.greaterThan = greaterThan;
function lessThan(value1, value2) {
  return value1 < value2 && !areClose(value1, value2);
}
exports.lessThan = lessThan;
function isZero(value) {
  return Math.abs(value) < epsilon;
}
exports.isZero = isZero;
function greaterThanZero(value) {
  return value > 0;
}
exports.greaterThanZero = greaterThanZero;
function notNegative(value) {
  return value >= 0;
}
exports.notNegative = notNegative;
exports.radiansToDegrees = function(a) {
  return a * (180 / Math.PI);
};
exports.degreesToRadians = function(a) {
  return a * (Math.PI / 180);
};
//# sourceMappingURL=number-utils.js.map
