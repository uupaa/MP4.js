(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4Parser", function moduleClosure(global) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
var Bit         = global["WebModule"]["Bit"];
var HexDump     = global["WebModule"]["HexDump"];
var TypedArray  = global["WebModule"]["TypedArray"];
var NALUnitType = global["WebModule"]["NALUnitType"];

// --- define / local variables ----------------------------
var VERIFY      = global["WebModule"]["verify"]  || false;
var VERBOSE     = global["WebModule"]["verbose"] || false;
var _split8     = Bit["split8"];  // Bit.split8(u32:UINT32, bitPattern:UINT8Array|Uint8Array):UINT32Array
var _split16    = Bit["split16"]; // Bit.split16(u32:UINT32, bitPattern:UINT8Array|Uint8Array):UINT32Array

/*
var NALUnitType = {
     1: "NON_IDR_SLICE",    // non IDR slice
     2: "SLICE_PART_A",     // slice part a
     3: "SLICE_PART_B",     // slice part b
     4: "SLICE_PART_C",     // slice part c
     5: "IDR",              // IDR slice
     6: "SEI",              // supplemental enhancement information
     7: "SPS",              // sequence parameter set
     8: "PPS",              // picture parameter set
     9: "AUD",              // access unit delimiter
    10: "END_OF_SEQ",       // end of sequence
    11: "END_OF_STREAM",    // end of stream
    12: "FILLER_DATA",      // filter data
    13: "SPS_EX",           // sequence parameter set extension
    19: "AUX_SLICE",        // auxilary slice
};
 */

// --- class / interfaces ----------------------------------
var MP4Parser = {
    "parse":    MP4Parser_parse,      // MP4Parser.parse(source:Uint8Array, cursor:UINT32 = 0):MP4BoxObject
    "mdat": {
      "dump":   MP4Parser_mdat_dump,  // MP4Parser.mdat.dump(source:Uint8Array):void
      "parse":  MP4Parser_mdat_parse, // MP4Parser.mdat.parse(source:Uint8Array):NALUnitArray
    }
};

// --- implements ------------------------------------------
function MP4Parser_parse(source,   // @arg Uint8Array
                         cursor) { // @arg UINT32 = 0
                                   // @ret MP4BoxObject - { ftyp, mdat, moov }
    var view = { source: source, cursor: cursor || 0 };
    var resource = {
            "BoxSize": source.length, // mp4 file size
            "BoxType": "root",
            "root": {}
        };

    _parse(view, resource, "root");

    return resource;
}

// Box Model Example
//
//      <-------------------------------- The Box ---------------------------->
//      <-------------------------------- BoxSize ---------------------------->
//      <------------ BoxHeader ------------>
//      +-----------------+------------------+--------------------------------+
//      | BoxSize(4byte)  | BoxType(4byte)   | BoxData (length = BoxSize - 8) |
//      +-----------------+------------------+--------------------------------+
//      | 0x00 00 00 20   |     "ftyp"       | ...                            |
//      +-----------------+------------------+--------------------------------+
//      |                                                                     |
//      v                                                                     v
//   BoxHead                                                               BoxTail
//
// ex)  ADDR    0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
//      ------ -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
//      000000 00 00 00 20 66 74 79 70 69 73 6f 6d 00 00 02 00
//             ~~~~~~~~~~~~~~~~~~~~~~~                         -> BoxHeader
//             ~~~~~~~~~~~                                     -> BoxSize
//                         ~~~~~~~~~~~                         -> BoxType
//                                     ~~~~~~~~~~~~~~~~~~~~~~~ -> BoxData
//      000010 69 73 6f 6d 69 73 6f 32 61 76 63 31 6d 70 34 31
//             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -> BoxData
//
function _parse(view, res, path) {
    var BOX_HEADER_SIZE = 8; // = 4(BoxSize) + 4(BoxType)

    while (view.cursor < view.source.length) {
        var boxHead = view.cursor;
        var boxTail = 0;
        var boxSize = _read4(view);
        var boxType = _readText(view, 4); // https://github.com/uupaa/AVC.js/wiki/MP4#box-types
        var boxView = null;

        boxTail = boxHead + boxSize;
        // --- create subview ---
        boxView = {
            source: view.source.subarray(boxHead, boxTail),
            cursor: BOX_HEADER_SIZE
        };
        if (VERBOSE) {
            HexDump(boxView.source, {
                title: "BoxType: " + boxType,
                rule: {
                    BoxSize: { begin: 0, end: 4, style: "font-weight:bold;color:green" },
                    BoxType: { begin: 4, end: 8, style: "font-weight:bold;color:blue"  },
                },
            });
        }
        switch (boxType) {
        case "ftyp": _ftyp(boxView, res, path + "/ftyp"); break;
        case "moov": _moov(boxView, res, path + "/moov"); break;
        case "mdat": _mdat(boxView, res, path + "/mdat"); break;
        case "free": _free(boxView, res, path + "/free"); break;
        case "mvhd": _mvhd(boxView, res, path + "/mvhd"); break;
        case "trak": _trak(boxView, res, path + "/trak"); break; // array
        case "tkhd": _tkhd(boxView, res, path + "/tkhd"); break;
        case "edts": _edts(boxView, res, path + "/edts"); break;
        case "elst": _elst(boxView, res, path + "/elst"); break;
        case "mdia": _mdia(boxView, res, path + "/mdia"); break;
        case "mdhd": _mdhd(boxView, res, path + "/mdhd"); break;
        case "hdlr": _hdlr(boxView, res, path + "/hdlr"); break;
        case "minf": _minf(boxView, res, path + "/minf"); break;
        case "vmhd": _vmhd(boxView, res, path + "/vmhd"); break;
        case "dinf": _dinf(boxView, res, path + "/dinf"); break;
        case "dref": _dref(boxView, res, path + "/dref"); break;
        case "url ": _url_(boxView, res, path + "/url "); break; // array
        case "stbl": _stbl(boxView, res, path + "/stbl"); break;
        case "stsd": _stsd(boxView, res, path + "/stsd"); break;
        case "stts": _stts(boxView, res, path + "/stts"); break;
        case "stss": _stss(boxView, res, path + "/stss"); break;
        case "stsc": _stsc(boxView, res, path + "/stsc"); break;
        case "stsz": _stsz(boxView, res, path + "/stsz"); break;
        case "stco": _stco(boxView, res, path + "/stco"); break;
        case "udta": _udta(boxView, res, path + "/udta"); break;
        case "meta": _meta(boxView, res, path + "/meta"); break;
        case "ilst": _ilst(boxView, res, path + "/ilst"); break;
        case "avc1": _avc1(boxView, res, path + "/avc1"); break; // [AVC extend]
        case "avcC": _avcC(boxView, res, path + "/avcC"); break; // [AVC extend]
        default: console.warn("UNKNOWN BOX TYPE: " + path + "/" + boxType);
        }
        view.cursor = boxTail;
    }
}

//  aligned(8) class Box (unsigned int(32) boxtype, optional unsigned int(8)[16] extended_type) {
//      unsigned int(32) size; // size == 1 is int(64) largesize
//      unsigned int(32) type = boxtype;
//      if (size==1) {
//          unsigned int(64) largesize;
//      } else if (size==0) {
//          // box extends to end of file
//      }
//      if (boxtype=='uuid') {
//          unsigned int(8)[16] usertype = extended_type;
//      }
//  }
//  aligned(8) class FullBox(unsigned int(32) boxtype, unsigned int(8) v, bit(24) f) extends Box(boxtype) {
//      unsigned int(8) version = v;
//      bit(24) flags = f;
//  }

//  aligned(8) class FileTypeBox extends Box('ftyp') {
//      unsigned int(32) major_brand;
//      unsigned int(32) minor_version;
//      unsigned int(32) compatible_brands[]; // to end of the box
//  }
function _ftyp(boxView, res, path) {
    var major_brand         = _readText(boxView, 4); // brand list: https://github.com/uupaa/MP4.js/wiki/Document#brand-list
    var minor_version       = _read4(boxView);
    var compatible_brands   = [];

    for (var i = boxView.cursor, iz = boxView.source.length; i < iz; i += 4) {
        compatible_brands.push( _readText(boxView, 4) );
    }
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "ftyp",
        "major_brand":       major_brand,
        "minor_version":     minor_version,
        "compatible_brands": compatible_brands,
    });
}

