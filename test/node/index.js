// MP4 test

require("../../lib/WebModule.js");

WebModule.verify  = true;
WebModule.verbose = true;
WebModule.publish = true;

require("../../node_modules/uupaa.task.js/lib/Task.js");
require("../../node_modules/uupaa.task.js/lib/TaskMap.js");
require("../../node_modules/uupaa.fileloader.js/lib/FileLoader.js");
require("../../node_modules/uupaa.hexdump.js/lib/HexDump.js");
require("../../node_modules/uupaa.bit.js/lib/Bit.js");
require("../../node_modules/uupaa.bit.js/lib/BitView.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitType.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitParameterSet.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitEBSP.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitAUD.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitSPS.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitPPS.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitSEI.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnitIDR.js");
require("../../node_modules/uupaa.nalunit.js/lib/NALUnit.js");
require("../../node_modules/uupaa.h264rawstream.js/lib/H264RawStream.js");
require("../../node_modules/uupaa.typedarray.js/lib/TypedArray.js");
require("../wmtools.js");
require("../../lib/MP4Builder.js");
require("../../lib/MP4Muxer.js");
require("../../lib/MP4Parser.js");
require("../../lib/MP4.js");
require("../../release/MP4.n.min.js");
require("../testcase.js");

