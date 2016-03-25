(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4", function moduleClosure(/* global */) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var VERIFY  = global["WebModule"]["verify"]  || false;
//var VERBOSE = global["WebModule"]["verbose"] || false;

// --- class / interfaces ----------------------------------
var MP4 = {
    "repository": "https://github.com/uupaa/MP4.js",
};

// --- implements ------------------------------------------

return MP4; // return entity

});