//  aligned(8) class MovieBox extends Box('moov') {
//  }
function _moov(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "moov",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class MediaDataBox extends Box('mdat') {
//      bit(8) data[];
//  }
function _mdat(boxView, res, path) {
/*
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "mdat",
        "data":     boxView.source.subarray(boxView.cursor, boxView.source.length),
    });
 */
    var data = boxView.source.subarray(boxView.cursor, boxView.source.length);
    var handler = {
        "BoxSize":  boxView.source.length,
        "BoxType":  "mdat",
        "data":     data,
        get "dump"() { MP4Parser_mdat_dump(this["data"]); }
    };
    _box(res, path, handler);
}

//  aligned(8) class FreeSpaceBox extends Box(free_type) {
//      unsigned int(8) data[];
//  }
function _free(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "free",
        "data":     boxView.source.subarray(boxView.cursor)
    });
}

//  aligned(8) class MovieHeaderBox extends FullBox('mvhd', version, 0) {
//      unsigned int(32) creation_time;
//      unsigned int(32) modification_time;
//      unsigned int(32) timescale;
//      unsigned int(32) duration;
//      template int(32) rate = 0x00010000; // typically 1.0
//      template int(16) volume = 0x0100; // typically, full volume
//      const bit(16) reserved = 0;
//      const unsigned int(32)[2] reserved = 0;
//      template int(32)[9] matrix = { 0x00010000,0,0,0,0x00010000,0,0,0,0x40000000 }; // Unity matrix
//      bit(32)[6]  pre_defined = 0;
//      unsigned int(32) next_track_ID;
//  }
function _mvhd(boxView, res, path) {
    var version         = _read1(boxView);  // = 0
    var flags           = _read3(boxView);  // = 0

    var creation_time   = _read4(boxView);
    var modification_time = _read4(boxView);
    var timescale       = _read4(boxView);
    var duration        = _read4(boxView);
    var rate            = _read4(boxView);  // rate = 0x00010000; // typically 1.0
    var volume          = _read2(boxView);  // volume = 0x0100; // typically, full volume
    var reserved1       = _read2(boxView);  // const bit(16) reserved = 0;
    var reserved2       = _read4(boxView);  // const unsigned int(32)[2] reserved = 0;
    var reserved3       = _read4(boxView);
    var matrix          = [ _read4(boxView), _read4(boxView), _read4(boxView),
                            _read4(boxView), _read4(boxView), _read4(boxView),
                            _read4(boxView), _read4(boxView), _read4(boxView) ];
    var pre_defined     = [ _read4(boxView), _read4(boxView), _read4(boxView),
                            _read4(boxView), _read4(boxView), _read4(boxView) ]; // all 0
    var next_track_ID   = _read4(boxView);

//{@dev
    if (VERIFY) {
        if (version)   { console.warn("WRONG_FORMAT version:",   version);   }
        if (flags)     { console.warn("WRONG_FORMAT flags:",     flags);     }
        if (reserved1) { console.warn("WRONG_FORMAT reserved1:", reserved1); }
        if (reserved2) { console.warn("WRONG_FORMAT reserved2:", reserved2); }
        if (reserved3) { console.warn("WRONG_FORMAT reserved3:", reserved3); }
        if (pre_defined.join("") !== "000000") { console.warn("WRONG_FORMAT pre_defined:", pre_defined); }
    }
//}@dev

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "mvhd",
        "version":      version,
        "flags":        flags,
        "creation_time": creation_time,
        "modification_time": modification_time,
        "timescale":    timescale,
        "duration":     duration,
        "rate":         rate,   // rate   / Math.pow(2, 16), // rate >> 16
        "volume":       volume, // volume / Math.pow(2, 8),  // volume >> 8
        "matrix":       matrix,
        "next_track_ID": next_track_ID,
    });
}

