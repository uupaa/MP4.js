// MP4 test

require("../lib/WebModule.js");

// publish to global
WebModule.publish = true;

require("../node_modules/uupaa.bit.js/lib/Bit.js");
require("../node_modules/uupaa.typedarray.js/lib/TypedArray.js");
require("./wmtools.js");
require("../lib/MP4.js");
require("../release/MP4.n.min.js");
require("./testcase.js");

