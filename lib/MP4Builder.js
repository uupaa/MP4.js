(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4Builder", function moduleClosure(/* global */) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var VERIFY  = global["WebModule"]["verify"]  || false;
//var VERBOSE = global["WebModule"]["verbose"] || false;

// --- class / interfaces ----------------------------------
var MP4Builder = {
    "build": MP4Builder_build, // MP4Builder.build(tree:MP4BoxTreeObject):Uint8Array
};

// --- implements ------------------------------------------
function MP4Builder_build(tree) { // @arg MP4BoxTreeObject - { root: { ftyp, moov: {...}, free, mdat } }
                                  // @ret Uint8Array
    var fileStream = _build(tree); // ISOBaseMediaFormatUint8Array

    return _overwriteChunkOffset(fileStream);
}

function _build(tree) { // @arg MP4BoxTreeObject - { root: { ftyp, moov: {...}, free, mdat } }
    var track = [null, null]; // [ VideoTrack, AudioTrack ]

    // add Video track
    if (_findBoxByPath(tree, "moov/trak:0")) {
        track[0] = [
            _tkhd(tree, "moov/trak:0/tkhd"),
            _edts(tree, "moov/trak:0/edts",
                _elst(tree, "moov/trak:0/edts/elst")),
            _mdia(tree, "moov/trak:0/mdia",
                _mdhd(tree, "moov/trak:0/mdia/mdhd"),
                _hdlr(tree, "moov/trak:0/mdia/hdlr"),
                _minf(tree, "moov/trak:0/mdia/minf",
                    _vmhd(tree, "moov/trak:0/mdia/minf/vmhd"),
                    _dinf(tree, "moov/trak:0/mdia/minf/dinf",
                        _dref(tree, "moov/trak:0/mdia/minf/dinf/dref")),
                    _stbl(tree, "moov/trak:0/mdia/minf/stbl",
                        _stsd(tree, "moov/trak:0/mdia/minf/stbl/stsd",
                            _avc1(tree, "moov/trak:0/mdia/minf/stbl/stsd/avc1",
                                _avcC(tree, "moov/trak:0/mdia/minf/stbl/stsd/avc1/avcC"))),
                        _stts(tree, "moov/trak:0/mdia/minf/stbl/stts"),
                        _stss(tree, "moov/trak:0/mdia/minf/stbl/stss"),
                        _stsc(tree, "moov/trak:0/mdia/minf/stbl/stsc"),
                        _stsz(tree, "moov/trak:0/mdia/minf/stbl/stsz"),
                        _stco(tree, "moov/trak:0/mdia/minf/stbl/stco"))))
        ];
    }
    // add Audio track
    // --- not impl ---

    return _buildMP4FileStructure(  _ftyp(tree, "ftyp"),
                                    _moov(tree, "moov",
                                        _mvhd(tree, "moov/mvhd"),
                                        _trak(tree, "moov/trak", track),
                                        _udta(tree, "moov/udta",
                                            _meta(tree, "moov/udta/meta",
                                            _hdlr(tree, "moov/udta/meta/hdlr"),
                                            _ilst(tree, "moov/udta/meta/ilst")))),
                                    _free(tree, "free"),
                                    _mdat(tree, "mdat"));
}

function _buildMP4FileStructure() { // @var_args [MP4BoxClassViewObject|MP4BoxClassFullViewObject, ...]
    var args = arguments;
    var bufferLength = _getTotalBufferLength(args);
    var resultBuffer = new Uint8Array(bufferLength);

    return _concatBuffer(resultBuffer, 0, args);
}

function _ftyp(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createBoxClassView( _getLastBoxType(path) );

    _writeT(view, box["major_brand"], 4);
    _write4(view, box["minor_version"]);
    _writeT(view, box["compatible_brands"][0], 4);
    _writeT(view, box["compatible_brands"][1], 4);
    _writeT(view, box["compatible_brands"][2], 4);
    _writeT(view, box["compatible_brands"][3], 4);
    return _writeBoxSize(view, view.source.length);
}

function _moov(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var view = _createBoxClassView( _getLastBoxType(path) );

    return _closeContainer(view, arguments);
}

function _mdat(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box     = _findBoxByPath(tree, path);
    var boxSize = 4 + 4 + box["data"].length; // | BoxSize(4) | BoxType(4) | BoxData(n) |
    var boxType = _getLastBoxType(path);
    var view    = { source: new Uint8Array(boxSize), cursor: 0 };

    view.source[0] = (boxSize >>> 24) & 0xff;
    view.source[1] = (boxSize >>> 16) & 0xff;
    view.source[2] = (boxSize >>>  8) & 0xff;
    view.source[3] = (boxSize >>>  0) & 0xff;
    view.source[4] = boxType.charCodeAt(0);
    view.source[5] = boxType.charCodeAt(1);
    view.source[6] = boxType.charCodeAt(2);
    view.source[7] = boxType.charCodeAt(3);
    view.source.set(box["data"], 8);
    return view.source;
}

function _free(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    if (box) {
        var view = _createBoxClassView( _getLastBoxType(path) );

        _writeN(view, box["data"], box["data"].length);
        return _writeBoxSize(view, view.source.length);
    }
    return null;
}

function _mvhd(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] );
    _write4(view, box["creation_time"]);
    _write4(view, box["modification_time"]);
    _write4(view, box["timescale"]);
    _write4(view, box["duration"]);
    _write4(view, box["rate"]);
    _write2(view, box["volume"]);
    _write2(view, 0);               // reserved = 0
    _write4(view, 0);               // reserved = 0
    _write4(view, 0);               // reserved = 0
    _write4(view, box["matrix"][0]);
    _write4(view, box["matrix"][1]);
    _write4(view, box["matrix"][2]);
    _write4(view, box["matrix"][3]);
    _write4(view, box["matrix"][4]);
    _write4(view, box["matrix"][5]);
    _write4(view, box["matrix"][6]);
    _write4(view, box["matrix"][7]);
    _write4(view, box["matrix"][8]);
    _write4(view, 0);               // pre_defined[0]
    _write4(view, 0);               // pre_defined[1]
    _write4(view, 0);               // pre_defined[2]
    _write4(view, 0);               // pre_defined[3]
    _write4(view, 0);               // pre_defined[4]
    _write4(view, 0);               // pre_defined[5]
    _write4(view, box["next_track_ID"]);
    return _writeBoxSize(view, view.source.length);
}