//  aligned(8) class TrackBox extends Box('trak') {
//  }
function _trak(boxView, res, path) {
    //  moov: {
    //      track: [
    //          videoTrack,
    //          audioTrack
    //      ]
    //  }
    var r = _box(res, path, { // r = track
        "BoxSize":  boxView.source.length,
        "BoxType":  "trak",
    });
    _parse(boxView, res, path + ":" + (r.length - 1)); // "root/moov/trak:0", add track index.
                                                       //                ^^
}

//  aligned(8) class TrackHeaderBox extends FullBox('tkhd', version, flags) {
//      unsigned int(32) creation_time;
//      unsigned int(32) modification_time;
//      unsigned int(32) track_ID;
//      const unsigned int(32)  reserved = 0;
//      unsigned int(32) duration;
//      const unsigned int(32)[2] reserved = 0;
//      template int(16) layer = 0;
//      template int(16) alternate_group = 0;
//      template int(16) volume = {if track_is_audio 0x0100 else 0};
//      const unsigned int(16) reserved = 0;
//      template int(32)[9] matrix = { 0x00010000,0,0,0,0x00010000,0,0,0,0x40000000 }; // unity matrix
//      unsigned int(32) width;
//      unsigned int(32) height;
//  }
function _tkhd(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 3, AVC では 3 になる。3 にしないと動作しない, 3 の意味は良くわからない

    var creation_time   = _read4(boxView);
    var modification_time = _read4(boxView);
    var track_ID        = _read4(boxView);
    var reserved1       = _read4(boxView); // = 0
    var duration        = _read4(boxView);
    var reserved2       = _read4(boxView); // = 0
    var reserved3       = _read4(boxView); // = 0
    var layer           = _read2(boxView); // = 0
    var alternate_group = _read2(boxView); // = 0
    var volume          = _read2(boxView); // = 0x0100 or 0
    var reserved4       = _read2(boxView); // = 0
    var matrix          = [ _read4(boxView), _read4(boxView), _read4(boxView),
                            _read4(boxView), _read4(boxView), _read4(boxView),
                            _read4(boxView), _read4(boxView), _read4(boxView) ];
    var width           = _read4(boxView);
    var height          = _read4(boxView);

//{@dev
    if (VERIFY) {
        if (version)   { console.warn("WRONG_FORMAT version:", version); }
      //if (flags)     { console.warn("WRONG_FORMAT flags:", flags); }
        if (reserved1) { console.warn("WRONG_FORMAT reserved1:", reserved1); }
        if (reserved2) { console.warn("WRONG_FORMAT reserved2:", reserved2); }
        if (reserved3) { console.warn("WRONG_FORMAT reserved3:", reserved3); }
        if (reserved4) { console.warn("WRONG_FORMAT reserved4:", reserved4); }
    }
//}@dev

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "tkhd",
        "version":      version,
        "flags":        flags,
        "creation_time": creation_time,
        "modification_time": modification_time,
        "track_ID":     track_ID,
        "duration":     duration,
        "layer":        layer,
        "alternate_group": alternate_group,
        "volume":       volume,
        "matrix":       matrix,
        "width":        width,  // width  / Math.pow(2, 16); // width  >>> 16
        "height":       height, // height / Math.pow(2, 16); // height >>> 16
    });
}

