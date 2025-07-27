
//
// VMD file format:            https://mikumikudance.fandom.com/wiki/VMD_file_format
// VMD file interplation data: https://github.com/sugiany/blender_mmd_tools/issues/41
//

import { FileStream, DataType, TextEncoding } from "./FileStream.js";
import { Vector2, Vector3, Vector4, Quaternion } from "../Core/MyMath.js";


/**  */
export class VMDFile {
    header        = new VMDHeader();
    keyframes     = [];
    faceKeyframes = [];
    log           = "";


    /////////////////////////
    // Instance methods    //
    /////////////////////////


    /**  */
    #parseVMD(arrayBuffer) {
        const stream = new FileStream(arrayBuffer);

        this.header.load(stream, this);

        const keyframeCount = stream.read(DataType.Uint32);

        for(let i=0; i<keyframeCount; ++i) {
            const keyframe = new VMDKeyFrame();
            
            this.keyframes.push(keyframe);
            keyframe.load(stream, this);
        }

        const faceKeyframeCount = stream.read(DataType.Uint32);

        for(let i=0; i<faceKeyframeCount; ++i) {
            const faceKeyframe = new VMDFaceKeyFrame();

            this.faceKeyframes.push(faceKeyframe);
            faceKeyframe.load(stream, this);
        }
    }


    /**  */
    read(file, oncomplete=null) {
        file.arrayBuffer().then(arrayBuffer => {
            this.#parseVMD(arrayBuffer);

            console.log(this.log);
        });
    }
};


/** VMDHeader  */
export class VMDHeader {
    fileMagic; // 30-character "magic byte" sequence which can also be used to determine the version of
               // the software used to create the file.

    modelName; // the name of the model that this VMD is compatible with.


    /**  */
    load(stream, vmdfile) {
        this.fileMagic = stream.readString(TextEncoding.Utf8, 30);

        if(!this.fileMagic.includes("Vocaloid Motion Data")) { // "Vocaloid Motion Data file" (until Multi-Model Edition)
            throw "파일의 확장자가 VMD 가 아닙니다!";              // "Vocaloid Motion Data 0002" (since Multi-Model Edition)
        }

        this.modelName = readCString(stream, this.oldVersion ? 10 : 20);

        vmdfile.log += `signature : ${this.fileMagic}\n`;
        vmdfile.log += `modelName : ${this.modelName}\n`;
    }


    /** 파일이 "Multi-Model" 이전 버전에서 만들어졌는지 여부를 나타내는 boolean 을 얻습니다. */
    get oldVersion() { return this.fileMagic.includes("Vocaloid Motion Data file"); }
};


/** VMDKeyFrame 은 PMXBone 의 애니메이션 곡선을 정의합니다. */
export class VMDKeyFrame {
    boneName; // A null-terminated string representing the name of the bone 
              // to which the transformation will be appiled.

    frameNumber; // Since keyframes are not necessarily stored for each actual frame,
                 // the animation software must interpolate between two adjacent keyframes with
                 // different frame indices.

    position; // the bone position (Vector3)
    rotation; // the bone rotation (Quaternion)




    /**  */
    load(stream, vmdfile) {
        this.boneName    = readCString(stream, 15);
        this.frameNumber = stream.read(DataType.Uint32);

        this.position = stream.read(DataType.Vec3f);
        this.rotation = new Quaternion(stream.read(DataType.Float), stream.read(DataType.Vec3f));

        stream.ignore(64);
    }
};


/** VMDFaceKeyFrame 은 PMXMorph 의 애니메이션 직선을 정의합니다. */
export class VMDFaceKeyFrame {
    faceName; // A null-terminated string representing the name of the face
              //  to which the transformation will be applied.

    frameIndex; // The index of the frame.

    weight; // Weight - this value is on a scale [0, 1]. It is used to scale how much
            // a face morph should move a vertex based off of the maximum possible coordinate
            // that it can move by (specified in the PMD)

    
    load(stream, vmdfile) {
        this.faceName   = readCString(stream, 15);
        this.frameIndex = stream.read(DataType.Uint32);
        this.weight     = stream.read(DataType.Float);
    }
};



/** stream 으로부터 NUL ('\0') 로 문자열을 끝을 나타내는 C-style 문자열을 읽습니다. */
function readCString(stream, byteCount) {
    const str = stream.readString(TextEncoding.ShiftJis, byteCount);
    const nul = str.indexOf("\0");
    return str.slice(0, nul);
}