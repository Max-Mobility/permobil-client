const Buffer = require("buffer").Buffer; // ADDED AFTER GENERATING
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module !== 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

/* CHANGED AFTER GENERATING:
Module['arguments'] = [];
Module['thisProgram'] = './this.program';
Module['quit'] = function(status, toThrow) {
  throw toThrow;
};
Module['preRun'] = [];
Module['postRun'] = [];
*/

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = true; // CHANGED AFTER GENERATING
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

/* CHANGED AFTER GENERATING:
if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('Module[\'ENVIRONMENT\'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}
*/


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  var nodeFS;
  var nodePath;
    if (!Module['print']) Module['print'] = console.log; // CHANGED AFTER GENERATING
    if (!Module['printErr']) Module['printErr'] = console.warn; // CHANGED AFTER GENERATING

  Module['read'] = function shell_read(filename, binary) {
    var ret;
    ret = tryParseAsDataURI(filename);
    if (!ret) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      ret = nodeFS['readFileSync'](filename);
    }
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

	/* CHANGED AFTER GENERATING:
  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  }

  Module['arguments'] = process['argv'].slice(2);
	*/

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

	/* CHANGED AFTER GENERATING:
  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  // Currently node will swallow unhandled rejections, but this behavior is
  // deprecated, and in the future it will exit with error status.
  process['on']('unhandledRejection', function(reason, p) {
    Module['printErr']('node.js exiting due to unhandled promise rejection');
    process['exit'](1);
  });
	*/

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != 'undefined') {
    Module['read'] = function shell_read(f) {
      var data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  Module['readBinary'] = function readBinary(f) {
    var data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status, toThrow) {
      quit(status);
    }
  }
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function shell_read(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  Module['setWindowTitle'] = function(title) { document.title = title };
}
else {
  // Unreachable because SHELL is dependent on the others
  throw new Error('unknown runtime environment');
}

// console.log is checked first, as 'print' on the web will open a print dialogue
// printErr is preferable to console.warn (works better in shells)
// bind(console) is necessary to fix IE/Edge closed dev tools panel behavior.
Module['print'] = typeof console !== 'undefined' ? console.log.bind(console) : (typeof print !== 'undefined' ? print : null);
Module['printErr'] = typeof printErr !== 'undefined' ? printErr : ((typeof console !== 'undefined' && console.warn.bind(console)) || Module['print']);

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;

// stack management, and other functionality that is provided by the compiled code,
// should not be used before it is ready
stackSave = stackRestore = stackAlloc = setTempRet0 = getTempRet0 = function() {
  abort('cannot use the stack before compiled code is ready to run, and has provided stack access');
};

function staticAlloc(size) {
  assert(!staticSealed);
  var ret = STATICTOP;
  STATICTOP = (STATICTOP + size + 15) & -16;
  return ret;
}

function dynamicAlloc(size) {
  assert(DYNAMICTOP_PTR);
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  if (end >= TOTAL_MEMORY) {
    var success = enlargeMemory();
    if (!success) {
      HEAP32[DYNAMICTOP_PTR>>2] = ret;
      return 0;
    }
  }
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  var ret = size = Math.ceil(size / factor) * factor;
  return ret;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    Module.printErr(text);
  }
}



var jsCallStartIndex = 1;
var functionPointers = new Array(0);

// 'sig' parameter is only used on LLVM wasm backend
function addFunction(func, sig) {
  if (typeof sig === 'undefined') {
    Module.printErr('Warning: addFunction: Provide a wasm function signature ' +
                    'string as a second argument');
  }
  var base = 0;
  for (var i = base; i < base + 0; i++) {
    if (!functionPointers[i]) {
      functionPointers[i] = func;
      return jsCallStartIndex + i;
    }
  }
  throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
}

function removeFunction(index) {
  functionPointers[index-jsCallStartIndex] = null;
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    assert(args.length == sig.length-1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    assert(sig.length == 1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].call(null, ptr);
  }
}


function getCompilerSetting(name) {
  throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for getCompilerSetting or emscripten_get_compiler_setting to work';
}

var Runtime = {
  // FIXME backwards compatibility layer for ports. Support some Runtime.*
  //       for now, fix it there, then remove it from here. That way we
  //       can minimize any period of breakage.
  dynCall: dynCall, // for SDL2 port
  // helpful errors
  getTempRet0: function() { abort('getTempRet0() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  staticAlloc: function() { abort('staticAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  stackAlloc: function() { abort('stackAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 8;



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

var JSfuncs = {
  // Helpers for cwrap -- it can't refer to Runtime directly because it might
  // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
  // out what the minified function name is.
  'stackSave': function() {
    stackSave()
  },
  'stackRestore': function() {
    stackRestore()
  },
  // type conversion from js to c
  'arrayToC' : function(arr) {
    var ret = stackAlloc(arr.length);
    writeArrayToMemory(arr, ret);
    return ret;
  },
  'stringToC' : function(str) {
    var ret = 0;
    if (str !== null && str !== undefined && str !== 0) { // null string
      // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
      var len = (str.length << 2) + 1;
      ret = stackAlloc(len);
      stringToUTF8(str, ret, len);
    }
    return ret;
  }
};

// For fast lookup of conversion functions
var toC = {
  'string': JSfuncs['stringToC'], 'array': JSfuncs['arrayToC']
};

// C calling interface.
function ccall (ident, returnType, argTypes, args, opts) {
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== 'array', 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);
  if (returnType === 'string') ret = Pointer_stringify(ret);
  else if (returnType === 'boolean') ret = Boolean(ret);
  if (stack !== 0) {
    stackRestore(stack);
  }
  return ret;
}

function cwrap (ident, returnType, argTypes) {
  argTypes = argTypes || [];
  var cfunc = getCFunc(ident);
  // When the function takes numbers and returns a number, we can just return
  // the original function
  var numericArgs = argTypes.every(function(type){ return type === 'number'});
  var numericRet = returnType !== 'string';
  if (numericRet && numericArgs) {
    return cfunc;
  }
  return function() {
    return ccall(ident, returnType, argTypes, arguments);
  }
}

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : staticAlloc, stackAlloc, staticAlloc, dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return staticAlloc(size);
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}

/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return UTF8ToString(ptr);
}

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

function demangle(func) {
  warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (x + ' [' + y + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}

// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
var MIN_TOTAL_MEMORY = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  HEAPU32[(STACK_MAX >> 2)-1] = 0x02135467;
  HEAPU32[(STACK_MAX >> 2)-2] = 0x89BACDFE;
}

function checkStackCookie() {
  if (HEAPU32[(STACK_MAX >> 2)-1] != 0x02135467 || HEAPU32[(STACK_MAX >> 2)-2] != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + HEAPU32[(STACK_MAX >> 2)-2].toString(16) + ' ' + HEAPU32[(STACK_MAX >> 2)-1].toString(16));
  }
  // Also test the global address 0 for integrity. This check is not compatible with SAFE_SPLIT_MEMORY though, since that mode already tests all address 0 accesses on its own.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) throw 'Runtime error: The application has corrupted its heap memory area (address zero)!';
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - stackSave() + allocSize) + ' bytes available!');
}

function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}


function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
       'JS engine does not provide full typed array support');



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === TOTAL_MEMORY, 'provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  // Use a WebAssembly memory where available
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
  assert(buffer.byteLength === TOTAL_MEMORY);
  Module['buffer'] = buffer;
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  checkStackCookie();
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

assert(Math['imul'] && Math['fround'] && Math['clz32'] && Math['trunc'], 'this is a legacy browser, build with LEGACY_VM_SUPPORT');

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



var /* show errors on likely calls to FS when it was not included */ FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;



// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}





// === Body ===

var ASM_CONSTS = [];





STATIC_BASE = GLOBAL_BASE;

STATICTOP = STATIC_BASE + 10096;
/* global initializers */  __ATINIT__.push({ func: function() { __GLOBAL__sub_I_packet_cpp() } }, { func: function() { __GLOBAL__sub_I_bind_cpp() } });


memoryInitializer = "data:application/octet-stream;base64,ZAUAAMkMAAAIBgAAnQwAAAAAAAABAAAACAAAAAAAAAAIBgAAeQwAAAAAAAABAAAAEAAAAAAAAADQBQAA7gwAAAAAAAAoAAAA0AUAABMNAAABAAAAKAAAAGQFAABQDQAA7AUAAG4NAADsBQAAfQ0AAOwFAACSDQAA7AUAAK4NAABkBQAAyw0AAGQFAADuDQAA7AUAAA8OAADsBQAAIA4AAOwFAAAvDgAAZAUAAD4OAABkBQAAVQ4AAGQFAABpDgAAZAUAAIEOAABkBQAAmA4AAGQFAACwDgAAZAUAAMQOAADsBQAA2A4AAGQFAADtDgAA7AUAAAMPAADsBQAAFQ8AAGQFAAAjDwAA0AUAACsPAAAAAAAACAEAANAFAAA0DwAAAQAAAAgBAABkBQAAfQ8AAAgGAAA+DwAAAAAAAAEAAAAwAQAAAAAAAGQFAACnDwAAZAUAALoPAABkBQAA7hIAAGQFAAANEwAAZAUAACwTAABkBQAASxMAAGQFAABqEwAAZAUAAIkTAABkBQAAqBMAAGQFAADHEwAAZAUAAOYTAABkBQAABRQAAGQFAAAkFAAAZAUAAEMUAAAIBgAAYhQAAAAAAAABAAAAMAEAAAAAAAAIBgAAoRQAAAAAAAABAAAAMAEAAAAAAABkBQAA6x4AAIwFAABLHwAACAIAAAAAAACMBQAA+B4AABgCAAAAAAAAZAUAABkfAACMBQAAJh8AAPgBAAAAAAAAjAUAAFEgAAAIAgAAAAAAAIwFAAAtIAAAMAIAAAAAAACMBQAAcyAAAAgCAAAAAAAAtAUAAJsgAAC0BQAAnSAAALQFAACgIAAAtAUAAKIgAAC0BQAApCAAALQFAACmIAAAtAUAAKggAAC0BQAAqiAAALQFAACsIAAAtAUAAK4gAAC0BQAAsCAAALQFAACyIAAAtAUAALQgAAC0BQAAtiAAALQFAAC4IAAAjAUAALogAAAIAgAAAAAAAIwFAADbIAAA+AEAAAAAAABAAAAAYAIAAEAAAACAAgAAYAIAAEAAAACoAgAAgAIAAKgCAABQAAAAYAAAACgAAACoAgAAcAIAACgAAACoAgAAgAIAABABAABwAgAAEAEAAHACAAAQAQAAOAEAAGACAAAQAQAAKAAAABABAAAFAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAwAAAF4jAAAABAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAK/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAMAAOgDAAAFAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAwAAAGYnAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAD//////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAA+AEAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAAAAAAACACAAAGAAAADgAAAAgAAAAJAAAACgAAAA8AAAAQAAAAEQAAAAAAAABQAgAABgAAABIAAAAIAAAACQAAABMAAAAAAAAAQAIAAAYAAAAUAAAACAAAAAkAAAAVAAAAAAAAANgCAAAGAAAAFgAAAAgAAAAJAAAAFwAAAAAAAADoAgAABgAAABgAAAAIAAAACQAAAAoAAAAZAAAAGgAAABsAAABWZWN0b3JJbnQATW90b3JTdGF0ZQBPZmYAT24ARXJyb3IAVW5pdHMARW5nbGlzaABNZXRyaWMAU21hcnREcml2ZUNvbnRyb2xNb2RlAEJlZ2lubmVyAEludGVybWVkaWF0ZQBBZHZhbmNlZABUaHJvdHRsZU1vZGUAQWN0aXZlAExhdGNoaW5nAFNtYXJ0RHJpdmVTZXR0aW5ncwBDb250cm9sTW9kZQBGbGFncwBQYWRkaW5nAFRhcFNlbnNpdGl2aXR5AEFjY2VsZXJhdGlvbgBNYXhTcGVlZABUaHJvdHRsZVNldHRpbmdzAFBhZGRpbmcxAFBhZGRpbmcyAFBhZGRpbmczAERldmljZQBTbWFydERyaXZlAFNtYXJ0RHJpdmVCbHVldG9vdGgAUHVzaFRyYWNrZXIAUGFja2V0VHlwZQBOb25lAERhdGEAQ29tbWFuZABPVEEAUGFja2V0RGF0YVR5cGUATW90b3JEaXN0YW5jZQBTcGVlZABDb2FzdFRpbWUAUHVzaGVzAEJhdHRlcnlMZXZlbABWZXJzaW9uSW5mbwBEYWlseUluZm8ASm91cm5leUluZm8ATW90b3JJbmZvAERldmljZUluZm8AUmVhZHkARXJyb3JJbmZvAFB1c2hTZXR0aW5ncwBwdXNoVHJhY2tlcgBzbWFydERyaXZlAHNtYXJ0RHJpdmVCbHVldG9vdGgAeWVhcgBtb250aABkYXkAcHVzaGVzV2l0aABwdXNoZXNXaXRob3V0AGNvYXN0V2l0aABjb2FzdFdpdGhvdXQAZGlzdGFuY2UAc3BlZWQAcHRCYXR0ZXJ5AHNkQmF0dGVyeQB0aHJlc2hvbGQAdGltZVdpbmRvdwBjbGVhckNvdW50ZXIAcHVzaGVzAERpc3RhbmNlSW5mbwBtb3RvckRpc3RhbmNlAGNhc2VEaXN0YW5jZQBzdGF0ZQBiYXR0ZXJ5TGV2ZWwAdmVyc2lvbgBwYWRkaW5nAGRyaXZlVGltZQBob3VyAG1pbnV0ZQBzZWNvbmQAbW9zdFJlY2VudEVycm9yAG51bUJhdHRlcnlWb2x0YWdlRXJyb3JzAG51bU92ZXJDdXJyZW50RXJyb3JzAG51bU1vdG9yUGhhc2VFcnJvcnMAbnVtR3lyb1JhbmdlRXJyb3JzAG51bU92ZXJUZW1wZXJhdHVyZUVycm9ycwBudW1CTEVEaXNjb25uZWN0RXJyb3JzAGRldmljZQBQYWNrZXRDb21tYW5kVHlwZQBTZXRBY2NlbGVyYXRpb24AU2V0TWF4U3BlZWQAVGFwAERvdWJsZVRhcABTZXRDb250cm9sTW9kZQBTZXRTZXR0aW5ncwBUdXJuT2ZmTW90b3IAU3RhcnRKb3VybmV5AFN0b3BKb3VybmV5AFBhdXNlSm91cm5leQBTZXRUaW1lAFN0YXJ0T1RBAFN0b3BPVEEAT1RBUmVhZHkAQ2FuY2VsT1RBAFdha2UARGlzdGFuY2VSZXF1ZXN0AFN0YXJ0R2FtZQBTdG9wR2FtZQBDb25uZWN0TVBHYW1lAERpc2Nvbm5lY3RNUEdhbWUAU2V0UHVzaFNldHRpbmdzAFNldExFRENvbG9yAFNldFRocm90dGxlU2V0dGluZ3MAUGFja2V0T1RBVHlwZQBQYWNrZXRFcnJvclR5cGUATm9FcnJvcgBCYXR0ZXJ5Vm9sdGFnZQBNb3RvclBoYXNlcwBPdmVyQ3VycmVudABPdmVyVGVtcGVyYXR1cmUAR3lyb1JhbmdlAE9UQVVuYXZhaWxhYmxlAEJMRURpc2Nvbm5lY3QAUGFja2V0AHZhbGlkAHByb2Nlc3NQYWNrZXQAbmV3UGFja2V0AGZvcm1hdABsZW5ndGgAVHlwZQBzZXR0aW5ncwB0aHJvdHRsZVNldHRpbmdzAHB1c2hTZXR0aW5ncwB2ZXJzaW9uSW5mbwBkYWlseUluZm8Aam91cm5leUluZm8AbW90b3JJbmZvAHRpbWVJbmZvAGRldmljZUluZm8AZXJyb3JJbmZvAGJhdHRlcnlJbmZvAGRpc3RhbmNlSW5mbwBlcnJvcklkAE9UQURldmljZQBieXRlcwBwdXNoX2JhY2sAcmVzaXplAHNpemUAZ2V0AHNldABOU3QzX18yNnZlY3RvckloTlNfOWFsbG9jYXRvckloRUVFRQBOU3QzX18yMTNfX3ZlY3Rvcl9iYXNlSWhOU185YWxsb2NhdG9ySWhFRUVFAE5TdDNfXzIyMF9fdmVjdG9yX2Jhc2VfY29tbW9uSUxiMUVFRQBQTlN0M19fMjZ2ZWN0b3JJaE5TXzlhbGxvY2F0b3JJaEVFRUUAUEtOU3QzX18yNnZlY3RvckloTlNfOWFsbG9jYXRvckloRUVFRQBpaQB2AHZpAHZpaWkAdmlpaWkAaWlpAE4xMGVtc2NyaXB0ZW4zdmFsRQBpaWlpAGlpaWlpAE41TW90b3I1U3RhdGVFAE4xMFNtYXJ0RHJpdmU1VW5pdHNFAE4xMFNtYXJ0RHJpdmUxMUNvbnRyb2xNb2RlRQBOMTBTbWFydERyaXZlMTJUaHJvdHRsZU1vZGVFAE4xMFNtYXJ0RHJpdmU4U2V0dGluZ3NFAGkAZmlpAHZpaWYATjEwU21hcnREcml2ZTE2VGhyb3R0bGVTZXR0aW5nc0UATjZQYWNrZXQ2RGV2aWNlRQBONlBhY2tldDRUeXBlRQBONlBhY2tldDREYXRhRQBONlBhY2tldDExVmVyc2lvbkluZm9FAE42UGFja2V0OURhaWx5SW5mb0UATjZQYWNrZXQxMlB1c2hTZXR0aW5nc0UATjZQYWNrZXQxMUpvdXJuZXlJbmZvRQBONlBhY2tldDEyRGlzdGFuY2VJbmZvRQBONlBhY2tldDlNb3RvckluZm9FAE42UGFja2V0OUVycm9ySW5mb0UATjEwU21hcnREcml2ZTVFcnJvckUATjZQYWNrZXQxMERldmljZUluZm9FAE42UGFja2V0N0NvbW1hbmRFAE42UGFja2V0M09UQUUANlBhY2tldABQNlBhY2tldABQSzZQYWNrZXQATlN0M19fMjEyYmFzaWNfc3RyaW5nSWNOU18xMWNoYXJfdHJhaXRzSWNFRU5TXzlhbGxvY2F0b3JJY0VFRUUATlN0M19fMjIxX19iYXNpY19zdHJpbmdfY29tbW9uSUxiMUVFRQB2aWkATjZQYWNrZXQ4VGltZUluZm9FAE42UGFja2V0MTFCYXR0ZXJ5SW5mb0UAdm9pZABib29sAGNoYXIAc2lnbmVkIGNoYXIAdW5zaWduZWQgY2hhcgBzaG9ydAB1bnNpZ25lZCBzaG9ydABpbnQAdW5zaWduZWQgaW50AGxvbmcAdW5zaWduZWQgbG9uZwBmbG9hdABkb3VibGUAc3RkOjpzdHJpbmcAc3RkOjpiYXNpY19zdHJpbmc8dW5zaWduZWQgY2hhcj4Ac3RkOjp3c3RyaW5nAGVtc2NyaXB0ZW46OnZhbABlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8bG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGxvbmcgZG91YmxlPgBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0llRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJZEVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWZFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0ltRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJbEVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWpFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lpRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJdEVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXNFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0loRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJYUVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWNFRQBOU3QzX18yMTJiYXNpY19zdHJpbmdJd05TXzExY2hhcl90cmFpdHNJd0VFTlNfOWFsbG9jYXRvckl3RUVFRQBOU3QzX18yMTJiYXNpY19zdHJpbmdJaE5TXzExY2hhcl90cmFpdHNJaEVFTlNfOWFsbG9jYXRvckloRUVFRQARAAoAERERAAAAAAUAAAAAAAAJAAAAAAsAAAAAAAAAABEADwoREREDCgcAARMJCwsAAAkGCwAACwAGEQAAABEREQAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAARAAoKERERAAoAAAIACQsAAAAJAAsAAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAAMAAAAAAkMAAAAAAAMAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAA0AAAAEDQAAAAAJDgAAAAAADgAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAPAAAAAA8AAAAACRAAAAAAABAAABAAABIAAAASEhIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAABISEgAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAAAAAAAoAAAAACgAAAAAJCwAAAAAACwAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAwAAAAACQwAAAAAAAwAAAwAAC0rICAgMFgweAAobnVsbCkALTBYKzBYIDBYLTB4KzB4IDB4AGluZgBJTkYAbmFuAE5BTgAwMTIzNDU2Nzg5QUJDREVGLgBUISIZDQECAxFLHAwQBAsdEh4naG5vcHFiIAUGDxMUFRoIFgcoJBcYCQoOGx8lI4OCfSYqKzw9Pj9DR0pNWFlaW1xdXl9gYWNkZWZnaWprbHJzdHl6e3wASWxsZWdhbCBieXRlIHNlcXVlbmNlAERvbWFpbiBlcnJvcgBSZXN1bHQgbm90IHJlcHJlc2VudGFibGUATm90IGEgdHR5AFBlcm1pc3Npb24gZGVuaWVkAE9wZXJhdGlvbiBub3QgcGVybWl0dGVkAE5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkATm8gc3VjaCBwcm9jZXNzAEZpbGUgZXhpc3RzAFZhbHVlIHRvbyBsYXJnZSBmb3IgZGF0YSB0eXBlAE5vIHNwYWNlIGxlZnQgb24gZGV2aWNlAE91dCBvZiBtZW1vcnkAUmVzb3VyY2UgYnVzeQBJbnRlcnJ1cHRlZCBzeXN0ZW0gY2FsbABSZXNvdXJjZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZQBJbnZhbGlkIHNlZWsAQ3Jvc3MtZGV2aWNlIGxpbmsAUmVhZC1vbmx5IGZpbGUgc3lzdGVtAERpcmVjdG9yeSBub3QgZW1wdHkAQ29ubmVjdGlvbiByZXNldCBieSBwZWVyAE9wZXJhdGlvbiB0aW1lZCBvdXQAQ29ubmVjdGlvbiByZWZ1c2VkAEhvc3QgaXMgZG93bgBIb3N0IGlzIHVucmVhY2hhYmxlAEFkZHJlc3MgaW4gdXNlAEJyb2tlbiBwaXBlAEkvTyBlcnJvcgBObyBzdWNoIGRldmljZSBvciBhZGRyZXNzAEJsb2NrIGRldmljZSByZXF1aXJlZABObyBzdWNoIGRldmljZQBOb3QgYSBkaXJlY3RvcnkASXMgYSBkaXJlY3RvcnkAVGV4dCBmaWxlIGJ1c3kARXhlYyBmb3JtYXQgZXJyb3IASW52YWxpZCBhcmd1bWVudABBcmd1bWVudCBsaXN0IHRvbyBsb25nAFN5bWJvbGljIGxpbmsgbG9vcABGaWxlbmFtZSB0b28gbG9uZwBUb28gbWFueSBvcGVuIGZpbGVzIGluIHN5c3RlbQBObyBmaWxlIGRlc2NyaXB0b3JzIGF2YWlsYWJsZQBCYWQgZmlsZSBkZXNjcmlwdG9yAE5vIGNoaWxkIHByb2Nlc3MAQmFkIGFkZHJlc3MARmlsZSB0b28gbGFyZ2UAVG9vIG1hbnkgbGlua3MATm8gbG9ja3MgYXZhaWxhYmxlAFJlc291cmNlIGRlYWRsb2NrIHdvdWxkIG9jY3VyAFN0YXRlIG5vdCByZWNvdmVyYWJsZQBQcmV2aW91cyBvd25lciBkaWVkAE9wZXJhdGlvbiBjYW5jZWxlZABGdW5jdGlvbiBub3QgaW1wbGVtZW50ZWQATm8gbWVzc2FnZSBvZiBkZXNpcmVkIHR5cGUASWRlbnRpZmllciByZW1vdmVkAERldmljZSBub3QgYSBzdHJlYW0ATm8gZGF0YSBhdmFpbGFibGUARGV2aWNlIHRpbWVvdXQAT3V0IG9mIHN0cmVhbXMgcmVzb3VyY2VzAExpbmsgaGFzIGJlZW4gc2V2ZXJlZABQcm90b2NvbCBlcnJvcgBCYWQgbWVzc2FnZQBGaWxlIGRlc2NyaXB0b3IgaW4gYmFkIHN0YXRlAE5vdCBhIHNvY2tldABEZXN0aW5hdGlvbiBhZGRyZXNzIHJlcXVpcmVkAE1lc3NhZ2UgdG9vIGxhcmdlAFByb3RvY29sIHdyb25nIHR5cGUgZm9yIHNvY2tldABQcm90b2NvbCBub3QgYXZhaWxhYmxlAFByb3RvY29sIG5vdCBzdXBwb3J0ZWQAU29ja2V0IHR5cGUgbm90IHN1cHBvcnRlZABOb3Qgc3VwcG9ydGVkAFByb3RvY29sIGZhbWlseSBub3Qgc3VwcG9ydGVkAEFkZHJlc3MgZmFtaWx5IG5vdCBzdXBwb3J0ZWQgYnkgcHJvdG9jb2wAQWRkcmVzcyBub3QgYXZhaWxhYmxlAE5ldHdvcmsgaXMgZG93bgBOZXR3b3JrIHVucmVhY2hhYmxlAENvbm5lY3Rpb24gcmVzZXQgYnkgbmV0d29yawBDb25uZWN0aW9uIGFib3J0ZWQATm8gYnVmZmVyIHNwYWNlIGF2YWlsYWJsZQBTb2NrZXQgaXMgY29ubmVjdGVkAFNvY2tldCBub3QgY29ubmVjdGVkAENhbm5vdCBzZW5kIGFmdGVyIHNvY2tldCBzaHV0ZG93bgBPcGVyYXRpb24gYWxyZWFkeSBpbiBwcm9ncmVzcwBPcGVyYXRpb24gaW4gcHJvZ3Jlc3MAU3RhbGUgZmlsZSBoYW5kbGUAUmVtb3RlIEkvTyBlcnJvcgBRdW90YSBleGNlZWRlZABObyBtZWRpdW0gZm91bmQAV3JvbmcgbWVkaXVtIHR5cGUATm8gZXJyb3IgaW5mb3JtYXRpb24AAHRlcm1pbmF0aW5nIHdpdGggJXMgZXhjZXB0aW9uIG9mIHR5cGUgJXM6ICVzAHRlcm1pbmF0aW5nIHdpdGggJXMgZXhjZXB0aW9uIG9mIHR5cGUgJXMAdGVybWluYXRpbmcgd2l0aCAlcyBmb3JlaWduIGV4Y2VwdGlvbgB0ZXJtaW5hdGluZwB1bmNhdWdodABTdDlleGNlcHRpb24ATjEwX19jeHhhYml2MTE2X19zaGltX3R5cGVfaW5mb0UAU3Q5dHlwZV9pbmZvAE4xMF9fY3h4YWJpdjEyMF9fc2lfY2xhc3NfdHlwZV9pbmZvRQBOMTBfX2N4eGFiaXYxMTdfX2NsYXNzX3R5cGVfaW5mb0UAcHRocmVhZF9vbmNlIGZhaWx1cmUgaW4gX19jeGFfZ2V0X2dsb2JhbHNfZmFzdCgpAGNhbm5vdCBjcmVhdGUgcHRocmVhZCBrZXkgZm9yIF9fY3hhX2dldF9nbG9iYWxzKCkAY2Fubm90IHplcm8gb3V0IHRocmVhZCB2YWx1ZSBmb3IgX19jeGFfZ2V0X2dsb2JhbHMoKQB0ZXJtaW5hdGVfaGFuZGxlciB1bmV4cGVjdGVkbHkgcmV0dXJuZWQATjEwX19jeHhhYml2MTE5X19wb2ludGVyX3R5cGVfaW5mb0UATjEwX19jeHhhYml2MTE3X19wYmFzZV90eXBlX2luZm9FAE4xMF9fY3h4YWJpdjEyM19fZnVuZGFtZW50YWxfdHlwZV9pbmZvRQB2AERuAGIAYwBoAGEAcwB0AGkAagBsAG0AeQBmAGQATjEwX19jeHhhYml2MTE2X19lbnVtX3R5cGVfaW5mb0UATjEwX19jeHhhYml2MTIxX192bWlfY2xhc3NfdHlwZV9pbmZvRQ==";





/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  var EXCEPTIONS={last:0,caught:[],infos:{},deAdjust:function (adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
        for (var ptr in EXCEPTIONS.infos) {
          var info = EXCEPTIONS.infos[ptr];
          if (info.adjusted === adjusted) {
            return ptr;
          }
        }
        return adjusted;
      },addRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++;
      },decRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        // A rethrown exception can reach refcount 0; it must not be discarded
        // Its next handler will clear the rethrown flag and addRef it, prior to
        // final decRef and destruction here
        if (info.refcount === 0 && !info.rethrown) {
          if (info.destructor) {
            Module['dynCall_vi'](info.destructor, ptr);
          }
          delete EXCEPTIONS.infos[ptr];
          ___cxa_free_exception(ptr);
        }
      },clearRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0;
      }};function ___cxa_begin_catch(ptr) {
      var info = EXCEPTIONS.infos[ptr];
      if (info && !info.caught) {
        info.caught = true;
        __ZSt18uncaught_exceptionv.uncaught_exception--;
      }
      if (info) info.rethrown = false;
      EXCEPTIONS.caught.push(ptr);
      EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
      return ptr;
    }

  
  
  function ___resumeException(ptr) {
      if (!EXCEPTIONS.last) { EXCEPTIONS.last = ptr; }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }function ___cxa_find_matching_catch() {
      var thrown = EXCEPTIONS.last;
      if (!thrown) {
        // just pass through the null ptr
        return ((setTempRet0(0),0)|0);
      }
      var info = EXCEPTIONS.infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((setTempRet0(0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = Module['___cxa_is_pointer_type'](throwntype);
      // can_catch receives a **, add indirection
      if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
      HEAP32[((___cxa_find_matching_catch.buffer)>>2)]=thrown;
      thrown = ___cxa_find_matching_catch.buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted = thrown;
          return ((setTempRet0(typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((setTempRet0(throwntype),thrown)|0);
    }function ___gxx_personality_v0() {
    }

  function ___lock() {}

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      // NOTE: offset_high is unused - Emscripten's off_t is 32-bit
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function flush_NO_FILESYSTEM() {
      // flush anything remaining in the buffers during shutdown
      var fflush = Module["_fflush"];
      if (fflush) fflush(0);
      var printChar = ___syscall146.printChar;
      if (!printChar) return;
      var buffers = ___syscall146.buffers;
      if (buffers[1].length) printChar(1, 10);
      if (buffers[2].length) printChar(2, 10);
    }function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffers) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  
   
  
   
  
  var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_STATIC);   

  function ___unlock() {}

   

  
  var structRegistrations={};
  
  function runDestructors(destructors) {
      while (destructors.length) {
          var ptr = destructors.pop();
          var del = destructors.pop();
          del(ptr);
      }
    }
  
  function simpleReadValueFromPointer(pointer) {
      return this['fromWireType'](HEAPU32[pointer >> 2]);
    }
  
  
  var awaitingDependencies={};
  
  var registeredTypes={};
  
  var typeDependencies={};
  
  
  
  
  
  
  var char_0=48;
  
  var char_9=57;function makeLegalFunctionName(name) {
      if (undefined === name) {
          return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
          return '_' + name;
      } else {
          return name;
      }
    }function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      /*jshint evil:true*/
      return new Function(
          "body",
          "return function " + name + "() {\n" +
          "    \"use strict\";" +
          "    return body.apply(this, arguments);\n" +
          "};\n"
      )(body);
    }function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
          this.name = errorName;
          this.message = message;
  
          var stack = (new Error(message)).stack;
          if (stack !== undefined) {
              this.stack = this.toString() + '\n' +
                  stack.replace(/^Error(:[^\n]*)?\n/, '');
          }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
          if (this.message === undefined) {
              return this.name;
          } else {
              return this.name + ': ' + this.message;
          }
      };
  
      return errorClass;
    }var InternalError=undefined;function throwInternalError(message) {
      throw new InternalError(message);
    }function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });
  
      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach(function(dt, i) {
          if (registeredTypes.hasOwnProperty(dt)) {
              typeConverters[i] = registeredTypes[dt];
          } else {
              unregisteredTypes.push(dt);
              if (!awaitingDependencies.hasOwnProperty(dt)) {
                  awaitingDependencies[dt] = [];
              }
              awaitingDependencies[dt].push(function() {
                  typeConverters[i] = registeredTypes[dt];
                  ++registered;
                  if (registered === unregisteredTypes.length) {
                      onComplete(typeConverters);
                  }
              });
          }
      });
      if (0 === unregisteredTypes.length) {
          onComplete(typeConverters);
      }
    }function __embind_finalize_value_object(structType) {
      var reg = structRegistrations[structType];
      delete structRegistrations[structType];
  
      var rawConstructor = reg.rawConstructor;
      var rawDestructor = reg.rawDestructor;
      var fieldRecords = reg.fields;
      var fieldTypes = fieldRecords.map(function(field) { return field.getterReturnType; }).
                concat(fieldRecords.map(function(field) { return field.setterArgumentType; }));
      whenDependentTypesAreResolved([structType], fieldTypes, function(fieldTypes) {
          var fields = {};
          fieldRecords.forEach(function(field, i) {
              var fieldName = field.fieldName;
              var getterReturnType = fieldTypes[i];
              var getter = field.getter;
              var getterContext = field.getterContext;
              var setterArgumentType = fieldTypes[i + fieldRecords.length];
              var setter = field.setter;
              var setterContext = field.setterContext;
              fields[fieldName] = {
                  read: function(ptr) {
                      return getterReturnType['fromWireType'](
                          getter(getterContext, ptr));
                  },
                  write: function(ptr, o) {
                      var destructors = [];
                      setter(setterContext, ptr, setterArgumentType['toWireType'](destructors, o));
                      runDestructors(destructors);
                  }
              };
          });
  
          return [{
              name: reg.name,
              'fromWireType': function(ptr) {
                  var rv = {};
                  for (var i in fields) {
                      rv[i] = fields[i].read(ptr);
                  }
                  rawDestructor(ptr);
                  return rv;
              },
              'toWireType': function(destructors, o) {
                  // todo: Here we have an opportunity for -O3 level "unsafe" optimizations:
                  // assume all fields are present without checking.
                  for (var fieldName in fields) {
                      if (!(fieldName in o)) {
                          throw new TypeError('Missing field');
                      }
                  }
                  var ptr = rawConstructor();
                  for (fieldName in fields) {
                      fields[fieldName].write(ptr, o[fieldName]);
                  }
                  if (destructors !== null) {
                      destructors.push(rawDestructor, ptr);
                  }
                  return ptr;
              },
              'argPackAdvance': 8,
              'readValueFromPointer': simpleReadValueFromPointer,
              destructorFunction: rawDestructor,
          }];
      });
    }

  
  function getShiftFromSize(size) {
      switch (size) {
          case 1: return 0;
          case 2: return 1;
          case 4: return 2;
          case 8: return 3;
          default:
              throw new TypeError('Unknown type size: ' + size);
      }
    }
  
  
  
  function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }var embind_charCodes=undefined;function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
  
  
  
  var BindingError=undefined;function throwBindingError(message) {
      throw new BindingError(message);
    }function registerType(rawType, registeredInstance, options) {
      options = options || {};
  
      if (!('argPackAdvance' in registeredInstance)) {
          throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }
  
      var name = registeredInstance.name;
      if (!rawType) {
          throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
              return;
          } else {
              throwBindingError("Cannot register type '" + name + "' twice");
          }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach(function(cb) {
              cb();
          });
      }
    }function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': function(pointer) {
              // TODO: if heap is fixed (like in asm.js) this could be executed outside
              var heap;
              if (size === 1) {
                  heap = HEAP8;
              } else if (size === 2) {
                  heap = HEAP16;
              } else if (size === 4) {
                  heap = HEAP32;
              } else {
                  throw new TypeError("Unknown boolean type size: " + name);
              }
              return this['fromWireType'](heap[pointer >> shift]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  
  
  function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
          return false;
      }
      if (!(other instanceof ClassHandle)) {
          return false;
      }
  
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
  
      while (leftClass.baseClass) {
          left = leftClass.upcast(left);
          leftClass = leftClass.baseClass;
      }
  
      while (rightClass.baseClass) {
          right = rightClass.upcast(right);
          rightClass = rightClass.baseClass;
      }
  
      return leftClass === rightClass && left === right;
    }
  
  
  function shallowCopyInternalPointer(o) {
      return {
          count: o.count,
          deleteScheduled: o.deleteScheduled,
          preservePointerOnDelete: o.preservePointerOnDelete,
          ptr: o.ptr,
          ptrType: o.ptrType,
          smartPtr: o.smartPtr,
          smartPtrType: o.smartPtrType,
      };
    }
  
  function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
    }function ClassHandle_clone() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.preservePointerOnDelete) {
          this.$$.count.value += 1;
          return this;
      } else {
          var clone = Object.create(Object.getPrototypeOf(this), {
              $$: {
                  value: shallowCopyInternalPointer(this.$$),
              }
          });
  
          clone.$$.count.value += 1;
          clone.$$.deleteScheduled = false;
          return clone;
      }
    }
  
  
  function runDestructor(handle) {
      var $$ = handle.$$;
      if ($$.smartPtr) {
          $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
          $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }function ClassHandle_delete() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
  
      this.$$.count.value -= 1;
      var toDelete = 0 === this.$$.count.value;
      if (toDelete) {
          runDestructor(this);
      }
      if (!this.$$.preservePointerOnDelete) {
          this.$$.smartPtr = undefined;
          this.$$.ptr = undefined;
      }
    }
  
  function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }
  
  
  var delayFunction=undefined;
  
  var deletionQueue=[];
  
  function flushPendingDeletes() {
      while (deletionQueue.length) {
          var obj = deletionQueue.pop();
          obj.$$.deleteScheduled = false;
          obj['delete']();
      }
    }function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }function init_ClassHandle() {
      ClassHandle.prototype['isAliasOf'] = ClassHandle_isAliasOf;
      ClassHandle.prototype['clone'] = ClassHandle_clone;
      ClassHandle.prototype['delete'] = ClassHandle_delete;
      ClassHandle.prototype['isDeleted'] = ClassHandle_isDeleted;
      ClassHandle.prototype['deleteLater'] = ClassHandle_deleteLater;
    }function ClassHandle() {
    }
  
  var registeredPointers={};
  
  
  function ensureOverloadTable(proto, methodName, humanName) {
      if (undefined === proto[methodName].overloadTable) {
          var prevFunc = proto[methodName];
          // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
          proto[methodName] = function() {
              // TODO This check can be removed in -O3 level "unsafe" optimizations.
              if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                  throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
              }
              return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
          };
          // Move the previous function into the overload table.
          proto[methodName].overloadTable = [];
          proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }function exposePublicSymbol(name, value, numArguments) {
      if (Module.hasOwnProperty(name)) {
          if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
              throwBindingError("Cannot register public name '" + name + "' twice");
          }
  
          // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
          // that routes between the two.
          ensureOverloadTable(Module, name, name);
          if (Module.hasOwnProperty(numArguments)) {
              throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
          }
          // Add the new function into the overload table.
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          if (undefined !== numArguments) {
              Module[name].numArguments = numArguments;
          }
      }
    }
  
  function RegisteredClass(
      name,
      constructor,
      instancePrototype,
      rawDestructor,
      baseClass,
      getActualType,
      upcast,
      downcast
    ) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
  
  
  
  function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
          if (!ptrClass.upcast) {
              throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
          }
          ptr = ptrClass.upcast(ptr);
          ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
  
          if (this.isSmartPointer) {
              ptr = this.rawConstructor();
              if (destructors !== null) {
                  destructors.push(this.rawDestructor, ptr);
              }
              return ptr;
          } else {
              return 0;
          }
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
  
      if (this.isSmartPointer) {
          // TODO: this is not strictly true
          // We could support BY_EMVAL conversions from raw pointers to smart pointers
          // because the smart pointer can hold a reference to the handle
          if (undefined === handle.$$.smartPtr) {
              throwBindingError('Passing raw pointer to smart pointer is illegal');
          }
  
          switch (this.sharingPolicy) {
              case 0: // NONE
                  // no upcasting
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
                  }
                  break;
  
              case 1: // INTRUSIVE
                  ptr = handle.$$.smartPtr;
                  break;
  
              case 2: // BY_EMVAL
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      var clonedHandle = handle['clone']();
                      ptr = this.rawShare(
                          ptr,
                          __emval_register(function() {
                              clonedHandle['delete']();
                          })
                      );
                      if (destructors !== null) {
                          destructors.push(this.rawDestructor, ptr);
                      }
                  }
                  break;
  
              default:
                  throwBindingError('Unsupporting sharing policy');
          }
      }
      return ptr;
    }
  
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + handle.$$.ptrType.name + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  
  function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
          ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }
  
  function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
          this.rawDestructor(ptr);
      }
    }
  
  function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
          handle['delete']();
      }
    }
  
  
  function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
          return ptr;
      }
      if (undefined === desiredClass.baseClass) {
          return null; // no conversion
      }
  
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
          return null;
      }
      return desiredClass.downcast(rv);
    }
  
  
  
  
  function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }
  
  function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
          if (registeredInstances.hasOwnProperty(k)) {
              rv.push(registeredInstances[k]);
          }
      }
      return rv;
    }
  
  function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
    }function init_embind() {
      Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
      Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
      Module['flushPendingDeletes'] = flushPendingDeletes;
      Module['setDelayFunction'] = setDelayFunction;
    }var registeredInstances={};
  
  function getBasestPointer(class_, ptr) {
      if (ptr === undefined) {
          throwBindingError('ptr should not be undefined');
      }
      while (class_.baseClass) {
          ptr = class_.upcast(ptr);
          class_ = class_.baseClass;
      }
      return ptr;
    }function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }
  
  function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
          throwInternalError('makeClassHandle requires ptr and ptrType');
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
          throwInternalError('Both smartPtrType and smartPtr must be specified');
      }
      record.count = { value: 1 };
      return Object.create(prototype, {
          $$: {
              value: record,
          },
      });
    }function RegisteredPointer_fromWireType(ptr) {
      // ptr is a raw pointer (or a raw smartpointer)
  
      // rawPointer is a maybe-null raw pointer
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
          this.destructor(ptr);
          return null;
      }
  
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (undefined !== registeredInstance) {
          // JS object has been neutered, time to repopulate it
          if (0 === registeredInstance.$$.count.value) {
              registeredInstance.$$.ptr = rawPointer;
              registeredInstance.$$.smartPtr = ptr;
              return registeredInstance['clone']();
          } else {
              // else, just increment reference count on existing object
              // it already has a reference to the smart pointer
              var rv = registeredInstance['clone']();
              this.destructor(ptr);
              return rv;
          }
      }
  
      function makeDefaultHandle() {
          if (this.isSmartPointer) {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this.pointeeType,
                  ptr: rawPointer,
                  smartPtrType: this,
                  smartPtr: ptr,
              });
          } else {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this,
                  ptr: ptr,
              });
          }
      }
  
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
          return makeDefaultHandle.call(this);
      }
  
      var toType;
      if (this.isConst) {
          toType = registeredPointerRecord.constPointerType;
      } else {
          toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(
          rawPointer,
          this.registeredClass,
          toType.registeredClass);
      if (dp === null) {
          return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
              smartPtrType: this,
              smartPtr: ptr,
          });
      } else {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
          });
      }
    }function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype['argPackAdvance'] = 8;
      RegisteredPointer.prototype['readValueFromPointer'] = simpleReadValueFromPointer;
      RegisteredPointer.prototype['deleteObject'] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype['fromWireType'] = RegisteredPointer_fromWireType;
    }function RegisteredPointer(
      name,
      registeredClass,
      isReference,
      isConst,
  
      // smart pointer properties
      isSmartPointer,
      pointeeType,
      sharingPolicy,
      rawGetPointee,
      rawConstructor,
      rawShare,
      rawDestructor
    ) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
  
      // smart pointer properties
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
  
      if (!isSmartPointer && registeredClass.baseClass === undefined) {
          if (isConst) {
              this['toWireType'] = constNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          } else {
              this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          }
      } else {
          this['toWireType'] = genericPointerToWireType;
          // Here we must leave this.destructorFunction undefined, since whether genericPointerToWireType returns
          // a pointer that needs to be freed up is runtime-dependent, and cannot be evaluated at registration time.
          // TODO: Create an alternative mechanism that allows removing the use of var destructors = []; array in
          //       craftInvokerFunction altogether.
      }
    }
  
  function replacePublicSymbol(name, value, numArguments) {
      if (!Module.hasOwnProperty(name)) {
          throwInternalError('Replacing nonexistant public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          Module[name].argCount = numArguments;
      }
    }
  
  function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
  
      function makeDynCaller(dynCall) {
          var args = [];
          for (var i = 1; i < signature.length; ++i) {
              args.push('a' + i);
          }
  
          var name = 'dynCall_' + signature + '_' + rawFunction;
          var body = 'return function ' + name + '(' + args.join(', ') + ') {\n';
          body    += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\n';
          body    += '};\n';
  
          return (new Function('dynCall', 'rawFunction', body))(dynCall, rawFunction);
      }
  
      var fp;
      if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
          fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
      } else if (typeof FUNCTION_TABLE !== "undefined") {
          fp = FUNCTION_TABLE[rawFunction];
      } else {
          // asm.js does not give direct access to the function tables,
          // and thus we must go through the dynCall interface which allows
          // calling into a signature's function table by pointer value.
          //
          // https://github.com/dherman/asm.js/issues/83
          //
          // This has three main penalties:
          // - dynCall is another function call in the path from JavaScript to C++.
          // - JITs may not predict through the function table indirection at runtime.
          var dc = Module["asm"]['dynCall_' + signature];
          if (dc === undefined) {
              // We will always enter this branch if the signature
              // contains 'f' and PRECISE_F32 is not enabled.
              //
              // Try again, replacing 'f' with 'd'.
              dc = Module["asm"]['dynCall_' + signature.replace(/f/g, 'd')];
              if (dc === undefined) {
                  throwBindingError("No dynCall invoker for signature: " + signature);
              }
          }
          fp = makeDynCaller(dc);
      }
  
      if (typeof fp !== "function") {
          throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
  
  
  var UnboundTypeError=undefined;
  
  function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
          if (seen[type]) {
              return;
          }
          if (registeredTypes[type]) {
              return;
          }
          if (typeDependencies[type]) {
              typeDependencies[type].forEach(visit);
              return;
          }
          unboundTypes.push(type);
          seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
    }function __embind_register_class(
      rawType,
      rawPointerType,
      rawConstPointerType,
      baseClassRawType,
      getActualTypeSignature,
      getActualType,
      upcastSignature,
      upcast,
      downcastSignature,
      downcast,
      name,
      destructorSignature,
      rawDestructor
    ) {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
          upcast = embind__requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
          downcast = embind__requireFunction(downcastSignature, downcast);
      }
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
  
      exposePublicSymbol(legalFunctionName, function() {
          // this code cannot run if baseClassRawType is zero
          throwUnboundTypeError('Cannot construct ' + name + ' due to unbound types', [baseClassRawType]);
      });
  
      whenDependentTypesAreResolved(
          [rawType, rawPointerType, rawConstPointerType],
          baseClassRawType ? [baseClassRawType] : [],
          function(base) {
              base = base[0];
  
              var baseClass;
              var basePrototype;
              if (baseClassRawType) {
                  baseClass = base.registeredClass;
                  basePrototype = baseClass.instancePrototype;
              } else {
                  basePrototype = ClassHandle.prototype;
              }
  
              var constructor = createNamedFunction(legalFunctionName, function() {
                  if (Object.getPrototypeOf(this) !== instancePrototype) {
                      throw new BindingError("Use 'new' to construct " + name);
                  }
                  if (undefined === registeredClass.constructor_body) {
                      throw new BindingError(name + " has no accessible constructor");
                  }
                  var body = registeredClass.constructor_body[arguments.length];
                  if (undefined === body) {
                      throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
                  }
                  return body.apply(this, arguments);
              });
  
              var instancePrototype = Object.create(basePrototype, {
                  constructor: { value: constructor },
              });
  
              constructor.prototype = instancePrototype;
  
              var registeredClass = new RegisteredClass(
                  name,
                  constructor,
                  instancePrototype,
                  rawDestructor,
                  baseClass,
                  getActualType,
                  upcast,
                  downcast);
  
              var referenceConverter = new RegisteredPointer(
                  name,
                  registeredClass,
                  true,
                  false,
                  false);
  
              var pointerConverter = new RegisteredPointer(
                  name + '*',
                  registeredClass,
                  false,
                  false,
                  false);
  
              var constPointerConverter = new RegisteredPointer(
                  name + ' const*',
                  registeredClass,
                  false,
                  true,
                  false);
  
              registeredPointers[rawType] = {
                  pointerType: pointerConverter,
                  constPointerType: constPointerConverter
              };
  
              replacePublicSymbol(legalFunctionName, constructor);
  
              return [referenceConverter, pointerConverter, constPointerConverter];
          }
      );
    }

  
  function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
          array.push(HEAP32[(firstElement >> 2) + i]);
      }
      return array;
    }function __embind_register_class_constructor(
      rawClassType,
      argCount,
      rawArgTypesAddr,
      invokerSignature,
      invoker,
      rawConstructor
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = 'constructor ' + classType.name;
  
          if (undefined === classType.registeredClass.constructor_body) {
              classType.registeredClass.constructor_body = [];
          }
          if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
              throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount-1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
          }
          classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
              throwUnboundTypeError('Cannot construct ' + classType.name + ' due to unbound types', rawArgTypes);
          };
  
          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
              classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                  if (arguments.length !== argCount - 1) {
                      throwBindingError(humanName + ' called with ' + arguments.length + ' arguments, expected ' + (argCount-1));
                  }
                  var destructors = [];
                  var args = new Array(argCount);
                  args[0] = rawConstructor;
                  for (var i = 1; i < argCount; ++i) {
                      args[i] = argTypes[i]['toWireType'](destructors, arguments[i - 1]);
                  }
  
                  var ptr = invoker.apply(null, args);
                  runDestructors(destructors);
  
                  return argTypes[0]['fromWireType'](ptr);
              };
              return [];
          });
          return [];
      });
    }

  
  
  function new_(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
          throw new TypeError('new_ called with constructor type ' + typeof(constructor) + " which is not a function");
      }
  
      /*
       * Previously, the following line was just:
  
       function dummy() {};
  
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even though at creation, the 'dummy' has the
       * correct constructor name.  Thus, objects created with IMVU.new would show up in the debugger as 'dummy', which
       * isn't very helpful.  Using IMVU.createNamedFunction addresses the issue.  Doublely-unfortunately, there's no way
       * to write a test for this behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;
  
      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
          throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }
  
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = false;
  
      for(var i = 1; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here.
          if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) { // The type does not define a destructor function - must use dynamic stack
              needsDestructorStack = true;
              break;
          }
      }
  
      var returns = (argTypes[0].name !== "void");
  
      var argsList = "";
      var argsListWired = "";
      for(var i = 0; i < argCount - 2; ++i) {
          argsList += (i!==0?", ":"")+"arg"+i;
          argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }
  
      var invokerFnBody =
          "return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n" +
          "if (arguments.length !== "+(argCount - 2)+") {\n" +
              "throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount - 2)+" args!');\n" +
          "}\n";
  
  
      if (needsDestructorStack) {
          invokerFnBody +=
              "var destructors = [];\n";
      }
  
      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
      var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
  
  
      if (isClassMethodFunc) {
          invokerFnBody += "var thisWired = classParam.toWireType("+dtorStack+", this);\n";
      }
  
      for(var i = 0; i < argCount - 2; ++i) {
          invokerFnBody += "var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";
          args1.push("argType"+i);
          args2.push(argTypes[i+2]);
      }
  
      if (isClassMethodFunc) {
          argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }
  
      invokerFnBody +=
          (returns?"var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";
  
      if (needsDestructorStack) {
          invokerFnBody += "runDestructors(destructors);\n";
      } else {
          for(var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
              var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
              if (argTypes[i].destructorFunction !== null) {
                  invokerFnBody += paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";
                  args1.push(paramName+"_dtor");
                  args2.push(argTypes[i].destructorFunction);
              }
          }
      }
  
      if (returns) {
          invokerFnBody += "var ret = retType.fromWireType(rv);\n" +
                           "return ret;\n";
      } else {
      }
      invokerFnBody += "}\n";
  
      args1.push(invokerFnBody);
  
      var invokerFunction = new_(Function, args1).apply(null, args2);
      return invokerFunction;
    }function __embind_register_class_function(
      rawClassType,
      methodName,
      argCount,
      rawArgTypesAddr, // [ReturnType, ThisType, Args...]
      invokerSignature,
      rawInvoker,
      context,
      isPureVirtual
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = classType.name + '.' + methodName;
  
          if (isPureVirtual) {
              classType.registeredClass.pureVirtualFunctions.push(methodName);
          }
  
          function unboundTypesHandler() {
              throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
          }
  
          var proto = classType.registeredClass.instancePrototype;
          var method = proto[methodName];
          if (undefined === method || (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)) {
              // This is the first overload to be registered, OR we are replacing a function in the base class with a function in the derived class.
              unboundTypesHandler.argCount = argCount - 2;
              unboundTypesHandler.className = classType.name;
              proto[methodName] = unboundTypesHandler;
          } else {
              // There was an existing function with the same name registered. Set up a function overload routing table.
              ensureOverloadTable(proto, methodName, humanName);
              proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
          }
  
          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
  
              var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
  
              // Replace the initial unbound-handler-stub function with the appropriate member function, now that all types
              // are resolved. If multiple overloads are registered for this function, the function goes into an overload table.
              if (undefined === proto[methodName].overloadTable) {
                  // Set argCount in case an overload is registered later
                  memberFunction.argCount = argCount - 2;
                  proto[methodName] = memberFunction;
              } else {
                  proto[methodName].overloadTable[argCount - 2] = memberFunction;
              }
  
              return [];
          });
          return [];
      });
    }

  
  function validateThis(this_, classType, humanName) {
      if (!(this_ instanceof Object)) {
          throwBindingError(humanName + ' with invalid "this": ' + this_);
      }
      if (!(this_ instanceof classType.registeredClass.constructor)) {
          throwBindingError(humanName + ' incompatible with "this" of type ' + this_.constructor.name);
      }
      if (!this_.$$.ptr) {
          throwBindingError('cannot call emscripten binding method ' + humanName + ' on deleted object');
      }
  
      // todo: kill this
      return upcastPointer(
          this_.$$.ptr,
          this_.$$.ptrType.registeredClass,
          classType.registeredClass);
    }function __embind_register_class_property(
      classType,
      fieldName,
      getterReturnType,
      getterSignature,
      getter,
      getterContext,
      setterArgumentType,
      setterSignature,
      setter,
      setterContext
    ) {
      fieldName = readLatin1String(fieldName);
      getter = embind__requireFunction(getterSignature, getter);
  
      whenDependentTypesAreResolved([], [classType], function(classType) {
          classType = classType[0];
          var humanName = classType.name + '.' + fieldName;
          var desc = {
              get: function() {
                  throwUnboundTypeError('Cannot access ' + humanName + ' due to unbound types', [getterReturnType, setterArgumentType]);
              },
              enumerable: true,
              configurable: true
          };
          if (setter) {
              desc.set = function() {
                  throwUnboundTypeError('Cannot access ' + humanName + ' due to unbound types', [getterReturnType, setterArgumentType]);
              };
          } else {
              desc.set = function(v) {
                  throwBindingError(humanName + ' is a read-only property');
              };
          }
  
          Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
  
          whenDependentTypesAreResolved(
              [],
              (setter ? [getterReturnType, setterArgumentType] : [getterReturnType]),
          function(types) {
              var getterReturnType = types[0];
              var desc = {
                  get: function() {
                      var ptr = validateThis(this, classType, humanName + ' getter');
                      return getterReturnType['fromWireType'](getter(getterContext, ptr));
                  },
                  enumerable: true
              };
  
              if (setter) {
                  setter = embind__requireFunction(setterSignature, setter);
                  var setterArgumentType = types[1];
                  desc.set = function(v) {
                      var ptr = validateThis(this, classType, humanName + ' setter');
                      var destructors = [];
                      setter(setterContext, ptr, setterArgumentType['toWireType'](destructors, v));
                      runDestructors(destructors);
                  };
              }
  
              Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
              return [];
          });
  
          return [];
      });
    }

  
  
  var emval_free_list=[];
  
  var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
          emval_handle_array[handle] = undefined;
          emval_free_list.push(handle);
      }
    }
  
  
  
  function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              ++count;
          }
      }
      return count;
    }
  
  function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              return emval_handle_array[i];
          }
      }
      return null;
    }function init_emval() {
      Module['count_emval_handles'] = count_emval_handles;
      Module['get_first_emval'] = get_first_emval;
    }function __emval_register(value) {
  
      switch(value){
        case undefined :{ return 1; }
        case null :{ return 2; }
        case true :{ return 3; }
        case false :{ return 4; }
        default:{
          var handle = emval_free_list.length ?
              emval_free_list.pop() :
              emval_handle_array.length;
  
          emval_handle_array[handle] = {refcount: 1, value: value};
          return handle;
          }
        }
    }function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(handle) {
              var rv = emval_handle_array[handle].value;
              __emval_decref(handle);
              return rv;
          },
          'toWireType': function(destructors, value) {
              return __emval_register(value);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: null, // This type does not need a destructor
  
          // TODO: do we need a deleteObject here?  write a test where
          // emval is passed into JS via an interface
      });
    }

  
  function enumReadValueFromPointer(name, shift, signed) {
      switch (shift) {
          case 0: return function(pointer) {
              var heap = signed ? HEAP8 : HEAPU8;
              return this['fromWireType'](heap[pointer]);
          };
          case 1: return function(pointer) {
              var heap = signed ? HEAP16 : HEAPU16;
              return this['fromWireType'](heap[pointer >> 1]);
          };
          case 2: return function(pointer) {
              var heap = signed ? HEAP32 : HEAPU32;
              return this['fromWireType'](heap[pointer >> 2]);
          };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }function __embind_register_enum(
      rawType,
      name,
      size,
      isSigned
    ) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
  
      function ctor() {
      }
      ctor.values = {};
  
      registerType(rawType, {
          name: name,
          constructor: ctor,
          'fromWireType': function(c) {
              return this.constructor.values[c];
          },
          'toWireType': function(destructors, c) {
              return c.value;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': enumReadValueFromPointer(name, shift, isSigned),
          destructorFunction: null,
      });
      exposePublicSymbol(name, ctor);
    }

  
  function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (undefined === impl) {
          throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }function __embind_register_enum_value(
      rawEnumType,
      name,
      enumValue
    ) {
      var enumType = requireRegisteredType(rawEnumType, 'enum');
      name = readLatin1String(name);
  
      var Enum = enumType.constructor;
  
      var Value = Object.create(enumType.constructor.prototype, {
          value: {value: enumValue},
          constructor: {value: createNamedFunction(enumType.name + '_' + name, function() {})},
      });
      Enum.values[enumValue] = Value;
      Enum[name] = Value;
    }

  
  function _embind_repr(v) {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    }
  
  function floatReadValueFromPointer(name, shift) {
      switch (shift) {
          case 2: return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
          };
          case 3: return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
          };
          default:
              throw new TypeError("Unknown float type: " + name);
      }
    }function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              return value;
          },
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following if() and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              return value;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': floatReadValueFromPointer(name, shift),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  function integerReadValueFromPointer(name, shift, signed) {
      // integers are quite common, so generate very specialized functions
      switch (shift) {
          case 0: return signed ?
              function readS8FromPointer(pointer) { return HEAP8[pointer]; } :
              function readU8FromPointer(pointer) { return HEAPU8[pointer]; };
          case 1: return signed ?
              function readS16FromPointer(pointer) { return HEAP16[pointer >> 1]; } :
              function readU16FromPointer(pointer) { return HEAPU16[pointer >> 1]; };
          case 2: return signed ?
              function readS32FromPointer(pointer) { return HEAP32[pointer >> 2]; } :
              function readU32FromPointer(pointer) { return HEAPU32[pointer >> 2]; };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) { // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come out as 'i32 -1'. Always treat those as max u32.
          maxRange = 4294967295;
      }
  
      var shift = getShiftFromSize(size);
  
      var fromWireType = function(value) {
          return value;
      };
  
      if (minRange === 0) {
          var bitshift = 32 - 8*size;
          fromWireType = function(value) {
              return (value << bitshift) >>> bitshift;
          };
      }
  
      var isUnsignedType = (name.indexOf('unsigned') != -1);
  
      registerType(primitiveType, {
          name: name,
          'fromWireType': fromWireType,
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following two if()s and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              if (value < minRange || value > maxRange) {
                  throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
              }
              return isUnsignedType ? (value >>> 0) : (value | 0);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [
          Int8Array,
          Uint8Array,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
          handle = handle >> 2;
          var heap = HEAPU32;
          var size = heap[handle]; // in elements
          var data = heap[handle + 1]; // byte offset into emscripten heap
          return new TA(heap['buffer'], data, size);
      }
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': decodeMemoryView,
          'argPackAdvance': 8,
          'readValueFromPointer': decodeMemoryView,
      }, {
          ignoreDuplicateRegistrations: true,
      });
    }

  function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              if (value instanceof ArrayBuffer) {
                  value = new Uint8Array(value);
              }
  
              function getTAElement(ta, index) {
                  return ta[index];
              }
              function getStringElement(string, index) {
                  return string.charCodeAt(index);
              }
              var getElement;
              if (value instanceof Uint8Array) {
                  getElement = getTAElement;
              } else if (value instanceof Uint8ClampedArray) {
                  getElement = getTAElement;
              } else if (value instanceof Int8Array) {
                  getElement = getTAElement;
              } else if (typeof value === 'string') {
                  getElement = getStringElement;
              } else {
                  throwBindingError('Cannot pass non-string to std::string');
              }
  
              // assumes 4-byte alignment
              var length = value.length;
              var ptr = _malloc(4 + length);
              HEAPU32[ptr >> 2] = length;
              for (var i = 0; i < length; ++i) {
                  var charCode = getElement(value, i);
                  if (charCode > 255) {
                      _free(ptr);
                      throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                  }
                  HEAPU8[ptr + 4 + i] = charCode;
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_std_wstring(rawType, charSize, name) {
      // nb. do not cache HEAPU16 and HEAPU32, they may be destroyed by enlargeMemory().
      name = readLatin1String(name);
      var getHeap, shift;
      if (charSize === 2) {
          getHeap = function() { return HEAPU16; };
          shift = 1;
      } else if (charSize === 4) {
          getHeap = function() { return HEAPU32; };
          shift = 2;
      }
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var HEAP = getHeap();
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              var start = (value + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAP[start + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              // assumes 4-byte alignment
              var HEAP = getHeap();
              var length = value.length;
              var ptr = _malloc(4 + length * charSize);
              HEAPU32[ptr >> 2] = length;
              var start = (ptr + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  HEAP[start + i] = value.charCodeAt(i);
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_value_object(
      rawType,
      name,
      constructorSignature,
      rawConstructor,
      destructorSignature,
      rawDestructor
    ) {
      structRegistrations[rawType] = {
          name: readLatin1String(name),
          rawConstructor: embind__requireFunction(constructorSignature, rawConstructor),
          rawDestructor: embind__requireFunction(destructorSignature, rawDestructor),
          fields: [],
      };
    }

  function __embind_register_value_object_field(
      structType,
      fieldName,
      getterReturnType,
      getterSignature,
      getter,
      getterContext,
      setterArgumentType,
      setterSignature,
      setter,
      setterContext
    ) {
      structRegistrations[structType].fields.push({
          fieldName: readLatin1String(fieldName),
          getterReturnType: getterReturnType,
          getter: embind__requireFunction(getterSignature, getter),
          getterContext: getterContext,
          setterArgumentType: setterArgumentType,
          setter: embind__requireFunction(setterSignature, setter),
          setterContext: setterContext,
      });
    }

  function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          isVoid: true, // void return values can be optimized out sometimes
          name: name,
          'argPackAdvance': 0,
          'fromWireType': function() {
              return undefined;
          },
          'toWireType': function(destructors, o) {
              // TODO: assert if anything else is given?
              return undefined;
          },
      });
    }


  function __emval_incref(handle) {
      if (handle > 4) {
          emval_handle_array[handle].refcount += 1;
      }
    }

  function __emval_take_value(type, argv) {
      type = requireRegisteredType(type, '_emval_take_value');
      var v = type['readValueFromPointer'](argv);
      return __emval_register(v);
    }

  function _abort() {
      Module['abort']();
    }

   

   



   

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 

   

  
  var PTHREAD_SPECIFIC={};function _pthread_getspecific(key) {
      return PTHREAD_SPECIFIC[key] || 0;
    }

  
  var PTHREAD_SPECIFIC_NEXT_KEY=1;
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _pthread_key_create(key, destructor) {
      if (key == 0) {
        return ERRNO_CODES.EINVAL;
      }
      HEAP32[((key)>>2)]=PTHREAD_SPECIFIC_NEXT_KEY;
      // values start at 0
      PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
      PTHREAD_SPECIFIC_NEXT_KEY++;
      return 0;
    }

  function _pthread_once(ptr, func) {
      if (!_pthread_once.seen) _pthread_once.seen = {};
      if (ptr in _pthread_once.seen) return;
      Module['dynCall_v'](func);
      _pthread_once.seen[ptr] = 1;
    }

  function _pthread_setspecific(key, value) {
      if (!(key in PTHREAD_SPECIFIC)) {
        return ERRNO_CODES.EINVAL;
      }
      PTHREAD_SPECIFIC[key] = value;
      return 0;
    }

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    } 
InternalError = Module['InternalError'] = extendError(Error, 'InternalError');;
embind_init_charCodes();
BindingError = Module['BindingError'] = extendError(Error, 'BindingError');;
init_ClassHandle();
init_RegisteredPointer();
init_embind();;
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');;
init_emval();;
DYNAMICTOP_PTR = staticAlloc(4);

STACK_BASE = STACKTOP = alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

var ASSERTIONS = true;

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}



function nullFunc_dii(x) { Module["printErr"]("Invalid function pointer called with signature 'dii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_i(x) { Module["printErr"]("Invalid function pointer called with signature 'i'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_v(x) { Module["printErr"]("Invalid function pointer called with signature 'v'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vii(x) { Module["printErr"]("Invalid function pointer called with signature 'vii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viid(x) { Module["printErr"]("Invalid function pointer called with signature 'viid'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viii(x) { Module["printErr"]("Invalid function pointer called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_dii(index,a1,a2) {
  try {
    return Module["dynCall_dii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_i(index) {
  try {
    return Module["dynCall_i"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viid(index,a1,a2,a3) {
  try {
    Module["dynCall_viid"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "abortStackOverflow": abortStackOverflow, "nullFunc_dii": nullFunc_dii, "nullFunc_i": nullFunc_i, "nullFunc_ii": nullFunc_ii, "nullFunc_iii": nullFunc_iii, "nullFunc_iiii": nullFunc_iiii, "nullFunc_iiiii": nullFunc_iiiii, "nullFunc_v": nullFunc_v, "nullFunc_vi": nullFunc_vi, "nullFunc_vii": nullFunc_vii, "nullFunc_viid": nullFunc_viid, "nullFunc_viii": nullFunc_viii, "nullFunc_viiii": nullFunc_viiii, "nullFunc_viiiii": nullFunc_viiiii, "nullFunc_viiiiii": nullFunc_viiiiii, "invoke_dii": invoke_dii, "invoke_i": invoke_i, "invoke_ii": invoke_ii, "invoke_iii": invoke_iii, "invoke_iiii": invoke_iiii, "invoke_iiiii": invoke_iiiii, "invoke_v": invoke_v, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_viid": invoke_viid, "invoke_viii": invoke_viii, "invoke_viiii": invoke_viiii, "invoke_viiiii": invoke_viiiii, "invoke_viiiiii": invoke_viiiiii, "ClassHandle": ClassHandle, "ClassHandle_clone": ClassHandle_clone, "ClassHandle_delete": ClassHandle_delete, "ClassHandle_deleteLater": ClassHandle_deleteLater, "ClassHandle_isAliasOf": ClassHandle_isAliasOf, "ClassHandle_isDeleted": ClassHandle_isDeleted, "RegisteredClass": RegisteredClass, "RegisteredPointer": RegisteredPointer, "RegisteredPointer_deleteObject": RegisteredPointer_deleteObject, "RegisteredPointer_destructor": RegisteredPointer_destructor, "RegisteredPointer_fromWireType": RegisteredPointer_fromWireType, "RegisteredPointer_getPointee": RegisteredPointer_getPointee, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "___cxa_begin_catch": ___cxa_begin_catch, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "___gxx_personality_v0": ___gxx_personality_v0, "___lock": ___lock, "___resumeException": ___resumeException, "___setErrNo": ___setErrNo, "___syscall140": ___syscall140, "___syscall146": ___syscall146, "___syscall54": ___syscall54, "___syscall6": ___syscall6, "___unlock": ___unlock, "__embind_finalize_value_object": __embind_finalize_value_object, "__embind_register_bool": __embind_register_bool, "__embind_register_class": __embind_register_class, "__embind_register_class_constructor": __embind_register_class_constructor, "__embind_register_class_function": __embind_register_class_function, "__embind_register_class_property": __embind_register_class_property, "__embind_register_emval": __embind_register_emval, "__embind_register_enum": __embind_register_enum, "__embind_register_enum_value": __embind_register_enum_value, "__embind_register_float": __embind_register_float, "__embind_register_integer": __embind_register_integer, "__embind_register_memory_view": __embind_register_memory_view, "__embind_register_std_string": __embind_register_std_string, "__embind_register_std_wstring": __embind_register_std_wstring, "__embind_register_value_object": __embind_register_value_object, "__embind_register_value_object_field": __embind_register_value_object_field, "__embind_register_void": __embind_register_void, "__emval_decref": __emval_decref, "__emval_incref": __emval_incref, "__emval_register": __emval_register, "__emval_take_value": __emval_take_value, "_abort": _abort, "_embind_repr": _embind_repr, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_pthread_getspecific": _pthread_getspecific, "_pthread_key_create": _pthread_key_create, "_pthread_once": _pthread_once, "_pthread_setspecific": _pthread_setspecific, "constNoSmartPtrRawPointerToWireType": constNoSmartPtrRawPointerToWireType, "count_emval_handles": count_emval_handles, "craftInvokerFunction": craftInvokerFunction, "createNamedFunction": createNamedFunction, "downcastPointer": downcastPointer, "embind__requireFunction": embind__requireFunction, "embind_init_charCodes": embind_init_charCodes, "ensureOverloadTable": ensureOverloadTable, "enumReadValueFromPointer": enumReadValueFromPointer, "exposePublicSymbol": exposePublicSymbol, "extendError": extendError, "floatReadValueFromPointer": floatReadValueFromPointer, "flushPendingDeletes": flushPendingDeletes, "flush_NO_FILESYSTEM": flush_NO_FILESYSTEM, "genericPointerToWireType": genericPointerToWireType, "getBasestPointer": getBasestPointer, "getInheritedInstance": getInheritedInstance, "getInheritedInstanceCount": getInheritedInstanceCount, "getLiveInheritedInstances": getLiveInheritedInstances, "getShiftFromSize": getShiftFromSize, "getTypeName": getTypeName, "get_first_emval": get_first_emval, "heap32VectorToArray": heap32VectorToArray, "init_ClassHandle": init_ClassHandle, "init_RegisteredPointer": init_RegisteredPointer, "init_embind": init_embind, "init_emval": init_emval, "integerReadValueFromPointer": integerReadValueFromPointer, "makeClassHandle": makeClassHandle, "makeLegalFunctionName": makeLegalFunctionName, "new_": new_, "nonConstNoSmartPtrRawPointerToWireType": nonConstNoSmartPtrRawPointerToWireType, "readLatin1String": readLatin1String, "registerType": registerType, "replacePublicSymbol": replacePublicSymbol, "requireRegisteredType": requireRegisteredType, "runDestructor": runDestructor, "runDestructors": runDestructors, "setDelayFunction": setDelayFunction, "shallowCopyInternalPointer": shallowCopyInternalPointer, "simpleReadValueFromPointer": simpleReadValueFromPointer, "throwBindingError": throwBindingError, "throwInstanceAlreadyDeleted": throwInstanceAlreadyDeleted, "throwInternalError": throwInternalError, "throwUnboundTypeError": throwUnboundTypeError, "upcastPointer": upcastPointer, "validateThis": validateThis, "whenDependentTypesAreResolved": whenDependentTypesAreResolved, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (/** @suppress {uselessCode} */ function(global, env, buffer) {
'almost asm';


  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);

  var DYNAMICTOP_PTR=env.DYNAMICTOP_PTR|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntS = 0, tempValue = 0, tempDouble = 0.0;
  var tempRet0 = 0;

  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_max=global.Math.max;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var enlargeMemory=env.enlargeMemory;
  var getTotalMemory=env.getTotalMemory;
  var abortOnCannotGrowMemory=env.abortOnCannotGrowMemory;
  var abortStackOverflow=env.abortStackOverflow;
  var nullFunc_dii=env.nullFunc_dii;
  var nullFunc_i=env.nullFunc_i;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_iii=env.nullFunc_iii;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_iiiii=env.nullFunc_iiiii;
  var nullFunc_v=env.nullFunc_v;
  var nullFunc_vi=env.nullFunc_vi;
  var nullFunc_vii=env.nullFunc_vii;
  var nullFunc_viid=env.nullFunc_viid;
  var nullFunc_viii=env.nullFunc_viii;
  var nullFunc_viiii=env.nullFunc_viiii;
  var nullFunc_viiiii=env.nullFunc_viiiii;
  var nullFunc_viiiiii=env.nullFunc_viiiiii;
  var invoke_dii=env.invoke_dii;
  var invoke_i=env.invoke_i;
  var invoke_ii=env.invoke_ii;
  var invoke_iii=env.invoke_iii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_iiiii=env.invoke_iiiii;
  var invoke_v=env.invoke_v;
  var invoke_vi=env.invoke_vi;
  var invoke_vii=env.invoke_vii;
  var invoke_viid=env.invoke_viid;
  var invoke_viii=env.invoke_viii;
  var invoke_viiii=env.invoke_viiii;
  var invoke_viiiii=env.invoke_viiiii;
  var invoke_viiiiii=env.invoke_viiiiii;
  var ClassHandle=env.ClassHandle;
  var ClassHandle_clone=env.ClassHandle_clone;
  var ClassHandle_delete=env.ClassHandle_delete;
  var ClassHandle_deleteLater=env.ClassHandle_deleteLater;
  var ClassHandle_isAliasOf=env.ClassHandle_isAliasOf;
  var ClassHandle_isDeleted=env.ClassHandle_isDeleted;
  var RegisteredClass=env.RegisteredClass;
  var RegisteredPointer=env.RegisteredPointer;
  var RegisteredPointer_deleteObject=env.RegisteredPointer_deleteObject;
  var RegisteredPointer_destructor=env.RegisteredPointer_destructor;
  var RegisteredPointer_fromWireType=env.RegisteredPointer_fromWireType;
  var RegisteredPointer_getPointee=env.RegisteredPointer_getPointee;
  var __ZSt18uncaught_exceptionv=env.__ZSt18uncaught_exceptionv;
  var ___cxa_begin_catch=env.___cxa_begin_catch;
  var ___cxa_find_matching_catch=env.___cxa_find_matching_catch;
  var ___gxx_personality_v0=env.___gxx_personality_v0;
  var ___lock=env.___lock;
  var ___resumeException=env.___resumeException;
  var ___setErrNo=env.___setErrNo;
  var ___syscall140=env.___syscall140;
  var ___syscall146=env.___syscall146;
  var ___syscall54=env.___syscall54;
  var ___syscall6=env.___syscall6;
  var ___unlock=env.___unlock;
  var __embind_finalize_value_object=env.__embind_finalize_value_object;
  var __embind_register_bool=env.__embind_register_bool;
  var __embind_register_class=env.__embind_register_class;
  var __embind_register_class_constructor=env.__embind_register_class_constructor;
  var __embind_register_class_function=env.__embind_register_class_function;
  var __embind_register_class_property=env.__embind_register_class_property;
  var __embind_register_emval=env.__embind_register_emval;
  var __embind_register_enum=env.__embind_register_enum;
  var __embind_register_enum_value=env.__embind_register_enum_value;
  var __embind_register_float=env.__embind_register_float;
  var __embind_register_integer=env.__embind_register_integer;
  var __embind_register_memory_view=env.__embind_register_memory_view;
  var __embind_register_std_string=env.__embind_register_std_string;
  var __embind_register_std_wstring=env.__embind_register_std_wstring;
  var __embind_register_value_object=env.__embind_register_value_object;
  var __embind_register_value_object_field=env.__embind_register_value_object_field;
  var __embind_register_void=env.__embind_register_void;
  var __emval_decref=env.__emval_decref;
  var __emval_incref=env.__emval_incref;
  var __emval_register=env.__emval_register;
  var __emval_take_value=env.__emval_take_value;
  var _abort=env._abort;
  var _embind_repr=env._embind_repr;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _pthread_getspecific=env._pthread_getspecific;
  var _pthread_key_create=env._pthread_key_create;
  var _pthread_once=env._pthread_once;
  var _pthread_setspecific=env._pthread_setspecific;
  var constNoSmartPtrRawPointerToWireType=env.constNoSmartPtrRawPointerToWireType;
  var count_emval_handles=env.count_emval_handles;
  var craftInvokerFunction=env.craftInvokerFunction;
  var createNamedFunction=env.createNamedFunction;
  var downcastPointer=env.downcastPointer;
  var embind__requireFunction=env.embind__requireFunction;
  var embind_init_charCodes=env.embind_init_charCodes;
  var ensureOverloadTable=env.ensureOverloadTable;
  var enumReadValueFromPointer=env.enumReadValueFromPointer;
  var exposePublicSymbol=env.exposePublicSymbol;
  var extendError=env.extendError;
  var floatReadValueFromPointer=env.floatReadValueFromPointer;
  var flushPendingDeletes=env.flushPendingDeletes;
  var flush_NO_FILESYSTEM=env.flush_NO_FILESYSTEM;
  var genericPointerToWireType=env.genericPointerToWireType;
  var getBasestPointer=env.getBasestPointer;
  var getInheritedInstance=env.getInheritedInstance;
  var getInheritedInstanceCount=env.getInheritedInstanceCount;
  var getLiveInheritedInstances=env.getLiveInheritedInstances;
  var getShiftFromSize=env.getShiftFromSize;
  var getTypeName=env.getTypeName;
  var get_first_emval=env.get_first_emval;
  var heap32VectorToArray=env.heap32VectorToArray;
  var init_ClassHandle=env.init_ClassHandle;
  var init_RegisteredPointer=env.init_RegisteredPointer;
  var init_embind=env.init_embind;
  var init_emval=env.init_emval;
  var integerReadValueFromPointer=env.integerReadValueFromPointer;
  var makeClassHandle=env.makeClassHandle;
  var makeLegalFunctionName=env.makeLegalFunctionName;
  var new_=env.new_;
  var nonConstNoSmartPtrRawPointerToWireType=env.nonConstNoSmartPtrRawPointerToWireType;
  var readLatin1String=env.readLatin1String;
  var registerType=env.registerType;
  var replacePublicSymbol=env.replacePublicSymbol;
  var requireRegisteredType=env.requireRegisteredType;
  var runDestructor=env.runDestructor;
  var runDestructors=env.runDestructors;
  var setDelayFunction=env.setDelayFunction;
  var shallowCopyInternalPointer=env.shallowCopyInternalPointer;
  var simpleReadValueFromPointer=env.simpleReadValueFromPointer;
  var throwBindingError=env.throwBindingError;
  var throwInstanceAlreadyDeleted=env.throwInstanceAlreadyDeleted;
  var throwInternalError=env.throwInternalError;
  var throwUnboundTypeError=env.throwUnboundTypeError;
  var upcastPointer=env.upcastPointer;
  var validateThis=env.validateThis;
  var whenDependentTypesAreResolved=env.whenDependentTypesAreResolved;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
  if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(size|0);

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function ___cxx_global_var_init() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN44EmscriptenBindingInitializer_packet_bindingsC2Ev(9044);
 return;
}
function __ZN44EmscriptenBindingInitializer_packet_bindingsC2Ev($0) {
 $0 = $0|0;
 var $$byval_copy = 0, $$byval_copy182 = 0, $$byval_copy183 = 0, $$byval_copy184 = 0, $$byval_copy185 = 0, $$byval_copy186 = 0, $$byval_copy187 = 0, $$byval_copy188 = 0, $$field = 0, $$field103 = 0, $$field106 = 0, $$field11 = 0, $$field115 = 0, $$field118 = 0, $$field121 = 0, $$field124 = 0, $$field131 = 0, $$field134 = 0, $$field139 = 0, $$field14 = 0;
 var $$field142 = 0, $$field151 = 0, $$field154 = 0, $$field157 = 0, $$field160 = 0, $$field167 = 0, $$field170 = 0, $$field175 = 0, $$field178 = 0, $$field21 = 0, $$field24 = 0, $$field31 = 0, $$field34 = 0, $$field4 = 0, $$field43 = 0, $$field46 = 0, $$field49 = 0, $$field52 = 0, $$field59 = 0, $$field62 = 0;
 var $$field67 = 0, $$field70 = 0, $$field79 = 0, $$field82 = 0, $$field85 = 0, $$field88 = 0, $$field95 = 0, $$field98 = 0, $$index1 = 0, $$index101 = 0, $$index105 = 0, $$index109 = 0, $$index111 = 0, $$index113 = 0, $$index117 = 0, $$index123 = 0, $$index127 = 0, $$index129 = 0, $$index13 = 0, $$index133 = 0;
 var $$index137 = 0, $$index141 = 0, $$index145 = 0, $$index147 = 0, $$index149 = 0, $$index153 = 0, $$index159 = 0, $$index163 = 0, $$index165 = 0, $$index169 = 0, $$index17 = 0, $$index173 = 0, $$index177 = 0, $$index181 = 0, $$index19 = 0, $$index23 = 0, $$index27 = 0, $$index29 = 0, $$index3 = 0, $$index33 = 0;
 var $$index37 = 0, $$index39 = 0, $$index41 = 0, $$index45 = 0, $$index51 = 0, $$index55 = 0, $$index57 = 0, $$index61 = 0, $$index65 = 0, $$index69 = 0, $$index7 = 0, $$index73 = 0, $$index75 = 0, $$index77 = 0, $$index81 = 0, $$index87 = 0, $$index9 = 0, $$index91 = 0, $$index93 = 0, $$index97 = 0;
 var $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0;
 var $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0;
 var $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0;
 var $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0;
 var $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0;
 var $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0;
 var $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0;
 var $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0;
 var $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0;
 var $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0;
 var $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0;
 var $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0;
 var $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0;
 var $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0;
 var $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0;
 var $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0;
 var $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0;
 var $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0;
 var $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0;
 var $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0;
 var $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0;
 var $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0;
 var $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0;
 var $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0;
 var $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0;
 var $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0;
 var $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0;
 var $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0;
 var $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0;
 var $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0;
 var $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0;
 var $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0;
 var $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0;
 var $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0;
 var $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1216|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(1216|0);
 $$byval_copy188 = sp + 1176|0;
 $$byval_copy187 = sp + 1168|0;
 $$byval_copy186 = sp + 1160|0;
 $$byval_copy185 = sp + 1152|0;
 $$byval_copy184 = sp + 1144|0;
 $$byval_copy183 = sp + 1136|0;
 $$byval_copy182 = sp + 1128|0;
 $$byval_copy = sp + 1120|0;
 $5 = sp + 1096|0;
 $6 = sp + 1088|0;
 $9 = sp + 1072|0;
 $10 = sp + 1064|0;
 $11 = sp + 88|0;
 $12 = sp + 80|0;
 $17 = sp + 1040|0;
 $18 = sp + 1032|0;
 $21 = sp + 1016|0;
 $22 = sp + 1008|0;
 $23 = sp + 72|0;
 $24 = sp + 64|0;
 $29 = sp + 984|0;
 $30 = sp + 976|0;
 $33 = sp + 960|0;
 $34 = sp + 952|0;
 $35 = sp + 56|0;
 $36 = sp + 48|0;
 $41 = sp + 928|0;
 $48 = sp + 896|0;
 $49 = sp + 888|0;
 $52 = sp + 872|0;
 $53 = sp + 864|0;
 $54 = sp + 40|0;
 $55 = sp + 32|0;
 $60 = sp + 840|0;
 $67 = sp + 812|0;
 $74 = sp + 784|0;
 $81 = sp + 756|0;
 $88 = sp + 728|0;
 $95 = sp + 700|0;
 $102 = sp + 672|0;
 $109 = sp + 644|0;
 $116 = sp + 616|0;
 $123 = sp + 588|0;
 $130 = sp + 560|0;
 $137 = sp + 532|0;
 $144 = sp + 504|0;
 $151 = sp + 476|0;
 $158 = sp + 448|0;
 $165 = sp + 420|0;
 $172 = sp + 392|0;
 $179 = sp + 364|0;
 $185 = sp + 336|0;
 $187 = sp + 1209|0;
 $188 = sp + 24|0;
 $192 = sp + 312|0;
 $194 = sp + 1208|0;
 $195 = sp + 16|0;
 $199 = sp + 288|0;
 $201 = sp + 1207|0;
 $202 = sp + 8|0;
 $206 = sp + 264|0;
 $208 = sp + 1206|0;
 $209 = sp;
 $213 = sp + 1205|0;
 $227 = sp + 1204|0;
 $228 = sp + 1203|0;
 $229 = sp + 1202|0;
 $230 = sp + 1201|0;
 $231 = sp + 1200|0;
 $232 = sp + 1199|0;
 $233 = sp + 1198|0;
 $234 = sp + 1197|0;
 $235 = sp + 1196|0;
 $236 = sp + 1195|0;
 $237 = sp + 1194|0;
 $238 = sp + 1193|0;
 $239 = sp + 1192|0;
 $240 = sp + 1191|0;
 $241 = sp + 1190|0;
 $242 = sp + 1189|0;
 $243 = sp + 1188|0;
 $244 = sp + 1187|0;
 $245 = sp + 1186|0;
 $246 = sp + 1185|0;
 $247 = sp + 1184|0;
 $248 = sp + 184|0;
 $249 = sp + 176|0;
 $250 = sp + 168|0;
 $251 = sp + 160|0;
 $252 = sp + 152|0;
 $253 = sp + 144|0;
 $254 = sp + 136|0;
 $255 = sp + 128|0;
 $256 = sp + 120|0;
 $257 = sp + 112|0;
 $258 = sp + 104|0;
 $259 = sp + 96|0;
 $226 = $0;
 __ZN10emscripten15register_vectorIhEENS_6class_INSt3__26vectorIT_NS2_9allocatorIS4_EEEENS_8internal11NoBaseClassEEEPKc(1576);
 __ZN10emscripten5enum_IN5Motor5StateEEC2EPKc($227,1586);
 $260 = (__ZN10emscripten5enum_IN5Motor5StateEE5valueEPKcS2_($227,1597,0)|0);
 $261 = (__ZN10emscripten5enum_IN5Motor5StateEE5valueEPKcS2_($260,1601,1)|0);
 (__ZN10emscripten5enum_IN5Motor5StateEE5valueEPKcS2_($261,1604,2)|0);
 __ZN10emscripten5enum_IN10SmartDrive5UnitsEEC2EPKc($228,1610);
 $262 = (__ZN10emscripten5enum_IN10SmartDrive5UnitsEE5valueEPKcS2_($228,1616,0)|0);
 (__ZN10emscripten5enum_IN10SmartDrive5UnitsEE5valueEPKcS2_($262,1624,1)|0);
 __ZN10emscripten5enum_IN10SmartDrive11ControlModeEEC2EPKc($229,1631);
 $263 = (__ZN10emscripten5enum_IN10SmartDrive11ControlModeEE5valueEPKcS2_($229,1653,0)|0);
 $264 = (__ZN10emscripten5enum_IN10SmartDrive11ControlModeEE5valueEPKcS2_($263,1662,1)|0);
 $265 = (__ZN10emscripten5enum_IN10SmartDrive11ControlModeEE5valueEPKcS2_($264,1675,2)|0);
 (__ZN10emscripten5enum_IN10SmartDrive11ControlModeEE5valueEPKcS2_($265,1597,3)|0);
 __ZN10emscripten5enum_IN10SmartDrive12ThrottleModeEEC2EPKc($230,1684);
 $266 = (__ZN10emscripten5enum_IN10SmartDrive12ThrottleModeEE5valueEPKcS2_($230,1697,0)|0);
 (__ZN10emscripten5enum_IN10SmartDrive12ThrottleModeEE5valueEPKcS2_($266,1704,1)|0);
 __ZN10emscripten12value_objectIN10SmartDrive8SettingsEEC2EPKc($231,1713);
 $267 = (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_NS1_11ControlModeEEERS3_PKcMT_T0_($231,1732,0)|0);
 $268 = (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_NS1_5UnitsEEERS3_PKcMT_T0_($267,1610,1)|0);
 $269 = (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_hEERS3_PKcMT_T0_($268,1744,2)|0);
 $270 = (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_hEERS3_PKcMT_T0_($269,1750,3)|0);
 $271 = (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_fEERS3_PKcMT_T0_($270,1758,4)|0);
 $272 = (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_fEERS3_PKcMT_T0_($271,1773,8)|0);
 (__ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_fEERS3_PKcMT_T0_($272,1786,12)|0);
 __ZN10emscripten12value_objectIN10SmartDrive8SettingsEED2Ev($231);
 __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEEC2EPKc($232,1795);
 $273 = (__ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_NS1_12ThrottleModeEEERS3_PKcMT_T0_($232,1684,0)|0);
 $274 = (__ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($273,1812,1)|0);
 $275 = (__ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($274,1821,2)|0);
 $276 = (__ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($275,1830,3)|0);
 (__ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_fEERS3_PKcMT_T0_($276,1786,4)|0);
 __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEED2Ev($232);
 __ZN10emscripten5enum_IN6Packet6DeviceEEC2EPKc($233,1839);
 $277 = (__ZN10emscripten5enum_IN6Packet6DeviceEE5valueEPKcS2_($233,1846,0)|0);
 $278 = (__ZN10emscripten5enum_IN6Packet6DeviceEE5valueEPKcS2_($277,1857,1)|0);
 (__ZN10emscripten5enum_IN6Packet6DeviceEE5valueEPKcS2_($278,1877,2)|0);
 __ZN10emscripten5enum_IN6Packet4TypeEEC2EPKc($234,1889);
 $279 = (__ZN10emscripten5enum_IN6Packet4TypeEE5valueEPKcS2_($234,1900,0)|0);
 $280 = (__ZN10emscripten5enum_IN6Packet4TypeEE5valueEPKcS2_($279,1905,1)|0);
 $281 = (__ZN10emscripten5enum_IN6Packet4TypeEE5valueEPKcS2_($280,1910,2)|0);
 $282 = (__ZN10emscripten5enum_IN6Packet4TypeEE5valueEPKcS2_($281,1604,3)|0);
 (__ZN10emscripten5enum_IN6Packet4TypeEE5valueEPKcS2_($282,1918,4)|0);
 __ZN10emscripten5enum_IN6Packet4DataEEC2EPKc($235,1922);
 $283 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($235,1937,0)|0);
 $284 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($283,1951,1)|0);
 $285 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($284,1957,2)|0);
 $286 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($285,1967,3)|0);
 $287 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($286,1586,4)|0);
 $288 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($287,1974,5)|0);
 $289 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($288,1987,6)|0);
 $290 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($289,1999,7)|0);
 $291 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($290,2009,8)|0);
 $292 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($291,2021,9)|0);
 $293 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($292,2031,10)|0);
 $294 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($293,2042,11)|0);
 $295 = (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($294,2048,12)|0);
 (__ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($295,2058,13)|0);
 __ZN10emscripten12value_objectIN6Packet11VersionInfoEEC2EPKc($236,1987);
 $296 = (__ZN10emscripten12value_objectIN6Packet11VersionInfoEE5fieldIS2_hEERS3_PKcMT_T0_($236,2071,0)|0);
 $297 = (__ZN10emscripten12value_objectIN6Packet11VersionInfoEE5fieldIS2_hEERS3_PKcMT_T0_($296,2083,1)|0);
 (__ZN10emscripten12value_objectIN6Packet11VersionInfoEE5fieldIS2_hEERS3_PKcMT_T0_($297,2094,2)|0);
 __ZN10emscripten12value_objectIN6Packet11VersionInfoEED2Ev($236);
 __ZN10emscripten12value_objectIN6Packet9DailyInfoEEC2EPKc($237,1999);
 $298 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($237,2114,0)|0);
 $299 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($298,2119,2)|0);
 $300 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($299,2125,3)|0);
 $301 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($300,2129,4)|0);
 $302 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($301,2140,6)|0);
 $303 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($302,2154,8)|0);
 $304 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($303,2164,10)|0);
 $305 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($304,2177,12)|0);
 $306 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($305,2186,13)|0);
 $307 = (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($306,2192,14)|0);
 (__ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($307,2202,15)|0);
 __ZN10emscripten12value_objectIN6Packet9DailyInfoEED2Ev($237);
 __ZN10emscripten12value_objectIN6Packet12PushSettingsEEC2EPKc($238,2058);
 $308 = (__ZN10emscripten12value_objectIN6Packet12PushSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($238,2212,0)|0);
 $309 = (__ZN10emscripten12value_objectIN6Packet12PushSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($308,2222,1)|0);
 (__ZN10emscripten12value_objectIN6Packet12PushSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($309,2233,2)|0);
 __ZN10emscripten12value_objectIN6Packet12PushSettingsEED2Ev($238);
 __ZN10emscripten12value_objectIN6Packet11JourneyInfoEEC2EPKc($239,2009);
 $310 = (__ZN10emscripten12value_objectIN6Packet11JourneyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($239,2246,0)|0);
 $311 = (__ZN10emscripten12value_objectIN6Packet11JourneyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($310,2177,2)|0);
 (__ZN10emscripten12value_objectIN6Packet11JourneyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($311,2186,3)|0);
 __ZN10emscripten12value_objectIN6Packet11JourneyInfoEED2Ev($239);
 __ZN10emscripten12value_objectIN6Packet12DistanceInfoEEC2EPKc($240,2253);
 $312 = (__ZN10emscripten12value_objectIN6Packet12DistanceInfoEE5fieldIS2_yEERS3_PKcMT_T0_($240,2266,0)|0);
 (__ZN10emscripten12value_objectIN6Packet12DistanceInfoEE5fieldIS2_yEERS3_PKcMT_T0_($312,2280,8)|0);
 __ZN10emscripten12value_objectIN6Packet12DistanceInfoEED2Ev($240);
 __ZN10emscripten12value_objectIN6Packet9MotorInfoEEC2EPKc($241,2021);
 $313 = (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_N5Motor5StateEEERS3_PKcMT_T0_($241,2293,0)|0);
 $314 = (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($313,2299,1)|0);
 $315 = (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($314,2312,2)|0);
 $316 = (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($315,2320,3)|0);
 $317 = (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_fEERS3_PKcMT_T0_($316,2177,4)|0);
 $318 = (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_fEERS3_PKcMT_T0_($317,2186,8)|0);
 (__ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_fEERS3_PKcMT_T0_($318,2328,12)|0);
 __ZN10emscripten12value_objectIN6Packet9MotorInfoEED2Ev($241);
 __ZN10emscripten12value_objectIN6Packet9ErrorInfoEEC2EPKc($242,2048);
 $319 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($242,2114,0)|0);
 $320 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($319,2119,0)|0);
 $321 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($320,2125,0)|0);
 $322 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($321,2338,0)|0);
 $323 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($322,2343,0)|0);
 $324 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($323,2350,0)|0);
 $325 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_N10SmartDrive5ErrorEEERS3_PKcMT_T0_($324,2357,7)|0);
 $326 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($325,2373,8)|0);
 $327 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($326,2397,9)|0);
 $328 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($327,2418,10)|0);
 $329 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($328,2438,11)|0);
 $330 = (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($329,2457,12)|0);
 (__ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($330,2482,13)|0);
 __ZN10emscripten12value_objectIN6Packet9ErrorInfoEED2Ev($242);
 __ZN10emscripten12value_objectIN6Packet10DeviceInfoEEC2EPKc($243,2031);
 $331 = (__ZN10emscripten12value_objectIN6Packet10DeviceInfoEE5fieldIS2_NS1_6DeviceEEERS3_PKcMT_T0_($243,2505,0)|0);
 (__ZN10emscripten12value_objectIN6Packet10DeviceInfoEE5fieldIS2_hEERS3_PKcMT_T0_($331,2312,1)|0);
 __ZN10emscripten12value_objectIN6Packet10DeviceInfoEED2Ev($243);
 __ZN10emscripten5enum_IN6Packet7CommandEEC2EPKc($244,2512);
 $332 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($244,2530,0)|0);
 $333 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($332,2546,1)|0);
 $334 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($333,2558,2)|0);
 $335 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($334,2562,3)|0);
 $336 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($335,2572,4)|0);
 $337 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($336,2587,5)|0);
 $338 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($337,2599,6)|0);
 $339 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($338,2612,7)|0);
 $340 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($339,2625,8)|0);
 $341 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($340,2637,9)|0);
 $342 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($341,2650,10)|0);
 $343 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($342,2658,11)|0);
 $344 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($343,2667,12)|0);
 $345 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($344,2675,13)|0);
 $346 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($345,2684,14)|0);
 $347 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($346,2694,15)|0);
 $348 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($347,2699,16)|0);
 $349 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($348,2715,17)|0);
 $350 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($349,2725,18)|0);
 $351 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($350,2734,19)|0);
 $352 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($351,2748,20)|0);
 $353 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($352,2765,21)|0);
 $354 = (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($353,2781,22)|0);
 (__ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($354,2793,23)|0);
 __ZN10emscripten5enum_IN6Packet3OTAEEC2EPKc($245,2813);
 $355 = (__ZN10emscripten5enum_IN6Packet3OTAEE5valueEPKcS2_($245,1846,0)|0);
 $356 = (__ZN10emscripten5enum_IN6Packet3OTAEE5valueEPKcS2_($355,1857,1)|0);
 (__ZN10emscripten5enum_IN6Packet3OTAEE5valueEPKcS2_($356,1877,2)|0);
 __ZN10emscripten5enum_IN10SmartDrive5ErrorEEC2EPKc($246,2827);
 $357 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($246,2843,0)|0);
 $358 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($357,2851,1)|0);
 $359 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($358,2866,2)|0);
 $360 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($359,2878,3)|0);
 $361 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($360,2890,4)|0);
 $362 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($361,2906,5)|0);
 $363 = (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($362,2916,6)|0);
 (__ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($363,2931,7)|0);
 $220 = $247;
 $221 = 2945;
 __ZN10emscripten8internal11NoBaseClass6verifyI6PacketEEvv();
 $222 = 28;
 $364 = (__ZN10emscripten8internal11NoBaseClass11getUpcasterI6PacketEEPFvvEv()|0);
 $223 = $364;
 $365 = (__ZN10emscripten8internal11NoBaseClass13getDowncasterI6PacketEEPFvvEv()|0);
 $224 = $365;
 $225 = 29;
 $366 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $367 = (__ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerI6PacketEEE3getEv()|0);
 $368 = (__ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIK6PacketEEE3getEv()|0);
 $369 = (__ZN10emscripten8internal11NoBaseClass3getEv()|0);
 $370 = $222;
 $219 = $370;
 $371 = (__ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv()|0);
 $372 = $222;
 $373 = $223;
 $218 = $373;
 $374 = (__ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv()|0);
 $375 = $223;
 $376 = $224;
 $217 = $376;
 $377 = (__ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv()|0);
 $378 = $224;
 $379 = $221;
 $380 = $225;
 $216 = $380;
 $381 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $382 = $225;
 __embind_register_class(($366|0),($367|0),($368|0),($369|0),($371|0),($372|0),($374|0),($375|0),($377|0),($378|0),($379|0),($381|0),($382|0));
 $215 = $247;
 $383 = $215;
 $211 = $383;
 $212 = 30;
 $384 = $211;
 $214 = 31;
 $385 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $386 = (__ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJP6PacketEE8getCountEv($213)|0);
 $387 = (__ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJP6PacketEE8getTypesEv($213)|0);
 $388 = $214;
 $210 = $388;
 $389 = (__ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv()|0);
 $390 = $214;
 $391 = $212;
 __embind_register_class_constructor(($385|0),($386|0),($387|0),($389|0),($390|0),($391|0));
 HEAP32[$248>>2] = (32);
 $$index1 = ((($248)) + 4|0);
 HEAP32[$$index1>>2] = 0;
 ;HEAP8[$209>>0]=HEAP8[$248>>0]|0;HEAP8[$209+1>>0]=HEAP8[$248+1>>0]|0;HEAP8[$209+2>>0]=HEAP8[$248+2>>0]|0;HEAP8[$209+3>>0]=HEAP8[$248+3>>0]|0;HEAP8[$209+4>>0]=HEAP8[$248+4>>0]|0;HEAP8[$209+5>>0]=HEAP8[$248+5>>0]|0;HEAP8[$209+6>>0]=HEAP8[$248+6>>0]|0;HEAP8[$209+7>>0]=HEAP8[$248+7>>0]|0;
 $$field = HEAP32[$209>>2]|0;
 $$index3 = ((($209)) + 4|0);
 $$field4 = HEAP32[$$index3>>2]|0;
 $204 = $384;
 $205 = 2952;
 HEAP32[$206>>2] = $$field;
 $$index7 = ((($206)) + 4|0);
 HEAP32[$$index7>>2] = $$field4;
 $392 = $204;
 $207 = 33;
 $393 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $394 = $205;
 $395 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEEEE8getCountEv($208)|0);
 $396 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEEEE8getTypesEv($208)|0);
 $397 = $207;
 $203 = $397;
 $398 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $399 = $207;
 $400 = (__ZN10emscripten8internal10getContextIM6PacketFbvEEEPT_RKS5_($206)|0);
 __embind_register_class_function(($393|0),($394|0),($395|0),($396|0),($398|0),($399|0),($400|0),0);
 HEAP32[$249>>2] = (34);
 $$index9 = ((($249)) + 4|0);
 HEAP32[$$index9>>2] = 0;
 ;HEAP8[$202>>0]=HEAP8[$249>>0]|0;HEAP8[$202+1>>0]=HEAP8[$249+1>>0]|0;HEAP8[$202+2>>0]=HEAP8[$249+2>>0]|0;HEAP8[$202+3>>0]=HEAP8[$249+3>>0]|0;HEAP8[$202+4>>0]=HEAP8[$249+4>>0]|0;HEAP8[$202+5>>0]=HEAP8[$249+5>>0]|0;HEAP8[$202+6>>0]=HEAP8[$249+6>>0]|0;HEAP8[$202+7>>0]=HEAP8[$249+7>>0]|0;
 $$field11 = HEAP32[$202>>2]|0;
 $$index13 = ((($202)) + 4|0);
 $$field14 = HEAP32[$$index13>>2]|0;
 $197 = $392;
 $198 = 2958;
 HEAP32[$199>>2] = $$field11;
 $$index17 = ((($199)) + 4|0);
 HEAP32[$$index17>>2] = $$field14;
 $401 = $197;
 $200 = 35;
 $402 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $403 = $198;
 $404 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEENSt3__212basic_stringIcNS7_11char_traitsIcEENS7_9allocatorIcEEEEEE8getCountEv($201)|0);
 $405 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEENSt3__212basic_stringIcNS7_11char_traitsIcEENS7_9allocatorIcEEEEEE8getTypesEv($201)|0);
 $406 = $200;
 $196 = $406;
 $407 = (__ZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcv()|0);
 $408 = $200;
 $409 = (__ZN10emscripten8internal10getContextIM6PacketFbNSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEEEEPT_RKSC_($199)|0);
 __embind_register_class_function(($402|0),($403|0),($404|0),($405|0),($407|0),($408|0),($409|0),0);
 HEAP32[$250>>2] = (36);
 $$index19 = ((($250)) + 4|0);
 HEAP32[$$index19>>2] = 0;
 ;HEAP8[$195>>0]=HEAP8[$250>>0]|0;HEAP8[$195+1>>0]=HEAP8[$250+1>>0]|0;HEAP8[$195+2>>0]=HEAP8[$250+2>>0]|0;HEAP8[$195+3>>0]=HEAP8[$250+3>>0]|0;HEAP8[$195+4>>0]=HEAP8[$250+4>>0]|0;HEAP8[$195+5>>0]=HEAP8[$250+5>>0]|0;HEAP8[$195+6>>0]=HEAP8[$250+6>>0]|0;HEAP8[$195+7>>0]=HEAP8[$250+7>>0]|0;
 $$field21 = HEAP32[$195>>2]|0;
 $$index23 = ((($195)) + 4|0);
 $$field24 = HEAP32[$$index23>>2]|0;
 $190 = $401;
 $191 = 2972;
 HEAP32[$192>>2] = $$field21;
 $$index27 = ((($192)) + 4|0);
 HEAP32[$$index27>>2] = $$field24;
 $410 = $190;
 $193 = 37;
 $411 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $412 = $191;
 $413 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerI6PacketEEEE8getCountEv($194)|0);
 $414 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerI6PacketEEEE8getTypesEv($194)|0);
 $415 = $193;
 $189 = $415;
 $416 = (__ZN10emscripten8internal19getGenericSignatureIJviiEEEPKcv()|0);
 $417 = $193;
 $418 = (__ZN10emscripten8internal10getContextIM6PacketFvvEEEPT_RKS5_($192)|0);
 __embind_register_class_function(($411|0),($412|0),($413|0),($414|0),($416|0),($417|0),($418|0),0);
 HEAP32[$251>>2] = (38);
 $$index29 = ((($251)) + 4|0);
 HEAP32[$$index29>>2] = 0;
 ;HEAP8[$188>>0]=HEAP8[$251>>0]|0;HEAP8[$188+1>>0]=HEAP8[$251+1>>0]|0;HEAP8[$188+2>>0]=HEAP8[$251+2>>0]|0;HEAP8[$188+3>>0]=HEAP8[$251+3>>0]|0;HEAP8[$188+4>>0]=HEAP8[$251+4>>0]|0;HEAP8[$188+5>>0]=HEAP8[$251+5>>0]|0;HEAP8[$188+6>>0]=HEAP8[$251+6>>0]|0;HEAP8[$188+7>>0]=HEAP8[$251+7>>0]|0;
 $$field31 = HEAP32[$188>>2]|0;
 $$index33 = ((($188)) + 4|0);
 $$field34 = HEAP32[$$index33>>2]|0;
 $183 = $410;
 $184 = 2982;
 HEAP32[$185>>2] = $$field31;
 $$index37 = ((($185)) + 4|0);
 HEAP32[$$index37>>2] = $$field34;
 $419 = $183;
 $186 = 39;
 $420 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $421 = $184;
 $422 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNSt3__26vectorIhNS4_9allocatorIhEEEENS0_17AllowedRawPointerI6PacketEEEE8getCountEv($187)|0);
 $423 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNSt3__26vectorIhNS4_9allocatorIhEEEENS0_17AllowedRawPointerI6PacketEEEE8getTypesEv($187)|0);
 $424 = $186;
 $182 = $424;
 $425 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $426 = $186;
 $427 = (__ZN10emscripten8internal10getContextIM6PacketFNSt3__26vectorIhNS3_9allocatorIhEEEEvEEEPT_RKSA_($185)|0);
 __embind_register_class_function(($420|0),($421|0),($422|0),($423|0),($425|0),($426|0),($427|0),0);
 $177 = $419;
 $178 = 2989;
 HEAP32[$179>>2] = 0;
 $428 = $177;
 $180 = 40;
 $181 = 41;
 $429 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $430 = $178;
 $431 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $432 = $180;
 $176 = $432;
 $433 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $434 = $180;
 $435 = (__ZN10emscripten8internal10getContextIM6PacketiEEPT_RKS4_($179)|0);
 $436 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $437 = $181;
 $175 = $437;
 $438 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $439 = $181;
 $440 = (__ZN10emscripten8internal10getContextIM6PacketiEEPT_RKS4_($179)|0);
 __embind_register_class_property(($429|0),($430|0),($431|0),($433|0),($434|0),($435|0),($436|0),($438|0),($439|0),($440|0));
 $170 = $428;
 $171 = 2996;
 HEAP32[$172>>2] = 4;
 $441 = $170;
 $173 = 42;
 $174 = 43;
 $442 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $443 = $171;
 $444 = (__ZN10emscripten8internal6TypeIDIN6Packet4TypeEE3getEv()|0);
 $445 = $173;
 $169 = $445;
 $446 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $447 = $173;
 $448 = (__ZN10emscripten8internal10getContextIM6PacketNS2_4TypeEEEPT_RKS5_($172)|0);
 $449 = (__ZN10emscripten8internal6TypeIDIN6Packet4TypeEE3getEv()|0);
 $450 = $174;
 $168 = $450;
 $451 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $452 = $174;
 $453 = (__ZN10emscripten8internal10getContextIM6PacketNS2_4TypeEEEPT_RKS5_($172)|0);
 __embind_register_class_property(($442|0),($443|0),($444|0),($446|0),($447|0),($448|0),($449|0),($451|0),($452|0),($453|0));
 $163 = $441;
 $164 = 1905;
 HEAP32[$165>>2] = 5;
 $454 = $163;
 $166 = 44;
 $167 = 45;
 $455 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $456 = $164;
 $457 = (__ZN10emscripten8internal6TypeIDIN6Packet4DataEE3getEv()|0);
 $458 = $166;
 $162 = $458;
 $459 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $460 = $166;
 $461 = (__ZN10emscripten8internal10getContextIM6PacketNS2_4DataEEEPT_RKS5_($165)|0);
 $462 = (__ZN10emscripten8internal6TypeIDIN6Packet4DataEE3getEv()|0);
 $463 = $167;
 $161 = $463;
 $464 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $465 = $167;
 $466 = (__ZN10emscripten8internal10getContextIM6PacketNS2_4DataEEEPT_RKS5_($165)|0);
 __embind_register_class_property(($455|0),($456|0),($457|0),($459|0),($460|0),($461|0),($462|0),($464|0),($465|0),($466|0));
 $156 = $454;
 $157 = 1910;
 HEAP32[$158>>2] = 5;
 $467 = $156;
 $159 = 46;
 $160 = 47;
 $468 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $469 = $157;
 $470 = (__ZN10emscripten8internal6TypeIDIN6Packet7CommandEE3getEv()|0);
 $471 = $159;
 $155 = $471;
 $472 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $473 = $159;
 $474 = (__ZN10emscripten8internal10getContextIM6PacketNS2_7CommandEEEPT_RKS5_($158)|0);
 $475 = (__ZN10emscripten8internal6TypeIDIN6Packet7CommandEE3getEv()|0);
 $476 = $160;
 $154 = $476;
 $477 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $478 = $160;
 $479 = (__ZN10emscripten8internal10getContextIM6PacketNS2_7CommandEEEPT_RKS5_($158)|0);
 __embind_register_class_property(($468|0),($469|0),($470|0),($472|0),($473|0),($474|0),($475|0),($477|0),($478|0),($479|0));
 $149 = $467;
 $150 = 1604;
 HEAP32[$151>>2] = 5;
 $480 = $149;
 $152 = 48;
 $153 = 49;
 $481 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $482 = $150;
 $483 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 $484 = $152;
 $148 = $484;
 $485 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $486 = $152;
 $487 = (__ZN10emscripten8internal10getContextIM6PacketN10SmartDrive5ErrorEEEPT_RKS6_($151)|0);
 $488 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 $489 = $153;
 $147 = $489;
 $490 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $491 = $153;
 $492 = (__ZN10emscripten8internal10getContextIM6PacketN10SmartDrive5ErrorEEEPT_RKS6_($151)|0);
 __embind_register_class_property(($481|0),($482|0),($483|0),($485|0),($486|0),($487|0),($488|0),($490|0),($491|0),($492|0));
 $142 = $480;
 $143 = 1918;
 HEAP32[$144>>2] = 5;
 $493 = $142;
 $145 = 50;
 $146 = 51;
 $494 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $495 = $143;
 $496 = (__ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv()|0);
 $497 = $145;
 $141 = $497;
 $498 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $499 = $145;
 $500 = (__ZN10emscripten8internal10getContextIM6PacketNS2_3OTAEEEPT_RKS5_($144)|0);
 $501 = (__ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv()|0);
 $502 = $146;
 $140 = $502;
 $503 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $504 = $146;
 $505 = (__ZN10emscripten8internal10getContextIM6PacketNS2_3OTAEEEPT_RKS5_($144)|0);
 __embind_register_class_property(($494|0),($495|0),($496|0),($498|0),($499|0),($500|0),($501|0),($503|0),($504|0),($505|0));
 $135 = $493;
 $136 = 3001;
 HEAP32[$137>>2] = 8;
 $506 = $135;
 $138 = 52;
 $139 = 53;
 $507 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $508 = $136;
 $509 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $510 = $138;
 $134 = $510;
 $511 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $512 = $138;
 $513 = (__ZN10emscripten8internal10getContextIM6PacketN10SmartDrive8SettingsEEEPT_RKS6_($137)|0);
 $514 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $515 = $139;
 $133 = $515;
 $516 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $517 = $139;
 $518 = (__ZN10emscripten8internal10getContextIM6PacketN10SmartDrive8SettingsEEEPT_RKS6_($137)|0);
 __embind_register_class_property(($507|0),($508|0),($509|0),($511|0),($512|0),($513|0),($514|0),($516|0),($517|0),($518|0));
 $128 = $506;
 $129 = 3010;
 HEAP32[$130>>2] = 8;
 $519 = $128;
 $131 = 54;
 $132 = 55;
 $520 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $521 = $129;
 $522 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 $523 = $131;
 $127 = $523;
 $524 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $525 = $131;
 $526 = (__ZN10emscripten8internal10getContextIM6PacketN10SmartDrive16ThrottleSettingsEEEPT_RKS6_($130)|0);
 $527 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 $528 = $132;
 $126 = $528;
 $529 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $530 = $132;
 $531 = (__ZN10emscripten8internal10getContextIM6PacketN10SmartDrive16ThrottleSettingsEEEPT_RKS6_($130)|0);
 __embind_register_class_property(($520|0),($521|0),($522|0),($524|0),($525|0),($526|0),($527|0),($529|0),($530|0),($531|0));
 $121 = $519;
 $122 = 3027;
 HEAP32[$123>>2] = 8;
 $532 = $121;
 $124 = 56;
 $125 = 57;
 $533 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $534 = $122;
 $535 = (__ZN10emscripten8internal6TypeIDIN6Packet12PushSettingsEE3getEv()|0);
 $536 = $124;
 $120 = $536;
 $537 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $538 = $124;
 $539 = (__ZN10emscripten8internal10getContextIM6PacketNS2_12PushSettingsEEEPT_RKS5_($123)|0);
 $540 = (__ZN10emscripten8internal6TypeIDIN6Packet12PushSettingsEE3getEv()|0);
 $541 = $125;
 $119 = $541;
 $542 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $543 = $125;
 $544 = (__ZN10emscripten8internal10getContextIM6PacketNS2_12PushSettingsEEEPT_RKS5_($123)|0);
 __embind_register_class_property(($533|0),($534|0),($535|0),($537|0),($538|0),($539|0),($540|0),($542|0),($543|0),($544|0));
 $114 = $532;
 $115 = 3040;
 HEAP32[$116>>2] = 8;
 $545 = $114;
 $117 = 58;
 $118 = 59;
 $546 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $547 = $115;
 $548 = (__ZN10emscripten8internal6TypeIDIN6Packet11VersionInfoEE3getEv()|0);
 $549 = $117;
 $113 = $549;
 $550 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $551 = $117;
 $552 = (__ZN10emscripten8internal10getContextIM6PacketNS2_11VersionInfoEEEPT_RKS5_($116)|0);
 $553 = (__ZN10emscripten8internal6TypeIDIN6Packet11VersionInfoEE3getEv()|0);
 $554 = $118;
 $112 = $554;
 $555 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $556 = $118;
 $557 = (__ZN10emscripten8internal10getContextIM6PacketNS2_11VersionInfoEEEPT_RKS5_($116)|0);
 __embind_register_class_property(($546|0),($547|0),($548|0),($550|0),($551|0),($552|0),($553|0),($555|0),($556|0),($557|0));
 $107 = $545;
 $108 = 3052;
 HEAP32[$109>>2] = 8;
 $558 = $107;
 $110 = 60;
 $111 = 61;
 $559 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $560 = $108;
 $561 = (__ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv()|0);
 $562 = $110;
 $106 = $562;
 $563 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $564 = $110;
 $565 = (__ZN10emscripten8internal10getContextIM6PacketNS2_9DailyInfoEEEPT_RKS5_($109)|0);
 $566 = (__ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv()|0);
 $567 = $111;
 $105 = $567;
 $568 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $569 = $111;
 $570 = (__ZN10emscripten8internal10getContextIM6PacketNS2_9DailyInfoEEEPT_RKS5_($109)|0);
 __embind_register_class_property(($559|0),($560|0),($561|0),($563|0),($564|0),($565|0),($566|0),($568|0),($569|0),($570|0));
 $100 = $558;
 $101 = 3062;
 HEAP32[$102>>2] = 8;
 $571 = $100;
 $103 = 62;
 $104 = 63;
 $572 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $573 = $101;
 $574 = (__ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 $575 = $103;
 $99 = $575;
 $576 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $577 = $103;
 $578 = (__ZN10emscripten8internal10getContextIM6PacketNS2_11JourneyInfoEEEPT_RKS5_($102)|0);
 $579 = (__ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 $580 = $104;
 $98 = $580;
 $581 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $582 = $104;
 $583 = (__ZN10emscripten8internal10getContextIM6PacketNS2_11JourneyInfoEEEPT_RKS5_($102)|0);
 __embind_register_class_property(($572|0),($573|0),($574|0),($576|0),($577|0),($578|0),($579|0),($581|0),($582|0),($583|0));
 $93 = $571;
 $94 = 3074;
 HEAP32[$95>>2] = 8;
 $584 = $93;
 $96 = 64;
 $97 = 65;
 $585 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $586 = $94;
 $587 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 $588 = $96;
 $92 = $588;
 $589 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $590 = $96;
 $591 = (__ZN10emscripten8internal10getContextIM6PacketNS2_9MotorInfoEEEPT_RKS5_($95)|0);
 $592 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 $593 = $97;
 $91 = $593;
 $594 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $595 = $97;
 $596 = (__ZN10emscripten8internal10getContextIM6PacketNS2_9MotorInfoEEEPT_RKS5_($95)|0);
 __embind_register_class_property(($585|0),($586|0),($587|0),($589|0),($590|0),($591|0),($592|0),($594|0),($595|0),($596|0));
 $86 = $584;
 $87 = 3084;
 HEAP32[$88>>2] = 8;
 $597 = $86;
 $89 = 66;
 $90 = 67;
 $598 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $599 = $87;
 $600 = (__ZN10emscripten8internal6TypeIDIN6Packet8TimeInfoEE3getEv()|0);
 $601 = $89;
 $85 = $601;
 $602 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $603 = $89;
 $604 = (__ZN10emscripten8internal10getContextIM6PacketNS2_8TimeInfoEEEPT_RKS5_($88)|0);
 $605 = (__ZN10emscripten8internal6TypeIDIN6Packet8TimeInfoEE3getEv()|0);
 $606 = $90;
 $84 = $606;
 $607 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $608 = $90;
 $609 = (__ZN10emscripten8internal10getContextIM6PacketNS2_8TimeInfoEEEPT_RKS5_($88)|0);
 __embind_register_class_property(($598|0),($599|0),($600|0),($602|0),($603|0),($604|0),($605|0),($607|0),($608|0),($609|0));
 $79 = $597;
 $80 = 3093;
 HEAP32[$81>>2] = 8;
 $610 = $79;
 $82 = 68;
 $83 = 69;
 $611 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $612 = $80;
 $613 = (__ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 $614 = $82;
 $78 = $614;
 $615 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $616 = $82;
 $617 = (__ZN10emscripten8internal10getContextIM6PacketNS2_10DeviceInfoEEEPT_RKS5_($81)|0);
 $618 = (__ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 $619 = $83;
 $77 = $619;
 $620 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $621 = $83;
 $622 = (__ZN10emscripten8internal10getContextIM6PacketNS2_10DeviceInfoEEEPT_RKS5_($81)|0);
 __embind_register_class_property(($611|0),($612|0),($613|0),($615|0),($616|0),($617|0),($618|0),($620|0),($621|0),($622|0));
 $72 = $610;
 $73 = 3104;
 HEAP32[$74>>2] = 8;
 $623 = $72;
 $75 = 70;
 $76 = 71;
 $624 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $625 = $73;
 $626 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 $627 = $75;
 $71 = $627;
 $628 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $629 = $75;
 $630 = (__ZN10emscripten8internal10getContextIM6PacketNS2_9ErrorInfoEEEPT_RKS5_($74)|0);
 $631 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 $632 = $76;
 $70 = $632;
 $633 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $634 = $76;
 $635 = (__ZN10emscripten8internal10getContextIM6PacketNS2_9ErrorInfoEEEPT_RKS5_($74)|0);
 __embind_register_class_property(($624|0),($625|0),($626|0),($628|0),($629|0),($630|0),($631|0),($633|0),($634|0),($635|0));
 $65 = $623;
 $66 = 3114;
 HEAP32[$67>>2] = 8;
 $636 = $65;
 $68 = 72;
 $69 = 73;
 $637 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $638 = $66;
 $639 = (__ZN10emscripten8internal6TypeIDIN6Packet11BatteryInfoEE3getEv()|0);
 $640 = $68;
 $64 = $640;
 $641 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $642 = $68;
 $643 = (__ZN10emscripten8internal10getContextIM6PacketNS2_11BatteryInfoEEEPT_RKS5_($67)|0);
 $644 = (__ZN10emscripten8internal6TypeIDIN6Packet11BatteryInfoEE3getEv()|0);
 $645 = $69;
 $63 = $645;
 $646 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $647 = $69;
 $648 = (__ZN10emscripten8internal10getContextIM6PacketNS2_11BatteryInfoEEEPT_RKS5_($67)|0);
 __embind_register_class_property(($637|0),($638|0),($639|0),($641|0),($642|0),($643|0),($644|0),($646|0),($647|0),($648|0));
 $58 = $636;
 $59 = 3126;
 HEAP32[$60>>2] = 8;
 $649 = $58;
 $61 = 74;
 $62 = 75;
 $650 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $651 = $59;
 $652 = (__ZN10emscripten8internal6TypeIDIN6Packet12DistanceInfoEE3getEv()|0);
 $653 = $61;
 $57 = $653;
 $654 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $655 = $61;
 $656 = (__ZN10emscripten8internal10getContextIM6PacketNS2_12DistanceInfoEEEPT_RKS5_($60)|0);
 $657 = (__ZN10emscripten8internal6TypeIDIN6Packet12DistanceInfoEE3getEv()|0);
 $658 = $62;
 $56 = $658;
 $659 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $660 = $62;
 $661 = (__ZN10emscripten8internal10getContextIM6PacketNS2_12DistanceInfoEEEPT_RKS5_($60)|0);
 __embind_register_class_property(($650|0),($651|0),($652|0),($654|0),($655|0),($656|0),($657|0),($659|0),($660|0),($661|0));
 HEAP32[$252>>2] = (76);
 $$index39 = ((($252)) + 4|0);
 HEAP32[$$index39>>2] = 0;
 HEAP32[$253>>2] = (77);
 $$index41 = ((($253)) + 4|0);
 HEAP32[$$index41>>2] = 0;
 ;HEAP8[$54>>0]=HEAP8[$253>>0]|0;HEAP8[$54+1>>0]=HEAP8[$253+1>>0]|0;HEAP8[$54+2>>0]=HEAP8[$253+2>>0]|0;HEAP8[$54+3>>0]=HEAP8[$253+3>>0]|0;HEAP8[$54+4>>0]=HEAP8[$253+4>>0]|0;HEAP8[$54+5>>0]=HEAP8[$253+5>>0]|0;HEAP8[$54+6>>0]=HEAP8[$253+6>>0]|0;HEAP8[$54+7>>0]=HEAP8[$253+7>>0]|0;
 ;HEAP8[$55>>0]=HEAP8[$252>>0]|0;HEAP8[$55+1>>0]=HEAP8[$252+1>>0]|0;HEAP8[$55+2>>0]=HEAP8[$252+2>>0]|0;HEAP8[$55+3>>0]=HEAP8[$252+3>>0]|0;HEAP8[$55+4>>0]=HEAP8[$252+4>>0]|0;HEAP8[$55+5>>0]=HEAP8[$252+5>>0]|0;HEAP8[$55+6>>0]=HEAP8[$252+6>>0]|0;HEAP8[$55+7>>0]=HEAP8[$252+7>>0]|0;
 $$field43 = HEAP32[$55>>2]|0;
 $$index45 = ((($55)) + 4|0);
 $$field46 = HEAP32[$$index45>>2]|0;
 $$field49 = HEAP32[$54>>2]|0;
 $$index51 = ((($54)) + 4|0);
 $$field52 = HEAP32[$$index51>>2]|0;
 $46 = $649;
 $47 = 3139;
 HEAP32[$48>>2] = $$field43;
 $$index55 = ((($48)) + 4|0);
 HEAP32[$$index55>>2] = $$field46;
 HEAP32[$49>>2] = $$field49;
 $$index57 = ((($49)) + 4|0);
 HEAP32[$$index57>>2] = $$field52;
 $662 = $46;
 $50 = 78;
 $51 = 79;
 $663 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $664 = $47;
 $665 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $666 = $50;
 $45 = $666;
 $667 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $668 = $50;
 $$field59 = HEAP32[$48>>2]|0;
 $$index61 = ((($48)) + 4|0);
 $$field62 = HEAP32[$$index61>>2]|0;
 HEAP32[$52>>2] = $$field59;
 $$index65 = ((($52)) + 4|0);
 HEAP32[$$index65>>2] = $$field62;
 ;HEAP32[$$byval_copy>>2]=HEAP32[$52>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$52+4>>2]|0;
 $669 = (__ZN10emscripten8internal12GetterPolicyIM6PacketKFivEE10getContextES4_($$byval_copy)|0);
 $670 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $671 = $51;
 $44 = $671;
 $672 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $673 = $51;
 $$field67 = HEAP32[$49>>2]|0;
 $$index69 = ((($49)) + 4|0);
 $$field70 = HEAP32[$$index69>>2]|0;
 HEAP32[$53>>2] = $$field67;
 $$index73 = ((($53)) + 4|0);
 HEAP32[$$index73>>2] = $$field70;
 ;HEAP32[$$byval_copy182>>2]=HEAP32[$53>>2]|0;HEAP32[$$byval_copy182+4>>2]=HEAP32[$53+4>>2]|0;
 $674 = (__ZN10emscripten8internal12SetterPolicyIM6PacketFviEE10getContextES4_($$byval_copy182)|0);
 __embind_register_class_property(($663|0),($664|0),($665|0),($667|0),($668|0),($669|0),($670|0),($672|0),($673|0),($674|0));
 $39 = $662;
 $40 = 3147;
 HEAP32[$41>>2] = 8;
 $675 = $39;
 $42 = 50;
 $43 = 51;
 $676 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $677 = $40;
 $678 = (__ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv()|0);
 $679 = $42;
 $38 = $679;
 $680 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $681 = $42;
 $682 = (__ZN10emscripten8internal10getContextIM6PacketNS2_3OTAEEEPT_RKS5_($41)|0);
 $683 = (__ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv()|0);
 $684 = $43;
 $37 = $684;
 $685 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $686 = $43;
 $687 = (__ZN10emscripten8internal10getContextIM6PacketNS2_3OTAEEEPT_RKS5_($41)|0);
 __embind_register_class_property(($676|0),($677|0),($678|0),($680|0),($681|0),($682|0),($683|0),($685|0),($686|0),($687|0));
 HEAP32[$254>>2] = (80);
 $$index75 = ((($254)) + 4|0);
 HEAP32[$$index75>>2] = 0;
 HEAP32[$255>>2] = (81);
 $$index77 = ((($255)) + 4|0);
 HEAP32[$$index77>>2] = 0;
 ;HEAP8[$35>>0]=HEAP8[$255>>0]|0;HEAP8[$35+1>>0]=HEAP8[$255+1>>0]|0;HEAP8[$35+2>>0]=HEAP8[$255+2>>0]|0;HEAP8[$35+3>>0]=HEAP8[$255+3>>0]|0;HEAP8[$35+4>>0]=HEAP8[$255+4>>0]|0;HEAP8[$35+5>>0]=HEAP8[$255+5>>0]|0;HEAP8[$35+6>>0]=HEAP8[$255+6>>0]|0;HEAP8[$35+7>>0]=HEAP8[$255+7>>0]|0;
 ;HEAP8[$36>>0]=HEAP8[$254>>0]|0;HEAP8[$36+1>>0]=HEAP8[$254+1>>0]|0;HEAP8[$36+2>>0]=HEAP8[$254+2>>0]|0;HEAP8[$36+3>>0]=HEAP8[$254+3>>0]|0;HEAP8[$36+4>>0]=HEAP8[$254+4>>0]|0;HEAP8[$36+5>>0]=HEAP8[$254+5>>0]|0;HEAP8[$36+6>>0]=HEAP8[$254+6>>0]|0;HEAP8[$36+7>>0]=HEAP8[$254+7>>0]|0;
 $$field79 = HEAP32[$36>>2]|0;
 $$index81 = ((($36)) + 4|0);
 $$field82 = HEAP32[$$index81>>2]|0;
 $$field85 = HEAP32[$35>>2]|0;
 $$index87 = ((($35)) + 4|0);
 $$field88 = HEAP32[$$index87>>2]|0;
 $27 = $675;
 $28 = 2266;
 HEAP32[$29>>2] = $$field79;
 $$index91 = ((($29)) + 4|0);
 HEAP32[$$index91>>2] = $$field82;
 HEAP32[$30>>2] = $$field85;
 $$index93 = ((($30)) + 4|0);
 HEAP32[$$index93>>2] = $$field88;
 $688 = $27;
 $31 = 78;
 $32 = 79;
 $689 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $690 = $28;
 $691 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $692 = $31;
 $26 = $692;
 $693 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $694 = $31;
 $$field95 = HEAP32[$29>>2]|0;
 $$index97 = ((($29)) + 4|0);
 $$field98 = HEAP32[$$index97>>2]|0;
 HEAP32[$33>>2] = $$field95;
 $$index101 = ((($33)) + 4|0);
 HEAP32[$$index101>>2] = $$field98;
 ;HEAP32[$$byval_copy183>>2]=HEAP32[$33>>2]|0;HEAP32[$$byval_copy183+4>>2]=HEAP32[$33+4>>2]|0;
 $695 = (__ZN10emscripten8internal12GetterPolicyIM6PacketKFivEE10getContextES4_($$byval_copy183)|0);
 $696 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $697 = $32;
 $25 = $697;
 $698 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $699 = $32;
 $$field103 = HEAP32[$30>>2]|0;
 $$index105 = ((($30)) + 4|0);
 $$field106 = HEAP32[$$index105>>2]|0;
 HEAP32[$34>>2] = $$field103;
 $$index109 = ((($34)) + 4|0);
 HEAP32[$$index109>>2] = $$field106;
 ;HEAP32[$$byval_copy184>>2]=HEAP32[$34>>2]|0;HEAP32[$$byval_copy184+4>>2]=HEAP32[$34+4>>2]|0;
 $700 = (__ZN10emscripten8internal12SetterPolicyIM6PacketFviEE10getContextES4_($$byval_copy184)|0);
 __embind_register_class_property(($689|0),($690|0),($691|0),($693|0),($694|0),($695|0),($696|0),($698|0),($699|0),($700|0));
 HEAP32[$256>>2] = (82);
 $$index111 = ((($256)) + 4|0);
 HEAP32[$$index111>>2] = 0;
 HEAP32[$257>>2] = (83);
 $$index113 = ((($257)) + 4|0);
 HEAP32[$$index113>>2] = 0;
 ;HEAP8[$23>>0]=HEAP8[$257>>0]|0;HEAP8[$23+1>>0]=HEAP8[$257+1>>0]|0;HEAP8[$23+2>>0]=HEAP8[$257+2>>0]|0;HEAP8[$23+3>>0]=HEAP8[$257+3>>0]|0;HEAP8[$23+4>>0]=HEAP8[$257+4>>0]|0;HEAP8[$23+5>>0]=HEAP8[$257+5>>0]|0;HEAP8[$23+6>>0]=HEAP8[$257+6>>0]|0;HEAP8[$23+7>>0]=HEAP8[$257+7>>0]|0;
 ;HEAP8[$24>>0]=HEAP8[$256>>0]|0;HEAP8[$24+1>>0]=HEAP8[$256+1>>0]|0;HEAP8[$24+2>>0]=HEAP8[$256+2>>0]|0;HEAP8[$24+3>>0]=HEAP8[$256+3>>0]|0;HEAP8[$24+4>>0]=HEAP8[$256+4>>0]|0;HEAP8[$24+5>>0]=HEAP8[$256+5>>0]|0;HEAP8[$24+6>>0]=HEAP8[$256+6>>0]|0;HEAP8[$24+7>>0]=HEAP8[$256+7>>0]|0;
 $$field115 = HEAP32[$24>>2]|0;
 $$index117 = ((($24)) + 4|0);
 $$field118 = HEAP32[$$index117>>2]|0;
 $$field121 = HEAP32[$23>>2]|0;
 $$index123 = ((($23)) + 4|0);
 $$field124 = HEAP32[$$index123>>2]|0;
 $15 = $688;
 $16 = 2280;
 HEAP32[$17>>2] = $$field115;
 $$index127 = ((($17)) + 4|0);
 HEAP32[$$index127>>2] = $$field118;
 HEAP32[$18>>2] = $$field121;
 $$index129 = ((($18)) + 4|0);
 HEAP32[$$index129>>2] = $$field124;
 $701 = $15;
 $19 = 78;
 $20 = 79;
 $702 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $703 = $16;
 $704 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $705 = $19;
 $14 = $705;
 $706 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $707 = $19;
 $$field131 = HEAP32[$17>>2]|0;
 $$index133 = ((($17)) + 4|0);
 $$field134 = HEAP32[$$index133>>2]|0;
 HEAP32[$21>>2] = $$field131;
 $$index137 = ((($21)) + 4|0);
 HEAP32[$$index137>>2] = $$field134;
 ;HEAP32[$$byval_copy185>>2]=HEAP32[$21>>2]|0;HEAP32[$$byval_copy185+4>>2]=HEAP32[$21+4>>2]|0;
 $708 = (__ZN10emscripten8internal12GetterPolicyIM6PacketKFivEE10getContextES4_($$byval_copy185)|0);
 $709 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $710 = $20;
 $13 = $710;
 $711 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $712 = $20;
 $$field139 = HEAP32[$18>>2]|0;
 $$index141 = ((($18)) + 4|0);
 $$field142 = HEAP32[$$index141>>2]|0;
 HEAP32[$22>>2] = $$field139;
 $$index145 = ((($22)) + 4|0);
 HEAP32[$$index145>>2] = $$field142;
 ;HEAP32[$$byval_copy186>>2]=HEAP32[$22>>2]|0;HEAP32[$$byval_copy186+4>>2]=HEAP32[$22+4>>2]|0;
 $713 = (__ZN10emscripten8internal12SetterPolicyIM6PacketFviEE10getContextES4_($$byval_copy186)|0);
 __embind_register_class_property(($702|0),($703|0),($704|0),($706|0),($707|0),($708|0),($709|0),($711|0),($712|0),($713|0));
 HEAP32[$258>>2] = (84);
 $$index147 = ((($258)) + 4|0);
 HEAP32[$$index147>>2] = 0;
 HEAP32[$259>>2] = (85);
 $$index149 = ((($259)) + 4|0);
 HEAP32[$$index149>>2] = 0;
 ;HEAP8[$11>>0]=HEAP8[$259>>0]|0;HEAP8[$11+1>>0]=HEAP8[$259+1>>0]|0;HEAP8[$11+2>>0]=HEAP8[$259+2>>0]|0;HEAP8[$11+3>>0]=HEAP8[$259+3>>0]|0;HEAP8[$11+4>>0]=HEAP8[$259+4>>0]|0;HEAP8[$11+5>>0]=HEAP8[$259+5>>0]|0;HEAP8[$11+6>>0]=HEAP8[$259+6>>0]|0;HEAP8[$11+7>>0]=HEAP8[$259+7>>0]|0;
 ;HEAP8[$12>>0]=HEAP8[$258>>0]|0;HEAP8[$12+1>>0]=HEAP8[$258+1>>0]|0;HEAP8[$12+2>>0]=HEAP8[$258+2>>0]|0;HEAP8[$12+3>>0]=HEAP8[$258+3>>0]|0;HEAP8[$12+4>>0]=HEAP8[$258+4>>0]|0;HEAP8[$12+5>>0]=HEAP8[$258+5>>0]|0;HEAP8[$12+6>>0]=HEAP8[$258+6>>0]|0;HEAP8[$12+7>>0]=HEAP8[$258+7>>0]|0;
 $$field151 = HEAP32[$12>>2]|0;
 $$index153 = ((($12)) + 4|0);
 $$field154 = HEAP32[$$index153>>2]|0;
 $$field157 = HEAP32[$11>>2]|0;
 $$index159 = ((($11)) + 4|0);
 $$field160 = HEAP32[$$index159>>2]|0;
 $3 = $701;
 $4 = 3157;
 HEAP32[$5>>2] = $$field151;
 $$index163 = ((($5)) + 4|0);
 HEAP32[$$index163>>2] = $$field154;
 HEAP32[$6>>2] = $$field157;
 $$index165 = ((($6)) + 4|0);
 HEAP32[$$index165>>2] = $$field160;
 $7 = 86;
 $8 = 87;
 $714 = (__ZN10emscripten8internal6TypeIDI6PacketE3getEv()|0);
 $715 = $4;
 $716 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $717 = $7;
 $2 = $717;
 $718 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $719 = $7;
 $$field167 = HEAP32[$5>>2]|0;
 $$index169 = ((($5)) + 4|0);
 $$field170 = HEAP32[$$index169>>2]|0;
 HEAP32[$9>>2] = $$field167;
 $$index173 = ((($9)) + 4|0);
 HEAP32[$$index173>>2] = $$field170;
 ;HEAP32[$$byval_copy187>>2]=HEAP32[$9>>2]|0;HEAP32[$$byval_copy187+4>>2]=HEAP32[$9+4>>2]|0;
 $720 = (__ZN10emscripten8internal12GetterPolicyIM6PacketKFNSt3__26vectorIhNS3_9allocatorIhEEEEvEE10getContextES9_($$byval_copy187)|0);
 $721 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $722 = $8;
 $1 = $722;
 $723 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $724 = $8;
 $$field175 = HEAP32[$6>>2]|0;
 $$index177 = ((($6)) + 4|0);
 $$field178 = HEAP32[$$index177>>2]|0;
 HEAP32[$10>>2] = $$field175;
 $$index181 = ((($10)) + 4|0);
 HEAP32[$$index181>>2] = $$field178;
 ;HEAP32[$$byval_copy188>>2]=HEAP32[$10>>2]|0;HEAP32[$$byval_copy188+4>>2]=HEAP32[$10+4>>2]|0;
 $725 = (__ZN10emscripten8internal12SetterPolicyIM6PacketFvNSt3__26vectorIhNS3_9allocatorIhEEEEEE10getContextES9_($$byval_copy188)|0);
 __embind_register_class_property(($714|0),($715|0),($716|0),($718|0),($719|0),($720|0),($721|0),($723|0),($724|0),($725|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten15register_vectorIhEENS_6class_INSt3__26vectorIT_NS2_9allocatorIS4_EEEENS_8internal11NoBaseClassEEEPKc($0) {
 $0 = $0|0;
 var $$field = 0, $$field11 = 0, $$field14 = 0, $$field19 = 0, $$field22 = 0, $$field27 = 0, $$field30 = 0, $$field37 = 0, $$field40 = 0, $$field6 = 0, $$index1 = 0, $$index13 = 0, $$index17 = 0, $$index21 = 0, $$index25 = 0, $$index29 = 0, $$index3 = 0, $$index33 = 0, $$index35 = 0, $$index39 = 0;
 var $$index43 = 0, $$index5 = 0, $$index9 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $14 = 0, $15 = 0;
 var $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(256|0);
 $4 = sp + 228|0;
 $5 = sp + 250|0;
 $10 = sp + 208|0;
 $11 = sp + 249|0;
 $16 = sp + 184|0;
 $18 = sp + 248|0;
 $19 = sp + 16|0;
 $23 = sp + 160|0;
 $25 = sp + 247|0;
 $26 = sp + 8|0;
 $30 = sp + 136|0;
 $32 = sp + 246|0;
 $33 = sp;
 $37 = sp + 245|0;
 $51 = sp + 56|0;
 $52 = sp + 48|0;
 $53 = sp + 244|0;
 $54 = sp + 40|0;
 $55 = sp + 32|0;
 $56 = sp + 24|0;
 $50 = $0;
 HEAP32[$51>>2] = (88);
 $$index1 = ((($51)) + 4|0);
 HEAP32[$$index1>>2] = 0;
 HEAP32[$52>>2] = (89);
 $$index3 = ((($52)) + 4|0);
 HEAP32[$$index3>>2] = 0;
 $57 = $50;
 $44 = $53;
 $45 = $57;
 __ZN10emscripten8internal11NoBaseClass6verifyINSt3__26vectorIhNS3_9allocatorIhEEEEEEvv();
 $46 = 90;
 $58 = (__ZN10emscripten8internal11NoBaseClass11getUpcasterINSt3__26vectorIhNS3_9allocatorIhEEEEEEPFvvEv()|0);
 $47 = $58;
 $59 = (__ZN10emscripten8internal11NoBaseClass13getDowncasterINSt3__26vectorIhNS3_9allocatorIhEEEEEEPFvvEv()|0);
 $48 = $59;
 $49 = 91;
 $60 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $61 = (__ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerINSt3__26vectorIhNS3_9allocatorIhEEEEEEE3getEv()|0);
 $62 = (__ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIKNSt3__26vectorIhNS3_9allocatorIhEEEEEEE3getEv()|0);
 $63 = (__ZN10emscripten8internal11NoBaseClass3getEv()|0);
 $64 = $46;
 $43 = $64;
 $65 = (__ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv()|0);
 $66 = $46;
 $67 = $47;
 $42 = $67;
 $68 = (__ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv()|0);
 $69 = $47;
 $70 = $48;
 $41 = $70;
 $71 = (__ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv()|0);
 $72 = $48;
 $73 = $45;
 $74 = $49;
 $40 = $74;
 $75 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $76 = $49;
 __embind_register_class(($60|0),($61|0),($62|0),($63|0),($65|0),($66|0),($68|0),($69|0),($71|0),($72|0),($73|0),($75|0),($76|0));
 $39 = $53;
 $77 = $39;
 $35 = $77;
 $36 = 92;
 $78 = $35;
 $38 = 93;
 $79 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $80 = (__ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorIhNS5_9allocatorIhEEEEEE8getCountEv($37)|0);
 $81 = (__ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorIhNS5_9allocatorIhEEEEEE8getTypesEv($37)|0);
 $82 = $38;
 $34 = $82;
 $83 = (__ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv()|0);
 $84 = $38;
 $85 = $36;
 __embind_register_class_constructor(($79|0),($80|0),($81|0),($83|0),($84|0),($85|0));
 $$field = HEAP32[$51>>2]|0;
 $$index5 = ((($51)) + 4|0);
 $$field6 = HEAP32[$$index5>>2]|0;
 HEAP32[$54>>2] = $$field;
 $$index9 = ((($54)) + 4|0);
 HEAP32[$$index9>>2] = $$field6;
 ;HEAP8[$33>>0]=HEAP8[$54>>0]|0;HEAP8[$33+1>>0]=HEAP8[$54+1>>0]|0;HEAP8[$33+2>>0]=HEAP8[$54+2>>0]|0;HEAP8[$33+3>>0]=HEAP8[$54+3>>0]|0;HEAP8[$33+4>>0]=HEAP8[$54+4>>0]|0;HEAP8[$33+5>>0]=HEAP8[$54+5>>0]|0;HEAP8[$33+6>>0]=HEAP8[$54+6>>0]|0;HEAP8[$33+7>>0]=HEAP8[$54+7>>0]|0;
 $$field11 = HEAP32[$33>>2]|0;
 $$index13 = ((($33)) + 4|0);
 $$field14 = HEAP32[$$index13>>2]|0;
 $28 = $78;
 $29 = 3163;
 HEAP32[$30>>2] = $$field11;
 $$index17 = ((($30)) + 4|0);
 HEAP32[$$index17>>2] = $$field14;
 $86 = $28;
 $31 = 94;
 $87 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $88 = $29;
 $89 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEERKhEE8getCountEv($32)|0);
 $90 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEERKhEE8getTypesEv($32)|0);
 $91 = $31;
 $27 = $91;
 $92 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $93 = $31;
 $94 = (__ZN10emscripten8internal10getContextIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvRKhEEEPT_RKSB_($30)|0);
 __embind_register_class_function(($87|0),($88|0),($89|0),($90|0),($92|0),($93|0),($94|0),0);
 $$field19 = HEAP32[$52>>2]|0;
 $$index21 = ((($52)) + 4|0);
 $$field22 = HEAP32[$$index21>>2]|0;
 HEAP32[$55>>2] = $$field19;
 $$index25 = ((($55)) + 4|0);
 HEAP32[$$index25>>2] = $$field22;
 ;HEAP8[$26>>0]=HEAP8[$55>>0]|0;HEAP8[$26+1>>0]=HEAP8[$55+1>>0]|0;HEAP8[$26+2>>0]=HEAP8[$55+2>>0]|0;HEAP8[$26+3>>0]=HEAP8[$55+3>>0]|0;HEAP8[$26+4>>0]=HEAP8[$55+4>>0]|0;HEAP8[$26+5>>0]=HEAP8[$55+5>>0]|0;HEAP8[$26+6>>0]=HEAP8[$55+6>>0]|0;HEAP8[$26+7>>0]=HEAP8[$55+7>>0]|0;
 $$field27 = HEAP32[$26>>2]|0;
 $$index29 = ((($26)) + 4|0);
 $$field30 = HEAP32[$$index29>>2]|0;
 $21 = $86;
 $22 = 3173;
 HEAP32[$23>>2] = $$field27;
 $$index33 = ((($23)) + 4|0);
 HEAP32[$$index33>>2] = $$field30;
 $95 = $21;
 $24 = 95;
 $96 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $97 = $22;
 $98 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEEjRKhEE8getCountEv($25)|0);
 $99 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEEjRKhEE8getTypesEv($25)|0);
 $100 = $24;
 $20 = $100;
 $101 = (__ZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcv()|0);
 $102 = $24;
 $103 = (__ZN10emscripten8internal10getContextIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvjRKhEEEPT_RKSB_($23)|0);
 __embind_register_class_function(($96|0),($97|0),($98|0),($99|0),($101|0),($102|0),($103|0),0);
 HEAP32[$56>>2] = (96);
 $$index35 = ((($56)) + 4|0);
 HEAP32[$$index35>>2] = 0;
 ;HEAP8[$19>>0]=HEAP8[$56>>0]|0;HEAP8[$19+1>>0]=HEAP8[$56+1>>0]|0;HEAP8[$19+2>>0]=HEAP8[$56+2>>0]|0;HEAP8[$19+3>>0]=HEAP8[$56+3>>0]|0;HEAP8[$19+4>>0]=HEAP8[$56+4>>0]|0;HEAP8[$19+5>>0]=HEAP8[$56+5>>0]|0;HEAP8[$19+6>>0]=HEAP8[$56+6>>0]|0;HEAP8[$19+7>>0]=HEAP8[$56+7>>0]|0;
 $$field37 = HEAP32[$19>>2]|0;
 $$index39 = ((($19)) + 4|0);
 $$field40 = HEAP32[$$index39>>2]|0;
 $14 = $95;
 $15 = 3180;
 HEAP32[$16>>2] = $$field37;
 $$index43 = ((($16)) + 4|0);
 HEAP32[$$index43>>2] = $$field40;
 $104 = $14;
 $17 = 97;
 $105 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $106 = $15;
 $107 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJjNS0_17AllowedRawPointerIKNSt3__26vectorIhNS5_9allocatorIhEEEEEEEE8getCountEv($18)|0);
 $108 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJjNS0_17AllowedRawPointerIKNSt3__26vectorIhNS5_9allocatorIhEEEEEEEE8getTypesEv($18)|0);
 $109 = $17;
 $13 = $109;
 $110 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $111 = $17;
 $112 = (__ZN10emscripten8internal10getContextIMNSt3__26vectorIhNS2_9allocatorIhEEEEKFjvEEEPT_RKS9_($16)|0);
 __embind_register_class_function(($105|0),($106|0),($107|0),($108|0),($110|0),($111|0),($112|0),0);
 $8 = $104;
 $9 = 3185;
 HEAP32[$10>>2] = 98;
 $113 = $8;
 $12 = 99;
 $114 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $115 = $9;
 $116 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorIhNS5_9allocatorIhEEEEjEE8getCountEv($11)|0);
 $117 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorIhNS5_9allocatorIhEEEEjEE8getTypesEv($11)|0);
 $118 = $12;
 $7 = $118;
 $119 = (__ZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcv()|0);
 $120 = $12;
 $121 = (__ZN10emscripten8internal10getContextIPFNS_3valERKNSt3__26vectorIhNS3_9allocatorIhEEEEjEEEPT_RKSC_($10)|0);
 __embind_register_class_function(($114|0),($115|0),($116|0),($117|0),($119|0),($120|0),($121|0),0);
 $2 = $113;
 $3 = 3189;
 HEAP32[$4>>2] = 100;
 $6 = 101;
 $122 = (__ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 $123 = $3;
 $124 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorIhNS4_9allocatorIhEEEEjRKhEE8getCountEv($5)|0);
 $125 = (__ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorIhNS4_9allocatorIhEEEEjRKhEE8getTypesEv($5)|0);
 $126 = $6;
 $1 = $126;
 $127 = (__ZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcv()|0);
 $128 = $6;
 $129 = (__ZN10emscripten8internal10getContextIPFbRNSt3__26vectorIhNS2_9allocatorIhEEEEjRKhEEEPT_RKSC_($4)|0);
 __embind_register_class_function(($122|0),($123|0),($124|0),($125|0),($127|0),($128|0),($129|0),0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN5Motor5StateEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN5Motor5StateEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN5Motor5StateEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN5Motor5StateEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN10SmartDrive5UnitsEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5UnitsEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN10SmartDrive5UnitsEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5UnitsEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN10SmartDrive11ControlModeEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive11ControlModeEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN10SmartDrive11ControlModeEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive11ControlModeEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN10SmartDrive12ThrottleModeEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive12ThrottleModeEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN10SmartDrive12ThrottleModeEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive12ThrottleModeEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive8SettingsEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 102;
 $7 = 103;
 $9 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_NS1_11ControlModeEEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 104;
 $9 = 105;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive11ControlModeEE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsENS2_11ControlModeEEEPT_RKS6_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive11ControlModeEE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsENS2_11ControlModeEEEPT_RKS6_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_NS1_5UnitsEEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 106;
 $9 = 107;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5UnitsEE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsENS2_5UnitsEEEPT_RKS6_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5UnitsEE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsENS2_5UnitsEEEPT_RKS6_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 108;
 $9 = 109;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive8SettingsEE5fieldIS2_fEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 110;
 $9 = 111;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJfiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsEfEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviifEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsEfEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive8SettingsEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 112;
 $7 = 113;
 $9 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_NS1_12ThrottleModeEEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 114;
 $9 = 115;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive12ThrottleModeEE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEEEPT_RKS6_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive12ThrottleModeEE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEEEPT_RKS6_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 116;
 $9 = 117;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEE5fieldIS2_fEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 118;
 $9 = 119;
 $11 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJfiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsEfEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviifEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsEfEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN10SmartDrive16ThrottleSettingsEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet6DeviceEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN6Packet6DeviceEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet6DeviceEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN6Packet6DeviceEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN6Packet4TypeEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN6Packet4TypeEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet4TypeEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN6Packet4TypeEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN6Packet4DataEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN6Packet4DataEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet4DataEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN6Packet4DataEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten12value_objectIN6Packet11VersionInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 120;
 $7 = 121;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet11VersionInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet11VersionInfoEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 122;
 $9 = 123;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet11VersionInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet11VersionInfoEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet11VersionInfoEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet11VersionInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet11VersionInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet9DailyInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 124;
 $7 = 125;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 126;
 $9 = 127;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9DailyInfoEtEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9DailyInfoEtEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9DailyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 128;
 $9 = 129;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9DailyInfoEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9DailyInfoEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9DailyInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet12PushSettingsEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 130;
 $7 = 131;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet12PushSettingsEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet12PushSettingsEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 132;
 $9 = 133;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet12PushSettingsEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet12PushSettingsEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet12PushSettingsEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet12PushSettingsEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet12PushSettingsEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet11JourneyInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 134;
 $7 = 135;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet11JourneyInfoEE5fieldIS2_tEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 136;
 $9 = 137;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet11JourneyInfoEtEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet11JourneyInfoEtEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet11JourneyInfoEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 138;
 $9 = 139;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet11JourneyInfoEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet11JourneyInfoEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet11JourneyInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet12DistanceInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 140;
 $7 = 141;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet12DistanceInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet12DistanceInfoEE5fieldIS2_yEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 142;
 $9 = 143;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet12DistanceInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIyE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet12DistanceInfoEyEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIyE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet12DistanceInfoEyEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet12DistanceInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet12DistanceInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet9MotorInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 144;
 $7 = 145;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_N5Motor5StateEEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 146;
 $9 = 147;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIN5Motor5StateEE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEN5Motor5StateEEEPT_RKS7_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIN5Motor5StateEE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEN5Motor5StateEEEPT_RKS7_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 148;
 $9 = 149;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9MotorInfoEE5fieldIS2_fEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 150;
 $9 = 151;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJfiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEfEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviifEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEfEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9MotorInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet9ErrorInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 152;
 $7 = 153;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_tEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 154;
 $9 = 155;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEtEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEtEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_N10SmartDrive5ErrorEEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 156;
 $9 = 157;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEN10SmartDrive5ErrorEEEPT_RKS7_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEN10SmartDrive5ErrorEEEPT_RKS7_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9ErrorInfoEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 158;
 $9 = 159;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet9ErrorInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet10DeviceInfoEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = $0;
 $5 = $1;
 $8 = $4;
 __ZN10emscripten8internal11noncopyableC2Ev($8);
 $6 = 160;
 $7 = 161;
 $9 = (__ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 $10 = $5;
 $11 = $6;
 $3 = $11;
 $12 = (__ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv()|0);
 $13 = $6;
 $14 = $7;
 $2 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv()|0);
 $16 = $7;
 __embind_register_value_object(($9|0),($10|0),($12|0),($13|0),($15|0),($16|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten12value_objectIN6Packet10DeviceInfoEE5fieldIS2_NS1_6DeviceEEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 162;
 $9 = 163;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIN6Packet6DeviceEE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet10DeviceInfoENS2_6DeviceEEEPT_RKS6_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIN6Packet6DeviceEE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet10DeviceInfoENS2_6DeviceEEEPT_RKS6_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet10DeviceInfoEE5fieldIS2_hEERS3_PKcMT_T0_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $7 = sp + 8|0;
 $5 = $0;
 $6 = $1;
 HEAP32[$7>>2] = $2;
 $10 = $5;
 $8 = 164;
 $9 = 165;
 $11 = (__ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 $12 = $6;
 $13 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $14 = $8;
 $4 = $14;
 $15 = (__ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv()|0);
 $16 = $8;
 $17 = (__ZN10emscripten8internal10getContextIMN6Packet10DeviceInfoEhEEPT_RKS5_($7)|0);
 $18 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $19 = $9;
 $3 = $19;
 $20 = (__ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv()|0);
 $21 = $9;
 $22 = (__ZN10emscripten8internal10getContextIMN6Packet10DeviceInfoEhEEPT_RKS5_($7)|0);
 __embind_register_value_object_field(($11|0),($12|0),($13|0),($15|0),($16|0),($17|0),($18|0),($20|0),($21|0),($22|0));
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten12value_objectIN6Packet10DeviceInfoEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 __embind_finalize_value_object(($3|0));
 __ZN10emscripten8internal11noncopyableD2Ev($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet7CommandEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN6Packet7CommandEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet7CommandEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN6Packet7CommandEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN6Packet3OTAEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN6Packet3OTAEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN10emscripten5enum_IN10SmartDrive5ErrorEEC2EPKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 $5 = $3;
 __embind_register_enum(($4|0),($5|0),1,0);
 STACKTOP = sp;return;
}
function __ZN10emscripten5enum_IN10SmartDrive5ErrorEE5valueEPKcS2_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 $8 = $4;
 $9 = $5;
 $10 = $9&255;
 __embind_register_enum_value(($7|0),($8|0),($10|0));
 STACKTOP = sp;return ($6|0);
}
function __ZN6Packet5validEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ((($2)) + 24|0);
 $4 = HEAP8[$3>>0]|0;
 $5 = $4&1;
 STACKTOP = sp;return ($5|0);
}
function __ZN6Packet13processPacketENSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$expand_i1_val = 0, $$expand_i1_val6 = 0, $$expand_i1_val8 = 0, $$pre_trunc = 0, $$sink4 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 352|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(352|0);
 $82 = sp + 344|0;
 $83 = $0;
 $89 = $83;
 $81 = $1;
 $90 = $81;
 $80 = $90;
 $91 = $80;
 $79 = $91;
 $92 = $79;
 $78 = $92;
 $93 = $78;
 $94 = ((($93)) + 11|0);
 $95 = HEAP8[$94>>0]|0;
 $96 = $95&255;
 $97 = $96 & 128;
 $98 = ($97|0)!=(0);
 if ($98) {
  $74 = $90;
  $99 = $74;
  $73 = $99;
  $100 = $73;
  $72 = $100;
  $101 = $72;
  $102 = ((($101)) + 4|0);
  $103 = HEAP32[$102>>2]|0;
  $110 = $103;
 } else {
  $77 = $90;
  $104 = $77;
  $76 = $104;
  $105 = $76;
  $75 = $105;
  $106 = $75;
  $107 = ((($106)) + 11|0);
  $108 = HEAP8[$107>>0]|0;
  $109 = $108&255;
  $110 = $109;
 }
 $84 = $110;
 $111 = $84;
 $112 = ($111|0)<(2);
 $113 = $84;
 $114 = ($113|0)>(18);
 $or$cond = $112 | $114;
 if ($or$cond) {
  $$expand_i1_val = 0;
  HEAP8[$82>>0] = $$expand_i1_val;
  $$pre_trunc = HEAP8[$82>>0]|0;
  $249 = $$pre_trunc&1;
  STACKTOP = sp;return ($249|0);
 }
 $85 = 2;
 $86 = 1;
 $87 = 0;
 $115 = $87;
 $14 = $1;
 $15 = $115;
 $116 = $14;
 $13 = $116;
 $117 = $13;
 $12 = $117;
 $118 = $12;
 $11 = $118;
 $119 = $11;
 $10 = $119;
 $120 = $10;
 $121 = ((($120)) + 11|0);
 $122 = HEAP8[$121>>0]|0;
 $123 = $122&255;
 $124 = $123 & 128;
 $125 = ($124|0)!=(0);
 if ($125) {
  $4 = $117;
  $126 = $4;
  $3 = $126;
  $127 = $3;
  $2 = $127;
  $128 = $2;
  $129 = HEAP32[$128>>2]|0;
  $137 = $129;
 } else {
  $9 = $117;
  $130 = $9;
  $8 = $130;
  $131 = $8;
  $7 = $131;
  $132 = $7;
  $6 = $132;
  $133 = $6;
  $5 = $133;
  $134 = $5;
  $137 = $134;
 }
 $135 = $15;
 $136 = (($137) + ($135)|0);
 $138 = HEAP8[$136>>0]|0;
 $139 = ((($89)) + 4|0);
 HEAP8[$139>>0] = $138;
 $140 = ((($89)) + 4|0);
 $141 = HEAP8[$140>>0]|0;
 switch ($141<<24>>24) {
 case 1:  {
  $142 = $86;
  $28 = $1;
  $29 = $142;
  $143 = $28;
  $27 = $143;
  $144 = $27;
  $26 = $144;
  $145 = $26;
  $25 = $145;
  $146 = $25;
  $24 = $146;
  $147 = $24;
  $148 = ((($147)) + 11|0);
  $149 = HEAP8[$148>>0]|0;
  $150 = $149&255;
  $151 = $150 & 128;
  $152 = ($151|0)!=(0);
  if ($152) {
   $18 = $144;
   $153 = $18;
   $17 = $153;
   $154 = $17;
   $16 = $154;
   $155 = $16;
   $156 = HEAP32[$155>>2]|0;
   $164 = $156;
  } else {
   $23 = $144;
   $157 = $23;
   $22 = $157;
   $158 = $22;
   $21 = $158;
   $159 = $21;
   $20 = $159;
   $160 = $20;
   $19 = $160;
   $161 = $19;
   $164 = $161;
  }
  $162 = $29;
  $163 = (($164) + ($162)|0);
  $$sink4 = $163;
  label = 23;
  break;
 }
 case 2:  {
  $165 = $86;
  $42 = $1;
  $43 = $165;
  $166 = $42;
  $41 = $166;
  $167 = $41;
  $40 = $167;
  $168 = $40;
  $39 = $168;
  $169 = $39;
  $38 = $169;
  $170 = $38;
  $171 = ((($170)) + 11|0);
  $172 = HEAP8[$171>>0]|0;
  $173 = $172&255;
  $174 = $173 & 128;
  $175 = ($174|0)!=(0);
  if ($175) {
   $32 = $167;
   $176 = $32;
   $31 = $176;
   $177 = $31;
   $30 = $177;
   $178 = $30;
   $179 = HEAP32[$178>>2]|0;
   $187 = $179;
  } else {
   $37 = $167;
   $180 = $37;
   $36 = $180;
   $181 = $36;
   $35 = $181;
   $182 = $35;
   $34 = $182;
   $183 = $34;
   $33 = $183;
   $184 = $33;
   $187 = $184;
  }
  $185 = $43;
  $186 = (($187) + ($185)|0);
  $$sink4 = $186;
  label = 23;
  break;
 }
 case 3:  {
  $188 = $86;
  $56 = $1;
  $57 = $188;
  $189 = $56;
  $55 = $189;
  $190 = $55;
  $54 = $190;
  $191 = $54;
  $53 = $191;
  $192 = $53;
  $52 = $192;
  $193 = $52;
  $194 = ((($193)) + 11|0);
  $195 = HEAP8[$194>>0]|0;
  $196 = $195&255;
  $197 = $196 & 128;
  $198 = ($197|0)!=(0);
  if ($198) {
   $46 = $190;
   $199 = $46;
   $45 = $199;
   $200 = $45;
   $44 = $200;
   $201 = $44;
   $202 = HEAP32[$201>>2]|0;
   $210 = $202;
  } else {
   $51 = $190;
   $203 = $51;
   $50 = $203;
   $204 = $50;
   $49 = $204;
   $205 = $49;
   $48 = $205;
   $206 = $48;
   $47 = $206;
   $207 = $47;
   $210 = $207;
  }
  $208 = $57;
  $209 = (($210) + ($208)|0);
  $$sink4 = $209;
  label = 23;
  break;
 }
 case 4:  {
  break;
 }
 default: {
  $$expand_i1_val6 = 0;
  HEAP8[$82>>0] = $$expand_i1_val6;
  $$pre_trunc = HEAP8[$82>>0]|0;
  $249 = $$pre_trunc&1;
  STACKTOP = sp;return ($249|0);
 }
 }
 if ((label|0) == 23) {
  $211 = HEAP8[$$sink4>>0]|0;
  $212 = ((($89)) + 5|0);
  HEAP8[$212>>0] = $211;
 }
 $213 = $84;
 $214 = (($213) - 2)|0;
 HEAP32[$89>>2] = $214;
 $88 = 0;
 while(1) {
  $215 = $88;
  $216 = HEAP32[$89>>2]|0;
  $217 = ($215|0)<($216|0);
  if (!($217)) {
   break;
  }
  $218 = $85;
  $219 = $88;
  $220 = (($218) + ($219))|0;
  $70 = $1;
  $71 = $220;
  $221 = $70;
  $69 = $221;
  $222 = $69;
  $68 = $222;
  $223 = $68;
  $67 = $223;
  $224 = $67;
  $66 = $224;
  $225 = $66;
  $226 = ((($225)) + 11|0);
  $227 = HEAP8[$226>>0]|0;
  $228 = $227&255;
  $229 = $228 & 128;
  $230 = ($229|0)!=(0);
  if ($230) {
   $60 = $222;
   $231 = $60;
   $59 = $231;
   $232 = $59;
   $58 = $232;
   $233 = $58;
   $234 = HEAP32[$233>>2]|0;
   $242 = $234;
  } else {
   $65 = $222;
   $235 = $65;
   $64 = $235;
   $236 = $64;
   $63 = $236;
   $237 = $63;
   $62 = $237;
   $238 = $62;
   $61 = $238;
   $239 = $61;
   $242 = $239;
  }
  $240 = $71;
  $241 = (($242) + ($240)|0);
  $243 = HEAP8[$241>>0]|0;
  $244 = ((($89)) + 8|0);
  $245 = $88;
  $246 = (($244) + ($245)|0);
  HEAP8[$246>>0] = $243;
  $247 = $88;
  $248 = (($247) + 1)|0;
  $88 = $248;
 }
 $$expand_i1_val8 = 1;
 HEAP8[$82>>0] = $$expand_i1_val8;
 $$pre_trunc = HEAP8[$82>>0]|0;
 $249 = $$pre_trunc&1;
 STACKTOP = sp;return ($249|0);
}
function __ZN6Packet9newPacketEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 HEAP32[$2>>2] = 0;
 $3 = ((($2)) + 24|0);
 HEAP8[$3>>0] = 0;
 $4 = ((($2)) + 4|0);
 HEAP8[$4>>0] = 0;
 STACKTOP = sp;return;
}
function __ZN6Packet6formatEv($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$pre_trunc = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0;
 var $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0;
 var $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0;
 var $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0;
 var $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0;
 var $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0;
 var $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0;
 var $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0;
 var $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0;
 var $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0;
 var $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0;
 var $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0;
 var $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0;
 var $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0;
 var $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0;
 var $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0;
 var $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0;
 var $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 768|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(768|0);
 $14 = sp + 40|0;
 $19 = sp + 757|0;
 $29 = sp + 756|0;
 $43 = sp + 32|0;
 $48 = sp + 755|0;
 $59 = sp + 754|0;
 $73 = sp + 24|0;
 $78 = sp + 753|0;
 $89 = sp + 752|0;
 $103 = sp + 16|0;
 $108 = sp + 751|0;
 $119 = sp + 750|0;
 $133 = sp + 8|0;
 $138 = sp + 749|0;
 $149 = sp + 748|0;
 $163 = sp;
 $168 = sp + 747|0;
 $179 = sp + 746|0;
 $183 = sp + 84|0;
 $186 = sp + 72|0;
 $191 = sp + 745|0;
 $193 = sp + 744|0;
 $195 = sp + 743|0;
 $196 = sp + 742|0;
 $197 = sp + 741|0;
 $198 = sp + 740|0;
 $190 = $1;
 $200 = $190;
 $$expand_i1_val = 0;
 HEAP8[$191>>0] = $$expand_i1_val;
 $189 = $0;
 $201 = $189;
 $188 = $201;
 $202 = $188;
 $187 = $202;
 HEAP32[$202>>2] = 0;
 $203 = ((($202)) + 4|0);
 HEAP32[$203>>2] = 0;
 $204 = ((($202)) + 8|0);
 $185 = $204;
 HEAP32[$186>>2] = 0;
 $205 = $185;
 $184 = $186;
 $206 = $184;
 $207 = HEAP32[$206>>2]|0;
 $182 = $205;
 HEAP32[$183>>2] = $207;
 $208 = $182;
 $181 = $208;
 $180 = $183;
 $209 = $180;
 $210 = HEAP32[$209>>2]|0;
 HEAP32[$208>>2] = $210;
 $192 = 2;
 $211 = ((($200)) + 4|0);
 $212 = HEAP8[$211>>0]|0;
 HEAP8[$193>>0] = $212;
 $177 = $0;
 $178 = $193;
 $213 = $177;
 $214 = ((($213)) + 4|0);
 $215 = HEAP32[$214>>2]|0;
 $176 = $213;
 $216 = $176;
 $217 = ((($216)) + 8|0);
 $175 = $217;
 $218 = $175;
 $174 = $218;
 $219 = $174;
 $220 = HEAP32[$219>>2]|0;
 $221 = ($215>>>0)<($220>>>0);
 if ($221) {
  $171 = $179;
  $172 = $213;
  $173 = 1;
  $152 = $213;
  $222 = $152;
  $223 = ((($222)) + 8|0);
  $151 = $223;
  $224 = $151;
  $150 = $224;
  $225 = $150;
  $226 = ((($213)) + 4|0);
  $227 = HEAP32[$226>>2]|0;
  $153 = $227;
  $228 = $153;
  $229 = $178;
  $154 = $229;
  $230 = $154;
  $165 = $225;
  $166 = $228;
  $167 = $230;
  $231 = $165;
  $232 = $166;
  $233 = $167;
  $164 = $233;
  $234 = $164;
  ;HEAP8[$163>>0]=HEAP8[$168>>0]|0;
  $160 = $231;
  $161 = $232;
  $162 = $234;
  $235 = $160;
  $236 = $161;
  $237 = $162;
  $159 = $237;
  $238 = $159;
  $156 = $235;
  $157 = $236;
  $158 = $238;
  $239 = $157;
  $240 = $158;
  $155 = $240;
  $241 = $155;
  $242 = HEAP8[$241>>0]|0;
  HEAP8[$239>>0] = $242;
  $169 = $179;
  $243 = ((($213)) + 4|0);
  $244 = HEAP32[$243>>2]|0;
  $245 = ((($244)) + 1|0);
  HEAP32[$243>>2] = $245;
 } else {
  $246 = $178;
  $170 = $246;
  $247 = $170;
  __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($213,$247);
 }
 $194 = 0;
 $248 = ((($200)) + 4|0);
 $249 = HEAP8[$248>>0]|0;
 L5: do {
  switch ($249<<24>>24) {
  case 1:  {
   $250 = ((($200)) + 5|0);
   $251 = HEAP8[$250>>0]|0;
   HEAP8[$195>>0] = $251;
   $147 = $0;
   $148 = $195;
   $252 = $147;
   $253 = ((($252)) + 4|0);
   $254 = HEAP32[$253>>2]|0;
   $146 = $252;
   $255 = $146;
   $256 = ((($255)) + 8|0);
   $145 = $256;
   $257 = $145;
   $144 = $257;
   $258 = $144;
   $259 = HEAP32[$258>>2]|0;
   $260 = ($254>>>0)<($259>>>0);
   if ($260) {
    $141 = $149;
    $142 = $252;
    $143 = 1;
    $122 = $252;
    $261 = $122;
    $262 = ((($261)) + 8|0);
    $121 = $262;
    $263 = $121;
    $120 = $263;
    $264 = $120;
    $265 = ((($252)) + 4|0);
    $266 = HEAP32[$265>>2]|0;
    $123 = $266;
    $267 = $123;
    $268 = $148;
    $124 = $268;
    $269 = $124;
    $135 = $264;
    $136 = $267;
    $137 = $269;
    $270 = $135;
    $271 = $136;
    $272 = $137;
    $134 = $272;
    $273 = $134;
    ;HEAP8[$133>>0]=HEAP8[$138>>0]|0;
    $130 = $270;
    $131 = $271;
    $132 = $273;
    $274 = $130;
    $275 = $131;
    $276 = $132;
    $129 = $276;
    $277 = $129;
    $126 = $274;
    $127 = $275;
    $128 = $277;
    $278 = $127;
    $279 = $128;
    $125 = $279;
    $280 = $125;
    $281 = HEAP8[$280>>0]|0;
    HEAP8[$278>>0] = $281;
    $139 = $149;
    $282 = ((($252)) + 4|0);
    $283 = HEAP32[$282>>2]|0;
    $284 = ((($283)) + 1|0);
    HEAP32[$282>>2] = $284;
   } else {
    $285 = $148;
    $140 = $285;
    $286 = $140;
    __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($252,$286);
   }
   $287 = ((($200)) + 5|0);
   $288 = HEAP8[$287>>0]|0;
   do {
    switch ($288<<24>>24) {
    case 0:  {
     $194 = 16;
     break L5;
     break;
    }
    case 1:  {
     $194 = 4;
     break L5;
     break;
    }
    case 2:  {
     $194 = 4;
     break L5;
     break;
    }
    case 3:  {
     $194 = 2;
     break L5;
     break;
    }
    case 4:  {
     $194 = 1;
     break L5;
     break;
    }
    case 5:  {
     $194 = 1;
     break L5;
     break;
    }
    case 6:  {
     $194 = 3;
     break L5;
     break;
    }
    case 7:  {
     $194 = 16;
     break L5;
     break;
    }
    case 8:  {
     $194 = 4;
     break L5;
     break;
    }
    case 9:  {
     $194 = 16;
     break L5;
     break;
    }
    case 10:  {
     $194 = 2;
     break L5;
     break;
    }
    case 11:  {
     $194 = 0;
     break L5;
     break;
    }
    case 12:  {
     $194 = 14;
     break L5;
     break;
    }
    case 13:  {
     $194 = 3;
     break L5;
     break;
    }
    default: {
     break L5;
    }
    }
   } while(0);
   break;
  }
  case 2:  {
   $289 = ((($200)) + 5|0);
   $290 = HEAP8[$289>>0]|0;
   HEAP8[$196>>0] = $290;
   $117 = $0;
   $118 = $196;
   $291 = $117;
   $292 = ((($291)) + 4|0);
   $293 = HEAP32[$292>>2]|0;
   $116 = $291;
   $294 = $116;
   $295 = ((($294)) + 8|0);
   $115 = $295;
   $296 = $115;
   $114 = $296;
   $297 = $114;
   $298 = HEAP32[$297>>2]|0;
   $299 = ($293>>>0)<($298>>>0);
   if ($299) {
    $111 = $119;
    $112 = $291;
    $113 = 1;
    $92 = $291;
    $300 = $92;
    $301 = ((($300)) + 8|0);
    $91 = $301;
    $302 = $91;
    $90 = $302;
    $303 = $90;
    $304 = ((($291)) + 4|0);
    $305 = HEAP32[$304>>2]|0;
    $93 = $305;
    $306 = $93;
    $307 = $118;
    $94 = $307;
    $308 = $94;
    $105 = $303;
    $106 = $306;
    $107 = $308;
    $309 = $105;
    $310 = $106;
    $311 = $107;
    $104 = $311;
    $312 = $104;
    ;HEAP8[$103>>0]=HEAP8[$108>>0]|0;
    $100 = $309;
    $101 = $310;
    $102 = $312;
    $313 = $100;
    $314 = $101;
    $315 = $102;
    $99 = $315;
    $316 = $99;
    $96 = $313;
    $97 = $314;
    $98 = $316;
    $317 = $97;
    $318 = $98;
    $95 = $318;
    $319 = $95;
    $320 = HEAP8[$319>>0]|0;
    HEAP8[$317>>0] = $320;
    $109 = $119;
    $321 = ((($291)) + 4|0);
    $322 = HEAP32[$321>>2]|0;
    $323 = ((($322)) + 1|0);
    HEAP32[$321>>2] = $323;
   } else {
    $324 = $118;
    $110 = $324;
    $325 = $110;
    __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($291,$325);
   }
   $326 = ((($200)) + 5|0);
   $327 = HEAP8[$326>>0]|0;
   switch ($327<<24>>24) {
   case 0:  {
    $194 = 4;
    break L5;
    break;
   }
   case 1:  {
    $194 = 4;
    break L5;
    break;
   }
   case 23:  {
    $194 = 8;
    break L5;
    break;
   }
   case 21:  {
    $194 = 3;
    break L5;
    break;
   }
   case 4:  {
    $194 = 1;
    break L5;
    break;
   }
   case 5:  {
    $194 = 16;
    break L5;
    break;
   }
   case 12:  {
    $194 = 1;
    break L5;
    break;
   }
   case 11:  {
    $194 = 1;
    break L5;
    break;
   }
   case 10:  {
    $194 = 8;
    break L5;
    break;
   }
   default: {
    break L5;
   }
   }
   break;
  }
  case 3:  {
   $328 = ((($200)) + 5|0);
   $329 = HEAP8[$328>>0]|0;
   HEAP8[$197>>0] = $329;
   $87 = $0;
   $88 = $197;
   $330 = $87;
   $331 = ((($330)) + 4|0);
   $332 = HEAP32[$331>>2]|0;
   $86 = $330;
   $333 = $86;
   $334 = ((($333)) + 8|0);
   $85 = $334;
   $335 = $85;
   $84 = $335;
   $336 = $84;
   $337 = HEAP32[$336>>2]|0;
   $338 = ($332>>>0)<($337>>>0);
   if ($338) {
    $81 = $89;
    $82 = $330;
    $83 = 1;
    $62 = $330;
    $339 = $62;
    $340 = ((($339)) + 8|0);
    $61 = $340;
    $341 = $61;
    $60 = $341;
    $342 = $60;
    $343 = ((($330)) + 4|0);
    $344 = HEAP32[$343>>2]|0;
    $63 = $344;
    $345 = $63;
    $346 = $88;
    $64 = $346;
    $347 = $64;
    $75 = $342;
    $76 = $345;
    $77 = $347;
    $348 = $75;
    $349 = $76;
    $350 = $77;
    $74 = $350;
    $351 = $74;
    ;HEAP8[$73>>0]=HEAP8[$78>>0]|0;
    $70 = $348;
    $71 = $349;
    $72 = $351;
    $352 = $70;
    $353 = $71;
    $354 = $72;
    $69 = $354;
    $355 = $69;
    $66 = $352;
    $67 = $353;
    $68 = $355;
    $356 = $67;
    $357 = $68;
    $65 = $357;
    $358 = $65;
    $359 = HEAP8[$358>>0]|0;
    HEAP8[$356>>0] = $359;
    $79 = $89;
    $360 = ((($330)) + 4|0);
    $361 = HEAP32[$360>>2]|0;
    $362 = ((($361)) + 1|0);
    HEAP32[$360>>2] = $362;
   } else {
    $363 = $88;
    $80 = $363;
    $364 = $80;
    __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($330,$364);
   }
   $194 = 8;
   break;
  }
  case 4:  {
   $365 = ((($200)) + 5|0);
   $366 = HEAP8[$365>>0]|0;
   HEAP8[$198>>0] = $366;
   $57 = $0;
   $58 = $198;
   $367 = $57;
   $368 = ((($367)) + 4|0);
   $369 = HEAP32[$368>>2]|0;
   $56 = $367;
   $370 = $56;
   $371 = ((($370)) + 8|0);
   $55 = $371;
   $372 = $55;
   $54 = $372;
   $373 = $54;
   $374 = HEAP32[$373>>2]|0;
   $375 = ($369>>>0)<($374>>>0);
   if ($375) {
    $51 = $59;
    $52 = $367;
    $53 = 1;
    $32 = $367;
    $376 = $32;
    $377 = ((($376)) + 8|0);
    $31 = $377;
    $378 = $31;
    $30 = $378;
    $379 = $30;
    $380 = ((($367)) + 4|0);
    $381 = HEAP32[$380>>2]|0;
    $33 = $381;
    $382 = $33;
    $383 = $58;
    $34 = $383;
    $384 = $34;
    $45 = $379;
    $46 = $382;
    $47 = $384;
    $385 = $45;
    $386 = $46;
    $387 = $47;
    $44 = $387;
    $388 = $44;
    ;HEAP8[$43>>0]=HEAP8[$48>>0]|0;
    $40 = $385;
    $41 = $386;
    $42 = $388;
    $389 = $40;
    $390 = $41;
    $391 = $42;
    $39 = $391;
    $392 = $39;
    $36 = $389;
    $37 = $390;
    $38 = $392;
    $393 = $37;
    $394 = $38;
    $35 = $394;
    $395 = $35;
    $396 = HEAP8[$395>>0]|0;
    HEAP8[$393>>0] = $396;
    $49 = $59;
    $397 = ((($367)) + 4|0);
    $398 = HEAP32[$397>>2]|0;
    $399 = ((($398)) + 1|0);
    HEAP32[$397>>2] = $399;
   } else {
    $400 = $58;
    $50 = $400;
    $401 = $50;
    __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($367,$401);
   }
   $402 = HEAP32[$200>>2]|0;
   $194 = $402;
   break;
  }
  default: {
  }
  }
 } while(0);
 $199 = 0;
 while(1) {
  $403 = $199;
  $404 = $194;
  $405 = ($403|0)<($404|0);
  if (!($405)) {
   break;
  }
  $406 = ((($200)) + 8|0);
  $407 = $199;
  $408 = (($406) + ($407)|0);
  $27 = $0;
  $28 = $408;
  $409 = $27;
  $410 = ((($409)) + 4|0);
  $411 = HEAP32[$410>>2]|0;
  $26 = $409;
  $412 = $26;
  $413 = ((($412)) + 8|0);
  $25 = $413;
  $414 = $25;
  $24 = $414;
  $415 = $24;
  $416 = HEAP32[$415>>2]|0;
  $417 = ($411|0)!=($416|0);
  if ($417) {
   $21 = $29;
   $22 = $409;
   $23 = 1;
   $4 = $409;
   $418 = $4;
   $419 = ((($418)) + 8|0);
   $3 = $419;
   $420 = $3;
   $2 = $420;
   $421 = $2;
   $422 = ((($409)) + 4|0);
   $423 = HEAP32[$422>>2]|0;
   $5 = $423;
   $424 = $5;
   $425 = $28;
   $16 = $421;
   $17 = $424;
   $18 = $425;
   $426 = $16;
   $427 = $17;
   $428 = $18;
   $15 = $428;
   $429 = $15;
   ;HEAP8[$14>>0]=HEAP8[$19>>0]|0;
   $11 = $426;
   $12 = $427;
   $13 = $429;
   $430 = $11;
   $431 = $12;
   $432 = $13;
   $10 = $432;
   $433 = $10;
   $7 = $430;
   $8 = $431;
   $9 = $433;
   $434 = $8;
   $435 = $9;
   $6 = $435;
   $436 = $6;
   $437 = HEAP8[$436>>0]|0;
   HEAP8[$434>>0] = $437;
   $20 = $29;
   $438 = ((($409)) + 4|0);
   $439 = HEAP32[$438>>2]|0;
   $440 = ((($439)) + 1|0);
   HEAP32[$438>>2] = $440;
  } else {
   $441 = $28;
   __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIRKhEEvOT_($409,$441);
  }
  $442 = $199;
  $443 = (($442) + 1)|0;
  $199 = $443;
 }
 $444 = $194;
 $445 = $192;
 $446 = (($445) + ($444))|0;
 $192 = $446;
 __ZNSt3__26vectorIhNS_9allocatorIhEEE13shrink_to_fitEv($0);
 $$expand_i1_val2 = 1;
 HEAP8[$191>>0] = $$expand_i1_val2;
 $$pre_trunc = HEAP8[$191>>0]|0;
 $447 = $$pre_trunc&1;
 if ($447) {
  STACKTOP = sp;return;
 }
 __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($0);
 STACKTOP = sp;return;
}
function __ZNK6Packet10getErrorIdEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ((($2)) + 8|0);
 $4 = $3;
 $5 = $4;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + 4)|0;
 $8 = $7;
 $9 = HEAP32[$8>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function __ZN6Packet10setErrorIdEi($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $3;
 $6 = ($5|0)<(0);
 $7 = $6 << 31 >> 31;
 $8 = ((($4)) + 8|0);
 $9 = $8;
 $10 = $9;
 HEAP32[$10>>2] = $5;
 $11 = (($9) + 4)|0;
 $12 = $11;
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function __ZNK6Packet16getMotorDistanceEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ((($2)) + 8|0);
 $4 = $3;
 $5 = $4;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + 4)|0;
 $8 = $7;
 $9 = HEAP32[$8>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function __ZN6Packet16setMotorDistanceEi($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $3;
 $6 = ($5|0)<(0);
 $7 = $6 << 31 >> 31;
 $8 = ((($4)) + 8|0);
 $9 = $8;
 $10 = $9;
 HEAP32[$10>>2] = $5;
 $11 = (($9) + 4)|0;
 $12 = $11;
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function __ZNK6Packet15getCaseDistanceEv($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ((($2)) + 8|0);
 $4 = ((($3)) + 8|0);
 $5 = $4;
 $6 = $5;
 $7 = HEAP32[$6>>2]|0;
 $8 = (($5) + 4)|0;
 $9 = $8;
 $10 = HEAP32[$9>>2]|0;
 STACKTOP = sp;return ($7|0);
}
function __ZN6Packet15setCaseDistanceEi($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $3;
 $6 = ($5|0)<(0);
 $7 = $6 << 31 >> 31;
 $8 = ((($4)) + 8|0);
 $9 = ((($8)) + 8|0);
 $10 = $9;
 $11 = $10;
 HEAP32[$11>>2] = $5;
 $12 = (($10) + 4)|0;
 $13 = $12;
 HEAP32[$13>>2] = $7;
 STACKTOP = sp;return;
}
function __ZNK6Packet8getBytesEv($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$pre_trunc = 0, $10 = 0, $100 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 176|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(176|0);
 $15 = sp;
 $20 = sp + 163|0;
 $31 = sp + 162|0;
 $35 = sp + 36|0;
 $38 = sp + 24|0;
 $43 = sp + 161|0;
 $45 = sp + 160|0;
 $42 = $1;
 $46 = $42;
 $$expand_i1_val = 0;
 HEAP8[$43>>0] = $$expand_i1_val;
 $41 = $0;
 $47 = $41;
 $40 = $47;
 $48 = $40;
 $39 = $48;
 HEAP32[$48>>2] = 0;
 $49 = ((($48)) + 4|0);
 HEAP32[$49>>2] = 0;
 $50 = ((($48)) + 8|0);
 $37 = $50;
 HEAP32[$38>>2] = 0;
 $51 = $37;
 $36 = $38;
 $52 = $36;
 $53 = HEAP32[$52>>2]|0;
 $34 = $51;
 HEAP32[$35>>2] = $53;
 $54 = $34;
 $33 = $54;
 $32 = $35;
 $55 = $32;
 $56 = HEAP32[$55>>2]|0;
 HEAP32[$54>>2] = $56;
 $44 = 0;
 while(1) {
  $57 = $44;
  $58 = ($57|0)<(16);
  if (!($58)) {
   break;
  }
  $59 = ((($46)) + 8|0);
  $60 = $44;
  $61 = (($59) + ($60)|0);
  $62 = HEAP8[$61>>0]|0;
  HEAP8[$45>>0] = $62;
  $29 = $0;
  $30 = $45;
  $63 = $29;
  $64 = ((($63)) + 4|0);
  $65 = HEAP32[$64>>2]|0;
  $28 = $63;
  $66 = $28;
  $67 = ((($66)) + 8|0);
  $27 = $67;
  $68 = $27;
  $26 = $68;
  $69 = $26;
  $70 = HEAP32[$69>>2]|0;
  $71 = ($65>>>0)<($70>>>0);
  if ($71) {
   $23 = $31;
   $24 = $63;
   $25 = 1;
   $4 = $63;
   $72 = $4;
   $73 = ((($72)) + 8|0);
   $3 = $73;
   $74 = $3;
   $2 = $74;
   $75 = $2;
   $76 = ((($63)) + 4|0);
   $77 = HEAP32[$76>>2]|0;
   $5 = $77;
   $78 = $5;
   $79 = $30;
   $6 = $79;
   $80 = $6;
   $17 = $75;
   $18 = $78;
   $19 = $80;
   $81 = $17;
   $82 = $18;
   $83 = $19;
   $16 = $83;
   $84 = $16;
   ;HEAP8[$15>>0]=HEAP8[$20>>0]|0;
   $12 = $81;
   $13 = $82;
   $14 = $84;
   $85 = $12;
   $86 = $13;
   $87 = $14;
   $11 = $87;
   $88 = $11;
   $8 = $85;
   $9 = $86;
   $10 = $88;
   $89 = $9;
   $90 = $10;
   $7 = $90;
   $91 = $7;
   $92 = HEAP8[$91>>0]|0;
   HEAP8[$89>>0] = $92;
   $21 = $31;
   $93 = ((($63)) + 4|0);
   $94 = HEAP32[$93>>2]|0;
   $95 = ((($94)) + 1|0);
   HEAP32[$93>>2] = $95;
  } else {
   $96 = $30;
   $22 = $96;
   $97 = $22;
   __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($63,$97);
  }
  $98 = $44;
  $99 = (($98) + 1)|0;
  $44 = $99;
 }
 $$expand_i1_val2 = 1;
 HEAP8[$43>>0] = $$expand_i1_val2;
 $$pre_trunc = HEAP8[$43>>0]|0;
 $100 = $$pre_trunc&1;
 if ($100) {
  STACKTOP = sp;return;
 }
 __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($0);
 STACKTOP = sp;return;
}
function __ZN6Packet8setBytesENSt3__26vectorIhNS0_9allocatorIhEEEE($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $5 = $0;
 $7 = $5;
 $6 = 0;
 while(1) {
  $8 = $6;
  $4 = $1;
  $9 = $4;
  $10 = ((($9)) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = HEAP32[$9>>2]|0;
  $13 = $11;
  $14 = $12;
  $15 = (($13) - ($14))|0;
  $16 = ($8>>>0)<($15>>>0);
  if (!($16)) {
   break;
  }
  $17 = $6;
  $2 = $1;
  $3 = $17;
  $18 = $2;
  $19 = HEAP32[$18>>2]|0;
  $20 = $3;
  $21 = (($19) + ($20)|0);
  $22 = HEAP8[$21>>0]|0;
  $23 = ((($7)) + 8|0);
  $24 = $6;
  $25 = (($23) + ($24)|0);
  HEAP8[$25>>0] = $22;
  $26 = $6;
  $27 = (($26) + 1)|0;
  $6 = $27;
 }
 STACKTOP = sp;return;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE9push_backERKh($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(112|0);
 $14 = sp;
 $19 = sp + 105|0;
 $29 = sp + 104|0;
 $27 = $0;
 $28 = $1;
 $30 = $27;
 $31 = ((($30)) + 4|0);
 $32 = HEAP32[$31>>2]|0;
 $26 = $30;
 $33 = $26;
 $34 = ((($33)) + 8|0);
 $25 = $34;
 $35 = $25;
 $24 = $35;
 $36 = $24;
 $37 = HEAP32[$36>>2]|0;
 $38 = ($32|0)!=($37|0);
 if ($38) {
  $21 = $29;
  $22 = $30;
  $23 = 1;
  $4 = $30;
  $39 = $4;
  $40 = ((($39)) + 8|0);
  $3 = $40;
  $41 = $3;
  $2 = $41;
  $42 = $2;
  $43 = ((($30)) + 4|0);
  $44 = HEAP32[$43>>2]|0;
  $5 = $44;
  $45 = $5;
  $46 = $28;
  $16 = $42;
  $17 = $45;
  $18 = $46;
  $47 = $16;
  $48 = $17;
  $49 = $18;
  $15 = $49;
  $50 = $15;
  ;HEAP8[$14>>0]=HEAP8[$19>>0]|0;
  $11 = $47;
  $12 = $48;
  $13 = $50;
  $51 = $11;
  $52 = $12;
  $53 = $13;
  $10 = $53;
  $54 = $10;
  $7 = $51;
  $8 = $52;
  $9 = $54;
  $55 = $8;
  $56 = $9;
  $6 = $56;
  $57 = $6;
  $58 = HEAP8[$57>>0]|0;
  HEAP8[$55>>0] = $58;
  $20 = $29;
  $59 = ((($30)) + 4|0);
  $60 = HEAP32[$59>>2]|0;
  $61 = ((($60)) + 1|0);
  HEAP32[$59>>2] = $61;
  STACKTOP = sp;return;
 } else {
  $62 = $28;
  __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIRKhEEvOT_($30,$62);
  STACKTOP = sp;return;
 }
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE13shrink_to_fitEv($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(80|0);
 $14 = sp;
 $12 = $0;
 $15 = $12;
 $11 = $15;
 $16 = $11;
 $10 = $16;
 $17 = $10;
 $9 = $17;
 $18 = $9;
 $19 = ((($18)) + 8|0);
 $8 = $19;
 $20 = $8;
 $7 = $20;
 $21 = $7;
 $22 = HEAP32[$21>>2]|0;
 $23 = HEAP32[$17>>2]|0;
 $24 = $22;
 $25 = $23;
 $26 = (($24) - ($25))|0;
 $6 = $15;
 $27 = $6;
 $28 = ((($27)) + 4|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = HEAP32[$27>>2]|0;
 $31 = $29;
 $32 = $30;
 $33 = (($31) - ($32))|0;
 $34 = ($26>>>0)>($33>>>0);
 if (!($34)) {
  STACKTOP = sp;return;
 }
 $5 = $15;
 $35 = $5;
 $36 = ((($35)) + 8|0);
 $4 = $36;
 $37 = $4;
 $3 = $37;
 $38 = $3;
 $13 = $38;
 $2 = $15;
 $39 = $2;
 $40 = ((($39)) + 4|0);
 $41 = HEAP32[$40>>2]|0;
 $42 = HEAP32[$39>>2]|0;
 $43 = $41;
 $44 = $42;
 $45 = (($43) - ($44))|0;
 $1 = $15;
 $46 = $1;
 $47 = ((($46)) + 4|0);
 $48 = HEAP32[$47>>2]|0;
 $49 = HEAP32[$46>>2]|0;
 $50 = $48;
 $51 = $49;
 $52 = (($50) - ($51))|0;
 $53 = $13;
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEEC2EjjS3_($14,$45,$52,$53);
 __ZNSt3__26vectorIhNS_9allocatorIhEEE26__swap_out_circular_bufferERNS_14__split_bufferIhRS2_EE($15,$14);
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEED2Ev($14);
 STACKTOP = sp;return;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 __ZNSt3__213__vector_baseIhNS_9allocatorIhEEED2Ev($2);
 STACKTOP = sp;return;
}
function ___clang_call_terminate($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 (___cxa_begin_catch(($0|0))|0);
 __ZSt9terminatev();
 // unreachable;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIhEEvOT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(208|0);
 $10 = sp + 8|0;
 $15 = sp + 193|0;
 $24 = sp;
 $27 = sp + 192|0;
 $35 = sp + 72|0;
 $38 = sp + 60|0;
 $46 = sp + 12|0;
 $43 = $0;
 $44 = $1;
 $47 = $43;
 $42 = $47;
 $48 = $42;
 $49 = ((($48)) + 8|0);
 $41 = $49;
 $50 = $41;
 $40 = $50;
 $51 = $40;
 $45 = $51;
 $39 = $47;
 $52 = $39;
 $53 = ((($52)) + 4|0);
 $54 = HEAP32[$53>>2]|0;
 $55 = HEAP32[$52>>2]|0;
 $56 = $54;
 $57 = $55;
 $58 = (($56) - ($57))|0;
 $59 = (($58) + 1)|0;
 $34 = $47;
 HEAP32[$35>>2] = $59;
 $60 = $34;
 $61 = (__ZNKSt3__26vectorIhNS_9allocatorIhEEE8max_sizeEv($60)|0);
 $36 = $61;
 $62 = HEAP32[$35>>2]|0;
 $63 = $36;
 $64 = ($62>>>0)>($63>>>0);
 if ($64) {
  __ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv($60);
  // unreachable;
 }
 $32 = $60;
 $65 = $32;
 $31 = $65;
 $66 = $31;
 $30 = $66;
 $67 = $30;
 $68 = ((($67)) + 8|0);
 $29 = $68;
 $69 = $29;
 $28 = $69;
 $70 = $28;
 $71 = HEAP32[$70>>2]|0;
 $72 = HEAP32[$66>>2]|0;
 $73 = $71;
 $74 = $72;
 $75 = (($73) - ($74))|0;
 $37 = $75;
 $76 = $37;
 $77 = $36;
 $78 = (($77>>>0) / 2)&-1;
 $79 = ($76>>>0)>=($78>>>0);
 if ($79) {
  $80 = $36;
  $33 = $80;
 } else {
  $81 = $37;
  $82 = $81<<1;
  HEAP32[$38>>2] = $82;
  $25 = $38;
  $26 = $35;
  $83 = $25;
  $84 = $26;
  ;HEAP8[$24>>0]=HEAP8[$27>>0]|0;
  $22 = $83;
  $23 = $84;
  $85 = $22;
  $86 = $23;
  $19 = $24;
  $20 = $85;
  $21 = $86;
  $87 = $20;
  $88 = HEAP32[$87>>2]|0;
  $89 = $21;
  $90 = HEAP32[$89>>2]|0;
  $91 = ($88>>>0)<($90>>>0);
  $92 = $23;
  $93 = $22;
  $94 = $91 ? $92 : $93;
  $95 = HEAP32[$94>>2]|0;
  $33 = $95;
 }
 $96 = $33;
 $18 = $47;
 $97 = $18;
 $98 = ((($97)) + 4|0);
 $99 = HEAP32[$98>>2]|0;
 $100 = HEAP32[$97>>2]|0;
 $101 = $99;
 $102 = $100;
 $103 = (($101) - ($102))|0;
 $104 = $45;
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEEC2EjjS3_($46,$96,$103,$104);
 $105 = $45;
 $106 = ((($46)) + 8|0);
 $107 = HEAP32[$106>>2]|0;
 $17 = $107;
 $108 = $17;
 $109 = $44;
 $16 = $109;
 $110 = $16;
 $12 = $105;
 $13 = $108;
 $14 = $110;
 $111 = $12;
 $112 = $13;
 $113 = $14;
 $11 = $113;
 $114 = $11;
 ;HEAP8[$10>>0]=HEAP8[$15>>0]|0;
 $7 = $111;
 $8 = $112;
 $9 = $114;
 $115 = $7;
 $116 = $8;
 $117 = $9;
 $6 = $117;
 $118 = $6;
 $3 = $115;
 $4 = $116;
 $5 = $118;
 $119 = $4;
 $120 = $5;
 $2 = $120;
 $121 = $2;
 $122 = HEAP8[$121>>0]|0;
 HEAP8[$119>>0] = $122;
 $123 = ((($46)) + 8|0);
 $124 = HEAP32[$123>>2]|0;
 $125 = ((($124)) + 1|0);
 HEAP32[$123>>2] = $125;
 __ZNSt3__26vectorIhNS_9allocatorIhEEE26__swap_out_circular_bufferERNS_14__split_bufferIhRS2_EE($47,$46);
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEED2Ev($46);
 STACKTOP = sp;return;
}
function __ZNKSt3__26vectorIhNS_9allocatorIhEEE4sizeEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ((($2)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = HEAP32[$2>>2]|0;
 $6 = $4;
 $7 = $5;
 $8 = (($6) - ($7))|0;
 STACKTOP = sp;return ($8|0);
}
function __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEEC2EjjS3_($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(112|0);
 $21 = sp + 36|0;
 $25 = sp + 20|0;
 $27 = $0;
 $28 = $1;
 $29 = $2;
 $30 = $3;
 $31 = $27;
 $32 = ((($31)) + 12|0);
 $33 = $30;
 $24 = $32;
 HEAP32[$25>>2] = 0;
 $26 = $33;
 $34 = $24;
 $23 = $25;
 $35 = $23;
 $36 = HEAP32[$35>>2]|0;
 $37 = $26;
 $17 = $37;
 $38 = $17;
 $20 = $34;
 HEAP32[$21>>2] = $36;
 $22 = $38;
 $39 = $20;
 $19 = $21;
 $40 = $19;
 $41 = HEAP32[$40>>2]|0;
 HEAP32[$39>>2] = $41;
 $42 = ((($39)) + 4|0);
 $43 = $22;
 $18 = $43;
 $44 = $18;
 HEAP32[$42>>2] = $44;
 $45 = $28;
 $46 = ($45|0)!=(0);
 if ($46) {
  $6 = $31;
  $47 = $6;
  $48 = ((($47)) + 12|0);
  $5 = $48;
  $49 = $5;
  $4 = $49;
  $50 = $4;
  $51 = ((($50)) + 4|0);
  $52 = HEAP32[$51>>2]|0;
  $53 = $28;
  $12 = $52;
  $13 = $53;
  $54 = $12;
  $55 = $13;
  $9 = $54;
  $10 = $55;
  $11 = 0;
  $56 = $9;
  $8 = $56;
  $57 = $10;
  $7 = $57;
  $58 = $7;
  $59 = (__Znwj($58)|0);
  $60 = $59;
 } else {
  $60 = 0;
 }
 HEAP32[$31>>2] = $60;
 $61 = HEAP32[$31>>2]|0;
 $62 = $29;
 $63 = (($61) + ($62)|0);
 $64 = ((($31)) + 8|0);
 HEAP32[$64>>2] = $63;
 $65 = ((($31)) + 4|0);
 HEAP32[$65>>2] = $63;
 $66 = HEAP32[$31>>2]|0;
 $67 = $28;
 $68 = (($66) + ($67)|0);
 $16 = $31;
 $69 = $16;
 $70 = ((($69)) + 12|0);
 $15 = $70;
 $71 = $15;
 $14 = $71;
 $72 = $14;
 HEAP32[$72>>2] = $68;
 STACKTOP = sp;return;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE26__swap_out_circular_bufferERNS_14__split_bufferIhRS2_EE($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 352|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(352|0);
 $15 = sp + 288|0;
 $21 = sp + 264|0;
 $33 = sp + 216|0;
 $86 = $0;
 $87 = $1;
 $88 = $86;
 $85 = $88;
 $89 = $85;
 $84 = $89;
 $90 = $84;
 $91 = HEAP32[$90>>2]|0;
 $83 = $91;
 $92 = $83;
 $62 = $89;
 $93 = $62;
 $94 = HEAP32[$93>>2]|0;
 $61 = $94;
 $95 = $61;
 $67 = $89;
 $96 = $67;
 $66 = $96;
 $97 = $66;
 $65 = $97;
 $98 = $65;
 $99 = ((($98)) + 8|0);
 $64 = $99;
 $100 = $64;
 $63 = $100;
 $101 = $63;
 $102 = HEAP32[$101>>2]|0;
 $103 = HEAP32[$97>>2]|0;
 $104 = $102;
 $105 = $103;
 $106 = (($104) - ($105))|0;
 $107 = (($95) + ($106)|0);
 $69 = $89;
 $108 = $69;
 $109 = HEAP32[$108>>2]|0;
 $68 = $109;
 $110 = $68;
 $70 = $89;
 $111 = $70;
 $112 = ((($111)) + 4|0);
 $113 = HEAP32[$112>>2]|0;
 $114 = HEAP32[$111>>2]|0;
 $115 = $113;
 $116 = $114;
 $117 = (($115) - ($116))|0;
 $118 = (($110) + ($117)|0);
 $72 = $89;
 $119 = $72;
 $120 = HEAP32[$119>>2]|0;
 $71 = $120;
 $121 = $71;
 $77 = $89;
 $122 = $77;
 $76 = $122;
 $123 = $76;
 $75 = $123;
 $124 = $75;
 $125 = ((($124)) + 8|0);
 $74 = $125;
 $126 = $74;
 $73 = $126;
 $127 = $73;
 $128 = HEAP32[$127>>2]|0;
 $129 = HEAP32[$123>>2]|0;
 $130 = $128;
 $131 = $129;
 $132 = (($130) - ($131))|0;
 $133 = (($121) + ($132)|0);
 $78 = $89;
 $79 = $92;
 $80 = $107;
 $81 = $118;
 $82 = $133;
 $4 = $88;
 $134 = $4;
 $135 = ((($134)) + 8|0);
 $3 = $135;
 $136 = $3;
 $2 = $136;
 $137 = $2;
 $138 = HEAP32[$88>>2]|0;
 $139 = ((($88)) + 4|0);
 $140 = HEAP32[$139>>2]|0;
 $141 = $87;
 $142 = ((($141)) + 4|0);
 $5 = $137;
 $6 = $138;
 $7 = $140;
 $8 = $142;
 $143 = $7;
 $144 = $6;
 $145 = $143;
 $146 = $144;
 $147 = (($145) - ($146))|0;
 $9 = $147;
 $148 = $9;
 $149 = $8;
 $150 = HEAP32[$149>>2]|0;
 $151 = (0 - ($148))|0;
 $152 = (($150) + ($151)|0);
 HEAP32[$149>>2] = $152;
 $153 = $9;
 $154 = ($153|0)>(0);
 if ($154) {
  $155 = $8;
  $156 = HEAP32[$155>>2]|0;
  $157 = $6;
  $158 = $9;
  _memcpy(($156|0),($157|0),($158|0))|0;
 }
 $159 = $87;
 $160 = ((($159)) + 4|0);
 $13 = $88;
 $14 = $160;
 $161 = $13;
 $12 = $161;
 $162 = $12;
 $163 = HEAP32[$162>>2]|0;
 HEAP32[$15>>2] = $163;
 $164 = $14;
 $10 = $164;
 $165 = $10;
 $166 = HEAP32[$165>>2]|0;
 $167 = $13;
 HEAP32[$167>>2] = $166;
 $11 = $15;
 $168 = $11;
 $169 = HEAP32[$168>>2]|0;
 $170 = $14;
 HEAP32[$170>>2] = $169;
 $171 = ((($88)) + 4|0);
 $172 = $87;
 $173 = ((($172)) + 8|0);
 $19 = $171;
 $20 = $173;
 $174 = $19;
 $18 = $174;
 $175 = $18;
 $176 = HEAP32[$175>>2]|0;
 HEAP32[$21>>2] = $176;
 $177 = $20;
 $16 = $177;
 $178 = $16;
 $179 = HEAP32[$178>>2]|0;
 $180 = $19;
 HEAP32[$180>>2] = $179;
 $17 = $21;
 $181 = $17;
 $182 = HEAP32[$181>>2]|0;
 $183 = $20;
 HEAP32[$183>>2] = $182;
 $24 = $88;
 $184 = $24;
 $185 = ((($184)) + 8|0);
 $23 = $185;
 $186 = $23;
 $22 = $186;
 $187 = $22;
 $188 = $87;
 $27 = $188;
 $189 = $27;
 $190 = ((($189)) + 12|0);
 $26 = $190;
 $191 = $26;
 $25 = $191;
 $192 = $25;
 $31 = $187;
 $32 = $192;
 $193 = $31;
 $30 = $193;
 $194 = $30;
 $195 = HEAP32[$194>>2]|0;
 HEAP32[$33>>2] = $195;
 $196 = $32;
 $28 = $196;
 $197 = $28;
 $198 = HEAP32[$197>>2]|0;
 $199 = $31;
 HEAP32[$199>>2] = $198;
 $29 = $33;
 $200 = $29;
 $201 = HEAP32[$200>>2]|0;
 $202 = $32;
 HEAP32[$202>>2] = $201;
 $203 = $87;
 $204 = ((($203)) + 4|0);
 $205 = HEAP32[$204>>2]|0;
 $206 = $87;
 HEAP32[$206>>2] = $205;
 $34 = $88;
 $207 = $34;
 $208 = ((($207)) + 4|0);
 $209 = HEAP32[$208>>2]|0;
 $210 = HEAP32[$207>>2]|0;
 $211 = $209;
 $212 = $210;
 $213 = (($211) - ($212))|0;
 $58 = $88;
 $59 = $213;
 $214 = $58;
 $57 = $214;
 $215 = $57;
 $216 = HEAP32[$215>>2]|0;
 $56 = $216;
 $217 = $56;
 $36 = $214;
 $218 = $36;
 $219 = HEAP32[$218>>2]|0;
 $35 = $219;
 $220 = $35;
 $41 = $214;
 $221 = $41;
 $40 = $221;
 $222 = $40;
 $39 = $222;
 $223 = $39;
 $224 = ((($223)) + 8|0);
 $38 = $224;
 $225 = $38;
 $37 = $225;
 $226 = $37;
 $227 = HEAP32[$226>>2]|0;
 $228 = HEAP32[$222>>2]|0;
 $229 = $227;
 $230 = $228;
 $231 = (($229) - ($230))|0;
 $232 = (($220) + ($231)|0);
 $43 = $214;
 $233 = $43;
 $234 = HEAP32[$233>>2]|0;
 $42 = $234;
 $235 = $42;
 $48 = $214;
 $236 = $48;
 $47 = $236;
 $237 = $47;
 $46 = $237;
 $238 = $46;
 $239 = ((($238)) + 8|0);
 $45 = $239;
 $240 = $45;
 $44 = $240;
 $241 = $44;
 $242 = HEAP32[$241>>2]|0;
 $243 = HEAP32[$237>>2]|0;
 $244 = $242;
 $245 = $243;
 $246 = (($244) - ($245))|0;
 $247 = (($235) + ($246)|0);
 $50 = $214;
 $248 = $50;
 $249 = HEAP32[$248>>2]|0;
 $49 = $249;
 $250 = $49;
 $251 = $59;
 $252 = (($250) + ($251)|0);
 $51 = $214;
 $52 = $217;
 $53 = $232;
 $54 = $247;
 $55 = $252;
 $60 = $88;
 STACKTOP = sp;return;
}
function __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 144|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(144|0);
 $19 = sp + 8|0;
 $22 = sp + 133|0;
 $29 = sp;
 $32 = sp + 132|0;
 $34 = $0;
 $35 = $34;
 $33 = $35;
 $36 = $33;
 $37 = ((($36)) + 4|0);
 $38 = HEAP32[$37>>2]|0;
 $30 = $36;
 $31 = $38;
 $39 = $30;
 $40 = $31;
 ;HEAP8[$29>>0]=HEAP8[$32>>0]|0;
 $27 = $39;
 $28 = $40;
 $41 = $27;
 while(1) {
  $42 = $28;
  $43 = ((($41)) + 8|0);
  $44 = HEAP32[$43>>2]|0;
  $45 = ($42|0)!=($44|0);
  if (!($45)) {
   break;
  }
  $26 = $41;
  $46 = $26;
  $47 = ((($46)) + 12|0);
  $25 = $47;
  $48 = $25;
  $24 = $48;
  $49 = $24;
  $50 = ((($49)) + 4|0);
  $51 = HEAP32[$50>>2]|0;
  $52 = ((($41)) + 8|0);
  $53 = HEAP32[$52>>2]|0;
  $54 = ((($53)) + -1|0);
  HEAP32[$52>>2] = $54;
  $23 = $54;
  $55 = $23;
  $20 = $51;
  $21 = $55;
  $56 = $20;
  $57 = $21;
  ;HEAP8[$19>>0]=HEAP8[$22>>0]|0;
  $17 = $56;
  $18 = $57;
  $58 = $17;
  $59 = $18;
  $15 = $58;
  $16 = $59;
 }
 $60 = HEAP32[$35>>2]|0;
 $61 = ($60|0)!=(0|0);
 if (!($61)) {
  STACKTOP = sp;return;
 }
 $14 = $35;
 $62 = $14;
 $63 = ((($62)) + 12|0);
 $13 = $63;
 $64 = $13;
 $12 = $64;
 $65 = $12;
 $66 = ((($65)) + 4|0);
 $67 = HEAP32[$66>>2]|0;
 $68 = HEAP32[$35>>2]|0;
 $4 = $35;
 $69 = $4;
 $3 = $69;
 $70 = $3;
 $71 = ((($70)) + 12|0);
 $2 = $71;
 $72 = $2;
 $1 = $72;
 $73 = $1;
 $74 = HEAP32[$73>>2]|0;
 $75 = HEAP32[$69>>2]|0;
 $76 = $74;
 $77 = $75;
 $78 = (($76) - ($77))|0;
 $9 = $67;
 $10 = $68;
 $11 = $78;
 $79 = $9;
 $80 = $10;
 $81 = $11;
 $6 = $79;
 $7 = $80;
 $8 = $81;
 $82 = $7;
 $5 = $82;
 $83 = $5;
 __ZdlPv($83);
 STACKTOP = sp;return;
}
function __ZNKSt3__26vectorIhNS_9allocatorIhEEE8max_sizeEv($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(80|0);
 $6 = sp + 8|0;
 $9 = sp + 77|0;
 $12 = sp;
 $14 = sp + 76|0;
 $19 = sp + 16|0;
 $20 = sp + 12|0;
 $18 = $0;
 $21 = $18;
 $17 = $21;
 $22 = $17;
 $23 = ((($22)) + 8|0);
 $16 = $23;
 $24 = $16;
 $15 = $24;
 $25 = $15;
 $13 = $25;
 $26 = $13;
 ;HEAP8[$12>>0]=HEAP8[$14>>0]|0;
 $11 = $26;
 $27 = $11;
 $10 = $27;
 HEAP32[$19>>2] = -1;
 HEAP32[$20>>2] = 2147483647;
 $7 = $19;
 $8 = $20;
 $28 = $7;
 $29 = $8;
 ;HEAP8[$6>>0]=HEAP8[$9>>0]|0;
 $4 = $28;
 $5 = $29;
 $30 = $5;
 $31 = $4;
 $1 = $6;
 $2 = $30;
 $3 = $31;
 $32 = $2;
 $33 = HEAP32[$32>>2]|0;
 $34 = $3;
 $35 = HEAP32[$34>>2]|0;
 $36 = ($33>>>0)<($35>>>0);
 $37 = $5;
 $38 = $4;
 $39 = $36 ? $37 : $38;
 $40 = HEAP32[$39>>2]|0;
 STACKTOP = sp;return ($40|0);
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE21__push_back_slow_pathIRKhEEvOT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(208|0);
 $10 = sp + 8|0;
 $15 = sp + 193|0;
 $24 = sp;
 $27 = sp + 192|0;
 $35 = sp + 72|0;
 $38 = sp + 60|0;
 $46 = sp + 12|0;
 $43 = $0;
 $44 = $1;
 $47 = $43;
 $42 = $47;
 $48 = $42;
 $49 = ((($48)) + 8|0);
 $41 = $49;
 $50 = $41;
 $40 = $50;
 $51 = $40;
 $45 = $51;
 $39 = $47;
 $52 = $39;
 $53 = ((($52)) + 4|0);
 $54 = HEAP32[$53>>2]|0;
 $55 = HEAP32[$52>>2]|0;
 $56 = $54;
 $57 = $55;
 $58 = (($56) - ($57))|0;
 $59 = (($58) + 1)|0;
 $34 = $47;
 HEAP32[$35>>2] = $59;
 $60 = $34;
 $61 = (__ZNKSt3__26vectorIhNS_9allocatorIhEEE8max_sizeEv($60)|0);
 $36 = $61;
 $62 = HEAP32[$35>>2]|0;
 $63 = $36;
 $64 = ($62>>>0)>($63>>>0);
 if ($64) {
  __ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv($60);
  // unreachable;
 }
 $32 = $60;
 $65 = $32;
 $31 = $65;
 $66 = $31;
 $30 = $66;
 $67 = $30;
 $68 = ((($67)) + 8|0);
 $29 = $68;
 $69 = $29;
 $28 = $69;
 $70 = $28;
 $71 = HEAP32[$70>>2]|0;
 $72 = HEAP32[$66>>2]|0;
 $73 = $71;
 $74 = $72;
 $75 = (($73) - ($74))|0;
 $37 = $75;
 $76 = $37;
 $77 = $36;
 $78 = (($77>>>0) / 2)&-1;
 $79 = ($76>>>0)>=($78>>>0);
 if ($79) {
  $80 = $36;
  $33 = $80;
 } else {
  $81 = $37;
  $82 = $81<<1;
  HEAP32[$38>>2] = $82;
  $25 = $38;
  $26 = $35;
  $83 = $25;
  $84 = $26;
  ;HEAP8[$24>>0]=HEAP8[$27>>0]|0;
  $22 = $83;
  $23 = $84;
  $85 = $22;
  $86 = $23;
  $19 = $24;
  $20 = $85;
  $21 = $86;
  $87 = $20;
  $88 = HEAP32[$87>>2]|0;
  $89 = $21;
  $90 = HEAP32[$89>>2]|0;
  $91 = ($88>>>0)<($90>>>0);
  $92 = $23;
  $93 = $22;
  $94 = $91 ? $92 : $93;
  $95 = HEAP32[$94>>2]|0;
  $33 = $95;
 }
 $96 = $33;
 $18 = $47;
 $97 = $18;
 $98 = ((($97)) + 4|0);
 $99 = HEAP32[$98>>2]|0;
 $100 = HEAP32[$97>>2]|0;
 $101 = $99;
 $102 = $100;
 $103 = (($101) - ($102))|0;
 $104 = $45;
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEEC2EjjS3_($46,$96,$103,$104);
 $105 = $45;
 $106 = ((($46)) + 8|0);
 $107 = HEAP32[$106>>2]|0;
 $17 = $107;
 $108 = $17;
 $109 = $44;
 $16 = $109;
 $110 = $16;
 $12 = $105;
 $13 = $108;
 $14 = $110;
 $111 = $12;
 $112 = $13;
 $113 = $14;
 $11 = $113;
 $114 = $11;
 ;HEAP8[$10>>0]=HEAP8[$15>>0]|0;
 $7 = $111;
 $8 = $112;
 $9 = $114;
 $115 = $7;
 $116 = $8;
 $117 = $9;
 $6 = $117;
 $118 = $6;
 $3 = $115;
 $4 = $116;
 $5 = $118;
 $119 = $4;
 $120 = $5;
 $2 = $120;
 $121 = $2;
 $122 = HEAP8[$121>>0]|0;
 HEAP8[$119>>0] = $122;
 $123 = ((($46)) + 8|0);
 $124 = HEAP32[$123>>2]|0;
 $125 = ((($124)) + 1|0);
 HEAP32[$123>>2] = $125;
 __ZNSt3__26vectorIhNS_9allocatorIhEEE26__swap_out_circular_bufferERNS_14__split_bufferIhRS2_EE($47,$46);
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEED2Ev($46);
 STACKTOP = sp;return;
}
function __ZNSt3__213__vector_baseIhNS_9allocatorIhEEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(128|0);
 $19 = sp;
 $22 = sp + 116|0;
 $30 = $0;
 $31 = $30;
 $32 = HEAP32[$31>>2]|0;
 $33 = ($32|0)!=(0|0);
 if (!($33)) {
  STACKTOP = sp;return;
 }
 $29 = $31;
 $34 = $29;
 $35 = HEAP32[$34>>2]|0;
 $27 = $34;
 $28 = $35;
 $36 = $27;
 while(1) {
  $37 = $28;
  $38 = ((($36)) + 4|0);
  $39 = HEAP32[$38>>2]|0;
  $40 = ($37|0)!=($39|0);
  if (!($40)) {
   break;
  }
  $26 = $36;
  $41 = $26;
  $42 = ((($41)) + 8|0);
  $25 = $42;
  $43 = $25;
  $24 = $43;
  $44 = $24;
  $45 = ((($36)) + 4|0);
  $46 = HEAP32[$45>>2]|0;
  $47 = ((($46)) + -1|0);
  HEAP32[$45>>2] = $47;
  $23 = $47;
  $48 = $23;
  $20 = $44;
  $21 = $48;
  $49 = $20;
  $50 = $21;
  ;HEAP8[$19>>0]=HEAP8[$22>>0]|0;
  $17 = $49;
  $18 = $50;
  $51 = $17;
  $52 = $18;
  $15 = $51;
  $16 = $52;
 }
 $7 = $31;
 $53 = $7;
 $54 = ((($53)) + 8|0);
 $6 = $54;
 $55 = $6;
 $5 = $55;
 $56 = $5;
 $57 = HEAP32[$31>>2]|0;
 $4 = $31;
 $58 = $4;
 $3 = $58;
 $59 = $3;
 $60 = ((($59)) + 8|0);
 $2 = $60;
 $61 = $2;
 $1 = $61;
 $62 = $1;
 $63 = HEAP32[$62>>2]|0;
 $64 = HEAP32[$58>>2]|0;
 $65 = $63;
 $66 = $64;
 $67 = (($65) - ($66))|0;
 $12 = $56;
 $13 = $57;
 $14 = $67;
 $68 = $12;
 $69 = $13;
 $70 = $14;
 $9 = $68;
 $10 = $69;
 $11 = $70;
 $71 = $10;
 $8 = $71;
 $72 = $8;
 __ZdlPv($72);
 STACKTOP = sp;return;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE6resizeEjRKh($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $14 = 0, $15 = 0, $16 = 0;
 var $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0;
 var $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0;
 var $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 192|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(192|0);
 $7 = sp;
 $10 = sp + 180|0;
 $45 = $0;
 $46 = $1;
 $47 = $2;
 $49 = $45;
 $44 = $49;
 $50 = $44;
 $51 = ((($50)) + 4|0);
 $52 = HEAP32[$51>>2]|0;
 $53 = HEAP32[$50>>2]|0;
 $54 = $52;
 $55 = $53;
 $56 = (($54) - ($55))|0;
 $48 = $56;
 $57 = $48;
 $58 = $46;
 $59 = ($57>>>0)<($58>>>0);
 if ($59) {
  $60 = $46;
  $61 = $48;
  $62 = (($60) - ($61))|0;
  $63 = $47;
  __ZNSt3__26vectorIhNS_9allocatorIhEEE8__appendEjRKh($49,$62,$63);
  STACKTOP = sp;return;
 }
 $64 = $48;
 $65 = $46;
 $66 = ($64>>>0)>($65>>>0);
 if (!($66)) {
  STACKTOP = sp;return;
 }
 $67 = HEAP32[$49>>2]|0;
 $68 = $46;
 $69 = (($67) + ($68)|0);
 $41 = $49;
 $42 = $69;
 $70 = $41;
 $71 = $42;
 $39 = $70;
 $40 = $71;
 $38 = $70;
 $72 = $38;
 $73 = ((($72)) + 4|0);
 $74 = HEAP32[$73>>2]|0;
 $75 = HEAP32[$72>>2]|0;
 $76 = $74;
 $77 = $75;
 $78 = (($76) - ($77))|0;
 $43 = $78;
 $79 = $42;
 $15 = $70;
 $16 = $79;
 $80 = $15;
 while(1) {
  $81 = $16;
  $82 = ((($80)) + 4|0);
  $83 = HEAP32[$82>>2]|0;
  $84 = ($81|0)!=($83|0);
  if (!($84)) {
   break;
  }
  $14 = $80;
  $85 = $14;
  $86 = ((($85)) + 8|0);
  $13 = $86;
  $87 = $13;
  $12 = $87;
  $88 = $12;
  $89 = ((($80)) + 4|0);
  $90 = HEAP32[$89>>2]|0;
  $91 = ((($90)) + -1|0);
  HEAP32[$89>>2] = $91;
  $11 = $91;
  $92 = $11;
  $8 = $88;
  $9 = $92;
  $93 = $8;
  $94 = $9;
  ;HEAP8[$7>>0]=HEAP8[$10>>0]|0;
  $5 = $93;
  $6 = $94;
  $95 = $5;
  $96 = $6;
  $3 = $95;
  $4 = $96;
 }
 $97 = $43;
 $36 = $70;
 $37 = $97;
 $98 = $36;
 $35 = $98;
 $99 = $35;
 $100 = HEAP32[$99>>2]|0;
 $34 = $100;
 $101 = $34;
 $18 = $98;
 $102 = $18;
 $103 = HEAP32[$102>>2]|0;
 $17 = $103;
 $104 = $17;
 $23 = $98;
 $105 = $23;
 $22 = $105;
 $106 = $22;
 $21 = $106;
 $107 = $21;
 $108 = ((($107)) + 8|0);
 $20 = $108;
 $109 = $20;
 $19 = $109;
 $110 = $19;
 $111 = HEAP32[$110>>2]|0;
 $112 = HEAP32[$106>>2]|0;
 $113 = $111;
 $114 = $112;
 $115 = (($113) - ($114))|0;
 $116 = (($104) + ($115)|0);
 $25 = $98;
 $117 = $25;
 $118 = HEAP32[$117>>2]|0;
 $24 = $118;
 $119 = $24;
 $120 = $37;
 $121 = (($119) + ($120)|0);
 $27 = $98;
 $122 = $27;
 $123 = HEAP32[$122>>2]|0;
 $26 = $123;
 $124 = $26;
 $28 = $98;
 $125 = $28;
 $126 = ((($125)) + 4|0);
 $127 = HEAP32[$126>>2]|0;
 $128 = HEAP32[$125>>2]|0;
 $129 = $127;
 $130 = $128;
 $131 = (($129) - ($130))|0;
 $132 = (($124) + ($131)|0);
 $29 = $98;
 $30 = $101;
 $31 = $116;
 $32 = $121;
 $33 = $132;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal12VectorAccessINSt3__26vectorIhNS2_9allocatorIhEEEEE3getERKS6_j($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $6 = $1;
 $7 = $2;
 $8 = $7;
 $9 = $6;
 $5 = $9;
 $10 = $5;
 $11 = ((($10)) + 4|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = HEAP32[$10>>2]|0;
 $14 = $12;
 $15 = $13;
 $16 = (($14) - ($15))|0;
 $17 = ($8>>>0)<($16>>>0);
 if ($17) {
  $18 = $6;
  $19 = $7;
  $3 = $18;
  $4 = $19;
  $20 = $3;
  $21 = HEAP32[$20>>2]|0;
  $22 = $4;
  $23 = (($21) + ($22)|0);
  __ZN10emscripten3valC2IRKhEEOT_($0,$23);
  STACKTOP = sp;return;
 } else {
  __ZN10emscripten3val9undefinedEv($0);
  STACKTOP = sp;return;
 }
}
function __ZN10emscripten8internal12VectorAccessINSt3__26vectorIhNS2_9allocatorIhEEEEE3setERS6_jRKh($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $7;
 $9 = HEAP8[$8>>0]|0;
 $10 = $5;
 $11 = $6;
 $3 = $10;
 $4 = $11;
 $12 = $3;
 $13 = HEAP32[$12>>2]|0;
 $14 = $4;
 $15 = (($13) + ($14)|0);
 HEAP8[$15>>0] = $9;
 STACKTOP = sp;return 1;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE8__appendEjRKh($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(256|0);
 $9 = sp + 8|0;
 $12 = sp + 250|0;
 $20 = sp + 184|0;
 $23 = sp + 172|0;
 $40 = sp;
 $45 = sp + 249|0;
 $54 = sp + 248|0;
 $62 = sp + 12|0;
 $58 = $0;
 $59 = $1;
 $60 = $2;
 $63 = $58;
 $57 = $63;
 $64 = $57;
 $65 = ((($64)) + 8|0);
 $56 = $65;
 $66 = $56;
 $55 = $66;
 $67 = $55;
 $68 = HEAP32[$67>>2]|0;
 $69 = ((($63)) + 4|0);
 $70 = HEAP32[$69>>2]|0;
 $71 = $68;
 $72 = $70;
 $73 = (($71) - ($72))|0;
 $74 = $59;
 $75 = ($73>>>0)>=($74>>>0);
 if ($75) {
  $76 = $59;
  $77 = $60;
  $50 = $63;
  $51 = $76;
  $52 = $77;
  $78 = $50;
  $49 = $78;
  $79 = $49;
  $80 = ((($79)) + 8|0);
  $48 = $80;
  $81 = $48;
  $47 = $81;
  $82 = $47;
  $53 = $82;
  while(1) {
   $28 = $54;
   $29 = $78;
   $30 = 1;
   $83 = $53;
   $84 = ((($78)) + 4|0);
   $85 = HEAP32[$84>>2]|0;
   $31 = $85;
   $86 = $31;
   $87 = $52;
   $42 = $83;
   $43 = $86;
   $44 = $87;
   $88 = $42;
   $89 = $43;
   $90 = $44;
   $41 = $90;
   $91 = $41;
   ;HEAP8[$40>>0]=HEAP8[$45>>0]|0;
   $37 = $88;
   $38 = $89;
   $39 = $91;
   $92 = $37;
   $93 = $38;
   $94 = $39;
   $36 = $94;
   $95 = $36;
   $33 = $92;
   $34 = $93;
   $35 = $95;
   $96 = $34;
   $97 = $35;
   $32 = $97;
   $98 = $32;
   $99 = HEAP8[$98>>0]|0;
   HEAP8[$96>>0] = $99;
   $100 = ((($78)) + 4|0);
   $101 = HEAP32[$100>>2]|0;
   $102 = ((($101)) + 1|0);
   HEAP32[$100>>2] = $102;
   $103 = $51;
   $104 = (($103) + -1)|0;
   $51 = $104;
   $46 = $54;
   $105 = $51;
   $106 = ($105>>>0)>(0);
   if (!($106)) {
    break;
   }
  }
  STACKTOP = sp;return;
 }
 $27 = $63;
 $107 = $27;
 $108 = ((($107)) + 8|0);
 $26 = $108;
 $109 = $26;
 $25 = $109;
 $110 = $25;
 $61 = $110;
 $24 = $63;
 $111 = $24;
 $112 = ((($111)) + 4|0);
 $113 = HEAP32[$112>>2]|0;
 $114 = HEAP32[$111>>2]|0;
 $115 = $113;
 $116 = $114;
 $117 = (($115) - ($116))|0;
 $118 = $59;
 $119 = (($117) + ($118))|0;
 $19 = $63;
 HEAP32[$20>>2] = $119;
 $120 = $19;
 $121 = (__ZNKSt3__26vectorIhNS_9allocatorIhEEE8max_sizeEv($120)|0);
 $21 = $121;
 $122 = HEAP32[$20>>2]|0;
 $123 = $21;
 $124 = ($122>>>0)>($123>>>0);
 if ($124) {
  __ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv($120);
  // unreachable;
 }
 $17 = $120;
 $125 = $17;
 $16 = $125;
 $126 = $16;
 $15 = $126;
 $127 = $15;
 $128 = ((($127)) + 8|0);
 $14 = $128;
 $129 = $14;
 $13 = $129;
 $130 = $13;
 $131 = HEAP32[$130>>2]|0;
 $132 = HEAP32[$126>>2]|0;
 $133 = $131;
 $134 = $132;
 $135 = (($133) - ($134))|0;
 $22 = $135;
 $136 = $22;
 $137 = $21;
 $138 = (($137>>>0) / 2)&-1;
 $139 = ($136>>>0)>=($138>>>0);
 if ($139) {
  $140 = $21;
  $18 = $140;
 } else {
  $141 = $22;
  $142 = $141<<1;
  HEAP32[$23>>2] = $142;
  $10 = $23;
  $11 = $20;
  $143 = $10;
  $144 = $11;
  ;HEAP8[$9>>0]=HEAP8[$12>>0]|0;
  $7 = $143;
  $8 = $144;
  $145 = $7;
  $146 = $8;
  $4 = $9;
  $5 = $145;
  $6 = $146;
  $147 = $5;
  $148 = HEAP32[$147>>2]|0;
  $149 = $6;
  $150 = HEAP32[$149>>2]|0;
  $151 = ($148>>>0)<($150>>>0);
  $152 = $8;
  $153 = $7;
  $154 = $151 ? $152 : $153;
  $155 = HEAP32[$154>>2]|0;
  $18 = $155;
 }
 $156 = $18;
 $3 = $63;
 $157 = $3;
 $158 = ((($157)) + 4|0);
 $159 = HEAP32[$158>>2]|0;
 $160 = HEAP32[$157>>2]|0;
 $161 = $159;
 $162 = $160;
 $163 = (($161) - ($162))|0;
 $164 = $61;
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEEC2EjjS3_($62,$156,$163,$164);
 $165 = $59;
 $166 = $60;
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEE18__construct_at_endEjRKh($62,$165,$166);
 __ZNSt3__26vectorIhNS_9allocatorIhEEE26__swap_out_circular_bufferERNS_14__split_bufferIhRS2_EE($63,$62);
 __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEED2Ev($62);
 STACKTOP = sp;return;
}
function __ZNSt3__214__split_bufferIhRNS_9allocatorIhEEE18__construct_at_endEjRKh($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 96|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(96|0);
 $12 = sp;
 $17 = sp + 84|0;
 $21 = $0;
 $22 = $1;
 $23 = $2;
 $25 = $21;
 $20 = $25;
 $26 = $20;
 $27 = ((($26)) + 12|0);
 $19 = $27;
 $28 = $19;
 $18 = $28;
 $29 = $18;
 $30 = ((($29)) + 4|0);
 $31 = HEAP32[$30>>2]|0;
 $24 = $31;
 while(1) {
  $32 = $24;
  $33 = ((($25)) + 8|0);
  $34 = HEAP32[$33>>2]|0;
  $3 = $34;
  $35 = $3;
  $36 = $23;
  $14 = $32;
  $15 = $35;
  $16 = $36;
  $37 = $14;
  $38 = $15;
  $39 = $16;
  $13 = $39;
  $40 = $13;
  ;HEAP8[$12>>0]=HEAP8[$17>>0]|0;
  $9 = $37;
  $10 = $38;
  $11 = $40;
  $41 = $9;
  $42 = $10;
  $43 = $11;
  $8 = $43;
  $44 = $8;
  $5 = $41;
  $6 = $42;
  $7 = $44;
  $45 = $6;
  $46 = $7;
  $4 = $46;
  $47 = $4;
  $48 = HEAP8[$47>>0]|0;
  HEAP8[$45>>0] = $48;
  $49 = ((($25)) + 8|0);
  $50 = HEAP32[$49>>2]|0;
  $51 = ((($50)) + 1|0);
  HEAP32[$49>>2] = $51;
  $52 = $22;
  $53 = (($52) + -1)|0;
  $22 = $53;
  $54 = $22;
  $55 = ($54>>>0)>(0);
  if (!($55)) {
   break;
  }
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal11NoBaseClass6verifyINSt3__26vectorIhNS3_9allocatorIhEEEEEEvv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10emscripten8internal13getActualTypeINSt3__26vectorIhNS2_9allocatorIhEEEEEEPKvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal14getLightTypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEEEPKvRKT_($2)|0);
 STACKTOP = sp;return ($3|0);
}
function __ZN10emscripten8internal11NoBaseClass11getUpcasterINSt3__26vectorIhNS3_9allocatorIhEEEEEEPFvvEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (0|0);
}
function __ZN10emscripten8internal11NoBaseClass13getDowncasterINSt3__26vectorIhNS3_9allocatorIhEEEEEEPFvvEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (0|0);
}
function __ZN10emscripten8internal14raw_destructorINSt3__26vectorIhNS2_9allocatorIhEEEEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if ($3) {
  STACKTOP = sp;return;
 }
 __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($2);
 __ZdlPv($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerINSt3__26vectorIhNS3_9allocatorIhEEEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIPNSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIKNSt3__26vectorIhNS3_9allocatorIhEEEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIPKNSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11NoBaseClass3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (0|0);
}
function __ZN10emscripten8internal14getLightTypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEEEPKvRKT_($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return (40|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (40|0);
}
function __ZN10emscripten8internal11LightTypeIDIPNSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (64|0);
}
function __ZN10emscripten8internal11LightTypeIDIPKNSt3__26vectorIhNS2_9allocatorIhEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (80|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3385|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJvEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3388|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJviEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3390|0);
}
function __ZN10emscripten8internal12operator_newINSt3__26vectorIhNS2_9allocatorIhEEEEJEEEPT_DpOT0_() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $3 = sp + 24|0;
 $6 = sp + 12|0;
 $10 = (__Znwj(12)|0);
 $9 = $10;
 $11 = $9;
 $8 = $11;
 $12 = $8;
 $7 = $12;
 HEAP32[$12>>2] = 0;
 $13 = ((($12)) + 4|0);
 HEAP32[$13>>2] = 0;
 $14 = ((($12)) + 8|0);
 $5 = $14;
 HEAP32[$6>>2] = 0;
 $15 = $5;
 $4 = $6;
 $16 = $4;
 $17 = HEAP32[$16>>2]|0;
 $2 = $15;
 HEAP32[$3>>2] = $17;
 $18 = $2;
 $1 = $18;
 $0 = $3;
 $19 = $0;
 $20 = HEAP32[$19>>2]|0;
 HEAP32[$18>>2] = $20;
 STACKTOP = sp;return ($10|0);
}
function __ZN10emscripten8internal7InvokerIPNSt3__26vectorIhNS2_9allocatorIhEEEEJEE6invokeEPFS7_vE($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (FUNCTION_TABLE_i[$2 & 255]()|0);
 $4 = (__ZN10emscripten8internal11BindingTypeIPNSt3__26vectorIhNS2_9allocatorIhEEEEE10toWireTypeES7_($3)|0);
 STACKTOP = sp;return ($4|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorIhNS5_9allocatorIhEEEEEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 1;
}
function __ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJPNSt3__26vectorIhNS5_9allocatorIhEEEEEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorIhNS4_9allocatorIhEEEEEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIPNSt3__26vectorIhNS2_9allocatorIhEEEEE10toWireTypeES7_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerINSt3__26vectorIhNS4_9allocatorIhEEEEEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (760|0);
}
function __ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvRKhEvPS6_JS8_EE6invokeERKSA_SB_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $6 = sp + 8|0;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = $4;
 $8 = (__ZN10emscripten8internal11BindingTypeIPNSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeES7_($7)|0);
 $9 = $3;
 $$field = HEAP32[$9>>2]|0;
 $$index1 = ((($9)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $10 = $$field2 >> 1;
 $11 = (($8) + ($10)|0);
 $12 = $$field2 & 1;
 $13 = ($12|0)!=(0);
 if ($13) {
  $14 = HEAP32[$11>>2]|0;
  $15 = (($14) + ($$field)|0);
  $16 = HEAP32[$15>>2]|0;
  $20 = $16;
 } else {
  $17 = $$field;
  $20 = $17;
 }
 $18 = $5;
 $19 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($18)|0);
 HEAP8[$6>>0] = $19;
 FUNCTION_TABLE_vii[$20 & 127]($11,$6);
 STACKTOP = sp;return;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEERKhEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 3;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEERKhEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS4_9allocatorIhEEEEEERKhEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvRKhEEEPT_RKSB_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIPNSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeES7_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS4_9allocatorIhEEEEEERKhEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (764|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJviiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3393|0);
}
function __ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvjRKhEvPS6_JjS8_EE6invokeERKSA_SB_jh($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $8 = sp + 12|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $9 = $5;
 $10 = (__ZN10emscripten8internal11BindingTypeIPNSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeES7_($9)|0);
 $11 = $4;
 $$field = HEAP32[$11>>2]|0;
 $$index1 = ((($11)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $12 = $$field2 >> 1;
 $13 = (($10) + ($12)|0);
 $14 = $$field2 & 1;
 $15 = ($14|0)!=(0);
 if ($15) {
  $16 = HEAP32[$13>>2]|0;
  $17 = (($16) + ($$field)|0);
  $18 = HEAP32[$17>>2]|0;
  $24 = $18;
 } else {
  $19 = $$field;
  $24 = $19;
 }
 $20 = $6;
 $21 = (__ZN10emscripten8internal11BindingTypeIjE12fromWireTypeEj($20)|0);
 $22 = $7;
 $23 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($22)|0);
 HEAP8[$8>>0] = $23;
 FUNCTION_TABLE_viii[$24 & 255]($13,$21,$8);
 STACKTOP = sp;return;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEEjRKhEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 4;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS5_9allocatorIhEEEEEEjRKhEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS4_9allocatorIhEEEEEEjRKhEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvjRKhEEEPT_RKSB_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIjE12fromWireTypeEj($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerINSt3__26vectorIhNS4_9allocatorIhEEEEEEjRKhEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (776|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJviiiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3398|0);
}
function __ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorIhNS2_9allocatorIhEEEEKFjvEjPKS6_JEE6invokeERKS8_SA_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $4 = sp;
 $2 = $0;
 $3 = $1;
 $5 = $3;
 $6 = (__ZN10emscripten8internal11BindingTypeIPKNSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeES8_($5)|0);
 $7 = $2;
 $$field = HEAP32[$7>>2]|0;
 $$index1 = ((($7)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $8 = $$field2 >> 1;
 $9 = (($6) + ($8)|0);
 $10 = $$field2 & 1;
 $11 = ($10|0)!=(0);
 if ($11) {
  $12 = HEAP32[$9>>2]|0;
  $13 = (($12) + ($$field)|0);
  $14 = HEAP32[$13>>2]|0;
  $16 = $14;
 } else {
  $15 = $$field;
  $16 = $15;
 }
 $17 = (FUNCTION_TABLE_ii[$16 & 127]($9)|0);
 HEAP32[$4>>2] = $17;
 $18 = (__ZN10emscripten8internal11BindingTypeIjE10toWireTypeERKj($4)|0);
 STACKTOP = sp;return ($18|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJjNS0_17AllowedRawPointerIKNSt3__26vectorIhNS5_9allocatorIhEEEEEEEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 2;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJjNS0_17AllowedRawPointerIKNSt3__26vectorIhNS5_9allocatorIhEEEEEEEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJjNS0_17AllowedRawPointerIKNSt3__26vectorIhNS4_9allocatorIhEEEEEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIMNSt3__26vectorIhNS2_9allocatorIhEEEEKFjvEEEPT_RKS9_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIjE10toWireTypeERKj($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function __ZN10emscripten8internal11BindingTypeIPKNSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeES8_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJjNS0_17AllowedRawPointerIKNSt3__26vectorIhNS4_9allocatorIhEEEEEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (792|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJiiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3404|0);
}
function __ZN10emscripten8internal15FunctionInvokerIPFNS_3valERKNSt3__26vectorIhNS3_9allocatorIhEEEEjES2_S9_JjEE6invokeEPSB_PS7_j($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $6 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = $3;
 $8 = HEAP32[$7>>2]|0;
 $9 = $4;
 $10 = (__ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeEPS6_($9)|0);
 $11 = $5;
 $12 = (__ZN10emscripten8internal11BindingTypeIjE12fromWireTypeEj($11)|0);
 FUNCTION_TABLE_viii[$8 & 255]($6,$10,$12);
 $13 = (__ZN10emscripten8internal11BindingTypeINS_3valEE10toWireTypeERKS2_($6)|0);
 __ZN10emscripten3valD2Ev($6);
 STACKTOP = sp;return ($13|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorIhNS5_9allocatorIhEEEEjEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 3;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNS_3valERKNSt3__26vectorIhNS5_9allocatorIhEEEEjEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorIhNS4_9allocatorIhEEEEjEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIPFNS_3valERKNSt3__26vectorIhNS3_9allocatorIhEEEEjEEEPT_RKSC_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeINS_3valEE10toWireTypeERKS2_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = HEAP32[$2>>2]|0;
 __emval_incref(($3|0));
 $4 = $1;
 $5 = HEAP32[$4>>2]|0;
 STACKTOP = sp;return ($5|0);
}
function __ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeEPS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten3valD2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = HEAP32[$2>>2]|0;
 __emval_decref(($3|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS_3valERKNSt3__26vectorIhNS4_9allocatorIhEEEEjEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (800|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJiiiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3427|0);
}
function __ZN10emscripten3valC2IRKhEEOT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $5 = sp;
 $3 = $0;
 $4 = $1;
 $6 = $3;
 $7 = $4;
 $2 = $7;
 $8 = $2;
 __ZN10emscripten8internal12WireTypePackIJRKhEEC2ES3_($5,$8);
 $9 = (__ZN10emscripten8internal6TypeIDIRKhE3getEv()|0);
 $10 = (__ZNK10emscripten8internal12WireTypePackIJRKhEEcvPKvEv($5)|0);
 $11 = (__emval_take_value(($9|0),($10|0))|0);
 HEAP32[$6>>2] = $11;
 STACKTOP = sp;return;
}
function __ZN10emscripten3val9undefinedEv($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10emscripten3valC2EPNS_8internal7_EM_VALE($0,(1));
 return;
}
function __ZN10emscripten8internal12WireTypePackIJRKhEEC2ES3_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $9 = sp;
 $7 = $0;
 $8 = $1;
 $10 = $7;
 $6 = $10;
 $11 = $6;
 HEAP32[$9>>2] = $11;
 $12 = $8;
 $2 = $12;
 $13 = $2;
 $4 = $9;
 $5 = $13;
 $14 = $4;
 $15 = $5;
 $3 = $15;
 $16 = $3;
 $17 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($16)|0);
 __ZN10emscripten8internal20writeGenericWireTypeIhEEvRPNS0_15GenericWireTypeET_($14,$17);
 $18 = $4;
 __ZN10emscripten8internal21writeGenericWireTypesERPNS0_15GenericWireTypeE($18);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIRKhE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIRKhE3getEv()|0);
 return ($0|0);
}
function __ZNK10emscripten8internal12WireTypePackIJRKhEEcvPKvEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $2;
 $1 = $3;
 $4 = $1;
 STACKTOP = sp;return ($4|0);
}
function __ZN10emscripten8internal20writeGenericWireTypeIhEEvRPNS0_15GenericWireTypeET_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $4&255;
 $6 = $2;
 $7 = HEAP32[$6>>2]|0;
 HEAP32[$7>>2] = $5;
 $8 = $2;
 $9 = HEAP32[$8>>2]|0;
 $10 = ((($9)) + 8|0);
 HEAP32[$8>>2] = $10;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = HEAP8[$2>>0]|0;
 STACKTOP = sp;return ($3|0);
}
function __ZN10emscripten8internal21writeGenericWireTypesERPNS0_15GenericWireTypeE($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal11LightTypeIDIRKhE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (640|0);
}
function __ZN10emscripten3valC2EPNS_8internal7_EM_VALE($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $3;
 HEAP32[$4>>2] = $5;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal15FunctionInvokerIPFbRNSt3__26vectorIhNS2_9allocatorIhEEEEjRKhEbS7_JjS9_EE6invokeEPSB_PS6_jh($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $8 = sp + 12|0;
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $9 = $4;
 $10 = HEAP32[$9>>2]|0;
 $11 = $5;
 $12 = (__ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeEPS6_($11)|0);
 $13 = $6;
 $14 = (__ZN10emscripten8internal11BindingTypeIjE12fromWireTypeEj($13)|0);
 $15 = $7;
 $16 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($15)|0);
 HEAP8[$8>>0] = $16;
 $17 = (FUNCTION_TABLE_iiii[$10 & 127]($12,$14,$8)|0);
 $18 = (__ZN10emscripten8internal11BindingTypeIbE10toWireTypeEb($17)|0);
 STACKTOP = sp;return ($18|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorIhNS4_9allocatorIhEEEEjRKhEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 4;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbRNSt3__26vectorIhNS4_9allocatorIhEEEEjRKhEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorIhNS3_9allocatorIhEEEEjRKhEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIPFbRNSt3__26vectorIhNS2_9allocatorIhEEEEjRKhEEEPT_RKSC_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIbE10toWireTypeEb($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0&1;
 $1 = $2;
 $3 = $1;
 $4 = $3&1;
 STACKTOP = sp;return ($4|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbRNSt3__26vectorIhNS3_9allocatorIhEEEEjRKhEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (812|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJiiiiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3432|0);
}
function __ZN10emscripten8internal6TypeIDIN5Motor5StateEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN5Motor5StateEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN5Motor5StateEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (104|0);
}
function __ZN10emscripten8internal6TypeIDIN10SmartDrive5UnitsEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN10SmartDrive5UnitsEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN10SmartDrive5UnitsEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (112|0);
}
function __ZN10emscripten8internal6TypeIDIN10SmartDrive11ControlModeEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN10SmartDrive11ControlModeEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN10SmartDrive11ControlModeEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (120|0);
}
function __ZN10emscripten8internal6TypeIDIN10SmartDrive12ThrottleModeEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN10SmartDrive12ThrottleModeEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN10SmartDrive12ThrottleModeEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (128|0);
}
function __ZN10emscripten8internal11noncopyableC2Ev($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal15raw_constructorIN10SmartDrive8SettingsEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(16)|0);
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;HEAP32[$0+8>>2]=0|0;HEAP32[$0+12>>2]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN10SmartDrive8SettingsEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN10SmartDrive8SettingsEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN10SmartDrive8SettingsEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11noncopyableD2Ev($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal11LightTypeIDIN10SmartDrive8SettingsEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (136|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3555|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_11ControlModeEE7getWireIS3_EES4_RKMS3_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive11ControlModeEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_11ControlModeEE7setWireIS3_EEvRKMS3_S4_RT_S4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive11ControlModeEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsENS2_11ControlModeEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive11ControlModeEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive11ControlModeEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_5UnitsEE7getWireIS3_EES4_RKMS3_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5UnitsEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_5UnitsEE7setWireIS3_EEvRKMS3_S4_RT_S4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5UnitsEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsENS2_5UnitsEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5UnitsEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5UnitsEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIhE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIhE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDIhE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (640|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEfE7getWireIS3_EEfRKMS3_fRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (+__ZN10emscripten8internal11BindingTypeIfE10toWireTypeERKf($7));
 STACKTOP = sp;return (+$8);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEfE7setWireIS3_EEvRKMS3_fRT_f($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = +$2;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (+__ZN10emscripten8internal11BindingTypeIfE12fromWireTypeEf($6));
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAPF32[$11>>2] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIfE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIfE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive8SettingsEfEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIfE10toWireTypeERKf($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = +HEAPF32[$2>>2];
 STACKTOP = sp;return (+$3);
}
function __ZN10emscripten8internal11BindingTypeIfE12fromWireTypeEf($0) {
 $0 = +$0;
 var $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return (+$2);
}
function __ZN10emscripten8internal11LightTypeIDIfE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (712|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJfiiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3557|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJviifEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3561|0);
}
function __ZN10emscripten8internal15raw_constructorIN10SmartDrive16ThrottleSettingsEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(8)|0);
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN10SmartDrive16ThrottleSettingsEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN10SmartDrive16ThrottleSettingsEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN10SmartDrive16ThrottleSettingsEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN10SmartDrive16ThrottleSettingsEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (144|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEE7getWireIS3_EES4_RKMS3_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive12ThrottleModeEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEE7setWireIS3_EEvRKMS3_S4_RT_S4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive12ThrottleModeEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive12ThrottleModeEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive12ThrottleModeEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEfE7getWireIS3_EEfRKMS3_fRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (+__ZN10emscripten8internal11BindingTypeIfE10toWireTypeERKf($7));
 STACKTOP = sp;return (+$8);
}
function __ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEfE7setWireIS3_EEvRKMS3_fRT_f($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = +$2;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (+__ZN10emscripten8internal11BindingTypeIfE12fromWireTypeEf($6));
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAPF32[$11>>2] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN10SmartDrive16ThrottleSettingsEfEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal6TypeIDIN6Packet6DeviceEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet6DeviceEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet6DeviceEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (152|0);
}
function __ZN10emscripten8internal6TypeIDIN6Packet4TypeEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet4TypeEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet4TypeEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (160|0);
}
function __ZN10emscripten8internal6TypeIDIN6Packet4DataEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet4DataEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet4DataEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (168|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet11VersionInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(3)|0);
 ;HEAP16[$0>>1]=0|0;HEAP8[$0+2>>0]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet11VersionInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet11VersionInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet11VersionInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet11VersionInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (176|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet11VersionInfoEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet11VersionInfoEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet11VersionInfoEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet9DailyInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(16)|0);
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;HEAP32[$0+8>>2]=0|0;HEAP32[$0+12>>2]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet9DailyInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet9DailyInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet9DailyInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet9DailyInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (184|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEtE7getWireIS3_EEtRKMS3_tRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeItE10toWireTypeERKt($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEtE7setWireIS3_EEvRKMS3_tRT_t($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeItE12fromWireTypeEt($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP16[$11>>1] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDItE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDItE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIMN6Packet9DailyInfoEtEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeItE10toWireTypeERKt($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = HEAP16[$2>>1]|0;
 STACKTOP = sp;return ($3|0);
}
function __ZN10emscripten8internal11BindingTypeItE12fromWireTypeEt($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDItE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (664|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet9DailyInfoEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet12PushSettingsEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(3)|0);
 ;HEAP16[$0>>1]=0|0;HEAP8[$0+2>>0]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet12PushSettingsEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet12PushSettingsEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet12PushSettingsEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet12PushSettingsEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (192|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet12PushSettingsEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet12PushSettingsEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet12PushSettingsEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet11JourneyInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(4)|0);
 ;HEAP32[$0>>2]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet11JourneyInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet11JourneyInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet11JourneyInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet11JourneyInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (200|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEtE7getWireIS3_EEtRKMS3_tRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeItE10toWireTypeERKt($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEtE7setWireIS3_EEvRKMS3_tRT_t($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeItE12fromWireTypeEt($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP16[$11>>1] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet11JourneyInfoEtEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet11JourneyInfoEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet12DistanceInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(16)|0);
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;HEAP32[$0+8>>2]=0|0;HEAP32[$0+12>>2]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet12DistanceInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet12DistanceInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet12DistanceInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet12DistanceInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (208|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet12DistanceInfoEyE7getWireIS3_EEPyRKMS3_yRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIyE10toWireTypeERKy($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet12DistanceInfoEyE7setWireIS3_EEvRKMS3_yRT_Py($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIyE12fromWireTypeEPy($6)|0);
 $8 = $7;
 $9 = $8;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + 4)|0;
 $12 = $11;
 $13 = HEAP32[$12>>2]|0;
 $14 = $4;
 $15 = $3;
 $16 = HEAP32[$15>>2]|0;
 $17 = (($14) + ($16)|0);
 $18 = $17;
 $19 = $18;
 HEAP32[$19>>2] = $10;
 $20 = (($18) + 4)|0;
 $21 = $20;
 HEAP32[$21>>2] = $13;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIyE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIyE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIMN6Packet12DistanceInfoEyEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIyE10toWireTypeERKy($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $4 = $3;
 $5 = $4;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + 4)|0;
 $8 = $7;
 $9 = HEAP32[$8>>2]|0;
 $10 = $2;
 $11 = $10;
 HEAP32[$11>>2] = $6;
 $12 = (($10) + 4)|0;
 $13 = $12;
 HEAP32[$13>>2] = $9;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIyE12fromWireTypeEPy($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDIyE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (704|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet9MotorInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(16)|0);
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;HEAP32[$0+8>>2]=0|0;HEAP32[$0+12>>2]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet9MotorInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet9MotorInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet9MotorInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet9MotorInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (216|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEN5Motor5StateEE7getWireIS3_EES5_RKMS3_S5_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN5Motor5StateEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEN5Motor5StateEE7setWireIS3_EEvRKMS3_S5_RT_S5_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN5Motor5StateEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEN5Motor5StateEEEPT_RKS7_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN5Motor5StateEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN5Motor5StateEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEfE7getWireIS3_EEfRKMS3_fRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (+__ZN10emscripten8internal11BindingTypeIfE10toWireTypeERKf($7));
 STACKTOP = sp;return (+$8);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEfE7setWireIS3_EEvRKMS3_fRT_f($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = +$2;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (+__ZN10emscripten8internal11BindingTypeIfE12fromWireTypeEf($6));
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAPF32[$11>>2] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet9MotorInfoEfEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet9ErrorInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(14)|0);
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;HEAP32[$0+8>>2]=0|0;HEAP16[$0+12>>1]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet9ErrorInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet9ErrorInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet9ErrorInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet9ErrorInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (224|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEtE7getWireIS3_EEtRKMS3_tRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeItE10toWireTypeERKt($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEtE7setWireIS3_EEvRKMS3_tRT_t($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeItE12fromWireTypeEt($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP16[$11>>1] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEtEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEN10SmartDrive5ErrorEE7getWireIS3_EES5_RKMS3_S5_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5ErrorEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEN10SmartDrive5ErrorEE7setWireIS3_EEvRKMS3_S5_RT_S5_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5ErrorEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN10SmartDrive5ErrorEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN10SmartDrive5ErrorEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEN10SmartDrive5ErrorEEEPT_RKS7_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5ErrorEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5ErrorEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDIN10SmartDrive5ErrorEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (232|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet9ErrorInfoEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15raw_constructorIN6Packet10DeviceInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(2)|0);
 ;HEAP16[$0>>1]=0|0;
 return ($0|0);
}
function __ZN10emscripten8internal14raw_destructorIN6Packet10DeviceInfoEEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet10DeviceInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet10DeviceInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet10DeviceInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (240|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoENS2_6DeviceEE7getWireIS3_EES4_RKMS3_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet6DeviceEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoENS2_6DeviceEE7setWireIS3_EEvRKMS3_S4_RT_S4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet6DeviceEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet10DeviceInfoENS2_6DeviceEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet6DeviceEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet6DeviceEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoEhE7getWireIS3_EEhRKMS3_hRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIhE10toWireTypeERKh($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoEhE7setWireIS3_EEvRKMS3_hRT_h($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIhE12fromWireTypeEh($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIMN6Packet10DeviceInfoEhEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal6TypeIDIN6Packet7CommandEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet7CommandEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet7CommandEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (248|0);
}
function __ZN10emscripten8internal6TypeIDIN6Packet3OTAEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet3OTAEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet3OTAEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (256|0);
}
function __ZN10emscripten8internal11NoBaseClass6verifyI6PacketEEvv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10emscripten8internal13getActualTypeI6PacketEEPKvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (__ZN10emscripten8internal14getLightTypeIDI6PacketEEPKvRKT_($2)|0);
 STACKTOP = sp;return ($3|0);
}
function __ZN10emscripten8internal11NoBaseClass11getUpcasterI6PacketEEPFvvEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (0|0);
}
function __ZN10emscripten8internal11NoBaseClass13getDowncasterI6PacketEEPFvvEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (0|0);
}
function __ZN10emscripten8internal14raw_destructorI6PacketEEvPT_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  __ZN6PacketD2Ev($2);
  __ZdlPv($2);
 }
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDI6PacketE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDI6PacketE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerI6PacketEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIP6PacketE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINS0_17AllowedRawPointerIK6PacketEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIPK6PacketE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal14getLightTypeIDI6PacketEEPKvRKT_($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return (264|0);
}
function __ZN6PacketD2Ev($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal11LightTypeIDI6PacketE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (264|0);
}
function __ZN10emscripten8internal11LightTypeIDIP6PacketE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (272|0);
}
function __ZN10emscripten8internal11LightTypeIDIPK6PacketE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (288|0);
}
function __ZN10emscripten8internal12operator_newI6PacketJEEEPT_DpOT0_() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(32)|0);
 __ZN6PacketC2Ev($0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIP6PacketJEE6invokeEPFS3_vE($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = (FUNCTION_TABLE_i[$2 & 255]()|0);
 $4 = (__ZN10emscripten8internal11BindingTypeIP6PacketE10toWireTypeES3_($3)|0);
 STACKTOP = sp;return ($4|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJP6PacketEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 1;
}
function __ZNK10emscripten8internal12WithPoliciesIJNS_18allow_raw_pointersEEE11ArgTypeListIJP6PacketEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerI6PacketEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIP6PacketE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNS0_17AllowedRawPointerI6PacketEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (828|0);
}
function __ZN6PacketC2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 __ZN6Packet9newPacketEv($2);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal13MethodInvokerIM6PacketFbvEbPS2_JEE6invokeERKS4_S5_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = (__ZN10emscripten8internal11BindingTypeIP6PacketE12fromWireTypeES3_($4)|0);
 $6 = $2;
 $$field = HEAP32[$6>>2]|0;
 $$index1 = ((($6)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $7 = $$field2 >> 1;
 $8 = (($5) + ($7)|0);
 $9 = $$field2 & 1;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = HEAP32[$8>>2]|0;
  $12 = (($11) + ($$field)|0);
  $13 = HEAP32[$12>>2]|0;
  $15 = $13;
 } else {
  $14 = $$field;
  $15 = $14;
 }
 $16 = (FUNCTION_TABLE_ii[$15 & 127]($8)|0);
 $17 = (__ZN10emscripten8internal11BindingTypeIbE10toWireTypeEb($16)|0);
 STACKTOP = sp;return ($17|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEEEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 2;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEEEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbNS0_17AllowedRawPointerI6PacketEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketFbvEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIP6PacketE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbNS0_17AllowedRawPointerI6PacketEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (832|0);
}
function __ZN10emscripten8internal13MethodInvokerIM6PacketFbNSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEEbPS2_JS9_EE6invokeERKSB_SC_PNS0_11BindingTypeIS9_EUt_E($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $6 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = $4;
 $8 = (__ZN10emscripten8internal11BindingTypeIP6PacketE12fromWireTypeES3_($7)|0);
 $9 = $3;
 $$field = HEAP32[$9>>2]|0;
 $$index1 = ((($9)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $10 = $$field2 >> 1;
 $11 = (($8) + ($10)|0);
 $12 = $$field2 & 1;
 $13 = ($12|0)!=(0);
 if ($13) {
  $14 = HEAP32[$11>>2]|0;
  $15 = (($14) + ($$field)|0);
  $16 = HEAP32[$15>>2]|0;
  $19 = $16;
 } else {
  $17 = $$field;
  $19 = $17;
 }
 $18 = $5;
 __ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE12fromWireTypeEPNS9_Ut_E($6,$18);
 $20 = (FUNCTION_TABLE_iii[$19 & 255]($11,$6)|0);
 $21 = (__ZN10emscripten8internal11BindingTypeIbE10toWireTypeEb($20)|0);
 __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev($6);
 STACKTOP = sp;return ($21|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEENSt3__212basic_stringIcNS7_11char_traitsIcEENS7_9allocatorIcEEEEEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 3;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJbNS0_17AllowedRawPointerI6PacketEENSt3__212basic_stringIcNS7_11char_traitsIcEENS7_9allocatorIcEEEEEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbNS0_17AllowedRawPointerI6PacketEENSt3__212basic_stringIcNS6_11char_traitsIcEENS6_9allocatorIcEEEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketFbNSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEEEEPT_RKSC_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE12fromWireTypeEPNS9_Ut_E($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(224|0);
 $38 = sp;
 $40 = sp + 221|0;
 $51 = sp + 220|0;
 $58 = $1;
 $59 = $58;
 $60 = ((($59)) + 4|0);
 $61 = $58;
 $62 = HEAP32[$61>>2]|0;
 $55 = $0;
 $56 = $60;
 $57 = $62;
 $63 = $55;
 $54 = $63;
 $64 = $54;
 $53 = $64;
 $65 = $53;
 $52 = $65;
 ;HEAP32[$65>>2]=0|0;HEAP32[$65+4>>2]=0|0;HEAP32[$65+8>>2]=0|0;
 $66 = $56;
 $67 = $57;
 $46 = $63;
 $47 = $66;
 $48 = $67;
 $68 = $46;
 $69 = $48;
 $44 = $68;
 $70 = $44;
 $43 = $70;
 $71 = $43;
 $42 = $71;
 $72 = $42;
 $41 = $72;
 $73 = $41;
 $39 = $73;
 $74 = $39;
 ;HEAP8[$38>>0]=HEAP8[$40>>0]|0;
 $37 = $74;
 $75 = $37;
 $36 = $75;
 $45 = -1;
 $76 = $45;
 $77 = (($76) - 16)|0;
 $78 = ($69>>>0)>($77>>>0);
 if ($78) {
  __ZNKSt3__221__basic_string_commonILb1EE20__throw_length_errorEv($68);
  // unreachable;
 }
 $79 = $48;
 $80 = ($79>>>0)<(11);
 $81 = $48;
 if ($80) {
  $34 = $68;
  $35 = $81;
  $82 = $34;
  $83 = $35;
  $84 = $83&255;
  $33 = $82;
  $85 = $33;
  $32 = $85;
  $86 = $32;
  $87 = ((($86)) + 11|0);
  HEAP8[$87>>0] = $84;
  $31 = $68;
  $88 = $31;
  $30 = $88;
  $89 = $30;
  $29 = $89;
  $90 = $29;
  $28 = $90;
  $91 = $28;
  $27 = $91;
  $92 = $27;
  $49 = $92;
  $132 = $49;
  $26 = $132;
  $133 = $26;
  $134 = $47;
  $135 = $48;
  (__ZNSt3__211char_traitsIcE4copyEPcPKcj($133,$134,$135)|0);
  $136 = $49;
  $137 = $48;
  $138 = (($136) + ($137)|0);
  HEAP8[$51>>0] = 0;
  __ZNSt3__211char_traitsIcE6assignERcRKc($138,$51);
  STACKTOP = sp;return;
 }
 $6 = $81;
 $93 = $6;
 $94 = ($93>>>0)<(11);
 if ($94) {
  $101 = 11;
 } else {
  $95 = $6;
  $96 = (($95) + 1)|0;
  $5 = $96;
  $97 = $5;
  $98 = (($97) + 15)|0;
  $99 = $98 & -16;
  $101 = $99;
 }
 $100 = (($101) - 1)|0;
 $50 = $100;
 $4 = $68;
 $102 = $4;
 $3 = $102;
 $103 = $3;
 $2 = $103;
 $104 = $2;
 $105 = $50;
 $106 = (($105) + 1)|0;
 $12 = $104;
 $13 = $106;
 $107 = $12;
 $108 = $13;
 $9 = $107;
 $10 = $108;
 $11 = 0;
 $109 = $9;
 $8 = $109;
 $110 = $10;
 $7 = $110;
 $111 = $7;
 $112 = (__Znwj($111)|0);
 $49 = $112;
 $113 = $49;
 $16 = $68;
 $17 = $113;
 $114 = $16;
 $115 = $17;
 $15 = $114;
 $116 = $15;
 $14 = $116;
 $117 = $14;
 HEAP32[$117>>2] = $115;
 $118 = $50;
 $119 = (($118) + 1)|0;
 $20 = $68;
 $21 = $119;
 $120 = $20;
 $121 = $21;
 $122 = -2147483648 | $121;
 $19 = $120;
 $123 = $19;
 $18 = $123;
 $124 = $18;
 $125 = ((($124)) + 8|0);
 HEAP32[$125>>2] = $122;
 $126 = $48;
 $24 = $68;
 $25 = $126;
 $127 = $24;
 $128 = $25;
 $23 = $127;
 $129 = $23;
 $22 = $129;
 $130 = $22;
 $131 = ((($130)) + 4|0);
 HEAP32[$131>>2] = $128;
 $132 = $49;
 $26 = $132;
 $133 = $26;
 $134 = $47;
 $135 = $48;
 (__ZNSt3__211char_traitsIcE4copyEPcPKcj($133,$134,$135)|0);
 $136 = $49;
 $137 = $48;
 $138 = (($136) + ($137)|0);
 HEAP8[$51>>0] = 0;
 __ZNSt3__211char_traitsIcE6assignERcRKc($138,$51);
 STACKTOP = sp;return;
}
function __ZNSt3__211char_traitsIcE4copyEPcPKcj($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = ($6|0)==(0);
 $8 = $3;
 if ($7) {
  STACKTOP = sp;return ($8|0);
 }
 $9 = $4;
 $10 = $5;
 _memcpy(($8|0),($9|0),($10|0))|0;
 STACKTOP = sp;return ($8|0);
}
function __ZNSt3__211char_traitsIcE6assignERcRKc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = HEAP8[$4>>0]|0;
 $6 = $2;
 HEAP8[$6>>0] = $5;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJbNS0_17AllowedRawPointerI6PacketEENSt3__212basic_stringIcNS6_11char_traitsIcEENS6_9allocatorIcEEEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (840|0);
}
function __ZN10emscripten8internal13MethodInvokerIM6PacketFvvEvPS2_JEE6invokeERKS4_S5_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = (__ZN10emscripten8internal11BindingTypeIP6PacketE12fromWireTypeES3_($4)|0);
 $6 = $2;
 $$field = HEAP32[$6>>2]|0;
 $$index1 = ((($6)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $7 = $$field2 >> 1;
 $8 = (($5) + ($7)|0);
 $9 = $$field2 & 1;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = HEAP32[$8>>2]|0;
  $12 = (($11) + ($$field)|0);
  $13 = HEAP32[$12>>2]|0;
  $15 = $13;
  FUNCTION_TABLE_vi[$15 & 255]($8);
  STACKTOP = sp;return;
 } else {
  $14 = $$field;
  $15 = $14;
  FUNCTION_TABLE_vi[$15 & 255]($8);
  STACKTOP = sp;return;
 }
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerI6PacketEEEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 2;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJvNS0_17AllowedRawPointerI6PacketEEEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerI6PacketEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketFvvEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJvNS0_17AllowedRawPointerI6PacketEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (852|0);
}
function __ZN10emscripten8internal19getGenericSignatureIJviiEEEPKcv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4003|0);
}
function __ZN10emscripten8internal13MethodInvokerIM6PacketFNSt3__26vectorIhNS3_9allocatorIhEEEEvES7_PS2_JEE6invokeERKS9_SA_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = sp;
 $2 = $0;
 $3 = $1;
 $5 = $3;
 $6 = (__ZN10emscripten8internal11BindingTypeIP6PacketE12fromWireTypeES3_($5)|0);
 $7 = $2;
 $$field = HEAP32[$7>>2]|0;
 $$index1 = ((($7)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $8 = $$field2 >> 1;
 $9 = (($6) + ($8)|0);
 $10 = $$field2 & 1;
 $11 = ($10|0)!=(0);
 if ($11) {
  $12 = HEAP32[$9>>2]|0;
  $13 = (($12) + ($$field)|0);
  $14 = HEAP32[$13>>2]|0;
  $16 = $14;
 } else {
  $15 = $$field;
  $16 = $15;
 }
 FUNCTION_TABLE_vii[$16 & 127]($4,$9);
 $17 = (__ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE10toWireTypeEOS6_($4)|0);
 __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($4);
 STACKTOP = sp;return ($17|0);
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNSt3__26vectorIhNS4_9allocatorIhEEEENS0_17AllowedRawPointerI6PacketEEEE8getCountEv($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 2;
}
function __ZNK10emscripten8internal12WithPoliciesIJEE11ArgTypeListIJNSt3__26vectorIhNS4_9allocatorIhEEEENS0_17AllowedRawPointerI6PacketEEEE8getTypesEv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNSt3__26vectorIhNS3_9allocatorIhEEEENS0_17AllowedRawPointerI6PacketEEEEEE3getEv()|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketFNSt3__26vectorIhNS3_9allocatorIhEEEEvEEEPT_RKSA_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE10toWireTypeEOS6_($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(128|0);
 $5 = sp + 104|0;
 $6 = sp + 8|0;
 $9 = sp + 92|0;
 $10 = sp + 125|0;
 $11 = sp;
 $15 = sp + 124|0;
 $32 = $0;
 $33 = (__Znwj(12)|0);
 $34 = $32;
 $31 = $34;
 $35 = $31;
 $29 = $33;
 $30 = $35;
 $36 = $29;
 $37 = $30;
 $28 = $37;
 $38 = $28;
 $39 = ((($38)) + 8|0);
 $27 = $39;
 $40 = $27;
 $26 = $40;
 $41 = $26;
 $25 = $41;
 $42 = $25;
 $13 = $36;
 $14 = $42;
 $43 = $13;
 $12 = $43;
 HEAP32[$43>>2] = 0;
 $44 = ((($43)) + 4|0);
 HEAP32[$44>>2] = 0;
 $45 = ((($43)) + 8|0);
 ;HEAP8[$11>>0]=HEAP8[$15>>0]|0;
 $8 = $45;
 HEAP32[$9>>2] = 0;
 $46 = $8;
 $7 = $9;
 $47 = $7;
 $48 = HEAP32[$47>>2]|0;
 $1 = $11;
 ;HEAP8[$6>>0]=HEAP8[$10>>0]|0;
 $4 = $46;
 HEAP32[$5>>2] = $48;
 $49 = $4;
 $3 = $6;
 $2 = $5;
 $50 = $2;
 $51 = HEAP32[$50>>2]|0;
 HEAP32[$49>>2] = $51;
 $52 = $30;
 $53 = HEAP32[$52>>2]|0;
 HEAP32[$36>>2] = $53;
 $54 = $30;
 $55 = ((($54)) + 4|0);
 $56 = HEAP32[$55>>2]|0;
 $57 = ((($36)) + 4|0);
 HEAP32[$57>>2] = $56;
 $58 = $30;
 $18 = $58;
 $59 = $18;
 $60 = ((($59)) + 8|0);
 $17 = $60;
 $61 = $17;
 $16 = $61;
 $62 = $16;
 $63 = HEAP32[$62>>2]|0;
 $21 = $36;
 $64 = $21;
 $65 = ((($64)) + 8|0);
 $20 = $65;
 $66 = $20;
 $19 = $66;
 $67 = $19;
 HEAP32[$67>>2] = $63;
 $68 = $30;
 $24 = $68;
 $69 = $24;
 $70 = ((($69)) + 8|0);
 $23 = $70;
 $71 = $23;
 $22 = $71;
 $72 = $22;
 HEAP32[$72>>2] = 0;
 $73 = $30;
 $74 = ((($73)) + 4|0);
 HEAP32[$74>>2] = 0;
 $75 = $30;
 HEAP32[$75>>2] = 0;
 STACKTOP = sp;return ($33|0);
}
function __ZN10emscripten8internal14ArgArrayGetterINS0_8TypeListIJNSt3__26vectorIhNS3_9allocatorIhEEEENS0_17AllowedRawPointerI6PacketEEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (860|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketiE7getWireIS2_EEiRKMS2_iRKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal11BindingTypeIiE10toWireTypeERKi($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketiE7setWireIS2_EEvRKMS2_iRT_i($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal11BindingTypeIiE12fromWireTypeEi($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP32[$11>>2] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIiE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIiE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIM6PacketiEEPT_RKS4_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11BindingTypeIiE10toWireTypeERKi($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function __ZN10emscripten8internal11BindingTypeIiE12fromWireTypeEi($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDIiE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (672|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_4TypeEE7getWireIS2_EES3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet4TypeEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_4TypeEE7setWireIS2_EEvRKMS2_S3_RT_S3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet4TypeEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_4TypeEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet4TypeEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet4TypeEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_4DataEE7getWireIS2_EES3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet4DataEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_4DataEE7setWireIS2_EEvRKMS2_S3_RT_S3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet4DataEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_4DataEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet4DataEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet4DataEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_7CommandEE7getWireIS2_EES3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet7CommandEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_7CommandEE7setWireIS2_EEvRKMS2_S3_RT_S3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet7CommandEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_7CommandEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet7CommandEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet7CommandEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive5ErrorEE7getWireIS2_EES4_RKMS2_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5ErrorEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive5ErrorEE7setWireIS2_EEvRKMS2_S4_RT_S4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN10SmartDrive5ErrorEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketN10SmartDrive5ErrorEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_3OTAEE7getWireIS2_EES3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = HEAP8[$7>>0]|0;
 $9 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet3OTAEE10toWireTypeES3_($8)|0);
 STACKTOP = sp;return ($9|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_3OTAEE7setWireIS2_EEvRKMS2_S3_RT_S3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal15EnumBindingTypeIN6Packet3OTAEE12fromWireTypeES3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 HEAP8[$11>>0] = $7;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_3OTAEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet3OTAEE10toWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal15EnumBindingTypeIN6Packet3OTAEE12fromWireTypeES3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive8SettingsEE7getWireIS2_EEPS4_RKMS2_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive8SettingsEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive8SettingsEE7setWireIS2_EEvRKMS2_S4_RT_PS4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive8SettingsEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP32[$11>>2]=HEAP32[$7>>2]|0;HEAP32[$11+4>>2]=HEAP32[$7+4>>2]|0;HEAP32[$11+8>>2]=HEAP32[$7+8>>2]|0;HEAP32[$11+12>>2]=HEAP32[$7+12>>2]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketN10SmartDrive8SettingsEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive8SettingsEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(16)|0);
 $3 = $1;
 ;HEAP32[$2>>2]=HEAP32[$3>>2]|0;HEAP32[$2+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$3+8>>2]|0;HEAP32[$2+12>>2]=HEAP32[$3+12>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive8SettingsEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive16ThrottleSettingsEE7getWireIS2_EEPS4_RKMS2_S4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive16ThrottleSettingsEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive16ThrottleSettingsEE7setWireIS2_EEvRKMS2_S4_RT_PS4_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive16ThrottleSettingsEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP32[$11>>2]=HEAP32[$7>>2]|0;HEAP32[$11+4>>2]=HEAP32[$7+4>>2]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketN10SmartDrive16ThrottleSettingsEEEPT_RKS6_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive16ThrottleSettingsEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 ;HEAP32[$2>>2]=HEAP32[$3>>2]|0;HEAP32[$2+4>>2]=HEAP32[$3+4>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN10SmartDrive16ThrottleSettingsEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_12PushSettingsEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet12PushSettingsEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_12PushSettingsEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet12PushSettingsEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP8[$11>>0]=HEAP8[$7>>0]|0;HEAP8[$11+1>>0]=HEAP8[$7+1>>0]|0;HEAP8[$11+2>>0]=HEAP8[$7+2>>0]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_12PushSettingsEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet12PushSettingsEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(3)|0);
 $3 = $1;
 ;HEAP8[$2>>0]=HEAP8[$3>>0]|0;HEAP8[$2+1>>0]=HEAP8[$3+1>>0]|0;HEAP8[$2+2>>0]=HEAP8[$3+2>>0]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet12PushSettingsEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_11VersionInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet11VersionInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_11VersionInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet11VersionInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP8[$11>>0]=HEAP8[$7>>0]|0;HEAP8[$11+1>>0]=HEAP8[$7+1>>0]|0;HEAP8[$11+2>>0]=HEAP8[$7+2>>0]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_11VersionInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet11VersionInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(3)|0);
 $3 = $1;
 ;HEAP8[$2>>0]=HEAP8[$3>>0]|0;HEAP8[$2+1>>0]=HEAP8[$3+1>>0]|0;HEAP8[$2+2>>0]=HEAP8[$3+2>>0]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet11VersionInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_9DailyInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet9DailyInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_9DailyInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet9DailyInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP16[$11>>1]=HEAP16[$7>>1]|0;HEAP16[$11+2>>1]=HEAP16[$7+2>>1]|0;HEAP16[$11+4>>1]=HEAP16[$7+4>>1]|0;HEAP16[$11+6>>1]=HEAP16[$7+6>>1]|0;HEAP16[$11+8>>1]=HEAP16[$7+8>>1]|0;HEAP16[$11+10>>1]=HEAP16[$7+10>>1]|0;HEAP16[$11+12>>1]=HEAP16[$7+12>>1]|0;HEAP16[$11+14>>1]=HEAP16[$7+14>>1]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_9DailyInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet9DailyInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(16)|0);
 $3 = $1;
 ;HEAP16[$2>>1]=HEAP16[$3>>1]|0;HEAP16[$2+2>>1]=HEAP16[$3+2>>1]|0;HEAP16[$2+4>>1]=HEAP16[$3+4>>1]|0;HEAP16[$2+6>>1]=HEAP16[$3+6>>1]|0;HEAP16[$2+8>>1]=HEAP16[$3+8>>1]|0;HEAP16[$2+10>>1]=HEAP16[$3+10>>1]|0;HEAP16[$2+12>>1]=HEAP16[$3+12>>1]|0;HEAP16[$2+14>>1]=HEAP16[$3+14>>1]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet9DailyInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_11JourneyInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet11JourneyInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_11JourneyInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet11JourneyInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP16[$11>>1]=HEAP16[$7>>1]|0;HEAP16[$11+2>>1]=HEAP16[$7+2>>1]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_11JourneyInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet11JourneyInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 ;HEAP16[$2>>1]=HEAP16[$3>>1]|0;HEAP16[$2+2>>1]=HEAP16[$3+2>>1]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet11JourneyInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_9MotorInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet9MotorInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_9MotorInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet9MotorInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP32[$11>>2]=HEAP32[$7>>2]|0;HEAP32[$11+4>>2]=HEAP32[$7+4>>2]|0;HEAP32[$11+8>>2]=HEAP32[$7+8>>2]|0;HEAP32[$11+12>>2]=HEAP32[$7+12>>2]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_9MotorInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet9MotorInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(16)|0);
 $3 = $1;
 ;HEAP32[$2>>2]=HEAP32[$3>>2]|0;HEAP32[$2+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$3+8>>2]|0;HEAP32[$2+12>>2]=HEAP32[$3+12>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet9MotorInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_8TimeInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet8TimeInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_8TimeInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet8TimeInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP16[$11>>1]=HEAP16[$7>>1]|0;HEAP16[$11+2>>1]=HEAP16[$7+2>>1]|0;HEAP16[$11+4>>1]=HEAP16[$7+4>>1]|0;HEAP16[$11+6>>1]=HEAP16[$7+6>>1]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet8TimeInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet8TimeInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_8TimeInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet8TimeInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 ;HEAP16[$2>>1]=HEAP16[$3>>1]|0;HEAP16[$2+2>>1]=HEAP16[$3+2>>1]|0;HEAP16[$2+4>>1]=HEAP16[$3+4>>1]|0;HEAP16[$2+6>>1]=HEAP16[$3+6>>1]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet8TimeInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet8TimeInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (336|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_10DeviceInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet10DeviceInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_10DeviceInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet10DeviceInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP8[$11>>0]=HEAP8[$7>>0]|0;HEAP8[$11+1>>0]=HEAP8[$7+1>>0]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_10DeviceInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet10DeviceInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(2)|0);
 $3 = $1;
 ;HEAP8[$2>>0]=HEAP8[$3>>0]|0;HEAP8[$2+1>>0]=HEAP8[$3+1>>0]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet10DeviceInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_9ErrorInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet9ErrorInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_9ErrorInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet9ErrorInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP16[$11>>1]=HEAP16[$7>>1]|0;HEAP16[$11+2>>1]=HEAP16[$7+2>>1]|0;HEAP16[$11+4>>1]=HEAP16[$7+4>>1]|0;HEAP16[$11+6>>1]=HEAP16[$7+6>>1]|0;HEAP16[$11+8>>1]=HEAP16[$7+8>>1]|0;HEAP16[$11+10>>1]=HEAP16[$7+10>>1]|0;HEAP16[$11+12>>1]=HEAP16[$7+12>>1]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_9ErrorInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet9ErrorInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(14)|0);
 $3 = $1;
 ;HEAP16[$2>>1]=HEAP16[$3>>1]|0;HEAP16[$2+2>>1]=HEAP16[$3+2>>1]|0;HEAP16[$2+4>>1]=HEAP16[$3+4>>1]|0;HEAP16[$2+6>>1]=HEAP16[$3+6>>1]|0;HEAP16[$2+8>>1]=HEAP16[$3+8>>1]|0;HEAP16[$2+10>>1]=HEAP16[$3+10>>1]|0;HEAP16[$2+12>>1]=HEAP16[$3+12>>1]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet9ErrorInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_11BatteryInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet11BatteryInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_11BatteryInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet11BatteryInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP8[$11>>0]=HEAP8[$7>>0]|0;HEAP8[$11+1>>0]=HEAP8[$7+1>>0]|0;HEAP8[$11+2>>0]=HEAP8[$7+2>>0]|0;HEAP8[$11+3>>0]=HEAP8[$7+3>>0]|0;HEAP8[$11+4>>0]=HEAP8[$7+4>>0]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIN6Packet11BatteryInfoEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIN6Packet11BatteryInfoEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_11BatteryInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet11BatteryInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(5)|0);
 $3 = $1;
 ;HEAP8[$2>>0]=HEAP8[$3>>0]|0;HEAP8[$2+1>>0]=HEAP8[$3+1>>0]|0;HEAP8[$2+2>>0]=HEAP8[$3+2>>0]|0;HEAP8[$2+3>>0]=HEAP8[$3+3>>0]|0;HEAP8[$2+4>>0]=HEAP8[$3+4>>0]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet11BatteryInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal11LightTypeIDIN6Packet11BatteryInfoEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (344|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_12DistanceInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + ($6)|0);
 $8 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet12DistanceInfoEE10toWireTypeERKS3_($7)|0);
 STACKTOP = sp;return ($8|0);
}
function __ZN10emscripten8internal12MemberAccessI6PacketNS2_12DistanceInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $5;
 $7 = (__ZN10emscripten8internal18GenericBindingTypeIN6Packet12DistanceInfoEE12fromWireTypeEPS3_($6)|0);
 $8 = $4;
 $9 = $3;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + ($10)|0);
 ;HEAP32[$11>>2]=HEAP32[$7>>2]|0;HEAP32[$11+4>>2]=HEAP32[$7+4>>2]|0;HEAP32[$11+8>>2]=HEAP32[$7+8>>2]|0;HEAP32[$11+12>>2]=HEAP32[$7+12>>2]|0;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketNS2_12DistanceInfoEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(4)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$2>>2] = $4;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet12DistanceInfoEE10toWireTypeERKS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(16)|0);
 $3 = $1;
 ;HEAP32[$2>>2]=HEAP32[$3>>2]|0;HEAP32[$2+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$3+8>>2]|0;HEAP32[$2+12>>2]=HEAP32[$3+12>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal18GenericBindingTypeIN6Packet12DistanceInfoEE12fromWireTypeEPS3_($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12GetterPolicyIM6PacketKFivEE3getIS2_EEiRKS4_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $4 = sp;
 $2 = $0;
 $3 = $1;
 $5 = $3;
 $6 = $2;
 $$field = HEAP32[$6>>2]|0;
 $$index1 = ((($6)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $7 = $$field2 >> 1;
 $8 = (($5) + ($7)|0);
 $9 = $$field2 & 1;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = HEAP32[$8>>2]|0;
  $12 = (($11) + ($$field)|0);
  $13 = HEAP32[$12>>2]|0;
  $15 = $13;
 } else {
  $14 = $$field;
  $15 = $14;
 }
 $16 = (FUNCTION_TABLE_ii[$15 & 127]($8)|0);
 HEAP32[$4>>2] = $16;
 $17 = (__ZN10emscripten8internal11BindingTypeIiE10toWireTypeERKi($4)|0);
 STACKTOP = sp;return ($17|0);
}
function __ZN10emscripten8internal12SetterPolicyIM6PacketFviEE3setIS2_EEvRKS4_RT_i($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $6 = $4;
 $7 = $3;
 $$field = HEAP32[$7>>2]|0;
 $$index1 = ((($7)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $8 = $$field2 >> 1;
 $9 = (($6) + ($8)|0);
 $10 = $$field2 & 1;
 $11 = ($10|0)!=(0);
 if ($11) {
  $12 = HEAP32[$9>>2]|0;
  $13 = (($12) + ($$field)|0);
  $14 = HEAP32[$13>>2]|0;
  $18 = $14;
 } else {
  $15 = $$field;
  $18 = $15;
 }
 $16 = $5;
 $17 = (__ZN10emscripten8internal11BindingTypeIiE12fromWireTypeEi($16)|0);
 FUNCTION_TABLE_vii[$18 & 127]($9,$17);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal12GetterPolicyIM6PacketKFivEE10getContextES4_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $$field = HEAP32[$0>>2]|0;
 $$index1 = ((($0)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$1>>2] = $$field;
 $$index5 = ((($1)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 $2 = (__ZN10emscripten8internal10getContextIM6PacketKFivEEEPT_RKS5_($1)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12SetterPolicyIM6PacketFviEE10getContextES4_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $$field = HEAP32[$0>>2]|0;
 $$index1 = ((($0)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$1>>2] = $$field;
 $$index5 = ((($1)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 $2 = (__ZN10emscripten8internal10getContextIM6PacketFviEEEPT_RKS5_($1)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketKFivEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketFviEEEPT_RKS5_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12GetterPolicyIM6PacketKFNSt3__26vectorIhNS3_9allocatorIhEEEEvEE3getIS2_EEPS7_RKS9_RKT_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $4 = sp;
 $2 = $0;
 $3 = $1;
 $5 = $3;
 $6 = $2;
 $$field = HEAP32[$6>>2]|0;
 $$index1 = ((($6)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $7 = $$field2 >> 1;
 $8 = (($5) + ($7)|0);
 $9 = $$field2 & 1;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = HEAP32[$8>>2]|0;
  $12 = (($11) + ($$field)|0);
  $13 = HEAP32[$12>>2]|0;
  $15 = $13;
 } else {
  $14 = $$field;
  $15 = $14;
 }
 FUNCTION_TABLE_vii[$15 & 127]($4,$8);
 $16 = (__ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE10toWireTypeEOS6_($4)|0);
 __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($4);
 STACKTOP = sp;return ($16|0);
}
function __ZN10emscripten8internal12SetterPolicyIM6PacketFvNSt3__26vectorIhNS3_9allocatorIhEEEEEE3setIS2_EEvRKS9_RT_PS7_($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $6 = sp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 $7 = $4;
 $8 = $3;
 $$field = HEAP32[$8>>2]|0;
 $$index1 = ((($8)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 $9 = $$field2 >> 1;
 $10 = (($7) + ($9)|0);
 $11 = $$field2 & 1;
 $12 = ($11|0)!=(0);
 if ($12) {
  $13 = HEAP32[$10>>2]|0;
  $14 = (($13) + ($$field)|0);
  $15 = HEAP32[$14>>2]|0;
  $19 = $15;
 } else {
  $16 = $$field;
  $19 = $16;
 }
 $17 = $5;
 $18 = (__ZN10emscripten8internal18GenericBindingTypeINSt3__26vectorIhNS2_9allocatorIhEEEEE12fromWireTypeEPS6_($17)|0);
 __ZNSt3__26vectorIhNS_9allocatorIhEEEC2ERKS3_($6,$18);
 FUNCTION_TABLE_vii[$19 & 127]($10,$6);
 __ZNSt3__26vectorIhNS_9allocatorIhEEED2Ev($6);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal12GetterPolicyIM6PacketKFNSt3__26vectorIhNS3_9allocatorIhEEEEvEE10getContextES9_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $$field = HEAP32[$0>>2]|0;
 $$index1 = ((($0)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$1>>2] = $$field;
 $$index5 = ((($1)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 $2 = (__ZN10emscripten8internal10getContextIM6PacketKFNSt3__26vectorIhNS3_9allocatorIhEEEEvEEEPT_RKSA_($1)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal12SetterPolicyIM6PacketFvNSt3__26vectorIhNS3_9allocatorIhEEEEEE10getContextES9_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $$field = HEAP32[$0>>2]|0;
 $$index1 = ((($0)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$1>>2] = $$field;
 $$index5 = ((($1)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 $2 = (__ZN10emscripten8internal10getContextIM6PacketFvNSt3__26vectorIhNS3_9allocatorIhEEEEEEEPT_RKSA_($1)|0);
 STACKTOP = sp;return ($2|0);
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEEC2ERKS3_($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(112|0);
 $7 = sp + 76|0;
 $8 = sp + 16|0;
 $11 = sp + 64|0;
 $12 = sp + 103|0;
 $13 = sp + 8|0;
 $17 = sp + 102|0;
 $19 = sp;
 $21 = sp + 101|0;
 $27 = sp + 100|0;
 $25 = $0;
 $26 = $1;
 $29 = $25;
 $30 = $26;
 $24 = $30;
 $31 = $24;
 $32 = ((($31)) + 8|0);
 $23 = $32;
 $33 = $23;
 $22 = $33;
 $34 = $22;
 $20 = $34;
 $35 = $20;
 ;HEAP8[$19>>0]=HEAP8[$21>>0]|0;
 $18 = $35;
 $15 = $29;
 $16 = $27;
 $36 = $15;
 $14 = $36;
 HEAP32[$36>>2] = 0;
 $37 = ((($36)) + 4|0);
 HEAP32[$37>>2] = 0;
 $38 = ((($36)) + 8|0);
 ;HEAP8[$13>>0]=HEAP8[$17>>0]|0;
 $10 = $38;
 HEAP32[$11>>2] = 0;
 $39 = $10;
 $9 = $11;
 $40 = $9;
 $41 = HEAP32[$40>>2]|0;
 $3 = $13;
 ;HEAP8[$8>>0]=HEAP8[$12>>0]|0;
 $6 = $39;
 HEAP32[$7>>2] = $41;
 $42 = $6;
 $5 = $8;
 $4 = $7;
 $43 = $4;
 $44 = HEAP32[$43>>2]|0;
 HEAP32[$42>>2] = $44;
 $45 = $26;
 $2 = $45;
 $46 = $2;
 $47 = ((($46)) + 4|0);
 $48 = HEAP32[$47>>2]|0;
 $49 = HEAP32[$46>>2]|0;
 $50 = $48;
 $51 = $49;
 $52 = (($50) - ($51))|0;
 $28 = $52;
 $53 = $28;
 $54 = ($53>>>0)>(0);
 if (!($54)) {
  STACKTOP = sp;return;
 }
 $55 = $28;
 __ZNSt3__26vectorIhNS_9allocatorIhEEE8allocateEj($29,$55);
 $56 = $26;
 $57 = HEAP32[$56>>2]|0;
 $58 = $26;
 $59 = ((($58)) + 4|0);
 $60 = HEAP32[$59>>2]|0;
 $61 = $28;
 __ZNSt3__26vectorIhNS_9allocatorIhEEE18__construct_at_endIPhEENS_9enable_ifIXsr21__is_forward_iteratorIT_EE5valueEvE4typeES7_S7_j($29,$57,$60,$61);
 STACKTOP = sp;return;
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE8allocateEj($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(160|0);
 $40 = $0;
 $41 = $1;
 $42 = $40;
 $43 = $41;
 $44 = (__ZNKSt3__26vectorIhNS_9allocatorIhEEE8max_sizeEv($42)|0);
 $45 = ($43>>>0)>($44>>>0);
 if ($45) {
  __ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv($42);
  // unreachable;
 } else {
  $39 = $42;
  $46 = $39;
  $47 = ((($46)) + 8|0);
  $38 = $47;
  $48 = $38;
  $37 = $48;
  $49 = $37;
  $50 = $41;
  $7 = $49;
  $8 = $50;
  $51 = $7;
  $52 = $8;
  $4 = $51;
  $5 = $52;
  $6 = 0;
  $53 = $4;
  $3 = $53;
  $54 = $5;
  $2 = $54;
  $55 = $2;
  $56 = (__Znwj($55)|0);
  $57 = ((($42)) + 4|0);
  HEAP32[$57>>2] = $56;
  HEAP32[$42>>2] = $56;
  $58 = HEAP32[$42>>2]|0;
  $59 = $41;
  $60 = (($58) + ($59)|0);
  $11 = $42;
  $61 = $11;
  $62 = ((($61)) + 8|0);
  $10 = $62;
  $63 = $10;
  $9 = $63;
  $64 = $9;
  HEAP32[$64>>2] = $60;
  $35 = $42;
  $36 = 0;
  $65 = $35;
  $34 = $65;
  $66 = $34;
  $67 = HEAP32[$66>>2]|0;
  $33 = $67;
  $68 = $33;
  $13 = $65;
  $69 = $13;
  $70 = HEAP32[$69>>2]|0;
  $12 = $70;
  $71 = $12;
  $18 = $65;
  $72 = $18;
  $17 = $72;
  $73 = $17;
  $16 = $73;
  $74 = $16;
  $75 = ((($74)) + 8|0);
  $15 = $75;
  $76 = $15;
  $14 = $76;
  $77 = $14;
  $78 = HEAP32[$77>>2]|0;
  $79 = HEAP32[$73>>2]|0;
  $80 = $78;
  $81 = $79;
  $82 = (($80) - ($81))|0;
  $83 = (($71) + ($82)|0);
  $20 = $65;
  $84 = $20;
  $85 = HEAP32[$84>>2]|0;
  $19 = $85;
  $86 = $19;
  $25 = $65;
  $87 = $25;
  $24 = $87;
  $88 = $24;
  $23 = $88;
  $89 = $23;
  $90 = ((($89)) + 8|0);
  $22 = $90;
  $91 = $22;
  $21 = $91;
  $92 = $21;
  $93 = HEAP32[$92>>2]|0;
  $94 = HEAP32[$88>>2]|0;
  $95 = $93;
  $96 = $94;
  $97 = (($95) - ($96))|0;
  $98 = (($86) + ($97)|0);
  $27 = $65;
  $99 = $27;
  $100 = HEAP32[$99>>2]|0;
  $26 = $100;
  $101 = $26;
  $102 = $36;
  $103 = (($101) + ($102)|0);
  $28 = $65;
  $29 = $68;
  $30 = $83;
  $31 = $98;
  $32 = $103;
  STACKTOP = sp;return;
 }
}
function __ZNSt3__26vectorIhNS_9allocatorIhEEE18__construct_at_endIPhEENS_9enable_ifIXsr21__is_forward_iteratorIT_EE5valueEvE4typeES7_S7_j($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(80|0);
 $21 = sp + 68|0;
 $16 = $0;
 $17 = $1;
 $18 = $2;
 $19 = $3;
 $22 = $16;
 $15 = $22;
 $23 = $15;
 $24 = ((($23)) + 8|0);
 $14 = $24;
 $25 = $14;
 $13 = $25;
 $26 = $13;
 $20 = $26;
 $27 = $19;
 $4 = $21;
 $5 = $22;
 $6 = $27;
 $28 = $20;
 $29 = $17;
 $30 = $18;
 $31 = ((($22)) + 4|0);
 $7 = $28;
 $8 = $29;
 $9 = $30;
 $10 = $31;
 $32 = $9;
 $33 = $8;
 $34 = $32;
 $35 = $33;
 $36 = (($34) - ($35))|0;
 $11 = $36;
 $37 = $11;
 $38 = ($37|0)>(0);
 if (!($38)) {
  $12 = $21;
  STACKTOP = sp;return;
 }
 $39 = $10;
 $40 = HEAP32[$39>>2]|0;
 $41 = $8;
 $42 = $11;
 _memcpy(($40|0),($41|0),($42|0))|0;
 $43 = $11;
 $44 = $10;
 $45 = HEAP32[$44>>2]|0;
 $46 = (($45) + ($43)|0);
 HEAP32[$44>>2] = $46;
 $12 = $21;
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal10getContextIM6PacketKFNSt3__26vectorIhNS3_9allocatorIhEEEEvEEEPT_RKSA_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __ZN10emscripten8internal10getContextIM6PacketFvNSt3__26vectorIhNS3_9allocatorIhEEEEEEEPT_RKSA_($0) {
 $0 = $0|0;
 var $$field = 0, $$field2 = 0, $$index1 = 0, $$index5 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__Znwj(8)|0);
 $3 = $1;
 $$field = HEAP32[$3>>2]|0;
 $$index1 = ((($3)) + 4|0);
 $$field2 = HEAP32[$$index1>>2]|0;
 HEAP32[$2>>2] = $$field;
 $$index5 = ((($2)) + 4|0);
 HEAP32[$$index5>>2] = $$field2;
 STACKTOP = sp;return ($2|0);
}
function __GLOBAL__sub_I_packet_cpp() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___cxx_global_var_init();
 return;
}
function __GLOBAL__sub_I_bind_cpp() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___cxx_global_var_init_2();
 return;
}
function ___cxx_global_var_init_2() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN53EmscriptenBindingInitializer_native_and_builtin_typesC2Ev(9045);
 return;
}
function __ZN53EmscriptenBindingInitializer_native_and_builtin_typesC2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIvE3getEv()|0);
 __embind_register_void(($2|0),(4049|0));
 $3 = (__ZN10emscripten8internal6TypeIDIbE3getEv()|0);
 __embind_register_bool(($3|0),(4054|0),1,1,0);
 __ZN12_GLOBAL__N_1L16register_integerIcEEvPKc(4059);
 __ZN12_GLOBAL__N_1L16register_integerIaEEvPKc(4064);
 __ZN12_GLOBAL__N_1L16register_integerIhEEvPKc(4076);
 __ZN12_GLOBAL__N_1L16register_integerIsEEvPKc(4090);
 __ZN12_GLOBAL__N_1L16register_integerItEEvPKc(4096);
 __ZN12_GLOBAL__N_1L16register_integerIiEEvPKc(4111);
 __ZN12_GLOBAL__N_1L16register_integerIjEEvPKc(4115);
 __ZN12_GLOBAL__N_1L16register_integerIlEEvPKc(4128);
 __ZN12_GLOBAL__N_1L16register_integerImEEvPKc(4133);
 __ZN12_GLOBAL__N_1L14register_floatIfEEvPKc(4147);
 __ZN12_GLOBAL__N_1L14register_floatIdEEvPKc(4153);
 $4 = (__ZN10emscripten8internal6TypeIDINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv()|0);
 __embind_register_std_string(($4|0),(4160|0));
 $5 = (__ZN10emscripten8internal6TypeIDINSt3__212basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv()|0);
 __embind_register_std_string(($5|0),(4172|0));
 $6 = (__ZN10emscripten8internal6TypeIDINSt3__212basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv()|0);
 __embind_register_std_wstring(($6|0),4,(4205|0));
 $7 = (__ZN10emscripten8internal6TypeIDINS_3valEE3getEv()|0);
 __embind_register_emval(($7|0),(4218|0));
 __ZN12_GLOBAL__N_1L20register_memory_viewIcEEvPKc(4234);
 __ZN12_GLOBAL__N_1L20register_memory_viewIaEEvPKc(4264);
 __ZN12_GLOBAL__N_1L20register_memory_viewIhEEvPKc(4301);
 __ZN12_GLOBAL__N_1L20register_memory_viewIsEEvPKc(4340);
 __ZN12_GLOBAL__N_1L20register_memory_viewItEEvPKc(4371);
 __ZN12_GLOBAL__N_1L20register_memory_viewIiEEvPKc(4411);
 __ZN12_GLOBAL__N_1L20register_memory_viewIjEEvPKc(4440);
 __ZN12_GLOBAL__N_1L20register_memory_viewIlEEvPKc(4478);
 __ZN12_GLOBAL__N_1L20register_memory_viewImEEvPKc(4508);
 __ZN12_GLOBAL__N_1L20register_memory_viewIaEEvPKc(4547);
 __ZN12_GLOBAL__N_1L20register_memory_viewIhEEvPKc(4579);
 __ZN12_GLOBAL__N_1L20register_memory_viewIsEEvPKc(4612);
 __ZN12_GLOBAL__N_1L20register_memory_viewItEEvPKc(4645);
 __ZN12_GLOBAL__N_1L20register_memory_viewIiEEvPKc(4679);
 __ZN12_GLOBAL__N_1L20register_memory_viewIjEEvPKc(4712);
 __ZN12_GLOBAL__N_1L20register_memory_viewIfEEvPKc(4746);
 __ZN12_GLOBAL__N_1L20register_memory_viewIdEEvPKc(4777);
 __ZN12_GLOBAL__N_1L20register_memory_viewIeEEvPKc(4809);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDIvE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIvE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDIbE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIbE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_1L16register_integerIcEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIcE3getEv()|0);
 $3 = $1;
 $4 = -128 << 24 >> 24;
 $5 = 127 << 24 >> 24;
 __embind_register_integer(($2|0),($3|0),1,($4|0),($5|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIaEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIaE3getEv()|0);
 $3 = $1;
 $4 = -128 << 24 >> 24;
 $5 = 127 << 24 >> 24;
 __embind_register_integer(($2|0),($3|0),1,($4|0),($5|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIhEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $3 = $1;
 $4 = 0;
 $5 = 255;
 __embind_register_integer(($2|0),($3|0),1,($4|0),($5|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIsEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIsE3getEv()|0);
 $3 = $1;
 $4 = -32768 << 16 >> 16;
 $5 = 32767 << 16 >> 16;
 __embind_register_integer(($2|0),($3|0),2,($4|0),($5|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerItEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $3 = $1;
 $4 = 0;
 $5 = 65535;
 __embind_register_integer(($2|0),($3|0),2,($4|0),($5|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIiEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $3 = $1;
 __embind_register_integer(($2|0),($3|0),4,-2147483648,2147483647);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIjEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIjE3getEv()|0);
 $3 = $1;
 __embind_register_integer(($2|0),($3|0),4,0,-1);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIlEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIlE3getEv()|0);
 $3 = $1;
 __embind_register_integer(($2|0),($3|0),4,-2147483648,2147483647);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerImEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDImE3getEv()|0);
 $3 = $1;
 __embind_register_integer(($2|0),($3|0),4,0,-1);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L14register_floatIfEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $3 = $1;
 __embind_register_float(($2|0),($3|0),4);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L14register_floatIdEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDIdE3getEv()|0);
 $3 = $1;
 __embind_register_float(($2|0),($3|0),8);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINSt3__212basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__212basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINSt3__212basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__212basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINS_3valEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_3valEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIcEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIcEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIcEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIaEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIaEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIaEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIhEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIhEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIhEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIsEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIsEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIsEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewItEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewItEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexItEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIiEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIiEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIiEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIjEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIjEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIjEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIlEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIlEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIlEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewImEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewImEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexImEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIfEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIfEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIfEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIdEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIdEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIdEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIeEEvPKc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIeEEE3getEv()|0);
 $3 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIeEENS_15TypedArrayIndexEv()|0);
 $4 = $1;
 __embind_register_memory_view(($2|0),($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIeEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIeEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIeEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 7;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIeEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (352|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIdEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIdEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIdEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 7;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIdEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (360|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIfEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIfEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIfEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 6;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIfEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (368|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewImEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewImEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexImEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 5;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewImEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (376|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIlEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIlEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIlEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 4;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIlEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (384|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIjEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIjEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIjEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 5;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIjEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (392|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIiEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIiEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIiEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 4;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIiEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (400|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewItEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewItEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexItEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 3;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewItEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (408|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIsEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIsEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIsEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 2;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIsEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (416|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIhEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIhEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIhEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 1;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIhEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (424|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIaEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIaEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIaEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIaEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (432|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIcEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIcEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIcEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIcEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (440|0);
}
function __ZN10emscripten8internal11LightTypeIDINS_3valEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (96|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__212basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (448|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__212basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (472|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__212basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (312|0);
}
function __ZN10emscripten8internal6TypeIDIdE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIdE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIdE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (720|0);
}
function __ZN10emscripten8internal6TypeIDImE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDImE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDImE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (696|0);
}
function __ZN10emscripten8internal6TypeIDIlE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIlE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIlE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (688|0);
}
function __ZN10emscripten8internal6TypeIDIjE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIjE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIjE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (680|0);
}
function __ZN10emscripten8internal6TypeIDIsE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIsE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIsE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (656|0);
}
function __ZN10emscripten8internal6TypeIDIaE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIaE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIaE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (648|0);
}
function __ZN10emscripten8internal6TypeIDIcE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIcE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIcE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (632|0);
}
function __ZN10emscripten8internal11LightTypeIDIbE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (624|0);
}
function __ZN10emscripten8internal11LightTypeIDIvE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (608|0);
}
function ___getTypeName($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $2;
 $1 = $3;
 $4 = $1;
 $5 = ((($4)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (___strdup($6)|0);
 STACKTOP = sp;return ($7|0);
}
function _malloc($0) {
 $0 = $0|0;
 var $$$0172$i = 0, $$$0173$i = 0, $$$4236$i = 0, $$$4329$i = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$i$i = 0, $$0$i$i$i = 0, $$0$i20$i = 0, $$0172$lcssa$i = 0, $$01724$i = 0, $$0173$lcssa$i = 0, $$01733$i = 0, $$0192 = 0, $$0194 = 0, $$0201$i$i = 0, $$0202$i$i = 0, $$0206$i$i = 0, $$0207$i$i = 0;
 var $$024367$i = 0, $$0260$i$i = 0, $$0261$i$i = 0, $$0262$i$i = 0, $$0268$i$i = 0, $$0269$i$i = 0, $$0320$i = 0, $$0322$i = 0, $$0323$i = 0, $$0325$i = 0, $$0331$i = 0, $$0336$i = 0, $$0337$$i = 0, $$0337$i = 0, $$0339$i = 0, $$0340$i = 0, $$0345$i = 0, $$1176$i = 0, $$1178$i = 0, $$124466$i = 0;
 var $$1264$i$i = 0, $$1266$i$i = 0, $$1321$i = 0, $$1326$i = 0, $$1341$i = 0, $$1347$i = 0, $$1351$i = 0, $$2234243136$i = 0, $$2247$ph$i = 0, $$2253$ph$i = 0, $$2333$i = 0, $$3$i = 0, $$3$i$i = 0, $$3$i199 = 0, $$3328$i = 0, $$3349$i = 0, $$4$lcssa$i = 0, $$4$ph$i = 0, $$4236$i = 0, $$4329$lcssa$i = 0;
 var $$43298$i = 0, $$4335$$4$i = 0, $$4335$ph$i = 0, $$43357$i = 0, $$49$i = 0, $$723947$i = 0, $$748$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i17$i = 0, $$pre$i195 = 0, $$pre$i207 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i18$iZ2D = 0, $$pre$phi$i208Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phiZ2D = 0, $$sink1$i = 0, $$sink1$i$i = 0;
 var $$sink12$i = 0, $$sink2$i = 0, $$sink2$i202 = 0, $$sink3$i = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0;
 var $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0;
 var $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0;
 var $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0;
 var $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0;
 var $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0;
 var $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0;
 var $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0;
 var $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0;
 var $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0;
 var $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0;
 var $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0;
 var $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0;
 var $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0;
 var $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0;
 var $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0;
 var $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0;
 var $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0;
 var $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0;
 var $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0;
 var $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0;
 var $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0;
 var $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0;
 var $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0;
 var $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0;
 var $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0;
 var $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0;
 var $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0;
 var $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0;
 var $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0;
 var $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0;
 var $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0;
 var $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $98 = 0, $99 = 0, $cond$i = 0, $cond$i$i = 0, $cond$i206 = 0, $not$$i = 0, $not$3$i = 0;
 var $or$cond$i = 0, $or$cond$i200 = 0, $or$cond1$i = 0, $or$cond1$i198 = 0, $or$cond10$i = 0, $or$cond11$i = 0, $or$cond11$not$i = 0, $or$cond12$i = 0, $or$cond2$i = 0, $or$cond49$i = 0, $or$cond5$i = 0, $or$cond50$i = 0, $or$cond7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $2 = ($0>>>0)<(245);
 do {
  if ($2) {
   $3 = ($0>>>0)<(11);
   $4 = (($0) + 11)|0;
   $5 = $4 & -8;
   $6 = $3 ? 16 : $5;
   $7 = $6 >>> 3;
   $8 = HEAP32[2114]|0;
   $9 = $8 >>> $7;
   $10 = $9 & 3;
   $11 = ($10|0)==(0);
   if (!($11)) {
    $12 = $9 & 1;
    $13 = $12 ^ 1;
    $14 = (($13) + ($7))|0;
    $15 = $14 << 1;
    $16 = (8496 + ($15<<2)|0);
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ((($18)) + 8|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = ($20|0)==($16|0);
    if ($21) {
     $22 = 1 << $14;
     $23 = $22 ^ -1;
     $24 = $8 & $23;
     HEAP32[2114] = $24;
    } else {
     $25 = ((($20)) + 12|0);
     HEAP32[$25>>2] = $16;
     HEAP32[$17>>2] = $20;
    }
    $26 = $14 << 3;
    $27 = $26 | 3;
    $28 = ((($18)) + 4|0);
    HEAP32[$28>>2] = $27;
    $29 = (($18) + ($26)|0);
    $30 = ((($29)) + 4|0);
    $31 = HEAP32[$30>>2]|0;
    $32 = $31 | 1;
    HEAP32[$30>>2] = $32;
    $$0 = $19;
    STACKTOP = sp;return ($$0|0);
   }
   $33 = HEAP32[(8464)>>2]|0;
   $34 = ($6>>>0)>($33>>>0);
   if ($34) {
    $35 = ($9|0)==(0);
    if (!($35)) {
     $36 = $9 << $7;
     $37 = 2 << $7;
     $38 = (0 - ($37))|0;
     $39 = $37 | $38;
     $40 = $36 & $39;
     $41 = (0 - ($40))|0;
     $42 = $40 & $41;
     $43 = (($42) + -1)|0;
     $44 = $43 >>> 12;
     $45 = $44 & 16;
     $46 = $43 >>> $45;
     $47 = $46 >>> 5;
     $48 = $47 & 8;
     $49 = $48 | $45;
     $50 = $46 >>> $48;
     $51 = $50 >>> 2;
     $52 = $51 & 4;
     $53 = $49 | $52;
     $54 = $50 >>> $52;
     $55 = $54 >>> 1;
     $56 = $55 & 2;
     $57 = $53 | $56;
     $58 = $54 >>> $56;
     $59 = $58 >>> 1;
     $60 = $59 & 1;
     $61 = $57 | $60;
     $62 = $58 >>> $60;
     $63 = (($61) + ($62))|0;
     $64 = $63 << 1;
     $65 = (8496 + ($64<<2)|0);
     $66 = ((($65)) + 8|0);
     $67 = HEAP32[$66>>2]|0;
     $68 = ((($67)) + 8|0);
     $69 = HEAP32[$68>>2]|0;
     $70 = ($69|0)==($65|0);
     if ($70) {
      $71 = 1 << $63;
      $72 = $71 ^ -1;
      $73 = $8 & $72;
      HEAP32[2114] = $73;
      $90 = $73;
     } else {
      $74 = ((($69)) + 12|0);
      HEAP32[$74>>2] = $65;
      HEAP32[$66>>2] = $69;
      $90 = $8;
     }
     $75 = $63 << 3;
     $76 = (($75) - ($6))|0;
     $77 = $6 | 3;
     $78 = ((($67)) + 4|0);
     HEAP32[$78>>2] = $77;
     $79 = (($67) + ($6)|0);
     $80 = $76 | 1;
     $81 = ((($79)) + 4|0);
     HEAP32[$81>>2] = $80;
     $82 = (($67) + ($75)|0);
     HEAP32[$82>>2] = $76;
     $83 = ($33|0)==(0);
     if (!($83)) {
      $84 = HEAP32[(8476)>>2]|0;
      $85 = $33 >>> 3;
      $86 = $85 << 1;
      $87 = (8496 + ($86<<2)|0);
      $88 = 1 << $85;
      $89 = $90 & $88;
      $91 = ($89|0)==(0);
      if ($91) {
       $92 = $90 | $88;
       HEAP32[2114] = $92;
       $$pre = ((($87)) + 8|0);
       $$0194 = $87;$$pre$phiZ2D = $$pre;
      } else {
       $93 = ((($87)) + 8|0);
       $94 = HEAP32[$93>>2]|0;
       $$0194 = $94;$$pre$phiZ2D = $93;
      }
      HEAP32[$$pre$phiZ2D>>2] = $84;
      $95 = ((($$0194)) + 12|0);
      HEAP32[$95>>2] = $84;
      $96 = ((($84)) + 8|0);
      HEAP32[$96>>2] = $$0194;
      $97 = ((($84)) + 12|0);
      HEAP32[$97>>2] = $87;
     }
     HEAP32[(8464)>>2] = $76;
     HEAP32[(8476)>>2] = $79;
     $$0 = $68;
     STACKTOP = sp;return ($$0|0);
    }
    $98 = HEAP32[(8460)>>2]|0;
    $99 = ($98|0)==(0);
    if ($99) {
     $$0192 = $6;
    } else {
     $100 = (0 - ($98))|0;
     $101 = $98 & $100;
     $102 = (($101) + -1)|0;
     $103 = $102 >>> 12;
     $104 = $103 & 16;
     $105 = $102 >>> $104;
     $106 = $105 >>> 5;
     $107 = $106 & 8;
     $108 = $107 | $104;
     $109 = $105 >>> $107;
     $110 = $109 >>> 2;
     $111 = $110 & 4;
     $112 = $108 | $111;
     $113 = $109 >>> $111;
     $114 = $113 >>> 1;
     $115 = $114 & 2;
     $116 = $112 | $115;
     $117 = $113 >>> $115;
     $118 = $117 >>> 1;
     $119 = $118 & 1;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = (($120) + ($121))|0;
     $123 = (8760 + ($122<<2)|0);
     $124 = HEAP32[$123>>2]|0;
     $125 = ((($124)) + 4|0);
     $126 = HEAP32[$125>>2]|0;
     $127 = $126 & -8;
     $128 = (($127) - ($6))|0;
     $129 = ((($124)) + 16|0);
     $130 = HEAP32[$129>>2]|0;
     $131 = ($130|0)==(0|0);
     $$sink12$i = $131&1;
     $132 = (((($124)) + 16|0) + ($$sink12$i<<2)|0);
     $133 = HEAP32[$132>>2]|0;
     $134 = ($133|0)==(0|0);
     if ($134) {
      $$0172$lcssa$i = $124;$$0173$lcssa$i = $128;
     } else {
      $$01724$i = $124;$$01733$i = $128;$136 = $133;
      while(1) {
       $135 = ((($136)) + 4|0);
       $137 = HEAP32[$135>>2]|0;
       $138 = $137 & -8;
       $139 = (($138) - ($6))|0;
       $140 = ($139>>>0)<($$01733$i>>>0);
       $$$0173$i = $140 ? $139 : $$01733$i;
       $$$0172$i = $140 ? $136 : $$01724$i;
       $141 = ((($136)) + 16|0);
       $142 = HEAP32[$141>>2]|0;
       $143 = ($142|0)==(0|0);
       $$sink1$i = $143&1;
       $144 = (((($136)) + 16|0) + ($$sink1$i<<2)|0);
       $145 = HEAP32[$144>>2]|0;
       $146 = ($145|0)==(0|0);
       if ($146) {
        $$0172$lcssa$i = $$$0172$i;$$0173$lcssa$i = $$$0173$i;
        break;
       } else {
        $$01724$i = $$$0172$i;$$01733$i = $$$0173$i;$136 = $145;
       }
      }
     }
     $147 = (($$0172$lcssa$i) + ($6)|0);
     $148 = ($147>>>0)>($$0172$lcssa$i>>>0);
     if ($148) {
      $149 = ((($$0172$lcssa$i)) + 24|0);
      $150 = HEAP32[$149>>2]|0;
      $151 = ((($$0172$lcssa$i)) + 12|0);
      $152 = HEAP32[$151>>2]|0;
      $153 = ($152|0)==($$0172$lcssa$i|0);
      do {
       if ($153) {
        $158 = ((($$0172$lcssa$i)) + 20|0);
        $159 = HEAP32[$158>>2]|0;
        $160 = ($159|0)==(0|0);
        if ($160) {
         $161 = ((($$0172$lcssa$i)) + 16|0);
         $162 = HEAP32[$161>>2]|0;
         $163 = ($162|0)==(0|0);
         if ($163) {
          $$3$i = 0;
          break;
         } else {
          $$1176$i = $162;$$1178$i = $161;
         }
        } else {
         $$1176$i = $159;$$1178$i = $158;
        }
        while(1) {
         $164 = ((($$1176$i)) + 20|0);
         $165 = HEAP32[$164>>2]|0;
         $166 = ($165|0)==(0|0);
         if (!($166)) {
          $$1176$i = $165;$$1178$i = $164;
          continue;
         }
         $167 = ((($$1176$i)) + 16|0);
         $168 = HEAP32[$167>>2]|0;
         $169 = ($168|0)==(0|0);
         if ($169) {
          break;
         } else {
          $$1176$i = $168;$$1178$i = $167;
         }
        }
        HEAP32[$$1178$i>>2] = 0;
        $$3$i = $$1176$i;
       } else {
        $154 = ((($$0172$lcssa$i)) + 8|0);
        $155 = HEAP32[$154>>2]|0;
        $156 = ((($155)) + 12|0);
        HEAP32[$156>>2] = $152;
        $157 = ((($152)) + 8|0);
        HEAP32[$157>>2] = $155;
        $$3$i = $152;
       }
      } while(0);
      $170 = ($150|0)==(0|0);
      do {
       if (!($170)) {
        $171 = ((($$0172$lcssa$i)) + 28|0);
        $172 = HEAP32[$171>>2]|0;
        $173 = (8760 + ($172<<2)|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($$0172$lcssa$i|0)==($174|0);
        if ($175) {
         HEAP32[$173>>2] = $$3$i;
         $cond$i = ($$3$i|0)==(0|0);
         if ($cond$i) {
          $176 = 1 << $172;
          $177 = $176 ^ -1;
          $178 = $98 & $177;
          HEAP32[(8460)>>2] = $178;
          break;
         }
        } else {
         $179 = ((($150)) + 16|0);
         $180 = HEAP32[$179>>2]|0;
         $181 = ($180|0)!=($$0172$lcssa$i|0);
         $$sink2$i = $181&1;
         $182 = (((($150)) + 16|0) + ($$sink2$i<<2)|0);
         HEAP32[$182>>2] = $$3$i;
         $183 = ($$3$i|0)==(0|0);
         if ($183) {
          break;
         }
        }
        $184 = ((($$3$i)) + 24|0);
        HEAP32[$184>>2] = $150;
        $185 = ((($$0172$lcssa$i)) + 16|0);
        $186 = HEAP32[$185>>2]|0;
        $187 = ($186|0)==(0|0);
        if (!($187)) {
         $188 = ((($$3$i)) + 16|0);
         HEAP32[$188>>2] = $186;
         $189 = ((($186)) + 24|0);
         HEAP32[$189>>2] = $$3$i;
        }
        $190 = ((($$0172$lcssa$i)) + 20|0);
        $191 = HEAP32[$190>>2]|0;
        $192 = ($191|0)==(0|0);
        if (!($192)) {
         $193 = ((($$3$i)) + 20|0);
         HEAP32[$193>>2] = $191;
         $194 = ((($191)) + 24|0);
         HEAP32[$194>>2] = $$3$i;
        }
       }
      } while(0);
      $195 = ($$0173$lcssa$i>>>0)<(16);
      if ($195) {
       $196 = (($$0173$lcssa$i) + ($6))|0;
       $197 = $196 | 3;
       $198 = ((($$0172$lcssa$i)) + 4|0);
       HEAP32[$198>>2] = $197;
       $199 = (($$0172$lcssa$i) + ($196)|0);
       $200 = ((($199)) + 4|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = $201 | 1;
       HEAP32[$200>>2] = $202;
      } else {
       $203 = $6 | 3;
       $204 = ((($$0172$lcssa$i)) + 4|0);
       HEAP32[$204>>2] = $203;
       $205 = $$0173$lcssa$i | 1;
       $206 = ((($147)) + 4|0);
       HEAP32[$206>>2] = $205;
       $207 = (($147) + ($$0173$lcssa$i)|0);
       HEAP32[$207>>2] = $$0173$lcssa$i;
       $208 = ($33|0)==(0);
       if (!($208)) {
        $209 = HEAP32[(8476)>>2]|0;
        $210 = $33 >>> 3;
        $211 = $210 << 1;
        $212 = (8496 + ($211<<2)|0);
        $213 = 1 << $210;
        $214 = $8 & $213;
        $215 = ($214|0)==(0);
        if ($215) {
         $216 = $8 | $213;
         HEAP32[2114] = $216;
         $$pre$i = ((($212)) + 8|0);
         $$0$i = $212;$$pre$phi$iZ2D = $$pre$i;
        } else {
         $217 = ((($212)) + 8|0);
         $218 = HEAP32[$217>>2]|0;
         $$0$i = $218;$$pre$phi$iZ2D = $217;
        }
        HEAP32[$$pre$phi$iZ2D>>2] = $209;
        $219 = ((($$0$i)) + 12|0);
        HEAP32[$219>>2] = $209;
        $220 = ((($209)) + 8|0);
        HEAP32[$220>>2] = $$0$i;
        $221 = ((($209)) + 12|0);
        HEAP32[$221>>2] = $212;
       }
       HEAP32[(8464)>>2] = $$0173$lcssa$i;
       HEAP32[(8476)>>2] = $147;
      }
      $222 = ((($$0172$lcssa$i)) + 8|0);
      $$0 = $222;
      STACKTOP = sp;return ($$0|0);
     } else {
      $$0192 = $6;
     }
    }
   } else {
    $$0192 = $6;
   }
  } else {
   $223 = ($0>>>0)>(4294967231);
   if ($223) {
    $$0192 = -1;
   } else {
    $224 = (($0) + 11)|0;
    $225 = $224 & -8;
    $226 = HEAP32[(8460)>>2]|0;
    $227 = ($226|0)==(0);
    if ($227) {
     $$0192 = $225;
    } else {
     $228 = (0 - ($225))|0;
     $229 = $224 >>> 8;
     $230 = ($229|0)==(0);
     if ($230) {
      $$0336$i = 0;
     } else {
      $231 = ($225>>>0)>(16777215);
      if ($231) {
       $$0336$i = 31;
      } else {
       $232 = (($229) + 1048320)|0;
       $233 = $232 >>> 16;
       $234 = $233 & 8;
       $235 = $229 << $234;
       $236 = (($235) + 520192)|0;
       $237 = $236 >>> 16;
       $238 = $237 & 4;
       $239 = $238 | $234;
       $240 = $235 << $238;
       $241 = (($240) + 245760)|0;
       $242 = $241 >>> 16;
       $243 = $242 & 2;
       $244 = $239 | $243;
       $245 = (14 - ($244))|0;
       $246 = $240 << $243;
       $247 = $246 >>> 15;
       $248 = (($245) + ($247))|0;
       $249 = $248 << 1;
       $250 = (($248) + 7)|0;
       $251 = $225 >>> $250;
       $252 = $251 & 1;
       $253 = $252 | $249;
       $$0336$i = $253;
      }
     }
     $254 = (8760 + ($$0336$i<<2)|0);
     $255 = HEAP32[$254>>2]|0;
     $256 = ($255|0)==(0|0);
     L74: do {
      if ($256) {
       $$2333$i = 0;$$3$i199 = 0;$$3328$i = $228;
       label = 57;
      } else {
       $257 = ($$0336$i|0)==(31);
       $258 = $$0336$i >>> 1;
       $259 = (25 - ($258))|0;
       $260 = $257 ? 0 : $259;
       $261 = $225 << $260;
       $$0320$i = 0;$$0325$i = $228;$$0331$i = $255;$$0337$i = $261;$$0340$i = 0;
       while(1) {
        $262 = ((($$0331$i)) + 4|0);
        $263 = HEAP32[$262>>2]|0;
        $264 = $263 & -8;
        $265 = (($264) - ($225))|0;
        $266 = ($265>>>0)<($$0325$i>>>0);
        if ($266) {
         $267 = ($265|0)==(0);
         if ($267) {
          $$43298$i = 0;$$43357$i = $$0331$i;$$49$i = $$0331$i;
          label = 61;
          break L74;
         } else {
          $$1321$i = $$0331$i;$$1326$i = $265;
         }
        } else {
         $$1321$i = $$0320$i;$$1326$i = $$0325$i;
        }
        $268 = ((($$0331$i)) + 20|0);
        $269 = HEAP32[$268>>2]|0;
        $270 = $$0337$i >>> 31;
        $271 = (((($$0331$i)) + 16|0) + ($270<<2)|0);
        $272 = HEAP32[$271>>2]|0;
        $273 = ($269|0)==(0|0);
        $274 = ($269|0)==($272|0);
        $or$cond1$i198 = $273 | $274;
        $$1341$i = $or$cond1$i198 ? $$0340$i : $269;
        $275 = ($272|0)==(0|0);
        $not$3$i = $275 ^ 1;
        $276 = $not$3$i&1;
        $$0337$$i = $$0337$i << $276;
        if ($275) {
         $$2333$i = $$1341$i;$$3$i199 = $$1321$i;$$3328$i = $$1326$i;
         label = 57;
         break;
        } else {
         $$0320$i = $$1321$i;$$0325$i = $$1326$i;$$0331$i = $272;$$0337$i = $$0337$$i;$$0340$i = $$1341$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 57) {
      $277 = ($$2333$i|0)==(0|0);
      $278 = ($$3$i199|0)==(0|0);
      $or$cond$i200 = $277 & $278;
      if ($or$cond$i200) {
       $279 = 2 << $$0336$i;
       $280 = (0 - ($279))|0;
       $281 = $279 | $280;
       $282 = $226 & $281;
       $283 = ($282|0)==(0);
       if ($283) {
        $$0192 = $225;
        break;
       }
       $284 = (0 - ($282))|0;
       $285 = $282 & $284;
       $286 = (($285) + -1)|0;
       $287 = $286 >>> 12;
       $288 = $287 & 16;
       $289 = $286 >>> $288;
       $290 = $289 >>> 5;
       $291 = $290 & 8;
       $292 = $291 | $288;
       $293 = $289 >>> $291;
       $294 = $293 >>> 2;
       $295 = $294 & 4;
       $296 = $292 | $295;
       $297 = $293 >>> $295;
       $298 = $297 >>> 1;
       $299 = $298 & 2;
       $300 = $296 | $299;
       $301 = $297 >>> $299;
       $302 = $301 >>> 1;
       $303 = $302 & 1;
       $304 = $300 | $303;
       $305 = $301 >>> $303;
       $306 = (($304) + ($305))|0;
       $307 = (8760 + ($306<<2)|0);
       $308 = HEAP32[$307>>2]|0;
       $$4$ph$i = 0;$$4335$ph$i = $308;
      } else {
       $$4$ph$i = $$3$i199;$$4335$ph$i = $$2333$i;
      }
      $309 = ($$4335$ph$i|0)==(0|0);
      if ($309) {
       $$4$lcssa$i = $$4$ph$i;$$4329$lcssa$i = $$3328$i;
      } else {
       $$43298$i = $$3328$i;$$43357$i = $$4335$ph$i;$$49$i = $$4$ph$i;
       label = 61;
      }
     }
     if ((label|0) == 61) {
      while(1) {
       label = 0;
       $310 = ((($$43357$i)) + 4|0);
       $311 = HEAP32[$310>>2]|0;
       $312 = $311 & -8;
       $313 = (($312) - ($225))|0;
       $314 = ($313>>>0)<($$43298$i>>>0);
       $$$4329$i = $314 ? $313 : $$43298$i;
       $$4335$$4$i = $314 ? $$43357$i : $$49$i;
       $315 = ((($$43357$i)) + 16|0);
       $316 = HEAP32[$315>>2]|0;
       $317 = ($316|0)==(0|0);
       $$sink2$i202 = $317&1;
       $318 = (((($$43357$i)) + 16|0) + ($$sink2$i202<<2)|0);
       $319 = HEAP32[$318>>2]|0;
       $320 = ($319|0)==(0|0);
       if ($320) {
        $$4$lcssa$i = $$4335$$4$i;$$4329$lcssa$i = $$$4329$i;
        break;
       } else {
        $$43298$i = $$$4329$i;$$43357$i = $319;$$49$i = $$4335$$4$i;
        label = 61;
       }
      }
     }
     $321 = ($$4$lcssa$i|0)==(0|0);
     if ($321) {
      $$0192 = $225;
     } else {
      $322 = HEAP32[(8464)>>2]|0;
      $323 = (($322) - ($225))|0;
      $324 = ($$4329$lcssa$i>>>0)<($323>>>0);
      if ($324) {
       $325 = (($$4$lcssa$i) + ($225)|0);
       $326 = ($325>>>0)>($$4$lcssa$i>>>0);
       if (!($326)) {
        $$0 = 0;
        STACKTOP = sp;return ($$0|0);
       }
       $327 = ((($$4$lcssa$i)) + 24|0);
       $328 = HEAP32[$327>>2]|0;
       $329 = ((($$4$lcssa$i)) + 12|0);
       $330 = HEAP32[$329>>2]|0;
       $331 = ($330|0)==($$4$lcssa$i|0);
       do {
        if ($331) {
         $336 = ((($$4$lcssa$i)) + 20|0);
         $337 = HEAP32[$336>>2]|0;
         $338 = ($337|0)==(0|0);
         if ($338) {
          $339 = ((($$4$lcssa$i)) + 16|0);
          $340 = HEAP32[$339>>2]|0;
          $341 = ($340|0)==(0|0);
          if ($341) {
           $$3349$i = 0;
           break;
          } else {
           $$1347$i = $340;$$1351$i = $339;
          }
         } else {
          $$1347$i = $337;$$1351$i = $336;
         }
         while(1) {
          $342 = ((($$1347$i)) + 20|0);
          $343 = HEAP32[$342>>2]|0;
          $344 = ($343|0)==(0|0);
          if (!($344)) {
           $$1347$i = $343;$$1351$i = $342;
           continue;
          }
          $345 = ((($$1347$i)) + 16|0);
          $346 = HEAP32[$345>>2]|0;
          $347 = ($346|0)==(0|0);
          if ($347) {
           break;
          } else {
           $$1347$i = $346;$$1351$i = $345;
          }
         }
         HEAP32[$$1351$i>>2] = 0;
         $$3349$i = $$1347$i;
        } else {
         $332 = ((($$4$lcssa$i)) + 8|0);
         $333 = HEAP32[$332>>2]|0;
         $334 = ((($333)) + 12|0);
         HEAP32[$334>>2] = $330;
         $335 = ((($330)) + 8|0);
         HEAP32[$335>>2] = $333;
         $$3349$i = $330;
        }
       } while(0);
       $348 = ($328|0)==(0|0);
       do {
        if ($348) {
         $431 = $226;
        } else {
         $349 = ((($$4$lcssa$i)) + 28|0);
         $350 = HEAP32[$349>>2]|0;
         $351 = (8760 + ($350<<2)|0);
         $352 = HEAP32[$351>>2]|0;
         $353 = ($$4$lcssa$i|0)==($352|0);
         if ($353) {
          HEAP32[$351>>2] = $$3349$i;
          $cond$i206 = ($$3349$i|0)==(0|0);
          if ($cond$i206) {
           $354 = 1 << $350;
           $355 = $354 ^ -1;
           $356 = $226 & $355;
           HEAP32[(8460)>>2] = $356;
           $431 = $356;
           break;
          }
         } else {
          $357 = ((($328)) + 16|0);
          $358 = HEAP32[$357>>2]|0;
          $359 = ($358|0)!=($$4$lcssa$i|0);
          $$sink3$i = $359&1;
          $360 = (((($328)) + 16|0) + ($$sink3$i<<2)|0);
          HEAP32[$360>>2] = $$3349$i;
          $361 = ($$3349$i|0)==(0|0);
          if ($361) {
           $431 = $226;
           break;
          }
         }
         $362 = ((($$3349$i)) + 24|0);
         HEAP32[$362>>2] = $328;
         $363 = ((($$4$lcssa$i)) + 16|0);
         $364 = HEAP32[$363>>2]|0;
         $365 = ($364|0)==(0|0);
         if (!($365)) {
          $366 = ((($$3349$i)) + 16|0);
          HEAP32[$366>>2] = $364;
          $367 = ((($364)) + 24|0);
          HEAP32[$367>>2] = $$3349$i;
         }
         $368 = ((($$4$lcssa$i)) + 20|0);
         $369 = HEAP32[$368>>2]|0;
         $370 = ($369|0)==(0|0);
         if ($370) {
          $431 = $226;
         } else {
          $371 = ((($$3349$i)) + 20|0);
          HEAP32[$371>>2] = $369;
          $372 = ((($369)) + 24|0);
          HEAP32[$372>>2] = $$3349$i;
          $431 = $226;
         }
        }
       } while(0);
       $373 = ($$4329$lcssa$i>>>0)<(16);
       do {
        if ($373) {
         $374 = (($$4329$lcssa$i) + ($225))|0;
         $375 = $374 | 3;
         $376 = ((($$4$lcssa$i)) + 4|0);
         HEAP32[$376>>2] = $375;
         $377 = (($$4$lcssa$i) + ($374)|0);
         $378 = ((($377)) + 4|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = $379 | 1;
         HEAP32[$378>>2] = $380;
        } else {
         $381 = $225 | 3;
         $382 = ((($$4$lcssa$i)) + 4|0);
         HEAP32[$382>>2] = $381;
         $383 = $$4329$lcssa$i | 1;
         $384 = ((($325)) + 4|0);
         HEAP32[$384>>2] = $383;
         $385 = (($325) + ($$4329$lcssa$i)|0);
         HEAP32[$385>>2] = $$4329$lcssa$i;
         $386 = $$4329$lcssa$i >>> 3;
         $387 = ($$4329$lcssa$i>>>0)<(256);
         if ($387) {
          $388 = $386 << 1;
          $389 = (8496 + ($388<<2)|0);
          $390 = HEAP32[2114]|0;
          $391 = 1 << $386;
          $392 = $390 & $391;
          $393 = ($392|0)==(0);
          if ($393) {
           $394 = $390 | $391;
           HEAP32[2114] = $394;
           $$pre$i207 = ((($389)) + 8|0);
           $$0345$i = $389;$$pre$phi$i208Z2D = $$pre$i207;
          } else {
           $395 = ((($389)) + 8|0);
           $396 = HEAP32[$395>>2]|0;
           $$0345$i = $396;$$pre$phi$i208Z2D = $395;
          }
          HEAP32[$$pre$phi$i208Z2D>>2] = $325;
          $397 = ((($$0345$i)) + 12|0);
          HEAP32[$397>>2] = $325;
          $398 = ((($325)) + 8|0);
          HEAP32[$398>>2] = $$0345$i;
          $399 = ((($325)) + 12|0);
          HEAP32[$399>>2] = $389;
          break;
         }
         $400 = $$4329$lcssa$i >>> 8;
         $401 = ($400|0)==(0);
         if ($401) {
          $$0339$i = 0;
         } else {
          $402 = ($$4329$lcssa$i>>>0)>(16777215);
          if ($402) {
           $$0339$i = 31;
          } else {
           $403 = (($400) + 1048320)|0;
           $404 = $403 >>> 16;
           $405 = $404 & 8;
           $406 = $400 << $405;
           $407 = (($406) + 520192)|0;
           $408 = $407 >>> 16;
           $409 = $408 & 4;
           $410 = $409 | $405;
           $411 = $406 << $409;
           $412 = (($411) + 245760)|0;
           $413 = $412 >>> 16;
           $414 = $413 & 2;
           $415 = $410 | $414;
           $416 = (14 - ($415))|0;
           $417 = $411 << $414;
           $418 = $417 >>> 15;
           $419 = (($416) + ($418))|0;
           $420 = $419 << 1;
           $421 = (($419) + 7)|0;
           $422 = $$4329$lcssa$i >>> $421;
           $423 = $422 & 1;
           $424 = $423 | $420;
           $$0339$i = $424;
          }
         }
         $425 = (8760 + ($$0339$i<<2)|0);
         $426 = ((($325)) + 28|0);
         HEAP32[$426>>2] = $$0339$i;
         $427 = ((($325)) + 16|0);
         $428 = ((($427)) + 4|0);
         HEAP32[$428>>2] = 0;
         HEAP32[$427>>2] = 0;
         $429 = 1 << $$0339$i;
         $430 = $431 & $429;
         $432 = ($430|0)==(0);
         if ($432) {
          $433 = $431 | $429;
          HEAP32[(8460)>>2] = $433;
          HEAP32[$425>>2] = $325;
          $434 = ((($325)) + 24|0);
          HEAP32[$434>>2] = $425;
          $435 = ((($325)) + 12|0);
          HEAP32[$435>>2] = $325;
          $436 = ((($325)) + 8|0);
          HEAP32[$436>>2] = $325;
          break;
         }
         $437 = HEAP32[$425>>2]|0;
         $438 = ($$0339$i|0)==(31);
         $439 = $$0339$i >>> 1;
         $440 = (25 - ($439))|0;
         $441 = $438 ? 0 : $440;
         $442 = $$4329$lcssa$i << $441;
         $$0322$i = $442;$$0323$i = $437;
         while(1) {
          $443 = ((($$0323$i)) + 4|0);
          $444 = HEAP32[$443>>2]|0;
          $445 = $444 & -8;
          $446 = ($445|0)==($$4329$lcssa$i|0);
          if ($446) {
           label = 97;
           break;
          }
          $447 = $$0322$i >>> 31;
          $448 = (((($$0323$i)) + 16|0) + ($447<<2)|0);
          $449 = $$0322$i << 1;
          $450 = HEAP32[$448>>2]|0;
          $451 = ($450|0)==(0|0);
          if ($451) {
           label = 96;
           break;
          } else {
           $$0322$i = $449;$$0323$i = $450;
          }
         }
         if ((label|0) == 96) {
          HEAP32[$448>>2] = $325;
          $452 = ((($325)) + 24|0);
          HEAP32[$452>>2] = $$0323$i;
          $453 = ((($325)) + 12|0);
          HEAP32[$453>>2] = $325;
          $454 = ((($325)) + 8|0);
          HEAP32[$454>>2] = $325;
          break;
         }
         else if ((label|0) == 97) {
          $455 = ((($$0323$i)) + 8|0);
          $456 = HEAP32[$455>>2]|0;
          $457 = ((($456)) + 12|0);
          HEAP32[$457>>2] = $325;
          HEAP32[$455>>2] = $325;
          $458 = ((($325)) + 8|0);
          HEAP32[$458>>2] = $456;
          $459 = ((($325)) + 12|0);
          HEAP32[$459>>2] = $$0323$i;
          $460 = ((($325)) + 24|0);
          HEAP32[$460>>2] = 0;
          break;
         }
        }
       } while(0);
       $461 = ((($$4$lcssa$i)) + 8|0);
       $$0 = $461;
       STACKTOP = sp;return ($$0|0);
      } else {
       $$0192 = $225;
      }
     }
    }
   }
  }
 } while(0);
 $462 = HEAP32[(8464)>>2]|0;
 $463 = ($462>>>0)<($$0192>>>0);
 if (!($463)) {
  $464 = (($462) - ($$0192))|0;
  $465 = HEAP32[(8476)>>2]|0;
  $466 = ($464>>>0)>(15);
  if ($466) {
   $467 = (($465) + ($$0192)|0);
   HEAP32[(8476)>>2] = $467;
   HEAP32[(8464)>>2] = $464;
   $468 = $464 | 1;
   $469 = ((($467)) + 4|0);
   HEAP32[$469>>2] = $468;
   $470 = (($465) + ($462)|0);
   HEAP32[$470>>2] = $464;
   $471 = $$0192 | 3;
   $472 = ((($465)) + 4|0);
   HEAP32[$472>>2] = $471;
  } else {
   HEAP32[(8464)>>2] = 0;
   HEAP32[(8476)>>2] = 0;
   $473 = $462 | 3;
   $474 = ((($465)) + 4|0);
   HEAP32[$474>>2] = $473;
   $475 = (($465) + ($462)|0);
   $476 = ((($475)) + 4|0);
   $477 = HEAP32[$476>>2]|0;
   $478 = $477 | 1;
   HEAP32[$476>>2] = $478;
  }
  $479 = ((($465)) + 8|0);
  $$0 = $479;
  STACKTOP = sp;return ($$0|0);
 }
 $480 = HEAP32[(8468)>>2]|0;
 $481 = ($480>>>0)>($$0192>>>0);
 if ($481) {
  $482 = (($480) - ($$0192))|0;
  HEAP32[(8468)>>2] = $482;
  $483 = HEAP32[(8480)>>2]|0;
  $484 = (($483) + ($$0192)|0);
  HEAP32[(8480)>>2] = $484;
  $485 = $482 | 1;
  $486 = ((($484)) + 4|0);
  HEAP32[$486>>2] = $485;
  $487 = $$0192 | 3;
  $488 = ((($483)) + 4|0);
  HEAP32[$488>>2] = $487;
  $489 = ((($483)) + 8|0);
  $$0 = $489;
  STACKTOP = sp;return ($$0|0);
 }
 $490 = HEAP32[2232]|0;
 $491 = ($490|0)==(0);
 if ($491) {
  HEAP32[(8936)>>2] = 4096;
  HEAP32[(8932)>>2] = 4096;
  HEAP32[(8940)>>2] = -1;
  HEAP32[(8944)>>2] = -1;
  HEAP32[(8948)>>2] = 0;
  HEAP32[(8900)>>2] = 0;
  $492 = $1;
  $493 = $492 & -16;
  $494 = $493 ^ 1431655768;
  HEAP32[2232] = $494;
  $498 = 4096;
 } else {
  $$pre$i195 = HEAP32[(8936)>>2]|0;
  $498 = $$pre$i195;
 }
 $495 = (($$0192) + 48)|0;
 $496 = (($$0192) + 47)|0;
 $497 = (($498) + ($496))|0;
 $499 = (0 - ($498))|0;
 $500 = $497 & $499;
 $501 = ($500>>>0)>($$0192>>>0);
 if (!($501)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $502 = HEAP32[(8896)>>2]|0;
 $503 = ($502|0)==(0);
 if (!($503)) {
  $504 = HEAP32[(8888)>>2]|0;
  $505 = (($504) + ($500))|0;
  $506 = ($505>>>0)<=($504>>>0);
  $507 = ($505>>>0)>($502>>>0);
  $or$cond1$i = $506 | $507;
  if ($or$cond1$i) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $508 = HEAP32[(8900)>>2]|0;
 $509 = $508 & 4;
 $510 = ($509|0)==(0);
 L167: do {
  if ($510) {
   $511 = HEAP32[(8480)>>2]|0;
   $512 = ($511|0)==(0|0);
   L169: do {
    if ($512) {
     label = 118;
    } else {
     $$0$i20$i = (8904);
     while(1) {
      $513 = HEAP32[$$0$i20$i>>2]|0;
      $514 = ($513>>>0)>($511>>>0);
      if (!($514)) {
       $515 = ((($$0$i20$i)) + 4|0);
       $516 = HEAP32[$515>>2]|0;
       $517 = (($513) + ($516)|0);
       $518 = ($517>>>0)>($511>>>0);
       if ($518) {
        break;
       }
      }
      $519 = ((($$0$i20$i)) + 8|0);
      $520 = HEAP32[$519>>2]|0;
      $521 = ($520|0)==(0|0);
      if ($521) {
       label = 118;
       break L169;
      } else {
       $$0$i20$i = $520;
      }
     }
     $544 = (($497) - ($480))|0;
     $545 = $544 & $499;
     $546 = ($545>>>0)<(2147483647);
     if ($546) {
      $547 = (_sbrk(($545|0))|0);
      $548 = HEAP32[$$0$i20$i>>2]|0;
      $549 = HEAP32[$515>>2]|0;
      $550 = (($548) + ($549)|0);
      $551 = ($547|0)==($550|0);
      if ($551) {
       $552 = ($547|0)==((-1)|0);
       if ($552) {
        $$2234243136$i = $545;
       } else {
        $$723947$i = $545;$$748$i = $547;
        label = 135;
        break L167;
       }
      } else {
       $$2247$ph$i = $547;$$2253$ph$i = $545;
       label = 126;
      }
     } else {
      $$2234243136$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 118) {
     $522 = (_sbrk(0)|0);
     $523 = ($522|0)==((-1)|0);
     if ($523) {
      $$2234243136$i = 0;
     } else {
      $524 = $522;
      $525 = HEAP32[(8932)>>2]|0;
      $526 = (($525) + -1)|0;
      $527 = $526 & $524;
      $528 = ($527|0)==(0);
      $529 = (($526) + ($524))|0;
      $530 = (0 - ($525))|0;
      $531 = $529 & $530;
      $532 = (($531) - ($524))|0;
      $533 = $528 ? 0 : $532;
      $$$i = (($533) + ($500))|0;
      $534 = HEAP32[(8888)>>2]|0;
      $535 = (($$$i) + ($534))|0;
      $536 = ($$$i>>>0)>($$0192>>>0);
      $537 = ($$$i>>>0)<(2147483647);
      $or$cond$i = $536 & $537;
      if ($or$cond$i) {
       $538 = HEAP32[(8896)>>2]|0;
       $539 = ($538|0)==(0);
       if (!($539)) {
        $540 = ($535>>>0)<=($534>>>0);
        $541 = ($535>>>0)>($538>>>0);
        $or$cond2$i = $540 | $541;
        if ($or$cond2$i) {
         $$2234243136$i = 0;
         break;
        }
       }
       $542 = (_sbrk(($$$i|0))|0);
       $543 = ($542|0)==($522|0);
       if ($543) {
        $$723947$i = $$$i;$$748$i = $522;
        label = 135;
        break L167;
       } else {
        $$2247$ph$i = $542;$$2253$ph$i = $$$i;
        label = 126;
       }
      } else {
       $$2234243136$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 126) {
     $553 = (0 - ($$2253$ph$i))|0;
     $554 = ($$2247$ph$i|0)!=((-1)|0);
     $555 = ($$2253$ph$i>>>0)<(2147483647);
     $or$cond7$i = $555 & $554;
     $556 = ($495>>>0)>($$2253$ph$i>>>0);
     $or$cond10$i = $556 & $or$cond7$i;
     if (!($or$cond10$i)) {
      $566 = ($$2247$ph$i|0)==((-1)|0);
      if ($566) {
       $$2234243136$i = 0;
       break;
      } else {
       $$723947$i = $$2253$ph$i;$$748$i = $$2247$ph$i;
       label = 135;
       break L167;
      }
     }
     $557 = HEAP32[(8936)>>2]|0;
     $558 = (($496) - ($$2253$ph$i))|0;
     $559 = (($558) + ($557))|0;
     $560 = (0 - ($557))|0;
     $561 = $559 & $560;
     $562 = ($561>>>0)<(2147483647);
     if (!($562)) {
      $$723947$i = $$2253$ph$i;$$748$i = $$2247$ph$i;
      label = 135;
      break L167;
     }
     $563 = (_sbrk(($561|0))|0);
     $564 = ($563|0)==((-1)|0);
     if ($564) {
      (_sbrk(($553|0))|0);
      $$2234243136$i = 0;
      break;
     } else {
      $565 = (($561) + ($$2253$ph$i))|0;
      $$723947$i = $565;$$748$i = $$2247$ph$i;
      label = 135;
      break L167;
     }
    }
   } while(0);
   $567 = HEAP32[(8900)>>2]|0;
   $568 = $567 | 4;
   HEAP32[(8900)>>2] = $568;
   $$4236$i = $$2234243136$i;
   label = 133;
  } else {
   $$4236$i = 0;
   label = 133;
  }
 } while(0);
 if ((label|0) == 133) {
  $569 = ($500>>>0)<(2147483647);
  if ($569) {
   $570 = (_sbrk(($500|0))|0);
   $571 = (_sbrk(0)|0);
   $572 = ($570|0)!=((-1)|0);
   $573 = ($571|0)!=((-1)|0);
   $or$cond5$i = $572 & $573;
   $574 = ($570>>>0)<($571>>>0);
   $or$cond11$i = $574 & $or$cond5$i;
   $575 = $571;
   $576 = $570;
   $577 = (($575) - ($576))|0;
   $578 = (($$0192) + 40)|0;
   $579 = ($577>>>0)>($578>>>0);
   $$$4236$i = $579 ? $577 : $$4236$i;
   $or$cond11$not$i = $or$cond11$i ^ 1;
   $580 = ($570|0)==((-1)|0);
   $not$$i = $579 ^ 1;
   $581 = $580 | $not$$i;
   $or$cond49$i = $581 | $or$cond11$not$i;
   if (!($or$cond49$i)) {
    $$723947$i = $$$4236$i;$$748$i = $570;
    label = 135;
   }
  }
 }
 if ((label|0) == 135) {
  $582 = HEAP32[(8888)>>2]|0;
  $583 = (($582) + ($$723947$i))|0;
  HEAP32[(8888)>>2] = $583;
  $584 = HEAP32[(8892)>>2]|0;
  $585 = ($583>>>0)>($584>>>0);
  if ($585) {
   HEAP32[(8892)>>2] = $583;
  }
  $586 = HEAP32[(8480)>>2]|0;
  $587 = ($586|0)==(0|0);
  do {
   if ($587) {
    $588 = HEAP32[(8472)>>2]|0;
    $589 = ($588|0)==(0|0);
    $590 = ($$748$i>>>0)<($588>>>0);
    $or$cond12$i = $589 | $590;
    if ($or$cond12$i) {
     HEAP32[(8472)>>2] = $$748$i;
    }
    HEAP32[(8904)>>2] = $$748$i;
    HEAP32[(8908)>>2] = $$723947$i;
    HEAP32[(8916)>>2] = 0;
    $591 = HEAP32[2232]|0;
    HEAP32[(8492)>>2] = $591;
    HEAP32[(8488)>>2] = -1;
    HEAP32[(8508)>>2] = (8496);
    HEAP32[(8504)>>2] = (8496);
    HEAP32[(8516)>>2] = (8504);
    HEAP32[(8512)>>2] = (8504);
    HEAP32[(8524)>>2] = (8512);
    HEAP32[(8520)>>2] = (8512);
    HEAP32[(8532)>>2] = (8520);
    HEAP32[(8528)>>2] = (8520);
    HEAP32[(8540)>>2] = (8528);
    HEAP32[(8536)>>2] = (8528);
    HEAP32[(8548)>>2] = (8536);
    HEAP32[(8544)>>2] = (8536);
    HEAP32[(8556)>>2] = (8544);
    HEAP32[(8552)>>2] = (8544);
    HEAP32[(8564)>>2] = (8552);
    HEAP32[(8560)>>2] = (8552);
    HEAP32[(8572)>>2] = (8560);
    HEAP32[(8568)>>2] = (8560);
    HEAP32[(8580)>>2] = (8568);
    HEAP32[(8576)>>2] = (8568);
    HEAP32[(8588)>>2] = (8576);
    HEAP32[(8584)>>2] = (8576);
    HEAP32[(8596)>>2] = (8584);
    HEAP32[(8592)>>2] = (8584);
    HEAP32[(8604)>>2] = (8592);
    HEAP32[(8600)>>2] = (8592);
    HEAP32[(8612)>>2] = (8600);
    HEAP32[(8608)>>2] = (8600);
    HEAP32[(8620)>>2] = (8608);
    HEAP32[(8616)>>2] = (8608);
    HEAP32[(8628)>>2] = (8616);
    HEAP32[(8624)>>2] = (8616);
    HEAP32[(8636)>>2] = (8624);
    HEAP32[(8632)>>2] = (8624);
    HEAP32[(8644)>>2] = (8632);
    HEAP32[(8640)>>2] = (8632);
    HEAP32[(8652)>>2] = (8640);
    HEAP32[(8648)>>2] = (8640);
    HEAP32[(8660)>>2] = (8648);
    HEAP32[(8656)>>2] = (8648);
    HEAP32[(8668)>>2] = (8656);
    HEAP32[(8664)>>2] = (8656);
    HEAP32[(8676)>>2] = (8664);
    HEAP32[(8672)>>2] = (8664);
    HEAP32[(8684)>>2] = (8672);
    HEAP32[(8680)>>2] = (8672);
    HEAP32[(8692)>>2] = (8680);
    HEAP32[(8688)>>2] = (8680);
    HEAP32[(8700)>>2] = (8688);
    HEAP32[(8696)>>2] = (8688);
    HEAP32[(8708)>>2] = (8696);
    HEAP32[(8704)>>2] = (8696);
    HEAP32[(8716)>>2] = (8704);
    HEAP32[(8712)>>2] = (8704);
    HEAP32[(8724)>>2] = (8712);
    HEAP32[(8720)>>2] = (8712);
    HEAP32[(8732)>>2] = (8720);
    HEAP32[(8728)>>2] = (8720);
    HEAP32[(8740)>>2] = (8728);
    HEAP32[(8736)>>2] = (8728);
    HEAP32[(8748)>>2] = (8736);
    HEAP32[(8744)>>2] = (8736);
    HEAP32[(8756)>>2] = (8744);
    HEAP32[(8752)>>2] = (8744);
    $592 = (($$723947$i) + -40)|0;
    $593 = ((($$748$i)) + 8|0);
    $594 = $593;
    $595 = $594 & 7;
    $596 = ($595|0)==(0);
    $597 = (0 - ($594))|0;
    $598 = $597 & 7;
    $599 = $596 ? 0 : $598;
    $600 = (($$748$i) + ($599)|0);
    $601 = (($592) - ($599))|0;
    HEAP32[(8480)>>2] = $600;
    HEAP32[(8468)>>2] = $601;
    $602 = $601 | 1;
    $603 = ((($600)) + 4|0);
    HEAP32[$603>>2] = $602;
    $604 = (($$748$i) + ($592)|0);
    $605 = ((($604)) + 4|0);
    HEAP32[$605>>2] = 40;
    $606 = HEAP32[(8944)>>2]|0;
    HEAP32[(8484)>>2] = $606;
   } else {
    $$024367$i = (8904);
    while(1) {
     $607 = HEAP32[$$024367$i>>2]|0;
     $608 = ((($$024367$i)) + 4|0);
     $609 = HEAP32[$608>>2]|0;
     $610 = (($607) + ($609)|0);
     $611 = ($$748$i|0)==($610|0);
     if ($611) {
      label = 143;
      break;
     }
     $612 = ((($$024367$i)) + 8|0);
     $613 = HEAP32[$612>>2]|0;
     $614 = ($613|0)==(0|0);
     if ($614) {
      break;
     } else {
      $$024367$i = $613;
     }
    }
    if ((label|0) == 143) {
     $615 = ((($$024367$i)) + 12|0);
     $616 = HEAP32[$615>>2]|0;
     $617 = $616 & 8;
     $618 = ($617|0)==(0);
     if ($618) {
      $619 = ($607>>>0)<=($586>>>0);
      $620 = ($$748$i>>>0)>($586>>>0);
      $or$cond50$i = $620 & $619;
      if ($or$cond50$i) {
       $621 = (($609) + ($$723947$i))|0;
       HEAP32[$608>>2] = $621;
       $622 = HEAP32[(8468)>>2]|0;
       $623 = (($622) + ($$723947$i))|0;
       $624 = ((($586)) + 8|0);
       $625 = $624;
       $626 = $625 & 7;
       $627 = ($626|0)==(0);
       $628 = (0 - ($625))|0;
       $629 = $628 & 7;
       $630 = $627 ? 0 : $629;
       $631 = (($586) + ($630)|0);
       $632 = (($623) - ($630))|0;
       HEAP32[(8480)>>2] = $631;
       HEAP32[(8468)>>2] = $632;
       $633 = $632 | 1;
       $634 = ((($631)) + 4|0);
       HEAP32[$634>>2] = $633;
       $635 = (($586) + ($623)|0);
       $636 = ((($635)) + 4|0);
       HEAP32[$636>>2] = 40;
       $637 = HEAP32[(8944)>>2]|0;
       HEAP32[(8484)>>2] = $637;
       break;
      }
     }
    }
    $638 = HEAP32[(8472)>>2]|0;
    $639 = ($$748$i>>>0)<($638>>>0);
    if ($639) {
     HEAP32[(8472)>>2] = $$748$i;
    }
    $640 = (($$748$i) + ($$723947$i)|0);
    $$124466$i = (8904);
    while(1) {
     $641 = HEAP32[$$124466$i>>2]|0;
     $642 = ($641|0)==($640|0);
     if ($642) {
      label = 151;
      break;
     }
     $643 = ((($$124466$i)) + 8|0);
     $644 = HEAP32[$643>>2]|0;
     $645 = ($644|0)==(0|0);
     if ($645) {
      $$0$i$i$i = (8904);
      break;
     } else {
      $$124466$i = $644;
     }
    }
    if ((label|0) == 151) {
     $646 = ((($$124466$i)) + 12|0);
     $647 = HEAP32[$646>>2]|0;
     $648 = $647 & 8;
     $649 = ($648|0)==(0);
     if ($649) {
      HEAP32[$$124466$i>>2] = $$748$i;
      $650 = ((($$124466$i)) + 4|0);
      $651 = HEAP32[$650>>2]|0;
      $652 = (($651) + ($$723947$i))|0;
      HEAP32[$650>>2] = $652;
      $653 = ((($$748$i)) + 8|0);
      $654 = $653;
      $655 = $654 & 7;
      $656 = ($655|0)==(0);
      $657 = (0 - ($654))|0;
      $658 = $657 & 7;
      $659 = $656 ? 0 : $658;
      $660 = (($$748$i) + ($659)|0);
      $661 = ((($640)) + 8|0);
      $662 = $661;
      $663 = $662 & 7;
      $664 = ($663|0)==(0);
      $665 = (0 - ($662))|0;
      $666 = $665 & 7;
      $667 = $664 ? 0 : $666;
      $668 = (($640) + ($667)|0);
      $669 = $668;
      $670 = $660;
      $671 = (($669) - ($670))|0;
      $672 = (($660) + ($$0192)|0);
      $673 = (($671) - ($$0192))|0;
      $674 = $$0192 | 3;
      $675 = ((($660)) + 4|0);
      HEAP32[$675>>2] = $674;
      $676 = ($586|0)==($668|0);
      do {
       if ($676) {
        $677 = HEAP32[(8468)>>2]|0;
        $678 = (($677) + ($673))|0;
        HEAP32[(8468)>>2] = $678;
        HEAP32[(8480)>>2] = $672;
        $679 = $678 | 1;
        $680 = ((($672)) + 4|0);
        HEAP32[$680>>2] = $679;
       } else {
        $681 = HEAP32[(8476)>>2]|0;
        $682 = ($681|0)==($668|0);
        if ($682) {
         $683 = HEAP32[(8464)>>2]|0;
         $684 = (($683) + ($673))|0;
         HEAP32[(8464)>>2] = $684;
         HEAP32[(8476)>>2] = $672;
         $685 = $684 | 1;
         $686 = ((($672)) + 4|0);
         HEAP32[$686>>2] = $685;
         $687 = (($672) + ($684)|0);
         HEAP32[$687>>2] = $684;
         break;
        }
        $688 = ((($668)) + 4|0);
        $689 = HEAP32[$688>>2]|0;
        $690 = $689 & 3;
        $691 = ($690|0)==(1);
        if ($691) {
         $692 = $689 & -8;
         $693 = $689 >>> 3;
         $694 = ($689>>>0)<(256);
         L234: do {
          if ($694) {
           $695 = ((($668)) + 8|0);
           $696 = HEAP32[$695>>2]|0;
           $697 = ((($668)) + 12|0);
           $698 = HEAP32[$697>>2]|0;
           $699 = ($698|0)==($696|0);
           if ($699) {
            $700 = 1 << $693;
            $701 = $700 ^ -1;
            $702 = HEAP32[2114]|0;
            $703 = $702 & $701;
            HEAP32[2114] = $703;
            break;
           } else {
            $704 = ((($696)) + 12|0);
            HEAP32[$704>>2] = $698;
            $705 = ((($698)) + 8|0);
            HEAP32[$705>>2] = $696;
            break;
           }
          } else {
           $706 = ((($668)) + 24|0);
           $707 = HEAP32[$706>>2]|0;
           $708 = ((($668)) + 12|0);
           $709 = HEAP32[$708>>2]|0;
           $710 = ($709|0)==($668|0);
           do {
            if ($710) {
             $715 = ((($668)) + 16|0);
             $716 = ((($715)) + 4|0);
             $717 = HEAP32[$716>>2]|0;
             $718 = ($717|0)==(0|0);
             if ($718) {
              $719 = HEAP32[$715>>2]|0;
              $720 = ($719|0)==(0|0);
              if ($720) {
               $$3$i$i = 0;
               break;
              } else {
               $$1264$i$i = $719;$$1266$i$i = $715;
              }
             } else {
              $$1264$i$i = $717;$$1266$i$i = $716;
             }
             while(1) {
              $721 = ((($$1264$i$i)) + 20|0);
              $722 = HEAP32[$721>>2]|0;
              $723 = ($722|0)==(0|0);
              if (!($723)) {
               $$1264$i$i = $722;$$1266$i$i = $721;
               continue;
              }
              $724 = ((($$1264$i$i)) + 16|0);
              $725 = HEAP32[$724>>2]|0;
              $726 = ($725|0)==(0|0);
              if ($726) {
               break;
              } else {
               $$1264$i$i = $725;$$1266$i$i = $724;
              }
             }
             HEAP32[$$1266$i$i>>2] = 0;
             $$3$i$i = $$1264$i$i;
            } else {
             $711 = ((($668)) + 8|0);
             $712 = HEAP32[$711>>2]|0;
             $713 = ((($712)) + 12|0);
             HEAP32[$713>>2] = $709;
             $714 = ((($709)) + 8|0);
             HEAP32[$714>>2] = $712;
             $$3$i$i = $709;
            }
           } while(0);
           $727 = ($707|0)==(0|0);
           if ($727) {
            break;
           }
           $728 = ((($668)) + 28|0);
           $729 = HEAP32[$728>>2]|0;
           $730 = (8760 + ($729<<2)|0);
           $731 = HEAP32[$730>>2]|0;
           $732 = ($731|0)==($668|0);
           do {
            if ($732) {
             HEAP32[$730>>2] = $$3$i$i;
             $cond$i$i = ($$3$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $733 = 1 << $729;
             $734 = $733 ^ -1;
             $735 = HEAP32[(8460)>>2]|0;
             $736 = $735 & $734;
             HEAP32[(8460)>>2] = $736;
             break L234;
            } else {
             $737 = ((($707)) + 16|0);
             $738 = HEAP32[$737>>2]|0;
             $739 = ($738|0)!=($668|0);
             $$sink1$i$i = $739&1;
             $740 = (((($707)) + 16|0) + ($$sink1$i$i<<2)|0);
             HEAP32[$740>>2] = $$3$i$i;
             $741 = ($$3$i$i|0)==(0|0);
             if ($741) {
              break L234;
             }
            }
           } while(0);
           $742 = ((($$3$i$i)) + 24|0);
           HEAP32[$742>>2] = $707;
           $743 = ((($668)) + 16|0);
           $744 = HEAP32[$743>>2]|0;
           $745 = ($744|0)==(0|0);
           if (!($745)) {
            $746 = ((($$3$i$i)) + 16|0);
            HEAP32[$746>>2] = $744;
            $747 = ((($744)) + 24|0);
            HEAP32[$747>>2] = $$3$i$i;
           }
           $748 = ((($743)) + 4|0);
           $749 = HEAP32[$748>>2]|0;
           $750 = ($749|0)==(0|0);
           if ($750) {
            break;
           }
           $751 = ((($$3$i$i)) + 20|0);
           HEAP32[$751>>2] = $749;
           $752 = ((($749)) + 24|0);
           HEAP32[$752>>2] = $$3$i$i;
          }
         } while(0);
         $753 = (($668) + ($692)|0);
         $754 = (($692) + ($673))|0;
         $$0$i$i = $753;$$0260$i$i = $754;
        } else {
         $$0$i$i = $668;$$0260$i$i = $673;
        }
        $755 = ((($$0$i$i)) + 4|0);
        $756 = HEAP32[$755>>2]|0;
        $757 = $756 & -2;
        HEAP32[$755>>2] = $757;
        $758 = $$0260$i$i | 1;
        $759 = ((($672)) + 4|0);
        HEAP32[$759>>2] = $758;
        $760 = (($672) + ($$0260$i$i)|0);
        HEAP32[$760>>2] = $$0260$i$i;
        $761 = $$0260$i$i >>> 3;
        $762 = ($$0260$i$i>>>0)<(256);
        if ($762) {
         $763 = $761 << 1;
         $764 = (8496 + ($763<<2)|0);
         $765 = HEAP32[2114]|0;
         $766 = 1 << $761;
         $767 = $765 & $766;
         $768 = ($767|0)==(0);
         if ($768) {
          $769 = $765 | $766;
          HEAP32[2114] = $769;
          $$pre$i17$i = ((($764)) + 8|0);
          $$0268$i$i = $764;$$pre$phi$i18$iZ2D = $$pre$i17$i;
         } else {
          $770 = ((($764)) + 8|0);
          $771 = HEAP32[$770>>2]|0;
          $$0268$i$i = $771;$$pre$phi$i18$iZ2D = $770;
         }
         HEAP32[$$pre$phi$i18$iZ2D>>2] = $672;
         $772 = ((($$0268$i$i)) + 12|0);
         HEAP32[$772>>2] = $672;
         $773 = ((($672)) + 8|0);
         HEAP32[$773>>2] = $$0268$i$i;
         $774 = ((($672)) + 12|0);
         HEAP32[$774>>2] = $764;
         break;
        }
        $775 = $$0260$i$i >>> 8;
        $776 = ($775|0)==(0);
        do {
         if ($776) {
          $$0269$i$i = 0;
         } else {
          $777 = ($$0260$i$i>>>0)>(16777215);
          if ($777) {
           $$0269$i$i = 31;
           break;
          }
          $778 = (($775) + 1048320)|0;
          $779 = $778 >>> 16;
          $780 = $779 & 8;
          $781 = $775 << $780;
          $782 = (($781) + 520192)|0;
          $783 = $782 >>> 16;
          $784 = $783 & 4;
          $785 = $784 | $780;
          $786 = $781 << $784;
          $787 = (($786) + 245760)|0;
          $788 = $787 >>> 16;
          $789 = $788 & 2;
          $790 = $785 | $789;
          $791 = (14 - ($790))|0;
          $792 = $786 << $789;
          $793 = $792 >>> 15;
          $794 = (($791) + ($793))|0;
          $795 = $794 << 1;
          $796 = (($794) + 7)|0;
          $797 = $$0260$i$i >>> $796;
          $798 = $797 & 1;
          $799 = $798 | $795;
          $$0269$i$i = $799;
         }
        } while(0);
        $800 = (8760 + ($$0269$i$i<<2)|0);
        $801 = ((($672)) + 28|0);
        HEAP32[$801>>2] = $$0269$i$i;
        $802 = ((($672)) + 16|0);
        $803 = ((($802)) + 4|0);
        HEAP32[$803>>2] = 0;
        HEAP32[$802>>2] = 0;
        $804 = HEAP32[(8460)>>2]|0;
        $805 = 1 << $$0269$i$i;
        $806 = $804 & $805;
        $807 = ($806|0)==(0);
        if ($807) {
         $808 = $804 | $805;
         HEAP32[(8460)>>2] = $808;
         HEAP32[$800>>2] = $672;
         $809 = ((($672)) + 24|0);
         HEAP32[$809>>2] = $800;
         $810 = ((($672)) + 12|0);
         HEAP32[$810>>2] = $672;
         $811 = ((($672)) + 8|0);
         HEAP32[$811>>2] = $672;
         break;
        }
        $812 = HEAP32[$800>>2]|0;
        $813 = ($$0269$i$i|0)==(31);
        $814 = $$0269$i$i >>> 1;
        $815 = (25 - ($814))|0;
        $816 = $813 ? 0 : $815;
        $817 = $$0260$i$i << $816;
        $$0261$i$i = $817;$$0262$i$i = $812;
        while(1) {
         $818 = ((($$0262$i$i)) + 4|0);
         $819 = HEAP32[$818>>2]|0;
         $820 = $819 & -8;
         $821 = ($820|0)==($$0260$i$i|0);
         if ($821) {
          label = 192;
          break;
         }
         $822 = $$0261$i$i >>> 31;
         $823 = (((($$0262$i$i)) + 16|0) + ($822<<2)|0);
         $824 = $$0261$i$i << 1;
         $825 = HEAP32[$823>>2]|0;
         $826 = ($825|0)==(0|0);
         if ($826) {
          label = 191;
          break;
         } else {
          $$0261$i$i = $824;$$0262$i$i = $825;
         }
        }
        if ((label|0) == 191) {
         HEAP32[$823>>2] = $672;
         $827 = ((($672)) + 24|0);
         HEAP32[$827>>2] = $$0262$i$i;
         $828 = ((($672)) + 12|0);
         HEAP32[$828>>2] = $672;
         $829 = ((($672)) + 8|0);
         HEAP32[$829>>2] = $672;
         break;
        }
        else if ((label|0) == 192) {
         $830 = ((($$0262$i$i)) + 8|0);
         $831 = HEAP32[$830>>2]|0;
         $832 = ((($831)) + 12|0);
         HEAP32[$832>>2] = $672;
         HEAP32[$830>>2] = $672;
         $833 = ((($672)) + 8|0);
         HEAP32[$833>>2] = $831;
         $834 = ((($672)) + 12|0);
         HEAP32[$834>>2] = $$0262$i$i;
         $835 = ((($672)) + 24|0);
         HEAP32[$835>>2] = 0;
         break;
        }
       }
      } while(0);
      $960 = ((($660)) + 8|0);
      $$0 = $960;
      STACKTOP = sp;return ($$0|0);
     } else {
      $$0$i$i$i = (8904);
     }
    }
    while(1) {
     $836 = HEAP32[$$0$i$i$i>>2]|0;
     $837 = ($836>>>0)>($586>>>0);
     if (!($837)) {
      $838 = ((($$0$i$i$i)) + 4|0);
      $839 = HEAP32[$838>>2]|0;
      $840 = (($836) + ($839)|0);
      $841 = ($840>>>0)>($586>>>0);
      if ($841) {
       break;
      }
     }
     $842 = ((($$0$i$i$i)) + 8|0);
     $843 = HEAP32[$842>>2]|0;
     $$0$i$i$i = $843;
    }
    $844 = ((($840)) + -47|0);
    $845 = ((($844)) + 8|0);
    $846 = $845;
    $847 = $846 & 7;
    $848 = ($847|0)==(0);
    $849 = (0 - ($846))|0;
    $850 = $849 & 7;
    $851 = $848 ? 0 : $850;
    $852 = (($844) + ($851)|0);
    $853 = ((($586)) + 16|0);
    $854 = ($852>>>0)<($853>>>0);
    $855 = $854 ? $586 : $852;
    $856 = ((($855)) + 8|0);
    $857 = ((($855)) + 24|0);
    $858 = (($$723947$i) + -40)|0;
    $859 = ((($$748$i)) + 8|0);
    $860 = $859;
    $861 = $860 & 7;
    $862 = ($861|0)==(0);
    $863 = (0 - ($860))|0;
    $864 = $863 & 7;
    $865 = $862 ? 0 : $864;
    $866 = (($$748$i) + ($865)|0);
    $867 = (($858) - ($865))|0;
    HEAP32[(8480)>>2] = $866;
    HEAP32[(8468)>>2] = $867;
    $868 = $867 | 1;
    $869 = ((($866)) + 4|0);
    HEAP32[$869>>2] = $868;
    $870 = (($$748$i) + ($858)|0);
    $871 = ((($870)) + 4|0);
    HEAP32[$871>>2] = 40;
    $872 = HEAP32[(8944)>>2]|0;
    HEAP32[(8484)>>2] = $872;
    $873 = ((($855)) + 4|0);
    HEAP32[$873>>2] = 27;
    ;HEAP32[$856>>2]=HEAP32[(8904)>>2]|0;HEAP32[$856+4>>2]=HEAP32[(8904)+4>>2]|0;HEAP32[$856+8>>2]=HEAP32[(8904)+8>>2]|0;HEAP32[$856+12>>2]=HEAP32[(8904)+12>>2]|0;
    HEAP32[(8904)>>2] = $$748$i;
    HEAP32[(8908)>>2] = $$723947$i;
    HEAP32[(8916)>>2] = 0;
    HEAP32[(8912)>>2] = $856;
    $875 = $857;
    while(1) {
     $874 = ((($875)) + 4|0);
     HEAP32[$874>>2] = 7;
     $876 = ((($875)) + 8|0);
     $877 = ($876>>>0)<($840>>>0);
     if ($877) {
      $875 = $874;
     } else {
      break;
     }
    }
    $878 = ($855|0)==($586|0);
    if (!($878)) {
     $879 = $855;
     $880 = $586;
     $881 = (($879) - ($880))|0;
     $882 = HEAP32[$873>>2]|0;
     $883 = $882 & -2;
     HEAP32[$873>>2] = $883;
     $884 = $881 | 1;
     $885 = ((($586)) + 4|0);
     HEAP32[$885>>2] = $884;
     HEAP32[$855>>2] = $881;
     $886 = $881 >>> 3;
     $887 = ($881>>>0)<(256);
     if ($887) {
      $888 = $886 << 1;
      $889 = (8496 + ($888<<2)|0);
      $890 = HEAP32[2114]|0;
      $891 = 1 << $886;
      $892 = $890 & $891;
      $893 = ($892|0)==(0);
      if ($893) {
       $894 = $890 | $891;
       HEAP32[2114] = $894;
       $$pre$i$i = ((($889)) + 8|0);
       $$0206$i$i = $889;$$pre$phi$i$iZ2D = $$pre$i$i;
      } else {
       $895 = ((($889)) + 8|0);
       $896 = HEAP32[$895>>2]|0;
       $$0206$i$i = $896;$$pre$phi$i$iZ2D = $895;
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $586;
      $897 = ((($$0206$i$i)) + 12|0);
      HEAP32[$897>>2] = $586;
      $898 = ((($586)) + 8|0);
      HEAP32[$898>>2] = $$0206$i$i;
      $899 = ((($586)) + 12|0);
      HEAP32[$899>>2] = $889;
      break;
     }
     $900 = $881 >>> 8;
     $901 = ($900|0)==(0);
     if ($901) {
      $$0207$i$i = 0;
     } else {
      $902 = ($881>>>0)>(16777215);
      if ($902) {
       $$0207$i$i = 31;
      } else {
       $903 = (($900) + 1048320)|0;
       $904 = $903 >>> 16;
       $905 = $904 & 8;
       $906 = $900 << $905;
       $907 = (($906) + 520192)|0;
       $908 = $907 >>> 16;
       $909 = $908 & 4;
       $910 = $909 | $905;
       $911 = $906 << $909;
       $912 = (($911) + 245760)|0;
       $913 = $912 >>> 16;
       $914 = $913 & 2;
       $915 = $910 | $914;
       $916 = (14 - ($915))|0;
       $917 = $911 << $914;
       $918 = $917 >>> 15;
       $919 = (($916) + ($918))|0;
       $920 = $919 << 1;
       $921 = (($919) + 7)|0;
       $922 = $881 >>> $921;
       $923 = $922 & 1;
       $924 = $923 | $920;
       $$0207$i$i = $924;
      }
     }
     $925 = (8760 + ($$0207$i$i<<2)|0);
     $926 = ((($586)) + 28|0);
     HEAP32[$926>>2] = $$0207$i$i;
     $927 = ((($586)) + 20|0);
     HEAP32[$927>>2] = 0;
     HEAP32[$853>>2] = 0;
     $928 = HEAP32[(8460)>>2]|0;
     $929 = 1 << $$0207$i$i;
     $930 = $928 & $929;
     $931 = ($930|0)==(0);
     if ($931) {
      $932 = $928 | $929;
      HEAP32[(8460)>>2] = $932;
      HEAP32[$925>>2] = $586;
      $933 = ((($586)) + 24|0);
      HEAP32[$933>>2] = $925;
      $934 = ((($586)) + 12|0);
      HEAP32[$934>>2] = $586;
      $935 = ((($586)) + 8|0);
      HEAP32[$935>>2] = $586;
      break;
     }
     $936 = HEAP32[$925>>2]|0;
     $937 = ($$0207$i$i|0)==(31);
     $938 = $$0207$i$i >>> 1;
     $939 = (25 - ($938))|0;
     $940 = $937 ? 0 : $939;
     $941 = $881 << $940;
     $$0201$i$i = $941;$$0202$i$i = $936;
     while(1) {
      $942 = ((($$0202$i$i)) + 4|0);
      $943 = HEAP32[$942>>2]|0;
      $944 = $943 & -8;
      $945 = ($944|0)==($881|0);
      if ($945) {
       label = 213;
       break;
      }
      $946 = $$0201$i$i >>> 31;
      $947 = (((($$0202$i$i)) + 16|0) + ($946<<2)|0);
      $948 = $$0201$i$i << 1;
      $949 = HEAP32[$947>>2]|0;
      $950 = ($949|0)==(0|0);
      if ($950) {
       label = 212;
       break;
      } else {
       $$0201$i$i = $948;$$0202$i$i = $949;
      }
     }
     if ((label|0) == 212) {
      HEAP32[$947>>2] = $586;
      $951 = ((($586)) + 24|0);
      HEAP32[$951>>2] = $$0202$i$i;
      $952 = ((($586)) + 12|0);
      HEAP32[$952>>2] = $586;
      $953 = ((($586)) + 8|0);
      HEAP32[$953>>2] = $586;
      break;
     }
     else if ((label|0) == 213) {
      $954 = ((($$0202$i$i)) + 8|0);
      $955 = HEAP32[$954>>2]|0;
      $956 = ((($955)) + 12|0);
      HEAP32[$956>>2] = $586;
      HEAP32[$954>>2] = $586;
      $957 = ((($586)) + 8|0);
      HEAP32[$957>>2] = $955;
      $958 = ((($586)) + 12|0);
      HEAP32[$958>>2] = $$0202$i$i;
      $959 = ((($586)) + 24|0);
      HEAP32[$959>>2] = 0;
      break;
     }
    }
   }
  } while(0);
  $961 = HEAP32[(8468)>>2]|0;
  $962 = ($961>>>0)>($$0192>>>0);
  if ($962) {
   $963 = (($961) - ($$0192))|0;
   HEAP32[(8468)>>2] = $963;
   $964 = HEAP32[(8480)>>2]|0;
   $965 = (($964) + ($$0192)|0);
   HEAP32[(8480)>>2] = $965;
   $966 = $963 | 1;
   $967 = ((($965)) + 4|0);
   HEAP32[$967>>2] = $966;
   $968 = $$0192 | 3;
   $969 = ((($964)) + 4|0);
   HEAP32[$969>>2] = $968;
   $970 = ((($964)) + 8|0);
   $$0 = $970;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $971 = (___errno_location()|0);
 HEAP32[$971>>2] = 12;
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _free($0) {
 $0 = $0|0;
 var $$0195$i = 0, $$0195$in$i = 0, $$0348 = 0, $$0349 = 0, $$0361 = 0, $$0368 = 0, $$1 = 0, $$1347 = 0, $$1352 = 0, $$1355 = 0, $$1363 = 0, $$1367 = 0, $$2 = 0, $$3 = 0, $$3365 = 0, $$pre = 0, $$pre$phiZ2D = 0, $$sink3 = 0, $$sink5 = 0, $1 = 0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $cond373 = 0;
 var $cond374 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 $2 = ((($0)) + -8|0);
 $3 = HEAP32[(8472)>>2]|0;
 $4 = ((($0)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & -8;
 $7 = (($2) + ($6)|0);
 $8 = $5 & 1;
 $9 = ($8|0)==(0);
 do {
  if ($9) {
   $10 = HEAP32[$2>>2]|0;
   $11 = $5 & 3;
   $12 = ($11|0)==(0);
   if ($12) {
    return;
   }
   $13 = (0 - ($10))|0;
   $14 = (($2) + ($13)|0);
   $15 = (($10) + ($6))|0;
   $16 = ($14>>>0)<($3>>>0);
   if ($16) {
    return;
   }
   $17 = HEAP32[(8476)>>2]|0;
   $18 = ($17|0)==($14|0);
   if ($18) {
    $79 = ((($7)) + 4|0);
    $80 = HEAP32[$79>>2]|0;
    $81 = $80 & 3;
    $82 = ($81|0)==(3);
    if (!($82)) {
     $$1 = $14;$$1347 = $15;$87 = $14;
     break;
    }
    HEAP32[(8464)>>2] = $15;
    $83 = $80 & -2;
    HEAP32[$79>>2] = $83;
    $84 = $15 | 1;
    $85 = ((($14)) + 4|0);
    HEAP32[$85>>2] = $84;
    $86 = (($14) + ($15)|0);
    HEAP32[$86>>2] = $15;
    return;
   }
   $19 = $10 >>> 3;
   $20 = ($10>>>0)<(256);
   if ($20) {
    $21 = ((($14)) + 8|0);
    $22 = HEAP32[$21>>2]|0;
    $23 = ((($14)) + 12|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = ($24|0)==($22|0);
    if ($25) {
     $26 = 1 << $19;
     $27 = $26 ^ -1;
     $28 = HEAP32[2114]|0;
     $29 = $28 & $27;
     HEAP32[2114] = $29;
     $$1 = $14;$$1347 = $15;$87 = $14;
     break;
    } else {
     $30 = ((($22)) + 12|0);
     HEAP32[$30>>2] = $24;
     $31 = ((($24)) + 8|0);
     HEAP32[$31>>2] = $22;
     $$1 = $14;$$1347 = $15;$87 = $14;
     break;
    }
   }
   $32 = ((($14)) + 24|0);
   $33 = HEAP32[$32>>2]|0;
   $34 = ((($14)) + 12|0);
   $35 = HEAP32[$34>>2]|0;
   $36 = ($35|0)==($14|0);
   do {
    if ($36) {
     $41 = ((($14)) + 16|0);
     $42 = ((($41)) + 4|0);
     $43 = HEAP32[$42>>2]|0;
     $44 = ($43|0)==(0|0);
     if ($44) {
      $45 = HEAP32[$41>>2]|0;
      $46 = ($45|0)==(0|0);
      if ($46) {
       $$3 = 0;
       break;
      } else {
       $$1352 = $45;$$1355 = $41;
      }
     } else {
      $$1352 = $43;$$1355 = $42;
     }
     while(1) {
      $47 = ((($$1352)) + 20|0);
      $48 = HEAP32[$47>>2]|0;
      $49 = ($48|0)==(0|0);
      if (!($49)) {
       $$1352 = $48;$$1355 = $47;
       continue;
      }
      $50 = ((($$1352)) + 16|0);
      $51 = HEAP32[$50>>2]|0;
      $52 = ($51|0)==(0|0);
      if ($52) {
       break;
      } else {
       $$1352 = $51;$$1355 = $50;
      }
     }
     HEAP32[$$1355>>2] = 0;
     $$3 = $$1352;
    } else {
     $37 = ((($14)) + 8|0);
     $38 = HEAP32[$37>>2]|0;
     $39 = ((($38)) + 12|0);
     HEAP32[$39>>2] = $35;
     $40 = ((($35)) + 8|0);
     HEAP32[$40>>2] = $38;
     $$3 = $35;
    }
   } while(0);
   $53 = ($33|0)==(0|0);
   if ($53) {
    $$1 = $14;$$1347 = $15;$87 = $14;
   } else {
    $54 = ((($14)) + 28|0);
    $55 = HEAP32[$54>>2]|0;
    $56 = (8760 + ($55<<2)|0);
    $57 = HEAP32[$56>>2]|0;
    $58 = ($57|0)==($14|0);
    if ($58) {
     HEAP32[$56>>2] = $$3;
     $cond373 = ($$3|0)==(0|0);
     if ($cond373) {
      $59 = 1 << $55;
      $60 = $59 ^ -1;
      $61 = HEAP32[(8460)>>2]|0;
      $62 = $61 & $60;
      HEAP32[(8460)>>2] = $62;
      $$1 = $14;$$1347 = $15;$87 = $14;
      break;
     }
    } else {
     $63 = ((($33)) + 16|0);
     $64 = HEAP32[$63>>2]|0;
     $65 = ($64|0)!=($14|0);
     $$sink3 = $65&1;
     $66 = (((($33)) + 16|0) + ($$sink3<<2)|0);
     HEAP32[$66>>2] = $$3;
     $67 = ($$3|0)==(0|0);
     if ($67) {
      $$1 = $14;$$1347 = $15;$87 = $14;
      break;
     }
    }
    $68 = ((($$3)) + 24|0);
    HEAP32[$68>>2] = $33;
    $69 = ((($14)) + 16|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($70|0)==(0|0);
    if (!($71)) {
     $72 = ((($$3)) + 16|0);
     HEAP32[$72>>2] = $70;
     $73 = ((($70)) + 24|0);
     HEAP32[$73>>2] = $$3;
    }
    $74 = ((($69)) + 4|0);
    $75 = HEAP32[$74>>2]|0;
    $76 = ($75|0)==(0|0);
    if ($76) {
     $$1 = $14;$$1347 = $15;$87 = $14;
    } else {
     $77 = ((($$3)) + 20|0);
     HEAP32[$77>>2] = $75;
     $78 = ((($75)) + 24|0);
     HEAP32[$78>>2] = $$3;
     $$1 = $14;$$1347 = $15;$87 = $14;
    }
   }
  } else {
   $$1 = $2;$$1347 = $6;$87 = $2;
  }
 } while(0);
 $88 = ($87>>>0)<($7>>>0);
 if (!($88)) {
  return;
 }
 $89 = ((($7)) + 4|0);
 $90 = HEAP32[$89>>2]|0;
 $91 = $90 & 1;
 $92 = ($91|0)==(0);
 if ($92) {
  return;
 }
 $93 = $90 & 2;
 $94 = ($93|0)==(0);
 if ($94) {
  $95 = HEAP32[(8480)>>2]|0;
  $96 = ($95|0)==($7|0);
  if ($96) {
   $97 = HEAP32[(8468)>>2]|0;
   $98 = (($97) + ($$1347))|0;
   HEAP32[(8468)>>2] = $98;
   HEAP32[(8480)>>2] = $$1;
   $99 = $98 | 1;
   $100 = ((($$1)) + 4|0);
   HEAP32[$100>>2] = $99;
   $101 = HEAP32[(8476)>>2]|0;
   $102 = ($$1|0)==($101|0);
   if (!($102)) {
    return;
   }
   HEAP32[(8476)>>2] = 0;
   HEAP32[(8464)>>2] = 0;
   return;
  }
  $103 = HEAP32[(8476)>>2]|0;
  $104 = ($103|0)==($7|0);
  if ($104) {
   $105 = HEAP32[(8464)>>2]|0;
   $106 = (($105) + ($$1347))|0;
   HEAP32[(8464)>>2] = $106;
   HEAP32[(8476)>>2] = $87;
   $107 = $106 | 1;
   $108 = ((($$1)) + 4|0);
   HEAP32[$108>>2] = $107;
   $109 = (($87) + ($106)|0);
   HEAP32[$109>>2] = $106;
   return;
  }
  $110 = $90 & -8;
  $111 = (($110) + ($$1347))|0;
  $112 = $90 >>> 3;
  $113 = ($90>>>0)<(256);
  do {
   if ($113) {
    $114 = ((($7)) + 8|0);
    $115 = HEAP32[$114>>2]|0;
    $116 = ((($7)) + 12|0);
    $117 = HEAP32[$116>>2]|0;
    $118 = ($117|0)==($115|0);
    if ($118) {
     $119 = 1 << $112;
     $120 = $119 ^ -1;
     $121 = HEAP32[2114]|0;
     $122 = $121 & $120;
     HEAP32[2114] = $122;
     break;
    } else {
     $123 = ((($115)) + 12|0);
     HEAP32[$123>>2] = $117;
     $124 = ((($117)) + 8|0);
     HEAP32[$124>>2] = $115;
     break;
    }
   } else {
    $125 = ((($7)) + 24|0);
    $126 = HEAP32[$125>>2]|0;
    $127 = ((($7)) + 12|0);
    $128 = HEAP32[$127>>2]|0;
    $129 = ($128|0)==($7|0);
    do {
     if ($129) {
      $134 = ((($7)) + 16|0);
      $135 = ((($134)) + 4|0);
      $136 = HEAP32[$135>>2]|0;
      $137 = ($136|0)==(0|0);
      if ($137) {
       $138 = HEAP32[$134>>2]|0;
       $139 = ($138|0)==(0|0);
       if ($139) {
        $$3365 = 0;
        break;
       } else {
        $$1363 = $138;$$1367 = $134;
       }
      } else {
       $$1363 = $136;$$1367 = $135;
      }
      while(1) {
       $140 = ((($$1363)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if (!($142)) {
        $$1363 = $141;$$1367 = $140;
        continue;
       }
       $143 = ((($$1363)) + 16|0);
       $144 = HEAP32[$143>>2]|0;
       $145 = ($144|0)==(0|0);
       if ($145) {
        break;
       } else {
        $$1363 = $144;$$1367 = $143;
       }
      }
      HEAP32[$$1367>>2] = 0;
      $$3365 = $$1363;
     } else {
      $130 = ((($7)) + 8|0);
      $131 = HEAP32[$130>>2]|0;
      $132 = ((($131)) + 12|0);
      HEAP32[$132>>2] = $128;
      $133 = ((($128)) + 8|0);
      HEAP32[$133>>2] = $131;
      $$3365 = $128;
     }
    } while(0);
    $146 = ($126|0)==(0|0);
    if (!($146)) {
     $147 = ((($7)) + 28|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = (8760 + ($148<<2)|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)==($7|0);
     if ($151) {
      HEAP32[$149>>2] = $$3365;
      $cond374 = ($$3365|0)==(0|0);
      if ($cond374) {
       $152 = 1 << $148;
       $153 = $152 ^ -1;
       $154 = HEAP32[(8460)>>2]|0;
       $155 = $154 & $153;
       HEAP32[(8460)>>2] = $155;
       break;
      }
     } else {
      $156 = ((($126)) + 16|0);
      $157 = HEAP32[$156>>2]|0;
      $158 = ($157|0)!=($7|0);
      $$sink5 = $158&1;
      $159 = (((($126)) + 16|0) + ($$sink5<<2)|0);
      HEAP32[$159>>2] = $$3365;
      $160 = ($$3365|0)==(0|0);
      if ($160) {
       break;
      }
     }
     $161 = ((($$3365)) + 24|0);
     HEAP32[$161>>2] = $126;
     $162 = ((($7)) + 16|0);
     $163 = HEAP32[$162>>2]|0;
     $164 = ($163|0)==(0|0);
     if (!($164)) {
      $165 = ((($$3365)) + 16|0);
      HEAP32[$165>>2] = $163;
      $166 = ((($163)) + 24|0);
      HEAP32[$166>>2] = $$3365;
     }
     $167 = ((($162)) + 4|0);
     $168 = HEAP32[$167>>2]|0;
     $169 = ($168|0)==(0|0);
     if (!($169)) {
      $170 = ((($$3365)) + 20|0);
      HEAP32[$170>>2] = $168;
      $171 = ((($168)) + 24|0);
      HEAP32[$171>>2] = $$3365;
     }
    }
   }
  } while(0);
  $172 = $111 | 1;
  $173 = ((($$1)) + 4|0);
  HEAP32[$173>>2] = $172;
  $174 = (($87) + ($111)|0);
  HEAP32[$174>>2] = $111;
  $175 = HEAP32[(8476)>>2]|0;
  $176 = ($$1|0)==($175|0);
  if ($176) {
   HEAP32[(8464)>>2] = $111;
   return;
  } else {
   $$2 = $111;
  }
 } else {
  $177 = $90 & -2;
  HEAP32[$89>>2] = $177;
  $178 = $$1347 | 1;
  $179 = ((($$1)) + 4|0);
  HEAP32[$179>>2] = $178;
  $180 = (($87) + ($$1347)|0);
  HEAP32[$180>>2] = $$1347;
  $$2 = $$1347;
 }
 $181 = $$2 >>> 3;
 $182 = ($$2>>>0)<(256);
 if ($182) {
  $183 = $181 << 1;
  $184 = (8496 + ($183<<2)|0);
  $185 = HEAP32[2114]|0;
  $186 = 1 << $181;
  $187 = $185 & $186;
  $188 = ($187|0)==(0);
  if ($188) {
   $189 = $185 | $186;
   HEAP32[2114] = $189;
   $$pre = ((($184)) + 8|0);
   $$0368 = $184;$$pre$phiZ2D = $$pre;
  } else {
   $190 = ((($184)) + 8|0);
   $191 = HEAP32[$190>>2]|0;
   $$0368 = $191;$$pre$phiZ2D = $190;
  }
  HEAP32[$$pre$phiZ2D>>2] = $$1;
  $192 = ((($$0368)) + 12|0);
  HEAP32[$192>>2] = $$1;
  $193 = ((($$1)) + 8|0);
  HEAP32[$193>>2] = $$0368;
  $194 = ((($$1)) + 12|0);
  HEAP32[$194>>2] = $184;
  return;
 }
 $195 = $$2 >>> 8;
 $196 = ($195|0)==(0);
 if ($196) {
  $$0361 = 0;
 } else {
  $197 = ($$2>>>0)>(16777215);
  if ($197) {
   $$0361 = 31;
  } else {
   $198 = (($195) + 1048320)|0;
   $199 = $198 >>> 16;
   $200 = $199 & 8;
   $201 = $195 << $200;
   $202 = (($201) + 520192)|0;
   $203 = $202 >>> 16;
   $204 = $203 & 4;
   $205 = $204 | $200;
   $206 = $201 << $204;
   $207 = (($206) + 245760)|0;
   $208 = $207 >>> 16;
   $209 = $208 & 2;
   $210 = $205 | $209;
   $211 = (14 - ($210))|0;
   $212 = $206 << $209;
   $213 = $212 >>> 15;
   $214 = (($211) + ($213))|0;
   $215 = $214 << 1;
   $216 = (($214) + 7)|0;
   $217 = $$2 >>> $216;
   $218 = $217 & 1;
   $219 = $218 | $215;
   $$0361 = $219;
  }
 }
 $220 = (8760 + ($$0361<<2)|0);
 $221 = ((($$1)) + 28|0);
 HEAP32[$221>>2] = $$0361;
 $222 = ((($$1)) + 16|0);
 $223 = ((($$1)) + 20|0);
 HEAP32[$223>>2] = 0;
 HEAP32[$222>>2] = 0;
 $224 = HEAP32[(8460)>>2]|0;
 $225 = 1 << $$0361;
 $226 = $224 & $225;
 $227 = ($226|0)==(0);
 do {
  if ($227) {
   $228 = $224 | $225;
   HEAP32[(8460)>>2] = $228;
   HEAP32[$220>>2] = $$1;
   $229 = ((($$1)) + 24|0);
   HEAP32[$229>>2] = $220;
   $230 = ((($$1)) + 12|0);
   HEAP32[$230>>2] = $$1;
   $231 = ((($$1)) + 8|0);
   HEAP32[$231>>2] = $$1;
  } else {
   $232 = HEAP32[$220>>2]|0;
   $233 = ($$0361|0)==(31);
   $234 = $$0361 >>> 1;
   $235 = (25 - ($234))|0;
   $236 = $233 ? 0 : $235;
   $237 = $$2 << $236;
   $$0348 = $237;$$0349 = $232;
   while(1) {
    $238 = ((($$0349)) + 4|0);
    $239 = HEAP32[$238>>2]|0;
    $240 = $239 & -8;
    $241 = ($240|0)==($$2|0);
    if ($241) {
     label = 73;
     break;
    }
    $242 = $$0348 >>> 31;
    $243 = (((($$0349)) + 16|0) + ($242<<2)|0);
    $244 = $$0348 << 1;
    $245 = HEAP32[$243>>2]|0;
    $246 = ($245|0)==(0|0);
    if ($246) {
     label = 72;
     break;
    } else {
     $$0348 = $244;$$0349 = $245;
    }
   }
   if ((label|0) == 72) {
    HEAP32[$243>>2] = $$1;
    $247 = ((($$1)) + 24|0);
    HEAP32[$247>>2] = $$0349;
    $248 = ((($$1)) + 12|0);
    HEAP32[$248>>2] = $$1;
    $249 = ((($$1)) + 8|0);
    HEAP32[$249>>2] = $$1;
    break;
   }
   else if ((label|0) == 73) {
    $250 = ((($$0349)) + 8|0);
    $251 = HEAP32[$250>>2]|0;
    $252 = ((($251)) + 12|0);
    HEAP32[$252>>2] = $$1;
    HEAP32[$250>>2] = $$1;
    $253 = ((($$1)) + 8|0);
    HEAP32[$253>>2] = $251;
    $254 = ((($$1)) + 12|0);
    HEAP32[$254>>2] = $$0349;
    $255 = ((($$1)) + 24|0);
    HEAP32[$255>>2] = 0;
    break;
   }
  }
 } while(0);
 $256 = HEAP32[(8488)>>2]|0;
 $257 = (($256) + -1)|0;
 HEAP32[(8488)>>2] = $257;
 $258 = ($257|0)==(0);
 if ($258) {
  $$0195$in$i = (8912);
 } else {
  return;
 }
 while(1) {
  $$0195$i = HEAP32[$$0195$in$i>>2]|0;
  $259 = ($$0195$i|0)==(0|0);
  $260 = ((($$0195$i)) + 8|0);
  if ($259) {
   break;
  } else {
   $$0195$in$i = $260;
  }
 }
 HEAP32[(8488)>>2] = -1;
 return;
}
function ___stdio_close($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 $1 = ((($0)) + 60|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = (_dummy_58($2)|0);
 HEAP32[$vararg_buffer>>2] = $3;
 $4 = (___syscall6(6,($vararg_buffer|0))|0);
 $5 = (___syscall_ret($4)|0);
 STACKTOP = sp;return ($5|0);
}
function ___stdout_write($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $vararg_buffer = sp;
 $3 = sp + 16|0;
 $4 = ((($0)) + 36|0);
 HEAP32[$4>>2] = 4;
 $5 = HEAP32[$0>>2]|0;
 $6 = $5 & 64;
 $7 = ($6|0)==(0);
 if ($7) {
  $8 = ((($0)) + 60|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = $3;
  HEAP32[$vararg_buffer>>2] = $9;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21523;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $10;
  $11 = (___syscall54(54,($vararg_buffer|0))|0);
  $12 = ($11|0)==(0);
  if (!($12)) {
   $13 = ((($0)) + 75|0);
   HEAP8[$13>>0] = -1;
  }
 }
 $14 = (___stdio_write($0,$1,$2)|0);
 STACKTOP = sp;return ($14|0);
}
function ___stdio_seek($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$pre = 0, $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $vararg_buffer = sp;
 $3 = sp + 20|0;
 $4 = ((($0)) + 60|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $3;
 HEAP32[$vararg_buffer>>2] = $5;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $1;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $6;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $2;
 $7 = (___syscall140(140,($vararg_buffer|0))|0);
 $8 = (___syscall_ret($7)|0);
 $9 = ($8|0)<(0);
 if ($9) {
  HEAP32[$3>>2] = -1;
  $10 = -1;
 } else {
  $$pre = HEAP32[$3>>2]|0;
  $10 = $$pre;
 }
 STACKTOP = sp;return ($10|0);
}
function ___syscall_ret($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0>>>0)>(4294963200);
 if ($1) {
  $2 = (0 - ($0))|0;
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = $2;
  $$0 = -1;
 } else {
  $$0 = $0;
 }
 return ($$0|0);
}
function ___errno_location() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (9016|0);
}
function ___stdio_write($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $$04756 = 0, $$04855 = 0, $$04954 = 0, $$051 = 0, $$1 = 0, $$150 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0;
 var $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $3 = sp + 32|0;
 $4 = ((($0)) + 28|0);
 $5 = HEAP32[$4>>2]|0;
 HEAP32[$3>>2] = $5;
 $6 = ((($3)) + 4|0);
 $7 = ((($0)) + 20|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (($8) - ($5))|0;
 HEAP32[$6>>2] = $9;
 $10 = ((($3)) + 8|0);
 HEAP32[$10>>2] = $1;
 $11 = ((($3)) + 12|0);
 HEAP32[$11>>2] = $2;
 $12 = (($9) + ($2))|0;
 $13 = ((($0)) + 60|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $3;
 HEAP32[$vararg_buffer>>2] = $14;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $15;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = 2;
 $16 = (___syscall146(146,($vararg_buffer|0))|0);
 $17 = (___syscall_ret($16)|0);
 $18 = ($12|0)==($17|0);
 L1: do {
  if ($18) {
   label = 3;
  } else {
   $$04756 = 2;$$04855 = $12;$$04954 = $3;$26 = $17;
   while(1) {
    $27 = ($26|0)<(0);
    if ($27) {
     break;
    }
    $35 = (($$04855) - ($26))|0;
    $36 = ((($$04954)) + 4|0);
    $37 = HEAP32[$36>>2]|0;
    $38 = ($26>>>0)>($37>>>0);
    $39 = ((($$04954)) + 8|0);
    $$150 = $38 ? $39 : $$04954;
    $40 = $38 << 31 >> 31;
    $$1 = (($$04756) + ($40))|0;
    $41 = $38 ? $37 : 0;
    $$0 = (($26) - ($41))|0;
    $42 = HEAP32[$$150>>2]|0;
    $43 = (($42) + ($$0)|0);
    HEAP32[$$150>>2] = $43;
    $44 = ((($$150)) + 4|0);
    $45 = HEAP32[$44>>2]|0;
    $46 = (($45) - ($$0))|0;
    HEAP32[$44>>2] = $46;
    $47 = HEAP32[$13>>2]|0;
    $48 = $$150;
    HEAP32[$vararg_buffer3>>2] = $47;
    $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
    HEAP32[$vararg_ptr6>>2] = $48;
    $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
    HEAP32[$vararg_ptr7>>2] = $$1;
    $49 = (___syscall146(146,($vararg_buffer3|0))|0);
    $50 = (___syscall_ret($49)|0);
    $51 = ($35|0)==($50|0);
    if ($51) {
     label = 3;
     break L1;
    } else {
     $$04756 = $$1;$$04855 = $35;$$04954 = $$150;$26 = $50;
    }
   }
   $28 = ((($0)) + 16|0);
   HEAP32[$28>>2] = 0;
   HEAP32[$4>>2] = 0;
   HEAP32[$7>>2] = 0;
   $29 = HEAP32[$0>>2]|0;
   $30 = $29 | 32;
   HEAP32[$0>>2] = $30;
   $31 = ($$04756|0)==(2);
   if ($31) {
    $$051 = 0;
   } else {
    $32 = ((($$04954)) + 4|0);
    $33 = HEAP32[$32>>2]|0;
    $34 = (($2) - ($33))|0;
    $$051 = $34;
   }
  }
 } while(0);
 if ((label|0) == 3) {
  $19 = ((($0)) + 44|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = ((($0)) + 48|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = (($20) + ($22)|0);
  $24 = ((($0)) + 16|0);
  HEAP32[$24>>2] = $23;
  $25 = $20;
  HEAP32[$4>>2] = $25;
  HEAP32[$7>>2] = $25;
  $$051 = $2;
 }
 STACKTOP = sp;return ($$051|0);
}
function _dummy_58($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return ($0|0);
}
function _isdigit($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = (($0) + -48)|0;
 $2 = ($1>>>0)<(10);
 $3 = $2&1;
 return ($3|0);
}
function _strcmp($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$011 = 0, $$0710 = 0, $$lcssa = 0, $$lcssa8 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $2 = HEAP8[$0>>0]|0;
 $3 = HEAP8[$1>>0]|0;
 $4 = ($2<<24>>24)!=($3<<24>>24);
 $5 = ($2<<24>>24)==(0);
 $or$cond9 = $5 | $4;
 if ($or$cond9) {
  $$lcssa = $3;$$lcssa8 = $2;
 } else {
  $$011 = $1;$$0710 = $0;
  while(1) {
   $6 = ((($$0710)) + 1|0);
   $7 = ((($$011)) + 1|0);
   $8 = HEAP8[$6>>0]|0;
   $9 = HEAP8[$7>>0]|0;
   $10 = ($8<<24>>24)!=($9<<24>>24);
   $11 = ($8<<24>>24)==(0);
   $or$cond = $11 | $10;
   if ($or$cond) {
    $$lcssa = $9;$$lcssa8 = $8;
    break;
   } else {
    $$011 = $7;$$0710 = $6;
   }
  }
 }
 $12 = $$lcssa8&255;
 $13 = $$lcssa&255;
 $14 = (($12) - ($13))|0;
 return ($14|0);
}
function _pthread_self() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (1124|0);
}
function ___lockfile($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _wcrtomb($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($0|0)==(0|0);
 do {
  if ($3) {
   $$0 = 1;
  } else {
   $4 = ($1>>>0)<(128);
   if ($4) {
    $5 = $1&255;
    HEAP8[$0>>0] = $5;
    $$0 = 1;
    break;
   }
   $6 = (___pthread_self_751()|0);
   $7 = ((($6)) + 188|0);
   $8 = HEAP32[$7>>2]|0;
   $9 = HEAP32[$8>>2]|0;
   $10 = ($9|0)==(0|0);
   if ($10) {
    $11 = $1 & -128;
    $12 = ($11|0)==(57216);
    if ($12) {
     $14 = $1&255;
     HEAP8[$0>>0] = $14;
     $$0 = 1;
     break;
    } else {
     $13 = (___errno_location()|0);
     HEAP32[$13>>2] = 84;
     $$0 = -1;
     break;
    }
   }
   $15 = ($1>>>0)<(2048);
   if ($15) {
    $16 = $1 >>> 6;
    $17 = $16 | 192;
    $18 = $17&255;
    $19 = ((($0)) + 1|0);
    HEAP8[$0>>0] = $18;
    $20 = $1 & 63;
    $21 = $20 | 128;
    $22 = $21&255;
    HEAP8[$19>>0] = $22;
    $$0 = 2;
    break;
   }
   $23 = ($1>>>0)<(55296);
   $24 = $1 & -8192;
   $25 = ($24|0)==(57344);
   $or$cond = $23 | $25;
   if ($or$cond) {
    $26 = $1 >>> 12;
    $27 = $26 | 224;
    $28 = $27&255;
    $29 = ((($0)) + 1|0);
    HEAP8[$0>>0] = $28;
    $30 = $1 >>> 6;
    $31 = $30 & 63;
    $32 = $31 | 128;
    $33 = $32&255;
    $34 = ((($0)) + 2|0);
    HEAP8[$29>>0] = $33;
    $35 = $1 & 63;
    $36 = $35 | 128;
    $37 = $36&255;
    HEAP8[$34>>0] = $37;
    $$0 = 3;
    break;
   }
   $38 = (($1) + -65536)|0;
   $39 = ($38>>>0)<(1048576);
   if ($39) {
    $40 = $1 >>> 18;
    $41 = $40 | 240;
    $42 = $41&255;
    $43 = ((($0)) + 1|0);
    HEAP8[$0>>0] = $42;
    $44 = $1 >>> 12;
    $45 = $44 & 63;
    $46 = $45 | 128;
    $47 = $46&255;
    $48 = ((($0)) + 2|0);
    HEAP8[$43>>0] = $47;
    $49 = $1 >>> 6;
    $50 = $49 & 63;
    $51 = $50 | 128;
    $52 = $51&255;
    $53 = ((($0)) + 3|0);
    HEAP8[$48>>0] = $52;
    $54 = $1 & 63;
    $55 = $54 | 128;
    $56 = $55&255;
    HEAP8[$53>>0] = $56;
    $$0 = 4;
    break;
   } else {
    $57 = (___errno_location()|0);
    HEAP32[$57>>2] = 84;
    $$0 = -1;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function ___unlockfile($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___pthread_self_751() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_pthread_self()|0);
 return ($0|0);
}
function ___ofl_lock() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((9020|0));
 return (9028|0);
}
function ___ofl_unlock() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___unlock((9020|0));
 return;
}
function _strlen($0) {
 $0 = $0|0;
 var $$0 = 0, $$015$lcssa = 0, $$01519 = 0, $$1$lcssa = 0, $$pn = 0, $$pre = 0, $$sink = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = $0;
 $2 = $1 & 3;
 $3 = ($2|0)==(0);
 L1: do {
  if ($3) {
   $$015$lcssa = $0;
   label = 4;
  } else {
   $$01519 = $0;$23 = $1;
   while(1) {
    $4 = HEAP8[$$01519>>0]|0;
    $5 = ($4<<24>>24)==(0);
    if ($5) {
     $$sink = $23;
     break L1;
    }
    $6 = ((($$01519)) + 1|0);
    $7 = $6;
    $8 = $7 & 3;
    $9 = ($8|0)==(0);
    if ($9) {
     $$015$lcssa = $6;
     label = 4;
     break;
    } else {
     $$01519 = $6;$23 = $7;
    }
   }
  }
 } while(0);
 if ((label|0) == 4) {
  $$0 = $$015$lcssa;
  while(1) {
   $10 = HEAP32[$$0>>2]|0;
   $11 = (($10) + -16843009)|0;
   $12 = $10 & -2139062144;
   $13 = $12 ^ -2139062144;
   $14 = $13 & $11;
   $15 = ($14|0)==(0);
   $16 = ((($$0)) + 4|0);
   if ($15) {
    $$0 = $16;
   } else {
    break;
   }
  }
  $17 = $10&255;
  $18 = ($17<<24>>24)==(0);
  if ($18) {
   $$1$lcssa = $$0;
  } else {
   $$pn = $$0;
   while(1) {
    $19 = ((($$pn)) + 1|0);
    $$pre = HEAP8[$19>>0]|0;
    $20 = ($$pre<<24>>24)==(0);
    if ($20) {
     $$1$lcssa = $19;
     break;
    } else {
     $$pn = $19;
    }
   }
  }
  $21 = $$1$lcssa;
  $$sink = $21;
 }
 $22 = (($$sink) - ($1))|0;
 return ($22|0);
}
function ___overflow($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $$pre = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = sp;
 $3 = $1&255;
 HEAP8[$2>>0] = $3;
 $4 = ((($0)) + 16|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==(0|0);
 if ($6) {
  $7 = (___towrite($0)|0);
  $8 = ($7|0)==(0);
  if ($8) {
   $$pre = HEAP32[$4>>2]|0;
   $12 = $$pre;
   label = 4;
  } else {
   $$0 = -1;
  }
 } else {
  $12 = $5;
  label = 4;
 }
 do {
  if ((label|0) == 4) {
   $9 = ((($0)) + 20|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = ($10>>>0)<($12>>>0);
   if ($11) {
    $13 = $1 & 255;
    $14 = ((($0)) + 75|0);
    $15 = HEAP8[$14>>0]|0;
    $16 = $15 << 24 >> 24;
    $17 = ($13|0)==($16|0);
    if (!($17)) {
     $18 = ((($10)) + 1|0);
     HEAP32[$9>>2] = $18;
     HEAP8[$10>>0] = $3;
     $$0 = $13;
     break;
    }
   }
   $19 = ((($0)) + 36|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = (FUNCTION_TABLE_iiii[$20 & 127]($0,$2,1)|0);
   $22 = ($21|0)==(1);
   if ($22) {
    $23 = HEAP8[$2>>0]|0;
    $24 = $23&255;
    $$0 = $24;
   } else {
    $$0 = -1;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function ___towrite($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ((($0)) + 74|0);
 $2 = HEAP8[$1>>0]|0;
 $3 = $2 << 24 >> 24;
 $4 = (($3) + 255)|0;
 $5 = $4 | $3;
 $6 = $5&255;
 HEAP8[$1>>0] = $6;
 $7 = HEAP32[$0>>2]|0;
 $8 = $7 & 8;
 $9 = ($8|0)==(0);
 if ($9) {
  $11 = ((($0)) + 8|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($0)) + 4|0);
  HEAP32[$12>>2] = 0;
  $13 = ((($0)) + 44|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = ((($0)) + 28|0);
  HEAP32[$15>>2] = $14;
  $16 = ((($0)) + 20|0);
  HEAP32[$16>>2] = $14;
  $17 = $14;
  $18 = ((($0)) + 48|0);
  $19 = HEAP32[$18>>2]|0;
  $20 = (($17) + ($19)|0);
  $21 = ((($0)) + 16|0);
  HEAP32[$21>>2] = $20;
  $$0 = 0;
 } else {
  $10 = $7 | 32;
  HEAP32[$0>>2] = $10;
  $$0 = -1;
 }
 return ($$0|0);
}
function _vfprintf($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$ = 0, $$0 = 0, $$1 = 0, $$1$ = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(224|0);
 $3 = sp + 120|0;
 $4 = sp + 80|0;
 $5 = sp;
 $6 = sp + 136|0;
 dest=$4; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$2>>2]|0;
 HEAP32[$3>>2] = $vacopy_currentptr;
 $7 = (_printf_core(0,$1,$3,$5,$4)|0);
 $8 = ($7|0)<(0);
 if ($8) {
  $$0 = -1;
 } else {
  $9 = ((($0)) + 76|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ($10|0)>(-1);
  if ($11) {
   $12 = (___lockfile($0)|0);
   $39 = $12;
  } else {
   $39 = 0;
  }
  $13 = HEAP32[$0>>2]|0;
  $14 = $13 & 32;
  $15 = ((($0)) + 74|0);
  $16 = HEAP8[$15>>0]|0;
  $17 = ($16<<24>>24)<(1);
  if ($17) {
   $18 = $13 & -33;
   HEAP32[$0>>2] = $18;
  }
  $19 = ((($0)) + 48|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = ($20|0)==(0);
  if ($21) {
   $23 = ((($0)) + 44|0);
   $24 = HEAP32[$23>>2]|0;
   HEAP32[$23>>2] = $6;
   $25 = ((($0)) + 28|0);
   HEAP32[$25>>2] = $6;
   $26 = ((($0)) + 20|0);
   HEAP32[$26>>2] = $6;
   HEAP32[$19>>2] = 80;
   $27 = ((($6)) + 80|0);
   $28 = ((($0)) + 16|0);
   HEAP32[$28>>2] = $27;
   $29 = (_printf_core($0,$1,$3,$5,$4)|0);
   $30 = ($24|0)==(0|0);
   if ($30) {
    $$1 = $29;
   } else {
    $31 = ((($0)) + 36|0);
    $32 = HEAP32[$31>>2]|0;
    (FUNCTION_TABLE_iiii[$32 & 127]($0,0,0)|0);
    $33 = HEAP32[$26>>2]|0;
    $34 = ($33|0)==(0|0);
    $$ = $34 ? -1 : $29;
    HEAP32[$23>>2] = $24;
    HEAP32[$19>>2] = 0;
    HEAP32[$28>>2] = 0;
    HEAP32[$25>>2] = 0;
    HEAP32[$26>>2] = 0;
    $$1 = $$;
   }
  } else {
   $22 = (_printf_core($0,$1,$3,$5,$4)|0);
   $$1 = $22;
  }
  $35 = HEAP32[$0>>2]|0;
  $36 = $35 & 32;
  $37 = ($36|0)==(0);
  $$1$ = $37 ? $$1 : -1;
  $38 = $35 | $14;
  HEAP32[$0>>2] = $38;
  $40 = ($39|0)==(0);
  if (!($40)) {
   ___unlockfile($0);
  }
  $$0 = $$1$;
 }
 STACKTOP = sp;return ($$0|0);
}
function _printf_core($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$ = 0, $$$ = 0, $$$0259 = 0, $$$0262 = 0, $$$4266 = 0, $$$5 = 0, $$0 = 0, $$0228 = 0, $$0228$ = 0, $$0229316 = 0, $$0232 = 0, $$0235 = 0, $$0237 = 0, $$0240$lcssa = 0, $$0240$lcssa356 = 0, $$0240315 = 0, $$0243 = 0, $$0247 = 0, $$0249$lcssa = 0, $$0249303 = 0;
 var $$0252 = 0, $$0253 = 0, $$0254 = 0, $$0254$$0254$ = 0, $$0259 = 0, $$0262$lcssa = 0, $$0262309 = 0, $$0269 = 0, $$0269$phi = 0, $$1 = 0, $$1230327 = 0, $$1233 = 0, $$1236 = 0, $$1238 = 0, $$1241326 = 0, $$1244314 = 0, $$1248 = 0, $$1250 = 0, $$1255 = 0, $$1260 = 0;
 var $$1263 = 0, $$1263$ = 0, $$1270 = 0, $$2 = 0, $$2234 = 0, $$2239 = 0, $$2242$lcssa = 0, $$2242302 = 0, $$2245 = 0, $$2251 = 0, $$2256 = 0, $$2256$ = 0, $$2256$$$2256 = 0, $$2261 = 0, $$2271 = 0, $$279$ = 0, $$286 = 0, $$287 = 0, $$3257 = 0, $$3265 = 0;
 var $$3272 = 0, $$3300 = 0, $$4258354 = 0, $$4266 = 0, $$5 = 0, $$6268 = 0, $$lcssa291 = 0, $$lcssa292 = 0, $$pre = 0, $$pre342 = 0, $$pre344 = 0, $$pre345 = 0, $$pre345$pre = 0, $$pre346 = 0, $$pre348 = 0, $$sink = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0;
 var $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0;
 var $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0;
 var $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0;
 var $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0;
 var $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0;
 var $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0;
 var $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0;
 var $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0;
 var $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0;
 var $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0.0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0;
 var $arglist_next3 = 0, $brmerge = 0, $brmerge308 = 0, $expanded = 0, $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0, $expanded8 = 0, $or$cond = 0, $or$cond276 = 0, $or$cond278 = 0, $or$cond281 = 0, $storemerge274 = 0, $trunc = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $5 = sp + 16|0;
 $6 = sp;
 $7 = sp + 24|0;
 $8 = sp + 8|0;
 $9 = sp + 20|0;
 HEAP32[$5>>2] = $1;
 $10 = ($0|0)!=(0|0);
 $11 = ((($7)) + 40|0);
 $12 = $11;
 $13 = ((($7)) + 39|0);
 $14 = ((($8)) + 4|0);
 $$0243 = 0;$$0247 = 0;$$0269 = 0;
 L1: while(1) {
  $15 = ($$0247|0)>(-1);
  do {
   if ($15) {
    $16 = (2147483647 - ($$0247))|0;
    $17 = ($$0243|0)>($16|0);
    if ($17) {
     $18 = (___errno_location()|0);
     HEAP32[$18>>2] = 75;
     $$1248 = -1;
     break;
    } else {
     $19 = (($$0243) + ($$0247))|0;
     $$1248 = $19;
     break;
    }
   } else {
    $$1248 = $$0247;
   }
  } while(0);
  $20 = HEAP32[$5>>2]|0;
  $21 = HEAP8[$20>>0]|0;
  $22 = ($21<<24>>24)==(0);
  if ($22) {
   label = 88;
   break;
  } else {
   $23 = $21;$25 = $20;
  }
  L9: while(1) {
   switch ($23<<24>>24) {
   case 37:  {
    $$0249303 = $25;$27 = $25;
    label = 9;
    break L9;
    break;
   }
   case 0:  {
    $$0249$lcssa = $25;
    break L9;
    break;
   }
   default: {
   }
   }
   $24 = ((($25)) + 1|0);
   HEAP32[$5>>2] = $24;
   $$pre = HEAP8[$24>>0]|0;
   $23 = $$pre;$25 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $26 = ((($27)) + 1|0);
     $28 = HEAP8[$26>>0]|0;
     $29 = ($28<<24>>24)==(37);
     if (!($29)) {
      $$0249$lcssa = $$0249303;
      break L12;
     }
     $30 = ((($$0249303)) + 1|0);
     $31 = ((($27)) + 2|0);
     HEAP32[$5>>2] = $31;
     $32 = HEAP8[$31>>0]|0;
     $33 = ($32<<24>>24)==(37);
     if ($33) {
      $$0249303 = $30;$27 = $31;
      label = 9;
     } else {
      $$0249$lcssa = $30;
      break;
     }
    }
   }
  } while(0);
  $34 = $$0249$lcssa;
  $35 = $20;
  $36 = (($34) - ($35))|0;
  if ($10) {
   _out_127($0,$20,$36);
  }
  $37 = ($36|0)==(0);
  if (!($37)) {
   $$0269$phi = $$0269;$$0243 = $36;$$0247 = $$1248;$$0269 = $$0269$phi;
   continue;
  }
  $38 = HEAP32[$5>>2]|0;
  $39 = ((($38)) + 1|0);
  $40 = HEAP8[$39>>0]|0;
  $41 = $40 << 24 >> 24;
  $42 = (_isdigit($41)|0);
  $43 = ($42|0)==(0);
  $$pre342 = HEAP32[$5>>2]|0;
  if ($43) {
   $$0253 = -1;$$1270 = $$0269;$$sink = 1;
  } else {
   $44 = ((($$pre342)) + 2|0);
   $45 = HEAP8[$44>>0]|0;
   $46 = ($45<<24>>24)==(36);
   if ($46) {
    $47 = ((($$pre342)) + 1|0);
    $48 = HEAP8[$47>>0]|0;
    $49 = $48 << 24 >> 24;
    $50 = (($49) + -48)|0;
    $$0253 = $50;$$1270 = 1;$$sink = 3;
   } else {
    $$0253 = -1;$$1270 = $$0269;$$sink = 1;
   }
  }
  $51 = (($$pre342) + ($$sink)|0);
  HEAP32[$5>>2] = $51;
  $52 = HEAP8[$51>>0]|0;
  $53 = $52 << 24 >> 24;
  $54 = (($53) + -32)|0;
  $55 = ($54>>>0)>(31);
  $56 = 1 << $54;
  $57 = $56 & 75913;
  $58 = ($57|0)==(0);
  $brmerge308 = $55 | $58;
  if ($brmerge308) {
   $$0262$lcssa = 0;$$lcssa291 = $52;$$lcssa292 = $51;
  } else {
   $$0262309 = 0;$60 = $52;$65 = $51;
   while(1) {
    $59 = $60 << 24 >> 24;
    $61 = (($59) + -32)|0;
    $62 = 1 << $61;
    $63 = $62 | $$0262309;
    $64 = ((($65)) + 1|0);
    HEAP32[$5>>2] = $64;
    $66 = HEAP8[$64>>0]|0;
    $67 = $66 << 24 >> 24;
    $68 = (($67) + -32)|0;
    $69 = ($68>>>0)>(31);
    $70 = 1 << $68;
    $71 = $70 & 75913;
    $72 = ($71|0)==(0);
    $brmerge = $69 | $72;
    if ($brmerge) {
     $$0262$lcssa = $63;$$lcssa291 = $66;$$lcssa292 = $64;
     break;
    } else {
     $$0262309 = $63;$60 = $66;$65 = $64;
    }
   }
  }
  $73 = ($$lcssa291<<24>>24)==(42);
  if ($73) {
   $74 = ((($$lcssa292)) + 1|0);
   $75 = HEAP8[$74>>0]|0;
   $76 = $75 << 24 >> 24;
   $77 = (_isdigit($76)|0);
   $78 = ($77|0)==(0);
   if ($78) {
    label = 23;
   } else {
    $79 = HEAP32[$5>>2]|0;
    $80 = ((($79)) + 2|0);
    $81 = HEAP8[$80>>0]|0;
    $82 = ($81<<24>>24)==(36);
    if ($82) {
     $83 = ((($79)) + 1|0);
     $84 = HEAP8[$83>>0]|0;
     $85 = $84 << 24 >> 24;
     $86 = (($85) + -48)|0;
     $87 = (($4) + ($86<<2)|0);
     HEAP32[$87>>2] = 10;
     $88 = HEAP8[$83>>0]|0;
     $89 = $88 << 24 >> 24;
     $90 = (($89) + -48)|0;
     $91 = (($3) + ($90<<3)|0);
     $92 = $91;
     $93 = $92;
     $94 = HEAP32[$93>>2]|0;
     $95 = (($92) + 4)|0;
     $96 = $95;
     $97 = HEAP32[$96>>2]|0;
     $98 = ((($79)) + 3|0);
     $$0259 = $94;$$2271 = 1;$storemerge274 = $98;
    } else {
     label = 23;
    }
   }
   if ((label|0) == 23) {
    label = 0;
    $99 = ($$1270|0)==(0);
    if (!($99)) {
     $$0 = -1;
     break;
    }
    if ($10) {
     $arglist_current = HEAP32[$2>>2]|0;
     $100 = $arglist_current;
     $101 = ((0) + 4|0);
     $expanded4 = $101;
     $expanded = (($expanded4) - 1)|0;
     $102 = (($100) + ($expanded))|0;
     $103 = ((0) + 4|0);
     $expanded8 = $103;
     $expanded7 = (($expanded8) - 1)|0;
     $expanded6 = $expanded7 ^ -1;
     $104 = $102 & $expanded6;
     $105 = $104;
     $106 = HEAP32[$105>>2]|0;
     $arglist_next = ((($105)) + 4|0);
     HEAP32[$2>>2] = $arglist_next;
     $363 = $106;
    } else {
     $363 = 0;
    }
    $107 = HEAP32[$5>>2]|0;
    $108 = ((($107)) + 1|0);
    $$0259 = $363;$$2271 = 0;$storemerge274 = $108;
   }
   HEAP32[$5>>2] = $storemerge274;
   $109 = ($$0259|0)<(0);
   $110 = $$0262$lcssa | 8192;
   $111 = (0 - ($$0259))|0;
   $$$0262 = $109 ? $110 : $$0262$lcssa;
   $$$0259 = $109 ? $111 : $$0259;
   $$1260 = $$$0259;$$1263 = $$$0262;$$3272 = $$2271;$115 = $storemerge274;
  } else {
   $112 = (_getint_128($5)|0);
   $113 = ($112|0)<(0);
   if ($113) {
    $$0 = -1;
    break;
   }
   $$pre344 = HEAP32[$5>>2]|0;
   $$1260 = $112;$$1263 = $$0262$lcssa;$$3272 = $$1270;$115 = $$pre344;
  }
  $114 = HEAP8[$115>>0]|0;
  $116 = ($114<<24>>24)==(46);
  do {
   if ($116) {
    $117 = ((($115)) + 1|0);
    $118 = HEAP8[$117>>0]|0;
    $119 = ($118<<24>>24)==(42);
    if (!($119)) {
     $155 = ((($115)) + 1|0);
     HEAP32[$5>>2] = $155;
     $156 = (_getint_128($5)|0);
     $$pre345$pre = HEAP32[$5>>2]|0;
     $$0254 = $156;$$pre345 = $$pre345$pre;
     break;
    }
    $120 = ((($115)) + 2|0);
    $121 = HEAP8[$120>>0]|0;
    $122 = $121 << 24 >> 24;
    $123 = (_isdigit($122)|0);
    $124 = ($123|0)==(0);
    if (!($124)) {
     $125 = HEAP32[$5>>2]|0;
     $126 = ((($125)) + 3|0);
     $127 = HEAP8[$126>>0]|0;
     $128 = ($127<<24>>24)==(36);
     if ($128) {
      $129 = ((($125)) + 2|0);
      $130 = HEAP8[$129>>0]|0;
      $131 = $130 << 24 >> 24;
      $132 = (($131) + -48)|0;
      $133 = (($4) + ($132<<2)|0);
      HEAP32[$133>>2] = 10;
      $134 = HEAP8[$129>>0]|0;
      $135 = $134 << 24 >> 24;
      $136 = (($135) + -48)|0;
      $137 = (($3) + ($136<<3)|0);
      $138 = $137;
      $139 = $138;
      $140 = HEAP32[$139>>2]|0;
      $141 = (($138) + 4)|0;
      $142 = $141;
      $143 = HEAP32[$142>>2]|0;
      $144 = ((($125)) + 4|0);
      HEAP32[$5>>2] = $144;
      $$0254 = $140;$$pre345 = $144;
      break;
     }
    }
    $145 = ($$3272|0)==(0);
    if (!($145)) {
     $$0 = -1;
     break L1;
    }
    if ($10) {
     $arglist_current2 = HEAP32[$2>>2]|0;
     $146 = $arglist_current2;
     $147 = ((0) + 4|0);
     $expanded11 = $147;
     $expanded10 = (($expanded11) - 1)|0;
     $148 = (($146) + ($expanded10))|0;
     $149 = ((0) + 4|0);
     $expanded15 = $149;
     $expanded14 = (($expanded15) - 1)|0;
     $expanded13 = $expanded14 ^ -1;
     $150 = $148 & $expanded13;
     $151 = $150;
     $152 = HEAP32[$151>>2]|0;
     $arglist_next3 = ((($151)) + 4|0);
     HEAP32[$2>>2] = $arglist_next3;
     $364 = $152;
    } else {
     $364 = 0;
    }
    $153 = HEAP32[$5>>2]|0;
    $154 = ((($153)) + 2|0);
    HEAP32[$5>>2] = $154;
    $$0254 = $364;$$pre345 = $154;
   } else {
    $$0254 = -1;$$pre345 = $115;
   }
  } while(0);
  $$0252 = 0;$158 = $$pre345;
  while(1) {
   $157 = HEAP8[$158>>0]|0;
   $159 = $157 << 24 >> 24;
   $160 = (($159) + -65)|0;
   $161 = ($160>>>0)>(57);
   if ($161) {
    $$0 = -1;
    break L1;
   }
   $162 = ((($158)) + 1|0);
   HEAP32[$5>>2] = $162;
   $163 = HEAP8[$158>>0]|0;
   $164 = $163 << 24 >> 24;
   $165 = (($164) + -65)|0;
   $166 = ((5344 + (($$0252*58)|0)|0) + ($165)|0);
   $167 = HEAP8[$166>>0]|0;
   $168 = $167&255;
   $169 = (($168) + -1)|0;
   $170 = ($169>>>0)<(8);
   if ($170) {
    $$0252 = $168;$158 = $162;
   } else {
    break;
   }
  }
  $171 = ($167<<24>>24)==(0);
  if ($171) {
   $$0 = -1;
   break;
  }
  $172 = ($167<<24>>24)==(19);
  $173 = ($$0253|0)>(-1);
  do {
   if ($172) {
    if ($173) {
     $$0 = -1;
     break L1;
    } else {
     label = 50;
    }
   } else {
    if ($173) {
     $174 = (($4) + ($$0253<<2)|0);
     HEAP32[$174>>2] = $168;
     $175 = (($3) + ($$0253<<3)|0);
     $176 = $175;
     $177 = $176;
     $178 = HEAP32[$177>>2]|0;
     $179 = (($176) + 4)|0;
     $180 = $179;
     $181 = HEAP32[$180>>2]|0;
     $182 = $6;
     $183 = $182;
     HEAP32[$183>>2] = $178;
     $184 = (($182) + 4)|0;
     $185 = $184;
     HEAP32[$185>>2] = $181;
     label = 50;
     break;
    }
    if (!($10)) {
     $$0 = 0;
     break L1;
    }
    _pop_arg_130($6,$168,$2);
    $$pre346 = HEAP32[$5>>2]|0;
    $187 = $$pre346;
   }
  } while(0);
  if ((label|0) == 50) {
   label = 0;
   if ($10) {
    $187 = $162;
   } else {
    $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
    continue;
   }
  }
  $186 = ((($187)) + -1|0);
  $188 = HEAP8[$186>>0]|0;
  $189 = $188 << 24 >> 24;
  $190 = ($$0252|0)!=(0);
  $191 = $189 & 15;
  $192 = ($191|0)==(3);
  $or$cond276 = $190 & $192;
  $193 = $189 & -33;
  $$0235 = $or$cond276 ? $193 : $189;
  $194 = $$1263 & 8192;
  $195 = ($194|0)==(0);
  $196 = $$1263 & -65537;
  $$1263$ = $195 ? $$1263 : $196;
  L73: do {
   switch ($$0235|0) {
   case 110:  {
    $trunc = $$0252&255;
    switch ($trunc<<24>>24) {
    case 0:  {
     $203 = HEAP32[$6>>2]|0;
     HEAP32[$203>>2] = $$1248;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 1:  {
     $204 = HEAP32[$6>>2]|0;
     HEAP32[$204>>2] = $$1248;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 2:  {
     $205 = ($$1248|0)<(0);
     $206 = $205 << 31 >> 31;
     $207 = HEAP32[$6>>2]|0;
     $208 = $207;
     $209 = $208;
     HEAP32[$209>>2] = $$1248;
     $210 = (($208) + 4)|0;
     $211 = $210;
     HEAP32[$211>>2] = $206;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 3:  {
     $212 = $$1248&65535;
     $213 = HEAP32[$6>>2]|0;
     HEAP16[$213>>1] = $212;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 4:  {
     $214 = $$1248&255;
     $215 = HEAP32[$6>>2]|0;
     HEAP8[$215>>0] = $214;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 6:  {
     $216 = HEAP32[$6>>2]|0;
     HEAP32[$216>>2] = $$1248;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 7:  {
     $217 = ($$1248|0)<(0);
     $218 = $217 << 31 >> 31;
     $219 = HEAP32[$6>>2]|0;
     $220 = $219;
     $221 = $220;
     HEAP32[$221>>2] = $$1248;
     $222 = (($220) + 4)|0;
     $223 = $222;
     HEAP32[$223>>2] = $218;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    default: {
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $224 = ($$0254>>>0)>(8);
    $225 = $224 ? $$0254 : 8;
    $226 = $$1263$ | 8;
    $$1236 = 120;$$1255 = $225;$$3265 = $226;
    label = 62;
    break;
   }
   case 88: case 120:  {
    $$1236 = $$0235;$$1255 = $$0254;$$3265 = $$1263$;
    label = 62;
    break;
   }
   case 111:  {
    $242 = $6;
    $243 = $242;
    $244 = HEAP32[$243>>2]|0;
    $245 = (($242) + 4)|0;
    $246 = $245;
    $247 = HEAP32[$246>>2]|0;
    $248 = (_fmt_o($244,$247,$11)|0);
    $249 = $$1263$ & 8;
    $250 = ($249|0)==(0);
    $251 = $248;
    $252 = (($12) - ($251))|0;
    $253 = ($$0254|0)>($252|0);
    $254 = (($252) + 1)|0;
    $255 = $250 | $253;
    $$0254$$0254$ = $255 ? $$0254 : $254;
    $$0228 = $248;$$1233 = 0;$$1238 = 5808;$$2256 = $$0254$$0254$;$$4266 = $$1263$;$280 = $244;$282 = $247;
    label = 68;
    break;
   }
   case 105: case 100:  {
    $256 = $6;
    $257 = $256;
    $258 = HEAP32[$257>>2]|0;
    $259 = (($256) + 4)|0;
    $260 = $259;
    $261 = HEAP32[$260>>2]|0;
    $262 = ($261|0)<(0);
    if ($262) {
     $263 = (_i64Subtract(0,0,($258|0),($261|0))|0);
     $264 = tempRet0;
     $265 = $6;
     $266 = $265;
     HEAP32[$266>>2] = $263;
     $267 = (($265) + 4)|0;
     $268 = $267;
     HEAP32[$268>>2] = $264;
     $$0232 = 1;$$0237 = 5808;$275 = $263;$276 = $264;
     label = 67;
     break L73;
    } else {
     $269 = $$1263$ & 2048;
     $270 = ($269|0)==(0);
     $271 = $$1263$ & 1;
     $272 = ($271|0)==(0);
     $$ = $272 ? 5808 : (5810);
     $$$ = $270 ? $$ : (5809);
     $273 = $$1263$ & 2049;
     $274 = ($273|0)!=(0);
     $$279$ = $274&1;
     $$0232 = $$279$;$$0237 = $$$;$275 = $258;$276 = $261;
     label = 67;
     break L73;
    }
    break;
   }
   case 117:  {
    $197 = $6;
    $198 = $197;
    $199 = HEAP32[$198>>2]|0;
    $200 = (($197) + 4)|0;
    $201 = $200;
    $202 = HEAP32[$201>>2]|0;
    $$0232 = 0;$$0237 = 5808;$275 = $199;$276 = $202;
    label = 67;
    break;
   }
   case 99:  {
    $292 = $6;
    $293 = $292;
    $294 = HEAP32[$293>>2]|0;
    $295 = (($292) + 4)|0;
    $296 = $295;
    $297 = HEAP32[$296>>2]|0;
    $298 = $294&255;
    HEAP8[$13>>0] = $298;
    $$2 = $13;$$2234 = 0;$$2239 = 5808;$$2251 = $11;$$5 = 1;$$6268 = $196;
    break;
   }
   case 109:  {
    $299 = (___errno_location()|0);
    $300 = HEAP32[$299>>2]|0;
    $301 = (_strerror($300)|0);
    $$1 = $301;
    label = 72;
    break;
   }
   case 115:  {
    $302 = HEAP32[$6>>2]|0;
    $303 = ($302|0)!=(0|0);
    $304 = $303 ? $302 : 5818;
    $$1 = $304;
    label = 72;
    break;
   }
   case 67:  {
    $311 = $6;
    $312 = $311;
    $313 = HEAP32[$312>>2]|0;
    $314 = (($311) + 4)|0;
    $315 = $314;
    $316 = HEAP32[$315>>2]|0;
    HEAP32[$8>>2] = $313;
    HEAP32[$14>>2] = 0;
    HEAP32[$6>>2] = $8;
    $$4258354 = -1;$365 = $8;
    label = 76;
    break;
   }
   case 83:  {
    $$pre348 = HEAP32[$6>>2]|0;
    $317 = ($$0254|0)==(0);
    if ($317) {
     _pad($0,32,$$1260,0,$$1263$);
     $$0240$lcssa356 = 0;
     label = 85;
    } else {
     $$4258354 = $$0254;$365 = $$pre348;
     label = 76;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    $339 = +HEAPF64[$6>>3];
    $340 = (_fmt_fp($0,$339,$$1260,$$0254,$$1263$,$$0235)|0);
    $$0243 = $340;$$0247 = $$1248;$$0269 = $$3272;
    continue L1;
    break;
   }
   default: {
    $$2 = $20;$$2234 = 0;$$2239 = 5808;$$2251 = $11;$$5 = $$0254;$$6268 = $$1263$;
   }
   }
  } while(0);
  L97: do {
   if ((label|0) == 62) {
    label = 0;
    $227 = $6;
    $228 = $227;
    $229 = HEAP32[$228>>2]|0;
    $230 = (($227) + 4)|0;
    $231 = $230;
    $232 = HEAP32[$231>>2]|0;
    $233 = $$1236 & 32;
    $234 = (_fmt_x($229,$232,$11,$233)|0);
    $235 = ($229|0)==(0);
    $236 = ($232|0)==(0);
    $237 = $235 & $236;
    $238 = $$3265 & 8;
    $239 = ($238|0)==(0);
    $or$cond278 = $239 | $237;
    $240 = $$1236 >> 4;
    $241 = (5808 + ($240)|0);
    $$286 = $or$cond278 ? 5808 : $241;
    $$287 = $or$cond278 ? 0 : 2;
    $$0228 = $234;$$1233 = $$287;$$1238 = $$286;$$2256 = $$1255;$$4266 = $$3265;$280 = $229;$282 = $232;
    label = 68;
   }
   else if ((label|0) == 67) {
    label = 0;
    $277 = (_fmt_u($275,$276,$11)|0);
    $$0228 = $277;$$1233 = $$0232;$$1238 = $$0237;$$2256 = $$0254;$$4266 = $$1263$;$280 = $275;$282 = $276;
    label = 68;
   }
   else if ((label|0) == 72) {
    label = 0;
    $305 = (_memchr($$1,0,$$0254)|0);
    $306 = ($305|0)==(0|0);
    $307 = $305;
    $308 = $$1;
    $309 = (($307) - ($308))|0;
    $310 = (($$1) + ($$0254)|0);
    $$3257 = $306 ? $$0254 : $309;
    $$1250 = $306 ? $310 : $305;
    $$2 = $$1;$$2234 = 0;$$2239 = 5808;$$2251 = $$1250;$$5 = $$3257;$$6268 = $196;
   }
   else if ((label|0) == 76) {
    label = 0;
    $$0229316 = $365;$$0240315 = 0;$$1244314 = 0;
    while(1) {
     $318 = HEAP32[$$0229316>>2]|0;
     $319 = ($318|0)==(0);
     if ($319) {
      $$0240$lcssa = $$0240315;$$2245 = $$1244314;
      break;
     }
     $320 = (_wctomb($9,$318)|0);
     $321 = ($320|0)<(0);
     $322 = (($$4258354) - ($$0240315))|0;
     $323 = ($320>>>0)>($322>>>0);
     $or$cond281 = $321 | $323;
     if ($or$cond281) {
      $$0240$lcssa = $$0240315;$$2245 = $320;
      break;
     }
     $324 = ((($$0229316)) + 4|0);
     $325 = (($320) + ($$0240315))|0;
     $326 = ($$4258354>>>0)>($325>>>0);
     if ($326) {
      $$0229316 = $324;$$0240315 = $325;$$1244314 = $320;
     } else {
      $$0240$lcssa = $325;$$2245 = $320;
      break;
     }
    }
    $327 = ($$2245|0)<(0);
    if ($327) {
     $$0 = -1;
     break L1;
    }
    _pad($0,32,$$1260,$$0240$lcssa,$$1263$);
    $328 = ($$0240$lcssa|0)==(0);
    if ($328) {
     $$0240$lcssa356 = 0;
     label = 85;
    } else {
     $$1230327 = $365;$$1241326 = 0;
     while(1) {
      $329 = HEAP32[$$1230327>>2]|0;
      $330 = ($329|0)==(0);
      if ($330) {
       $$0240$lcssa356 = $$0240$lcssa;
       label = 85;
       break L97;
      }
      $331 = (_wctomb($9,$329)|0);
      $332 = (($331) + ($$1241326))|0;
      $333 = ($332|0)>($$0240$lcssa|0);
      if ($333) {
       $$0240$lcssa356 = $$0240$lcssa;
       label = 85;
       break L97;
      }
      $334 = ((($$1230327)) + 4|0);
      _out_127($0,$9,$331);
      $335 = ($332>>>0)<($$0240$lcssa>>>0);
      if ($335) {
       $$1230327 = $334;$$1241326 = $332;
      } else {
       $$0240$lcssa356 = $$0240$lcssa;
       label = 85;
       break;
      }
     }
    }
   }
  } while(0);
  if ((label|0) == 68) {
   label = 0;
   $278 = ($$2256|0)>(-1);
   $279 = $$4266 & -65537;
   $$$4266 = $278 ? $279 : $$4266;
   $281 = ($280|0)!=(0);
   $283 = ($282|0)!=(0);
   $284 = $281 | $283;
   $285 = ($$2256|0)!=(0);
   $or$cond = $285 | $284;
   $286 = $$0228;
   $287 = (($12) - ($286))|0;
   $288 = $284 ^ 1;
   $289 = $288&1;
   $290 = (($287) + ($289))|0;
   $291 = ($$2256|0)>($290|0);
   $$2256$ = $291 ? $$2256 : $290;
   $$2256$$$2256 = $or$cond ? $$2256$ : $$2256;
   $$0228$ = $or$cond ? $$0228 : $11;
   $$2 = $$0228$;$$2234 = $$1233;$$2239 = $$1238;$$2251 = $11;$$5 = $$2256$$$2256;$$6268 = $$$4266;
  }
  else if ((label|0) == 85) {
   label = 0;
   $336 = $$1263$ ^ 8192;
   _pad($0,32,$$1260,$$0240$lcssa356,$336);
   $337 = ($$1260|0)>($$0240$lcssa356|0);
   $338 = $337 ? $$1260 : $$0240$lcssa356;
   $$0243 = $338;$$0247 = $$1248;$$0269 = $$3272;
   continue;
  }
  $341 = $$2251;
  $342 = $$2;
  $343 = (($341) - ($342))|0;
  $344 = ($$5|0)<($343|0);
  $$$5 = $344 ? $343 : $$5;
  $345 = (($$$5) + ($$2234))|0;
  $346 = ($$1260|0)<($345|0);
  $$2261 = $346 ? $345 : $$1260;
  _pad($0,32,$$2261,$345,$$6268);
  _out_127($0,$$2239,$$2234);
  $347 = $$6268 ^ 65536;
  _pad($0,48,$$2261,$345,$347);
  _pad($0,48,$$$5,$343,0);
  _out_127($0,$$2,$343);
  $348 = $$6268 ^ 8192;
  _pad($0,32,$$2261,$345,$348);
  $$0243 = $$2261;$$0247 = $$1248;$$0269 = $$3272;
 }
 L116: do {
  if ((label|0) == 88) {
   $349 = ($0|0)==(0|0);
   if ($349) {
    $350 = ($$0269|0)==(0);
    if ($350) {
     $$0 = 0;
    } else {
     $$2242302 = 1;
     while(1) {
      $351 = (($4) + ($$2242302<<2)|0);
      $352 = HEAP32[$351>>2]|0;
      $353 = ($352|0)==(0);
      if ($353) {
       $$2242$lcssa = $$2242302;
       break;
      }
      $355 = (($3) + ($$2242302<<3)|0);
      _pop_arg_130($355,$352,$2);
      $356 = (($$2242302) + 1)|0;
      $357 = ($$2242302|0)<(9);
      if ($357) {
       $$2242302 = $356;
      } else {
       $$2242$lcssa = $356;
       break;
      }
     }
     $354 = ($$2242$lcssa|0)<(10);
     if ($354) {
      $$3300 = $$2242$lcssa;
      while(1) {
       $360 = (($4) + ($$3300<<2)|0);
       $361 = HEAP32[$360>>2]|0;
       $362 = ($361|0)==(0);
       if (!($362)) {
        $$0 = -1;
        break L116;
       }
       $358 = (($$3300) + 1)|0;
       $359 = ($$3300|0)<(9);
       if ($359) {
        $$3300 = $358;
       } else {
        $$0 = 1;
        break;
       }
      }
     } else {
      $$0 = 1;
     }
    }
   } else {
    $$0 = $$1248;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function _out_127($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = HEAP32[$0>>2]|0;
 $4 = $3 & 32;
 $5 = ($4|0)==(0);
 if ($5) {
  (___fwritex($1,$2,$0)|0);
 }
 return;
}
function _getint_128($0) {
 $0 = $0|0;
 var $$0$lcssa = 0, $$04 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP8[$1>>0]|0;
 $3 = $2 << 24 >> 24;
 $4 = (_isdigit($3)|0);
 $5 = ($4|0)==(0);
 if ($5) {
  $$0$lcssa = 0;
 } else {
  $$04 = 0;
  while(1) {
   $6 = ($$04*10)|0;
   $7 = HEAP32[$0>>2]|0;
   $8 = HEAP8[$7>>0]|0;
   $9 = $8 << 24 >> 24;
   $10 = (($6) + -48)|0;
   $11 = (($10) + ($9))|0;
   $12 = ((($7)) + 1|0);
   HEAP32[$0>>2] = $12;
   $13 = HEAP8[$12>>0]|0;
   $14 = $13 << 24 >> 24;
   $15 = (_isdigit($14)|0);
   $16 = ($15|0)==(0);
   if ($16) {
    $$0$lcssa = $11;
    break;
   } else {
    $$04 = $11;
   }
  }
 }
 return ($$0$lcssa|0);
}
function _pop_arg_130($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$mask = 0, $$mask31 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0.0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0;
 var $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current5 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next6 = 0, $arglist_next9 = 0, $expanded = 0, $expanded28 = 0, $expanded30 = 0, $expanded31 = 0;
 var $expanded32 = 0, $expanded34 = 0, $expanded35 = 0, $expanded37 = 0, $expanded38 = 0, $expanded39 = 0, $expanded41 = 0, $expanded42 = 0, $expanded44 = 0, $expanded45 = 0, $expanded46 = 0, $expanded48 = 0, $expanded49 = 0, $expanded51 = 0, $expanded52 = 0, $expanded53 = 0, $expanded55 = 0, $expanded56 = 0, $expanded58 = 0, $expanded59 = 0;
 var $expanded60 = 0, $expanded62 = 0, $expanded63 = 0, $expanded65 = 0, $expanded66 = 0, $expanded67 = 0, $expanded69 = 0, $expanded70 = 0, $expanded72 = 0, $expanded73 = 0, $expanded74 = 0, $expanded76 = 0, $expanded77 = 0, $expanded79 = 0, $expanded80 = 0, $expanded81 = 0, $expanded83 = 0, $expanded84 = 0, $expanded86 = 0, $expanded87 = 0;
 var $expanded88 = 0, $expanded90 = 0, $expanded91 = 0, $expanded93 = 0, $expanded94 = 0, $expanded95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($1>>>0)>(20);
 L1: do {
  if (!($3)) {
   do {
    switch ($1|0) {
    case 9:  {
     $arglist_current = HEAP32[$2>>2]|0;
     $4 = $arglist_current;
     $5 = ((0) + 4|0);
     $expanded28 = $5;
     $expanded = (($expanded28) - 1)|0;
     $6 = (($4) + ($expanded))|0;
     $7 = ((0) + 4|0);
     $expanded32 = $7;
     $expanded31 = (($expanded32) - 1)|0;
     $expanded30 = $expanded31 ^ -1;
     $8 = $6 & $expanded30;
     $9 = $8;
     $10 = HEAP32[$9>>2]|0;
     $arglist_next = ((($9)) + 4|0);
     HEAP32[$2>>2] = $arglist_next;
     HEAP32[$0>>2] = $10;
     break L1;
     break;
    }
    case 10:  {
     $arglist_current2 = HEAP32[$2>>2]|0;
     $11 = $arglist_current2;
     $12 = ((0) + 4|0);
     $expanded35 = $12;
     $expanded34 = (($expanded35) - 1)|0;
     $13 = (($11) + ($expanded34))|0;
     $14 = ((0) + 4|0);
     $expanded39 = $14;
     $expanded38 = (($expanded39) - 1)|0;
     $expanded37 = $expanded38 ^ -1;
     $15 = $13 & $expanded37;
     $16 = $15;
     $17 = HEAP32[$16>>2]|0;
     $arglist_next3 = ((($16)) + 4|0);
     HEAP32[$2>>2] = $arglist_next3;
     $18 = ($17|0)<(0);
     $19 = $18 << 31 >> 31;
     $20 = $0;
     $21 = $20;
     HEAP32[$21>>2] = $17;
     $22 = (($20) + 4)|0;
     $23 = $22;
     HEAP32[$23>>2] = $19;
     break L1;
     break;
    }
    case 11:  {
     $arglist_current5 = HEAP32[$2>>2]|0;
     $24 = $arglist_current5;
     $25 = ((0) + 4|0);
     $expanded42 = $25;
     $expanded41 = (($expanded42) - 1)|0;
     $26 = (($24) + ($expanded41))|0;
     $27 = ((0) + 4|0);
     $expanded46 = $27;
     $expanded45 = (($expanded46) - 1)|0;
     $expanded44 = $expanded45 ^ -1;
     $28 = $26 & $expanded44;
     $29 = $28;
     $30 = HEAP32[$29>>2]|0;
     $arglist_next6 = ((($29)) + 4|0);
     HEAP32[$2>>2] = $arglist_next6;
     $31 = $0;
     $32 = $31;
     HEAP32[$32>>2] = $30;
     $33 = (($31) + 4)|0;
     $34 = $33;
     HEAP32[$34>>2] = 0;
     break L1;
     break;
    }
    case 12:  {
     $arglist_current8 = HEAP32[$2>>2]|0;
     $35 = $arglist_current8;
     $36 = ((0) + 8|0);
     $expanded49 = $36;
     $expanded48 = (($expanded49) - 1)|0;
     $37 = (($35) + ($expanded48))|0;
     $38 = ((0) + 8|0);
     $expanded53 = $38;
     $expanded52 = (($expanded53) - 1)|0;
     $expanded51 = $expanded52 ^ -1;
     $39 = $37 & $expanded51;
     $40 = $39;
     $41 = $40;
     $42 = $41;
     $43 = HEAP32[$42>>2]|0;
     $44 = (($41) + 4)|0;
     $45 = $44;
     $46 = HEAP32[$45>>2]|0;
     $arglist_next9 = ((($40)) + 8|0);
     HEAP32[$2>>2] = $arglist_next9;
     $47 = $0;
     $48 = $47;
     HEAP32[$48>>2] = $43;
     $49 = (($47) + 4)|0;
     $50 = $49;
     HEAP32[$50>>2] = $46;
     break L1;
     break;
    }
    case 13:  {
     $arglist_current11 = HEAP32[$2>>2]|0;
     $51 = $arglist_current11;
     $52 = ((0) + 4|0);
     $expanded56 = $52;
     $expanded55 = (($expanded56) - 1)|0;
     $53 = (($51) + ($expanded55))|0;
     $54 = ((0) + 4|0);
     $expanded60 = $54;
     $expanded59 = (($expanded60) - 1)|0;
     $expanded58 = $expanded59 ^ -1;
     $55 = $53 & $expanded58;
     $56 = $55;
     $57 = HEAP32[$56>>2]|0;
     $arglist_next12 = ((($56)) + 4|0);
     HEAP32[$2>>2] = $arglist_next12;
     $58 = $57&65535;
     $59 = $58 << 16 >> 16;
     $60 = ($59|0)<(0);
     $61 = $60 << 31 >> 31;
     $62 = $0;
     $63 = $62;
     HEAP32[$63>>2] = $59;
     $64 = (($62) + 4)|0;
     $65 = $64;
     HEAP32[$65>>2] = $61;
     break L1;
     break;
    }
    case 14:  {
     $arglist_current14 = HEAP32[$2>>2]|0;
     $66 = $arglist_current14;
     $67 = ((0) + 4|0);
     $expanded63 = $67;
     $expanded62 = (($expanded63) - 1)|0;
     $68 = (($66) + ($expanded62))|0;
     $69 = ((0) + 4|0);
     $expanded67 = $69;
     $expanded66 = (($expanded67) - 1)|0;
     $expanded65 = $expanded66 ^ -1;
     $70 = $68 & $expanded65;
     $71 = $70;
     $72 = HEAP32[$71>>2]|0;
     $arglist_next15 = ((($71)) + 4|0);
     HEAP32[$2>>2] = $arglist_next15;
     $$mask31 = $72 & 65535;
     $73 = $0;
     $74 = $73;
     HEAP32[$74>>2] = $$mask31;
     $75 = (($73) + 4)|0;
     $76 = $75;
     HEAP32[$76>>2] = 0;
     break L1;
     break;
    }
    case 15:  {
     $arglist_current17 = HEAP32[$2>>2]|0;
     $77 = $arglist_current17;
     $78 = ((0) + 4|0);
     $expanded70 = $78;
     $expanded69 = (($expanded70) - 1)|0;
     $79 = (($77) + ($expanded69))|0;
     $80 = ((0) + 4|0);
     $expanded74 = $80;
     $expanded73 = (($expanded74) - 1)|0;
     $expanded72 = $expanded73 ^ -1;
     $81 = $79 & $expanded72;
     $82 = $81;
     $83 = HEAP32[$82>>2]|0;
     $arglist_next18 = ((($82)) + 4|0);
     HEAP32[$2>>2] = $arglist_next18;
     $84 = $83&255;
     $85 = $84 << 24 >> 24;
     $86 = ($85|0)<(0);
     $87 = $86 << 31 >> 31;
     $88 = $0;
     $89 = $88;
     HEAP32[$89>>2] = $85;
     $90 = (($88) + 4)|0;
     $91 = $90;
     HEAP32[$91>>2] = $87;
     break L1;
     break;
    }
    case 16:  {
     $arglist_current20 = HEAP32[$2>>2]|0;
     $92 = $arglist_current20;
     $93 = ((0) + 4|0);
     $expanded77 = $93;
     $expanded76 = (($expanded77) - 1)|0;
     $94 = (($92) + ($expanded76))|0;
     $95 = ((0) + 4|0);
     $expanded81 = $95;
     $expanded80 = (($expanded81) - 1)|0;
     $expanded79 = $expanded80 ^ -1;
     $96 = $94 & $expanded79;
     $97 = $96;
     $98 = HEAP32[$97>>2]|0;
     $arglist_next21 = ((($97)) + 4|0);
     HEAP32[$2>>2] = $arglist_next21;
     $$mask = $98 & 255;
     $99 = $0;
     $100 = $99;
     HEAP32[$100>>2] = $$mask;
     $101 = (($99) + 4)|0;
     $102 = $101;
     HEAP32[$102>>2] = 0;
     break L1;
     break;
    }
    case 17:  {
     $arglist_current23 = HEAP32[$2>>2]|0;
     $103 = $arglist_current23;
     $104 = ((0) + 8|0);
     $expanded84 = $104;
     $expanded83 = (($expanded84) - 1)|0;
     $105 = (($103) + ($expanded83))|0;
     $106 = ((0) + 8|0);
     $expanded88 = $106;
     $expanded87 = (($expanded88) - 1)|0;
     $expanded86 = $expanded87 ^ -1;
     $107 = $105 & $expanded86;
     $108 = $107;
     $109 = +HEAPF64[$108>>3];
     $arglist_next24 = ((($108)) + 8|0);
     HEAP32[$2>>2] = $arglist_next24;
     HEAPF64[$0>>3] = $109;
     break L1;
     break;
    }
    case 18:  {
     $arglist_current26 = HEAP32[$2>>2]|0;
     $110 = $arglist_current26;
     $111 = ((0) + 8|0);
     $expanded91 = $111;
     $expanded90 = (($expanded91) - 1)|0;
     $112 = (($110) + ($expanded90))|0;
     $113 = ((0) + 8|0);
     $expanded95 = $113;
     $expanded94 = (($expanded95) - 1)|0;
     $expanded93 = $expanded94 ^ -1;
     $114 = $112 & $expanded93;
     $115 = $114;
     $116 = +HEAPF64[$115>>3];
     $arglist_next27 = ((($115)) + 8|0);
     HEAP32[$2>>2] = $arglist_next27;
     HEAPF64[$0>>3] = $116;
     break L1;
     break;
    }
    default: {
     break L1;
    }
    }
   } while(0);
  }
 } while(0);
 return;
}
function _fmt_x($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$05$lcssa = 0, $$056 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $4 = ($0|0)==(0);
 $5 = ($1|0)==(0);
 $6 = $4 & $5;
 if ($6) {
  $$05$lcssa = $2;
 } else {
  $$056 = $2;$15 = $1;$8 = $0;
  while(1) {
   $7 = $8 & 15;
   $9 = (5860 + ($7)|0);
   $10 = HEAP8[$9>>0]|0;
   $11 = $10&255;
   $12 = $11 | $3;
   $13 = $12&255;
   $14 = ((($$056)) + -1|0);
   HEAP8[$14>>0] = $13;
   $16 = (_bitshift64Lshr(($8|0),($15|0),4)|0);
   $17 = tempRet0;
   $18 = ($16|0)==(0);
   $19 = ($17|0)==(0);
   $20 = $18 & $19;
   if ($20) {
    $$05$lcssa = $14;
    break;
   } else {
    $$056 = $14;$15 = $17;$8 = $16;
   }
  }
 }
 return ($$05$lcssa|0);
}
function _fmt_o($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0$lcssa = 0, $$06 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($0|0)==(0);
 $4 = ($1|0)==(0);
 $5 = $3 & $4;
 if ($5) {
  $$0$lcssa = $2;
 } else {
  $$06 = $2;$11 = $1;$7 = $0;
  while(1) {
   $6 = $7&255;
   $8 = $6 & 7;
   $9 = $8 | 48;
   $10 = ((($$06)) + -1|0);
   HEAP8[$10>>0] = $9;
   $12 = (_bitshift64Lshr(($7|0),($11|0),3)|0);
   $13 = tempRet0;
   $14 = ($12|0)==(0);
   $15 = ($13|0)==(0);
   $16 = $14 & $15;
   if ($16) {
    $$0$lcssa = $10;
    break;
   } else {
    $$06 = $10;$11 = $13;$7 = $12;
   }
  }
 }
 return ($$0$lcssa|0);
}
function _fmt_u($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$010$lcssa$off0 = 0, $$012 = 0, $$09$lcssa = 0, $$0914 = 0, $$1$lcssa = 0, $$111 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($1>>>0)>(0);
 $4 = ($0>>>0)>(4294967295);
 $5 = ($1|0)==(0);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0914 = $2;$8 = $0;$9 = $1;
  while(1) {
   $10 = (___uremdi3(($8|0),($9|0),10,0)|0);
   $11 = tempRet0;
   $12 = $10&255;
   $13 = $12 | 48;
   $14 = ((($$0914)) + -1|0);
   HEAP8[$14>>0] = $13;
   $15 = (___udivdi3(($8|0),($9|0),10,0)|0);
   $16 = tempRet0;
   $17 = ($9>>>0)>(9);
   $18 = ($8>>>0)>(4294967295);
   $19 = ($9|0)==(9);
   $20 = $19 & $18;
   $21 = $17 | $20;
   if ($21) {
    $$0914 = $14;$8 = $15;$9 = $16;
   } else {
    break;
   }
  }
  $$010$lcssa$off0 = $15;$$09$lcssa = $14;
 } else {
  $$010$lcssa$off0 = $0;$$09$lcssa = $2;
 }
 $22 = ($$010$lcssa$off0|0)==(0);
 if ($22) {
  $$1$lcssa = $$09$lcssa;
 } else {
  $$012 = $$010$lcssa$off0;$$111 = $$09$lcssa;
  while(1) {
   $23 = (($$012>>>0) % 10)&-1;
   $24 = $23 | 48;
   $25 = $24&255;
   $26 = ((($$111)) + -1|0);
   HEAP8[$26>>0] = $25;
   $27 = (($$012>>>0) / 10)&-1;
   $28 = ($$012>>>0)<(10);
   if ($28) {
    $$1$lcssa = $26;
    break;
   } else {
    $$012 = $27;$$111 = $26;
   }
  }
 }
 return ($$1$lcssa|0);
}
function _strerror($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = (___pthread_self_186()|0);
 $2 = ((($1)) + 188|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (___strerror_l($0,$3)|0);
 return ($4|0);
}
function _memchr($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0$lcssa = 0, $$035$lcssa = 0, $$035$lcssa65 = 0, $$03555 = 0, $$036$lcssa = 0, $$036$lcssa64 = 0, $$03654 = 0, $$046 = 0, $$137$lcssa = 0, $$13745 = 0, $$140 = 0, $$2 = 0, $$23839 = 0, $$3 = 0, $$lcssa = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0;
 var $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond53 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = $1 & 255;
 $4 = $0;
 $5 = $4 & 3;
 $6 = ($5|0)!=(0);
 $7 = ($2|0)!=(0);
 $or$cond53 = $7 & $6;
 L1: do {
  if ($or$cond53) {
   $8 = $1&255;
   $$03555 = $0;$$03654 = $2;
   while(1) {
    $9 = HEAP8[$$03555>>0]|0;
    $10 = ($9<<24>>24)==($8<<24>>24);
    if ($10) {
     $$035$lcssa65 = $$03555;$$036$lcssa64 = $$03654;
     label = 6;
     break L1;
    }
    $11 = ((($$03555)) + 1|0);
    $12 = (($$03654) + -1)|0;
    $13 = $11;
    $14 = $13 & 3;
    $15 = ($14|0)!=(0);
    $16 = ($12|0)!=(0);
    $or$cond = $16 & $15;
    if ($or$cond) {
     $$03555 = $11;$$03654 = $12;
    } else {
     $$035$lcssa = $11;$$036$lcssa = $12;$$lcssa = $16;
     label = 5;
     break;
    }
   }
  } else {
   $$035$lcssa = $0;$$036$lcssa = $2;$$lcssa = $7;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$035$lcssa65 = $$035$lcssa;$$036$lcssa64 = $$036$lcssa;
   label = 6;
  } else {
   $$2 = $$035$lcssa;$$3 = 0;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $17 = HEAP8[$$035$lcssa65>>0]|0;
   $18 = $1&255;
   $19 = ($17<<24>>24)==($18<<24>>24);
   if ($19) {
    $$2 = $$035$lcssa65;$$3 = $$036$lcssa64;
   } else {
    $20 = Math_imul($3, 16843009)|0;
    $21 = ($$036$lcssa64>>>0)>(3);
    L11: do {
     if ($21) {
      $$046 = $$035$lcssa65;$$13745 = $$036$lcssa64;
      while(1) {
       $22 = HEAP32[$$046>>2]|0;
       $23 = $22 ^ $20;
       $24 = (($23) + -16843009)|0;
       $25 = $23 & -2139062144;
       $26 = $25 ^ -2139062144;
       $27 = $26 & $24;
       $28 = ($27|0)==(0);
       if (!($28)) {
        break;
       }
       $29 = ((($$046)) + 4|0);
       $30 = (($$13745) + -4)|0;
       $31 = ($30>>>0)>(3);
       if ($31) {
        $$046 = $29;$$13745 = $30;
       } else {
        $$0$lcssa = $29;$$137$lcssa = $30;
        label = 11;
        break L11;
       }
      }
      $$140 = $$046;$$23839 = $$13745;
     } else {
      $$0$lcssa = $$035$lcssa65;$$137$lcssa = $$036$lcssa64;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $32 = ($$137$lcssa|0)==(0);
     if ($32) {
      $$2 = $$0$lcssa;$$3 = 0;
      break;
     } else {
      $$140 = $$0$lcssa;$$23839 = $$137$lcssa;
     }
    }
    while(1) {
     $33 = HEAP8[$$140>>0]|0;
     $34 = ($33<<24>>24)==($18<<24>>24);
     if ($34) {
      $$2 = $$140;$$3 = $$23839;
      break L8;
     }
     $35 = ((($$140)) + 1|0);
     $36 = (($$23839) + -1)|0;
     $37 = ($36|0)==(0);
     if ($37) {
      $$2 = $35;$$3 = 0;
      break;
     } else {
      $$140 = $35;$$23839 = $36;
     }
    }
   }
  }
 } while(0);
 $38 = ($$3|0)!=(0);
 $39 = $38 ? $$2 : 0;
 return ($39|0);
}
function _pad($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$0$lcssa = 0, $$011 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(256|0);
 $5 = sp;
 $6 = $4 & 73728;
 $7 = ($6|0)==(0);
 $8 = ($2|0)>($3|0);
 $or$cond = $8 & $7;
 if ($or$cond) {
  $9 = (($2) - ($3))|0;
  $10 = $1 << 24 >> 24;
  $11 = ($9>>>0)<(256);
  $12 = $11 ? $9 : 256;
  (_memset(($5|0),($10|0),($12|0))|0);
  $13 = ($9>>>0)>(255);
  if ($13) {
   $14 = (($2) - ($3))|0;
   $$011 = $9;
   while(1) {
    _out_127($0,$5,256);
    $15 = (($$011) + -256)|0;
    $16 = ($15>>>0)>(255);
    if ($16) {
     $$011 = $15;
    } else {
     break;
    }
   }
   $17 = $14 & 255;
   $$0$lcssa = $17;
  } else {
   $$0$lcssa = $9;
  }
  _out_127($0,$5,$$0$lcssa);
 }
 STACKTOP = sp;return;
}
function _wctomb($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($0|0)==(0|0);
 if ($2) {
  $$0 = 0;
 } else {
  $3 = (_wcrtomb($0,$1,0)|0);
  $$0 = $3;
 }
 return ($$0|0);
}
function _fmt_fp($0,$1,$2,$3,$4,$5) {
 $0 = $0|0;
 $1 = +$1;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 var $$ = 0, $$$ = 0, $$$$564 = 0.0, $$$3484 = 0, $$$3484699 = 0, $$$3484700 = 0, $$$3501 = 0, $$$4502 = 0, $$$543 = 0.0, $$$564 = 0.0, $$0 = 0, $$0463$lcssa = 0, $$0463587 = 0, $$0464597 = 0, $$0471 = 0.0, $$0479 = 0, $$0487644 = 0, $$0488 = 0, $$0488655 = 0, $$0488657 = 0;
 var $$0496$$9 = 0, $$0497656 = 0, $$0498 = 0, $$0509585 = 0.0, $$0510 = 0, $$0511 = 0, $$0514639 = 0, $$0520 = 0, $$0521 = 0, $$0521$ = 0, $$0523 = 0, $$0527 = 0, $$0527$in633 = 0, $$0530638 = 0, $$1465 = 0, $$1467 = 0.0, $$1469 = 0.0, $$1472 = 0.0, $$1480 = 0, $$1482$lcssa = 0;
 var $$1482663 = 0, $$1489643 = 0, $$1499$lcssa = 0, $$1499662 = 0, $$1508586 = 0, $$1512$lcssa = 0, $$1512610 = 0, $$1515 = 0, $$1524 = 0, $$1526 = 0, $$1528617 = 0, $$1531$lcssa = 0, $$1531632 = 0, $$1601 = 0, $$2 = 0, $$2473 = 0.0, $$2476 = 0, $$2476$$549 = 0, $$2476$$551 = 0, $$2483$ph = 0;
 var $$2500 = 0, $$2513 = 0, $$2516621 = 0, $$2529 = 0, $$2532620 = 0, $$3 = 0.0, $$3477 = 0, $$3484$lcssa = 0, $$3484650 = 0, $$3501$lcssa = 0, $$3501649 = 0, $$3533616 = 0, $$4 = 0.0, $$4478$lcssa = 0, $$4478593 = 0, $$4492 = 0, $$4502 = 0, $$4518 = 0, $$5$lcssa = 0, $$534$ = 0;
 var $$540 = 0, $$540$ = 0, $$543 = 0.0, $$548 = 0, $$5486$lcssa = 0, $$5486626 = 0, $$5493600 = 0, $$550 = 0, $$5519$ph = 0, $$557 = 0, $$5605 = 0, $$561 = 0, $$564 = 0.0, $$6 = 0, $$6494592 = 0, $$7495604 = 0, $$7505 = 0, $$7505$ = 0, $$7505$ph = 0, $$8 = 0;
 var $$9$ph = 0, $$lcssa675 = 0, $$neg = 0, $$neg568 = 0, $$pn = 0, $$pr = 0, $$pr566 = 0, $$pre = 0, $$pre$phi691Z2D = 0, $$pre$phi698Z2D = 0, $$pre690 = 0, $$pre693 = 0, $$pre697 = 0, $$sink = 0, $$sink547$lcssa = 0, $$sink547625 = 0, $$sink560 = 0, $10 = 0, $100 = 0, $101 = 0;
 var $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0.0, $119 = 0.0, $12 = 0;
 var $120 = 0.0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0;
 var $139 = 0, $14 = 0.0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0;
 var $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0;
 var $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0;
 var $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0;
 var $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0;
 var $23 = 0, $230 = 0, $231 = 0.0, $232 = 0.0, $233 = 0, $234 = 0.0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0;
 var $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0;
 var $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0;
 var $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $30 = 0, $300 = 0, $301 = 0;
 var $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0;
 var $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0;
 var $339 = 0, $34 = 0.0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0.0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0;
 var $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0;
 var $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $not$ = 0, $or$cond = 0, $or$cond3$not = 0, $or$cond542 = 0, $or$cond545 = 0, $or$cond556 = 0, $or$cond6 = 0, $scevgep686 = 0, $scevgep686687 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 560|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(560|0);
 $6 = sp + 8|0;
 $7 = sp;
 $8 = sp + 524|0;
 $9 = $8;
 $10 = sp + 512|0;
 HEAP32[$7>>2] = 0;
 $11 = ((($10)) + 12|0);
 (___DOUBLE_BITS($1)|0);
 $12 = tempRet0;
 $13 = ($12|0)<(0);
 if ($13) {
  $14 = - $1;
  $$0471 = $14;$$0520 = 1;$$0521 = 5825;
 } else {
  $15 = $4 & 2048;
  $16 = ($15|0)==(0);
  $17 = $4 & 1;
  $18 = ($17|0)==(0);
  $$ = $18 ? (5826) : (5831);
  $$$ = $16 ? $$ : (5828);
  $19 = $4 & 2049;
  $20 = ($19|0)!=(0);
  $$534$ = $20&1;
  $$0471 = $1;$$0520 = $$534$;$$0521 = $$$;
 }
 (___DOUBLE_BITS($$0471)|0);
 $21 = tempRet0;
 $22 = $21 & 2146435072;
 $23 = (0)==(0);
 $24 = ($22|0)==(2146435072);
 $25 = $23 & $24;
 do {
  if ($25) {
   $26 = $5 & 32;
   $27 = ($26|0)!=(0);
   $28 = $27 ? 5844 : 5848;
   $29 = ($$0471 != $$0471) | (0.0 != 0.0);
   $30 = $27 ? 5852 : 5856;
   $$0510 = $29 ? $30 : $28;
   $31 = (($$0520) + 3)|0;
   $32 = $4 & -65537;
   _pad($0,32,$2,$31,$32);
   _out_127($0,$$0521,$$0520);
   _out_127($0,$$0510,3);
   $33 = $4 ^ 8192;
   _pad($0,32,$2,$31,$33);
   $$sink560 = $31;
  } else {
   $34 = (+_frexpl($$0471,$7));
   $35 = $34 * 2.0;
   $36 = $35 != 0.0;
   if ($36) {
    $37 = HEAP32[$7>>2]|0;
    $38 = (($37) + -1)|0;
    HEAP32[$7>>2] = $38;
   }
   $39 = $5 | 32;
   $40 = ($39|0)==(97);
   if ($40) {
    $41 = $5 & 32;
    $42 = ($41|0)==(0);
    $43 = ((($$0521)) + 9|0);
    $$0521$ = $42 ? $$0521 : $43;
    $44 = $$0520 | 2;
    $45 = ($3>>>0)>(11);
    $46 = (12 - ($3))|0;
    $47 = ($46|0)==(0);
    $48 = $45 | $47;
    do {
     if ($48) {
      $$1472 = $35;
     } else {
      $$0509585 = 8.0;$$1508586 = $46;
      while(1) {
       $49 = (($$1508586) + -1)|0;
       $50 = $$0509585 * 16.0;
       $51 = ($49|0)==(0);
       if ($51) {
        break;
       } else {
        $$0509585 = $50;$$1508586 = $49;
       }
      }
      $52 = HEAP8[$$0521$>>0]|0;
      $53 = ($52<<24>>24)==(45);
      if ($53) {
       $54 = - $35;
       $55 = $54 - $50;
       $56 = $50 + $55;
       $57 = - $56;
       $$1472 = $57;
       break;
      } else {
       $58 = $35 + $50;
       $59 = $58 - $50;
       $$1472 = $59;
       break;
      }
     }
    } while(0);
    $60 = HEAP32[$7>>2]|0;
    $61 = ($60|0)<(0);
    $62 = (0 - ($60))|0;
    $63 = $61 ? $62 : $60;
    $64 = ($63|0)<(0);
    $65 = $64 << 31 >> 31;
    $66 = (_fmt_u($63,$65,$11)|0);
    $67 = ($66|0)==($11|0);
    if ($67) {
     $68 = ((($10)) + 11|0);
     HEAP8[$68>>0] = 48;
     $$0511 = $68;
    } else {
     $$0511 = $66;
    }
    $69 = $60 >> 31;
    $70 = $69 & 2;
    $71 = (($70) + 43)|0;
    $72 = $71&255;
    $73 = ((($$0511)) + -1|0);
    HEAP8[$73>>0] = $72;
    $74 = (($5) + 15)|0;
    $75 = $74&255;
    $76 = ((($$0511)) + -2|0);
    HEAP8[$76>>0] = $75;
    $77 = ($3|0)<(1);
    $78 = $4 & 8;
    $79 = ($78|0)==(0);
    $$0523 = $8;$$2473 = $$1472;
    while(1) {
     $80 = (~~(($$2473)));
     $81 = (5860 + ($80)|0);
     $82 = HEAP8[$81>>0]|0;
     $83 = $82&255;
     $84 = $41 | $83;
     $85 = $84&255;
     $86 = ((($$0523)) + 1|0);
     HEAP8[$$0523>>0] = $85;
     $87 = (+($80|0));
     $88 = $$2473 - $87;
     $89 = $88 * 16.0;
     $90 = $86;
     $91 = (($90) - ($9))|0;
     $92 = ($91|0)==(1);
     if ($92) {
      $93 = $89 == 0.0;
      $or$cond3$not = $77 & $93;
      $or$cond = $79 & $or$cond3$not;
      if ($or$cond) {
       $$1524 = $86;
      } else {
       $94 = ((($$0523)) + 2|0);
       HEAP8[$86>>0] = 46;
       $$1524 = $94;
      }
     } else {
      $$1524 = $86;
     }
     $95 = $89 != 0.0;
     if ($95) {
      $$0523 = $$1524;$$2473 = $89;
     } else {
      break;
     }
    }
    $96 = ($3|0)==(0);
    $$pre693 = $$1524;
    if ($96) {
     label = 24;
    } else {
     $97 = (-2 - ($9))|0;
     $98 = (($97) + ($$pre693))|0;
     $99 = ($98|0)<($3|0);
     if ($99) {
      $100 = (($3) + 2)|0;
      $$pre690 = (($$pre693) - ($9))|0;
      $$pre$phi691Z2D = $$pre690;$$sink = $100;
     } else {
      label = 24;
     }
    }
    if ((label|0) == 24) {
     $101 = (($$pre693) - ($9))|0;
     $$pre$phi691Z2D = $101;$$sink = $101;
    }
    $102 = $11;
    $103 = $76;
    $104 = (($102) - ($103))|0;
    $105 = (($104) + ($44))|0;
    $106 = (($105) + ($$sink))|0;
    _pad($0,32,$2,$106,$4);
    _out_127($0,$$0521$,$44);
    $107 = $4 ^ 65536;
    _pad($0,48,$2,$106,$107);
    _out_127($0,$8,$$pre$phi691Z2D);
    $108 = (($$sink) - ($$pre$phi691Z2D))|0;
    _pad($0,48,$108,0,0);
    _out_127($0,$76,$104);
    $109 = $4 ^ 8192;
    _pad($0,32,$2,$106,$109);
    $$sink560 = $106;
    break;
   }
   $110 = ($3|0)<(0);
   $$540 = $110 ? 6 : $3;
   if ($36) {
    $111 = $35 * 268435456.0;
    $112 = HEAP32[$7>>2]|0;
    $113 = (($112) + -28)|0;
    HEAP32[$7>>2] = $113;
    $$3 = $111;$$pr = $113;
   } else {
    $$pre = HEAP32[$7>>2]|0;
    $$3 = $35;$$pr = $$pre;
   }
   $114 = ($$pr|0)<(0);
   $115 = ((($6)) + 288|0);
   $$561 = $114 ? $6 : $115;
   $$0498 = $$561;$$4 = $$3;
   while(1) {
    $116 = (~~(($$4))>>>0);
    HEAP32[$$0498>>2] = $116;
    $117 = ((($$0498)) + 4|0);
    $118 = (+($116>>>0));
    $119 = $$4 - $118;
    $120 = $119 * 1.0E+9;
    $121 = $120 != 0.0;
    if ($121) {
     $$0498 = $117;$$4 = $120;
    } else {
     break;
    }
   }
   $122 = ($$pr|0)>(0);
   if ($122) {
    $$1482663 = $$561;$$1499662 = $117;$123 = $$pr;
    while(1) {
     $124 = ($123|0)<(29);
     $125 = $124 ? $123 : 29;
     $$0488655 = ((($$1499662)) + -4|0);
     $126 = ($$0488655>>>0)<($$1482663>>>0);
     if ($126) {
      $$2483$ph = $$1482663;
     } else {
      $$0488657 = $$0488655;$$0497656 = 0;
      while(1) {
       $127 = HEAP32[$$0488657>>2]|0;
       $128 = (_bitshift64Shl(($127|0),0,($125|0))|0);
       $129 = tempRet0;
       $130 = (_i64Add(($128|0),($129|0),($$0497656|0),0)|0);
       $131 = tempRet0;
       $132 = (___uremdi3(($130|0),($131|0),1000000000,0)|0);
       $133 = tempRet0;
       HEAP32[$$0488657>>2] = $132;
       $134 = (___udivdi3(($130|0),($131|0),1000000000,0)|0);
       $135 = tempRet0;
       $$0488 = ((($$0488657)) + -4|0);
       $136 = ($$0488>>>0)<($$1482663>>>0);
       if ($136) {
        break;
       } else {
        $$0488657 = $$0488;$$0497656 = $134;
       }
      }
      $137 = ($134|0)==(0);
      if ($137) {
       $$2483$ph = $$1482663;
      } else {
       $138 = ((($$1482663)) + -4|0);
       HEAP32[$138>>2] = $134;
       $$2483$ph = $138;
      }
     }
     $$2500 = $$1499662;
     while(1) {
      $139 = ($$2500>>>0)>($$2483$ph>>>0);
      if (!($139)) {
       break;
      }
      $140 = ((($$2500)) + -4|0);
      $141 = HEAP32[$140>>2]|0;
      $142 = ($141|0)==(0);
      if ($142) {
       $$2500 = $140;
      } else {
       break;
      }
     }
     $143 = HEAP32[$7>>2]|0;
     $144 = (($143) - ($125))|0;
     HEAP32[$7>>2] = $144;
     $145 = ($144|0)>(0);
     if ($145) {
      $$1482663 = $$2483$ph;$$1499662 = $$2500;$123 = $144;
     } else {
      $$1482$lcssa = $$2483$ph;$$1499$lcssa = $$2500;$$pr566 = $144;
      break;
     }
    }
   } else {
    $$1482$lcssa = $$561;$$1499$lcssa = $117;$$pr566 = $$pr;
   }
   $146 = ($$pr566|0)<(0);
   if ($146) {
    $147 = (($$540) + 25)|0;
    $148 = (($147|0) / 9)&-1;
    $149 = (($148) + 1)|0;
    $150 = ($39|0)==(102);
    $$3484650 = $$1482$lcssa;$$3501649 = $$1499$lcssa;$152 = $$pr566;
    while(1) {
     $151 = (0 - ($152))|0;
     $153 = ($151|0)<(9);
     $154 = $153 ? $151 : 9;
     $155 = ($$3484650>>>0)<($$3501649>>>0);
     if ($155) {
      $159 = 1 << $154;
      $160 = (($159) + -1)|0;
      $161 = 1000000000 >>> $154;
      $$0487644 = 0;$$1489643 = $$3484650;
      while(1) {
       $162 = HEAP32[$$1489643>>2]|0;
       $163 = $162 & $160;
       $164 = $162 >>> $154;
       $165 = (($164) + ($$0487644))|0;
       HEAP32[$$1489643>>2] = $165;
       $166 = Math_imul($163, $161)|0;
       $167 = ((($$1489643)) + 4|0);
       $168 = ($167>>>0)<($$3501649>>>0);
       if ($168) {
        $$0487644 = $166;$$1489643 = $167;
       } else {
        break;
       }
      }
      $169 = HEAP32[$$3484650>>2]|0;
      $170 = ($169|0)==(0);
      $171 = ((($$3484650)) + 4|0);
      $$$3484 = $170 ? $171 : $$3484650;
      $172 = ($166|0)==(0);
      if ($172) {
       $$$3484700 = $$$3484;$$4502 = $$3501649;
      } else {
       $173 = ((($$3501649)) + 4|0);
       HEAP32[$$3501649>>2] = $166;
       $$$3484700 = $$$3484;$$4502 = $173;
      }
     } else {
      $156 = HEAP32[$$3484650>>2]|0;
      $157 = ($156|0)==(0);
      $158 = ((($$3484650)) + 4|0);
      $$$3484699 = $157 ? $158 : $$3484650;
      $$$3484700 = $$$3484699;$$4502 = $$3501649;
     }
     $174 = $150 ? $$561 : $$$3484700;
     $175 = $$4502;
     $176 = $174;
     $177 = (($175) - ($176))|0;
     $178 = $177 >> 2;
     $179 = ($178|0)>($149|0);
     $180 = (($174) + ($149<<2)|0);
     $$$4502 = $179 ? $180 : $$4502;
     $181 = HEAP32[$7>>2]|0;
     $182 = (($181) + ($154))|0;
     HEAP32[$7>>2] = $182;
     $183 = ($182|0)<(0);
     if ($183) {
      $$3484650 = $$$3484700;$$3501649 = $$$4502;$152 = $182;
     } else {
      $$3484$lcssa = $$$3484700;$$3501$lcssa = $$$4502;
      break;
     }
    }
   } else {
    $$3484$lcssa = $$1482$lcssa;$$3501$lcssa = $$1499$lcssa;
   }
   $184 = ($$3484$lcssa>>>0)<($$3501$lcssa>>>0);
   $185 = $$561;
   if ($184) {
    $186 = $$3484$lcssa;
    $187 = (($185) - ($186))|0;
    $188 = $187 >> 2;
    $189 = ($188*9)|0;
    $190 = HEAP32[$$3484$lcssa>>2]|0;
    $191 = ($190>>>0)<(10);
    if ($191) {
     $$1515 = $189;
    } else {
     $$0514639 = $189;$$0530638 = 10;
     while(1) {
      $192 = ($$0530638*10)|0;
      $193 = (($$0514639) + 1)|0;
      $194 = ($190>>>0)<($192>>>0);
      if ($194) {
       $$1515 = $193;
       break;
      } else {
       $$0514639 = $193;$$0530638 = $192;
      }
     }
    }
   } else {
    $$1515 = 0;
   }
   $195 = ($39|0)!=(102);
   $196 = $195 ? $$1515 : 0;
   $197 = (($$540) - ($196))|0;
   $198 = ($39|0)==(103);
   $199 = ($$540|0)!=(0);
   $200 = $199 & $198;
   $$neg = $200 << 31 >> 31;
   $201 = (($197) + ($$neg))|0;
   $202 = $$3501$lcssa;
   $203 = (($202) - ($185))|0;
   $204 = $203 >> 2;
   $205 = ($204*9)|0;
   $206 = (($205) + -9)|0;
   $207 = ($201|0)<($206|0);
   if ($207) {
    $208 = ((($$561)) + 4|0);
    $209 = (($201) + 9216)|0;
    $210 = (($209|0) / 9)&-1;
    $211 = (($210) + -1024)|0;
    $212 = (($208) + ($211<<2)|0);
    $213 = (($209|0) % 9)&-1;
    $214 = ($213|0)<(8);
    if ($214) {
     $$0527$in633 = $213;$$1531632 = 10;
     while(1) {
      $$0527 = (($$0527$in633) + 1)|0;
      $215 = ($$1531632*10)|0;
      $216 = ($$0527$in633|0)<(7);
      if ($216) {
       $$0527$in633 = $$0527;$$1531632 = $215;
      } else {
       $$1531$lcssa = $215;
       break;
      }
     }
    } else {
     $$1531$lcssa = 10;
    }
    $217 = HEAP32[$212>>2]|0;
    $218 = (($217>>>0) % ($$1531$lcssa>>>0))&-1;
    $219 = ($218|0)==(0);
    $220 = ((($212)) + 4|0);
    $221 = ($220|0)==($$3501$lcssa|0);
    $or$cond542 = $221 & $219;
    if ($or$cond542) {
     $$4492 = $212;$$4518 = $$1515;$$8 = $$3484$lcssa;
    } else {
     $222 = (($217>>>0) / ($$1531$lcssa>>>0))&-1;
     $223 = $222 & 1;
     $224 = ($223|0)==(0);
     $$543 = $224 ? 9007199254740992.0 : 9007199254740994.0;
     $225 = (($$1531$lcssa|0) / 2)&-1;
     $226 = ($218>>>0)<($225>>>0);
     $227 = ($218|0)==($225|0);
     $or$cond545 = $221 & $227;
     $$564 = $or$cond545 ? 1.0 : 1.5;
     $$$564 = $226 ? 0.5 : $$564;
     $228 = ($$0520|0)==(0);
     if ($228) {
      $$1467 = $$$564;$$1469 = $$543;
     } else {
      $229 = HEAP8[$$0521>>0]|0;
      $230 = ($229<<24>>24)==(45);
      $231 = - $$543;
      $232 = - $$$564;
      $$$543 = $230 ? $231 : $$543;
      $$$$564 = $230 ? $232 : $$$564;
      $$1467 = $$$$564;$$1469 = $$$543;
     }
     $233 = (($217) - ($218))|0;
     HEAP32[$212>>2] = $233;
     $234 = $$1469 + $$1467;
     $235 = $234 != $$1469;
     if ($235) {
      $236 = (($233) + ($$1531$lcssa))|0;
      HEAP32[$212>>2] = $236;
      $237 = ($236>>>0)>(999999999);
      if ($237) {
       $$5486626 = $$3484$lcssa;$$sink547625 = $212;
       while(1) {
        $238 = ((($$sink547625)) + -4|0);
        HEAP32[$$sink547625>>2] = 0;
        $239 = ($238>>>0)<($$5486626>>>0);
        if ($239) {
         $240 = ((($$5486626)) + -4|0);
         HEAP32[$240>>2] = 0;
         $$6 = $240;
        } else {
         $$6 = $$5486626;
        }
        $241 = HEAP32[$238>>2]|0;
        $242 = (($241) + 1)|0;
        HEAP32[$238>>2] = $242;
        $243 = ($242>>>0)>(999999999);
        if ($243) {
         $$5486626 = $$6;$$sink547625 = $238;
        } else {
         $$5486$lcssa = $$6;$$sink547$lcssa = $238;
         break;
        }
       }
      } else {
       $$5486$lcssa = $$3484$lcssa;$$sink547$lcssa = $212;
      }
      $244 = $$5486$lcssa;
      $245 = (($185) - ($244))|0;
      $246 = $245 >> 2;
      $247 = ($246*9)|0;
      $248 = HEAP32[$$5486$lcssa>>2]|0;
      $249 = ($248>>>0)<(10);
      if ($249) {
       $$4492 = $$sink547$lcssa;$$4518 = $247;$$8 = $$5486$lcssa;
      } else {
       $$2516621 = $247;$$2532620 = 10;
       while(1) {
        $250 = ($$2532620*10)|0;
        $251 = (($$2516621) + 1)|0;
        $252 = ($248>>>0)<($250>>>0);
        if ($252) {
         $$4492 = $$sink547$lcssa;$$4518 = $251;$$8 = $$5486$lcssa;
         break;
        } else {
         $$2516621 = $251;$$2532620 = $250;
        }
       }
      }
     } else {
      $$4492 = $212;$$4518 = $$1515;$$8 = $$3484$lcssa;
     }
    }
    $253 = ((($$4492)) + 4|0);
    $254 = ($$3501$lcssa>>>0)>($253>>>0);
    $$$3501 = $254 ? $253 : $$3501$lcssa;
    $$5519$ph = $$4518;$$7505$ph = $$$3501;$$9$ph = $$8;
   } else {
    $$5519$ph = $$1515;$$7505$ph = $$3501$lcssa;$$9$ph = $$3484$lcssa;
   }
   $$7505 = $$7505$ph;
   while(1) {
    $255 = ($$7505>>>0)>($$9$ph>>>0);
    if (!($255)) {
     $$lcssa675 = 0;
     break;
    }
    $256 = ((($$7505)) + -4|0);
    $257 = HEAP32[$256>>2]|0;
    $258 = ($257|0)==(0);
    if ($258) {
     $$7505 = $256;
    } else {
     $$lcssa675 = 1;
     break;
    }
   }
   $259 = (0 - ($$5519$ph))|0;
   do {
    if ($198) {
     $not$ = $199 ^ 1;
     $260 = $not$&1;
     $$540$ = (($$540) + ($260))|0;
     $261 = ($$540$|0)>($$5519$ph|0);
     $262 = ($$5519$ph|0)>(-5);
     $or$cond6 = $261 & $262;
     if ($or$cond6) {
      $263 = (($5) + -1)|0;
      $$neg568 = (($$540$) + -1)|0;
      $264 = (($$neg568) - ($$5519$ph))|0;
      $$0479 = $263;$$2476 = $264;
     } else {
      $265 = (($5) + -2)|0;
      $266 = (($$540$) + -1)|0;
      $$0479 = $265;$$2476 = $266;
     }
     $267 = $4 & 8;
     $268 = ($267|0)==(0);
     if ($268) {
      if ($$lcssa675) {
       $269 = ((($$7505)) + -4|0);
       $270 = HEAP32[$269>>2]|0;
       $271 = ($270|0)==(0);
       if ($271) {
        $$2529 = 9;
       } else {
        $272 = (($270>>>0) % 10)&-1;
        $273 = ($272|0)==(0);
        if ($273) {
         $$1528617 = 0;$$3533616 = 10;
         while(1) {
          $274 = ($$3533616*10)|0;
          $275 = (($$1528617) + 1)|0;
          $276 = (($270>>>0) % ($274>>>0))&-1;
          $277 = ($276|0)==(0);
          if ($277) {
           $$1528617 = $275;$$3533616 = $274;
          } else {
           $$2529 = $275;
           break;
          }
         }
        } else {
         $$2529 = 0;
        }
       }
      } else {
       $$2529 = 9;
      }
      $278 = $$0479 | 32;
      $279 = ($278|0)==(102);
      $280 = $$7505;
      $281 = (($280) - ($185))|0;
      $282 = $281 >> 2;
      $283 = ($282*9)|0;
      $284 = (($283) + -9)|0;
      if ($279) {
       $285 = (($284) - ($$2529))|0;
       $286 = ($285|0)>(0);
       $$548 = $286 ? $285 : 0;
       $287 = ($$2476|0)<($$548|0);
       $$2476$$549 = $287 ? $$2476 : $$548;
       $$1480 = $$0479;$$3477 = $$2476$$549;$$pre$phi698Z2D = 0;
       break;
      } else {
       $288 = (($284) + ($$5519$ph))|0;
       $289 = (($288) - ($$2529))|0;
       $290 = ($289|0)>(0);
       $$550 = $290 ? $289 : 0;
       $291 = ($$2476|0)<($$550|0);
       $$2476$$551 = $291 ? $$2476 : $$550;
       $$1480 = $$0479;$$3477 = $$2476$$551;$$pre$phi698Z2D = 0;
       break;
      }
     } else {
      $$1480 = $$0479;$$3477 = $$2476;$$pre$phi698Z2D = $267;
     }
    } else {
     $$pre697 = $4 & 8;
     $$1480 = $5;$$3477 = $$540;$$pre$phi698Z2D = $$pre697;
    }
   } while(0);
   $292 = $$3477 | $$pre$phi698Z2D;
   $293 = ($292|0)!=(0);
   $294 = $293&1;
   $295 = $$1480 | 32;
   $296 = ($295|0)==(102);
   if ($296) {
    $297 = ($$5519$ph|0)>(0);
    $298 = $297 ? $$5519$ph : 0;
    $$2513 = 0;$$pn = $298;
   } else {
    $299 = ($$5519$ph|0)<(0);
    $300 = $299 ? $259 : $$5519$ph;
    $301 = ($300|0)<(0);
    $302 = $301 << 31 >> 31;
    $303 = (_fmt_u($300,$302,$11)|0);
    $304 = $11;
    $305 = $303;
    $306 = (($304) - ($305))|0;
    $307 = ($306|0)<(2);
    if ($307) {
     $$1512610 = $303;
     while(1) {
      $308 = ((($$1512610)) + -1|0);
      HEAP8[$308>>0] = 48;
      $309 = $308;
      $310 = (($304) - ($309))|0;
      $311 = ($310|0)<(2);
      if ($311) {
       $$1512610 = $308;
      } else {
       $$1512$lcssa = $308;
       break;
      }
     }
    } else {
     $$1512$lcssa = $303;
    }
    $312 = $$5519$ph >> 31;
    $313 = $312 & 2;
    $314 = (($313) + 43)|0;
    $315 = $314&255;
    $316 = ((($$1512$lcssa)) + -1|0);
    HEAP8[$316>>0] = $315;
    $317 = $$1480&255;
    $318 = ((($$1512$lcssa)) + -2|0);
    HEAP8[$318>>0] = $317;
    $319 = $318;
    $320 = (($304) - ($319))|0;
    $$2513 = $318;$$pn = $320;
   }
   $321 = (($$0520) + 1)|0;
   $322 = (($321) + ($$3477))|0;
   $$1526 = (($322) + ($294))|0;
   $323 = (($$1526) + ($$pn))|0;
   _pad($0,32,$2,$323,$4);
   _out_127($0,$$0521,$$0520);
   $324 = $4 ^ 65536;
   _pad($0,48,$2,$323,$324);
   if ($296) {
    $325 = ($$9$ph>>>0)>($$561>>>0);
    $$0496$$9 = $325 ? $$561 : $$9$ph;
    $326 = ((($8)) + 9|0);
    $327 = $326;
    $328 = ((($8)) + 8|0);
    $$5493600 = $$0496$$9;
    while(1) {
     $329 = HEAP32[$$5493600>>2]|0;
     $330 = (_fmt_u($329,0,$326)|0);
     $331 = ($$5493600|0)==($$0496$$9|0);
     if ($331) {
      $337 = ($330|0)==($326|0);
      if ($337) {
       HEAP8[$328>>0] = 48;
       $$1465 = $328;
      } else {
       $$1465 = $330;
      }
     } else {
      $332 = ($330>>>0)>($8>>>0);
      if ($332) {
       $333 = $330;
       $334 = (($333) - ($9))|0;
       _memset(($8|0),48,($334|0))|0;
       $$0464597 = $330;
       while(1) {
        $335 = ((($$0464597)) + -1|0);
        $336 = ($335>>>0)>($8>>>0);
        if ($336) {
         $$0464597 = $335;
        } else {
         $$1465 = $335;
         break;
        }
       }
      } else {
       $$1465 = $330;
      }
     }
     $338 = $$1465;
     $339 = (($327) - ($338))|0;
     _out_127($0,$$1465,$339);
     $340 = ((($$5493600)) + 4|0);
     $341 = ($340>>>0)>($$561>>>0);
     if ($341) {
      break;
     } else {
      $$5493600 = $340;
     }
    }
    $342 = ($292|0)==(0);
    if (!($342)) {
     _out_127($0,5876,1);
    }
    $343 = ($340>>>0)<($$7505>>>0);
    $344 = ($$3477|0)>(0);
    $345 = $343 & $344;
    if ($345) {
     $$4478593 = $$3477;$$6494592 = $340;
     while(1) {
      $346 = HEAP32[$$6494592>>2]|0;
      $347 = (_fmt_u($346,0,$326)|0);
      $348 = ($347>>>0)>($8>>>0);
      if ($348) {
       $349 = $347;
       $350 = (($349) - ($9))|0;
       _memset(($8|0),48,($350|0))|0;
       $$0463587 = $347;
       while(1) {
        $351 = ((($$0463587)) + -1|0);
        $352 = ($351>>>0)>($8>>>0);
        if ($352) {
         $$0463587 = $351;
        } else {
         $$0463$lcssa = $351;
         break;
        }
       }
      } else {
       $$0463$lcssa = $347;
      }
      $353 = ($$4478593|0)<(9);
      $354 = $353 ? $$4478593 : 9;
      _out_127($0,$$0463$lcssa,$354);
      $355 = ((($$6494592)) + 4|0);
      $356 = (($$4478593) + -9)|0;
      $357 = ($355>>>0)<($$7505>>>0);
      $358 = ($$4478593|0)>(9);
      $359 = $357 & $358;
      if ($359) {
       $$4478593 = $356;$$6494592 = $355;
      } else {
       $$4478$lcssa = $356;
       break;
      }
     }
    } else {
     $$4478$lcssa = $$3477;
    }
    $360 = (($$4478$lcssa) + 9)|0;
    _pad($0,48,$360,9,0);
   } else {
    $361 = ((($$9$ph)) + 4|0);
    $$7505$ = $$lcssa675 ? $$7505 : $361;
    $362 = ($$3477|0)>(-1);
    if ($362) {
     $363 = ((($8)) + 9|0);
     $364 = ($$pre$phi698Z2D|0)==(0);
     $365 = $363;
     $366 = (0 - ($9))|0;
     $367 = ((($8)) + 8|0);
     $$5605 = $$3477;$$7495604 = $$9$ph;
     while(1) {
      $368 = HEAP32[$$7495604>>2]|0;
      $369 = (_fmt_u($368,0,$363)|0);
      $370 = ($369|0)==($363|0);
      if ($370) {
       HEAP8[$367>>0] = 48;
       $$0 = $367;
      } else {
       $$0 = $369;
      }
      $371 = ($$7495604|0)==($$9$ph|0);
      do {
       if ($371) {
        $375 = ((($$0)) + 1|0);
        _out_127($0,$$0,1);
        $376 = ($$5605|0)<(1);
        $or$cond556 = $364 & $376;
        if ($or$cond556) {
         $$2 = $375;
         break;
        }
        _out_127($0,5876,1);
        $$2 = $375;
       } else {
        $372 = ($$0>>>0)>($8>>>0);
        if (!($372)) {
         $$2 = $$0;
         break;
        }
        $scevgep686 = (($$0) + ($366)|0);
        $scevgep686687 = $scevgep686;
        _memset(($8|0),48,($scevgep686687|0))|0;
        $$1601 = $$0;
        while(1) {
         $373 = ((($$1601)) + -1|0);
         $374 = ($373>>>0)>($8>>>0);
         if ($374) {
          $$1601 = $373;
         } else {
          $$2 = $373;
          break;
         }
        }
       }
      } while(0);
      $377 = $$2;
      $378 = (($365) - ($377))|0;
      $379 = ($$5605|0)>($378|0);
      $380 = $379 ? $378 : $$5605;
      _out_127($0,$$2,$380);
      $381 = (($$5605) - ($378))|0;
      $382 = ((($$7495604)) + 4|0);
      $383 = ($382>>>0)<($$7505$>>>0);
      $384 = ($381|0)>(-1);
      $385 = $383 & $384;
      if ($385) {
       $$5605 = $381;$$7495604 = $382;
      } else {
       $$5$lcssa = $381;
       break;
      }
     }
    } else {
     $$5$lcssa = $$3477;
    }
    $386 = (($$5$lcssa) + 18)|0;
    _pad($0,48,$386,18,0);
    $387 = $11;
    $388 = $$2513;
    $389 = (($387) - ($388))|0;
    _out_127($0,$$2513,$389);
   }
   $390 = $4 ^ 8192;
   _pad($0,32,$2,$323,$390);
   $$sink560 = $323;
  }
 } while(0);
 $391 = ($$sink560|0)<($2|0);
 $$557 = $391 ? $2 : $$sink560;
 STACKTOP = sp;return ($$557|0);
}
function ___DOUBLE_BITS($0) {
 $0 = +$0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $0;$1 = HEAP32[tempDoublePtr>>2]|0;
 $2 = HEAP32[tempDoublePtr+4>>2]|0;
 tempRet0 = ($2);
 return ($1|0);
}
function _frexpl($0,$1) {
 $0 = +$0;
 $1 = $1|0;
 var $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (+_frexp($0,$1));
 return (+$2);
}
function _frexp($0,$1) {
 $0 = +$0;
 $1 = $1|0;
 var $$0 = 0.0, $$016 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, $storemerge = 0, $trunc$clear = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $0;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = (_bitshift64Lshr(($2|0),($3|0),52)|0);
 $5 = tempRet0;
 $6 = $4&65535;
 $trunc$clear = $6 & 2047;
 switch ($trunc$clear<<16>>16) {
 case 0:  {
  $7 = $0 != 0.0;
  if ($7) {
   $8 = $0 * 1.8446744073709552E+19;
   $9 = (+_frexp($8,$1));
   $10 = HEAP32[$1>>2]|0;
   $11 = (($10) + -64)|0;
   $$016 = $9;$storemerge = $11;
  } else {
   $$016 = $0;$storemerge = 0;
  }
  HEAP32[$1>>2] = $storemerge;
  $$0 = $$016;
  break;
 }
 case 2047:  {
  $$0 = $0;
  break;
 }
 default: {
  $12 = $4 & 2047;
  $13 = (($12) + -1022)|0;
  HEAP32[$1>>2] = $13;
  $14 = $3 & -2146435073;
  $15 = $14 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $2;HEAP32[tempDoublePtr+4>>2] = $15;$16 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $16;
 }
 }
 return (+$$0);
}
function ___pthread_self_186() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_pthread_self()|0);
 return ($0|0);
}
function ___strerror_l($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$012$lcssa = 0, $$01214 = 0, $$016 = 0, $$113 = 0, $$115 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $$016 = 0;
 while(1) {
  $3 = (5878 + ($$016)|0);
  $4 = HEAP8[$3>>0]|0;
  $5 = $4&255;
  $6 = ($5|0)==($0|0);
  if ($6) {
   label = 2;
   break;
  }
  $7 = (($$016) + 1)|0;
  $8 = ($7|0)==(87);
  if ($8) {
   $$01214 = 5966;$$115 = 87;
   label = 5;
   break;
  } else {
   $$016 = $7;
  }
 }
 if ((label|0) == 2) {
  $2 = ($$016|0)==(0);
  if ($2) {
   $$012$lcssa = 5966;
  } else {
   $$01214 = 5966;$$115 = $$016;
   label = 5;
  }
 }
 if ((label|0) == 5) {
  while(1) {
   label = 0;
   $$113 = $$01214;
   while(1) {
    $9 = HEAP8[$$113>>0]|0;
    $10 = ($9<<24>>24)==(0);
    $11 = ((($$113)) + 1|0);
    if ($10) {
     break;
    } else {
     $$113 = $11;
    }
   }
   $12 = (($$115) + -1)|0;
   $13 = ($12|0)==(0);
   if ($13) {
    $$012$lcssa = $11;
    break;
   } else {
    $$01214 = $11;$$115 = $12;
    label = 5;
   }
  }
 }
 $14 = ((($1)) + 20|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = (___lctrans($$012$lcssa,$15)|0);
 return ($16|0);
}
function ___lctrans($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (___lctrans_impl($0,$1)|0);
 return ($2|0);
}
function ___lctrans_impl($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $$0 = 0;
 } else {
  $3 = HEAP32[$1>>2]|0;
  $4 = ((($1)) + 4|0);
  $5 = HEAP32[$4>>2]|0;
  $6 = (___mo_lookup($3,$5,$0)|0);
  $$0 = $6;
 }
 $7 = ($$0|0)!=(0|0);
 $8 = $7 ? $$0 : $0;
 return ($8|0);
}
function ___mo_lookup($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$ = 0, $$090 = 0, $$094 = 0, $$191 = 0, $$195 = 0, $$4 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond102 = 0, $or$cond104 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = HEAP32[$0>>2]|0;
 $4 = (($3) + 1794895138)|0;
 $5 = ((($0)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (_swapc($6,$4)|0);
 $8 = ((($0)) + 12|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = (_swapc($9,$4)|0);
 $11 = ((($0)) + 16|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = (_swapc($12,$4)|0);
 $14 = $1 >>> 2;
 $15 = ($7>>>0)<($14>>>0);
 L1: do {
  if ($15) {
   $16 = $7 << 2;
   $17 = (($1) - ($16))|0;
   $18 = ($10>>>0)<($17>>>0);
   $19 = ($13>>>0)<($17>>>0);
   $or$cond = $18 & $19;
   if ($or$cond) {
    $20 = $13 | $10;
    $21 = $20 & 3;
    $22 = ($21|0)==(0);
    if ($22) {
     $23 = $10 >>> 2;
     $24 = $13 >>> 2;
     $$090 = 0;$$094 = $7;
     while(1) {
      $25 = $$094 >>> 1;
      $26 = (($$090) + ($25))|0;
      $27 = $26 << 1;
      $28 = (($27) + ($23))|0;
      $29 = (($0) + ($28<<2)|0);
      $30 = HEAP32[$29>>2]|0;
      $31 = (_swapc($30,$4)|0);
      $32 = (($28) + 1)|0;
      $33 = (($0) + ($32<<2)|0);
      $34 = HEAP32[$33>>2]|0;
      $35 = (_swapc($34,$4)|0);
      $36 = ($35>>>0)<($1>>>0);
      $37 = (($1) - ($35))|0;
      $38 = ($31>>>0)<($37>>>0);
      $or$cond102 = $36 & $38;
      if (!($or$cond102)) {
       $$4 = 0;
       break L1;
      }
      $39 = (($35) + ($31))|0;
      $40 = (($0) + ($39)|0);
      $41 = HEAP8[$40>>0]|0;
      $42 = ($41<<24>>24)==(0);
      if (!($42)) {
       $$4 = 0;
       break L1;
      }
      $43 = (($0) + ($35)|0);
      $44 = (_strcmp($2,$43)|0);
      $45 = ($44|0)==(0);
      if ($45) {
       break;
      }
      $62 = ($$094|0)==(1);
      $63 = ($44|0)<(0);
      $64 = (($$094) - ($25))|0;
      $$195 = $63 ? $25 : $64;
      $$191 = $63 ? $$090 : $26;
      if ($62) {
       $$4 = 0;
       break L1;
      } else {
       $$090 = $$191;$$094 = $$195;
      }
     }
     $46 = (($27) + ($24))|0;
     $47 = (($0) + ($46<<2)|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = (_swapc($48,$4)|0);
     $50 = (($46) + 1)|0;
     $51 = (($0) + ($50<<2)|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = (_swapc($52,$4)|0);
     $54 = ($53>>>0)<($1>>>0);
     $55 = (($1) - ($53))|0;
     $56 = ($49>>>0)<($55>>>0);
     $or$cond104 = $54 & $56;
     if ($or$cond104) {
      $57 = (($0) + ($53)|0);
      $58 = (($53) + ($49))|0;
      $59 = (($0) + ($58)|0);
      $60 = HEAP8[$59>>0]|0;
      $61 = ($60<<24>>24)==(0);
      $$ = $61 ? $57 : 0;
      $$4 = $$;
     } else {
      $$4 = 0;
     }
    } else {
     $$4 = 0;
    }
   } else {
    $$4 = 0;
   }
  } else {
   $$4 = 0;
  }
 } while(0);
 return ($$4|0);
}
function _swapc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$ = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1|0)==(0);
 $3 = (_llvm_bswap_i32(($0|0))|0);
 $$ = $2 ? $0 : $3;
 return ($$|0);
}
function ___fwritex($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$038 = 0, $$042 = 0, $$1 = 0, $$139 = 0, $$141 = 0, $$143 = 0, $$pre = 0, $$pre47 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ((($2)) + 16|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)==(0|0);
 if ($5) {
  $7 = (___towrite($2)|0);
  $8 = ($7|0)==(0);
  if ($8) {
   $$pre = HEAP32[$3>>2]|0;
   $12 = $$pre;
   label = 5;
  } else {
   $$1 = 0;
  }
 } else {
  $6 = $4;
  $12 = $6;
  label = 5;
 }
 L5: do {
  if ((label|0) == 5) {
   $9 = ((($2)) + 20|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = (($12) - ($10))|0;
   $13 = ($11>>>0)<($1>>>0);
   $14 = $10;
   if ($13) {
    $15 = ((($2)) + 36|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (FUNCTION_TABLE_iiii[$16 & 127]($2,$0,$1)|0);
    $$1 = $17;
    break;
   }
   $18 = ((($2)) + 75|0);
   $19 = HEAP8[$18>>0]|0;
   $20 = ($19<<24>>24)>(-1);
   L10: do {
    if ($20) {
     $$038 = $1;
     while(1) {
      $21 = ($$038|0)==(0);
      if ($21) {
       $$139 = 0;$$141 = $0;$$143 = $1;$31 = $14;
       break L10;
      }
      $22 = (($$038) + -1)|0;
      $23 = (($0) + ($22)|0);
      $24 = HEAP8[$23>>0]|0;
      $25 = ($24<<24>>24)==(10);
      if ($25) {
       break;
      } else {
       $$038 = $22;
      }
     }
     $26 = ((($2)) + 36|0);
     $27 = HEAP32[$26>>2]|0;
     $28 = (FUNCTION_TABLE_iiii[$27 & 127]($2,$0,$$038)|0);
     $29 = ($28>>>0)<($$038>>>0);
     if ($29) {
      $$1 = $28;
      break L5;
     }
     $30 = (($0) + ($$038)|0);
     $$042 = (($1) - ($$038))|0;
     $$pre47 = HEAP32[$9>>2]|0;
     $$139 = $$038;$$141 = $30;$$143 = $$042;$31 = $$pre47;
    } else {
     $$139 = 0;$$141 = $0;$$143 = $1;$31 = $14;
    }
   } while(0);
   (_memcpy(($31|0),($$141|0),($$143|0))|0);
   $32 = HEAP32[$9>>2]|0;
   $33 = (($32) + ($$143)|0);
   HEAP32[$9>>2] = $33;
   $34 = (($$139) + ($$143))|0;
   $$1 = $34;
  }
 } while(0);
 return ($$1|0);
}
function _fflush($0) {
 $0 = $0|0;
 var $$0 = 0, $$023 = 0, $$02325 = 0, $$02327 = 0, $$024$lcssa = 0, $$02426 = 0, $$1 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $phitmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0|0);
 do {
  if ($1) {
   $8 = HEAP32[248]|0;
   $9 = ($8|0)==(0|0);
   if ($9) {
    $29 = 0;
   } else {
    $10 = HEAP32[248]|0;
    $11 = (_fflush($10)|0);
    $29 = $11;
   }
   $12 = (___ofl_lock()|0);
   $$02325 = HEAP32[$12>>2]|0;
   $13 = ($$02325|0)==(0|0);
   if ($13) {
    $$024$lcssa = $29;
   } else {
    $$02327 = $$02325;$$02426 = $29;
    while(1) {
     $14 = ((($$02327)) + 76|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ($15|0)>(-1);
     if ($16) {
      $17 = (___lockfile($$02327)|0);
      $25 = $17;
     } else {
      $25 = 0;
     }
     $18 = ((($$02327)) + 20|0);
     $19 = HEAP32[$18>>2]|0;
     $20 = ((($$02327)) + 28|0);
     $21 = HEAP32[$20>>2]|0;
     $22 = ($19>>>0)>($21>>>0);
     if ($22) {
      $23 = (___fflush_unlocked($$02327)|0);
      $24 = $23 | $$02426;
      $$1 = $24;
     } else {
      $$1 = $$02426;
     }
     $26 = ($25|0)==(0);
     if (!($26)) {
      ___unlockfile($$02327);
     }
     $27 = ((($$02327)) + 56|0);
     $$023 = HEAP32[$27>>2]|0;
     $28 = ($$023|0)==(0|0);
     if ($28) {
      $$024$lcssa = $$1;
      break;
     } else {
      $$02327 = $$023;$$02426 = $$1;
     }
    }
   }
   ___ofl_unlock();
   $$0 = $$024$lcssa;
  } else {
   $2 = ((($0)) + 76|0);
   $3 = HEAP32[$2>>2]|0;
   $4 = ($3|0)>(-1);
   if (!($4)) {
    $5 = (___fflush_unlocked($0)|0);
    $$0 = $5;
    break;
   }
   $6 = (___lockfile($0)|0);
   $phitmp = ($6|0)==(0);
   $7 = (___fflush_unlocked($0)|0);
   if ($phitmp) {
    $$0 = $7;
   } else {
    ___unlockfile($0);
    $$0 = $7;
   }
  }
 } while(0);
 return ($$0|0);
}
function ___fflush_unlocked($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ((($0)) + 20|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($0)) + 28|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($2>>>0)>($4>>>0);
 if ($5) {
  $6 = ((($0)) + 36|0);
  $7 = HEAP32[$6>>2]|0;
  (FUNCTION_TABLE_iiii[$7 & 127]($0,0,0)|0);
  $8 = HEAP32[$1>>2]|0;
  $9 = ($8|0)==(0|0);
  if ($9) {
   $$0 = -1;
  } else {
   label = 3;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $10 = ((($0)) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = ((($0)) + 8|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($11>>>0)<($13>>>0);
  if ($14) {
   $15 = $11;
   $16 = $13;
   $17 = (($15) - ($16))|0;
   $18 = ((($0)) + 40|0);
   $19 = HEAP32[$18>>2]|0;
   (FUNCTION_TABLE_iiii[$19 & 127]($0,$17,1)|0);
  }
  $20 = ((($0)) + 16|0);
  HEAP32[$20>>2] = 0;
  HEAP32[$3>>2] = 0;
  HEAP32[$1>>2] = 0;
  HEAP32[$12>>2] = 0;
  HEAP32[$10>>2] = 0;
  $$0 = 0;
 }
 return ($$0|0);
}
function _fputc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ((($1)) + 76|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)<(0);
 if ($4) {
  label = 3;
 } else {
  $5 = (___lockfile($1)|0);
  $6 = ($5|0)==(0);
  if ($6) {
   label = 3;
  } else {
   $20 = $0&255;
   $21 = $0 & 255;
   $22 = ((($1)) + 75|0);
   $23 = HEAP8[$22>>0]|0;
   $24 = $23 << 24 >> 24;
   $25 = ($21|0)==($24|0);
   if ($25) {
    label = 10;
   } else {
    $26 = ((($1)) + 20|0);
    $27 = HEAP32[$26>>2]|0;
    $28 = ((($1)) + 16|0);
    $29 = HEAP32[$28>>2]|0;
    $30 = ($27>>>0)<($29>>>0);
    if ($30) {
     $31 = ((($27)) + 1|0);
     HEAP32[$26>>2] = $31;
     HEAP8[$27>>0] = $20;
     $33 = $21;
    } else {
     label = 10;
    }
   }
   if ((label|0) == 10) {
    $32 = (___overflow($1,$0)|0);
    $33 = $32;
   }
   ___unlockfile($1);
   $$0 = $33;
  }
 }
 do {
  if ((label|0) == 3) {
   $7 = $0&255;
   $8 = $0 & 255;
   $9 = ((($1)) + 75|0);
   $10 = HEAP8[$9>>0]|0;
   $11 = $10 << 24 >> 24;
   $12 = ($8|0)==($11|0);
   if (!($12)) {
    $13 = ((($1)) + 20|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = ((($1)) + 16|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ($14>>>0)<($16>>>0);
    if ($17) {
     $18 = ((($14)) + 1|0);
     HEAP32[$13>>2] = $18;
     HEAP8[$14>>0] = $7;
     $$0 = $8;
     break;
    }
   }
   $19 = (___overflow($1,$0)|0);
   $$0 = $19;
  }
 } while(0);
 return ($$0|0);
}
function ___strdup($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = (_strlen($0)|0);
 $2 = (($1) + 1)|0;
 $3 = (_malloc($2)|0);
 $4 = ($3|0)==(0|0);
 if ($4) {
  $$0 = 0;
 } else {
  $5 = (_memcpy(($3|0),($0|0),($2|0))|0);
  $$0 = $5;
 }
 return ($$0|0);
}
function __ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _abort();
 // unreachable;
}
function __Znwj($0) {
 $0 = $0|0;
 var $$ = 0, $$lcssa = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0);
 $$ = $1 ? 1 : $0;
 while(1) {
  $2 = (_malloc($$)|0);
  $3 = ($2|0)==(0|0);
  if (!($3)) {
   $$lcssa = $2;
   break;
  }
  $4 = (__ZSt15get_new_handlerv()|0);
  $5 = ($4|0)==(0|0);
  if ($5) {
   $$lcssa = 0;
   break;
  }
  FUNCTION_TABLE_v[$4 & 255]();
 }
 return ($$lcssa|0);
}
function __ZdlPv($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _free($0);
 return;
}
function __ZNKSt3__221__basic_string_commonILb1EE20__throw_length_errorEv($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _abort();
 // unreachable;
}
function __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ((($0)) + 11|0);
 $2 = HEAP8[$1>>0]|0;
 $3 = ($2<<24>>24)<(0);
 if ($3) {
  $4 = HEAP32[$0>>2]|0;
  __ZdlPv($4);
 }
 return;
}
function __ZL25default_terminate_handlerv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer10 = 0, $vararg_buffer3 = 0, $vararg_buffer7 = 0, $vararg_ptr1 = 0;
 var $vararg_ptr2 = 0, $vararg_ptr6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $vararg_buffer10 = sp + 32|0;
 $vararg_buffer7 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $0 = sp + 36|0;
 $1 = (___cxa_get_globals_fast()|0);
 $2 = ($1|0)==(0|0);
 if (!($2)) {
  $3 = HEAP32[$1>>2]|0;
  $4 = ($3|0)==(0|0);
  if (!($4)) {
   $5 = ((($3)) + 80|0);
   $6 = ((($3)) + 48|0);
   $7 = $6;
   $8 = $7;
   $9 = HEAP32[$8>>2]|0;
   $10 = (($7) + 4)|0;
   $11 = $10;
   $12 = HEAP32[$11>>2]|0;
   $13 = $9 & -256;
   $14 = ($13|0)==(1126902528);
   $15 = ($12|0)==(1129074247);
   $16 = $14 & $15;
   if (!($16)) {
    HEAP32[$vararg_buffer7>>2] = 7906;
    _abort_message(7856,$vararg_buffer7);
    // unreachable;
   }
   $17 = ($9|0)==(1126902529);
   $18 = ($12|0)==(1129074247);
   $19 = $17 & $18;
   if ($19) {
    $20 = ((($3)) + 44|0);
    $21 = HEAP32[$20>>2]|0;
    $22 = $21;
   } else {
    $22 = $5;
   }
   HEAP32[$0>>2] = $22;
   $23 = HEAP32[$3>>2]|0;
   $24 = ((($23)) + 4|0);
   $25 = HEAP32[$24>>2]|0;
   $26 = HEAP32[124]|0;
   $27 = ((($26)) + 16|0);
   $28 = HEAP32[$27>>2]|0;
   $29 = (FUNCTION_TABLE_iiii[$28 & 127](496,$23,$0)|0);
   if ($29) {
    $30 = HEAP32[$0>>2]|0;
    $31 = HEAP32[$30>>2]|0;
    $32 = ((($31)) + 8|0);
    $33 = HEAP32[$32>>2]|0;
    $34 = (FUNCTION_TABLE_ii[$33 & 127]($30)|0);
    HEAP32[$vararg_buffer>>2] = 7906;
    $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
    HEAP32[$vararg_ptr1>>2] = $25;
    $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
    HEAP32[$vararg_ptr2>>2] = $34;
    _abort_message(7770,$vararg_buffer);
    // unreachable;
   } else {
    HEAP32[$vararg_buffer3>>2] = 7906;
    $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
    HEAP32[$vararg_ptr6>>2] = $25;
    _abort_message(7815,$vararg_buffer3);
    // unreachable;
   }
  }
 }
 _abort_message(7894,$vararg_buffer10);
 // unreachable;
}
function ___cxa_get_globals_fast() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 $0 = (_pthread_once((9032|0),(166|0))|0);
 $1 = ($0|0)==(0);
 if ($1) {
  $2 = HEAP32[2259]|0;
  $3 = (_pthread_getspecific(($2|0))|0);
  STACKTOP = sp;return ($3|0);
 } else {
  _abort_message(8045,$vararg_buffer);
  // unreachable;
 }
 return (0)|0;
}
function _abort_message($0,$varargs) {
 $0 = $0|0;
 $varargs = $varargs|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 HEAP32[$1>>2] = $varargs;
 $2 = HEAP32[249]|0;
 (_vfprintf($2,$0,$1)|0);
 (_fputc(10,$2)|0);
 _abort();
 // unreachable;
}
function __ZN10__cxxabiv116__shim_type_infoD2Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv117__class_type_infoD0Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10__cxxabiv116__shim_type_infoD2Ev($0);
 __ZdlPv($0);
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $$2 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $3 = sp;
 $4 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$1,0)|0);
 if ($4) {
  $$2 = 1;
 } else {
  $5 = ($1|0)==(0|0);
  if ($5) {
   $$2 = 0;
  } else {
   $6 = (___dynamic_cast($1,520,504,0)|0);
   $7 = ($6|0)==(0|0);
   if ($7) {
    $$2 = 0;
   } else {
    $8 = ((($3)) + 4|0);
    dest=$8; stop=dest+52|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
    HEAP32[$3>>2] = $6;
    $9 = ((($3)) + 8|0);
    HEAP32[$9>>2] = $0;
    $10 = ((($3)) + 12|0);
    HEAP32[$10>>2] = -1;
    $11 = ((($3)) + 48|0);
    HEAP32[$11>>2] = 1;
    $12 = HEAP32[$6>>2]|0;
    $13 = ((($12)) + 28|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = HEAP32[$2>>2]|0;
    FUNCTION_TABLE_viiii[$14 & 127]($6,$3,$15,1);
    $16 = ((($3)) + 24|0);
    $17 = HEAP32[$16>>2]|0;
    $18 = ($17|0)==(1);
    if ($18) {
     $19 = ((($3)) + 16|0);
     $20 = HEAP32[$19>>2]|0;
     HEAP32[$2>>2] = $20;
     $$0 = 1;
    } else {
     $$0 = 0;
    }
    $$2 = $$0;
   }
  }
 }
 STACKTOP = sp;return ($$2|0);
}
function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($0,$1,$2,$3,$4,$5) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 var $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $6 = ((($1)) + 8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$7,$5)|0);
 if ($8) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$1,$2,$3,$4);
 }
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $5 = ((($1)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$6,$4)|0);
 do {
  if ($7) {
   __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi(0,$1,$2,$3);
  } else {
   $8 = HEAP32[$1>>2]|0;
   $9 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$8,$4)|0);
   if ($9) {
    $10 = ((($1)) + 16|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ($11|0)==($2|0);
    if (!($12)) {
     $13 = ((($1)) + 20|0);
     $14 = HEAP32[$13>>2]|0;
     $15 = ($14|0)==($2|0);
     if (!($15)) {
      $18 = ((($1)) + 32|0);
      HEAP32[$18>>2] = $3;
      HEAP32[$13>>2] = $2;
      $19 = ((($1)) + 40|0);
      $20 = HEAP32[$19>>2]|0;
      $21 = (($20) + 1)|0;
      HEAP32[$19>>2] = $21;
      $22 = ((($1)) + 36|0);
      $23 = HEAP32[$22>>2]|0;
      $24 = ($23|0)==(1);
      if ($24) {
       $25 = ((($1)) + 24|0);
       $26 = HEAP32[$25>>2]|0;
       $27 = ($26|0)==(2);
       if ($27) {
        $28 = ((($1)) + 54|0);
        HEAP8[$28>>0] = 1;
       }
      }
      $29 = ((($1)) + 44|0);
      HEAP32[$29>>2] = 4;
      break;
     }
    }
    $16 = ($3|0)==(1);
    if ($16) {
     $17 = ((($1)) + 32|0);
     HEAP32[$17>>2] = 1;
    }
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $4 = ((($1)) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$5,0)|0);
 if ($6) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$1,$2,$3);
 }
 return;
}
function __ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($0|0)==($1|0);
 return ($3|0);
}
function __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $4 = ((($1)) + 16|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==(0|0);
 do {
  if ($6) {
   HEAP32[$4>>2] = $2;
   $7 = ((($1)) + 24|0);
   HEAP32[$7>>2] = $3;
   $8 = ((($1)) + 36|0);
   HEAP32[$8>>2] = 1;
  } else {
   $9 = ($5|0)==($2|0);
   if (!($9)) {
    $13 = ((($1)) + 36|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = (($14) + 1)|0;
    HEAP32[$13>>2] = $15;
    $16 = ((($1)) + 24|0);
    HEAP32[$16>>2] = 2;
    $17 = ((($1)) + 54|0);
    HEAP8[$17>>0] = 1;
    break;
   }
   $10 = ((($1)) + 24|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==(2);
   if ($12) {
    HEAP32[$10>>2] = $3;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $4 = ((($1)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==($2|0);
 if ($6) {
  $7 = ((($1)) + 28|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ($8|0)==(1);
  if (!($9)) {
   HEAP32[$7>>2] = $3;
  }
 }
 return;
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond22 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $5 = ((($1)) + 53|0);
 HEAP8[$5>>0] = 1;
 $6 = ((($1)) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)==($3|0);
 do {
  if ($8) {
   $9 = ((($1)) + 52|0);
   HEAP8[$9>>0] = 1;
   $10 = ((($1)) + 16|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==(0|0);
   if ($12) {
    HEAP32[$10>>2] = $2;
    $13 = ((($1)) + 24|0);
    HEAP32[$13>>2] = $4;
    $14 = ((($1)) + 36|0);
    HEAP32[$14>>2] = 1;
    $15 = ((($1)) + 48|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ($16|0)==(1);
    $18 = ($4|0)==(1);
    $or$cond = $17 & $18;
    if (!($or$cond)) {
     break;
    }
    $19 = ((($1)) + 54|0);
    HEAP8[$19>>0] = 1;
    break;
   }
   $20 = ($11|0)==($2|0);
   if (!($20)) {
    $30 = ((($1)) + 36|0);
    $31 = HEAP32[$30>>2]|0;
    $32 = (($31) + 1)|0;
    HEAP32[$30>>2] = $32;
    $33 = ((($1)) + 54|0);
    HEAP8[$33>>0] = 1;
    break;
   }
   $21 = ((($1)) + 24|0);
   $22 = HEAP32[$21>>2]|0;
   $23 = ($22|0)==(2);
   if ($23) {
    HEAP32[$21>>2] = $4;
    $27 = $4;
   } else {
    $27 = $22;
   }
   $24 = ((($1)) + 48|0);
   $25 = HEAP32[$24>>2]|0;
   $26 = ($25|0)==(1);
   $28 = ($27|0)==(1);
   $or$cond22 = $26 & $28;
   if ($or$cond22) {
    $29 = ((($1)) + 54|0);
    HEAP8[$29>>0] = 1;
   }
  }
 } while(0);
 return;
}
function ___dynamic_cast($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$ = 0, $$0 = 0, $$33 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond28 = 0, $or$cond30 = 0, $or$cond32 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $4 = sp;
 $5 = HEAP32[$0>>2]|0;
 $6 = ((($5)) + -8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (($0) + ($7)|0);
 $9 = ((($5)) + -4|0);
 $10 = HEAP32[$9>>2]|0;
 HEAP32[$4>>2] = $2;
 $11 = ((($4)) + 4|0);
 HEAP32[$11>>2] = $0;
 $12 = ((($4)) + 8|0);
 HEAP32[$12>>2] = $1;
 $13 = ((($4)) + 12|0);
 HEAP32[$13>>2] = $3;
 $14 = ((($4)) + 16|0);
 $15 = ((($4)) + 20|0);
 $16 = ((($4)) + 24|0);
 $17 = ((($4)) + 28|0);
 $18 = ((($4)) + 32|0);
 $19 = ((($4)) + 40|0);
 dest=$14; stop=dest+36|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));HEAP16[$14+36>>1]=0|0;HEAP8[$14+38>>0]=0|0;
 $20 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($10,$2,0)|0);
 L1: do {
  if ($20) {
   $21 = ((($4)) + 48|0);
   HEAP32[$21>>2] = 1;
   $22 = HEAP32[$10>>2]|0;
   $23 = ((($22)) + 20|0);
   $24 = HEAP32[$23>>2]|0;
   FUNCTION_TABLE_viiiiii[$24 & 31]($10,$4,$8,$8,1,0);
   $25 = HEAP32[$16>>2]|0;
   $26 = ($25|0)==(1);
   $$ = $26 ? $8 : 0;
   $$0 = $$;
  } else {
   $27 = ((($4)) + 36|0);
   $28 = HEAP32[$10>>2]|0;
   $29 = ((($28)) + 24|0);
   $30 = HEAP32[$29>>2]|0;
   FUNCTION_TABLE_viiiii[$30 & 31]($10,$4,$8,1,0);
   $31 = HEAP32[$27>>2]|0;
   switch ($31|0) {
   case 0:  {
    $32 = HEAP32[$19>>2]|0;
    $33 = ($32|0)==(1);
    $34 = HEAP32[$17>>2]|0;
    $35 = ($34|0)==(1);
    $or$cond = $33 & $35;
    $36 = HEAP32[$18>>2]|0;
    $37 = ($36|0)==(1);
    $or$cond28 = $or$cond & $37;
    $38 = HEAP32[$15>>2]|0;
    $$33 = $or$cond28 ? $38 : 0;
    $$0 = $$33;
    break L1;
    break;
   }
   case 1:  {
    break;
   }
   default: {
    $$0 = 0;
    break L1;
   }
   }
   $39 = HEAP32[$16>>2]|0;
   $40 = ($39|0)==(1);
   if (!($40)) {
    $41 = HEAP32[$19>>2]|0;
    $42 = ($41|0)==(0);
    $43 = HEAP32[$17>>2]|0;
    $44 = ($43|0)==(1);
    $or$cond30 = $42 & $44;
    $45 = HEAP32[$18>>2]|0;
    $46 = ($45|0)==(1);
    $or$cond32 = $or$cond30 & $46;
    if (!($or$cond32)) {
     $$0 = 0;
     break;
    }
   }
   $47 = HEAP32[$14>>2]|0;
   $$0 = $47;
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function __ZN10__cxxabiv120__si_class_type_infoD0Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10__cxxabiv116__shim_type_infoD2Ev($0);
 __ZdlPv($0);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($0,$1,$2,$3,$4,$5) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $6 = ((($1)) + 8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$7,$5)|0);
 if ($8) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$1,$2,$3,$4);
 } else {
  $9 = ((($0)) + 8|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = HEAP32[$10>>2]|0;
  $12 = ((($11)) + 20|0);
  $13 = HEAP32[$12>>2]|0;
  FUNCTION_TABLE_viiiiii[$13 & 31]($10,$1,$2,$3,$4,$5);
 }
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$037$off038 = 0, $$037$off039 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $5 = ((($1)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$6,$4)|0);
 do {
  if ($7) {
   __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi(0,$1,$2,$3);
  } else {
   $8 = HEAP32[$1>>2]|0;
   $9 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$8,$4)|0);
   if (!($9)) {
    $43 = ((($0)) + 8|0);
    $44 = HEAP32[$43>>2]|0;
    $45 = HEAP32[$44>>2]|0;
    $46 = ((($45)) + 24|0);
    $47 = HEAP32[$46>>2]|0;
    FUNCTION_TABLE_viiiii[$47 & 31]($44,$1,$2,$3,$4);
    break;
   }
   $10 = ((($1)) + 16|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==($2|0);
   if (!($12)) {
    $13 = ((($1)) + 20|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = ($14|0)==($2|0);
    if (!($15)) {
     $18 = ((($1)) + 32|0);
     HEAP32[$18>>2] = $3;
     $19 = ((($1)) + 44|0);
     $20 = HEAP32[$19>>2]|0;
     $21 = ($20|0)==(4);
     if ($21) {
      break;
     }
     $22 = ((($1)) + 52|0);
     HEAP8[$22>>0] = 0;
     $23 = ((($1)) + 53|0);
     HEAP8[$23>>0] = 0;
     $24 = ((($0)) + 8|0);
     $25 = HEAP32[$24>>2]|0;
     $26 = HEAP32[$25>>2]|0;
     $27 = ((($26)) + 20|0);
     $28 = HEAP32[$27>>2]|0;
     FUNCTION_TABLE_viiiiii[$28 & 31]($25,$1,$2,$2,1,$4);
     $29 = HEAP8[$23>>0]|0;
     $30 = ($29<<24>>24)==(0);
     if ($30) {
      $$037$off038 = 4;
      label = 11;
     } else {
      $31 = HEAP8[$22>>0]|0;
      $32 = ($31<<24>>24)==(0);
      if ($32) {
       $$037$off038 = 3;
       label = 11;
      } else {
       $$037$off039 = 3;
      }
     }
     if ((label|0) == 11) {
      HEAP32[$13>>2] = $2;
      $33 = ((($1)) + 40|0);
      $34 = HEAP32[$33>>2]|0;
      $35 = (($34) + 1)|0;
      HEAP32[$33>>2] = $35;
      $36 = ((($1)) + 36|0);
      $37 = HEAP32[$36>>2]|0;
      $38 = ($37|0)==(1);
      if ($38) {
       $39 = ((($1)) + 24|0);
       $40 = HEAP32[$39>>2]|0;
       $41 = ($40|0)==(2);
       if ($41) {
        $42 = ((($1)) + 54|0);
        HEAP8[$42>>0] = 1;
        $$037$off039 = $$037$off038;
       } else {
        $$037$off039 = $$037$off038;
       }
      } else {
       $$037$off039 = $$037$off038;
      }
     }
     HEAP32[$19>>2] = $$037$off039;
     break;
    }
   }
   $16 = ($3|0)==(1);
   if ($16) {
    $17 = ((($1)) + 32|0);
    HEAP32[$17>>2] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $4 = ((($1)) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$5,0)|0);
 if ($6) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$1,$2,$3);
 } else {
  $7 = ((($0)) + 8|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = HEAP32[$8>>2]|0;
  $10 = ((($9)) + 28|0);
  $11 = HEAP32[$10>>2]|0;
  FUNCTION_TABLE_viiii[$11 & 127]($8,$1,$2,$3);
 }
 return;
}
function __ZNSt9type_infoD2Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv112_GLOBAL__N_110construct_Ev() {
 var $0 = 0, $1 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 $0 = (_pthread_key_create((9036|0),(167|0))|0);
 $1 = ($0|0)==(0);
 if ($1) {
  STACKTOP = sp;return;
 } else {
  _abort_message(8094,$vararg_buffer);
  // unreachable;
 }
}
function __ZN10__cxxabiv112_GLOBAL__N_19destruct_EPv($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 _free($0);
 $1 = HEAP32[2259]|0;
 $2 = (_pthread_setspecific(($1|0),(0|0))|0);
 $3 = ($2|0)==(0);
 if ($3) {
  STACKTOP = sp;return;
 } else {
  _abort_message(8144,$vararg_buffer);
  // unreachable;
 }
}
function __ZSt9terminatev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___cxa_get_globals_fast()|0);
 $1 = ($0|0)==(0|0);
 if (!($1)) {
  $2 = HEAP32[$0>>2]|0;
  $3 = ($2|0)==(0|0);
  if (!($3)) {
   $4 = ((($2)) + 48|0);
   $5 = $4;
   $6 = $5;
   $7 = HEAP32[$6>>2]|0;
   $8 = (($5) + 4)|0;
   $9 = $8;
   $10 = HEAP32[$9>>2]|0;
   $11 = $7 & -256;
   $12 = ($11|0)==(1126902528);
   $13 = ($10|0)==(1129074247);
   $14 = $12 & $13;
   if ($14) {
    $15 = ((($2)) + 12|0);
    $16 = HEAP32[$15>>2]|0;
    __ZSt11__terminatePFvvE($16);
    // unreachable;
   }
  }
 }
 $17 = (__ZSt13get_terminatev()|0);
 __ZSt11__terminatePFvvE($17);
 // unreachable;
}
function __ZSt11__terminatePFvvE($0) {
 $0 = $0|0;
 var $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 FUNCTION_TABLE_v[$0 & 255]();
 _abort_message(8197,$vararg_buffer);
 // unreachable;
}
function __ZSt13get_terminatev() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[342]|0;
 $1 = (($0) + 0)|0;
 HEAP32[342] = $1;
 $2 = $0;
 return ($2|0);
}
function __ZN10__cxxabiv123__fundamental_type_infoD0Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10__cxxabiv116__shim_type_infoD2Ev($0);
 __ZdlPv($0);
 return;
}
function __ZNK10__cxxabiv123__fundamental_type_info9can_catchEPKNS_16__shim_type_infoERPv($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$1,0)|0);
 return ($3|0);
}
function __ZN10__cxxabiv119__pointer_type_infoD0Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10__cxxabiv116__shim_type_infoD2Ev($0);
 __ZdlPv($0);
 return;
}
function __ZNK10__cxxabiv119__pointer_type_info9can_catchEPKNS_16__shim_type_infoERPv($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $$4 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $3 = sp;
 $4 = HEAP32[$2>>2]|0;
 $5 = HEAP32[$4>>2]|0;
 HEAP32[$2>>2] = $5;
 $6 = (__ZNK10__cxxabiv117__pbase_type_info9can_catchEPKNS_16__shim_type_infoERPv($0,$1,0)|0);
 if ($6) {
  $$4 = 1;
 } else {
  $7 = ($1|0)==(0|0);
  if ($7) {
   $$4 = 0;
  } else {
   $8 = (___dynamic_cast($1,520,576,0)|0);
   $9 = ($8|0)==(0|0);
   if ($9) {
    $$4 = 0;
   } else {
    $10 = ((($8)) + 8|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ((($0)) + 8|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = $13 ^ -1;
    $15 = $11 & $14;
    $16 = ($15|0)==(0);
    if ($16) {
     $17 = ((($0)) + 12|0);
     $18 = HEAP32[$17>>2]|0;
     $19 = ((($8)) + 12|0);
     $20 = HEAP32[$19>>2]|0;
     $21 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($18,$20,0)|0);
     if ($21) {
      $$4 = 1;
     } else {
      $22 = HEAP32[$17>>2]|0;
      $23 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($22,608,0)|0);
      if ($23) {
       $$4 = 1;
      } else {
       $24 = HEAP32[$17>>2]|0;
       $25 = ($24|0)==(0|0);
       if ($25) {
        $$4 = 0;
       } else {
        $26 = (___dynamic_cast($24,520,504,0)|0);
        $27 = ($26|0)==(0|0);
        if ($27) {
         $$4 = 0;
        } else {
         $28 = HEAP32[$19>>2]|0;
         $29 = ($28|0)==(0|0);
         if ($29) {
          $$4 = 0;
         } else {
          $30 = (___dynamic_cast($28,520,504,0)|0);
          $31 = ($30|0)==(0|0);
          if ($31) {
           $$4 = 0;
          } else {
           $32 = ((($3)) + 4|0);
           dest=$32; stop=dest+52|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
           HEAP32[$3>>2] = $30;
           $33 = ((($3)) + 8|0);
           HEAP32[$33>>2] = $26;
           $34 = ((($3)) + 12|0);
           HEAP32[$34>>2] = -1;
           $35 = ((($3)) + 48|0);
           HEAP32[$35>>2] = 1;
           $36 = HEAP32[$30>>2]|0;
           $37 = ((($36)) + 28|0);
           $38 = HEAP32[$37>>2]|0;
           $39 = HEAP32[$2>>2]|0;
           FUNCTION_TABLE_viiii[$38 & 127]($30,$3,$39,1);
           $40 = ((($3)) + 24|0);
           $41 = HEAP32[$40>>2]|0;
           $42 = ($41|0)==(1);
           if ($42) {
            $43 = ((($3)) + 16|0);
            $44 = HEAP32[$43>>2]|0;
            HEAP32[$2>>2] = $44;
            $$0 = 1;
           } else {
            $$0 = 0;
           }
           $$4 = $$0;
          }
         }
        }
       }
      }
     }
    } else {
     $$4 = 0;
    }
   }
  }
 }
 STACKTOP = sp;return ($$4|0);
}
function __ZNK10__cxxabiv117__pbase_type_info9can_catchEPKNS_16__shim_type_infoERPv($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$1,0)|0);
 if ($3) {
  $$0 = 1;
 } else {
  $4 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($1,616,0)|0);
  $$0 = $4;
 }
 return ($$0|0);
}
function __ZN10__cxxabiv116__enum_type_infoD0Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10__cxxabiv116__shim_type_infoD2Ev($0);
 __ZdlPv($0);
 return;
}
function __ZNK10__cxxabiv116__enum_type_info9can_catchEPKNS_16__shim_type_infoERPv($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$1,0)|0);
 return ($3|0);
}
function __ZN10__cxxabiv121__vmi_class_type_infoD0Ev($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN10__cxxabiv116__shim_type_infoD2Ev($0);
 __ZdlPv($0);
 return;
}
function __ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($0,$1,$2,$3,$4,$5) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $6 = ((($1)) + 8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$7,$5)|0);
 if ($8) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$1,$2,$3,$4);
 } else {
  $9 = ((($1)) + 52|0);
  $10 = HEAP8[$9>>0]|0;
  $11 = ((($1)) + 53|0);
  $12 = HEAP8[$11>>0]|0;
  $13 = ((($0)) + 16|0);
  $14 = ((($0)) + 12|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = (((($0)) + 16|0) + ($15<<3)|0);
  HEAP8[$9>>0] = 0;
  HEAP8[$11>>0] = 0;
  __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($13,$1,$2,$3,$4,$5);
  $17 = ($15|0)>(1);
  L4: do {
   if ($17) {
    $18 = ((($0)) + 24|0);
    $19 = ((($1)) + 24|0);
    $20 = ((($0)) + 8|0);
    $21 = ((($1)) + 54|0);
    $$0 = $18;
    while(1) {
     $22 = HEAP8[$21>>0]|0;
     $23 = ($22<<24>>24)==(0);
     if (!($23)) {
      break L4;
     }
     $24 = HEAP8[$9>>0]|0;
     $25 = ($24<<24>>24)==(0);
     if ($25) {
      $31 = HEAP8[$11>>0]|0;
      $32 = ($31<<24>>24)==(0);
      if (!($32)) {
       $33 = HEAP32[$20>>2]|0;
       $34 = $33 & 1;
       $35 = ($34|0)==(0);
       if ($35) {
        break L4;
       }
      }
     } else {
      $26 = HEAP32[$19>>2]|0;
      $27 = ($26|0)==(1);
      if ($27) {
       break L4;
      }
      $28 = HEAP32[$20>>2]|0;
      $29 = $28 & 2;
      $30 = ($29|0)==(0);
      if ($30) {
       break L4;
      }
     }
     HEAP8[$9>>0] = 0;
     HEAP8[$11>>0] = 0;
     __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($$0,$1,$2,$3,$4,$5);
     $36 = ((($$0)) + 8|0);
     $37 = ($36>>>0)<($16>>>0);
     if ($37) {
      $$0 = $36;
     } else {
      break;
     }
    }
   }
  } while(0);
  HEAP8[$9>>0] = $10;
  HEAP8[$11>>0] = $12;
 }
 return;
}
function __ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$0 = 0, $$081$off0 = 0, $$084 = 0, $$085$off0 = 0, $$1 = 0, $$182$off0 = 0, $$186$off0 = 0, $$2 = 0, $$283$off0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $5 = ((($1)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$6,$4)|0);
 L1: do {
  if ($7) {
   __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi(0,$1,$2,$3);
  } else {
   $8 = HEAP32[$1>>2]|0;
   $9 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$8,$4)|0);
   if (!($9)) {
    $56 = ((($0)) + 16|0);
    $57 = ((($0)) + 12|0);
    $58 = HEAP32[$57>>2]|0;
    $59 = (((($0)) + 16|0) + ($58<<3)|0);
    __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($56,$1,$2,$3,$4);
    $60 = ((($0)) + 24|0);
    $61 = ($58|0)>(1);
    if (!($61)) {
     break;
    }
    $62 = ((($0)) + 8|0);
    $63 = HEAP32[$62>>2]|0;
    $64 = $63 & 2;
    $65 = ($64|0)==(0);
    if ($65) {
     $66 = ((($1)) + 36|0);
     $67 = HEAP32[$66>>2]|0;
     $68 = ($67|0)==(1);
     if (!($68)) {
      $74 = $63 & 1;
      $75 = ($74|0)==(0);
      if ($75) {
       $78 = ((($1)) + 54|0);
       $$2 = $60;
       while(1) {
        $87 = HEAP8[$78>>0]|0;
        $88 = ($87<<24>>24)==(0);
        if (!($88)) {
         break L1;
        }
        $89 = HEAP32[$66>>2]|0;
        $90 = ($89|0)==(1);
        if ($90) {
         break L1;
        }
        __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($$2,$1,$2,$3,$4);
        $91 = ((($$2)) + 8|0);
        $92 = ($91>>>0)<($59>>>0);
        if ($92) {
         $$2 = $91;
        } else {
         break L1;
        }
       }
      }
      $76 = ((($1)) + 24|0);
      $77 = ((($1)) + 54|0);
      $$1 = $60;
      while(1) {
       $79 = HEAP8[$77>>0]|0;
       $80 = ($79<<24>>24)==(0);
       if (!($80)) {
        break L1;
       }
       $81 = HEAP32[$66>>2]|0;
       $82 = ($81|0)==(1);
       if ($82) {
        $83 = HEAP32[$76>>2]|0;
        $84 = ($83|0)==(1);
        if ($84) {
         break L1;
        }
       }
       __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($$1,$1,$2,$3,$4);
       $85 = ((($$1)) + 8|0);
       $86 = ($85>>>0)<($59>>>0);
       if ($86) {
        $$1 = $85;
       } else {
        break L1;
       }
      }
     }
    }
    $69 = ((($1)) + 54|0);
    $$0 = $60;
    while(1) {
     $70 = HEAP8[$69>>0]|0;
     $71 = ($70<<24>>24)==(0);
     if (!($71)) {
      break L1;
     }
     __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($$0,$1,$2,$3,$4);
     $72 = ((($$0)) + 8|0);
     $73 = ($72>>>0)<($59>>>0);
     if ($73) {
      $$0 = $72;
     } else {
      break L1;
     }
    }
   }
   $10 = ((($1)) + 16|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==($2|0);
   if (!($12)) {
    $13 = ((($1)) + 20|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = ($14|0)==($2|0);
    if (!($15)) {
     $18 = ((($1)) + 32|0);
     HEAP32[$18>>2] = $3;
     $19 = ((($1)) + 44|0);
     $20 = HEAP32[$19>>2]|0;
     $21 = ($20|0)==(4);
     if ($21) {
      break;
     }
     $22 = ((($0)) + 16|0);
     $23 = ((($0)) + 12|0);
     $24 = HEAP32[$23>>2]|0;
     $25 = (((($0)) + 16|0) + ($24<<3)|0);
     $26 = ((($1)) + 52|0);
     $27 = ((($1)) + 53|0);
     $28 = ((($1)) + 54|0);
     $29 = ((($0)) + 8|0);
     $30 = ((($1)) + 24|0);
     $$081$off0 = 0;$$084 = $22;$$085$off0 = 0;
     L32: while(1) {
      $31 = ($$084>>>0)<($25>>>0);
      if (!($31)) {
       $$283$off0 = $$081$off0;
       label = 18;
       break;
      }
      HEAP8[$26>>0] = 0;
      HEAP8[$27>>0] = 0;
      __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($$084,$1,$2,$2,1,$4);
      $32 = HEAP8[$28>>0]|0;
      $33 = ($32<<24>>24)==(0);
      if (!($33)) {
       $$283$off0 = $$081$off0;
       label = 18;
       break;
      }
      $34 = HEAP8[$27>>0]|0;
      $35 = ($34<<24>>24)==(0);
      do {
       if ($35) {
        $$182$off0 = $$081$off0;$$186$off0 = $$085$off0;
       } else {
        $36 = HEAP8[$26>>0]|0;
        $37 = ($36<<24>>24)==(0);
        if ($37) {
         $43 = HEAP32[$29>>2]|0;
         $44 = $43 & 1;
         $45 = ($44|0)==(0);
         if ($45) {
          $$283$off0 = 1;
          label = 18;
          break L32;
         } else {
          $$182$off0 = 1;$$186$off0 = $$085$off0;
          break;
         }
        }
        $38 = HEAP32[$30>>2]|0;
        $39 = ($38|0)==(1);
        if ($39) {
         label = 23;
         break L32;
        }
        $40 = HEAP32[$29>>2]|0;
        $41 = $40 & 2;
        $42 = ($41|0)==(0);
        if ($42) {
         label = 23;
         break L32;
        } else {
         $$182$off0 = 1;$$186$off0 = 1;
        }
       }
      } while(0);
      $46 = ((($$084)) + 8|0);
      $$081$off0 = $$182$off0;$$084 = $46;$$085$off0 = $$186$off0;
     }
     do {
      if ((label|0) == 18) {
       if (!($$085$off0)) {
        HEAP32[$13>>2] = $2;
        $47 = ((($1)) + 40|0);
        $48 = HEAP32[$47>>2]|0;
        $49 = (($48) + 1)|0;
        HEAP32[$47>>2] = $49;
        $50 = ((($1)) + 36|0);
        $51 = HEAP32[$50>>2]|0;
        $52 = ($51|0)==(1);
        if ($52) {
         $53 = HEAP32[$30>>2]|0;
         $54 = ($53|0)==(2);
         if ($54) {
          HEAP8[$28>>0] = 1;
          if ($$283$off0) {
           label = 23;
           break;
          } else {
           $55 = 4;
           break;
          }
         }
        }
       }
       if ($$283$off0) {
        label = 23;
       } else {
        $55 = 4;
       }
      }
     } while(0);
     if ((label|0) == 23) {
      $55 = 3;
     }
     HEAP32[$19>>2] = $55;
     break;
    }
   }
   $16 = ($3|0)==(1);
   if ($16) {
    $17 = ((($1)) + 32|0);
    HEAP32[$17>>2] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $4 = ((($1)) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0,$5,0)|0);
 L1: do {
  if ($6) {
   __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$1,$2,$3);
  } else {
   $7 = ((($0)) + 16|0);
   $8 = ((($0)) + 12|0);
   $9 = HEAP32[$8>>2]|0;
   $10 = (((($0)) + 16|0) + ($9<<3)|0);
   __ZNK10__cxxabiv122__base_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($7,$1,$2,$3);
   $11 = ($9|0)>(1);
   if ($11) {
    $12 = ((($0)) + 24|0);
    $13 = ((($1)) + 54|0);
    $$0 = $12;
    while(1) {
     __ZNK10__cxxabiv122__base_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($$0,$1,$2,$3);
     $14 = HEAP8[$13>>0]|0;
     $15 = ($14<<24>>24)==(0);
     if (!($15)) {
      break L1;
     }
     $16 = ((($$0)) + 8|0);
     $17 = ($16>>>0)<($10>>>0);
     if ($17) {
      $$0 = $16;
     } else {
      break;
     }
    }
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv122__base_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $4 = ((($0)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 >> 8;
 $7 = $5 & 1;
 $8 = ($7|0)==(0);
 if ($8) {
  $$0 = $6;
 } else {
  $9 = HEAP32[$2>>2]|0;
  $10 = (($9) + ($6)|0);
  $11 = HEAP32[$10>>2]|0;
  $$0 = $11;
 }
 $12 = HEAP32[$0>>2]|0;
 $13 = HEAP32[$12>>2]|0;
 $14 = ((($13)) + 28|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = (($2) + ($$0)|0);
 $17 = $5 & 2;
 $18 = ($17|0)!=(0);
 $19 = $18 ? $3 : 2;
 FUNCTION_TABLE_viiii[$15 & 127]($12,$1,$16,$19);
 return;
}
function __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($0,$1,$2,$3,$4,$5) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $6 = ((($0)) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = $7 >> 8;
 $9 = $7 & 1;
 $10 = ($9|0)==(0);
 if ($10) {
  $$0 = $8;
 } else {
  $11 = HEAP32[$3>>2]|0;
  $12 = (($11) + ($8)|0);
  $13 = HEAP32[$12>>2]|0;
  $$0 = $13;
 }
 $14 = HEAP32[$0>>2]|0;
 $15 = HEAP32[$14>>2]|0;
 $16 = ((($15)) + 20|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (($3) + ($$0)|0);
 $19 = $7 & 2;
 $20 = ($19|0)!=(0);
 $21 = $20 ? $4 : 2;
 FUNCTION_TABLE_viiiiii[$17 & 31]($14,$1,$2,$18,$21,$5);
 return;
}
function __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $5 = ((($0)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $6 >> 8;
 $8 = $6 & 1;
 $9 = ($8|0)==(0);
 if ($9) {
  $$0 = $7;
 } else {
  $10 = HEAP32[$2>>2]|0;
  $11 = (($10) + ($7)|0);
  $12 = HEAP32[$11>>2]|0;
  $$0 = $12;
 }
 $13 = HEAP32[$0>>2]|0;
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($14)) + 24|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = (($2) + ($$0)|0);
 $18 = $6 & 2;
 $19 = ($18|0)!=(0);
 $20 = $19 ? $3 : 2;
 FUNCTION_TABLE_viiiii[$16 & 31]($13,$1,$17,$20,$4);
 return;
}
function __ZSt15get_new_handlerv() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[2260]|0;
 $1 = (($0) + 0)|0;
 HEAP32[2260] = $1;
 $2 = $0;
 return ($2|0);
}
function ___cxa_can_catch($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $3 = sp;
 $4 = HEAP32[$2>>2]|0;
 HEAP32[$3>>2] = $4;
 $5 = HEAP32[$0>>2]|0;
 $6 = ((($5)) + 16|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (FUNCTION_TABLE_iiii[$7 & 127]($0,$1,$3)|0);
 $9 = $8&1;
 if ($8) {
  $10 = HEAP32[$3>>2]|0;
  HEAP32[$2>>2] = $10;
 }
 STACKTOP = sp;return ($9|0);
}
function ___cxa_is_pointer_type($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $phitmp = 0, $phitmp1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $3 = 0;
 } else {
  $2 = (___dynamic_cast($0,520,576,0)|0);
  $phitmp = ($2|0)!=(0|0);
  $phitmp1 = $phitmp&1;
  $3 = $phitmp1;
 }
 return ($3|0);
}
function runPostSets() {
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    $rem = $rem | 0;
    var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
    $n_sroa_0_0_extract_trunc = $a$0;
    $n_sroa_1_4_extract_shift$0 = $a$1;
    $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
    $d_sroa_0_0_extract_trunc = $b$0;
    $d_sroa_1_4_extract_shift$0 = $b$1;
    $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
    if (($n_sroa_1_4_extract_trunc | 0) == 0) {
      $4 = ($rem | 0) != 0;
      if (($d_sroa_1_4_extract_trunc | 0) == 0) {
        if ($4) {
          HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        if (!$4) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
    $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
    do {
      if (($d_sroa_0_0_extract_trunc | 0) == 0) {
        if ($17) {
          if (($rem | 0) != 0) {
            HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
            HEAP32[$rem + 4 >> 2] = 0;
          }
          $_0$1 = 0;
          $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        if (($n_sroa_0_0_extract_trunc | 0) == 0) {
          if (($rem | 0) != 0) {
            HEAP32[$rem >> 2] = 0;
            HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
          }
          $_0$1 = 0;
          $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
        if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
          if (($rem | 0) != 0) {
            HEAP32[$rem >> 2] = 0 | $a$0 & -1;
            HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
          }
          $_0$1 = 0;
          $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($51 >>> 0 <= 30) {
          $57 = $51 + 1 | 0;
          $58 = 31 - $51 | 0;
          $sr_1_ph = $57;
          $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        if (!$17) {
          $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
          $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
          if ($119 >>> 0 <= 31) {
            $125 = $119 + 1 | 0;
            $126 = 31 - $119 | 0;
            $130 = $119 - 31 >> 31;
            $sr_1_ph = $125;
            $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
            $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
            $q_sroa_0_1_ph = 0;
            $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
            break;
          }
          if (($rem | 0) == 0) {
            $_0$1 = 0;
            $_0$0 = 0;
            return (tempRet0 = $_0$1, $_0$0) | 0;
          }
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
        if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
          $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
          $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
          $89 = 64 - $88 | 0;
          $91 = 32 - $88 | 0;
          $92 = $91 >> 31;
          $95 = $88 - 32 | 0;
          $105 = $95 >> 31;
          $sr_1_ph = $88;
          $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
          $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
          $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
          $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
          break;
        }
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
          HEAP32[$rem + 4 >> 2] = 0;
        }
        if (($d_sroa_0_0_extract_trunc | 0) == 1) {
          $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
          $_0$0 = 0 | $a$0 & -1;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        } else {
          $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
          $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
          $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
      }
    } while (0);
    if (($sr_1_ph | 0) == 0) {
      $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
      $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
      $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
      $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
      $carry_0_lcssa$1 = 0;
      $carry_0_lcssa$0 = 0;
    } else {
      $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
      $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
      $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
      $137$1 = tempRet0;
      $q_sroa_1_1198 = $q_sroa_1_1_ph;
      $q_sroa_0_1199 = $q_sroa_0_1_ph;
      $r_sroa_1_1200 = $r_sroa_1_1_ph;
      $r_sroa_0_1201 = $r_sroa_0_1_ph;
      $sr_1202 = $sr_1_ph;
      $carry_0203 = 0;
      while (1) {
        $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
        $149 = $carry_0203 | $q_sroa_0_1199 << 1;
        $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
        $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
        _i64Subtract($137$0 | 0, $137$1 | 0, $r_sroa_0_0_insert_insert42$0 | 0, $r_sroa_0_0_insert_insert42$1 | 0) | 0;
        $150$1 = tempRet0;
        $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
        $152 = $151$0 & 1;
        $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0 | 0, $r_sroa_0_0_insert_insert42$1 | 0, $151$0 & $d_sroa_0_0_insert_insert99$0 | 0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1 | 0) | 0;
        $r_sroa_0_0_extract_trunc = $154$0;
        $r_sroa_1_4_extract_trunc = tempRet0;
        $155 = $sr_1202 - 1 | 0;
        if (($155 | 0) == 0) {
          break;
        } else {
          $q_sroa_1_1198 = $147;
          $q_sroa_0_1199 = $149;
          $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
          $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
          $sr_1202 = $155;
          $carry_0203 = $152;
        }
      }
      $q_sroa_1_1_lcssa = $147;
      $q_sroa_0_1_lcssa = $149;
      $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
      $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
      $carry_0_lcssa$1 = 0;
      $carry_0_lcssa$0 = $152;
    }
    $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
    $q_sroa_0_0_insert_ext75$1 = 0;
    $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
    if (($rem | 0) != 0) {
      HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
      HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
    }
    $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
    $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
    return (tempRet0 = $_0$1, $_0$0) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    var $1$0 = 0;
    $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
    return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    var $rem = 0, __stackBase__ = 0;
    __stackBase__ = STACKTOP;
    STACKTOP = STACKTOP + 16 | 0;
    $rem = __stackBase__ | 0;
    ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
    STACKTOP = __stackBase__;
    return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _llvm_bswap_i32(x) {
    x = x|0;
    return (((x&0xff)<<24) | (((x>>8)&0xff)<<16) | (((x>>16)&0xff)<<8) | (x>>>24))|0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    var aligned_dest_end = 0;
    var block_aligned_dest_end = 0;
    var dest_end = 0;
    // Test against a benchmarked cutoff limit for when HEAPU8.set() becomes faster to use.
    if ((num|0) >=
      8192
    ) {
      return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    }

    ret = dest|0;
    dest_end = (dest + num)|0;
    if ((dest&3) == (src&3)) {
      // The initial unaligned < 4-byte front.
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      aligned_dest_end = (dest_end & -4)|0;
      block_aligned_dest_end = (aligned_dest_end - 64)|0;
      while ((dest|0) <= (block_aligned_dest_end|0) ) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        HEAP32[(((dest)+(4))>>2)]=((HEAP32[(((src)+(4))>>2)])|0);
        HEAP32[(((dest)+(8))>>2)]=((HEAP32[(((src)+(8))>>2)])|0);
        HEAP32[(((dest)+(12))>>2)]=((HEAP32[(((src)+(12))>>2)])|0);
        HEAP32[(((dest)+(16))>>2)]=((HEAP32[(((src)+(16))>>2)])|0);
        HEAP32[(((dest)+(20))>>2)]=((HEAP32[(((src)+(20))>>2)])|0);
        HEAP32[(((dest)+(24))>>2)]=((HEAP32[(((src)+(24))>>2)])|0);
        HEAP32[(((dest)+(28))>>2)]=((HEAP32[(((src)+(28))>>2)])|0);
        HEAP32[(((dest)+(32))>>2)]=((HEAP32[(((src)+(32))>>2)])|0);
        HEAP32[(((dest)+(36))>>2)]=((HEAP32[(((src)+(36))>>2)])|0);
        HEAP32[(((dest)+(40))>>2)]=((HEAP32[(((src)+(40))>>2)])|0);
        HEAP32[(((dest)+(44))>>2)]=((HEAP32[(((src)+(44))>>2)])|0);
        HEAP32[(((dest)+(48))>>2)]=((HEAP32[(((src)+(48))>>2)])|0);
        HEAP32[(((dest)+(52))>>2)]=((HEAP32[(((src)+(52))>>2)])|0);
        HEAP32[(((dest)+(56))>>2)]=((HEAP32[(((src)+(56))>>2)])|0);
        HEAP32[(((dest)+(60))>>2)]=((HEAP32[(((src)+(60))>>2)])|0);
        dest = (dest+64)|0;
        src = (src+64)|0;
      }
      while ((dest|0) < (aligned_dest_end|0) ) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
      }
    } else {
      // In the unaligned copy case, unroll a bit as well.
      aligned_dest_end = (dest_end - 4)|0;
      while ((dest|0) < (aligned_dest_end|0) ) {
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        HEAP8[(((dest)+(1))>>0)]=((HEAP8[(((src)+(1))>>0)])|0);
        HEAP8[(((dest)+(2))>>0)]=((HEAP8[(((src)+(2))>>0)])|0);
        HEAP8[(((dest)+(3))>>0)]=((HEAP8[(((src)+(3))>>0)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
      }
    }
    // The remaining unaligned < 4 byte tail.
    while ((dest|0) < (dest_end|0)) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
    }
    return ret|0;
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var end = 0, aligned_end = 0, block_aligned_end = 0, value4 = 0;
    end = (ptr + num)|0;

    value = value & 0xff;
    if ((num|0) >= 67 /* 64 bytes for an unrolled loop + 3 bytes for unaligned head*/) {
      while ((ptr&3) != 0) {
        HEAP8[((ptr)>>0)]=value;
        ptr = (ptr+1)|0;
      }

      aligned_end = (end & -4)|0;
      block_aligned_end = (aligned_end - 64)|0;
      value4 = value | (value << 8) | (value << 16) | (value << 24);

      while((ptr|0) <= (block_aligned_end|0)) {
        HEAP32[((ptr)>>2)]=value4;
        HEAP32[(((ptr)+(4))>>2)]=value4;
        HEAP32[(((ptr)+(8))>>2)]=value4;
        HEAP32[(((ptr)+(12))>>2)]=value4;
        HEAP32[(((ptr)+(16))>>2)]=value4;
        HEAP32[(((ptr)+(20))>>2)]=value4;
        HEAP32[(((ptr)+(24))>>2)]=value4;
        HEAP32[(((ptr)+(28))>>2)]=value4;
        HEAP32[(((ptr)+(32))>>2)]=value4;
        HEAP32[(((ptr)+(36))>>2)]=value4;
        HEAP32[(((ptr)+(40))>>2)]=value4;
        HEAP32[(((ptr)+(44))>>2)]=value4;
        HEAP32[(((ptr)+(48))>>2)]=value4;
        HEAP32[(((ptr)+(52))>>2)]=value4;
        HEAP32[(((ptr)+(56))>>2)]=value4;
        HEAP32[(((ptr)+(60))>>2)]=value4;
        ptr = (ptr + 64)|0;
      }

      while ((ptr|0) < (aligned_end|0) ) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    // The remaining bytes.
    while ((ptr|0) < (end|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (end-num)|0;
}
function _sbrk(increment) {
    increment = increment|0;
    var oldDynamicTop = 0;
    var oldDynamicTopOnChange = 0;
    var newDynamicTop = 0;
    var totalMemory = 0;
    oldDynamicTop = HEAP32[DYNAMICTOP_PTR>>2]|0;
    newDynamicTop = oldDynamicTop + increment | 0;

    if (((increment|0) > 0 & (newDynamicTop|0) < (oldDynamicTop|0)) // Detect and fail if we would wrap around signed 32-bit int.
      | (newDynamicTop|0) < 0) { // Also underflow, sbrk() should be able to be used to subtract.
      abortOnCannotGrowMemory()|0;
      ___setErrNo(12);
      return -1;
    }

    HEAP32[DYNAMICTOP_PTR>>2] = newDynamicTop;
    totalMemory = getTotalMemory()|0;
    if ((newDynamicTop|0) > (totalMemory|0)) {
      if ((enlargeMemory()|0) == 0) {
        HEAP32[DYNAMICTOP_PTR>>2] = oldDynamicTop;
        ___setErrNo(12);
        return -1;
      }
    }
    return oldDynamicTop|0;
}

  
function dynCall_dii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  return +FUNCTION_TABLE_dii[index&255](a1|0,a2|0);
}


function dynCall_i(index) {
  index = index|0;
  
  return FUNCTION_TABLE_i[index&255]()|0;
}


function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&127](a1|0)|0;
}


function dynCall_iii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  return FUNCTION_TABLE_iii[index&255](a1|0,a2|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&127](a1|0,a2|0,a3|0)|0;
}


function dynCall_iiiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return FUNCTION_TABLE_iiiii[index&127](a1|0,a2|0,a3|0,a4|0)|0;
}


function dynCall_v(index) {
  index = index|0;
  
  FUNCTION_TABLE_v[index&255]();
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&255](a1|0);
}


function dynCall_vii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  FUNCTION_TABLE_vii[index&127](a1|0,a2|0);
}


function dynCall_viid(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=+a3;
  FUNCTION_TABLE_viid[index&255](a1|0,a2|0,+a3);
}


function dynCall_viii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  FUNCTION_TABLE_viii[index&255](a1|0,a2|0,a3|0);
}


function dynCall_viiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  FUNCTION_TABLE_viiii[index&127](a1|0,a2|0,a3|0,a4|0);
}


function dynCall_viiiii(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0;
  FUNCTION_TABLE_viiiii[index&31](a1|0,a2|0,a3|0,a4|0,a5|0);
}


function dynCall_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0;
  FUNCTION_TABLE_viiiiii[index&31](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0);
}

function b0(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_dii(0);return +0;
}
function b1() {
 ; nullFunc_i(1);return 0;
}
function b2(p0) {
 p0 = p0|0; nullFunc_ii(2);return 0;
}
function b3(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(3);return 0;
}
function b4(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(4);return 0;
}
function b5(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(5);return 0;
}
function b6() {
 ; nullFunc_v(6);
}
function b7(p0) {
 p0 = p0|0; nullFunc_vi(7);
}
function b8(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(8);
}
function b9(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = +p2; nullFunc_viid(9);
}
function b10(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_viii(10);
}
function b11(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_viiii(11);
}
function b12(p0,p1,p2,p3,p4) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0; nullFunc_viiiii(12);
}
function b13(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_viiiiii(13);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_dii = [b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEfE7getWireIS3_EEfRKMS3_fRKT_,b0,b0,b0,b0,b0,b0,b0,__ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEfE7getWireIS3_EEfRKMS3_fRKT_
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,__ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEfE7getWireIS3_EEfRKMS3_fRKT_,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0];
var FUNCTION_TABLE_i = [b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,__ZN10emscripten8internal12operator_newI6PacketJEEEPT_DpOT0_,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,__ZN10emscripten8internal12operator_newINSt3__26vectorIhNS2_9allocatorIhEEEEJEEEPT_DpOT0_,b1,b1,b1,b1,b1,b1,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN10SmartDrive8SettingsEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1,b1,b1,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN10SmartDrive16ThrottleSettingsEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1,b1,b1
,b1,__ZN10emscripten8internal15raw_constructorIN6Packet11VersionInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet9DailyInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet12PushSettingsEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet11JourneyInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet12DistanceInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet9MotorInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1
,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet9ErrorInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1,b1,b1,b1,__ZN10emscripten8internal15raw_constructorIN6Packet10DeviceInfoEJEEEPT_DpNS0_11BindingTypeIT0_E8WireTypeE,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1];
var FUNCTION_TABLE_ii = [b2,___stdio_close,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,__ZN10emscripten8internal13getActualTypeI6PacketEEPKvPT_
,b2,b2,__ZN10emscripten8internal7InvokerIP6PacketJEE6invokeEPFS3_vE,__ZN6Packet5validEv,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,__ZNK6Packet10getErrorIdEv,b2,b2,b2,__ZNK6Packet16getMotorDistanceEv,b2,__ZNK6Packet15getCaseDistanceEv,b2,b2,b2,b2,b2,b2
,b2,__ZN10emscripten8internal13getActualTypeINSt3__26vectorIhNS2_9allocatorIhEEEEEEPKvPT_,b2,b2,__ZN10emscripten8internal7InvokerIPNSt3__26vectorIhNS2_9allocatorIhEEEEJEE6invokeEPFS7_vE,b2,b2,__ZNKSt3__26vectorIhNS_9allocatorIhEEE4sizeEv,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
,b2,b2,b2,b2,b2,b2,b2,b2,b2];
var FUNCTION_TABLE_iii = [b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,__ZN10emscripten8internal13MethodInvokerIM6PacketFbvEbPS2_JEE6invokeERKS4_S5_,__ZN6Packet13processPacketENSt3__212basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEE,b3,b3,b3,b3,__ZN10emscripten8internal13MethodInvokerIM6PacketFNSt3__26vectorIhNS3_9allocatorIhEEEEvES7_PS2_JEE6invokeERKS9_SA_,__ZN10emscripten8internal12MemberAccessI6PacketiE7getWireIS2_EEiRKMS2_iRKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_4TypeEE7getWireIS2_EES3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_4DataEE7getWireIS2_EES3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_7CommandEE7getWireIS2_EES3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive5ErrorEE7getWireIS2_EES4_RKMS2_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_3OTAEE7getWireIS2_EES3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive8SettingsEE7getWireIS2_EEPS4_RKMS2_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive16ThrottleSettingsEE7getWireIS2_EEPS4_RKMS2_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_12PushSettingsEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_11VersionInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_
,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_9DailyInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_11JourneyInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_9MotorInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_8TimeInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_10DeviceInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_9ErrorInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_11BatteryInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,__ZN10emscripten8internal12MemberAccessI6PacketNS2_12DistanceInfoEE7getWireIS2_EEPS3_RKMS2_S3_RKT_,b3,b3,b3,__ZN10emscripten8internal12GetterPolicyIM6PacketKFivEE3getIS2_EEiRKS4_RKT_,b3,b3,b3,b3,b3,b3,b3,__ZN10emscripten8internal12GetterPolicyIM6PacketKFNSt3__26vectorIhNS3_9allocatorIhEEEEvEE3getIS2_EEPS7_RKS9_RKT_,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,__ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorIhNS2_9allocatorIhEEEEKFjvEjPKS6_JEE6invokeERKS8_SA_,b3,b3,b3,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_11ControlModeEE7getWireIS3_EES4_RKMS3_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_5UnitsEE7getWireIS3_EES4_RKMS3_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEE7getWireIS3_EES4_RKMS3_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3
,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet11VersionInfoEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEtE7getWireIS3_EEtRKMS3_tRKT_,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet12PushSettingsEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEtE7getWireIS3_EEtRKMS3_tRKT_,b3,__ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet12DistanceInfoEyE7getWireIS3_EEPyRKMS3_yRKT_,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEN5Motor5StateEE7getWireIS3_EES5_RKMS3_S5_RKT_,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEhE7getWireIS3_EEhRKMS3_hRKT_
,b3,b3,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEtE7getWireIS3_EEtRKMS3_tRKT_,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEN10SmartDrive5ErrorEE7getWireIS3_EES5_RKMS3_S5_RKT_,b3,__ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,__ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoENS2_6DeviceEE7getWireIS3_EES4_RKMS3_S4_RKT_,b3,__ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoEhE7getWireIS3_EEhRKMS3_hRKT_,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3];
var FUNCTION_TABLE_iiii = [b4,b4,___stdout_write,___stdio_seek,___stdio_write,b4,b4,b4,b4,b4,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,b4,b4,b4,b4,b4,b4,b4,b4,__ZNK10__cxxabiv123__fundamental_type_info9can_catchEPKNS_16__shim_type_infoERPv,b4,__ZNK10__cxxabiv119__pointer_type_info9can_catchEPKNS_16__shim_type_infoERPv,b4,__ZNK10__cxxabiv116__enum_type_info9can_catchEPKNS_16__shim_type_infoERPv,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4,b4,__ZN10emscripten8internal13MethodInvokerIM6PacketFbNSt3__212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEEbPS2_JS9_EE6invokeERKSB_SC_PNS0_11BindingTypeIS9_EUt_E,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,__ZN10emscripten8internal15FunctionInvokerIPFNS_3valERKNSt3__26vectorIhNS3_9allocatorIhEEEEjES2_S9_JjEE6invokeEPSB_PS7_j,__ZN10emscripten8internal12VectorAccessINSt3__26vectorIhNS2_9allocatorIhEEEEE3setERS6_jRKh,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4,b4,b4,b4,b4];
var FUNCTION_TABLE_iiiii = [b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5
,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5
,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5
,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,__ZN10emscripten8internal15FunctionInvokerIPFbRNSt3__26vectorIhNS2_9allocatorIhEEEEjRKhEbS7_JjS9_EE6invokeEPSB_PS6_jh,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5
,b5,b5,b5,b5,b5,b5,b5,b5,b5];
var FUNCTION_TABLE_v = [b6,b6,b6,b6,b6,__ZL25default_terminate_handlerv,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,__ZN10__cxxabiv112_GLOBAL__N_110construct_Ev,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6];
var FUNCTION_TABLE_vi = [b7,b7,b7,b7,b7,b7,__ZN10__cxxabiv116__shim_type_infoD2Ev,__ZN10__cxxabiv117__class_type_infoD0Ev,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,b7,b7,b7,b7,__ZN10__cxxabiv120__si_class_type_infoD0Ev,b7,b7,b7,__ZN10__cxxabiv123__fundamental_type_infoD0Ev,b7,__ZN10__cxxabiv119__pointer_type_infoD0Ev,b7,__ZN10__cxxabiv116__enum_type_infoD0Ev,b7,__ZN10__cxxabiv121__vmi_class_type_infoD0Ev,b7,b7,b7,b7
,__ZN10emscripten8internal14raw_destructorI6PacketEEvPT_,b7,b7,b7,b7,b7,b7,__ZN6Packet9newPacketEv,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,__ZN10emscripten8internal14raw_destructorINSt3__26vectorIhNS2_9allocatorIhEEEEEEvPT_,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN10SmartDrive8SettingsEEEvPT_,b7,b7,b7,b7,b7,b7,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN10SmartDrive16ThrottleSettingsEEEvPT_,b7,b7,b7,b7,b7
,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet11VersionInfoEEEvPT_,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet9DailyInfoEEEvPT_,b7,b7,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet12PushSettingsEEEvPT_,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet11JourneyInfoEEEvPT_,b7,b7,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet12DistanceInfoEEEvPT_,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet9MotorInfoEEEvPT_,b7,b7,b7
,b7,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet9ErrorInfoEEEvPT_,b7,b7,b7,b7,b7,b7,b7,__ZN10emscripten8internal14raw_destructorIN6Packet10DeviceInfoEEEvPT_,b7,b7,b7,b7,b7,__ZN10__cxxabiv112_GLOBAL__N_19destruct_EPv,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7];
var FUNCTION_TABLE_vii = [b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8
,b8,b8,b8,b8,b8,b8,b8,b8,__ZN10emscripten8internal13MethodInvokerIM6PacketFvvEvPS2_JEE6invokeERKS4_S5_,__ZN6Packet6formatEv,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8
,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,__ZN6Packet10setErrorIdEi,b8,b8,b8,__ZN6Packet16setMotorDistanceEi,b8,__ZN6Packet15setCaseDistanceEi,__ZNK6Packet8getBytesEv,__ZN6Packet8setBytesENSt3__26vectorIhNS0_9allocatorIhEEEE,b8,b8,__ZNSt3__26vectorIhNS_9allocatorIhEEE9push_backERKh
,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8
,b8,b8,b8,b8,b8,b8,b8,b8,b8];
var FUNCTION_TABLE_viid = [b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEfE7setWireIS3_EEvRKMS3_fRT_f,b9,b9,b9,b9,b9,b9,b9
,__ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEfE7setWireIS3_EEvRKMS3_fRT_f,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,__ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEfE7setWireIS3_EEvRKMS3_fRT_f,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9];
var FUNCTION_TABLE_viii = [b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,__ZN10emscripten8internal12MemberAccessI6PacketiE7setWireIS2_EEvRKMS2_iRT_i,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_4TypeEE7setWireIS2_EEvRKMS2_S3_RT_S3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_4DataEE7setWireIS2_EEvRKMS2_S3_RT_S3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_7CommandEE7setWireIS2_EEvRKMS2_S3_RT_S3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive5ErrorEE7setWireIS2_EEvRKMS2_S4_RT_S4_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_3OTAEE7setWireIS2_EEvRKMS2_S3_RT_S3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive8SettingsEE7setWireIS2_EEvRKMS2_S4_RT_PS4_,b10,__ZN10emscripten8internal12MemberAccessI6PacketN10SmartDrive16ThrottleSettingsEE7setWireIS2_EEvRKMS2_S4_RT_PS4_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_12PushSettingsEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10
,__ZN10emscripten8internal12MemberAccessI6PacketNS2_11VersionInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_9DailyInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_11JourneyInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_9MotorInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_8TimeInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_10DeviceInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_9ErrorInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_11BatteryInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,__ZN10emscripten8internal12MemberAccessI6PacketNS2_12DistanceInfoEE7setWireIS2_EEvRKMS2_S3_RT_PS3_,b10,b10,b10,__ZN10emscripten8internal12SetterPolicyIM6PacketFviEE3setIS2_EEvRKS4_RT_i,b10,b10,b10,b10,b10,b10,b10,__ZN10emscripten8internal12SetterPolicyIM6PacketFvNSt3__26vectorIhNS3_9allocatorIhEEEEEE3setIS2_EEvRKS9_RT_PS7_,b10
,__ZNSt3__26vectorIhNS_9allocatorIhEEE6resizeEjRKh,b10,b10,b10,b10,__ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvRKhEvPS6_JS8_EE6invokeERKSA_SB_h,b10,b10,b10,__ZN10emscripten8internal12VectorAccessINSt3__26vectorIhNS2_9allocatorIhEEEEE3getERKS6_j,b10,b10,b10,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_11ControlModeEE7setWireIS3_EEvRKMS3_S4_RT_S4_,b10,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsENS2_5UnitsEE7setWireIS3_EEvRKMS3_S4_RT_S4_,b10,__ZN10emscripten8internal12MemberAccessIN10SmartDrive8SettingsEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsENS2_12ThrottleModeEE7setWireIS3_EEvRKMS3_S4_RT_S4_,b10,__ZN10emscripten8internal12MemberAccessIN10SmartDrive16ThrottleSettingsEhE7setWireIS3_EEvRKMS3_hRT_h,b10
,b10,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet11VersionInfoEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEtE7setWireIS3_EEvRKMS3_tRT_t,b10,__ZN10emscripten8internal12MemberAccessIN6Packet9DailyInfoEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet12PushSettingsEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEtE7setWireIS3_EEvRKMS3_tRT_t,b10,__ZN10emscripten8internal12MemberAccessIN6Packet11JourneyInfoEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet12DistanceInfoEyE7setWireIS3_EEvRKMS3_yRT_Py,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEN5Motor5StateEE7setWireIS3_EEvRKMS3_S5_RT_S5_,b10
,__ZN10emscripten8internal12MemberAccessIN6Packet9MotorInfoEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEtE7setWireIS3_EEvRKMS3_tRT_t,b10,__ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEN10SmartDrive5ErrorEE7setWireIS3_EEvRKMS3_S5_RT_S5_,b10,__ZN10emscripten8internal12MemberAccessIN6Packet9ErrorInfoEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,__ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoENS2_6DeviceEE7setWireIS3_EEvRKMS3_S4_RT_S4_,b10,__ZN10emscripten8internal12MemberAccessIN6Packet10DeviceInfoEhE7setWireIS3_EEvRKMS3_hRT_h,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10];
var FUNCTION_TABLE_viiii = [b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b11,b11,b11,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b11,b11,b11,b11,b11,b11,b11,b11,b11,__ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b11
,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11
,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11
,b11,b11,b11,b11,b11,b11,__ZN10emscripten8internal13MethodInvokerIMNSt3__26vectorIhNS2_9allocatorIhEEEEFvjRKhEvPS6_JjS8_EE6invokeERKSA_SB_jh,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11
,b11,b11,b11,b11,b11,b11,b11,b11,b11];
var FUNCTION_TABLE_viiiii = [b12,b12,b12,b12,b12,b12,b12,b12,b12,b12,b12,b12,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b12,b12,b12,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b12,b12,b12,b12,b12,b12,b12,b12,b12,__ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b12,b12
,b12,b12,b12];
var FUNCTION_TABLE_viiiiii = [b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b13,b13,b13,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b13,b13,b13,b13,b13,b13,b13,b13,b13,__ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b13,b13,b13
,b13,b13,b13];

  return { __GLOBAL__sub_I_bind_cpp: __GLOBAL__sub_I_bind_cpp, __GLOBAL__sub_I_packet_cpp: __GLOBAL__sub_I_packet_cpp, ___cxa_can_catch: ___cxa_can_catch, ___cxa_is_pointer_type: ___cxa_is_pointer_type, ___errno_location: ___errno_location, ___getTypeName: ___getTypeName, ___udivdi3: ___udivdi3, ___uremdi3: ___uremdi3, _bitshift64Lshr: _bitshift64Lshr, _bitshift64Shl: _bitshift64Shl, _fflush: _fflush, _free: _free, _i64Add: _i64Add, _i64Subtract: _i64Subtract, _llvm_bswap_i32: _llvm_bswap_i32, _malloc: _malloc, _memcpy: _memcpy, _memset: _memset, _sbrk: _sbrk, dynCall_dii: dynCall_dii, dynCall_i: dynCall_i, dynCall_ii: dynCall_ii, dynCall_iii: dynCall_iii, dynCall_iiii: dynCall_iiii, dynCall_iiiii: dynCall_iiiii, dynCall_v: dynCall_v, dynCall_vi: dynCall_vi, dynCall_vii: dynCall_vii, dynCall_viid: dynCall_viid, dynCall_viii: dynCall_viii, dynCall_viiii: dynCall_viiii, dynCall_viiiii: dynCall_viiiii, dynCall_viiiiii: dynCall_viiiiii, establishStackSpace: establishStackSpace, getTempRet0: getTempRet0, runPostSets: runPostSets, setTempRet0: setTempRet0, setThrew: setThrew, stackAlloc: stackAlloc, stackRestore: stackRestore, stackSave: stackSave };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var real___GLOBAL__sub_I_bind_cpp = asm["__GLOBAL__sub_I_bind_cpp"]; asm["__GLOBAL__sub_I_bind_cpp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real___GLOBAL__sub_I_bind_cpp.apply(null, arguments);
};

var real___GLOBAL__sub_I_packet_cpp = asm["__GLOBAL__sub_I_packet_cpp"]; asm["__GLOBAL__sub_I_packet_cpp"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real___GLOBAL__sub_I_packet_cpp.apply(null, arguments);
};

var real____cxa_can_catch = asm["___cxa_can_catch"]; asm["___cxa_can_catch"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____cxa_can_catch.apply(null, arguments);
};

var real____cxa_is_pointer_type = asm["___cxa_is_pointer_type"]; asm["___cxa_is_pointer_type"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____cxa_is_pointer_type.apply(null, arguments);
};

var real____errno_location = asm["___errno_location"]; asm["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____errno_location.apply(null, arguments);
};

var real____getTypeName = asm["___getTypeName"]; asm["___getTypeName"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____getTypeName.apply(null, arguments);
};

var real____udivdi3 = asm["___udivdi3"]; asm["___udivdi3"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____udivdi3.apply(null, arguments);
};

var real____uremdi3 = asm["___uremdi3"]; asm["___uremdi3"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____uremdi3.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__bitshift64Lshr.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__bitshift64Shl.apply(null, arguments);
};

var real__fflush = asm["_fflush"]; asm["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fflush.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__free.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__i64Add.apply(null, arguments);
};

var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__i64Subtract.apply(null, arguments);
};

var real__llvm_bswap_i32 = asm["_llvm_bswap_i32"]; asm["_llvm_bswap_i32"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__llvm_bswap_i32.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__malloc.apply(null, arguments);
};

var real__sbrk = asm["_sbrk"]; asm["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__sbrk.apply(null, arguments);
};

var real_establishStackSpace = asm["establishStackSpace"]; asm["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_establishStackSpace.apply(null, arguments);
};

var real_getTempRet0 = asm["getTempRet0"]; asm["getTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_getTempRet0.apply(null, arguments);
};

var real_setTempRet0 = asm["setTempRet0"]; asm["setTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_setTempRet0.apply(null, arguments);
};

var real_setThrew = asm["setThrew"]; asm["setThrew"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_setThrew.apply(null, arguments);
};

var real_stackAlloc = asm["stackAlloc"]; asm["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackAlloc.apply(null, arguments);
};

var real_stackRestore = asm["stackRestore"]; asm["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackRestore.apply(null, arguments);
};

var real_stackSave = asm["stackSave"]; asm["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackSave.apply(null, arguments);
};
var __GLOBAL__sub_I_bind_cpp = Module["__GLOBAL__sub_I_bind_cpp"] = asm["__GLOBAL__sub_I_bind_cpp"];
var __GLOBAL__sub_I_packet_cpp = Module["__GLOBAL__sub_I_packet_cpp"] = asm["__GLOBAL__sub_I_packet_cpp"];
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var ___getTypeName = Module["___getTypeName"] = asm["___getTypeName"];
var ___udivdi3 = Module["___udivdi3"] = asm["___udivdi3"];
var ___uremdi3 = Module["___uremdi3"] = asm["___uremdi3"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var _free = Module["_free"] = asm["_free"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _memset = Module["_memset"] = asm["_memset"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
var setThrew = Module["setThrew"] = asm["setThrew"];
var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
var stackRestore = Module["stackRestore"] = asm["stackRestore"];
var stackSave = Module["stackSave"] = asm["stackSave"];
var dynCall_dii = Module["dynCall_dii"] = asm["dynCall_dii"];
var dynCall_i = Module["dynCall_i"] = asm["dynCall_i"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_viid = Module["dynCall_viid"] = asm["dynCall_viid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
;



// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;

if (!Module["intArrayFromString"]) Module["intArrayFromString"] = function() { abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["intArrayToString"]) Module["intArrayToString"] = function() { abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["ccall"]) Module["ccall"] = function() { abort("'ccall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["cwrap"]) Module["cwrap"] = function() { abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["setValue"]) Module["setValue"] = function() { abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getValue"]) Module["getValue"] = function() { abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["allocate"]) Module["allocate"] = function() { abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getMemory"]) Module["getMemory"] = function() { abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["Pointer_stringify"]) Module["Pointer_stringify"] = function() { abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["AsciiToString"]) Module["AsciiToString"] = function() { abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToAscii"]) Module["stringToAscii"] = function() { abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF8ArrayToString"]) Module["UTF8ArrayToString"] = function() { abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF8ToString"]) Module["UTF8ToString"] = function() { abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF8Array"]) Module["stringToUTF8Array"] = function() { abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF8"]) Module["stringToUTF8"] = function() { abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF8"]) Module["lengthBytesUTF8"] = function() { abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF16ToString"]) Module["UTF16ToString"] = function() { abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF16"]) Module["stringToUTF16"] = function() { abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF16"]) Module["lengthBytesUTF16"] = function() { abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF32ToString"]) Module["UTF32ToString"] = function() { abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF32"]) Module["stringToUTF32"] = function() { abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF32"]) Module["lengthBytesUTF32"] = function() { abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["allocateUTF8"]) Module["allocateUTF8"] = function() { abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackTrace"]) Module["stackTrace"] = function() { abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPreRun"]) Module["addOnPreRun"] = function() { abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnInit"]) Module["addOnInit"] = function() { abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPreMain"]) Module["addOnPreMain"] = function() { abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnExit"]) Module["addOnExit"] = function() { abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPostRun"]) Module["addOnPostRun"] = function() { abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeStringToMemory"]) Module["writeStringToMemory"] = function() { abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeArrayToMemory"]) Module["writeArrayToMemory"] = function() { abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeAsciiToMemory"]) Module["writeAsciiToMemory"] = function() { abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addRunDependency"]) Module["addRunDependency"] = function() { abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["removeRunDependency"]) Module["removeRunDependency"] = function() { abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS"]) Module["FS"] = function() { abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["FS_createFolder"]) Module["FS_createFolder"] = function() { abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createPath"]) Module["FS_createPath"] = function() { abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createDataFile"]) Module["FS_createDataFile"] = function() { abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createPreloadedFile"]) Module["FS_createPreloadedFile"] = function() { abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createLazyFile"]) Module["FS_createLazyFile"] = function() { abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createLink"]) Module["FS_createLink"] = function() { abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createDevice"]) Module["FS_createDevice"] = function() { abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_unlink"]) Module["FS_unlink"] = function() { abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["GL"]) Module["GL"] = function() { abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["staticAlloc"]) Module["staticAlloc"] = function() { abort("'staticAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["dynamicAlloc"]) Module["dynamicAlloc"] = function() { abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["warnOnce"]) Module["warnOnce"] = function() { abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["loadDynamicLibrary"]) Module["loadDynamicLibrary"] = function() { abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["loadWebAssemblyModule"]) Module["loadWebAssemblyModule"] = function() { abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getLEB"]) Module["getLEB"] = function() { abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getFunctionTables"]) Module["getFunctionTables"] = function() { abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["alignFunctionTables"]) Module["alignFunctionTables"] = function() { abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["registerFunctions"]) Module["registerFunctions"] = function() { abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addFunction"]) Module["addFunction"] = function() { abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["removeFunction"]) Module["removeFunction"] = function() { abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getFuncWrapper"]) Module["getFuncWrapper"] = function() { abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["prettyPrint"]) Module["prettyPrint"] = function() { abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["makeBigInt"]) Module["makeBigInt"] = function() { abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["dynCall"]) Module["dynCall"] = function() { abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getCompilerSetting"]) Module["getCompilerSetting"] = function() { abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackSave"]) Module["stackSave"] = function() { abort("'stackSave' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackRestore"]) Module["stackRestore"] = function() { abort("'stackRestore' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackAlloc"]) Module["stackAlloc"] = function() { abort("'stackAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["intArrayFromBase64"]) Module["intArrayFromBase64"] = function() { abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["tryParseAsDataURI"]) Module["tryParseAsDataURI"] = function() { abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };if (!Module["ALLOC_NORMAL"]) Object.defineProperty(Module, "ALLOC_NORMAL", { get: function() { abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_STACK"]) Object.defineProperty(Module, "ALLOC_STACK", { get: function() { abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_STATIC"]) Object.defineProperty(Module, "ALLOC_STATIC", { get: function() { abort("'ALLOC_STATIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_DYNAMIC"]) Object.defineProperty(Module, "ALLOC_DYNAMIC", { get: function() { abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_NONE"]) Object.defineProperty(Module, "ALLOC_NONE", { get: function() { abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });

if (memoryInitializer) {
  if (!isDataURI(memoryInitializer)) {
    if (typeof Module['locateFile'] === 'function') {
      memoryInitializer = Module['locateFile'](memoryInitializer);
    } else if (Module['memoryInitializerPrefixURL']) {
      memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
    }
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, GLOBAL_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[GLOBAL_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, GLOBAL_BASE);
      // Delete the typed array that contains the large blob of the memory initializer request response so that
      // we won't keep unnecessary memory lying around. However, keep the XHR object itself alive so that e.g.
      // its .status field can still be accessed later.
      if (Module['memoryInitializerRequest']) delete Module['memoryInitializerRequest'].response;
      removeRunDependency('memory initializer');
    }
    function doBrowserLoad() {
      Module['readAsync'](memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
    var memoryInitializerBytes = tryParseAsDataURI(memoryInitializer);
    if (memoryInitializerBytes) {
      applyMemoryInitializer(memoryInitializerBytes.buffer);
    } else
    if (Module['memoryInitializerRequest']) {
      // a network request has already been created, just use that
      function useRequest() {
        var request = Module['memoryInitializerRequest'];
        var response = request.response;
        if (request.status !== 200 && request.status !== 0) {
          var data = tryParseAsDataURI(Module['memoryInitializerRequestURL']);
          if (data) {
            response = data.buffer;
          } else {
            // If you see this warning, the issue may be that you are using locateFile or memoryInitializerPrefixURL, and defining them in JS. That
            // means that the HTML file doesn't know about them, and when it tries to create the mem init request early, does it to the wrong place.
            // Look in your browser's devtools network console to see what's going on.
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
            doBrowserLoad();
            return;
          }
        }
        applyMemoryInitializer(response);
      }
      if (Module['memoryInitializerRequest'].response) {
        setTimeout(useRequest, 0); // it's already here; but, apply it asynchronously
      } else {
        Module['memoryInitializerRequest'].addEventListener('load', useRequest); // wait for it
      }
    } else {
      // fetch it from the network ourselves
      doBrowserLoad();
    }
  }
}



/**
 * @constructor
 * @extends {Error}
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}





/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (runDependencies > 0) {
    return;
  }

  writeStackCookie();

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}
Module['run'] = run;

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in NO_FILESYSTEM
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var print = Module['print'];
  var printErr = Module['printErr'];
  var has = false;
  Module['print'] = Module['printErr'] = function(x) {
    has = true;
  }
  try { // it doesn't matter if it fails
    var flush = flush_NO_FILESYSTEM;
    if (flush) flush(0);
  } catch(e) {}
  Module['print'] = print;
  Module['printErr'] = printErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set NO_EXIT_RUNTIME to 0 (see the FAQ), or make sure to emit a newline when you printf etc.');
  }
}

function exit(status, implicit) {
  checkUnflushedContent();

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && Module['noExitRuntime'] && status === 0) {
    return;
  }

  if (Module['noExitRuntime']) {
    // if exit() was called, we may warn the user if the runtime isn't actually being shut down
    if (!implicit) {
      Module.printErr('exit(' + status + ') called, but NO_EXIT_RUNTIME is set, so halting execution but not exiting the runtime or preventing further async execution (build with NO_EXIT_RUNTIME=0, if you want a true shutdown)');
    }
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  }
  Module['quit'](status, new ExitStatus(status));
}
Module['exit'] = exit;

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';
  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


Module["noExitRuntime"] = true;

run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}