//  aligned(8) class EditBox extends Box('edts') {
//  }
function _edts(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "edts",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class EditListBox extends FullBox('elst', version, 0) {
//      unsigned int(32) entry_count;
//      for (i=1; i <= entry_count; i++) {
//          unsigned int(32) segment_duration;
//          int(32) media_time;
//          int(16) media_rate_integer;
//          int(16) media_rate_fraction = 0;
//      }
//  }
function _elst(boxView, res, path) {
    var version         = _read1(boxView);
    var flags           = _read3(boxView);

    var entry_count     = _read4(boxView);
    var entries         = [];

    for (var i = 0; i < entry_count; ++i) {
        var segment_duration    = _read4(boxView);
        var media_time          = _read4(boxView);
        var media_rate_integer  = _read2(boxView);
        var media_rate_fraction = _read2(boxView);

        entries.push({
            "segment_duration":     segment_duration,
            "media_time":           media_time,
            "media_rate_integer":   media_rate_integer,
            "media_rate_fraction":  media_rate_fraction
        });
    }
    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "elst",
        "version":      version,
        "flags":        flags,
        "entry_count":  entry_count,
        "entries":      entries,
    });
}

//  aligned(8) class MediaBox extends Box('mdia') {
//  }
function _mdia(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "mdia",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class MediaHeaderBox extends FullBox('mdhd', version, 0) {
//      unsigned int(32) creation_time;
//      unsigned int(32) modification_time;
//      unsigned int(32) timescale;
//      unsigned int(32) duration;
//      bit(1) pad = 0;
//      unsigned int(5)[3] language; // ISO-639-2/T
//      language code unsigned int(16) pre_defined = 0;
//  }
function _mdhd(boxView, res, path) {
    var version             = _read1(boxView);
    var flags               = _read3(boxView);

    var creation_time       = _read4(boxView);
    var modification_time   = _read4(boxView);
    var timescale           = _read4(boxView);
    var duration            = _read4(boxView);
    var field               = _split16(_read2(boxView), [1, 5, 5, 5]); // [pad, language, language, language]
    var language            = String.fromCharCode(0x60 + field[1], 0x60 + field[2], 0x60 + field[3]); // ISO-639-2/T language code
    var pre_defined         = _read2(boxView);

//{@dev
    if (VERIFY) {
        if (version)   { console.warn("WRONG_FORMAT version:", version); }
        if (flags)     { console.warn("WRONG_FORMAT flags:", flags); }
        if (pre_defined) { console.warn("WRONG_FORMAT pre_defined:", pre_defined); }
    }
//}@dev

    _box(res, path, {
        "BoxSize":          boxView.source.length,
        "BoxType":          "mdhd",
        "version":          version,
        "flags":            flags,
        "creation_time":    creation_time,
        "modification_time":modification_time,
        "timescale":        timescale,
        "duration":         duration,
        "language":         language,
    });
}

//  aligned(8) class HandlerBox extends FullBox('hdlr', version = 0, 0) {
//      unsigned int(32) pre_defined = 0;
//      unsigned int(32) handler_type;
//      unsigned int(32) handler_type2;
//      const unsigned int(32)[2] reserved = 0;
//      string name;
//  }
function _hdlr(boxView, res, path) {
    var version         = _read1(boxView);          // = 0
    var flags           = _read3(boxView);          // = 0

    var pre_defined     = _read4(boxView);          // = 0
    var handler_type    = _readText(boxView, 4);    // "vide"
    var handler_type2   = _read4(boxView);          // "appl"
    var reserved2       = _read4(boxView);          // = 0
    var reserved3       = _read4(boxView);          // = 0
    var name            = [];
    var c;

//{@dev
    if (VERIFY) {
        if (version)   { console.warn("WRONG_FORMAT version:", version); }
        if (flags)     { console.warn("WRONG_FORMAT flags:", flags); }
        if (pre_defined) { console.warn("WRONG_FORMAT pre_defined:", pre_defined); }
        if (reserved2) { console.warn("WRONG_FORMAT reserved2:", reserved2); }
        if (reserved3) { console.warn("WRONG_FORMAT reserved3:", reserved3); }
    }
//}@dev

    while ((c = _read1(boxView)) !== 0x00) { name.push(c); }

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "hdlr",
        "version":      version,
        "flags":        flags,
        "handler_type": handler_type,
        "handler_type2":handler_type2,
        "name":         TypedArray.toString(name),  // "VideoHandler"
    });
}

//  aligned(8) class MediaInformationBox extends Box('minf') {
//  }
function _minf(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "minf",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class VideoMediaHeaderBox extends FullBox('vmhd', version = 0, 1) {
//      template unsigned int(16) graphicsmode = 0; // copy, see below
//      template unsigned int(16)[3] opcolor = {0, 0, 0};
//  }
function _vmhd(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 1

    var graphicsmode    = _read2(boxView);
    var opcolor         = [ _read2(boxView), _read2(boxView), _read2(boxView) ];

//{@dev
    if (VERIFY) {
        if (version)    { console.warn("WRONG_FORMAT version:", version); }
        if (flags !== 1){ console.warn("WRONG_FORMAT flags:", flags); }
    }
//}@dev

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "vmhd",
        "version":      version,
        "flags":        flags,
        "graphicsmode": graphicsmode,
        "opcolor":      opcolor,
    });
}