function _trak(tree,    // @arg MP4BoxTreeObject
               path,    // @arg MP4BoxPathString
               track) { // @arg TrackObjectArray - [first-track, second-track]
    var view = _createBoxClassView( _getLastBoxType(path) );
    var trackLengthArray = [
        track[0] ? _getTotalBufferLength(track[0]) : 0, // video-track buffer length
        track[1] ? _getTotalBufferLength(track[1]) : 0, // audio-track buffer length
    ];
    var totalBufferLength = view.source.length + trackLengthArray[0] + trackLengthArray[1];

    _writeBoxSize(view, totalBufferLength);

    // --- concat children box ---
    var newBuffer = new Uint8Array(totalBufferLength);
    var newCursor = 0;

    newBuffer.set(view.source, newCursor);
    newCursor += view.source.length;

    if (track[0]) {
        newBuffer.set(track[0], newCursor);
        newCursor += trackLengthArray[0];
    }
    if (track[1]) {
        newBuffer.set(track[1], newCursor);
        newCursor += trackLengthArray[1];
    }
    return newBuffer;
}

function _tkhd(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] ); // 0, 3
    _write4(view, box["creation_time"]);
    _write4(view, box["modification_time"]);
    _write4(view, box["track_ID"]);
    _write4(view, 0);               // reserved = 0;
    _write4(view, box["duration"]);
    _write4(view, 0);               // reserved = 0;
    _write4(view, 0);               // reserved = 0;
    _write2(view, box["layer"]);
    _write2(view, box["alternate_group"]);
    _write2(view, box["volume"]);
    _write2(view, 0);               // reserved = 0;
    _write4(view, box["matrix"][0]);
    _write4(view, box["matrix"][1]);
    _write4(view, box["matrix"][2]);
    _write4(view, box["matrix"][3]);
    _write4(view, box["matrix"][4]);
    _write4(view, box["matrix"][5]);
    _write4(view, box["matrix"][6]);
    _write4(view, box["matrix"][7]);
    _write4(view, box["matrix"][8]);
    _write4(view, box["width"]);
    _write4(view, box["height"]);
    return _writeBoxSize(view, view.source.length);
}

