var ModuleTestMP4 = (function(global) {

global["BENCHMARK"] = false;

var test = new Test("MP4", {
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     true,  // enable worker test.
        node:       true,  // enable node test.
        nw:         true,  // enable nw.js test.
        button:     true,  // show button.
        both:       true,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
        }
    }).add([
        // generic test
    ]);

if (IN_BROWSER || IN_NW) {
    test.add([
        testMP4_parse,
        testMP4_parse_multitrack,
        // browser and node-webkit test
    ]);
} else if (IN_WORKER) {
    test.add([
        // worker test
    ]);
} else if (IN_NODE) {
    test.add([
        // node.js and io.js test
    ]);
}

// --- test cases ------------------------------------------
function testMP4_parse(test, pass, miss) {
    var url = "../node_modules/uupaa.assetfortest.js/assets/MP4/res/video/7.mp4";
//    MP4.VERBOSE = true;
    global["BENCHMARK"] = true;

    TypedArray.toArrayBuffer(url, function(buffer) {
        console.log("LOADED: ", url, buffer.byteLength);

        var now = performance.now();
        var mp4box = MP4.parse(new Uint8Array(buffer));
        var cost = performance.now() - now;
        console.log("parse cost: " + cost);
        console.dir(mp4box);

        if (mp4box.ftyp &&
            mp4box.mdat &&
            mp4box.moov &&
            mp4box.moov.mvhd &&
            mp4box.moov.trak &&
            Array.isArray(mp4box.moov.trak) &&
            mp4box.moov.trak[0].edts &&
            mp4box.moov.trak[0].edts.elst &&
            mp4box.moov.trak[0].mdia &&
            mp4box.moov.trak[0].mdia.hdlr &&
            mp4box.moov.trak[0].mdia.mdhd &&
            mp4box.moov.trak[0].mdia.minf &&
            mp4box.moov.trak[0].mdia.minf.dinf &&
            mp4box.moov.trak[0].mdia.minf.dinf.dref &&
            mp4box.moov.trak[0].mdia.minf.stbl &&
            mp4box.moov.trak[0].mdia.minf.stbl.stco &&
            mp4box.moov.trak[0].mdia.minf.stbl.stsc &&
            mp4box.moov.trak[0].mdia.minf.stbl.stsd &&
            mp4box.moov.trak[0].mdia.minf.stbl.stss &&
            mp4box.moov.trak[0].mdia.minf.stbl.stsz &&
            mp4box.moov.trak[0].mdia.minf.stbl.stts &&
            mp4box.moov.trak[0].mdia.minf.vmhd &&
            mp4box.moov.trak[0].tkhd &&
            mp4box.moov.udta &&
            mp4box.moov.udta.meta &&
            mp4box.moov.udta.meta.hdlr &&
            mp4box.moov.udta.meta.ilst) {

            test.done(pass());
        } else {
            test.done(miss());
        }

    }, function(error) {
        console.error(error.message);
    });
}

function testMP4_parse_multitrack(test, pass, miss) {
    var url = "./320x180.mp4";
//    MP4.VERBOSE = true;
    global["BENCHMARK"] = true;

    TypedArray.toArrayBuffer(url, function(buffer) {
        console.log("LOADED: ", url, buffer.byteLength);

        var now = performance.now();
        var mp4box = MP4.parse(new Uint8Array(buffer));
        var cost = performance.now() - now;
        console.log("parse cost: " + cost);
        console.dir(mp4box);

        if (mp4box.ftyp &&
            mp4box.mdat &&
            mp4box.moov &&
            mp4box.moov.mvhd &&
            mp4box.moov.trak &&
            Array.isArray(mp4box.moov.trak) &&
/*
            mp4box.moov.trak.edts &&
            mp4box.moov.trak.edts.elst &&
            mp4box.moov.trak.mdia &&
            mp4box.moov.trak.mdia.hdlr &&
            mp4box.moov.trak.mdia.mdhd &&
            mp4box.moov.trak.mdia.minf &&
            mp4box.moov.trak.mdia.minf.dinf &&
            mp4box.moov.trak.mdia.minf.dinf.dref &&
            mp4box.moov.trak.mdia.minf.stbl &&
            mp4box.moov.trak.mdia.minf.stbl.stco &&
            mp4box.moov.trak.mdia.minf.stbl.stsc &&
            mp4box.moov.trak.mdia.minf.stbl.stsd &&
            mp4box.moov.trak.mdia.minf.stbl.stss &&
            mp4box.moov.trak.mdia.minf.stbl.stsz &&
            mp4box.moov.trak.mdia.minf.stbl.stts &&
            mp4box.moov.trak.mdia.minf.vmhd &&
            mp4box.moov.trak.tkhd &&
 */
            mp4box.moov.udta &&
            mp4box.moov.udta.meta &&
            mp4box.moov.udta.meta.hdlr &&
            mp4box.moov.udta.meta.ilst) {

            test.done(pass());
        } else {
            test.done(miss());
        }

    }, function(error) {
        console.error(error.message);
    });
}


return test.run();

})(GLOBAL);