//  aligned(8) class DataInformationBox extends Box('dinf') {
//  }
function _dinf(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "dinf",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class DataReferenceBox extends FullBox('dref', version = 0, 0) {
//      unsigned int(32) entry_count;
//      for (i=1; i <= entry_count; i++) {
//          DataEntryBox(entry_version, entry_flags) data_entry;
//      }
//  }
function _dref(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

    var entry_count     = _read4(boxView);

//{@dev
    if (VERIFY) {
        if (version)    { console.warn("WRONG_FORMAT version:", version); }
        if (flags)      { console.warn("WRONG_FORMAT flags:",   flags); }
    }
//}@dev

    _box(res, path, {
        "BoxSize":          boxView.source.length,
        "BoxType":          "dref",
        "version":          version,
        "flags":            flags,
        "entry_count":      entry_count,
    });
    for (var i = 0; i < entry_count; ++i) {
        _parse(boxView, res, path); // call _url_
    }
}

//  aligned(8) class DataEntryUrlBox (bit(24) flags) extends FullBox('url ', version = 0, flags) {
//      string location;
//  }
function _url_(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0x000000 or 0x000001

//{@dev
    if (VERIFY) {
        if (version)    { console.warn("WRONG_FORMAT version:", version); }
//      if (flags)      { console.warn("WRONG_FORMAT flags:",   flags); }
    }
//}@dev

    var string = boxView.source.subarray(boxView.cursor);

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "url ",
        "version":      version,
        "flags":        flags,
        "url":          TypedArray.toString(string),
    });
}

//  aligned(8) class SampleTableBox extends Box('stbl') {
//  }
function _stbl(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "stbl",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class SampleDescriptionBox (unsigned int(32) handler_type) extends FullBox('stsd', 0, 0) {
//      int i ;
//      unsigned int(32) entry_count;
//      for (i = 1; i <= entry_count; i++) {
//          switch (handler_type) {
//          case 'soun': // for audio tracks
//              AudioSampleEntry();
//              break;
//          case 'vide': // for video tracks
//              VisualSampleEntry();
//              break;
//          case 'hint': // Hint track
//              HintSampleEntry();
//              break;
//          case 'meta': // Metadata track
//              MetadataSampleEntry();
//              break;
//          }
//      }
//  }
function _stsd(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

//{@dev
    if (VERIFY) {
        if (version)    { console.warn("WRONG_FORMAT version:", version); }
        if (flags)      { console.warn("WRONG_FORMAT flags:",   flags); }
    }
//}@dev

    var entry_count     = _read4(boxView);

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "stsd",
        "version":      version,
        "flags":        flags,
        "entry_count":  entry_count,
    });
    for (var i = 0; i < entry_count; ++i) {
        _parse(boxView, res, path);
    }
}

//  aligned(8) class TimeToSampleBox extends FullBox('stts', version = 0, 0) {
//     unsigned int(32) entry_count;
//     int i;
//     for (i=0; i < entry_count; i++) {
//        unsigned int(32) sample_count;
//        unsigned int(32) sample_delta;
//     }
//  }
function _stts(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

    var entry_count     = _read4(boxView);
    var samples         = [];

    for (var i = 0; i < entry_count; ++i) {
        var sample_count = _read4(boxView);
        var sample_delta = _read4(boxView);
        samples.push({
            "sample_count": sample_count,
            "sample_delta": sample_delta
        });
    }
    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "stts",
        "version":      version,
        "flags":        flags,
        "entry_count":  entry_count,
        "samples":      samples,
    });
}

//  aligned(8) class SyncSampleBox extends FullBox('stss', version = 0, 0) {
//      unsigned int(32) entry_count;
//      int i;
//      for (i=0; i < entry_count; i++) {
//          unsigned int(32) sample_number;
//      }
//  }
function _stss(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

    var entry_count     = _read4(boxView);
    var samples         = [];

    for (var i = 0; i < entry_count; ++i) {
        samples.push({ "sample_number": _read4(boxView) });
    }
    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "stss",
        "version":      version,
        "flags":        flags,
        "entry_count":  entry_count,
        "samples":      samples,
    });
}

//  aligned(8) class SampleToChunkBox extends FullBox('stsc', version = 0, 0) {
//      unsigned int(32) entry_count;
//      for (i=1; i <= entry_count; i++) {
//          unsigned int(32) first_chunk;
//          unsigned int(32) samples_per_chunk;
//          unsigned int(32) sample_description_index;
//      }
//  }
function _stsc(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

    var entry_count     = _read4(boxView);
    var samples         = [];

    for (var i = 0; i < entry_count; ++i) {
        samples.push({
            "first_chunk":              _read4(boxView),
            "samples_per_chunk":        _read4(boxView),
            "sample_description_index": _read4(boxView)
        });
    }
    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "stsc",
        "version":      version,
        "flags":        flags,
        "entry_count":  entry_count,
        "samples":      samples,
    });
}