function _edts(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    if (box) {
        return _closeContainer( _createBoxClassView( _getLastBoxType(path) ), arguments );
    }
    return null;
}

function _elst(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] );

    _write4(view, box["entry_count"]);

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        var entries = box["entries"][i];

        _write4(view, entries["segment_duration"]);
        _write4(view, entries["media_time"]);
        _write2(view, entries["media_rate_integer"]);
        _write2(view, entries["media_rate_fraction"]);
    }
    return _writeBoxSize(view, view.source.length);
}

function _mdia(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    return _closeContainer( _createBoxClassView( _getLastBoxType(path) ), arguments );
}

function _mdhd(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] );
    _write4(view, box["creation_time"]);
    _write4(view, box["modification_time"]);
    _write4(view, box["timescale"]);
    _write4(view, box["duration"]);
    _write2(view, (box["language"].charCodeAt(0) - 0x60) << 10 |
                  (box["language"].charCodeAt(1) - 0x60) <<  5 |
                  (box["language"].charCodeAt(2) - 0x60));
    _write2(view, 0); // pre_defined
    return _writeBoxSize(view, view.source.length);
}

function _hdlr(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString - "moov/trak:0/mdia/hdlr" or "moov/udta/meta/hdlr"
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] );
    _write4(view, 0);                               // pre_defined = 0
    _writeT(view, box["handler_type"],  4);         // "mdir"
    _write4(view, box["handler_type2"]);            // "appl"
    _write4(view, 0);                               // reserved = 0
    _write4(view, 0);                               // reserved = 0
    _writeT(view, box["name"], box["name"].length);
    _write1(view, 0x00);                            // add null-terminate
    return _writeBoxSize(view, view.source.length);
}

function _minf(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    return _closeContainer( _createBoxClassView( _getLastBoxType(path) ), arguments );
}

function _vmhd(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(path),
                                            box["version"], box["flags"] ); // 0, 1 (flags always 1)
        _write2(view, box["graphicsmode"]);
        _write2(view, box["opcolor"][0]);
        _write2(view, box["opcolor"][1]);
        _write2(view, box["opcolor"][2]);
        return _writeBoxSize(view, view.source.length);
    }
    return null;
}

function _dinf(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    return _closeContainer( _createBoxClassView( _getLastBoxType(path) ), arguments );
}

function _dref(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] ); // 0, 0
    var subview = []; // [entry-view, ...]

    _write4(view, box["entry_count"]);
    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        subview.push( _url_(tree, path + "/url :" + i) ); // "moov/trak:0/mdia/minf/dinf/dref/url :0"
    }
    var totalBufferLength = _getTotalBufferLength(subview) + view.source.length;

    _writeBoxSize(view, totalBufferLength);

    var newBuffer = new Uint8Array(totalBufferLength);

    newBuffer.set(view.source, 0); // copy
    newBuffer.set(subview, view.source.length);
    return newBuffer;
}

function _url_(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( "url ",
                                        box["version"], box["flags"] ); // 0, 0x000000 or 0x000001
    var url  = box["url"];

    if (url.length) { // workaround. 長さゼロなら null を出力しない
        for (var i = 0, jz = url.length; i < jz; ++i) {
            _write1(view, url.charCodeAt(i));
        }
        _write1(view, 0); // add null-terminater
    }
    return _writeBoxSize(view, view.source.length);
}

