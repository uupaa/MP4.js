(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4Muxer", function moduleClosure(global) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
var AUD = global["WebModule"]["NALUnitAUD"];
var SPS = global["WebModule"]["NALUnitSPS"];
var PPS = global["WebModule"]["NALUnitPPS"];
var SEI = global["WebModule"]["NALUnitSEI"];
var IDR = global["WebModule"]["NALUnitIDR"];
var ParameterSet = global["WebModule"]["NALUnitParameterSet"];

// --- define / local variables ----------------------------
//var VERIFY  = global["WebModule"]["verify"]  || false;
var VERBOSE = global["WebModule"]["verbose"] || false;
var PROFILES = {
        0x42: "Baseline profile",
        0x4D: "Main profile",
        0x64: "High profile",
    };

var LEVELS = {
                     // | Lv  | PS3 | iPhone 5s | iPhone 4s | iPhone 3GS   |
                     // |-----|-----|-----------|-----------|--------------|
        0x0C: "1.2", // | 1.2 |     |           |           |              |
        0x0D: "1.3", // | 1.3 |     |           |           |              |
        0x14: "2.0", // | 2.0 | YES |           |           |              |
        0x15: "2.1", // | 2.1 | YES |           |           |              |
        0x16: "2.2", // | 2.2 | YES |           |           |              |
        0x1E: "3.0", // | 3.0 | YES | YES       |           | Baseline 3.0 |
        0x1F: "3.1", // | 3.1 | YES | YES       | Main 3.1  |              |
        0x20: "3.2", // | 3.2 | YES | YES       | Main 3.2  |              |
        0x28: "4.0", // | 4.0 | YES | YES       | Main 4.0  |              |
        0x29: "4.1", // | 4.1 | YES | YES       | Main 4.1  |              |
        0x2A: "4.2", // | 4.2 | YES | YES       |           |              |
        0x32: "5.0", // | 5.0 |     |           |           |              |
        0x33: "5.1", // | 5.1 |     |           |           |              |
    };

// --- class / interfaces ----------------------------------
var MP4Muxer = {
    "mux": MP4Muxer_mux, // MP4Muxer.mux(nalUnitObjectArray:NALUnitObjectArray):MP4BoxNodeTreeObject
};

// --- implements ------------------------------------------
function MP4Muxer_mux(nalUnitObjectArray) { // @arg NALUnitObjectArray - [NALUnitObject, ...]
                                            // @ret MP4BoxNodeTreeObject
    var accessUnitArray = _createAccessUnit(nalUnitObjectArray); // [AccessUnit, ...]
//  var frameLength     = accessUnitArray.length;
//  var trackDuration   = 0;
//  var sampleDurations = [];
//  var segment_duration = 1000;

    return _buildMP4Box(nalUnitObjectArray, accessUnitArray);
}

function _createAccessUnit(nalUnitObjectArray) { // @arg NALUnitObjectArray - [NALUnitObject, ...]
                                                 // @ret AccessUnitArray - [AccessUnit, ...]
    var parameterSet    = new ParameterSet(); // SPS, PPS Container
    var accessUnitArray = [];
    var accessUnit      = null;
    var mdatCursor      = 0;

    for (var i = 0, iz = nalUnitObjectArray.length; i < iz; ++i) {
        var nalUnitObject = nalUnitObjectArray[i]; // { nal_ref_idc, nal_unit_type, nal_unit_size, index, data, NAL_UNIT_TYPE }
        var nalUnitSize   = nalUnitObject["data"].length;
        var nalUnitType   = nalUnitObject["nal_unit_type"];

        switch (nalUnitType) {
        case 9: // AUD
            if (accessUnit) {
                accessUnitArray.push(accessUnit);
            }
            accessUnit = _newAcessUnit(mdatCursor);
            accessUnit.AUD = new AUD(nalUnitObject, parameterSet);
            break;
        case 7: // SPS
            accessUnit = accessUnit || _newAcessUnit(mdatCursor);
            accessUnit.SPS = new SPS(nalUnitObject, parameterSet); // 仮設定(IDRで再設定する場合もある)
            break;
        case 8: // PPS
            accessUnit = accessUnit || _newAcessUnit(mdatCursor);
            accessUnit.PPS = new PPS(nalUnitObject, parameterSet); // 仮設定(IDRで再設定する場合もある)
            break;
        case 6: // SEI
            accessUnit = accessUnit || _newAcessUnit(mdatCursor);
            accessUnit.SEI = new SEI(nalUnitObject, parameterSet);
            break;
        case 5: // IDR
            accessUnit = accessUnit || _newAcessUnit(mdatCursor);
            var idr    = new IDR(nalUnitObject, parameterSet);
            var pps_id = idr["pic_parameter_set_id"];
            var sps_id = parameterSet.getPPS(pps_id)["seq_parameter_set_id"];

            // 仮設定された accessUnit.SPS と accessUnit.PPS が存在する場合もあるが、
            // IDR.pic_parameter_set_id が参照する pps_id と sps_id に再設定する
            accessUnit.SPS = parameterSet["getSPS"](sps_id);
            accessUnit.PPS = parameterSet["getPPS"](pps_id);
            accessUnit.IDR = idr;
            break;
        default:
            throw new Error("UNSUPPORTED NALUnit: " + nalUnitType);
        }
        mdatCursor      += 4 + nalUnitSize; // 4 = NALUnitSize(4byte)
        accessUnit.size += 4 + nalUnitSize;
    }
    if (accessUnit) { // add remain accessUnit
        accessUnitArray.push(accessUnit);
    }
    return accessUnitArray;

    function _newAcessUnit(mdatCursor) {
        return {
            mdatOffset: mdatCursor,
            size:       0,
            AUD:        null,
            SPS:        null,
            PPS:        null,
            SEI:        null,
            IDR:        null,
        };
    }
}

function _buildMP4Box(nalUnitObjectArray, // @arg NALUnitObjectArray - [NALUnitObject, ...]
                      accessUnitArray) {  // @arg AccessUnitArray - [accessUnit, ...]
    var na = nalUnitObjectArray;
    var au = accessUnitArray;
    var mp4box = {
        "root": {
            "ftyp": _root_ftyp(na, au),
            "moov": _root_moov(na, au),
            "mdat": _root_mdat(na, au),
            "free": _root_free(na, au),
        }
    };
    return mp4box;
}

function _root_ftyp(na, au) {
    var sps         = au[0].SPS; // first sample
    var profile_idc = sps["profile_idc"]; // 66 = Base profile
    var level_idc   = sps["level_idc"];   // 30 = Level 3.0

    if (VERBOSE) {
        console.log("Profile: " + PROFILES[profile_idc],
                    ", Level: " + LEVELS[level_idc]);
    }
    return {
        "major_brand":       "isom",
        "minor_version":     512,
        "compatible_brands": ["isom", "iso2", "avc1", "mp41"]
    };
}

function _root_moov(na, au) {
    return {
        "mvhd": _root_moov_mvhd(na, au),
        "trak": _root_moov_trak(na, au),
        "udta": _root_moov_udta(na, au),
    };
}

function _root_mdat(na /*, au */) {
    return { "data": _createMDATData(na) };
}

function _root_free(/* na, au */) {
    return { "data": [] };
}

function _root_moov_mvhd(na, au) {
    var duration = _getTrackDuration(au, "mvhd");

    return {
        "duration":         duration,
        "matrix":           [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824],
        "next_track_ID":    2,
        "rate":             65536,
        "timescale":        1000,
        "volume":           256,
        "creation_time":    0,
        "modification_time": 0,
    };
}

function _root_moov_trak(na, au) {
    var videoTrack = {
        "edts": _root_moov_trak_edts(na, au),
        "mdia": _root_moov_trak_mdia(na, au),
        "tkhd": _root_moov_trak_tkhd(na, au),
    };

    return [ videoTrack ];
}

function _root_moov_trak_edts(na, au) {
    return {
        "elst": _root_moov_trak_edts_elst(na, au),
    };

    function _root_moov_trak_edts_elst(na, au) {
        var segment_duration = _getTrackDuration(au, "elst");
        return {
            "entry_count": 1,
            "entries": [{
                "segment_duration": segment_duration, // 1000ms を 1sec とする再生時間
                "media_time": 0,
                "media_rate_integer": 1,
                "media_rate_fraction": 0,
            }],
        };
    }
}

function _root_moov_trak_mdia(na, au) {
    return {
        "hdlr": _root_moov_trak_mdia_hdlr(na, au),
        "mdhd": _root_moov_trak_mdia_mdhd(na, au),
        "minf": _root_moov_trak_mdia_minf(na, au),
    };

    function _root_moov_trak_mdia_hdlr(/* na, au */) {
        return {
            "handler_type":     "vide",
            "handler_type2":    0,
            "name":             "VideoHandler",
        };
    }

    function _root_moov_trak_mdia_mdhd(na, au) {
        var duration  = _getTrackDuration(au, "mdhd");
        var timeScale = _getTrackTimeScale(au, "mdhd");

        return {
            "creation_time":        0,          // 4byte
            "modification_time":    0,          // 4byte
            "timescale":            timeScale,  // 4byte 90000
            "duration":             duration,   // 4byte 450000
            "language":             "und",      // 2byte
        };
    }
    function _root_moov_trak_mdia_minf(na, au) {
        return {
            "dinf": _root_moov_trak_mdia_minf_dinf(na, au),
            "stbl": _root_moov_trak_mdia_minf_stbl(na, au),
            "vmhd": _root_moov_trak_mdia_minf_vmhd(na, au),
        };

        function _root_moov_trak_mdia_minf_dinf(na, au) {
            return {
                "dref": _root_moov_trak_mdia_minf_dinf_dref(na, au),
            };

            function _root_moov_trak_mdia_minf_dinf_dref(/* na, au */) {
                return {
                    "entry_count":  1,
                    "url ": [{
                        "flags":    1, // [!]
                        "url":      "",
                    }]
                };
            }
        }

        function _root_moov_trak_mdia_minf_vmhd(/* na, au */) {
            return {
                "flags":        1, // [!]
                "graphicsmode": 0,
                "opcolor":      [0, 0, 0],
            };
        }
    }
}

function _root_moov_trak_tkhd(na, au) {
    var width    = _getFrameWidth(au, "tkhd"); // 8388608 = 128 << 16
    var height   = _getFrameHeight(au, "tkhd");
    var duration = _getTrackDuration(au, "tkhd"); // TODO

    return {
        "flags":            3, // [!]
        "alternate_group":  0,
        "creation_time":    0,
        "modification_time": 0,
        "duration":         duration, // 5000
        "width":            width,
        "height":           height,
        "matrix":           [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824],
        "track_ID":         1,
        "volume":           0,
        "layer":            0,
    };
}

function _root_moov_trak_mdia_minf_stbl(na, au) {
    return {
        "stsz": _root_moov_trak_mdia_minf_stbl_stsz(na, au), // Sample size framing
        "stsc": _root_moov_trak_mdia_minf_stbl_stsc(na, au), // Sample-to-chunk
        "stco": _root_moov_trak_mdia_minf_stbl_stco(na, au), // Chunk offset
        "stts": _root_moov_trak_mdia_minf_stbl_stts(na, au), // Time-to-sample
        "stsd": _root_moov_trak_mdia_minf_stbl_stsd(na, au), // Sample description
    };

    function _root_moov_trak_mdia_minf_stbl_stsz(na, au) {
        // List of Sample.data.byteSize
        var sample_size = 0;
        var samples = [];

        if (au.length === 1) {
            sample_size = au[0].size;
        } else {
            samples = _createSampleSizeTable(au);
        }
        return {
            "sample_size":  sample_size,
            "sample_count": samples.length,
            "samples":      samples,
        };
    }
    function _root_moov_trak_mdia_minf_stbl_stsc(na, au) {
        // List of Sample group (Chunk)
        var samples = _createSampleGroup(au);
        return {
            "entry_count":  samples.length,
            "samples":      samples,
        };
    }
    function _root_moov_trak_mdia_minf_stbl_stco(/* na, au */) {
        // List of Chunk offset (offset from mdat bytes)
        return {
            "entry_count":  1,
            "samples":      [{ "chunk_offset": 0 }]
        };
    }
    function _root_moov_trak_mdia_minf_stbl_stts(na, au) {
        // List of Time to Smaple
        var samples = _createTimeToSampleTable(au);
        return {
            "entry_count":  samples.length,
            "samples":      samples,
        };
    }
    function _root_moov_trak_mdia_minf_stbl_stsd(na, au) {
        // サンプルのデコード方法のリスト
        // width, height, frame_count, profile, level, SPS, PPS
        return {
            "entry_count":  1,
            "avc1":         _root_moov_trak_mdia_minf_stbl_stsd_avc1(na, au),
        };
    }
}

function _root_moov_trak_mdia_minf_stbl_stsd_avc1(na, au) {
    var width  = _getFrameWidth(au, "avc1");
    var height = _getFrameHeight(au, "avc1");

    return {
        "avcC":                 _root_moov_trak_mdia_minf_stbl_stsd_avc1_avcC(na, au),
        "compressorname":       String.fromCharCode.apply(null, new Uint8Array(32)),
        "data_reference_index": 1,
        "depth":                0x18,       // 0x0018
        "frame_count":          1,
        "width":                width,
        "height":               height,
        "horizresolution":      0x00480000, // 72dpi = 4718592
        "vertresolution":       0x00480000, // 72dpi = 4718592
    };
}

function _root_moov_trak_mdia_minf_stbl_stsd_avc1_avcC(na, au) {
    var sps = au[0].SPS;
    var pps = au[0].PPS;

    // AVCDecoderConfigurationRecord
    return {
        "configurationVersion":         1,
        "AVCProfileIndication":         66, // 66 = Baseline profile
        "profile_compatibility":        192,
        "AVCLevelIndication":           30, // 30 = Level 3.0
        "lengthSizeMinusOne":           3,
        "numOfSequenceParameterSets":   1,
        "SPS": [{
            "sequenceParameterSetLength":   sps["avcC_sequenceParameterSetLength"],
            "sequenceParameterSetNALUnit":  sps["avcC_sequenceParameterSetNALUnit"],
        }],
        "numOfPictureParameterSets":    1,
        "PPS": [{
            "pictureParameterSetLength":    pps["avcC_pictureParameterSetLength"],
            "pictureParameterSetNALUnit":   pps["avcC_pictureParameterSetNALUnit"],
        }]
    };
}

function _root_moov_udta(/* na, au */) {
    return {
        "meta": {
            "hdlr": {
                "handler_type": "mdir",
                "handler_type2": 1634758764,
                "name": "",
            },
            "ilst": {
                "data": [
                    0, 0, 0, 37, 169, 116, 111, 111,
                    0, 0, 0, 29, 100, 97, 116, 97,
                    0, 0, 0, 1, 0, 0, 0, 0,
                    76, 97, 118, 102, 53, 54, 46, 52,
                    48, 46, 49, 48, 49 ]
            }
        }
    };
}

function _createMDATData(nalUnitObjectArray) {
    var buffer = new Uint8Array( _getMDATMP4BoxSize(nalUnitObjectArray) );
    var cursor = 0;

    for (var i = 0, iz = nalUnitObjectArray.length; i < iz; ++i) {
        var nalUnit     = nalUnitObjectArray[i]["data"];
        var nalUnitSize = nalUnit.length;

        buffer[cursor + 0] = (nalUnitSize >> 24 & 0xff);
        buffer[cursor + 1] = (nalUnitSize >> 16 & 0xff);
        buffer[cursor + 2] = (nalUnitSize >>  8 & 0xff);
        buffer[cursor + 3] = (nalUnitSize >>  0 & 0xff);

        buffer.set( nalUnit, cursor + 4 );
        cursor += nalUnitSize + 4;
    }
    return buffer;

    function _getMDATMP4BoxSize(nalUnitObjectArray) {
        return nalUnitObjectArray.reduce(function(size, nalUnitObject) {
            return size + nalUnitObject["data"].length + 4;
        }, 0);
    }
}

function _createSampleSizeTable(au) {
    var samples = [];

    for (var i = 0, iz = au.length; i < iz; ++i) {
        samples.push({ "entry_size": au[i].size });
    }
    return samples;
}

function _createSampleGroup(au) {
    return [{
        "first_chunk":              1,
        "samples_per_chunk":        au.length,
        "sample_description_index": 1,
    }];
}
function _createTimeToSampleTable(/* au */) {
    // mdhd.timeScale を 1秒とした数値を sample_delta に設定する必要があります。
    // その前に、各サンプルのdurarion を取得しsttsテーブルを構築する必要があります
    return [{
        "sample_count": 1,
        "sample_delta": 81920
    }];
}

function _getTrackDuration(au, box) {
    // TODO
    // NUMBER_OF_FRAMES / FPS = DURATION_IN_SECONDS
    // http://stackoverflow.com/questions/7429382/how-can-i-know-the-duration-of-any-h264-file
    switch (box) {
    case "tkhd": return 5000;
    case "mdhd": return 450000;
    case "mvhd": return 5000;
    case "elst": return 5000;
    }
    return 0;
}

function _getTrackTimeScale(au, box) {
    // TODO
    switch (box) {
    case "mdhd": return 90000;
    }
    return 0;
}

function _getFrameWidth(au, box) {
    var width = _getWidth(au[0].SPS);

    switch (box) {
    case "tkhd": return width << 16; // 16.16 format
    case "avc1": return width;
    }
    return 0;

    function _getWidth(sps) {
        // http://stackoverflow.com/questions/6394874/fetching-the-dimensions-of-a-h264video-stream
        // http://stackoverflow.com/questions/31919054/h264-getting-frame-height-and-width-from-sequence-parameter-set-sps-nal-unit
        return ((sps["pic_width_in_mbs_minus1"] + 1) * 16) -
               sps["frame_crop_right_offset"] * 2 -
               sps["frame_crop_left_offset"] * 2;
    }
}

function _getFrameHeight(au, box) {
    var height = _getHeight(au[0].SPS);

    switch (box) {
    case "tkhd": return height << 16; // 16.16 format
    case "avc1": return height;
    }
    return 0;

    function _getHeight(sps) {
        // http://stackoverflow.com/questions/6394874/fetching-the-dimensions-of-a-h264video-stream
        // http://stackoverflow.com/questions/31919054/h264-getting-frame-height-and-width-from-sequence-parameter-set-sps-nal-unit
        return ((2 - sps["frame_mbs_only_flag"]) * (sps["pic_height_in_map_units_minus1"] + 1) * 16) -
               (sps["frame_crop_top_offset"] * 2) -
               (sps["frame_crop_bottom_offset"] * 2);
    }
}

return MP4Muxer; // return entity

});

