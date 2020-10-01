# Generating Packet_Bindings.js

To create the packet bindings (following [the emscripten
guide](https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html)):

```bash
em++ -Wall --bind -o packet_bindings.js -s ENVIRONMENT=node -s WASM=0 packet.cpp
```

You will then need to edit the generated `packet_bindings.js` so that it is loadable and executable within `{N}`.

* remove (line ~82):

        if (!(typeof process === 'object' && typeof require === 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

* comment out lines 111-115:

```js
if (process['argv'].length > 1) {
  thisProgram = process['argv'][1].replace(/\\/g, '/');
}

arguments_ = process['argv'].slice(2);
```

* comment out lines 121-128:

```js
process['on']('uncaughtException', function(ex) {
  // suppress ExitStatus exceptions from showing an error
  if (!(ex instanceof ExitStatus)) {
    throw ex;
  }
});

process['on']('unhandledRejection', abort);
```
