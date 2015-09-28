// MP4 test

onmessage = function(event) {
    self.unitTest = event.data; // { message, setting: { secondary, baseDir } }

    if (!self.console) { // polyfill WebWorkerConsole
        self.console = function() {};
        self.console.dir = function() {};
        self.console.log = function() {};
        self.console.warn = function() {};
        self.console.error = function() {};
        self.console.table = function() {};
    }

    importScripts("../lib/WebModule.js");

    // publish to global
    WebModule.publish = true;

    importScripts("../node_modules/uupaa.bit.js/lib/Bit.js");
    importScripts("../node_modules/uupaa.typedarray.js/lib/TypedArray.js");
    importScripts("wmtools.js");
    importScripts("../lib/MP4.js");
    importScripts("../release/MP4.w.min.js");
    importScripts("testcase.js");

    self.postMessage(self.unitTest);
};