//  aligned(8) class SampleSizeBox extends FullBox('stsz', version = 0, 0) {
//      unsigned int(32) sample_size;
//      unsigned int(32) sample_count;
//      if (sample_size==0) {
//          for (i=1; i <= sample_count; i++) {
//              unsigned int(32) entry_size;
//          }
//      }
//  }
function _stsz(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

    var sample_size     = _read4(boxView);
    var sample_count    = _read4(boxView);
    var samples         = [];

    if (sample_size === 0) {
        for (var i = 0; i < sample_count; ++i) {
            samples.push({ "entry_size": _read4(boxView) });
        }
    }
    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "stsz",
        "version":      version,
        "flags":        flags,
        "sample_size":  sample_size,
        "sample_count": sample_count,
        "samples":      samples,
    });
}

//  aligned(8) class ChunkOffsetBox extends FullBox('stco', version = 0, 0) {
//      unsigned int(32) entry_count;
//      for (i=1; i <= entry_count; i++) {
//          unsigned int(32) chunk_offset;
//      }
//  }
function _stco(boxView, res, path) {
    var version         = _read1(boxView); // = 0
    var flags           = _read3(boxView); // = 0

    var entry_count     = _read4(boxView);
    var samples         = [];

    for (var i = 0; i < entry_count; ++i) {
        samples.push({ "chunk_offset": _read4(boxView) });
    }
    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "stco",
        "version":      version,
        "flags":        flags,
        "entry_count":  entry_count,
        "samples":      samples,
    });
}

//  aligned(8) class UserDataBox extends Box('udta') {
//  }
//
//  "moov.udta" or "trak.udta"
function _udta(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "udta",
    });
    _parse(boxView, res, path);
}

//  aligned(8) class MetaBox (handler_type) extends FullBox('meta', version = 0, 0) {
//      HandlerBox(handler_type) theHandler;
//      PrimaryItemBox      primary_resource;   // optional
//      DataInformationBox  file_locations;     // optional
//      ItemLocationBox     item_locations;     // optional
//      ItemProtectionBox   protections;        // optional
//      ItemInfoBox         item_infos;         // optional
//      IPMPControlBox      IPMP_control;       // optional
//      ItemReferenceBox    item_refs;          // optional
//      ItemDataBox         item_data;          // optional
//      Box                 other_boxes[];      // optional
//  }
//  aligned(8) class HandlerBox extends FullBox('hdlr', version = 0, 0) {
//      unsigned int(32) pre_defined = 0;
//      unsigned int(32) handler_type;
//      const unsigned int(32)[3] reserved = 0;
//      string   name;
//  }
//
//  "moov.meta" or "trak.meta" or "meco.meta" or "moov.udta.meta"
function _meta(boxView, res, path) {
    var version         = _read1(boxView);
    var flags           = _read3(boxView);

    _box(res, path, {
        "BoxSize":      boxView.source.length,
        "BoxType":      "meta",
        "version":      version,
        "flags":        flags,
    });
    _parse(boxView, res, path);
}

// QuickTime Spec, details are unknown
function _ilst(boxView, res, path) {
    _box(res, path, {
        "BoxSize":  boxView.source.length,
        "BoxType":  "ilst",
        "data":     boxView.source.subarray(boxView.cursor)
    });
}

//  aligned(8) abstract class SampleEntry (unsigned int(32) format) extends Box(format) {
//      const unsigned int(8)[6] reserved = 0;
//      unsigned int(16) data_reference_index;
//  }
//  class VisualSampleEntry(codingname) extends SampleEntry (codingname) {
//      unsigned int(16) pre_defined = 0;
//      const unsigned int(16) reserved = 0;
//      unsigned int(32)[3] pre_defined = 0;
//      unsigned int(16) width;
//      unsigned int(16) height;
//      template unsigned int(32) horizresolution = 0x00480000; // 72 dpi
//      template unsigned int(32) vertresolution = 0x00480000; // 72 dpi
//      const unsigned int(32) reserved = 0;
//      template unsigned int(16) frame_count = 1;
//      string[32] compressorname;
//      template unsigned int(16) depth = 0x0018;
//      int(16) pre_defined = -1;
//      // other boxes from derived specifications
//      CleanApertureBox clap; // optional
//      PixelAspectRatioBox pasp; // optional
//  }
function _avc1(boxView, res, path) {
    var reserved0           = _read4(boxView);  // [0,0,0,0]
    var reserved1           = _read2(boxView);  // [0,0]
    var data_reference_index = _read2(boxView);
    var pre_defined1        = _read2(boxView);  // = 0
    var reserved2           = _read2(boxView);  // = 0
    var pre_defined2        = _read4(boxView);  // = 0
    var pre_defined3        = _read4(boxView);  // = 0
    var pre_defined4        = _read4(boxView);  // = 0
    var width               = _read2(boxView);  // 432
    var height              = _read2(boxView);  // 768
    var horizresolution     = _read4(boxView);  // 0x00480000 = 72 dpi
    var vertresolution      = _read4(boxView);  // 0x00480000 = 72 dpi
    var reserved3           = _read4(boxView);  // = 0
    var frame_count         = _read2(boxView);  // 1
    var compressorname      = _readText(boxView, 32);
    var depth               = _read2(boxView);  // 0x0018
    var pre_defined5        = _read2(boxView);  // = 0xFFFF (-1)

//{@dev
    if (VERIFY) {
        if (reserved0)      { console.warn("WRONG_FORMAT flags:",   reserved0); }
        if (reserved1)      { console.warn("WRONG_FORMAT flags:",   reserved1); }
        if (pre_defined1)   { console.warn("WRONG_FORMAT flags:",   pre_defined1); }
        if (reserved2)      { console.warn("WRONG_FORMAT flags:",   reserved2); }
        if (pre_defined2)   { console.warn("WRONG_FORMAT flags:",   pre_defined2); }
        if (pre_defined3)   { console.warn("WRONG_FORMAT flags:",   pre_defined3); }
        if (pre_defined4)   { console.warn("WRONG_FORMAT flags:",   pre_defined4); }
        if (reserved3)      { console.warn("WRONG_FORMAT flags:",   reserved3); }
        if (pre_defined5 !== 0xFFFF) { console.warn("WRONG_FORMAT flags:", pre_defined5); }
    }
//}@dev

    _box(res, path, {
        "BoxSize":              boxView.source.length,
        "BoxType":              "avc1",
        "data_reference_index": data_reference_index,
        "width":                width,
        "height":               height,
        "horizresolution":      horizresolution,
        "vertresolution":       vertresolution,
        "frame_count":          frame_count,
        "compressorname":       compressorname,
        "depth":                depth,
    });
    _parse(boxView, res, path); // _avcC
}