function _stbl(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    return _closeContainer( _createBoxClassView( _getLastBoxType(path) ), arguments );
}

function _stsd(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] ); // 0, 0
    _write4(view, box["entry_count"]);

    return _closeContainer(view, arguments);
}

function _stts(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] ); // 0, 0
    _write4(view, box["entry_count"]);

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        _write4(view, box["samples"][i]["sample_count"]);
        _write4(view, box["samples"][i]["sample_delta"]);
    }
    return _writeBoxSize(view, view.source.length);
}

function _stss(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(path),
                                            box["version"], box["flags"] ); // 0, 0
        _write4(view, box["entry_count"]);

        for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
            _write4(view, box["samples"][i]["sample_number"]);
        }
        return _writeBoxSize(view, view.source.length);
    }
    return null;
}

function _stsc(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] ); // 0, 0

    _write4(view, box["entry_count"]);

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        _write4(view, box["samples"][i]["first_chunk"]);
        _write4(view, box["samples"][i]["samples_per_chunk"]);
        _write4(view, box["samples"][i]["sample_description_index"]);
    }
    return _writeBoxSize(view, view.source.length);
}

function _stsz(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(path),
                                            box["version"], box["flags"] ); // 0, 0
        _write4(view, box["sample_size"]);
        _write4(view, box["sample_count"]);

        if (box["sample_size"] === 0) {
            for (var i = 0, iz = box["sample_count"]; i < iz; ++i) {
                _write4(view, box["samples"][i]["entry_size"]);
            }
        }
        return _writeBoxSize(view, view.source.length);
    }
    return null;
}

function _stco(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createFullBoxClassView( _getLastBoxType(path),
                                        box["version"], box["flags"] ); // 0, 0
    var entry_count = box["entry_count"];

    _write4(view, entry_count);

    for (var i = 0, iz = entry_count; i < iz; ++i) {
        _write4(view, box["samples"][i]["chunk_offset"]);
    }
    return _writeBoxSize(view, view.source.length);
}

function _udta(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    // "moov.udta" or "trak.udta"
    var box = _findBoxByPath(tree, path);
    if (box) {
        return _closeContainer( _createBoxClassView( _getLastBoxType(path) ), arguments );
    }
    return null;
}

function _meta(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    //  "moov.meta" or "trak.meta" or "meco.meta" or "moov.udta.meta"
    var box = _findBoxByPath(tree, path);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(path),
                                            box["version"], box["flags"] );  // 0, 0
        return _closeContainer(view, arguments);
    }
    return null;
}

function _ilst(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, path);
    if (box) {
        var view = _createBoxClassView( _getLastBoxType(path) );

        _writeN(view, box["data"], box["data"].length);

        return _writeBoxSize(view, view.source.length);
    }
    return null;
}

function _avc1(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createBoxClassView( _getLastBoxType(path) );

    _write4(view, 0);                   // reserved = 0
    _write2(view, 0);                   // reserved = 0
    _write2(view, box["data_reference_index"]);
    _write2(view, 0);                   // pre_defined = 0
    _write2(view, 0);                   // reserved = 0
    _write4(view, 0);                   // pre_defined[0] = 0
    _write4(view, 0);                   // pre_defined[1] = 0
    _write4(view, 0);                   // pre_defined[2] = 0
    _write2(view, box["width"]);
    _write2(view, box["height"]);
    _write4(view, box["horizresolution"]);
    _write4(view, box["vertresolution"]);
    _write4(view, 0);                   // reserved
    _write2(view, box["frame_count"]);
    _writeT(view, box["compressorname"], 32);
    _write2(view, box["depth"]);
    _write2(view, 0xFFFF);              // pre_defined = -1

    return _closeContainer(view, arguments);
}

