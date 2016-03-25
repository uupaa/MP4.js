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

    importScripts("../../lib/WebModule.js");

    WebModule.verify  = true;
    WebModule.verbose = true;
    WebModule.publish = true;

    importScripts("../../node_modules/uupaa.task.js/lib/Task.js");
    importScripts("../../node_modules/uupaa.task.js/lib/TaskMap.js");
    importScripts("../../node_modules/uupaa.fileloader.js/lib/FileLoader.js");
    importScripts("../../node_modules/uupaa.hexdump.js/lib/HexDump.js");
    importScripts("../../node_modules/uupaa.bit.js/lib/Bit.js");
    importScripts("../../node_modules/uupaa.bit.js/lib/BitView.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitType.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitParameterSet.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitEBSP.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitAUD.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitSPS.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitPPS.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitSEI.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnitIDR.js");
    importScripts("../../node_modules/uupaa.nalunit.js/lib/NALUnit.js");
    importScripts("../../node_modules/uupaa.h264rawstream.js/lib/H264RawStream.js");
    importScripts("../../node_modules/uupaa.typedarray.js/lib/TypedArray.js");
    importScripts("../wmtools.js");
    importScripts("../../lib/MP4Builder.js");
    importScripts("../../lib/MP4Muxer.js");
    importScripts("../../lib/MP4Parser.js");
    importScripts("../../lib/MP4.js");
    importScripts("../../release/MP4.w.min.js");
    importScripts("../testcase.js");

    self.postMessage(self.unitTest);
};

