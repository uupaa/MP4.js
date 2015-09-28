(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4", function moduleClosure(global) {
"use strict";

// You need to find a pdf file. Google.search(" ISO/IEC 14496-12:2005(E) pdf ")

// --- dependency modules ----------------------------------
var Bit        = global["WebModule"]["Bit"];
var TypedArray = global["WebModule"]["TypedArray"];

// --- define / local variables ----------------------------
var _split  = Bit["split"];         // Bit.dump(u32:UINT32 = 0, pattern:UINT8Array = null):String
// read bytes (big-endian)
var _read1  = TypedArray["read1"];  // TypedArray.read1(view:Object):UINT32
var _read2  = TypedArray["read2"];  // TypedArray.read2(view:Object):UINT32
var _read3  = TypedArray["read3"];  // TypedArray.read3(view:Object):UINT32
var _read4  = TypedArray["read4"];  // TypedArray.read4(view:Object):UINT32

// --- class / interfaces ----------------------------------
var MP4 = {
    "VERBOSE":      false,
    "parse":        MP4_parse, // MP4.parse(source:Uint8Array, cursor:UINT32 = 0):MP4BoxObject
    "repository":   "https://github.com/uupaa/MP4.js"
};

// --- implements ------------------------------------------
function MP4_parse(source,   // @arg Uint8Array
                   cursor) { // @arg UINT32 = 0
                             // @ret Object - { BoxObject... }
    var view = { source: source, cursor: cursor || 0 };
    var mp4box = {}; // root box-node
    var parentNode = mp4box;

    _parseLoop(mp4box, view, parentNode);
    return mp4box;
}

function _parseLoop(mp4box, view, parentNode) {
    var loopEnd = view.source.length;

    while (view.cursor < loopEnd) {
        var boxSize = _read4(view) - 8; // contain boxSize and boxType
        var boxType = _read4Text(view);
        var boxView = { source: view.source.subarray(view.cursor - 8, view.cursor + boxSize),
                        cursor: 8 };

        if (MP4["VERBOSE"]) { console.log(boxType); _boxdump(boxView); }

        switch (boxType) {
        case "free": break;
        case "ftyp": _ftyp(mp4box, boxView, parentNode); break;
        case "mdat": _mdat(mp4box, boxView, parentNode); break;
        case "mvhd": _mvhd(mp4box, boxView, parentNode); break;
        case "moov": _moov(mp4box, boxView, parentNode); break;
        case "trak": _trak(mp4box, boxView, parentNode); break;
        case "tkhd": _tkhd(mp4box, boxView, parentNode); break;
        case "edts": _edts(mp4box, boxView, parentNode); break;
        case "elst": _elst(mp4box, boxView, parentNode); break;
        case "mdia": _mdia(mp4box, boxView, parentNode); break;
        case "mdhd": _mdhd(mp4box, boxView, parentNode); break;
        case "hdlr": _hdlr(mp4box, boxView, parentNode); break;
        case "minf": _minf(mp4box, boxView, parentNode); break;
        case "vmhd": _vmhd(mp4box, boxView, parentNode); break;
        case "dinf": _dinf(mp4box, boxView, parentNode); break;
        case "dref": _dref(mp4box, boxView, parentNode); break;
        case "stbl": _stbl(mp4box, boxView, parentNode); break;
        case "stsd": _stsd(mp4box, boxView, parentNode); break;
        case "stts": _stts(mp4box, boxView, parentNode); break;
        case "stss": _stss(mp4box, boxView, parentNode); break;
        case "stsc": _stsc(mp4box, boxView, parentNode); break;
        case "stsz": _stsz(mp4box, boxView, parentNode); break;
        case "stco": _stco(mp4box, boxView, parentNode); break;
        case "udta": _udta(mp4box, boxView, parentNode); break;
        case "meta": _meta(mp4box, boxView, parentNode); break;
        case "ilst": _ilst(mp4box, boxView, parentNode); break;
        case "url ":  _url(mp4box, boxView, parentNode); break;
        case "avc1": _avc1(mp4box, boxView, parentNode); break;
        case "avcC": _avcC(mp4box, boxView, parentNode); break;
        default: console.log("UNKNOWN BOX TYPE: " + boxType);
        }
        view.cursor += boxSize;
    }
}

function _ftyp(mp4box, boxView, parentNode) {
/*
    - brand list
        - `isom`    = ISO 14496-1 Base Media.
        - `iso2`    = ISO 14496-12 Base Media.
        - `mp41`    = ISO 14496-1 version 1.
        - `mp42`    = ISO 14496-1 version 2.
        - `qt  `    = quicktime movie.
        - `avc1`    = H264.
        - `3gp` + ? = 3G MP4 profile.
        - `mmp4`    = 3G Mobile MP4.
        - `M4A `    = Apple AAC audio w/ iTunes info.
        - `M4P `    = AES encrypted audio
        - `M4B `    = Apple audio w/ iTunes position.
        - `mp71`    = ISO 14496-12 MPEG-7 meta data.
 */

    var major_brand   = _read4Text(boxView);
    var minor_version = _read4(boxView);
    var compatible_brands = [];
    for (var i = boxView.cursor, iz = boxView.source.length; i < iz; i += 4) {
        compatible_brands.push( _read4Text(boxView) );
    }

    var node = {
        "major_brand":       major_brand,
        "minor_version":     minor_version,
        "compatible_brands": compatible_brands,
    };
    parentNode["ftyp"] = node;
}

function _moov(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["moov"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _mdat(mp4box, boxView, parentNode) {
    var node = {
        "data": boxView.source.subarray(boxView.cursor, boxView.source.length),
    };
    parentNode["mdat"] = node;
}

function _mvhd(mp4box, boxView, parentNode) {
    var version             = _read1(boxView); // class FullBox defined type
                              _read3(boxView); // class FullBox defined type
    var creation_time       = version === 1 ? _read8(boxView) : _read4(boxView);
    var modification_time   = version === 1 ? _read8(boxView) : _read4(boxView);
    var timescale           = _read4(boxView);
    var duration            = version === 1 ? _read8(boxView) : _read4(boxView);
    var rate                = _read4(boxView);
    var volume              = _read2(boxView);
    boxView.cursor += 2 + 4 * 2; // skip reserved
    boxView.cursor +=     4 * 9; // skip matrix
    boxView.cursor +=     4 * 6; // skip pre_defined
    var next_track_ID       = _read4(boxView);
    var node = {
        "creation_time":        creation_time,
        "modification_time":    modification_time,
        "timescale":            timescale,
        "duration":             duration,
        "rate":                 rate   / Math.pow(2, 16), // rate >> 16
        "volume":               volume / Math.pow(2, 8),  // volume >> 8
        "next_track_ID":        next_track_ID,
    };
    parentNode["mvhd"] = node;
}

function _trak(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["trak"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _tkhd(mp4box, boxView, parentNode) {
    var version             = _read1(boxView); // class FullBox defined type
                              _read3(boxView); // class FullBox defined type
    var creation_time       = version === 1 ? _read8(boxView) : _read4(boxView);
    var modification_time   = version === 1 ? _read8(boxView) : _read4(boxView);
    var track_ID            = _read4(boxView);
    boxView.cursor += 4;     // skip reserved
    var duration            = version === 1 ? _read8(boxView) : _read4(boxView);
    boxView.cursor += 4 * 2; // skip reserved
    var layer               = _read2(boxView);
    var alternate_group     = _read2(boxView);
    var volume              = _read2(boxView);
    boxView.cursor += 2;     // skip reserved
    boxView.cursor += 4 * 9; // skip matrix
    var width               = _read4(boxView) / Math.pow(2, 16); // width  >>> 16
    var height              = _read4(boxView) / Math.pow(2, 16); // height >>> 16

    var node = {
        "creation_time":    creation_time,
        "modification_time": modification_time,
        "track_ID":         track_ID,
        "duration":         duration,
        "layer":            layer,
        "alternate_group":  alternate_group,
        "volume":           volume,
        "width":            width,
        "height":           height,
    };
    parentNode["tkhd"] = node;
}

function _edts(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["edts"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _elst(mp4box, boxView, parentNode) {
    var version = _read1(boxView); // class FullBox defined type
                  _read3(boxView); // class FullBox defined type
    var iz      = _read4(boxView);
    var entries = [];
    for (var i = 0; i < iz; ++i) {
        var segment_duration    = version === 1 ? _read8(boxView) : _read4(boxView);
        var media_time          = version === 1 ? _read8(boxView) : _read4(boxView);
        var media_rate_integer  = _read2(boxView);
        var media_rate_fraction = _read2(boxView);

        entries.push({
            "segment_duration":     segment_duration,
            "media_time":           media_time,
            "media_rate_integer":   media_rate_integer,
            "media_rate_fraction":  media_rate_fraction
        });
    }

    var node = {
        "entries": entries,
    };
    parentNode["elst"] = node;
}

function _mdia(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["mdia"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _mdhd(mp4box, boxView, parentNode) {
    var version             = _read1(boxView); // class FullBox defined type
                              _read3(boxView); // class FullBox defined type
    var creation_time       = version === 1 ? _read8(boxView) : _read4(boxView);
    var modification_time   = version === 1 ? _read8(boxView) : _read4(boxView);
    var timescale           = _read4(boxView);
    var duration            = version === 1 ? _read8(boxView) : _read4(boxView);
    var part                = _split(_read2(boxView), [16, 1, 5, 5, 5]); // net 2byte
    var language            = String.fromCharCode(part[2], part[3], part[4], part[5]);
    boxView.cursor += 2;      // skip pre_defined

    var node = {
        "creation_time": creation_time,
        "modification_time": modification_time,
        "timescale": timescale,
        "duration": duration,
        "language": language,
    };
    parentNode["mdhd"] = node;
}

function _hdlr(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    boxView.cursor += 4;     // skip pre_defined
    var handler_type = _read4Text(boxView);
    boxView.cursor += 4 * 3; // skip reserved
    var name = TypedArray.toString(boxView.source.subarray(boxView.cursor, boxView.source.length));
    boxView.cursor = boxView.source.length;
    var node = {
        "handler_type": handler_type,
        "name": name,
    };
    parentNode["hdlr"] = node;
}

function _minf(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["minf"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _vmhd(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var graphicsmode = _read2(boxView);
    var opcolor      = [_read2(boxView), _read2(boxView), _read2(boxView)];

    var node = {
        "graphicsmode": graphicsmode,
        "opcolor": opcolor,
    };
    parentNode["vmhd"] = node;
}

function _dinf(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["dinf"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _dref(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var entry_count = _read4(boxView);
    var node = { "url": [] };
    for (var i = 1; i <= entry_count; ++i) {
        _parseLoop(mp4box, boxView, node); // call _url
    }
    parentNode["dref"] = node;
}

function _url(mp4box, boxView, parentNode) {
    parentNode.url.push( TypedArray.toString(boxView.source.subarray(boxView.cursor)) );
}

function _stbl(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["stbl"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _stsd(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var iz      = _read4(boxView);
    var node    = {};
    for (var i = 0; i < iz; ++i) {
        _parseLoop(mp4box, boxView, node);
    }
    parentNode["stsd"] = node;
}

function _avc1(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var unknown         = _read4(boxView); // [!] TODO
    boxView.cursor += 2;       // skip pre_defined
    boxView.cursor += 2;       // skip reserved
    boxView.cursor += 4 * 3;   // skip pre_defined
    var width           = _read2(boxView);
    var height          = _read2(boxView);
    var horizresolution = _read4(boxView); // 0x00480000 = 72 dpi
    var vertresolution  = _read4(boxView); // 0x00480000 = 72 dpi
    boxView.cursor += 4;       // skip reserved
    var frame_count     = _read2(boxView);
    var compressorname  = _readText(boxView, 32);
    var depth           = _read2(boxView);
    boxView.cursor += 2;       // skip pre_defined

    var node = {
        "unknown":          unknown, // TBD
        "width":            width,
        "height":           height,
        "horizresolution":  horizresolution,
        "vertresolution":   vertresolution,
        "frame_count":      frame_count,
        "compressorname":   compressorname,
        "depth":            depth,
    };
    _parseLoop(mp4box, boxView, node); // _avcC
    parentNode["avc1"] = node;
}

function _avcC(mp4box, boxView, parentNode) {
    var configurationVersion  = _read1(boxView);
    var AVCProfileIndication  = _read1(boxView);
    var profile_compatibility = _read1(boxView);
    var AVCLevelIndication    = _read1(boxView);
    var part = _split(_read2(boxView), [16, 6, 2, 3, 5]); // net 2
//  var lengthSizeMinusOne = part[2];
    var numOfSequenceParameterSets = part[4]; // 5 bits

    if (configurationVersion === 1 &&
        part[1] === 63 && // 0b111111
        part[3] === 7) {  // 0b111
        // ok
    } else {
        throw new TypeError("FORMAT MISREAD");
    }

    var sequenceParameterSetNALUnit = [];
    var pictureParameterSetNALUnit = [];

    for (var i = 0; i < numOfSequenceParameterSets; ++i) {
        var sequenceParameterSetLength = _read2(boxView);
        sequenceParameterSetNALUnit.push(
            boxView.source.subarray(boxView.cursor,
                                    boxView.cursor + sequenceParameterSetLength));
        boxView.cursor += sequenceParameterSetLength;
    }

    var numOfPictureParameterSets = _read1(boxView);
    for (i = 0; i < numOfPictureParameterSets; ++i) {
        var pictureParameterSetLength = _read2(boxView);
        pictureParameterSetNALUnit.push(
            boxView.source.subarray(boxView.cursor,
                                    boxView.cursor + pictureParameterSetLength));
        boxView.cursor += pictureParameterSetLength;
    }

    var node = {
        "configurationVersion":         configurationVersion,
        "AVCProfileIndication":         AVCProfileIndication,
        "profile_compatibility":        profile_compatibility,
        "AVCLevelIndication":           AVCLevelIndication,
        "sequenceParameterSetNALUnit":  sequenceParameterSetNALUnit,
        "pictureParameterSetNALUnit":   pictureParameterSetNALUnit,
    };
    parentNode["avcC"] = node;
}

function _stts(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var iz      = _read4(boxView);
    var samples = [];
    for (var i = 0; i < iz; ++i) {
        var sample_count = _read4(boxView);
        var sample_delta = _read4(boxView);
        samples.push({ "count": sample_count, "delta": sample_delta });
    }
    var node = {
        "samples": samples,
    };
    parentNode["stts"] = node;
}

function _stss(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var iz      = _read4(boxView);
    var samples = [];
    for (var i = 0; i < iz; ++i) {
        var sample_number = _read4(boxView);
        samples.push({ "number": sample_number });
    }
    var node = {
        "samples": samples,
    };
    parentNode["stss"] = node;
}

function _stsc(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var iz      = _read4(boxView);
    var samples = [];
    for (var i = 0; i < iz; ++i) {
        var first_chunk              = _read4(boxView);
        var samples_per_chunk        = _read4(boxView);
        var sample_description_index = _read4(boxView);
        samples.push({
            "first_chunk":  first_chunk,
            "per_chunk":    samples_per_chunk,
            "index":        sample_description_index
        });
    }
    var node = {
        "samples": samples,
    };
    parentNode["stsc"] = node;
}

function _stsz(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var sample_size = _read4(boxView);
    var iz          = _read4(boxView);
    var samples     = [];

    if (sample_size === 0) {
        for (var i = 0; i < iz; ++i) {
            var entry_size = _read4(boxView);
            samples.push({ "entry_size": entry_size });
        }
    }
    var node = {
        "samples": samples,
    };
    parentNode["stsz"] = node;
}

function _stco(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var iz      = _read4(boxView);
    var samples = [];

    for (var i = 0; i < iz; ++i) {
        var chunk_offset = _read4(boxView);
        samples.push({ "chunk_offset": chunk_offset });
    }
    var node = {
        "samples": samples,
    };
    parentNode["stco"] = node;
}

function _udta(mp4box, boxView, parentNode) {
    var node = {};
    parentNode["udta"] = node;

    _parseLoop(mp4box, boxView, node);
}

function _meta(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    var node = {};
    _parseLoop(mp4box, boxView, node);
    parentNode["meta"] = node;
}

function _ilst(mp4box, boxView, parentNode) {
    _read1(boxView); // version class FullBox defined type
    _read3(boxView); // flags   class FullBox defined type

    // ilst is undocumented box. aka Apple annotation box
    var node = {};
    // TODO: decode
    parentNode["ilst"] = node;
}

function _read8(view) {
    return _read4(view) * 0x100000000 + _read4(view);
}

function _read4Text(view) {
    return _readText(view, 4);
}

function _readText(view, length) {
    var buffer = [];
    for (var i = 0, iz = length; i < iz; ++i) {
        buffer.push( view.source[view.cursor++] );
    }
    return String.fromCharCode.apply(null, buffer);
}

function _boxdump(boxView) {
    TypedArray.dump(boxView.source);
}

return MP4; // return entity

});