function _avcC(tree,   // @arg MP4BoxTreeObject
               path) { // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, path);
    var view = _createBoxClassView( _getLastBoxType(path) );

    // AVCDecoderConfigurationRecord
    _write1(view, box["configurationVersion"]);    // = 1
    _write1(view, box["AVCProfileIndication"]);    // = 66 (Baseline profile)
    _write1(view, box["profile_compatibility"]);   // = 192
    _write1(view, box["AVCLevelIndication"]);      // = 30 (Level 3.0)
    _write1(view, 0xFC | (box["lengthSizeMinusOne"] & 0x3));          // `111111` + lengthSizeMinusOne
    _write1(view, 0xE0 | (box["numOfSequenceParameterSets"] & 0x1F)); // `111`    + numOfSequenceParameterSets

    var sps, pps, length, nalUnit;

    var i = 0, iz = box["numOfSequenceParameterSets"] & 0x1F;
    for (; i < iz; ++i) {
        sps     = box["SPS"][i];
        length  = sps["sequenceParameterSetLength"];
        nalUnit = sps["sequenceParameterSetNALUnit"];

        _write2(view, length);
        _writeN(view, nalUnit);
    }
    iz = box["numOfPictureParameterSets"];
    _write1(view, iz);
    for (i = 0; i < iz; ++i) {
        pps     = box["PPS"][i];
        length  = pps["pictureParameterSetLength"];
        nalUnit = pps["pictureParameterSetNALUnit"];

        _write2(view, length);
        _writeN(view, nalUnit);
    }
    return _writeBoxSize(view, view.source.length);
}

function _overwriteChunkOffset(stream) { // @arg ISOBaseMediaFormatUint8Array - mp4 file format
                                         // @desc overwrite stco chunk_offset value.
    var offset = _findMDATOffset(stream) + 4;  // +4 = chunk offset
    var cursor = _findSTCOOffset(stream) + 12; // `73 74 63 6f 00 00 00 00 00 00 00 01`

    stream[cursor + 0] = (offset >> 24) & 0xff;
    stream[cursor + 1] = (offset >> 16) & 0xff;
    stream[cursor + 2] = (offset >>  8) & 0xff;
    stream[cursor + 3] = (offset >>  0) & 0xff;

    return stream;
}

function _findMDATOffset(stream) {
    var streamLength = stream.length;
    var cursor = 0;

    while (cursor < streamLength) {
        var boxHead = cursor;
        var boxSize = ((stream[cursor++]  << 24) |
                       (stream[cursor++]  << 16) |
                       (stream[cursor++]  <<  8) |
                        stream[cursor++]) >>> 0;
        var boxType = String.fromCharCode.apply(null, [
                stream[cursor++], stream[cursor++],
                stream[cursor++], stream[cursor++]
            ]);

        if (boxType === "mdat") {
            return cursor - 4;
        }
        cursor = boxHead + boxSize;
    }
    return 0;
}