//  aligned(8) abstract class SampleEntry (unsigned int(32) format) extends Box(format) {
//      const unsigned int(8)[6] reserved = 0;      // 48bytes
//      unsigned int(16) data_reference_index;      // 2bytes
//  }
//  class VisualSampleEntry(codingname) extends SampleEntry (codingname) {
//      unsigned int(16) pre_defined = 0;
//      const unsigned int(16) reserved = 0;
//      unsigned int(32)[3] pre_defined = 0;
//      unsigned int(16) width;
//      unsigned int(16) height;
//      template unsigned int(32) horizresolution = 0x00480000; // 72 dpi
//      template unsigned int(32) vertresolution = 0x00480000; // 72 dpi
//      const unsigned int(32) reserved = 0;
//      template unsigned int(16) frame_count = 1;
//      string[32] compressorname;
//      template unsigned int(16) depth = 0x0018;
//      int(16) pre_defined = -1;
//      // other boxes from derived specifications
//      CleanApertureBox clap; // optional
//      PixelAspectRatioBox pasp; // optional
//  }
//  class AVCSampleEntry() extends VisualSampleEntry ('avc1') {
//      AVCConfigurationBox config;
//      MPEG4BitRateBox(); // optional
//      MPEG4ExtensionDescriptorsBox(); // optional
//  }
//  aligned(8) class AVCDecoderConfigurationRecord {
//      unsigned int(8) configurationVersion = 1;
//      unsigned int(8) AVCProfileIndication;
//      unsigned int(8) profile_compatibility;
//      unsigned int(8) AVCLevelIndication;
//      bit(6) reserved = '111111'b;
//      unsigned int(2) lengthSizeMinusOne;
//      bit(3) reserved = '111'b;
//      unsigned int(5) numOfSequenceParameterSets;
//      for (i=0; i< numOfSequenceParameterSets; i++) {
//          unsigned int(16) sequenceParameterSetLength;
//          bit(8*sequenceParameterSetLength) sequenceParameterSetNALUnit;
//      }
//      unsigned int(8) numOfPictureParameterSets;
//      for (i=0; i< numOfPictureParameterSets; i++) {
//          unsigned int(16) pictureParameterSetLength;
//          bit(8*pictureParameterSetLength) pictureParameterSetNALUnit;
//      }
//  }
function _avcC(boxView, res, path) {
    // AVCDecoderConfigurationRecord
    var configurationVersion        = _read1(boxView); // 1
    var AVCProfileIndication        = _read1(boxView); // 0x42, contains the profile code as defined in ISO/IEC 14496-10.
    var profile_compatibility       = _read1(boxView); // 0xC0
    var AVCLevelIndication          = _read1(boxView); // 0x1e
    var field1 = _split8(_read1(boxView), [6, 2]);     // [reserved, lengthSizeMinusOne]
    var reserved1                   = field1[0];       // `111111`
    var lengthSizeMinusOne          = field1[1];       // NALUnitLength が何byteで構成されているかを示す値。`00`, `01`, `11` が正常値, `10` は不正な値。通常は`11`(+1) = 4byte の NALUnitLength になる
    // | NALU Length | NALU |
    // | 00 00 00 00 | NALU | -> 4byte -> lengthSizeMinusOne = 3
    var field2 = _split8(_read1(boxView), [3, 5]);     // [reserved, numOfSequenceParameterSets]
    var reserved2                   = field2[0];       // `111`
    var numOfSequenceParameterSets  = field2[1];       // `1`

    if (configurationVersion !== 1 || reserved1 !== 0x3f || reserved2 !== 0x07) {
        throw new TypeError("FORMAT MISREAD");
    }
    var length = 0;
    var nalu = null;
    var SPS = [];
    for (var i = 0, iz = numOfSequenceParameterSets; i < iz; ++i) {
        length = _read2(boxView);
        nalu = boxView.source.subarray(boxView.cursor, boxView.cursor + length);
        boxView.cursor += length;
        SPS.push({
            "sequenceParameterSetLength":   length,
            "sequenceParameterSetNALUnit":  nalu,
        });
    }
    var numOfPictureParameterSets = _read1(boxView);
    var PPS = [];
    for (i = 0, iz = numOfPictureParameterSets; i < iz; ++i) {
        length = _read2(boxView);
        nalu = boxView.source.subarray(boxView.cursor, boxView.cursor + length);
        boxView.cursor += length;
        PPS.push({
            "pictureParameterSetLength":    length,
            "pictureParameterSetNALUnit":   nalu,
        });
    }
    _box(res, path, {
        "BoxSize":                      boxView.source.length,
        "BoxType":                      "avcC",
        "configurationVersion":         configurationVersion,
        "AVCProfileIndication":         AVCProfileIndication,
        "profile_compatibility":        profile_compatibility,
        "AVCLevelIndication":           AVCLevelIndication,
        "lengthSizeMinusOne":           lengthSizeMinusOne,
        "numOfSequenceParameterSets":   numOfSequenceParameterSets,
        "SPS":                          SPS,
        "numOfPictureParameterSets":    numOfPictureParameterSets,
        "PPS":                          PPS,
    });
}

