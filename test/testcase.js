var ModuleTestMP4 = (function(global) {

var test = new Test(["MP4"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     false, // enable worker test.
        node:       false, // enable node test.
        nw:         false, // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     true,  // show button.
        both:       false, // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

if (IN_BROWSER || IN_NW || IN_EL) {
    test.add([
            testH264RawStream,
            testMP4_ffmpeg_created_mp4_file,
    ]);
}

// --- test cases ------------------------------------------
function testH264RawStream(test, pass, miss) {
    //
    // $ npm run make_asset
    //
    // $ npm run el
    //
    // Raw H.264 file stream ( ff/png.00.mp4.264 ) の中身を確認する

    var url1 = "../assets/ff/png.00.mp4.264";
    var url2 = "../assets/ff/png.00.mp4";

    var task = new Task("testH264RawStream", 2, function(error, buffer) {
        // --- decode Raw H.264 stream ---
        var videoH264RawStream = buffer[0];
        var videoNALUnitObject = H264RawStream.toNALUnitObject( videoH264RawStream );

/*
        HexDump(videoH264RawStream);

        console.dir(videoNALUnitObject[0]);
        console.dir(videoNALUnitObject[1]);

        if (videoNALUnitObject[0].NAL_UNIT_TYPE === "SEI" &&
            videoNALUnitObject[1].NAL_UNIT_TYPE === "IDR") {
            test.done(pass());
        } else {
            test.done(miss());
        }
 */

        // --- decode MP4 file ---
        var mp4box = MP4Parser.parse( buffer[1] );
/*
        HexDump(mp4box.root.mdat.data);

        console.dir(mp4box);
 */

        if ( _binaryCompare(videoH264RawStream, mp4box.root.mdat.data) ) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    });

    FileLoader.toArrayBuffer(url1, function(buffer, url) {
        console.log("LOAD FROM: ", url, buffer.byteLength);
        task.buffer[0] = new Uint8Array(buffer);
        task.pass();
    });

    FileLoader.toArrayBuffer(url2, function(buffer, url) {
        console.log("LOAD FROM: ", url, buffer.byteLength);
        task.buffer[1] = new Uint8Array(buffer);
        task.pass();
    });
}

function _binaryCompare(a, b) {
    if (a.length !== b.length) {
        debugger;
        return false;
    }

    for (var i = 0, iz = a.length; i < iz; ++i) {
        if (a[i] !== b[i]) {
debugger;
            return false;
        }
    }
    return true;
}




function testMP4_ffmpeg_created_mp4_file(test, pass, miss) {
    // MP4.parse("ff/png.00.mp4") して mdat の中身を tree 表示する。目視で確認

console.clear();
    var url1 = "../assets/ff/png.00.mp4";

    FileLoader.toArrayBuffer(url1, function(buffer) {
        console.log("LOAD FROM: ", url1, buffer.byteLength);
        var mp4box1;

        mp4box1 = MP4Parser.parse( new Uint8Array(buffer) );

        console.info("mp4box1");
        console.dir(mp4box1);

        console.info("mp4box1.root.moov.trak[0].mdia.minf.stbl");
        console.dir(mp4box1.root.moov.trak[0].mdia.minf.stbl);

        HexDump(mp4box1.root.mdat.data, {
            title: "mp4box1.root.mdat.data",
            rule: {}
        });

        test.done(pass());
    }, function(error) {
        console.error(error.message);
    });
}

return test.run();

})(GLOBAL);