function _findSTCOOffset(stream) {
    var streamLength = stream.length;
    var cursor = 0;
    var find = ["s".charCodeAt(0), "t".charCodeAt(0),
                "c".charCodeAt(0), "o".charCodeAt(0), 0, 0, 0, 0, 0, 0, 0, 1];

    while (cursor < streamLength) {
        if (stream[cursor]     === find[0] &&
            stream[cursor + 1] === find[1] &&
            stream[cursor + 2] === find[2]) {
            for (var match = true, f = 3, fz = find.length; f < fz; ++f) {
                if (stream[cursor + f] !== find[f]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return cursor;
            }
        }
        cursor++;
    }
    return 0;
}

// =========================================================
function _getLastBoxType(path) { // @arg MP4BoxPathString - "moov/mvhd"
                                 // @ret MP4BoxTypeString - "mvhd"
                                 // @desc get last BoxType in path.
    if (path.indexOf("/") < 0) {
        return path;
    }
    var tokenArray = path.split("/");

    return tokenArray[ tokenArray.length - 1 ];
}

function _findBoxByPath(tree,   // @arg MP4BoxTreeObject - { root: { ftyp, moov: {...}, free, mdat } }
                        path) { // @arg MP4BoxPathString - eg: "moov/trak:0/mdia/minf"
                                // @ret MP4BoxObject|null - { property... }
    var boxObject = tree["root"];
    var pathArray = path.split("/"); // "moov/trak:0/mdia/minf" -> ["moov", "trak:0", "mdia", "minf"]

    for (var i = 0, iz = pathArray.length; boxObject && i < iz; ++i) {
        var boxType = pathArray[i]; // "moov" / "trak:0" / "mdia" / "minf"

        if (_hasTrackNumber(boxType)) {
            var tokenArray = boxType.split(":"); // "trak:0" -> ["trak", 0]

            boxObject = boxObject[ tokenArray[0] ][ tokenArray[1] ] || null; // get track
        } else {
            boxObject = boxObject[ boxType ] || null; // get object
        }
    }
    return boxObject;

    function _hasTrackNumber(boxType) { // @arg MP4BoxTypeString
                                        // @ret Boolean
        return boxType.indexOf(":") >= 0; // "trak:0" -> true
    }
}

function _createBoxClassView(boxType) { // @arg MP4BoxTypeString - eg: "ftyp"
                                        // @ret MP4BoxClassViewObject - { source, cursor }
                                        // @desc create box class view, without version and flags.
    //
    // ISO/IEC 14496-12 ISO base media file format - 4.2 Object Structure
    //
    //      aligned(8) class Box(unsigned int(32) boxtype,
    //                           optional unsigned int(8)[16] extended_type) {
    //          unsigned int(32) size;
    //          unsigned int(32) type = boxtype;
    //          if (size == 1) {
    //              unsigned int(64) largesize;
    //          } else if (size == 0) {
    //              // box extends to end of file
    //          }
    //          if (boxtype == "uuid") {
    //              unsigned int(8)[16] usertype = extended_type;
    //          }
    //      }
    //
    // > size is an integer that specifies the number of bytes in this box,
    // > including all its fields and contained boxes;
    // > if size is 1 then the actual size is in the field largesize;
    // > if size is 0, then this box is the last one in the file,
    // > and its contents extend to the end of the file (normally only used for a Media Data Box)

    return {
        source: [
            0x00, 0x00, 0x00, 0x00, // BoxSize(4) reserved
            boxType.charCodeAt(0),
            boxType.charCodeAt(1),
            boxType.charCodeAt(2),
            boxType.charCodeAt(3)
        ],
        cursor: 8,
    };
}

function _createFullBoxClassView(boxType, // @arg MP4BoxTypeString - eg: "ftyp"
                                 version, // @arg UINT8 = 0
                                 flags) { // @arg UINT24 = 0
                                          // @ret MP4BoxClassFullViewObject - { source, cursor }
                                          // @desc create box class view, with version and flags.
    //
    // ISO/IEC 14496-12 ISO base media file format - 4.2 Object Structure
    //
    //      aligned(8) class FullBox(unsigned int(32) boxtype,
    //                               unsigned int(8) v,
    //                               bit(24) f) extends Box(boxtype) {
    //          unsigned int(8) version = v;
    //          bit(24) flags = f;
    //      }
    //

    version = version || 0;
    flags   = flags   || 0;

    return {
        source: [
            0x00, 0x00, 0x00, 0x00, // BoxSize(4) reserved
            boxType.charCodeAt(0),
            boxType.charCodeAt(1),
            boxType.charCodeAt(2),
            boxType.charCodeAt(3),
            (version >>>  0) & 0xff,
            (flags   >>> 16) & 0xff,
            (flags   >>>  8) & 0xff,
            (flags   >>>  0) & 0xff,
        ],
        cursor: 12,
    };
}

function _closeContainer(view,   // @arg MP4BoxClassViewObject|MP4BoxClassFullViewObject - { source, cursor }
                         args) { // @aeg AegumentArray - [box, var_args...]
    if (args.length === 2) {
        return _writeBoxSize(view, view.source.length);
    }
    var newBufferSize = _getTotalBufferLength(args, 2) + view.source.length;

    _writeBoxSize(view, newBufferSize);
    // --- concat children box ---
    var newBuffer = new Uint8Array(newBufferSize);
    newBuffer.set(view.source, 0);

    return _concatBuffer(newBuffer, view.source.length, args, 2);
}

function _getTotalBufferLength(buffers,      // @arg TypedArray|Array
                               startIndex) { // @arg UINT8 = 0 - start index
                                             // @ret UINT32 - total buffer length.
    var length = 0;

    for (var i = startIndex || 0, iz = buffers.length; i < iz; ++i) {
        if (buffers[i]) {
            length += buffers[i].length;
        }
    }
    return length;
}

function _concatBuffer(resultBuffer, // @arg Uint8Array
                       bufferCursor, // @arg UINT32 - buffer cursor
                       buffer,       // @arg Uint8Array|ArrayArray - [Uint8Array|Array, ...]
                       startIndex) { // @arg UINT8 = 0 - start index
    var x = bufferCursor || 0;
    var i = startIndex   || 0;

    for (var iz = buffer.length; i < iz; ++i) {
        if (buffer[i]) {
            resultBuffer.set(buffer[i], x); // buffer[i] data copy to resultBuffer
            x += buffer[i].length;
        }
    }
    return resultBuffer;
}

function _writeBoxSize(view,      // @arg MP4BoxClassViewObject|MP4BoxClassFullViewObject
                       boxSize) { // @arg UINT32
                                  // @ret Uint8Array|Array
    view.source[0] = (boxSize >>> 24) & 0xff;
    view.source[1] = (boxSize >>> 16) & 0xff;
    view.source[2] = (boxSize >>>  8) & 0xff;
    view.source[3] = (boxSize >>>  0) & 0xff;
    return view.source;
}

function _writeT(view,   // @arg Object - { source, cursor }
                 text,   // @arg String
                 size) { // @arg UINT8
                         // @ret Object - { source, cursor }
                         // @desc write text
    for (var i = 0, iz = size; i < iz; ++i) {
        view.source[view.cursor++] = text.charCodeAt(i);
    }
    return view;
}

function _writeN(view,     // @arg Object - { source, cursor }
                 buffer) { // @arg TypedArray|Array
    if (Array.isArray(view.source)) {
        if (Array.isArray(buffer)) {
            view.source = [].concat(view.source, buffer);
        } else {
            view.source = [].concat(view.source, Array.prototype.slice.call(buffer));
        }
    } else {
        view.source.set(buffer, view.cursor);
    }
    view.cursor += buffer.length;
}

function _write4(view,    // @arg Object - { source, cursor }
                 value) { // @arg UINT32
                          // @ret Object - { source, cursor }
    view.source[view.cursor++] = (value >>> 24) & 0xff;
    view.source[view.cursor++] = (value >>> 16) & 0xff;
    view.source[view.cursor++] = (value >>>  8) & 0xff;
    view.source[view.cursor++] = (value >>>  0) & 0xff;
    return view;
}

//function _write3(view,    // @arg Object - { source, cursor }
//                 value) { // @arg UINT32
//                          // @ret Object - { source, cursor }
//    view.source[view.cursor++] = (value >>> 16) & 0xff;
//    view.source[view.cursor++] = (value >>>  8) & 0xff;
//    view.source[view.cursor++] = (value >>>  0) & 0xff;
//    return view;
//}

function _write2(view,    // @arg Object - { source, cursor }
                 value) { // @arg UINT16
                          // @ret Object - { source, cursor }
    view.source[view.cursor++] = (value >>>  8) & 0xff;
    view.source[view.cursor++] = (value >>>  0) & 0xff;
    return view;
}

function _write1(view,    // @arg Object - { source, cursor }
                 value) { // @arg UINT8
                          // @ret Object - { source, cursor }
    view.source[view.cursor++] = (value >>>  0) & 0xff;
    return view;
}

return MP4Builder; // return entity

});