function MP4Parser_mdat_parse(source) { // @arg Uint8Array - mdat binary data
                                        // @ret NALUnitArray - [NALUnit, ...]
    var result = []; // [NALUnit, ...]
    var sourceLength = source.length;
    var view = { source: source, cursor: 0 };

    while (view.cursor < sourceLength) {
        var size               = _read4(view); // NALUnitHeader (4byte)
        var nalu               = view.source.subarray(view.cursor - 4, view.cursor + size);

        var field              = _split8(view.source[view.cursor], [1, 2, 5]); // [forbidden_zero_bit, nal_ref_idc, nal_unit_type]
        var forbidden_zero_bit = field[0];
        var nal_unit_type      = field[2];

        if (forbidden_zero_bit !== 0) {
            throw new TypeError("FORMAT_ERROR");
        }
        if (VERBOSE) {
            console.log("MP4Parser_mdat_parse: " + NALUnitType[nal_unit_type]);
        }
        result.push(nalu);

        view.cursor += size;
    }
    return result;
}

function MP4Parser_mdat_dump(source) { // @arg Uint8Array - mdat binary data
    var nals = MP4Parser_mdat_parse(source);

    for (var i = 0, iz = nals.length; i < iz; ++i) {
        var NALUnitSize = nals[i][0] << 24 | nals[i][1] << 16 |
                          nals[i][2] << 8  | nals[i][3];
        var field = _split8(nals[i][4], [1, 2, 5]);
        var nal_unit_type = field[2];

        HexDump(nals[i], {
            title: "NALUnit[" + i + "], " + NALUnitType[nal_unit_type] + ", NALUnitSize = " + NALUnitSize + " bytes",
            rule: {
                size: { begin: 0, end: 4, bold: true }
            }
        });
    }
}

// =========================================================
function _box(res,         // @arg Object
              path,        // @arg MP4BoxPathString
              boxObject) { // @arg MP4BoxResourceObject
                           // @ret MP4BoxNodeObject
    var r = res;
    var tokens = path.split("/"); // "moov/trak:0/tkhd" -> ["moov", "trak:0", "tkhd"]

    for (var i = 0, iz = tokens.length - 1; i < iz; ++i) {
        var childBoxType = tokens[i];

        if (childBoxType.indexOf(":") >= 0) { // has index? ":0" or ":1"
            var bi = childBoxType.split(":"); // "trak:0" -> ["trak", "0"]
            r = r[ bi[0] ][ bi[1] ];          // r = r["trak"][0]
        } else {
            r = r[ childBoxType ];
        }
    }

    var boxType = tokens[tokens.length - 1]; // last box type
    var isArray = boxType === "url " ||
                  boxType === "trak";

    if (isArray) {
        if (r[boxType] && r[boxType].length) { // add array element
            r[boxType].push(boxObject);
        } else {
            r[boxType] = [boxObject];
        }
    } else {
        r[boxType] = boxObject;
    }
    return r[boxType];
}

function _readText(view, length) {
    var buffer = [];
    for (var i = 0, iz = length; i < iz; ++i) {
        buffer.push( view.source[view.cursor++] );
    }
    return String.fromCharCode.apply(null, buffer);
}

function _read4(view) { // @ret UINT32
    return ((view.source[view.cursor++]  << 24) |
            (view.source[view.cursor++]  << 16) |
            (view.source[view.cursor++]  <<  8) |
             view.source[view.cursor++]) >>> 0;
}

function _read3(view) { // @ret UINT32
    return ((view.source[view.cursor++]  << 16) |
            (view.source[view.cursor++]  <<  8) |
             view.source[view.cursor++]) >>> 0;
}

function _read2(view) { // @ret UINT16
    return ((view.source[view.cursor++]  <<  8) |
             view.source[view.cursor++]) >>> 0;
}

function _read1(view) { // @ret UINT8
    return view.source[view.cursor++] >>> 0;
}

return MP4Parser; // return entity

});

